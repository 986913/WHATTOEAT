# MealDice Backlog & Tech Debt

> **核心方向：AI Engineer 转型。先完成 IaC 建立基础设施叙事，再补齐 AI 核心技能链。**
> 优先级定义：**Phase 3 IaC（当前焦点）** → **AI 主线**（Steps 4-8 + 3 新增）→ **P0** 生产隐患 → **TD1** 技术债 → **TD2** 工程质量 → **TD3** 功能完善

---

## Phase 3: Infrastructure as Code (Terraform) — 当前焦点

> **Plan:** [docs/superpowers/plans/2026-05-15-phase3-terraform-iac.md](superpowers/plans/2026-05-15-phase3-terraform-iac.md)
> **简历叙事**：全量基础设施代码化，8 个独立模块，remote state，dev/prod workspace，GitHub Actions 无静态凭证。

- [x] **Task 1**：Bootstrap 远程状态（S3 bucket `mealdice-tfstate`，本地 state，一次性执行）
  - 注：使用 S3 原生锁（`use_lockfile = true`，Terraform 1.10+），未使用 DynamoDB
- [x] **Task 2**：根模块脚手架（`provider.tf`、`backend.tf`、`variables.tf`、`.gitignore` 补 `*.tfvars`）
- [x] **Task 3**：VPC 模块 import 成功（`terraform plan` 显示 0 changes）
  - 注：使用 Default VPC（172.31.0.0/16）+ 3 个 public subnet（us-east-2a/b/c），单一共享 SG
  - 偏差原点：原计划自定义 VPC + 2 public + 2 private + 4 独立 SG；当前先 import 现状，private subnet 拆分作为后续技术债
  - 附：`infra/README.md` 已创建，含架构 Mermaid 图、SG 规则表、常用命令
- [ ] **Task 4**：RDS 模块（MySQL 8.0、DB subnet group、deletion_protection、backup retention 7 天）
- [ ] **Task 5**：ElastiCache 模块（Redis 7、transit + at-rest encryption、AUTH token）
- [ ] **Task 6**：ALB 模块（HTTP→HTTPS redirect、HTTPS listener、ACM cert data source）
- [ ] **Task 7**：ECS 模块（Fargate cluster + ECR repo + 执行 IAM Role + task definition + service，`ignore_changes = [task_definition]`）
- [ ] **Task 8**：S3 + CloudFront 模块（OAC 非 OAI、SPA 403/404→index.html、CloudFront 限定 bucket policy）
- [ ] **Task 9**：WAF 模块 ⭐ 净新增（Rate-based rule 2000 req/5min + AWS Managed Common Rule Set，挂 ALB）
- [ ] **Task 10**：IAM / OIDC 模块 ⭐ 净新增（GitHub OIDC provider + least-privilege role，替换静态 IAM key）
- [ ] **Task 11**：根模块串联（`main.tf` 实例化所有子模块，`outputs.tf`）
- [ ] **Task 12**：Import 已有生产资源（`terraform import` 全量，plan 必须显示 0 change 才算成功）
- [ ] **Task 13**：Dev workspace（`terraform workspace new dev`，独立测试栈）
- [ ] **Task 14**：更新 GitHub Actions 使用 OIDC Role（删除静态 Access Key）

---

## AI 主线 — Phase 2: AI-Powered Meal Planning

**执行顺序（内部依赖）：**

- [x] **Step 0（前置）**：Redis 基础设施上线
- [x] **Step 1**：Backend AI Service（AiModule + Claude streaming + SSE endpoint）
- [x] **Step 2**：SSE Streaming Pipeline（taskId 模式 + heartbeat + 超时处理）
- [x] **Step 3**：Frontend Streaming UI（逐天渐进渲染 + AI Suggestion badge）
- [ ] **Step 4**：Native Tool Use 重构（Claude 原生 `tool_use` blocks，替换 JSON mode）
  - 修改范围：`ai.service.ts` + `ai.prompts.ts`，无需改前端
  - 定义 `record_day_plan` 和 `suggest_meal` 两个 tool schema
  - 面试信号：`tool_use` 是 AI Engineer JD 第 #1 要求的技能
  - **Plan:** [docs/superpowers/plans/2026-04-15-step4-native-tool-use.md](superpowers/plans/2026-04-15-step4-native-tool-use.md)
- [ ] **Step 5**：Meal Planning Chatbot with Memory（对话式菜谱规划助手）
  - 新增 `ChatModule`（独立于 `AiModule`）
  - Session memory：对话历史存 Redis（滑动窗口，最近 20 条）
  - Long-term memory：从对话中提取用户饮食偏好，持久化到用户 profile（DB）
  - 前端：WeekPlans 页侧滑 Chat Panel（不新增路由）
  - **Plan:** [docs/superpowers/plans/2026-04-15-step5-chatbot-with-memory.md](superpowers/plans/2026-04-15-step5-chatbot-with-memory.md)
