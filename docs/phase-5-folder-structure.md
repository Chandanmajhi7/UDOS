# Phase 5 — Folder Structure

**Builds on:** [Architecture §1–3](./phase-2-architecture.md) (modular monolith, bounded contexts, Clean Architecture layers), [System Design §1](./phase-4-system-design.md) (REST vs. GraphQL split).
**Scope of this document:** the target monorepo layout Phase 6+ implementation fills in. Not yet scaffolded as a running project — that's Phase 6's first task — but the structure is decided now because retrofitting module boundaries after code exists is far more disruptive than starting inside them.

---

## 1. Tooling Decision: pnpm + Nx

| Choice | Why |
|---|---|
| **pnpm** over npm/yarn | Content-addressable store (fast, disk-efficient at enterprise monorepo scale) and, more importantly, a strict `node_modules` structure — a package can't accidentally import a dependency it never declared. That constraint matters here specifically because it's the same discipline the module-boundary rule below needs at the *internal* module level. |
| **Nx** over plain Turborepo | Both give build caching and task orchestration. Nx additionally has first-class **module boundary enforcement** (`@nx/enforce-module-boundaries` lint rule, tag-based) — which is the mechanism that makes "modules only talk through their public interface" (Architecture §1) a CI-enforced rule instead of a convention people forget under deadline pressure. Given this project's central bet is a modular monolith with *disciplined* boundaries, that tooling isn't optional polish — it's what makes the bet honest. |

## 2. Top-Level Layout

```
udos/
├── apps/
│   ├── api/                   NestJS modular monolith — the Wave 0-1 backend (Phase 6)
│   ├── web/                   Next.js frontend — public site, portals, dashboards (Phase 7-9)
│   └── notification-worker/   BullMQ consumer process — separately deployable per Architecture §1
├── libs/
│   ├── shared-types/          DTOs/enums generated from api/openapi.yaml + api/schema.graphql
│   ├── ui/                    shadcn/ui-based design system, shared by web + admin surfaces
│   └── config/                shared eslint/tsconfig/tailwind base configs
├── prisma/
│   └── schema.prisma          Phase 3 — single source of truth for the data model
├── api/
│   ├── openapi.yaml           Phase 4 — REST contract
│   └── schema.graphql         Phase 4 — GraphQL contract
├── infra/                     Phase 11 — Terraform, Kubernetes manifests
├── .github/workflows/         Phase 12 — CI/CD
├── docs/                      This phased documentation set
├── nx.json
├── pnpm-workspace.yaml
└── package.json
```

## 3. `apps/api/src` — Bounded Contexts as Modules

Every directory under `modules/` is one bounded context from Architecture §2, and internally follows the four Clean Architecture layers from Architecture §3 exactly — no module is a special case:

```
apps/api/src/
├── modules/
│   ├── iam/                       Wave 0
│   │   ├── domain/                 entities, value objects, domain events — zero NestJS imports
│   │   ├── application/            use cases, ports (interfaces)
│   │   ├── infrastructure/         Prisma repositories, Keycloak adapter
│   │   └── interface/              REST controllers, DTOs
│   ├── tenant/                    Wave 0
│   ├── billing/                   Wave 0
│   ├── notification/              Wave 0 (publishes to the queue; notification-worker app consumes)
│   ├── audit/                     Wave 0 (subscribes to domain events from every other module)
│   ├── admission/                 Wave 1
│   ├── sis/                       Wave 1
│   ├── academic/                  Wave 1 (programs/courses/terms/sections)
│   ├── attendance/                Wave 1
│   ├── timetable/                 Wave 1
│   ├── fee/                       Wave 1
│   └── notice/                    Wave 1
├── platform/                      cross-cutting, used by every module — not a bounded context itself
│   ├── tenancy/                    TenantContext middleware, RLS session-variable wiring (Phase 3 §3)
│   ├── auth/                       JWT verification guard, CASL ability factory (System Design §4)
│   ├── outbox/                     transactional outbox writer + relay worker (Architecture §4)
│   └── observability/              OpenTelemetry, structured logger, Sentry wiring (Architecture §7)
├── graphql/                       dashboard resolvers (System Design §1) — reads only, calls into
│                                    each module's application-layer query handlers, never its domain directly
└── main.ts
```

**The rule this layout exists to enforce:** `modules/fee/infrastructure` may import `modules/sis/application` (a defined port/interface), but never `modules/sis/infrastructure` or `modules/sis/domain` directly, and never reach across to another module's Prisma model without going through that module's own repository. Nx tags (`scope:iam`, `scope:fee`, `layer:domain`, `layer:application`, ...) encode this as a lint rule so a cross-boundary import fails CI, not just code review.

## 4. `apps/web/app` — Feature-Based Frontend, Mirroring the Backend

```
apps/web/
├── app/
│   ├── (public)/                   marketing/landing, login
│   ├── (portal)/
│   │   ├── chairman/                bespoke dashboard (PRD §5 tier 1)
│   │   ├── registrar/
│   │   ├── principal/
│   │   ├── teacher/
│   │   ├── student/
│   │   ├── parent/
│   │   └── [role]/                  configured-dashboard shell for tier-2 roles (PRD §5)
│   └── admin/                       Super Admin console (Phase 8) — separate layout, separate auth scope
├── features/                       one directory per bounded context, same names as apps/api/src/modules
│   ├── admission/
│   │   ├── components/
│   │   ├── hooks/                    TanStack Query hooks calling api/openapi.yaml-typed client
│   │   └── forms/                    React Hook Form + zod schemas matching the OpenAPI request bodies
│   ├── sis/
│   ├── attendance/
│   └── fee/
├── components/                     truly generic, cross-feature (buttons, layout shells) — shadcn/ui-based
└── lib/
    ├── api-client/                  generated from openapi.yaml (openapi-typescript / orval)
    └── graphql-client/               generated from schema.graphql
```

**Why `features/` mirrors `modules/` by name:** an engineer implementing the Fee module's UI should never have to guess where fee-related frontend code lives — it's `features/fee/`, exactly parallel to `apps/api/src/modules/fee/`. This is a deliberate, low-cost consistency choice, not an abstraction.

## 5. What Phase 6 Actually Does With This

Phase 6 runs `pnpm create nx-workspace`, wires the Nx module-boundary tags described in §3, generates the `shared-types` library from `api/openapi.yaml`/`schema.graphql`, and implements Wave 0 (`iam`, `tenant`, `audit` — the modules everything else depends on) followed by Wave 1's `admission` → `sis` → `attendance`/`fee` in that order, matching PRD §3's sequencing. Each module ships with its own unit tests (domain/application layers, no database) and integration tests (infrastructure layer, against a real test-database instance) before the next module starts — not as a batch at the end.

---

**Next:** Phase 6 — Backend Development. This is the first phase that produces a real, runnable service rather than a design artifact, and is a meaningfully larger scope commitment than Phases 1–5 — worth explicitly confirming direction before starting.
