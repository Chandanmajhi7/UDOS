# Phase 1 — Product Requirements Document

**Product (working codename):** UDOS — University Digital Operating System
**Document status:** Draft v0.1 — foundation for Phase 2 (Architecture)
**Author context:** Generated collaboratively; assumptions below must be confirmed or corrected before Phase 2 locks in irreversible decisions (data model, tenancy model).

---

## 1. Vision

A multi-tenant SaaS platform that runs the full academic and administrative operation of a higher-education institution — admissions through alumni — as a single connected system instead of a patchwork of point solutions. One tenant is one institution (or one university system with multiple campuses). The platform must serve a 150-student diploma college and a 100,000-student state university from the same codebase and the same database cluster, with per-tenant configuration, not per-tenant forks.

This document scopes *what* gets built and *in what order*. It deliberately does not promise "all modules, fully built, immediately" — see §3 (Release Waves) for why, and §9 (Non-Goals) for what v1 explicitly excludes.

## 2. Target Segments & Personas

| Segment | Student count | Characteristics | Deployment implication |
|---|---|---|---|
| Small/private college | 100–1,000 | Single campus, thin admin staff, price-sensitive | Shared-pool tenancy, low support overhead, self-serve onboarding |
| Engineering/medical college | 1,000–5,000 | Department-heavy, accreditation reporting (NBA/NAAC/NMC), lab & practicals | Shared pool, needs custom academic structures (labs, clinical postings) |
| University (single campus) | 5,000–20,000 | Multiple faculties, research output, larger finance/HR complexity | Shared pool with dedicated read replica |
| Multi-campus university | 20,000–100,000+ | Multiple legal/campus entities under one chairman, cross-campus reporting | Silo or bridge tenancy (dedicated cluster), cross-campus rollup dashboards |
| Autonomous institute | Varies | Sets own curriculum/exam rules, needs high configurability | Same as college/university tier by size, but academic module must be rules-driven, not hardcoded |

The 21 roles listed in the source brief are real personas but do not all need bespoke dashboards on day one — see §5.

## 3. Release Waves (why sequencing matters)

Every module listed in the brief (admissions, LMS, exams, finance, HR, library, hostel, transport, placement, alumni, research, inventory, AI, etc.) is real scope, but building all of it simultaneously produces the thing SaaS platforms die from: many half-finished modules instead of some fully load-bearing ones. Waves are ordered so each one is independently useful to a real institution and de-risks the next.

### Wave 0 — Platform Foundation (prerequisite for everything)
Multi-tenant core, tenant provisioning, IAM (auth, RBAC/ABAC), Super Admin console, audit logging, notification gateway abstraction (email/SMS/WhatsApp providers pluggable), file/object storage abstraction, billing/subscription/license engine.
**No end-user academic value on its own — it's the chassis.**

### Wave 1 — Core Academic Backbone (MVP; first sellable product)
Admission CRM (lead → counselling → application → merit list → enrollment), Student Information System (SIS), Academic structure (programs/courses/terms/sections), Faculty management, Attendance, Timetable, Fee collection + online payments, Notice board, Chairman/Executive dashboard (v1 KPIs), core role dashboards (Super Admin, Chairman, Registrar, Principal, HOD, Teacher, Student, Parent).
**This wave alone is a viable product for a small college.**

### Wave 2 — Academic Operations at Scale
Examination (question bank, question paper generator, offline + online exam, evaluation, results, grade cards, transcripts, digital signature on certificates), LMS (assignments, online classes, content), Library (catalog, circulation, digital library), HR core (recruitment, leave, payroll) — needed once an institution is running full terms, not just enrolling students.

### Wave 3 — Extended Campus Operations
Hostel, Transport, Placement, Alumni, Research management, Inventory/Asset management, Helpdesk/Complaints, Finance/Accounting/GST depth, advanced HR (performance, training).

### Wave 4 — Differentiation Layer
AI features (chatbot, dropout/performance/placement prediction, AI question/timetable generation, OCR, resume analyzer, natural-language dashboard queries), advanced forecasting analytics, OMR scanning, payment gateway breadth (PhonePe/Stripe/PayPal beyond the wave-1 default), fraud detection.