- [ ] **Step 6**：Prompt Caching + Model Tier Routing（成本优化）
  - system prompt 加 `cache_control: {type: "ephemeral"}`
  - 模型分级路由：简单请求 → Haiku；复杂请求 → Sonnet
  - CloudWatch namespace `MealDice/AI`：input/output tokens + cache hit rate + 估算费用
  - **Plan:** [docs/superpowers/plans/2026-04-15-step6-prompt-caching-routing.md](superpowers/plans/2026-04-15-step6-prompt-caching-routing.md)
- [ ] **NEW — Agent Workflow**：多步骤 Agentic 菜谱规划（市场需求 #3）
  - 基于 Step 4 的 `tool_use`，构建循环规划 Agent
  - 流程：`research_meals(constraints)` → `validate_nutrition(plan)` → `refine(feedback)` → `finalize_plan(approved)`
  - 每个 tool 是 NestJS service method；Agent 循环直到调用 `finalize_plan` 或达到 max iterations
  - 面试信号：Multi-step agent with planning, tool handoffs, loop termination
- [ ] **NEW — RAG（Semantic Meal Search）**：语义菜谱搜索（市场需求 #2）
  - Vector store：Pinecone（managed，free tier），MySQL 保持主数据库
  - 菜谱 create/update 时生成 embedding（Claude API），upsert 到 Pinecone
  - 搜索时：embed query → `pinecone.query()` → 用返回的 meal IDs 从 MySQL 取完整记录
  - NestJS 新增 `VectorModule` 封装 Pinecone client
  - 面试信号：Vector DB integration, embedding pipeline, hybrid retrieval（vector + relational）
- [ ] **NEW — Eval / Guardrails**：AI 输出质量评估（差异化加分项）
  - Claude 生成菜谱后，第二次调用 Claude Haiku 作为 Judge：打分 1-10，返回 `{score, reason}`
  - 分数 < 6 → 自动重新生成一次（最多 1 次 retry）
  - 分数 + reason 写入 CloudWatch，建立质量趋势看板
  - 面试信号：LLM-as-judge, measurable AI output quality, production guardrail pattern
- [ ] **Step 7**：Save AI Suggestions to Library（需要 TD1.2 DB migration 先到位）
- [ ] **Step 8**：Observability & Guardrails（Event Loop 监控 + 熔断机制 + Slack 异常告警）

**已知 AI 层 Bug & 风险（待修复）：**

| 坑                       | 说明                                                    | 改进方向                                    | 优先级 |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------- | ------ |
| SSE 无鉴权               | `GET /ai/stream` 无 Guard，靠 UUID 难猜性保护           | query param 传短期 token                    | P0     |
| 用户锁 TTL 过短          | 120s 后锁自动释放，AI 若生成超时用户可重复触发          | 加锁续期或调大 TTL                          | P0     |
| releaseUserLock 错误被吞 | `.finally` 里的锁释放失败无日志，锁卡死 120s            | 加 try-catch + 告警                         | P0     |
| 无 DTO 校验              | POST body 无 ValidationPipe，可传超长 preference 刷账单 | 加 `@MaxLength` DTO                         | P0     |
| Buffer 竞态窗口          | `LRANGE` 和 `SUBSCRIBE` 之间毫秒级 gap 可能丢消息       | 改用 Redis Stream（XADD/XREAD）             | TD1    |
| Unsplash 串行阻塞        | 多天之间串行拉图片，第三方慢 → 流式卡顿                 | 先 publish 无图数据，图片异步补 update 事件 | TD2    |

---

## AI 架构防御 — 保持 AiModule 现有单体形态，补防御性编程

- [ ] **Event Loop 监控**：接入 CloudWatch 监控 `Event Loop Lag` 和内存占用
- [ ] **熔断机制**：为 Anthropic API 调用设置严格超时时间和重试上限（`timeout: 60s, maxRetries: 1`）
- [ ] **保持模块边界**：`AiModule` 与其他模块的耦合只停留在 DI 层面

---

## P0 — 生产隐患

> WAF 和 GitHub Actions OIDC 已并入 Phase 3 IaC（Tasks 9, 10, 14），以下为剩余 P0 项。

- [ ] **Observability**：CloudWatch Metrics（DAU、P99 延迟、错误率）
- [ ] **Email sender 动态化**：Feedback sender 改为动态用户；Reset password sender 换成 `noreply@mealdice.com`
- [ ] **隐藏源码**：生产构建移除 comments，开启压缩混淆

---

## TD1 — 技术债：简历加分项

### TD1.1 Redis Caching Layer

