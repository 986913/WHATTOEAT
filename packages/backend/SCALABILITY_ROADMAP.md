# Scalability Roadmap — whatToEat

## Current Architecture

```
                   ┌──────────────────────────────┐
                   │        Single EC2             │
                   │  ┌────────┐  ┌─────────────┐ │
 User ──► Route53 ──►│ Nginx  │──│  NestJS API  │ │
                   │  │ :443   │  │  :3001       │ │
                   │  └────────┘  └──────┬───────┘ │
                   │  ┌────────┐         │         │
                   │  │ Redis  │◄────────┘         │
                   │  │(Docker)│                   │
                   │  └────────┘                   │
                   └──────────────────────────────┘
                                         │
                                         ▼
                                ┌─────────────────┐
                                │   AWS RDS MySQL  │
                                │   (Single-AZ)    │
                                └─────────────────┘
```

## SPOF Analysis

| Component      | Current State                    | Risk Level   | Impact                                     |
| -------------- | -------------------------------- | ------------ | ------------------------------------------ |
| EC2 Instance   | Single instance, all services    | **Critical** | EC2 down = entire app down                 |
| Nginx          | Docker on same EC2               | **Critical** | Tied to EC2 lifecycle                      |
| NestJS Backend | Docker on same EC2               | **Critical** | Tied to EC2 lifecycle                      |
| Redis          | Docker container, no persistence | **High**     | Container restart = cache lost             |
| RDS MySQL      | Single-AZ                        | **Medium**   | AZ failure = DB down (can enable Multi-AZ) |
| SSL/TLS        | Let's Encrypt on Nginx           | **Low**      | Manual renewal, tied to single instance    |

---

## Migration Steps

### Step 1 — RDS Multi-AZ

**Effort**: Minimal (console operation, ~30 min)
**Code changes**: None
**Cost impact**: ~2x RDS cost

**What to do**:

- AWS Console → RDS → Modify → Enable Multi-AZ deployment
- RDS automatically creates standby replica in different AZ
- Automatic failover if primary Availability Zone goes down

**Why first**: Protects the most critical component (data) with zero code changes.

---

### Step 2 — Redis → ElastiCache

**Effort**: Low (change one environment variable)
**Code changes**: Update `REDIS_HOST` env var
**Cost impact**: ~$15-25/mo for cache.t3.micro

**What to do**:

1. Create ElastiCache Redis cluster (single node is fine to start, can add replicas later)
   - Place in same VPC as EC2
   - Security group: allow port 6379 from EC2 security group
2. Update `.env` / config:
   ```
   REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
   REDIS_PORT=6379
   ```
3. Remove Redis service from `docker-compose.yml`
4. Deploy and verify caching still works

**Why**: Decouple Redis from EC2 lifecycle. ElastiCache handles failover, patching, backups.

**ElastiCache creation settings**:

| Setting | Value | Why |
|---------|-------|-----|
| Engine | Redis OSS | 与现有代码兼容（`@keyv/redis`，`redis://` 协议） |
| Deployment | Node-based cluster | 固定成本，适合低流量项目 |
| Cluster mode | Disabled | 简单缓存不需要分片 |
| Node type | cache.t3.micro (0.5 GB) | 免费期内 $0，之后 ~$15/mo |
| Replicas | 0 | 缓存 TTL 只有 2 分钟，丢了也不影响功能 |
| Multi-AZ | Disabled | 无 replica 时不需要 |
| Encryption | Disabled (at rest + in transit) | 同 VPC 内部通信，简单缓存不需要 |
| Backups | Disabled | 缓存是临时数据，不需要备份 |

**Security Group inbound rules（`my-web-app-sg`）**:

| Rule | Port | Source | 作用 |
|------|------|--------|------|
| HTTPS | 443 | 0.0.0.0/0 | 用户通过 HTTPS 访问网站 |
| HTTP | 80 | 0.0.0.0/0 | HTTP 访问（Nginx 跳转到 HTTPS） |
| SSH | 22 | 0.0.0.0/0 | 本地电脑 SSH 登录 EC2 |
| Custom TCP | 6379 | sg-自身 | EC2 连接 ElastiCache Redis（同 SG 内互通） |

