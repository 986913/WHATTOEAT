# MealDice Backlog & Tech Debt

> **核心方向：AI/Claude 集成优先，传统 Infra 作为简历托底。**
> 优先级定义：**AI** 主线 → **P0** 生产隐患 → **TD1** 技术债（简历加分）→ **TD2** 工程质量 → **TD3** 功能完善

---

## AI 主线 — Phase 2: AI-Powered Meal Planning

**执行顺序（内部依赖）：**

- [x] **Step 0（前置）**：Redis 基础设施上线——Phase 2 的 prompt cache、rate limiting、task 状态管理全部依赖 Redis，先把它接进来
- [x] **Step 1**：Backend AI Service（AiModule + Claude streaming + SSE endpoint）
- [x] **Step 2**：SSE Streaming Pipeline（taskId 模式 + heartbeat + 超时处理）
- [x] **Step 3**：Frontend Streaming UI（逐天渐进渲染 + AI Suggestion badge）
- [ ] **Step 4**：Native Tool Use 重构（把现有 JSON mode + bracket-depth 解析替换为 Claude 原生 `tool_use` blocks）
  - 修改范围：`ai.service.ts` + `ai.prompts.ts`，无需改前端
  - 定义 `record_day_plan` 和 `suggest_meal` 两个 tool schema
  - 面试信号：`tool_use` 是 Claude API 最常被问到的特性，比 JSON mode 更规范、更可靠
  - **Plan:** [docs/superpowers/plans/2026-04-15-step4-native-tool-use.md](superpowers/plans/2026-04-15-step4-native-tool-use.md)
- [ ] **Step 5**：Meal Planning Chatbot with Memory（对话式菜谱规划助手）
  - 新增 `ChatModule`（独立于 `AiModule`）
  - Session memory：对话历史存 Redis（滑动窗口，最近 20 条）
  - Long-term memory：从对话中提取用户饮食偏好，持久化到用户 profile（DB）
  - 前端：WeekPlans 页侧滑 Chat Panel（不新增路由）
  - 面试信号：展示 context window 管理、stateful AI、session vs long-term memory 的区别
  - **Plan:** [docs/superpowers/plans/2026-04-15-step5-chatbot-with-memory.md](superpowers/plans/2026-04-15-step5-chatbot-with-memory.md)
- [ ] **Step 6**：Prompt Caching + Model Tier Routing（成本优化）
  - 在 meal plan generation 的 system prompt 加 `cache_control: {type: "ephemeral"}`
  - 模型分级路由：偏好简单（< 20 词、< 2 dietary keywords）→ Haiku；复杂 → Sonnet
  - 接入 CloudWatch namespace `MealDice/AI`：记录 input/output tokens + cache hit rate + 估算费用
  - 面试信号："如何优化 Claude API 成本" 的标准答案，能给出真实数字
  - **Plan:** [docs/superpowers/plans/2026-04-15-step6-prompt-caching-routing.md](superpowers/plans/2026-04-15-step6-prompt-caching-routing.md)
- [ ] **Step 7**：Save AI Suggestions to Library（AI 建议的新菜持久化，需要 DB migration → 倒逼 TD1.2 先到位）
- [ ] **Step 8**：Observability & Guardrails（AI 请求日志 + Slack 异常告警 + fallback）

**对 backlog 其他条目的影响：**

- Step 0 完成 = TD1.1（Redis Caching）的基础设施同时建好，两件事合并做
- Step 5 Chatbot 需要 Redis session storage，Step 0 已满足依赖
- Step 7 完成 = 需要 DB migration，倒逼 TD1.2 先到位
- Step 8 完成 = P0 Observability 的 AI 部分覆盖，但通用监控（DAU、错误率）仍需单独处理
- Phase 2 上线 = 原 TD2.1「Smart Meal Replacement 算法升级」被取代，直接删除

---

## AI 架构防御 — 保持 AiModule 现有单体形态，补防御性编程

> **结论：现有 AiModule 架构是 MVP 和早期迭代的最优形态，不拆微服务。**
> 只需在现有基础上做好以下三件事。

- [ ] **Event Loop 监控**：接入 CloudWatch 监控 `Event Loop Lag` 和内存占用。AI streaming 是 CPU 密集路径，需要知道它有没有拖慢其他请求
- [ ] **熔断机制**：为 Anthropic API 调用设置严格超时时间和重试上限（如 `timeout: 60s, maxRetries: 1`），防止 Claude API 慢响应拖垮主线程
- [ ] **保持模块边界**：`AiModule` 与其他模块的耦合只停留在 DI 层面（构造函数注入）。如果将来需要拆分，只需把这个 Module 剪切出去，加一层 HTTP/gRPC 接口即可

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

## P0 — 生产隐患（穿插处理，单个改动小）

> 每项改动独立，不阻塞 AI 主线，利用碎片时间完成。