- [ ] 首页菜谱列表接口加 Redis Cache（TTL 策略）
- [ ] 写入/更新时主动 invalidate 相关 cache key
- [ ] 接入监控对比加缓存前后 P99 延迟，数据写进简历

### TD1.2 Database Migration 体系

（Phase 2 Step 7 的前置依赖）

- [ ] 引入 TypeORM Migration（替代 `synchronize: true`）
- [ ] CI/CD pipeline 加入 migration 自动执行步骤
- [ ] 建立 rollback migration SOP
- [ ] Step 7 所需 migration：新增 `is_ai_suggested` + `ai_suggestion_meta` JSON 字段到 `meal` 表

---

## TD2 — 工程质量（低优先级）

### 测试

- [ ] E2E 测试：Cypress 或 Playwright，覆盖核心用户路径
- [ ] PR 质量门槛：GitHub Actions 加测试覆盖率检查
- [ ] 安全扫描（OWASP Top 10）

### 代码健康

- [ ] UI Hooks 提取重构
- [ ] Swagger API 文档（`@nestjs/swagger`）
- [ ] ~~Smart Meal Replacement 算法升级~~ ← **已被 Phase 2 AI 取代，删除**

### 可靠性

- [ ] SLO 99.9%：RDS Multi-AZ + ECS 多实例 Health Check
- [ ] Read-heavy 一致性：评估 Read Replica + 缓存一致性策略

---

## TD3 — 功能与 UX（最低优先级）

### Admin Dashboard

- [ ] Custom Meals sidebar 对 admin 隐藏
- [ ] All Meals 列表显示 `creator` 字段 + Filter

### Bug Fixes & UX

- [ ] Signup 流程体感优化
- [ ] Week List Draft Preview banner 保持 sticky
- [ ] 平板 / 桌面 card ingredients 字体过大，缩小字号
- [ ] 首屏加载速度优化（bundle size + 懒加载）
- [ ] PWA 支持（Service Worker + manifest）
- [ ] 更新 README（架构图更新为 ECS/Fargate 版本）

### CI/CD 精进

- [ ] ECS 部署失败自动 Rollback
- [ ] Semantic Release 自动版本 + Changelog
- [ ] 自动 Release Notes 推 Slack

---

## 已完成 ✅

- [x] 搭建端到端 CI/CD Pipeline（GitHub Actions → ECR → ECS 滚动部署）
- [x] 解决单机 Docker Compose SPOF，迁移到 ECS Fargate + ALB 多实例架构
- [x] 前端静态资源迁移到 S3 + CloudFront
- [x] Database Seeds
- [x] Redis 基础设施接入（ElastiCache + ioredis Pub/Sub + cache-manager）
- [x] Backend AI Service（AiModule + Claude streaming + SSE endpoint）
- [x] SSE Streaming Pipeline（taskId 模式 + heartbeat + buffer replay）
- [x] Frontend Streaming UI（逐天渐进渲染 + AI Suggestion badge + Save to Library）

---

## 架构演进路线图

```
现在
  ECS Fargate（单体 NestJS）+ RDS + S3/CloudFront + ALB + ElastiCache Redis
  + Claude API Streaming + SSE + Redis Pub/Sub（AI 主线 Step 0-3 完成）

↓ Phase 3: IaC（当前焦点）
  + Terraform 8 模块全量 IaC（VPC / ECS / ALB / RDS / ElastiCache / S3+CF / WAF / IAM）
  + Remote state（S3 + DynamoDB），dev/prod workspace
  + GitHub Actions OIDC（无静态凭证）
  + WAF Rate-based Rules（净新增，挂 ALB）

↓ AI 主线 Steps 4-6（AI Engineer 核心技能）
  + Claude native tool_use（替换 JSON mode）
  + Chatbot with Memory（Redis session + DB long-term prefs）
  + Prompt Caching + Model Tier Routing + Cost Telemetry

↓ AI 主线 新增三项（市场需求前三）
  + Agent Workflow（multi-step meal planning agent with tool handoffs）
  + RAG — Semantic Meal Search（Pinecone vector DB + MySQL hybrid retrieval）
  + Eval / Guardrails（LLM-as-judge, score < 6 auto-retry, CloudWatch trend）

↓ AI 主线 Steps 7-8 + TD1
  + Save AI Suggestions to Library（需要 TD1.2 migrations）
  + AI Observability（熔断 + Event Loop 监控）
  + Redis Caching 业务层 + TypeORM Migrations

↓ TD2 测试 + TD2 可靠性
  AI Engineer 全栈项目：
  IaC + Streaming + Tool Use + Agent + RAG + Eval + Memory + Caching + 监控 + 安全
  → 面试可以清晰讲述每一个架构决策的 why
```

---

_Last updated: 2026-05-19_