> 前三条 source 是 `0.0.0.0/0`（对外公开），因为是面向用户的服务。
> 6379 的 source 设为 security group 自身，表示只有同一个 SG 内的资源（EC2 和 ElastiCache）才能互相访问，外部无法连接 Redis。

**Current Redis usage** (low risk to migrate):

- Meal options cache with 2-min TTL + jitter
- Cache keys: `meals:options:type:{typeId}`, `meals:byType:{typeId}:user:{userId}`
- Cache invalidated on any meal write (create/update/delete)

---

### Step 3 — Stateless Verification (Checklist)

**Effort**: Zero (verification only)
**Code changes**: None

Before horizontal scaling, verify the backend is stateless:

- [x] **Auth is JWT-based** — no server-side sessions stored in memory
- [x] **JWT secret from env var** — `JWT_SECRET` in `.env`, not hardcoded
- [x] **Cache is external** — after Step 2, Redis is on ElastiCache
- [x] **No local file storage** — images are external URLs, no file uploads
- [x] **No in-memory state** — no singleton stores, no process-level caches
- [x] **Config from environment** — all secrets/config via env vars + YAML

**Result**: Backend is ready to run on multiple instances behind a load balancer.

---

### Step 4 — ALB + Frontend to S3/CloudFront

**Effort**: Medium (biggest architectural change)
**Code changes**: Minimal backend changes; Nginx removal; deployment pipeline update

#### 4a. Frontend → S3 + CloudFront

**What to do**:

1. Create S3 bucket for static hosting (e.g., `mealdice-frontend`)
2. Build React app: `npm run build` → upload `dist/` to S3
3. Create CloudFront distribution pointing to S3
4. Configure Route53: `mealdice.com` → CloudFront
5. ACM certificate for CloudFront (free, auto-renew)

**Benefits**:

- Frontend no longer consumes EC2 resources
- Global CDN = faster load times
- Automatic scaling, no server management

#### 4b. ALB for Backend

**What to do**:

1. Create Application Load Balancer in 2+ AZs
2. ACM certificate for API domain (e.g., `api.mealdice.com`)
3. ALB listener: HTTPS :443 → Target Group :3001
4. Register EC2 instance in target group
5. Update Route53: `api.mealdice.com` → ALB
6. Update frontend API base URL to point to ALB domain
7. Configure ALB health check: `GET /api/v1/health` (may need to add health endpoint)

**Benefits**:

