# Phase 11 — Cloud Deployment

**Builds on:** [Architecture §8](./phase-2-architecture.md#8-high-level-runtime-topology) (target runtime topology), [Architecture §9](./phase-2-architecture.md#9-scalability-notes-tying-back-to-prd-2-scale-bands) (scale bands).
**Artifacts:** `apps/api/Dockerfile`, `apps/web/Dockerfile`, `infra/k8s/base/*` (Kustomize), `infra/terraform/*`.

---

## 1. What "verified" means for this phase specifically

Every prior phase in this project was verified by actually running the thing — a real Postgres, a real Keycloak, a real browser. This phase doesn't have a real AWS account or an existing Kubernetes cluster available, so "verified" here means two different things, and the line between them matters:

- **The Kubernetes deployment (`infra/k8s`) was fully verified live** — not just written. A local cluster was actually stood up (`kind`, via Colima since no Docker Desktop is installed on this machine), the real Docker images built here were loaded into it, and the full stack came up: 2 API pods + 2 web pods + a Postgres pod, all `1/1 Running`, fronted by a real `ingress-nginx` controller. Traffic was sent through the Ingress, not `kubectl port-forward` shortcuts.
- **The Terraform (`infra/terraform`) is validated, not applied.** `terraform validate` and `terraform fmt` pass; `terraform plan` was attempted and fails only on `No valid credential sources found` — the expected, correct failure mode with no AWS account configured. The HCL is real and reviewable, but nothing here has been proven against actual AWS APIs the way the Kubernetes manifests were proven against a real cluster.

## 2. Live verification log (Kubernetes)

```
kubectl get pods -n udos
NAME                    READY   STATUS    RESTARTS   AGE
api-774c64864b-2kb7l    1/1     Running   0          17s
api-774c64864b-m9jdd    1/1     Running   0          17s
postgres-0              1/1     Running   0          3m41s
web-5df7f4b998-lqr4c    1/1     Running   0          3m41s
web-5df7f4b998-mvxhd    1/1     Running   0          3m41s
```

What that came from, step by step:

1. `docker build -f apps/api/Dockerfile` / `apps/web/Dockerfile` — both images built successfully from this repo's actual source.
2. `kind create cluster --config infra/k8s/kind-cluster.yaml` — a real (if throwaway) Kubernetes 1.36 control plane.
3. `kind load docker-image` — the two images above, no registry involved.
4. `ingress-nginx` installed from a pinned release (`infra/k8s/ingress-nginx-kind.yaml`), not `main`.
5. `kubectl apply -k infra/k8s/base` — namespace, ConfigMap, Secret, both Deployments + Services + HPAs, the in-cluster Postgres StatefulSet, and the Ingress.
6. **The API pods crash-looped on first boot** — `PrismaService.onModuleInit()` calls `$connect()` at startup, and the `udos_app`/`udos_platform_admin` roles didn't exist yet in the fresh Postgres. This is correct, expected behavior, not a bug: those roles are created by `prisma/migrations/20260806123000_enable_row_level_security`, which hadn't run yet. Confirms Phase 6's fail-closed design extends to this deployment path too.
7. `kubectl port-forward svc/postgres` + `prisma migrate deploy` against it — all 5 migrations applied cleanly to a database that had never seen them before.
8. Deleted the crash-looping API pods; the ReplicaSet recreated them, and they came up clean immediately.
9. Verified through the real Ingress (`curl http://localhost:8880/...`), not a shortcut:
   - `GET /api/` → `{"message":"Hello API"}` — the `@Public()` health route.
   - `GET /api/tenant/me` with no headers → `404 "No tenant could be resolved from this request"` — **TenancyMiddleware** correctly rejecting, live in this deployment.
   - A real tenant inserted via `psql` through the port-forward, then `GET /api/tenant/me` with `X-Tenant-Slug` but no bearer token → `401 "Missing bearer token"` — **AuthGuard** (Phase 10) also live and enforcing here, independent of the app-level logic being "just a health check."
10. `metrics-server` installed (with `--kubelet-insecure-tls`, the standard kind-specific requirement) — `kubectl top pods` and both HPAs report real CPU numbers, not `<unknown>`.

Nothing in that list was skipped or asserted without a command proving it.

## 3. Local-verification simplifications (not how production works)

Documented explicitly so nobody mistakes the kind setup for the target architecture:

| In this local verification | In production (per Terraform + Architecture §8) |
|---|---|
| Postgres runs as an in-cluster StatefulSet (`infra/k8s/base/postgres.yaml`) | Managed RDS, provisioned by `infra/terraform/modules/database`, outside the cluster, Multi-AZ, with a read replica |
| `api-secrets` is a plaintext `Secret` manifest committed to git, with the same `dev_only_*` passwords the RLS migration itself creates | Real credentials come from a secrets manager (AWS Secrets Manager), synced into the cluster via External Secrets Operator — never committed, never in a manifest |
| No Keycloak in the cluster — `KEYCLOAK_ISSUER` points at a placeholder DNS name | A real Keycloak deployment (in-cluster HA or managed), matching Phase 10's already-verified realm |
| `ingress-nginx` fronted by a `kind` port mapping to `localhost` | A cloud load balancer + WAF in front of the same Ingress resource (Architecture §8) — the Ingress routing rules themselves don't change |
| One AZ (a laptop) | Multi-AZ VPC, NAT gateway per AZ, EKS node group and RDS spread across `ap-south-1a`/`ap-south-1b` |

## 4. Terraform — what it provisions and the decisions behind it

Three modules, composed by `environments/dev`:

- **`modules/network`** — VPC, public+private subnets across 2 AZs, **one NAT gateway per AZ** (not a shared one — a single NAT gateway is a cross-AZ single point of failure for every private subnet's outbound traffic, which defeats the point of spreading the cluster across AZs at all), and the security group EKS nodes use to reach RDS.
- **`modules/database`** — RDS Postgres 16, `rds.force_ssl` enforced via parameter group (the server-side half of the app's `?sslmode=require`), automated backups retained 35 days (matching [Phase 3 §6](./phase-3-database-design.md#6-backup-strategy)'s stated retention), and a **read replica** wired for the CQRS-lite dashboard-query pattern from [Architecture §10](./phase-2-architecture.md#10-performance-notes) — Chairman-dashboard aggregation queries are meant to read from here, never the primary.
- **`modules/cluster`** — EKS cluster + one managed node group, written as raw `aws_eks_*` resources rather than the community `terraform-aws-modules/eks` module, specifically so this code has no external registry dependency beyond the AWS provider itself and reads top-to-bottom without following into a large third-party module.

**Region: `ap-south-1` (Mumbai).** Follows directly from [PRD §10](./phase-1-prd.md#10-confirmed-decisions--remaining-assumptions)'s confirmed India-first decision — this is a data-residency choice, not an arbitrary default.

**State backend is documented, not enabled** (`environments/dev/versions.tf`) — pointing at an S3 bucket and DynamoDB lock table that don't exist yet would make `terraform init` fail before anyone even got to `plan`. The bootstrapping order is: apply once with local state to create the bucket/table, then uncomment and `terraform init -migrate-state`. Written this way on purpose rather than pretending the backend already exists.

## 5. Scalability

- **Pod-level**: both Deployments carry an `HorizontalPodAutoscaler` (2–10 replicas, 70% CPU target) — verified functioning against real metrics in §2, not just present in the YAML.
- **Node-level**: the EKS node group's `scaling_config` (2–10 nodes) is the layer above pod autoscaling — HPA can schedule more pods, but they need somewhere to land; this is what provides that, via cluster-autoscaler or Karpenter (neither installed by this module — a Phase 14 addition).
- **Database**: the read replica (§4) is the mechanism that keeps heavy dashboard aggregation queries off the transactional write path, exactly as designed in Architecture §10.

## 6. Security

- RDS: encrypted storage, SSL-forced, security group scoped to *only* the EKS node security group (not the VPC CIDR broadly), `deletion_protection = true`.
- EKS: control-plane audit/authenticator logs enabled (`enabled_cluster_log_types`) — this is what Phase 13's log pipeline ingests for "who did what to the cluster," a different concern from application logs.
- Worker nodes launch into private subnets only — never a public IP.
- The one deliberate exception to "nothing sensitive in git" is `infra/k8s/base/secret-api.yaml`, and it's loudly commented as local-verification-only with credentials that are already public knowledge (the same ones the RLS migration itself creates) — not a real secret being mishandled.

## 7. What's NOT done in this phase

- `terraform apply` — no AWS account in this environment. The HCL is real and `validate`-clean; it has not touched real cloud infrastructure.
- IRSA (IAM Roles for Service Accounts) for in-cluster controllers (ALB controller, External Secrets, cluster-autoscaler) — the OIDC issuer URL is output by `modules/cluster` for exactly this purpose, but the role bindings themselves aren't written yet.
- A real Keycloak deployment inside the cluster (§3).
- CDN/WAF in front of the load balancer (Architecture §8's outermost layer) — that's connected to real DNS/certificates a local exercise can't meaningfully stand up.

---

**Next:** Phase 12 — CI/CD, which is what would actually run `docker build`, `kind`-equivalent smoke tests, and (behind a manual gate) `terraform apply` on every merge, rather than a human running each step by hand as this phase did.
