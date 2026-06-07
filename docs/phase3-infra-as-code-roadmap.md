# Phase 3: Infrastructure as Code — Roadmap

## Why We're Doing This

All MealDice AWS infrastructure (ECS, RDS, ElastiCache, ALB, S3, CloudFront, Route 53) was created manually in the AWS console. That means:

- No reproducibility — recreating the stack requires remembering every click
- No diff — you can't see what changed between last week and today
- No review — infra changes happen outside of git
- Weak resume story — "I set it up in the console" vs "I wrote the Terraform"

**Goal**: Import every existing resource into Terraform, add two net-new resources (WAF + GitHub Actions OIDC), and have the full production stack managed as code.

**Resume signal**: Modular Terraform, remote state, dev/prod workspaces, keyless CI/CD via OIDC. This is the baseline expectation for senior AI Engineer roles.

---

## Architecture Overview

```
infra/
├── bootstrap/              # One-time: provisions the S3 + DynamoDB that stores Terraform state
│   └── main.tf
├── modules/
│   ├── vpc/                # Networking foundation — everything else depends on this
│   ├── rds/                # MySQL 8.0 on RDS
│   ├── elasticache/        # Redis 7 on ElastiCache
│   ├── alb/                # Application Load Balancer + HTTPS + ACM cert
│   ├── ecs/                # Fargate cluster + ECR + task definition + service
│   ├── s3_cloudfront/      # Frontend bucket + CloudFront CDN
│   ├── waf/                # Rate-based WAF rules (net-new)
│   └── iam/                # GitHub Actions OIDC role (net-new)
├── envs/
│   ├── prod.tfvars         # gitignored — sensitive values for prod
│   └── dev.tfvars          # gitignored — sensitive values for dev
├── main.tf                 # Root: wires all modules together
├── variables.tf
├── outputs.tf
├── provider.tf
└── backend.tf              # Points at the S3 remote state bucket
```

**Remote state**: All Terraform state is stored in S3 (`mealdice-tfstate`) with S3 native locking (`use_lockfile = true`, requires Terraform ≥ 1.10). This prevents concurrent applies from corrupting state. DynamoDB is not used — S3 native lock is simpler and sufficient.

**Workspaces**: `prod` workspace = existing live infrastructure (imported). `dev` workspace = a separate fresh stack for testing changes safely.

---

## The 8 Modules

| Module          | Key AWS Resources                                                                    | Net-New?    |
| --------------- | ------------------------------------------------------------------------------------ | ----------- |
| `vpc`           | Default VPC (172.31.0.0/16), 3 public subnets (us-east-2a/b/c), 1 shared SG          | ✅ Imported |
| `rds`           | RDS MySQL 8.4.8 instance (`db.t4g.micro`, port 3310, multi_az=true), DB subnet group | ✅ Imported |
| `elasticache`   | Redis replication group, ElastiCache subnet group                                    | ✅ Imported |
| `alb`           | Application Load Balancer, HTTPS/HTTP listeners, target group                        | ✅ Imported |
| `ecs`           | Fargate cluster, ECR repo, task execution IAM role, task definition, Fargate service | ✅ Imported |
| `s3_cloudfront` | S3 bucket (`mealdice-frontend`), CloudFront distribution                             | Import      |
| `waf`           | WAF WebACL (rate-based rule: 2000 req/5min per IP), ALB association                  | **New**     |
| `iam`           | GitHub OIDC provider, IAM role (replaces static access keys in CI/CD)                | **New**     |

Security groups follow least-privilege: ALB accepts public traffic → ECS only accepts from ALB → RDS/ElastiCache only accept from ECS.

---

## Execution Sequence

> **The golden rule**: never run `terraform apply` on prod without first running `terraform plan` and confirming only the expected changes appear. For import steps, the plan must show **0 changes**.

### Phase A — Bootstrap ✅ Done

1. ~~Write `infra/bootstrap/main.tf`~~ — creates `mealdice-tfstate` S3 bucket with versioning, encryption, and public access block
2. ~~Run with local state: `cd infra/bootstrap && terraform init && terraform apply`~~
3. Note: Uses S3 native lock (`use_lockfile = true`) instead of DynamoDB — simpler, no extra resource to manage

### Phase B — Root Module Scaffolding ✅ Done

4. ~~Write `provider.tf`, `backend.tf` (pointing at the bootstrap bucket), `variables.tf`~~
5. ~~Add `*.tfvars` and `.terraform/` to `.gitignore`~~
6. ~~`terraform init` — Terraform migrates to remote state~~

### Phase C — Modules (write, validate, import in dependency order)

7. `vpc` module ✅ Done — imported Default VPC (172.31.0.0/16), 3 public subnets (us-east-2a/b/c), single shared SG
   - **Deviation from plan**: Using Default VPC instead of custom VPC; 3 public subnets instead of 2 public + 2 private; single SG instead of 4 per-layer SGs. Private subnet isolation deferred as future security hardening.
   - `infra/README.md` created with architecture diagrams and SG rule table
8. ~~`rds` module → import RDS instance~~ ✅ Done — MySQL 8.4.8 / db.t4g.micro / port 3310 / multi_az=true / default SG
   - **Deviations**: `deletion_protection=false` (legacy), `backup_retention=1d` (legacy), `db_name` omitted (eatdbprod created manually via CLI), using VPC default SG instead of dedicated RDS SG
9. `elasticache` module → import Redis cluster ✅ Done — Redis 7.1 / cache.t3.micro / single-node / port 6379 / default SG
   - **Deviations**: `engine_version` must be `"7.1"` not `"7.1.0"` (Redis v6+ format rule); AUTH is Disabled — `lifecycle { ignore_changes = [auth_token, auth_token_update_strategy] }` prevents import state residue from triggering API error; `redis_sg_id` references `module.vpc.sg_id` directly (no root variable needed)