- [ ] **恶意访问防护 / Rate Limiting**：接入 AWS WAF Rate-based Rules，直接挂在 ALB + CloudFront 上。Pay-as-you-go（约 $5/月 WebACL + $1/百万请求），不需要改业务代码。防止：暴力 AI 接口调用刷 Anthropic 账单、DDoS、爬虫
- [ ] **Observability**：接入 CloudWatch Metrics，统计 DAU、P99 延迟、错误率——知道线上发生了什么（AI Step 8 的 AI 专项监控建立在这个基础上）
- [ ] **GitHub Actions 改用 OIDC Role**：替换现有 IAM User Access Key，改为 OIDC AssumeRole，消除长期凭证风险（改动仅在 workflow 文件和 AWS Console，约 1 小时）
- [ ] **Email sender 动态化**：Feedback sender 改为动态用户；Reset password sender 换成 `noreply@mealdice.com`
- [ ] **隐藏源码**：生产构建移除 comments，开启压缩混淆

---

## TD1 — 技术债：简历加分项

> 不影响 AI 主线进度，但完成后能显著提升项目在简历上的叙事深度。

### TD1.1 Redis Caching Layer

已随 Phase 2 Step 0 一起建好基础设施，这里补齐业务层缓存：

- [ ] 首页菜谱列表接口加 Redis Cache（TTL 策略）
- [ ] 写入/更新时主动 invalidate 相关 cache key
- [ ] 接入监控对比加缓存前后 P99 延迟，数据写进简历

### TD1.2 Database Migration 体系

Phase 2 Step 7 需要新增字段（AI 建议的新菜持久化），此前需要这个体系到位：

- [ ] 引入 TypeORM Migration（替代手动改 schema / `synchronize: true`）
- [ ] CI/CD pipeline 加入 migration 自动执行步骤
- [ ] 建立 rollback migration SOP
- [ ] Step 7 所需的具体 migration：新增 `is_ai_suggested` 字段 + `ai_suggestion_meta` JSON 字段到 `meal` 表

### TD1.3 Infrastructure as Code（IaC / Terraform）

优先级低于 AI 主线，但是简历上"会 IaC"是 SDE III 的重要加分项：

- [ ] Terraform 模块：VPC + Subnets + Security Groups
- [ ] Terraform 模块：RDS（Multi-AZ）
- [ ] Terraform 模块：ECS Cluster + Task Definitions + Service
- [ ] Terraform 模块：ALB + Target Groups
- [ ] Terraform 模块：S3 + CloudFront
- [ ] Terraform 模块：ElastiCache Redis
- [ ] Terraform 模块：AWS WAF WebACL（Rate-based Rules）
- [ ] 接入 CI/CD（`terraform plan` on PR，`terraform apply` on merge）

---

## TD2 — 工程质量（低优先级，别让它变成 never-done）

### 测试

- [ ] E2E 测试：Cypress 或 Playwright，覆盖核心用户路径（Phase 2 上线稳定后补）
- [ ] PR 质量门槛：GitHub Actions 加测试覆盖率检查
- [ ] AI 全 Repo 扫描：安全漏洞（OWASP Top 10）+ 性能热点

### 代码健康

- [ ] UI Hooks 提取重构
- [ ] Swagger API 文档（`@nestjs/swagger`）
- [ ] 代码整体 Refactor（不影响功能）
- [ ] ~~Smart Meal Replacement 算法升级~~ ← **已被 Phase 2 AI 取代，删除**

### 可靠性

- [ ] SLO 99.9%：RDS Multi-AZ + ECS 多实例 Health Check
- [ ] Read-heavy 一致性：评估 Read Replica + 缓存一致性策略

---

## TD3 — 功能与 UX（最低优先级，有空再动）

### Admin Dashboard

- [ ] Custom Meals sidebar 对 admin 隐藏
- [ ] All Meals 列表显示 `creator` 字段 + Filter（按 meal name、creator）
- [ ] All Plans 页引入 AI 辅助摘要

### Bug Fixes & UX

- [ ] Signup 流程体感优化（太像直接 signin）
- [ ] Week List Draft Preview banner 保持 sticky
- [ ] 平板 / 桌面 card ingredients 字体过大，缩小字号
- [ ] 首屏加载速度优化（bundle size 分析 + 懒加载）
- [ ] PWA 支持（Service Worker + manifest）
- [ ] 更新 README（架构图更新为 ECS/Fargate 版本）

### CI/CD 精进

- [ ] ECS 部署失败自动 Rollback
- [ ] Semantic Release（基于 Conventional Commits 自动版本 + Changelog）
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

↓ AI 主线 Step 4-6（AI Engineer 核心技能补齐）
  + Claude native tool_use（替换 JSON mode）
  + Chatbot with Memory（Redis session + DB long-term prefs）
  + Prompt Caching + Model Tier Routing + Cost Telemetry

↓ P0 防护层
  + AWS WAF Rate-based Rules（挂 ALB + CloudFront）
  + CloudWatch Metrics（DAU、P99、错误率）

↓ Phase 2 Step 7-8 + TD1.1
  + Redis Caching（业务数据 cache）
  + AI Observability + Guardrails（熔断 + Event Loop 监控）

↓ TD1.2 + TD1.3
  + TypeORM Migrations（告别 synchronize: true）
  + Terraform IaC（全量基础设施代码化，含 WAF 模块）

↓ TD2 测试 + TD2 可靠性
  生产级 AI 全栈项目：
  AI 集成 + 流式 UX + 对话记忆 + 缓存 + IaC + 测试覆盖 + 监控 + 安全防护
  → 简历可以清晰讲述每一个架构决策的 why
```

---

_Last updated: 2026-04-15_
