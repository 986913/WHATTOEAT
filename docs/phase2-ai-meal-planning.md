# Phase 2 — AI-Powered Meal Planning

> **Goal:** Add an AI-powered weekly meal plan generator that takes natural language input (preferences, dietary constraints, mood) and produces a personalized 7-day plan via streaming UI — all built on top of the existing shuffle infrastructure.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites & Learning Path](#prerequisites--learning-path)
3. [Implementation Roadmap](#implementation-roadmap)
4. [Technical Deep Dives](#technical-deep-dives)
5. [Cost & Performance Considerations](#cost--performance-considerations)
6. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

```
User Input (natural language)
        │
        ▼
┌─────────────────┐     SSE stream      ┌──────────────────────┐
│  React Frontend │◄────────────────────│  NestJS Backend       │
│  (streaming UI) │                      │                       │
└─────────────────┘                      │  POST /plans/ai-gen   │
                                         │       │               │
                                         │       ▼               │
                                         │  ┌─────────────┐     │
                                         │  │ AI Service   │     │
                                         │  │ (prompt +    │     │
                                         │  │  meal pool)  │     │
                                         │  └──────┬──────┘     │
                                         │         │             │
                                         │         ▼             │
                                         │  Claude / OpenAI API  │
                                         │  (streaming response) │
                                         └──────────────────────┘
```

**Core flow:**
1. User types preference in natural language (e.g., "这周想吃清淡的，周三朋友来做硬菜")
2. Backend fetches user's available meal pool (public + custom meals, from cache)
3. Backend constructs a prompt: system instructions + meal pool + user preference
4. Streams Claude API response back to frontend via SSE
5. Frontend renders meals progressively (day by day, typing effect)
6. User can tweak individual meals (existing shuffle) and save (existing commit)

**Key design decision — Hybrid approach:**
- AI picks from **existing meal pool** when possible (so meals have images, videos, ingredients)
- AI can **suggest new meals** not in the pool (rendered differently, no image/video, user can save to library)
- This gives the best of both worlds: rich existing data + creative AI suggestions

---

## Prerequisites & Learning Path

### 1. Claude API / Anthropic SDK (Priority: HIGH)

**What to learn:**
- Anthropic SDK for Node.js (`@anthropic-ai/sdk`)
- Streaming responses (`stream: true` / `client.messages.stream()`)
- Prompt engineering: system prompt, user prompt, structured output (JSON mode)
- Token counting & cost estimation

**Resources:**
- [Anthropic API docs](https://docs.anthropic.com/en/docs)
- [Anthropic SDK for TypeScript](https://github.com/anthropics/anthropic-sdk-typescript)
- [Streaming Messages](https://docs.anthropic.com/en/api/messages-streaming)
- [Prompt engineering guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)

**Hands-on exercise:**
```typescript
// Quick start — run this standalone to verify API access
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const stream = client.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Suggest 3 dinner ideas with ingredients' }],
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

### 2. Server-Sent Events (SSE) in NestJS (Priority: HIGH)

**What to learn:**
- NestJS `@Sse()` decorator — returns `Observable<MessageEvent>`
- RxJS basics: `Observable`, `Subject`, `map`, `finalize`
- How SSE differs from WebSocket (unidirectional, auto-reconnect, HTTP-based)

**Resources:**
- [NestJS SSE docs](https://docs.nestjs.com/techniques/server-sent-events)
- [RxJS Observable basics](https://rxjs.dev/guide/observable)

**Key NestJS pattern:**
```typescript
@Sse('ai-stream')
generateWithAI(@Query('taskId') taskId: string): Observable<MessageEvent> {
  // Return an Observable that emits MessageEvent objects
  // NestJS handles the SSE protocol (Content-Type, keep-alive, etc.)
}
```

### 3. Frontend Streaming Consumption (Priority: HIGH)

**What to learn:**
- `EventSource` API or `fetch` + `ReadableStream` for SSE
- Incremental React state updates (append, not replace)
- Typing/streaming UI animation patterns

**Key pattern:**
```typescript
// Using native EventSource
const eventSource = new EventSource('/api/v1/plans/ai-stream?taskId=xxx');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setPlans(prev => mergePlan(prev, data)); // incremental update
};
eventSource.onerror = () => eventSource.close();
```

### 4. ALB / Fargate Long Connection Handling (Priority: MEDIUM)

**What to learn:**
- ALB idle timeout (default 60s) — needs to be increased for SSE
- ECS Fargate keep-alive behavior
- How to send SSE heartbeat/ping to keep connection alive

**Key config:**
- ALB idle timeout: increase to **120–300 seconds** via AWS Console or CLI
- Backend: send periodic `:ping\n\n` comments in the SSE stream to prevent timeout
- Alternative: use a request-response pattern with polling (simpler but worse UX)

### 5. Prompt Engineering for Structured Output (Priority: MEDIUM)

**What to learn:**
- How to make LLMs return consistent JSON
- Few-shot examples in prompts
- Handling edge cases (AI ignoring instructions, malformed JSON)
- Token optimization (what to include/exclude from meal pool data)

**Key insight for this project:**
```
You only need to send meal names + IDs + types + ingredient names to the AI.
Do NOT send imageUrl/videoUrl — wastes tokens, AI doesn't need them.
The backend maps AI's chosen meal IDs back to full meal objects.
```

---

## Implementation Roadmap

### Step 1: Backend AI Service Foundation
**Estimated scope: ~2-3 files, 1 new module**

```
packages/backend/src/ai/
├── ai.module.ts            # Module registration
├── ai.service.ts           # Claude API client, prompt construction, streaming
└── ai.controller.ts        # SSE endpoint
```

**Tasks:**
- [ ] Install `@anthropic-ai/sdk`
- [ ] Create `AiModule` with `AiService`
- [ ] Add `ANTHROPIC_API_KEY` to environment config
- [ ] Implement `generateMealPlan(userId, preference)`:
  1. Fetch user's meal pool (reuse `getMealsByTypeForUser` from PlanService)
  2. Build prompt with meal pool + user preference
  3. Stream Claude response
  4. Parse streaming JSON into `DraftPlan[]` format
- [ ] Create SSE endpoint `GET /plans/ai-generate`

**Prompt structure:**
```
System: You are a meal planning assistant. Given a list of available meals
and user preferences, create a 7-day meal plan (breakfast, lunch, dinner).

AVAILABLE MEALS:
Breakfast: [Oatmeal (id:1), Eggs Benedict (id:5), ...]
Lunch: [Caesar Salad (id:12), Ramen (id:15), ...]
Dinner: [Grilled Salmon (id:20), Pasta Carbonara (id:23), ...]

RULES:
- Prefer meals from the available list (reference by ID)
- You may suggest NEW meals if nothing fits the preference
- For new meals, provide: name, type, ingredients[]
- Output format: JSON array, one object per day
- Avoid repeating the same meal within 3 days

USER PREFERENCE: {userInput}
```

**Output format (streamed as JSON chunks):**
```json
{
  "days": [
    {
      "date": "2025-03-26",
      "meals": [
        { "typeId": 1, "mealId": 5, "reason": "高蛋白早餐" },
        { "typeId": 2, "mealId": 15, "reason": "清淡午餐" },
        { "typeId": 3, "mealId": null, "suggestion": { "name": "清蒸鲈鱼", "ingredients": ["鲈鱼", "姜", "葱", "蒸鱼豉油"] }, "reason": "朋友来访的硬菜" }
      ]
    }
  ]
}
```

### Step 2: SSE Streaming Pipeline
**Estimated scope: controller + service method**

**Tasks:**
- [ ] Implement `@Sse()` endpoint that:
  1. Accepts a task ID (generated by a prior `POST` that kicks off generation)
  2. Returns `Observable<MessageEvent>` from an RxJS Subject
  3. Emits events: `{ type: 'day', data: {...} }` as each day is generated
  4. Emits `{ type: 'done' }` when complete
  5. Emits `{ type: 'error', data: {...} }` on failure
  6. Sends heartbeat every 15s to keep ALB connection alive
- [ ] Implement task management (in-memory Map or Redis) to track generation state
- [ ] Add timeout handling (kill generation if > 60s)
- [ ] Add rate limiting (max 1 concurrent generation per user)

**Flow:**
```
POST /plans/ai-generate  →  returns { taskId: "abc123" }
                               (kicks off async generation)

GET  /plans/ai-stream?taskId=abc123  →  SSE stream
     event: day
     data: { "date": "2025-03-26", "meals": [...] }

     event: day
     data: { "date": "2025-03-27", "meals": [...] }

     ...

     event: done
     data: { "totalDays": 7 }
```

### Step 3: Frontend Streaming UI
**Estimated scope: 1 new component + modifications to WeekPlans page**

**Tasks:**
- [ ] Add "AI Generate" button/tab alongside existing "Shuffle" on WeekPlans page
- [ ] Add text input for user preference (collapsible, optional)
- [ ] Implement SSE client hook `useAiMealPlan(taskId)`
- [ ] Progressive rendering: show each day's card as it streams in
  - Skeleton loading for days not yet received
  - Typing animation for the AI "reason" text
  - Smooth transition from skeleton → real card
- [ ] Handle AI-suggested new meals (no image/video):
  - Show a distinct "AI Suggestion" badge (different from "My Meal" badge)
  - "Save to My Meals" button to persist the suggestion
- [ ] Once all 7 days are streamed, enable existing Save/Shuffle per-meal controls
- [ ] Error handling: timeout, API failure, network disconnect

**UI mockup:**
```
┌──────────────────────────────────────────────┐
│  Weekly Meal Plan                             │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ 🤖 What are you in the mood for?        │ │
│  │ ┌─────────────────────────────────────┐ │ │
│  │ │ 这周想吃清淡的，周三朋友来做硬菜    │ │ │
│  │ └─────────────────────────────────────┘ │ │
│  │           [✨ AI Generate]  [🎲 Shuffle] │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ── Wednesday, Mar 26 ──────────────────────  │
│  🍳 Oatmeal       🥗 Caesar Salad   🍝 ░░░░ │
│  (from library)   (from library)   streaming..│
│                                               │
│  ── Thursday, Mar 27 ──────────────────────── │
│  ░░░░░░░░░░░░  (waiting for AI...)            │
└──────────────────────────────────────────────┘
```

### Step 4: Smart Caching & Cost Optimization
**Estimated scope: enhancements to AI service**

**Tasks:**
- [ ] **Prompt caching**: Cache the meal pool portion of the prompt in Redis
  - Meal pool changes infrequently, no need to re-fetch every request
  - Only the user preference changes per request
- [ ] **Response caching**: Cache AI responses by (userId + normalized preference hash)
  - Short TTL (10-30 min) — same mood in same session gets cached result
  - Saves tokens on "regenerate" clicks
- [ ] **Token budget management**:
  - Track daily/monthly token usage per user in Redis
  - Set limits (e.g., 10 AI generations per day per user)
  - Return 429 when limit exceeded
- [ ] **Model tier strategy**:
  - Use `claude-haiku-4-5-20251001` for simple preferences (fast, cheap)
  - Use `claude-sonnet-4-20250514` for complex multi-constraint requests
  - Let the backend decide based on input complexity (word count, constraint count)
- [ ] **Meal pool optimization**:
  - Only send meal name + ID + ingredient names to AI (skip URLs)
  - If pool > 100 meals, pre-filter by type before building prompt
  - Estimated prompt size: ~50 meals = ~2K tokens input

### Step 5: Save AI Suggestions to Library
**Estimated scope: enhancements to meal service + frontend**

**Tasks:**
- [ ] When AI suggests a new meal not in the pool:
  - Frontend shows "Save to My Meals" button
  - `POST /meals/my` with AI-generated name + ingredients
  - Auto-create missing ingredients (existing logic handles this)
  - After save, the suggestion card upgrades to a full meal card (with edit capability)
- [ ] Track AI-originated meals with a flag or tag for analytics

### Step 6: Observability & Guardrails
**Estimated scope: middleware + logging**

**Tasks:**
- [ ] Log AI requests: userId, preference text, model used, token count, latency
- [ ] Slack notification for AI usage anomalies (high cost, errors)
- [ ] Input sanitization: strip PII, limit input length (500 chars)
- [ ] Output validation: verify AI response matches expected JSON schema before sending to frontend
- [ ] Fallback: if AI fails, offer "Fall back to random shuffle?"

---

## Technical Deep Dives

### SSE + ALB + Fargate Configuration

```
Browser  ──SSE──▶  ALB (idle timeout: 300s)  ──▶  Fargate (NestJS @Sse)
                   ▲                                      │
                   │              heartbeat every 15s      │
                   └──────────────────────────────────────┘
```

**ALB idle timeout adjustment:**
```bash
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <your-alb-arn> \
  --attributes Key=idle_timeout.timeout_seconds,Value=300
```

**NestJS heartbeat in SSE stream:**
```typescript
// In your Observable, merge a heartbeat interval
const heartbeat$ = interval(15000).pipe(
  map(() => ({ type: 'ping', data: '' } as MessageEvent)),
);
const generation$ = this.aiService.streamMealPlan(taskId);
return merge(generation$, heartbeat$).pipe(
  finalize(() => this.cleanup(taskId)),
);
```

### Request-Response vs SSE Decision

| Approach | Pros | Cons |
|----------|------|------|
| **SSE (recommended)** | Real-time UX, progressive rendering, feels fast | ALB timeout config, more frontend complexity |
| **POST + Poll** | Simple, no long connection issues | Laggy UX, extra requests, need task queue |
| **WebSocket** | Bidirectional (overkill here) | More infra complexity, not needed |

**Recommendation:** SSE. It's the natural fit — unidirectional server→client stream, built-in browser reconnect, NestJS has first-class support.

### Prompt Design Strategy

**Two-phase approach:**
1. **Selection phase**: AI picks from existing meals (returns IDs)
2. **Creation phase**: For slots where no existing meal fits, AI creates new suggestions

This is better than one giant prompt because:
- Smaller output = faster streaming
- Existing meals already have all metadata (images, videos, ingredients)
- Backend just needs to hydrate meal IDs into full `DraftPlan` objects

---

## Cost & Performance Considerations

### Token Cost Estimation

| Component | Tokens | Per Request |
|-----------|--------|-------------|
| System prompt | ~300 | Fixed |
| Meal pool (50 meals) | ~2,000 | Cached between requests |
| User preference | ~100 | Variable |
| AI output (7 days) | ~1,500 | Variable |
| **Total** | **~3,900** | |

**Cost per request (Claude Haiku):** ~$0.003
**Cost per request (Claude Sonnet):** ~$0.02

At 100 users making 3 requests/day = ~$1-6/day depending on model mix.

### Latency Budget

| Step | Target |
|------|--------|
| Fetch meal pool (cache hit) | < 10ms |
| Build prompt | < 5ms |
| AI first token (TTFT) | 500ms - 1.5s |
| AI full response | 3-8s |
| **Total (first day appears)** | **~1-2s** |
| **Total (all 7 days)** | **~4-9s** |

### Rate Limiting

| Tier | Limit | Rationale |
|------|-------|-----------|
| Free user | 5 AI generations / day | Cost control |
| Authenticated user | 15 AI generations / day | Reasonable usage |
| Cooldown | 30s between requests | Prevent spam |

---

## Testing Strategy

### Unit Tests (AI Service)
- Prompt construction with various meal pool sizes
- JSON parsing of streaming chunks (including malformed input)
- Fallback behavior when API fails
- Rate limit enforcement
- Token counting accuracy

### Integration Tests
- `POST /plans/ai-generate` → returns taskId
- `GET /plans/ai-stream` → receives valid SSE events
- Auth guard: unauthenticated users get 401
- Rate limit: 429 after exceeding limit

### Mock Strategy for CI
- Mock the Anthropic SDK client in tests (don't hit real API in CI)
- Use fixture responses that match real Claude output format
- Test the full pipeline: prompt build → mock stream → parse → DraftPlan output

### Manual Testing Checklist
- [ ] AI generation with simple preference
- [ ] AI generation with complex multi-constraint preference
- [ ] Network disconnect mid-stream → graceful recovery
- [ ] ALB timeout handling → heartbeat keeps connection alive
- [ ] Save AI-suggested meal to library
- [ ] Shuffle an AI-generated meal → works with existing shuffle logic
- [ ] Rate limit exceeded → user sees friendly message
- [ ] AI returns malformed JSON → fallback to shuffle

---

## Migration Checklist (Before Going Live)

- [ ] `ANTHROPIC_API_KEY` added to ECS task definition env vars (via Secrets Manager)
- [ ] ALB idle timeout increased to 300s
- [ ] Rate limiting configured in Redis
- [ ] Slack alerts for AI cost anomalies
- [ ] Frontend feature flag to gradually roll out
- [ ] Monitoring dashboard for AI latency + token usage
- [ ] Fallback to shuffle if AI service is down