- SSL/TLS offloaded to ALB + ACM (no more Let's Encrypt manual renewal)
- Ready for multiple backend instances
- Built-in health checks

#### 4c. Remove Nginx

After ALB handles TLS and routing:

- Remove Nginx from `docker-compose.yml`
- ALB directly routes to backend on port 3001
- Simplify Docker setup to just the backend service

**Target Architecture after Step 4**:

```
                        ┌─── CloudFront (CDN) ◄── S3 (React build)
                        │
 User ──► Route53 ──────┤
                        │
                        └─── ALB (HTTPS :443)
                              │
                              ▼
                         ┌────────┐
                         │  EC2   │
                         │ NestJS │
                         │ :3001  │
                         └───┬────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              ElastiCache         RDS MySQL
              (Redis)             (Multi-AZ)
```

---

### Step 5 — ECS Fargate (Serverless Containers)

**Effort**: Medium
**Code changes**: None (backend is already Dockerized and stateless)
**Cost impact**: Fargate ~30-40% more expensive than equivalent EC2, but eliminates all instance management

> **Why Fargate instead of EC2 ASG?**
> The backend is already Docker-based. Going EC2 ASG would require building AMIs, writing User Data
> startup scripts, managing OS patches — all "previous generation" ops work that Fargate eliminates.
> Since the code is already containerized, Fargate is the natural next step.

**What to do**:

1. **ECR (Elastic Container Registry)**: Create a private image repository
   ```bash
   aws ecr create-repository --repository-name mealdice-backend
   docker tag mealdice-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/mealdice-backend:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/mealdice-backend:latest
   ```
2. **ECS Cluster**: Create a Fargate cluster (just a logical grouping, no instances to manage)
3. **Task Definition**: Define your container runtime
   - Image: ECR image URI
   - CPU: 0.25 vCPU, Memory: 0.5 GB (start small, scale as needed)
   - Port mapping: 3001
   - Environment variables: DB_HOST, REDIS_HOST, JWT_SECRET, etc.
   - Log driver: awslogs → CloudWatch
4. **ECS Service**: Create a service that maintains desired task count
   - Desired count: 2 (one per AZ for high availability)
   - Attach to Step 4's ALB target group
   - Auto-scaling policy: CPU > 70% → add tasks, CPU < 30% → remove tasks
   - Min: 2, Max: 6
5. **Decommission EC2**: Once Fargate service is healthy, terminate the old EC2 instance

**Target Architecture after Step 5**:

```
                        ┌─── CloudFront (CDN) ◄── S3 (React build)
                        │
 User ──► Route53 ──────┤
                        │
                        └─── ALB (HTTPS :443)
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
            ┌─────────┐ ┌─────────┐ ┌─────────┐
            │ Fargate │ │ Fargate │ │ Fargate │
            │  Task   │ │  Task   │ │  Task   │
            │ NestJS  │ │ NestJS  │ │ NestJS  │
            │ (AZ-a)  │ │ (AZ-b)  │ │ (AZ-a)  │
            └─────────┘ └─────────┘ └─────────┘
                 │            │            │
                 ▼            ▼            ▼
            ElastiCache (Redis)     RDS MySQL (Multi-AZ)
```

**No EC2 instances in the picture.** AWS manages the underlying compute.

---

## Health Check Endpoint

Step 4 requires an ALB health check. Add to backend:

```typescript
// health.controller.ts
@Controller('api/v1/health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

---

## Docker Compose Changes Summary

| Component | Before                | After                               |
| --------- | --------------------- | ----------------------------------- |
| Nginx     | In docker-compose.yml | Removed (ALB replaces it)           |
| Redis     | In docker-compose.yml | Removed (ElastiCache replaces it)   |
| Backend   | Docker on EC2         | ECS Fargate (serverless containers) |
| Frontend  | Served by Nginx       | S3 + CloudFront                     |

---

## Cost Estimate (Approximate)

| Service                                        | Monthly Cost           |
| ---------------------------------------------- | ---------------------- |
| RDS Multi-AZ (db.t3.micro)                     | ~$30                   |
| ElastiCache (cache.t3.micro)                   | ~$15                   |
| ALB                                            | ~$20 + $0.008/LCU-hour |
| CloudFront (low traffic)                       | ~$1-5                  |
| S3 (static files)                              | < $1                   |
| ECS Fargate (2 tasks, 0.25 vCPU / 0.5 GB each) | ~$18                   |
| ECR (image storage)                            | < $1                   |
| **Total**                                      | **~$88-93/mo**         |

---

## CI/CD with Fargate

Once Fargate is running, the deploy pipeline becomes:

```
GitHub Push → GitHub Actions → Build Docker Image → Push to ECR → Update ECS Service
```

ECS will automatically do a rolling deployment: start new tasks with the new image, drain old tasks, zero downtime.

---

## Future Considerations (Post-IaC)

After manually building and validating this architecture, codify everything with IaC (Terraform or AWS CDK):

- **IaC**: Codify all AWS resources (ALB, ECS, RDS, ElastiCache, S3, CloudFront) as code
- **Lambda**: Offload Slack notifications, email sending (see separate Lambda analysis)
- **Monitoring**: CloudWatch alarms, X-Ray tracing, ECS container insights
- **WAF**: Attach to ALB for API protection