10. `alb` module → import load balancer and listeners ✅ Done — HTTPS listener / ACM cert data source / idle_timeout=300 / `lifecycle { ignore_changes = [tags_all] }` on all 3 resources
11. `ecs` module → import cluster, ECR repo, and service ✅ Done — mealdice-backend-cluster / mealdice-backend ECR / mealdice-backend-task:5 / mealdice-backend-service / CloudWatch log group /ecs/mealdice-backend-task (retention set to 30 days)
   - **Deviations**: `ecsTaskExecutionRole` used as data source (not imported — AWS default role, not MealDice-specific); `configuration { execute_command_configuration { logging = "DEFAULT" } }` required on cluster; `runtime_platform { cpu_architecture = "X86_64" operating_system_family = "LINUX" }` required on task definition; `availability_zone_rebalancing = "ENABLED"` and `enable_ecs_managed_tags = true` required on service (provider v5.100 new fields); environment vars sorted alphabetically (AWS normalises order); `ignore_changes = [task_definition, wait_for_steady_state]` on service
12. `s3_cloudfront` module → import S3 bucket and CloudFront distribution

After each module: `terraform validate` → `terraform import ...` → `terraform plan` (must show 0 changes)

### Phase D — Net-New Resources

13. `waf` module → `terraform apply` creates WAF WebACL and associates with ALB
14. `iam` module → `terraform apply` creates OIDC provider and GitHub Actions role

### Phase E — Workspaces + CI/CD

15. `terraform workspace new dev` — spin up an isolated dev stack
16. Update `.github/workflows/deploy.yml` to use OIDC (`role-to-assume`) — delete static AWS keys from GitHub Secrets

---

## Key Concepts to Understand

**Import vs recreate**: Terraform import reads an existing AWS resource into Terraform state without touching the resource. After import, `terraform plan` should show zero changes — if it shows changes, your HCL doesn't match the actual config and you reconcile the code, not the infra.

**`ignore_changes = [task_definition]`**: The ECS module uses this on the service resource. Why: CI/CD (GitHub Actions) owns deploying new container images, so Terraform should not try to revert the task definition to whatever was in state at last apply. Without this, every `terraform apply` would roll back the running image to the version from the last IaC change.

**`prevent_destroy = true`** on the tfstate bucket: If someone accidentally runs `terraform destroy` on the bootstrap module, this lifecycle rule blocks it. Losing the state file means losing track of all managed resources.

**`us-east-1` provider alias for ACM**: CloudFront requires SSL certificates to be in `us-east-1` regardless of where your other resources live. The `s3_cloudfront` module uses an `aws.us_east_1` provider alias to look up the ACM cert in the right region.

**GitHub Actions OIDC**: Instead of storing long-lived `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` in GitHub Secrets, the CI/CD job exchanges a short-lived GitHub JWT for temporary AWS credentials via `sts:AssumeRoleWithWebIdentity`. The trust policy scopes access to `refs/heads/main` only — forks and PRs cannot assume the role.

---

## Interview Narrative

> "I own the full infrastructure for MealDice — it's all Terraform. Eight modules: VPC, ECS Fargate, ALB, RDS MySQL, ElastiCache Redis, S3 + CloudFront, WAF, and IAM. Remote state in S3 with native S3 locking (`use_lockfile = true`, Terraform ≥ 1.10 — no DynamoDB needed), dev/prod workspaces, and GitHub Actions uses OIDC so there are zero static IAM keys in our secrets.
>
> The trickiest part was the import phase — all the infra was manually created, so I had to write the HCL to match the existing config exactly. If `terraform plan` shows any changes after an import, it means my code doesn't match reality. I reconcile the code to match AWS, not the other way around — you never want an accidental apply to modify production infra just because your variable was off by one.
>
> I also added WAF as a net-new resource — rate-based rules at 2000 requests per 5 minutes per IP. That replaced what was previously handled only at the application layer."

---

## What Comes After Phase 3

Once IaC is complete, the roadmap continues in this order:

### 1. Security — Auth Hardening
Replace the current single 3-day JWT (localStorage) with Access + Refresh Token.

See [phase-security-auth-hardening.md](phase-security-auth-hardening.md) for the full roadmap.

### 2. Phase 4 — Microservices
Decompose the NestJS monolith into 7 independently deployable services (gateway · auth · user · meal · plan · ai · notification). Phase 4 Terraform (Phase B) depends on Phase 3 IaC being complete.

See [phase4-microservices-roadmap.md](phase4-microservices-roadmap.md) for the full roadmap.

### 3. AI Main Track (Steps 4–6 + NEW)

| Step   | What                                | AI Gap Closed                          |
| ------ | ----------------------------------- | -------------------------------------- |
| Step 4 | Native Tool Use (`tool_use` blocks) | Function calling — #1 market demand    |
| Step 5 | Chatbot with Memory                 | Stateful AI, context management        |
| Step 6 | Prompt Caching + Model Routing      | Cost optimization                      |
| NEW    | Agent Workflow                      | Multi-step agents — #3 market demand   |
| NEW    | RAG — Semantic Meal Search          | Vector search — #2 market demand       |
| NEW    | Eval / Guardrails                   | LLM-as-judge, production quality gates |

See [backlog.md](backlog.md) for full priority order and [docs/superpowers/plans/2026-05-15-phase3-terraform-iac.md](superpowers/plans/2026-05-15-phase3-terraform-iac.md) for the step-by-step implementation plan.

---

_Last updated: 2026-06-07 — ALB module imported; post-Phase 3 roadmap updated (Auth Hardening → Microservices → AI)_