**Decision this drives:** Phase 5 (folder structure) and Phase 6/7 (backend/frontend build) start at Wave 0 → Wave 1. Nothing in Wave 2–4 gets scaffolded before Wave 1 is real, tested, and deployable — that's what "production-ready from day one" actually requires, as opposed to fourteen phases of stubs.

## 4. Multi-Tenancy Model (decision required before Phase 2)

Three standard SaaS patterns, and the recommendation:

| Model | Description | Fit here |
|---|---|---|
| **Silo** | One database (or cluster) per tenant | Best isolation, worst operational cost at 1,000+ tenants; justified only for the largest multi-campus universities that pay for it |
| **Pool** | All tenants share database(s); isolation via `tenant_id` + Postgres Row-Level Security | Best operational cost, standard for SMB/mid-market SaaS; requires strict RLS discipline |
| **Bridge (recommended)** | Pool by default; a tenant can be "promoted" to a dedicated cluster (silo) without an application rewrite | Matches the stated scale spread (100 → 100,000+ students) — small colleges share infrastructure cheaply, large universities that need dedicated performance/compliance get isolated clusters, same codebase either way |

**Recommendation:** Bridge model — pool-first, with tenant-to-cluster routing as a platform capability from day one (even if only one pool cluster exists at launch). Retrofitting this later means a data migration project; deciding it now costs nothing. This is detailed further in Phase 2/3.

## 5. Roles, Dashboards & Permissions

21 roles are named in scope. Not all need a *unique* dashboard layout at launch — they need the *correct data scoped by RBAC/ABAC*. Three tiers:

| Tier | Roles | Wave |
|---|---|---|
| **Bespoke dashboard (custom KPIs, custom layout)** | Super Admin, Chairman/Executive, Registrar, Principal, Teacher, Student, Parent | Wave 0–1 |
| **Configured dashboard (shared dashboard framework, role-scoped widgets)** | Vice Chancellor, Dean, Controller of Examination, Finance Officer, HR Manager, Admission Officer, Department HOD | Wave 1–2 |
| **Module-scoped dashboard (lives inside its module, not a separate home)** | Library Admin, Hostel Warden, Transport Manager, Placement Officer, Research Head, Guest | Wave 2–3 |

Permissions model: **RBAC for coarse role gating** (what modules/routes a role can reach) **+ ABAC for data scoping** (a Teacher sees only their sections; a HOD sees only their department; a Principal sees only their campus). This two-layer model is specified fully in Phase 2.

## 6. Functional Scope by Module (Wave 0–1 detail; Wave 2–4 summarized)

### 6.1 Wave 0 — Platform
- Tenant lifecycle: provision, suspend, resume, offboard, data export
- Subscription plans tied to student-count bands (Starter ≤1,000 / Growth ≤5,000 / Scale ≤20,000 / Enterprise 20,000+), feature flags per plan, usage metering
- IAM: SSO-capable (OIDC), MFA/2FA, session management, password policy, RBAC + ABAC engine
- Audit log: every write to sensitive entities (grades, fees, admissions decisions) is append-only and attributable
- Notification gateway: provider-agnostic interfaces for email/SMS/WhatsApp/push, with per-tenant provider credentials
- Object storage abstraction: per-tenant bucket/prefix isolation for documents, certificates, media

### 6.2 Wave 1 — Core Academic Backbone
- **Admission CRM:** lead capture, source tracking, counselling notes, application form builder, document upload + verification workflow, entrance exam linkage, merit list generation, offer → enrollment conversion
- **SIS:** student master record, guardians, academic history, ID card data, custom fields per institution type (medical vs engineering vs arts)
- **Academic structure:** institution → campus → school/faculty → department → program → batch → section → course, term/semester calendar, credit system support
- **Faculty management:** faculty master record, qualifications, subject allocation, workload
- **Attendance:** per-session marking (manual + optional biometric/RFID hook), shortage alerts, parent notification on threshold breach
- **Timetable:** manual authoring in v1 (AI-generated timetable is Wave 4), conflict detection (room/faculty/section clashes)
- **Fee collection:** fee structure builder (per program/batch), invoice generation, online payment (one gateway live in Wave 1 — see §8), partial payment/installments, receipt generation
- **Notice board:** targeted by role/campus/department/section
- **Dashboards:** Chairman KPIs (admissions, revenue, outstanding fees, daily collection, attendance summary), Registrar/Principal operational views, Teacher/Student/Parent personal views

