# MealDice — Infrastructure

Terraform-managed AWS infrastructure targeting region `us-east-2`.

> **Note:** Architecture diagrams are manually maintained. Update this file when adding new modules.

---

## Directory Structure

```
infra/
├── main.tf           # Root module: wires all child modules together
├── variables.tf      # Global variable definitions
├── provider.tf       # AWS Provider + default_tags
├── backend.tf        # Remote state → S3
├── envs/
│   └── prod.tfvars   # Production variable values (gitignored)
├── bootstrap/        # One-time setup: creates the S3 state bucket
└── modules/
    ├── vpc/          # Network layer — Default VPC, 3 public subnets, shared SG (imported ✅)
    ├── rds/          # RDS MySQL 8.4.8 instance + DB subnet group (imported ✅)
    ├── elasticache/  # Redis 7.1 replication group + subnet group (imported ✅)
    └── alb/          # ALB + HTTPS listener + target group, ACM cert data source (imported ✅)
    └── ecs/          # ECS Fargate cluster + ECR + task definition + service, CloudWatch logs (imported ✅)
```

---

## Module Architecture

```mermaid
graph TD
    subgraph Root["Root Module infra/"]
        VPC["module.vpc ✅"]
        RDS["module.rds ✅"]
        CACHE["module.elasticache ✅"]
        ALB["module.alb ✅"]
        ECS["module.ecs ✅"]
        S3CF["module.s3_cloudfront 🔜"]
        WAF["module.waf 🔜"]
        IAM["module.iam 🔜"]
    end

    VPC -- "subnet_ids" --> RDS
    VPC -- "subnet_ids\nsg_id" --> CACHE
    VPC -- "subnet_ids\nsg_id" --> ALB
    VPC -- "subnet_ids\nsg_id" --> ECS
    RDS -- "db_endpoint" --> ECS
    CACHE -- "redis_primary_endpoint" --> ECS
    ALB -- "target_group_arn" --> ECS
    ALB -- "alb_dns_name\nalb_zone_id" --> WAF
```

Modules pass values to each other via `output → variable` references — no hardcoded AWS resource IDs.

---

## Network Architecture (Current)

```mermaid
graph TB
    subgraph AWS["AWS us-east-2"]
        subgraph VPC["Default VPC  172.31.0.0/16"]
            subgraph AZA["us-east-2a"]
                SA["Public Subnet A"]
            end
            subgraph AZB["us-east-2b"]
                SB["Public Subnet B"]
            end
            subgraph AZC["us-east-2c"]
                SC["Public Subnet C"]
            end
            SG["Security Group: my-web-app-sg"]
            DefaultSG["Security Group: default (RDS)"]
            ALB["ALB: mealdice-alb\nHTTPS :443 only\nidle_timeout=300s"]
            ECS["ECS Fargate\n(port 3001)"]
            RDS[("RDS: database-2\nMySQL 8.4.8 / db.t4g.micro\nport 3310 / multi-AZ")]
            REDIS[("ElastiCache Redis\nmealdice-redis\nport 6379")]
        end
        S3["S3: mealdice-tfstate\n(remote state)"]
        ACM["ACM: api.mealdice.com\n(data source only)"]
    end

    Internet(("Internet")) -- "HTTPS :443" --> ALB
    Internet -- ":22 ⚠️" --> SG
    ALB -- "HTTP :3001" --> ECS
    ECS -- ":3310" --> RDS
    ECS -- ":6379" --> REDIS
    ACM -. "cert lookup" .-> ALB
    ALB & ECS & REDIS -.-> SG
    RDS -.-> DefaultSG
```

**Current network characteristics:**
- Uses AWS Default VPC — `terraform destroy` will not actually delete it
- All 3 AZ subnets are public (inherent to Default VPC)
- All resources share a single Security Group `my-web-app-sg` (legacy), except RDS which uses the VPC default SG
- ALB handles TLS termination — traffic from ALB to ECS is plain HTTP

---

## Security Group Rules

