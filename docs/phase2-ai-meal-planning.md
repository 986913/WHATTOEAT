# Phase 2 — AI-Powered Meal Planning

> **Goal:** Add an AI-powered weekly meal plan generator that takes natural language input (preferences, dietary constraints, mood) and produces a personalized 7-day plan via streaming UI — all built on top of the existing shuffle infrastructure.

---

## Status

| Step | Description | Status |
|------|-------------|--------|
| Step 0 | Redis infrastructure (ElastiCache + ioredis Pub/Sub) | ✅ Done |
| Step 1 | Backend AI Service (AiModule + Claude streaming + SSE endpoint) | ✅ Done |
| Step 2 | SSE Streaming Pipeline (taskId pattern + heartbeat + buffer replay) | ✅ Done |
| Step 3 | Frontend Streaming UI (progressive day rendering + AI suggestion badge) | ✅ Done |
| Step 4 | Native Tool Use refactor (replace JSON mode + bracket-depth parsing) | ⬜ Not started |
| Step 5 | Meal Planning Chatbot with Memory | ⬜ Not started |
| Step 6 | Prompt Caching + Model Tier Routing + CloudWatch cost telemetry | ⬜ Not started |
| Step 7 | Save AI Suggestions to Library (needs TD1.2 DB migrations first) | ⬜ Blocked |
| Step 8 | Observability & Guardrails (熔断 + Event Loop 监控) | ⬜ Not started |

**Implementation plans for Steps 4–6:** See [docs/superpowers/plans/](superpowers/plans/)

---

## Architecture Overview

```
User Input (natural language)
        │
        ▼
┌─────────────────┐     SSE stream      ┌──────────────────────────────────┐
│  React Frontend │◄────────────────────│  NestJS Backend                   │
│  (streaming UI) │                      │                                   │
└─────────────────┘                      │  POST /ai/generate → {taskId}    │
                                         │  GET  /ai/stream?taskId=xxx       │
                                         │       │                           │
                                         │       ▼                           │
                                         │  AiService                        │
                                         │  ├── buildMealPool (DB)           │
                                         │  ├── runGeneration (Claude API)   │
                                         │  └── enrichDay (Unsplash)        │
                                         │       │                           │
                                         │       ▼                           │
                                         │  Redis Pub/Sub                    │
                                         │  (taskId channel)                 │
                                         └──────────────────────────────────┘
                                                  │
                                                  ▼
                                         Claude Haiku / Sonnet API
                                         (tool_use streaming — Step 4)
```

**Current flow (Steps 0–3 complete):**
1. User types preference → `POST /ai/generate` returns `taskId`
2. Backend fetches meal pool (DB), streams Claude via `messages.stream()`
3. Bracket-depth parser extracts each day JSON → enriches with Unsplash images → publishes to Redis channel
4. Frontend SSE client (`useAiMealPlan`) receives `day` events and renders progressively
5. `regenerateMeal` handles individual meal refresh

**After Step 4:** Bracket-depth parsing replaced by native `tool_use` blocks. Cleaner, typed, no string hacking.

---

## What's Built (Steps 0–3)

### Backend (`packages/backend/src/ai/`)

| File | Responsibility |
|------|---------------|
| `ai.module.ts` | Module wiring: AiService, AiController, RedisPubSubService |
| `ai.service.ts` | Claude API client, meal pool building, streaming, enrichment |
| `ai.controller.ts` | `POST /ai/generate`, `GET /ai/stream` SSE, `POST /ai/regenerate-meal` |
| `ai.prompts.ts` | `buildSystemPrompt`, `buildUserPrompt` (→ tool schemas in Step 4) |
| `redis-pubsub.service.ts` | Publish/subscribe, buffer replay, user lock, task status |

### Frontend (`packages/frontend/src/`)

| File | Responsibility |
|------|---------------|
| `hooks/useAiMealPlan.ts` | SSE client: POST generate → GET stream, handles `chunk/day/done/error` events |
| `components/AiGenerateModal.tsx` | Preference input modal |
| `pages/weekplans/index.tsx` | Progressive render, skeleton states, AI badge, regenerate per meal |

### Key Design Decisions

**Why Redis Pub/Sub (not in-memory)?**
ECS can run multiple Fargate instances. If the `POST /ai/generate` hits instance A and `GET /ai/stream` hits instance B, in-memory state doesn't work. Redis channels are shared across instances.

