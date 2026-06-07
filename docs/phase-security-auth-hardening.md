# Security — Auth Hardening: Access + Refresh Token

> **Status: 📐 Designed — pending implementation**
> Sits between Phase 3 (IaC) and Phase 4 (Microservices). Must ship before microservices work begins — auth-service extraction in Phase 4 will reuse this code directly.

---

## Why We're Doing This

MealDice currently uses a single JWT `access_token` with a 3-day expiry, stored in `localStorage`:

| Problem | Impact |
|---|---|
| `localStorage` readable by JS | Any XSS vulnerability exposes the token immediately |
| 3-day expiry | Stolen token gives attacker 3-day window |
| No server-side record | Cannot revoke a token — logout is purely client-side |
| No reuse detection | No way to know if a token has been stolen and replayed |

**Goal:** Replace with a short-lived Access Token (memory) + long-lived Refresh Token (HttpOnly cookie) backed by Redis, with rotation and reuse detection.

**Design spec:** [docs/superpowers/specs/2026-06-07-auth-access-refresh-token-design.md](superpowers/specs/2026-06-07-auth-access-refresh-token-design.md)

---

## Token Specification

```
Access Token
  Type:    JWT (15 min)
  Storage: React Context / JS memory — never persisted
  Use:     Authorization: Bearer <token> header on every API request

Refresh Token
  Type:    crypto.randomBytes(32).hex() — not JWT
  Expiry:  30 days
  Storage: Redis Hash  key=refresh_tokens:{userId}
                       field=SHA-256(token)  value={ deviceId, issuedAt, expiresAt }
  Cookie:  HttpOnly + Secure + SameSite=Lax
           Domain=.mealdice.com  Path=/api/v1/auth
```

**Why SHA-256 in Redis:** Raw token never stored server-side. If Redis is compromised, attacker gets hashes — not usable tokens.

**Why SameSite=Lax (not Strict):** Google OAuth callback is a cross-site GET redirect from Google. `Strict` drops the cookie on that redirect. `Lax` blocks cross-site POST/PUT/DELETE but allows top-level GET navigations.

---

## Architecture

### Token Flow

```
Client                        Server (NestJS)               Redis (ElastiCache)
  │
  │── POST /auth/signin ──────►│ 1. Verify password (argon2)
  │                            │ 2. Sign JWT (15min)
  │                            │ 3. Generate refresh_token
  │                            │ 4. SHA-256 → ──────────────► HSET refresh_tokens:{userId}
  │◄── { access_token } ───────│
  │    Set-Cookie: refresh_token (HttpOnly, 30d)
  │
  │  [15 min later — access token expires]
  │
  │── POST /auth/refresh ───────►│ 1. Read cookie
  │   (cookie auto-sent)        │ 2. SHA-256 → HGET ─────────► Redis lookup
  │                             │ 3. Rotation:
  │                             │    - Mark old hash status=used (60s TTL)
  │                             │    - Issue new refresh_token ─► HSET new_hash
  │                             │    - Sign new JWT (15min)
  │◄── { access_token } ────────│
  │    Set-Cookie: new refresh_token
```

### Reuse Detection (Token Theft)

```
Normal:   Client uses Token A → Token A deleted, Token B created
Attack:   Attacker tries old Token A → Redis finds status=used → Reuse Attack
          → DEL refresh_tokens:{userId}  (revoke ALL devices)
          → Slack security alert
          → 401 — full re-login required

Random fake token → not in Redis at all → plain 401, no alarm
```

### Page Refresh (Restoring State)

```
App.tsx mounts → POST /auth/refresh (cookie auto-sent)
  Success → store new access_token in AuthContext → app renders normally
  401     → cookie absent/expired → redirect to /signin
```

### Load Balancer Compatibility

Refresh token validation queries Redis (ElastiCache), not ECS process memory. Any ECS node can handle any request — **no sticky sessions required**. ALB round-robin works unchanged.

---

## What Changes

### Backend

| File | Change |
|---|---|
| `auth.service.ts` | Add `issueTokens()`, `refresh()`, `logout()`; update `signin()` and `googleLogin()` to call `issueTokens()` |
| `auth.controller.ts` | Add `POST /auth/refresh`, `DELETE /auth/logout`; set cookies on signin/googleLogin responses |
| `auth.module.ts` | Inject Redis CacheModule |
| `main.ts` | Add `cookie-parser` middleware |
| `app.module.ts` | CORS: `credentials: true`, `origin: 'https://mealdice.com'` |

**Unchanged:** `JwtStrategy`, `JwtAuthenticationGuard`, `forgotPassword`, `resetPassword`, Google OAuth strategy, RBAC guards — all untouched.

### Frontend

| File | Change |
|---|---|
| `src/context/AuthContext.tsx` | **New** — holds `accessToken` in memory, exposes `setAccessToken`, `logout` |
| `src/utils/axios.ts` | Read token from AuthContext (not localStorage); add 401 → silent refresh → retry |
| `src/App.tsx` | On mount: call `POST /auth/refresh` to restore auth state after page refresh |
| `src/pages/Signin.tsx` | Store token in AuthContext, not localStorage |
| `src/pages/GoogleCallback.tsx` | Store token in AuthContext, not localStorage |

---

## Implementation Tasks

- [ ] **Task 1 — Backend:** `issueTokens()` + `refresh()` + `logout()` + new endpoints + cookie-parser + CORS
- [ ] **Task 2 — Frontend:** `AuthContext` + axios interceptor + `App.tsx` silent restore + Signin/GoogleCallback updates
- [ ] **Task 3 — Verify:** Login sets cookie; silent refresh rotates token; reuse detection clears all sessions; single + all-device logout

---

## Security Analysis

| Threat | Before | After |
|---|---|---|
| XSS token theft | localStorage readable by any JS | access token in memory; refresh token in HttpOnly cookie — JS cannot read either |
| CSRF | N/A (Bearer header, not cookie) | SameSite=Lax blocks cross-site POST; attacker can't read response body to extract new access token |
| Stolen token window | 3 days, unrevocable | 15 min access token; refresh rotation triggers reuse detection → immediate full revocation |
| Multi-device logout | Not supported | `DELETE /auth/logout?all=true` → `DEL refresh_tokens:{userId}` |

---

## What Comes After

Once auth hardening ships, Phase 4 Microservices can begin. The `auth-service` extraction (Phase A Task 4-5) picks up this upgraded code directly — no redesign needed inside the microservice.

---

_Last updated: 2026-06-07_
