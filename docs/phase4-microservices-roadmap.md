# Phase 4 — Microservices Migration

> **Status: 📋 Planned — begins after Security Auth Hardening and Phase 3 IaC complete**
>
> **Prerequisites:**
> - Phase 3 IaC (Tasks 8–14) must be complete — Phase B Terraform reuses existing modules
> - Security Auth Hardening must ship — auth-service directly extracts that upgraded code

**Design spec:** [docs/superpowers/specs/2026-06-06-microservices-architecture-design.md](superpowers/specs/2026-06-06-microservices-architecture-design.md)

---

## Why We're Doing This

MealDice currently runs as a single NestJS monolith on ECS Fargate. All domains — auth, users, meals, plans, AI — live in one codebase, deploy together, and share a single database schema.

| Problem | Impact |
|---|---|
| One deploy unit | A change to meal logic requires redeploying the entire app |
| Shared schema | Auth and meal tables are in the same DB — tightly coupled |
| No independent scaling | Can't scale only the AI service during peak hours |
| Resume story gap | "Monolith on Fargate" tells a simpler infra story than DDD + microservices |

**Goal:** Decompose into 7 independently deployable NestJS services. Zero new infrastructure cost — all services share the existing ECS cluster, RDS instance (new schemas), and ElastiCache.

---

## Service Map

```
                          Browser
                             │
                    ┌────────▼────────┐
                    │  gateway-service │  HTTP :3000 (public, behind ALB)
                    │  JWT guard       │  Routes via ClientProxy over TCP
                    └────────┬────────┘
                             │ TCP
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐   ┌───────▼──────┐  ┌───────▼──────┐
    │auth-service│   │ user-service │  │ meal-service │
    │  TCP :4001 │   │  TCP :4002   │  │  TCP :4003   │
    │mealdice_   │   │mealdice_user │  │mealdice_meal │
    │   auth     │   └──────────────┘  └──────────────┘
    └────────────┘
          │                  │
    ┌─────▼──────┐   ┌───────▼──────┐
    │plan-service│   │  ai-service  │
    │  TCP :4004 │   │ TCP :4005    │
    │mealdice_   │   │ HTTP :4006   │  ← SSE endpoint, ALB routes directly
    │   plan     │   │ (Redis only) │
    └────────────┘   └──────────────┘
          │
    ┌─────▼──────────────────────────────────┐
    │          notification-service           │
    │  Redis subscriber only (no TCP/HTTP)   │
    │  Handles: Slack, email, error alerts   │
    └────────────────────────────────────────┘
```

| Service | Port | DB Schema | Key Responsibility |
|---|---|---|---|
| `gateway-service` | HTTP :3000 | — | JWT validation, request routing via ClientProxy |
| `auth-service` | TCP :4001 | `mealdice_auth` | signin, signup, Google OAuth, refresh token, rotation |
| `user-service` | TCP :4002 | `mealdice_user` | profiles, roles, RBAC, activity logs |
| `meal-service` | TCP :4003 | `mealdice_meal` | meal CRUD, types, ingredients, custom meals |
| `plan-service` | TCP :4004 | `mealdice_plan` | weekly planner, history, meal replacement |
| `ai-service` | TCP :4005 + HTTP :4006 | Redis only | Claude streaming, SSE, distributed lock |
| `notification-service` | Redis sub only | — | Slack webhook, email, error alerting |

---

## Migration Phases

### Phase A — Service Extraction (code layer)

**Plan:** [docs/superpowers/plans/2026-06-06-microservices-phase-a-service-extraction.md](superpowers/plans/2026-06-06-microservices-phase-a-service-extraction.md)

Work entirely on `feature/microservices` branch. The existing `packages/backend/` monolith runs untouched in production until full cutover.

| Task | Description | Status |
|---|---|---|
| Task 1 | npm workspaces + `@mealdice/shared` TCP contract package | ⬜ |
| Task 2 | `docker-compose.services.yml` local multi-service dev environment | ⬜ |
| Task 3 | `notification-service` (Redis subscriber → Slack/email, zero TCP) | ⬜ |
| Task 4 | Scaffold `auth-service` NestJS TCP app | ⬜ |
| Task 5 | `auth-service` business logic (**extracts Auth Hardening code**) | ⬜ |
| Task 6 | `meal-service` (TCP :4003, `mealdice_meal` schema) | ⬜ |
| Task 7 | `user-service` (TCP :4002, subscribes `events:user.created`) | ⬜ |
| Task 8 | `plan-service` (TCP :4004, cross-calls meal-service for `meal_name`) | ⬜ |
| Task 9 | `ai-service` (TCP :4005 + HTTP :4006, Redis Pub/Sub preserved) | ⬜ |
| Task 10 | `gateway-service` (HTTP :3000, JWT guard, ClientProxy routing) | ⬜ |
| Task 11 | Local docker-compose full smoke test | ⬜ |
| Task 12 | Data migration: `eatdbprod` → 4 new schemas (verify row counts) | ⬜ |