### 6.3 Wave 2–4 (summary — full specs written when each wave starts)
Examination & results pipeline with digitally-signed transcripts; LMS with assignments/online classes; full library (physical + digital) with barcode/RFID; HR/payroll with statutory compliance (India: PF/ESI/TDS); hostel/transport/placement/alumni/research operational modules; AI assistant layer and predictive analytics; multi-gateway payments and GST-compliant accounting.

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Dashboard TTI < 2s, API p95 < 150ms, search < 500ms — targets apply per-tenant at that tenant's real data volume, not against an empty database |
| Availability | 99.9% for platform (Wave 1+); documented maintenance windows; multi-AZ from launch |
| Security | OWASP ASVS-aligned; encryption at rest and in transit; RBAC+ABAC; audit logging; rate limiting; CSRF/XSS/SQLi prevention by framework default, not bolted on |
| Compliance | India DPDP Act 2023 as baseline (primary market assumption — confirm in §10); GDPR-compatible data handling if international students/EU tenants are in scope; FERPA-equivalent access controls on academic records regardless of jurisdiction |
| Accessibility | WCAG 2.1 AA on student/parent/teacher-facing surfaces |
| Data residency | Tenant data stays in the region the tenant is provisioned in (relevant once >1 region is live — Wave 3+) |
| Auditability | Every grade change, fee waiver, admission decision override is logged with actor, timestamp, before/after state |

## 8. Payments & Billing (initial scope)

Building five payment gateways (Razorpay, PhonePe, Stripe, PayPal) simultaneously in Wave 1 is scope creep — one primary gateway, integrated properly (webhooks, reconciliation, refunds, partial/installment support), beats four shallow integrations. **Recommendation:** Razorpay first (India-market default, covers UPI/cards/net banking), behind a `PaymentProvider` interface so Stripe/PayPal/PhonePe are additive in Wave 3–4, not rewrites. Confirm in §10 if the primary market is not India.

## 9. Non-Goals for v1 (Wave 0–1)

Explicitly **not** built until their respective wave: AI features of any kind, OMR scanning, digital signature on documents, multi-gateway payments, hostel/transport/placement/alumni/research modules, GST accounting depth, mobile native apps (responsive web only through Wave 3). Calling this out prevents scope silently creeping into "everything, always."

## 10. Confirmed Decisions & Remaining Assumptions

Confirmed with stakeholder (2026-08-06):
1. **Primary market: India-first.** DPDP Act 2023 is the compliance baseline, Razorpay is the default/only payment gateway through Wave 1–2 (UPI/cards/net banking), pricing is INR-first. Stripe/PayPal/PhonePe remain Wave 3–4 additions behind the `PaymentProvider` port (Phase 2 §3), not a rewrite.
2. **First tenant: single-campus.** Phase 3 schema includes a `Campus` entity (so multi-campus is a config change, not a migration) but Wave 1 workflows, dashboards, and permission scoping optimize for the single-campus case. Cross-campus rollup (Phase 2 §9) stays a Wave 3+ concern.

Still open, non-blocking:
3. **Codename "UDOS":** placeholder — replace with real product name whenever decided; doesn't block architecture or schema work.

## 11. Success Metrics (Wave 1 exit criteria)

- A pilot institution can run one full admission cycle → enrollment → attendance → fee collection → without manual workarounds outside the system
- Zero data isolation bugs across tenants under load testing (this is the one class of bug that's unacceptable in multi-tenant SaaS)
- API p95 < 150ms and dashboard TTI < 2s hold under a seeded dataset sized to the "Growth" plan band (5,000 students)
- Security review (OWASP-aligned) passes with no critical/high findings before first paying tenant

---

**Next:** Phase 2 — Software Architecture Document, building directly on the tenancy model (§4), role/permission model (§5), and Wave 0–1 scope (§6) locked in here.