| Direction | Port | Source | Purpose |
|-----------|------|--------|---------|
| Ingress | 80 | `0.0.0.0/0` | Public HTTP access |
| Ingress | 443 | `0.0.0.0/0` | Public HTTPS access |
| Ingress | 22 | `0.0.0.0/0` | SSH ⚠️ needs to be restricted |
| Ingress | 3001 | self | ALB → ECS backend |
| Ingress | 6379 | self | ECS → ElastiCache Redis |
| Egress | ALL | `0.0.0.0/0` | Unrestricted outbound |

---

## Global Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-east-2` | Primary region |
| `app_name` | `mealdice` | Prefix for all resource names |
| `environment` | — | `prod` or `dev` |
| `db_password` | — | RDS master password (sensitive) |
| `db_username` | `admin` | RDS master username |
| `db_name` | `mealdice` | App env var — schema name (`eatdbprod` in prod, created manually via CLI) |
| `domain_name` | — | Primary domain, e.g. `mealdice.com` |
| `github_repo` | `986913/WHATTOEAT` | OIDC trust policy scope |
| `rds_sg_id` | `sg-09ffc1c2310dbf1d8` | SG attached to RDS — VPC default SG (legacy, not app SG) |

---

## RDS Module

| Field | Value |
|-------|-------|
| Identifier | `database-2` |
| Engine | MySQL `8.4.8` |
| Instance class | `db.t4g.micro` |
| Port | `3310` |
| Multi-AZ | `true` |
| Storage | 20 GB gp2, autoscale up to 1000 GB |
| Encryption | ✓ at-rest |
| Backup retention | 1 day |
| Monitoring interval | 60s (Enhanced Monitoring) |
| Subnet group | `default-vpc-0de0822aefb86efbd` |
| Security group | `sg-09ffc1c2310dbf1d8` (VPC default SG, **not** the app SG) |
| `db_name` | Not set — `eatdbprod` schema was created manually via CLI after instance creation |
| `deletion_protection` | `false` (legacy — should be enabled) |
| `publicly_accessible` | `true` (legacy — should be disabled) |

**Import commands used:**
```bash
terraform import -var-file=envs/prod.tfvars \
  module.rds.aws_db_subnet_group.main default-vpc-0de0822aefb86efbd

terraform import -var-file=envs/prod.tfvars \
  module.rds.aws_db_instance.main database-2
```

---

## ElastiCache Module

| Field | Value |
|-------|-------|
| Replication Group ID | `mealdice-redis` |
| Engine | Redis `7.1` |
| Node type | `cache.t3.micro` |
| Nodes | 1 (single-node, no replicas) |
| Port | `6379` |
| Parameter group | `default.redis7` |
| Subnet group | `mealdice-redis-subnet` |
| Security group | `my-web-app-sg` (shared app SG) |
| Encryption at rest | ✓ |
| Encryption in transit | ✓ (required mode) |
| AUTH | Disabled — access controlled by SG only |
| Multi-AZ / Failover | Disabled |

**Import commands used:**
```bash
terraform import -var-file=envs/prod.tfvars \
  module.elasticache.aws_elasticache_subnet_group.main mealdice-redis-subnet

terraform import -var-file=envs/prod.tfvars \
  module.elasticache.aws_elasticache_replication_group.main mealdice-redis
```

---

## ALB Module

| Field | Value |
|-------|-------|
| Name | `mealdice-alb` |
| Scheme | `internet-facing` |
| Listeners | HTTPS :443 only (no HTTP :80) |
| SSL Policy | `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` |
| ACM Certificate | `api.mealdice.com` (data source lookup, not imported) |
| Target Group | `mealdice-fargate-tg` — type `ip`, port `3001` |
| Health Check | `GET /api/v1/health` → HTTP 200 |
| Security group | `my-web-app-sg` (shared app SG) |
| Idle timeout | `300s` (non-default — Terraform default is 60s) |