**Why buffer replay?**
`LRANGE` on the channel buffer handles the race condition where Claude starts publishing before the SSE client connects. Late subscribers replay all buffered events.

**Why bracket-depth parsing (→ replaced in Step 4)?**
Claude was asked for JSONL output. We accumulated characters and emitted a complete JSON object whenever depth hit 0. This works but is fragile — `tool_use` blocks are cleaner.

---

## What's Next (Steps 4–6)

### Step 4: Native Tool Use
**Plan:** [2026-04-15-step4-native-tool-use.md](superpowers/plans/2026-04-15-step4-native-tool-use.md)

Define `record_day_plan` and `suggest_meal` tool schemas. Switch from bracket-depth parsing to accumulating `input_json_delta` events per block index. No frontend changes needed — the `day` events emitted by the backend stay identical.

**Why this matters for interviews:** Tool use is the single most-asked Claude API question. "How does it differ from JSON mode?" — tool_use has a typed schema, Claude is forced to conform, you get structured input not a raw string.

### Step 5: Chatbot with Memory
**Plan:** [2026-04-15-step5-chatbot-with-memory.md](superpowers/plans/2026-04-15-step5-chatbot-with-memory.md)

New `ChatModule` with two memory layers:
- **Session memory:** Redis List `chat:session:{userId}` — last 20 messages, TTL 24h. Sent as context window on each turn.
- **Long-term memory:** `ProfileEntity.dietaryPreferences` (text column). Extracted from each conversation turn via a fast Haiku call, merged into the user's profile.

**Why two memory types?** Session memory is fast but ephemeral. Long-term memory persists across sessions and primes the system prompt ("known about this user: prefers low-carb, dislikes fish"). This is the standard pattern used in production AI assistants.

### Step 6: Prompt Caching + Model Routing + Cost Telemetry
**Plan:** [2026-04-15-step6-prompt-caching-routing.md](superpowers/plans/2026-04-15-step6-prompt-caching-routing.md)

Three changes to `AiService`:
1. **Prompt caching:** System prompt (meal pool) marked with `cache_control: {type: "ephemeral"}`. Cache hit = 90% discount on those input tokens. TTL = 5 minutes.
2. **Model routing:** `selectModel(preference)` returns Haiku for short/simple preferences, Sonnet for long/multi-constraint ones. Based on word count and dietary keyword matching.
3. **CloudWatch telemetry:** After each call, `PutMetricData` to `MealDice/AI` namespace with `InputTokens`, `CacheReadTokens`, `OutputTokens`, `EstimatedCostUSD`. Alarm triggers at $10/day.

**Execution order:** Step 4 → Step 6 (both touch `ai.service.ts`; caching builds on the refactored streaming code).

---

## Technical Reference

### SSE + ALB + Fargate Configuration

```
Browser ──SSE──▶ ALB (idle timeout: 300s) ──▶ Fargate (NestJS @Sse)
                  ▲                                    │
                  │         heartbeat every 15s        │
                  └────────────────────────────────────┘
```

ALB idle timeout must be increased to 300s (default 60s will kill long generations):
```bash
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <your-alb-arn> \
  --attributes Key=idle_timeout.timeout_seconds,Value=300
```

NestJS heartbeat pattern (already implemented in `ai.controller.ts`):
```typescript
const heartbeat$ = interval(15000).pipe(
  takeUntil(done$),
  map(() => ({ data: JSON.stringify({ type: 'heartbeat' }) })),
);
```

### Token Cost Estimation (at current scale)

| Component | Tokens | Note |
|-----------|--------|------|
| System prompt + meal pool | ~2,300 | Cached after first call in a session |
| User preference | ~50–150 | Variable |
| Claude output (7 days) | ~1,500 | Variable |
| **Total (cache miss)** | **~4,000** | |
| **Total (cache hit)** | **~1,700** | Meal pool tokens cost 10% |

**Cost per generation:**
- Haiku, cache miss: ~$0.003
- Haiku, cache hit: ~$0.001
- Sonnet, cache miss: ~$0.022

At 100 users × 3 generations/day = ~$0.30–6.60/day depending on model mix and cache hit rate.

### Rate Limiting (existing P0 backlog item)

AWS WAF Rate-based Rules on ALB + CloudFront handle abuse prevention. The AI endpoint is particularly important to protect since each request hits the Anthropic API (billable).

---

_Last updated: 2026-04-15_