**Production safety rules:**
- Never touch `packages/backend/` — prod runs this until cutover
- Each new service connects to its own schema — `synchronize: true` only touches that schema, never `eatdbprod`
- Data migration (Task 12) **must complete before** ALB cutover (Phase B Task 5)
- `eatdbprod` stays intact for 30 days post-cutover as rollback

### Phase B — Terraform Infrastructure

**Plan:** [docs/superpowers/plans/2026-06-06-microservices-phase-b-terraform.md](superpowers/plans/2026-06-06-microservices-phase-b-terraform.md)

All tasks are additive (create new resources, zero changes to existing). Requires Phase 3 IaC to be applied first.

| Task | Description | Status |
|---|---|---|
| Task 1 | ECR module: 7 repos (gateway/auth/user/meal/plan/ai/notification) | ⬜ |
| Task 2 | Cloud Map module: `mealdice.local` private DNS + 5 service registrations | ⬜ |
| Task 3 | ECS services module: 7 new task definitions + services, reuse existing cluster | ⬜ |
| Task 4 | ALB update: gateway TG :3000, ai-service SSE TG :4006, `/ai/stream` rule | ⬜ |
| Task 5 | **Cutover:** ALB default action → gateway-service, monolith scaled to 0 | ⬜ |

### Phase C — Path-Aware CI/CD

**Plan:** [docs/superpowers/plans/2026-06-06-microservices-phase-c-cicd.md](superpowers/plans/2026-06-06-microservices-phase-c-cicd.md)

Requires Phase B ECR repos to exist before image pushes.

| Task | Description | Status |
|---|---|---|
| Task 1 | Restructure `deploy.yml`: `path-filter` job + 7 independent `deploy-*` jobs | ⬜ |
| Task 2 | Path detection local validation (`act` simulation) | ⬜ |
| Task 3 | Dual-tag image logic: SHA always, semver only on release | ⬜ |
| Task 4 | End-to-end: push → only changed service deploys | ⬜ |

---

## Key Design Decisions

**Why NestJS TCP (not REST between services)?**
Zero extra infrastructure — no service mesh, no extra load balancers. Native `@MessagePattern` / `@EventPattern` decorators. Internal services don't need HTTP semantics (auth, retries, SSL); TCP is faster and simpler within a VPC.

**Why Database-per-Service on the same RDS instance?**
True logical isolation (separate schemas = separate TypeORM connections, separate migrations) without the cost of 4 RDS instances. Schema-level isolation is the right tradeoff at this scale.

**Why Cloud Map for service discovery?**
Managed, free, ECS-native. Automatically updates DNS when Fargate tasks are replaced. Alternative (hardcoded IPs or env vars) would break on every deploy.

**Why dual image tagging (SHA + semver)?**
SHA tag: every push gets a tag → machine-traceable, never reassigned. Semver tag: only on semantic-release → human-readable, links to changelog. Both point to the same image layer.

**Why `notification-service` has no TCP?**
It only reacts to Redis events — it never needs to respond to a request. Making it a pure subscriber keeps it the simplest possible service and the lowest-risk starting point for Phase A.

**Why auth-service gets Auth Hardening code, not the old JWT scheme?**
The monolith auth upgrade runs first. auth-service is a direct extraction — no redesign inside microservices complexity. Ships cleaner code and avoids rewriting auth twice.

---

## What Comes After Phase 4

Once microservices are deployed, the AI skill track resumes:

- **Step 4:** Native Tool Use (`tool_use` blocks) — function calling, #1 AI Engineer interview topic
- **Step 5:** Chatbot with Memory — Redis session + DB long-term preferences
- **Step 6:** Prompt Caching + Model Tier Routing + CloudWatch cost telemetry
- **NEW:** Agent Workflow, RAG (Semantic Meal Search), Eval / Guardrails

See [backlog.md](backlog.md) for full priority order.

---

_Last updated: 2026-06-07_