**Import commands used:**
```bash
terraform import -var-file=envs/prod.tfvars \
  module.alb.aws_lb.main \
  arn:aws:elasticloadbalancing:us-east-2:083308938013:loadbalancer/app/mealdice-alb/43b0e722175ece04

terraform import -var-file=envs/prod.tfvars \
  module.alb.aws_lb_target_group.main \
  arn:aws:elasticloadbalancing:us-east-2:083308938013:targetgroup/mealdice-fargate-tg/4bfe73d05b2e2e97

terraform import -var-file=envs/prod.tfvars \
  module.alb.aws_lb_listener.https \
  arn:aws:elasticloadbalancing:us-east-2:083308938013:listener/app/mealdice-alb/43b0e722175ece04/6269e8a6ff402d19
```

---

## ECS Module

| Field | Value |
|-------|-------|
| Cluster | `mealdice-backend-cluster` |
| ECR Repo | `mealdice-backend` |
| Task Definition | `mealdice-backend-task:5` (cpu=256, memory=512, awsvpc, FARGATE, X86_64/LINUX) |
| Container | `backend`, port 3001, image `:latest`, 11 env vars |
| Service | `mealdice-backend-service`, desired=2, capacity_provider=FARGATE weight=1 |
| Security group | `my-web-app-sg` (shared app SG, from `module.vpc.sg_id`) |
| Log group | `/ecs/mealdice-backend-task`, retention=30 days (was null) |
| IAM role | `ecsTaskExecutionRole` (data source — not imported, AWS default role) |

**Deviations from plan:**
- `ecsTaskExecutionRole` used as data source, not imported (not MealDice-specific)
- `configuration { execute_command_configuration { logging = "DEFAULT" } }` required on cluster
- `runtime_platform { X86_64 / LINUX }` required on task definition
- `availability_zone_rebalancing = "ENABLED"` and `enable_ecs_managed_tags = true` required on service (provider v5.100 new fields)
- Environment vars sorted alphabetically (AWS normalises order on import)

**Import commands used:**
```bash
terraform import -var-file=envs/prod.tfvars \
  module.ecs.aws_ecs_cluster.main mealdice-backend-cluster

terraform import -var-file=envs/prod.tfvars \
  module.ecs.aws_ecr_repository.main mealdice-backend

terraform import -var-file=envs/prod.tfvars \
  module.ecs.aws_cloudwatch_log_group.ecs /ecs/mealdice-backend-task

terraform import -var-file=envs/prod.tfvars \
  module.ecs.aws_ecs_task_definition.main \
  arn:aws:ecs:us-east-2:083308938013:task-definition/mealdice-backend-task:5

terraform import -var-file=envs/prod.tfvars \
  module.ecs.aws_ecs_service.main \
  mealdice-backend-cluster/mealdice-backend-service
```

---

## Remote State

| Config | Value |
|--------|-------|
| S3 Bucket | `mealdice-tfstate` |
| Key | `prod/terraform.tfstate` |
| Encryption | ✓ |
| Locking | S3 native lock (`.tflock`, requires Terraform ≥ 1.10) |

---

## Common Commands

```bash
# Initialize (required after first clone or adding a new module)
terraform init

# Preview changes without applying
terraform plan -var-file=envs/prod.tfvars

# Apply changes
terraform apply -var-file=envs/prod.tfvars

# Import an existing AWS resource into state
terraform import -var-file=envs/prod.tfvars <resource_address> <aws_id>

# Inspect current state
terraform state list
terraform state show <resource_address>
```

---

## Known Technical Debt

| Issue | Risk | Priority |
|-------|------|----------|
| Port 22 open to the world | SSH brute-force exposure | High |
| `deletion_protection = false` on RDS | Accidental `terraform destroy` would delete prod database | High |
| `publicly_accessible = true` on RDS | Database port 3310 reachable from public internet | High |
| RDS uses VPC default SG instead of dedicated SG | No layer isolation; default SG rules are shared across all resources | Medium |
| All subnets are public | Database directly reachable from internet | Medium |
| Single shared Security Group (`my-web-app-sg`) | Cannot enforce least-privilege between layers | Medium |
| `backup_retention_period = 1` on RDS | Only 1 day of automated backups — data loss window is large | Medium |
| Using Default VPC | Does not meet production security baseline | Low (high migration cost) |
