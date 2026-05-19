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

| Module | Key AWS Resources | Net-New? |
|--------|------------------|----------|
| `vpc` | Default VPC (172.31.0.0/16), 3 public subnets (us-east-2a/b/c), 1 shared SG | ✅ Imported |
| `rds` | RDS MySQL 8.0 instance, DB subnet group | Import |
| `elasticache` | Redis replication group, ElastiCache subnet group | Import |
| `alb` | Application Load Balancer, HTTPS/HTTP listeners, target group | Import |
| `ecs` | Fargate cluster, ECR repo, task execution IAM role, task definition, Fargate service | Import |
| `s3_cloudfront` | S3 bucket (`mealdice-frontend`), CloudFront distribution | Import |
| `waf` | WAF WebACL (rate-based rule: 2000 req/5min per IP), ALB association | **New** |
| `iam` | GitHub OIDC provider, IAM role (replaces static access keys in CI/CD) | **New** |

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
8. `rds` module → import RDS instance
9. `elasticache` module → import Redis cluster
10. `alb` module → import load balancer and listeners
11. `ecs` module → import cluster, ECR repo, and service
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

> "I own the full infrastructure for MealDice — it's all Terraform. Eight modules: VPC, ECS Fargate, ALB, RDS MySQL, ElastiCache Redis, S3 + CloudFront, WAF, and IAM. Remote state in S3 with DynamoDB locking, dev/prod workspaces, and GitHub Actions uses OIDC so there are zero static IAM keys in our secrets.
>
> The trickiest part was the import phase — all the infra was manually created, so I had to write the HCL to match the existing config exactly. If `terraform plan` shows any changes after an import, it means my code doesn't match reality. I reconcile the code to match AWS, not the other way around — you never want an accidental apply to modify production infra just because your variable was off by one.
>
> I also added WAF as a net-new resource — rate-based rules at 2000 requests per 5 minutes per IP. That replaced what was previously handled only at the application layer."

---

## What Comes After Phase 3

Once IaC is complete, the AI skill track resumes:

| Step | What | AI Gap Closed |
|------|------|--------------|
| Step 4 | Native Tool Use (`tool_use` blocks) | Function calling — #1 market demand |
| Step 5 | Chatbot with Memory | Stateful AI, context management |
| Step 6 | Prompt Caching + Model Routing | Cost optimization |
| NEW | Agent Workflow | Multi-step agents — #3 market demand |
| NEW | RAG — Semantic Meal Search | Vector search — #2 market demand |
| NEW | Eval / Guardrails | LLM-as-judge, production quality gates |

See [backlog.md](backlog.md) for full priority order and [docs/superpowers/plans/2026-05-15-phase3-terraform-iac.md](superpowers/plans/2026-05-15-phase3-terraform-iac.md) for the step-by-step implementation plan.

---

_Last updated: 2026-05-19_
