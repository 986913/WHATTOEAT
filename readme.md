# MealDice — What Should We Cook Today?

> **Note:** This project is actively working on eliminating single points of failure — migrating to ECS Fargate, adding ALB load balancing, separating Redis to ElastiCache, enabling RDS Multi-AZ, and moving frontend to S3 + CloudFront. The live site may experience occasional downtime during this transition. Thanks for your patience!

**Live:** [https://mealdice.com](https://mealdice.com)

### Description

A full-stack meal planning application that eliminates the daily "what should I eat?" dilemma. Roll the dice, get personalized meals, and plan your week — all in one tap.

---

## Features

- **Today View** — See today's breakfast, lunch, and dinner at a glance with large food imagery
- **Meal Dice (Shuffle)** — Randomize individual meals or your entire day with a single tap
- **Weekly Meal Plans** — Auto-generate a full 7-day meal plan, adjust any meal, and save
- **Smart Meal Replacement** — Swap out any meal while respecting your type preferences (breakfast/lunch/dinner)
- **Custom Meals** — Create and manage your own private meals that appear alongside public ones
- **Saved Plans History** — Browse your saved meal history with pagination, date range filters, and meal name search
- **Google OAuth + Email Auth** — Sign in with Google or create an account with email; supports password reset via email
- **Role-Based Access** — Admin panel for managing meals, ingredients, users, and roles
- **Feedback** — In-app feedback section for users to share suggestions
- **Cooking Videos** — Click any meal to watch its cooking tutorial
- **Responsive Design** — Works on desktop and mobile

---

#### Architecture

```mermaid
flowchart TB
    %% --- 🎨 核心主题与样式定义 (ClassDefs) ---
    classDef default fill:#f8f9fa,stroke:#ced4da,stroke-width:1px,color:#212529;
    classDef clientLayer fill:#e7f5ff,stroke:#339af0,stroke-width:2px,color:#0b7285,rx:8px,ry:8px;
    classDef edgeLayer fill:#fff4e6,stroke:#ff922b,stroke-width:2px,color:#d9480f,rx:8px,ry:8px;
    classDef appFrontend fill:#ebfbee,stroke:#51cf66,stroke-width:2px,color:#2b8a3e,rx:8px,ry:8px;
    classDef appBackend fill:#f3f0ff,stroke:#845ef7,stroke-width:2px,color:#5c148c,rx:8px,ry:8px;
    classDef cacheLayer fill:#ffe3e3,stroke:#ff8787,stroke-width:2px,color:#c92a2a,rx:8px,ry:8px;
    classDef dbLayer fill:#e3fafc,stroke:#3bc9db,stroke-width:2px,color:#0b7285;
    classDef externalLayer fill:#f1f3f5,stroke:#868e96,stroke-width:2px,color:#343a40,rx:8px,ry:8px;

    %% --- 🔳 容器外框虚线优化 ---
    style Client fill:none,stroke:#339af0,stroke-width:2px,stroke-dasharray: 5 5,rx:10
    style Edge fill:none,stroke:#ff922b,stroke-width:2px,stroke-dasharray: 5 5,rx:10
    style App fill:none,stroke:#845ef7,stroke-width:2px,stroke-dasharray: 5 5,rx:10
    style FE fill:none,stroke:#51cf66,stroke-width:1px,rx:8
    style BE fill:none,stroke:#845ef7,stroke-width:1px,rx:8
    style Cache fill:none,stroke:#ff8787,stroke-width:2px,stroke-dasharray: 5 5,rx:10
    style Data fill:none,stroke:#3bc9db,stroke-width:2px,stroke-dasharray: 5 5,rx:10
    style External fill:none,stroke:#868e96,stroke-width:2px,stroke-dasharray: 5 5,rx:10

    %% ========== CLIENT ==========
    subgraph Client ["📱 Client Layer"]
        Browser(["Browser / Mobile / Pad"]):::clientLayer
    end

    %% ========== EDGE ==========
    subgraph Edge ["⚡ Edge Layer"]
        DNS{{"Route53 (mealdice.com)"}}:::edgeLayer
        Nginx["Nginx (TLS + Reverse Proxy)"]:::edgeLayer
    end

    %% ========== APPLICATION ==========
    subgraph App ["⚙️ Application Layer (EC2 - Docker)"]
        subgraph FE ["Frontend"]
            React("React 19 SPA"):::appFrontend
        end

        subgraph BE ["Backend"]
            NestJS("NestJS API :3001"):::appBackend
            Auth(["JWT + Google OAuth"]):::appBackend
        end
    end

    %% ========== CACHE ==========
    subgraph Cache ["🚀 Cache Layer"]
        Redis[("Redis")]:::cacheLayer
    end

    %% ========== DATA ==========
    subgraph Data ["💾 Data Layer"]
        MySQL[("AWS RDS MySQL 8.0")]:::dbLayer
    end

    %% ========== EXTERNAL ==========
    subgraph External ["🔗 External Services"]
        Slack[["Slack Webhook"]]:::externalLayer
    end

    %% ========== FLOW (保持原有逻辑) ==========

    %% 主干流量（加粗线）
    Browser == "HTTPS Request" ==> DNS
    DNS --> Nginx

    %% 静态资源与API分流（区分线型）
    Nginx -. "Serve Static" .-> React
    Nginx == "/api/v1" ==> NestJS

    %% 内部服务调用
    NestJS -. "Auth" .-> Auth

    %% 垂直数据链路
    NestJS == "Cache" ==> Redis
    Redis -. "Cache Miss" .-> MySQL

    %% 外部异步调用
    NestJS -. "Async Notification" .-> Slack

```

> **Note:** This is not the final architecture. Currently migrating to ECS Fargate with ALB, ElastiCache, RDS Multi-AZ, and S3 + CloudFront to eliminate the single point of failure. IaC (Terraform/CDK) will follow once the target architecture is validated.

---

## Data Model

```mermaid
erDiagram
    users ||--o| profiles : "has one"
    users }o--o{ roles : "many-to-many"
    users ||--o{ plans : "has many"
    users ||--o{ logs : "has many"
    users ||--o{ meals : "creates (custom)"
    meals ||--o{ plans : "used in"
    meals }o--o{ types : "many-to-many"
    meals }o--o{ ingredients : "many-to-many"
    types ||--o{ plans : "categorizes"

    users {
        int id PK
        string username
        string password
        string googleId
        string email
    }

    profiles {
        int id PK
        string gender
        string photo
        string address
    }

    roles {
        int id PK
        string name
    }

    plans {
        int id PK
        date date
        int userId FK
        int mealId FK
        int typeId FK
    }

    meals {
        int id PK
        string name
        string videoUrl
        string imageUrl
        int creator_id FK "nullable (null = public meal)"
    }

    types {
        int id PK
        string name
    }

    ingredients {
        int id PK
        string name
    }

    logs {
        int id PK
        int userId FK
    }
```

> Constraint: `UNIQUE(user_id, date, type_id)` — one meal per user per slot per day.

---

## Tech Stack

### Frontend

| Technology                        | Purpose                             |
| --------------------------------- | ----------------------------------- |
| **React 19**                      | UI framework                        |
| **TypeScript**                    | Type safety                         |
| **React Router 7**                | Client-side routing                 |
| **Zustand**                       | Lightweight state management        |
| **Bootstrap 5 + React-Bootstrap** | UI components                       |
| **Axios**                         | HTTP client                         |
| **Nginx**                         | Static file serving & reverse proxy |

### Backend

| Technology           | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| **NestJS 11**        | Server framework (Node.js)                        |
| **TypeScript 5**     | Type safety                                       |
| **TypeORM**          | Database ORM                                      |
| **MySQL 8.0**        | Relational database                               |
| **Redis 7**          | Query cache (cache-aside pattern with TTL jitter) |
| **Passport.js**      | Authentication (JWT + Google OAuth)               |
| **Argon2**           | Password hashing                                  |
| **Nodemailer**       | Email service (password reset)                    |
| **Winston**          | Structured logging                                |
| **Slack Webhook**    | Real-time notifications (Incoming Webhook)        |
| **class-validator**  | DTO validation                                    |
| **Jest + Supertest** | Unit & integration testing                        |

### DevOps & Infrastructure

| Technology                  | Purpose                         |
| --------------------------- | ------------------------------- |
| **Docker & Docker Compose** | Containerization                |
| **AWS EC2**                 | Application hosting             |
| **AWS RDS**                 | Managed MySQL database          |
| **Nginx**                   | Reverse proxy + SSL termination |
| **Let's Encrypt**           | Free SSL/TLS certificates       |
| **GitHub Actions**          | CI/CD pipeline                  |
| **Semantic Release**        | Automated versioning & releases |
| **Commitlint + Husky**      | Conventional commit enforcement |

---

## CI/CD Pipeline

```mermaid
flowchart LR
    %% --- 🎨 自定义样式与色彩 (完美保留你的主题色并增加质感) ---
    classDef trigger fill:#FF6B35,stroke:#c4491a,stroke-width:2px,color:#fff,rx:20px,ry:20px;
    classDef test fill:#6f42c1,stroke:#4c2889,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef release fill:#238636,stroke:#175c22,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef decision fill:#fff3cd,stroke:#ffe69c,stroke-width:2px,color:#664d03;
    classDef deploy fill:#f8f9fa,stroke:#adb5bd,stroke-width:2px,color:#343a40,rx:8px,ry:8px;
    classDef docker fill:#2496ED,stroke:#1668a8,stroke-width:2px,color:#fff,rx:6px,ry:6px;
    classDef skip fill:#f8f9fa,stroke:#ced4da,stroke-width:2px,color:#adb5bd,stroke-dasharray: 5 5,rx:20px,ry:20px;

    %% --- 🔳 阶段分组虚线边框 ---
    style CIPhase fill:none,stroke:#6f42c1,stroke-width:2px,stroke-dasharray: 5 5,rx:10
    style ReleasePhase fill:none,stroke:#238636,stroke-width:2px,stroke-dasharray: 5 5,rx:10
    style CDPhase fill:none,stroke:#2496ED,stroke-width:2px,stroke-dasharray: 5 5,rx:10

    %% ========== 触发点 ==========
    A(["🚀 Push to main"]):::trigger

    %% ========== CI 阶段 ==========
    subgraph CIPhase ["🧪 Continuous Integration (CI)"]
        direction LR
        T["Test Job"]:::test
        T1["Unit Tests (77)"]:::test
        T2["Integration Tests (22)"]:::test
    end

    %% ========== Release 阶段 ==========
    subgraph ReleasePhase ["📦 Release Management"]
        direction LR
        B["Semantic Release"]:::release
        C{"New release?"}:::decision
        D["Create GitHub Release"]:::release
        F(["Skip"]):::skip
    end

    %% ========== CD 阶段 ==========
    subgraph CDPhase ["🚢 Deployment (CD)"]
        direction LR
        E["Deploy Job"]:::deploy
        E1["SSH into EC2"]:::deploy
        E2["rsync codebase"]:::deploy
        E3["Inject .env secrets"]:::deploy
        E4["🐳 docker compose up -d --build"]:::docker
    end

    %% ========== 链路逻辑 (严格保持原有逻辑) ==========

    %% 主链路使用加粗箭头 (==>) 突出 Happy Path
    A ==> T
    T --> T1
    T --> T2

    %% 测试汇聚到发布
    T1 & T2 ==> B

    B -- "Analyze commits" --> C

    %% 判断分支
    C == "Yes" ==> D
    C -. "No" .-> F

    %% 部署链路
    D ==> E
    E ==> E1
    E1 --> E2
    E2 --> E3
    E3 ==> E4
```

Versioning follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` → minor version bump
- `fix:` → patch version bump
- `feat!:` / `BREAKING CHANGE` → major version bump

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Auth (`/auth`)

| Method | Endpoint                | Auth   | Description                                  |
| ------ | ----------------------- | ------ | -------------------------------------------- |
| `POST` | `/auth/signup`          | Public | Register new user (with email)               |
| `POST` | `/auth/signin`          | Public | Login (returns JWT token)                    |
| `GET`  | `/auth/me`              | JWT    | Get current authenticated user               |
| `POST` | `/auth/forgot-password` | Public | Request password reset email                 |
| `POST` | `/auth/reset-password`  | Public | Reset password with token                    |
| `GET`  | `/auth/google`          | Public | Initiate Google OAuth flow                   |
| `GET`  | `/auth/google/callback` | Public | Google OAuth callback (redirects with token) |

### Users (`/users`)

| Method   | Endpoint             | Auth              | Description                                           |
| -------- | -------------------- | ----------------- | ----------------------------------------------------- |
| `GET`    | `/users`             | JWT               | List all users (filterable by username, role, gender) |
| `POST`   | `/users`             | JWT               | Create a new user                                     |
| `GET`    | `/users/:id`         | JWT               | Get user by ID                                        |
| `PUT`    | `/users/:id`         | JWT + Owner/Admin | Update user (non-admins cannot modify roles)          |
| `DELETE` | `/users/:id`         | JWT + Admin       | Delete user                                           |
| `GET`    | `/users/profile`     | JWT               | Get user profile by query`?id=`                       |
| `GET`    | `/users/logs`        | JWT               | Get user activity logs by query`?id=`                 |
| `GET`    | `/users/logsByGroup` | JWT               | Get user logs grouped by result`?id=`                 |

### Meals (`/meals`)

| Method   | Endpoint         | Auth  | Description                                                |
| -------- | ---------------- | ----- | ---------------------------------------------------------- |
| `GET`    | `/meals`         | Admin | List meals (paginated, filterable by`?page=&limit=&type=`) |
| `GET`    | `/meals/options` | Admin | Get meals by type`?typeId=`                                |
| `POST`   | `/meals`         | Admin | Create a new meal                                          |
| `GET`    | `/meals/:id`     | Admin | Get meal by ID                                             |
| `PUT`    | `/meals/:id`     | Admin | Update meal                                                |
| `DELETE` | `/meals/:id`     | Admin | Delete meal                                                |
| `GET`    | `/meals/my`      | JWT   | List current user's custom meals (paginated)               |
| `POST`   | `/meals/my`      | JWT   | Create a custom meal                                       |
| `PUT`    | `/meals/my/:id`  | JWT   | Update own custom meal                                     |
| `DELETE` | `/meals/my/:id`  | JWT   | Delete own custom meal                                     |

### Plans (`/plans`)

| Method   | Endpoint                | Auth  | Description                                                                |
| -------- | ----------------------- | ----- | -------------------------------------------------------------------------- |
| `GET`    | `/plans`                | Admin | List all plans                                                             |
| `GET`    | `/plans/byUser`         | Admin | Get all plans grouped by user                                              |
| `GET`    | `/plans/me`             | JWT   | Get current user's saved plans (`?from=&to=&sort=&page=&limit=&mealName=`) |
| `POST`   | `/plans`                | JWT   | Create a single plan                                                       |
| `POST`   | `/plans/weekly-preview` | JWT   | Generate 7-day draft plan (not persisted)                                  |
| `POST`   | `/plans/replace-meal`   | JWT   | Get random replacement meal of same type                                   |
| `POST`   | `/plans/weekly-commit`  | JWT   | Bulk save weekly plans to database                                         |
| `DELETE` | `/plans/:id`            | JWT   | Delete a plan                                                              |

### Feedback (`/feedback`)

| Method | Endpoint    | Auth | Description                                     |
| ------ | ----------- | ---- | ----------------------------------------------- |
| `POST` | `/feedback` | JWT  | Submit feedback (sent to Slack via webhook, no DB) |

### Ingredients (`/ingredients`)

| Method   | Endpoint           | Auth  | Description          |
| -------- | ------------------ | ----- | -------------------- |
| `GET`    | `/ingredients`     | Admin | List all ingredients |
| `POST`   | `/ingredients`     | Admin | Create ingredient    |
| `PUT`    | `/ingredients/:id` | Admin | Update ingredient    |
| `DELETE` | `/ingredients/:id` | Admin | Delete ingredient    |

### Auth Guards

```mermaid
flowchart LR
    Req["Request"] --> JG{"JWT Guard"}
    JG -->|"Valid token"| AG{"Admin Guard?"}
    JG -->|"Invalid"| R401["401 Unauthorized"]
    AG -->|"Admin role"| OK["Access Granted"]
    AG -->|"Not admin"| OG{"Owner Guard?"}
    OG -->|"Is owner"| OK
    OG -->|"Not owner"| R403["403 Forbidden"]

    style R401 fill:#dc3545,color:#fff,stroke:none
    style R403 fill:#dc3545,color:#fff,stroke:none
    style OK fill:#238636,color:#fff,stroke:none
```

---

## Slack Webhook Notifications

Real-time event notifications via [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks) — a lightweight, fire-and-forget integration that pushes server-side events to a Slack channel without polling.

**How it works:**

```mermaid
sequenceDiagram
    participant User
    participant NestJS
    participant Slack as Slack Webhook

    User->>NestJS: POST /auth/signup
    NestJS->>NestJS: Create user in DB
    NestJS-->>Slack: POST { text: "New user: alice" }
    NestJS->>User: 201 Created
    Note over NestJS,Slack: Fire-and-forget (non-blocking)
```

**Events notified:**

| Event               | Trigger                                | Example message                                                  |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| New user signup     | `POST /auth/signup`                    | `New user signed up: alice`                                      |
| Google OAuth signup | `GET /auth/google/callback` (new user) | `New Google user signed up: alice`                               |
| Custom meal created | `POST /meals/my`                       | `Custom meal created: "Pasta" by user #5`                        |
| User feedback       | `POST /feedback`                       | `[FEEDBACK] from alice: "Love the app!"`                         |
| Server error (5xx)  | Any unhandled exception                | `[SERVER ERROR] GET /api/v1/plans — 500 — Internal Server Error` |

**Design decisions:**

- **Fire-and-forget** — notifications are non-blocking; failures are logged but never affect the API response
- **5xx only** — only server errors trigger alerts; 4xx client errors (bad input, auth failures) are intentionally excluded to avoid noise
- **Graceful degradation** — if `SLACK_WEBHOOK_URL` is not configured, the service logs a warning at startup and skips all notifications silently

---

## Testing

```bash
cd packages/backend

npm run test:unit          # 78 unit tests (services layer)
npm run test:integration   # 22 integration tests (HTTP layer with Supertest)
npm test                   # all 100 tests
npm run test:cov           # with coverage report
```

| Layer           | Framework              | What's Tested                                                                                            |
| --------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Unit**        | Jest + @nestjs/testing | PlanService, AuthService, MealService, UserService — business logic, validations, edge cases             |
| **Integration** | Jest + Supertest       | Auth flow (signup/signin/guards), Plan flow (preview/replace/commit), DTO validation (400s), RBAC (403s) |
| **CI Gate**     | GitHub Actions         | All tests must pass before semantic-release and deploy                                                   |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

### Local Development

```bash
# 1. Clone
git clone https://github.com/mingyueliu/whatToEat.git
cd whatToEat

# 2. Install dependencies
npm install

# 3. Start MySQL + Redis (Docker)
docker compose -f docker-compose.db.yml -p whattoeat-local up -d

# 4. Seed the database (first time only)
cd packages/backend && npm run seed && cd ../..

# 5. Start both frontend & backend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- MySQL: `localhost:3307`
- Redis: `localhost:6379`
- Redis Insight: `http://localhost:8001`

### Production Deployment

```bash
# Runs automatically via GitHub Actions on push to main
# Manual deploy:
docker compose up -d --build
```

---

## Project Structure

```
whatToEat/
├── .github/workflows/
│   └── deploy.yml              # CI/CD pipeline
├── packages/
│   ├── backend/
│   │   ├── config/             # Environment-specific YAML configs
│   │   ├── src/
│   │   │   ├── auth/           # JWT + Google OAuth + password reset
│   │   │   ├── user/           # User management + profiles
│   │   │   ├── meal/           # Meal CRUD + user custom meals
│   │   │   ├── plan/           # Meal planning logic
│   │   │   ├── ingredient/     # Ingredient management
│   │   │   ├── type/           # Meal types (breakfast/lunch/dinner)
│   │   │   ├── role/           # RBAC roles
│   │   │   ├── cache/          # Redis cache module (global, cache-aside)
│   │   │   ├── feedback/       # User feedback (webhook-only, no DB)
│   │   │   ├── slack/          # Slack webhook notifications (fire-and-forget)
│   │   │   ├── mail/           # Nodemailer email service
│   │   │   ├── guards/         # JWT, Admin, OwnerOrAdmin guards
│   │   │   ├── filters/        # Global exception handlers
│   │   │   ├── seeds/          # DB seed script (roles, types, meals, etc.)
│   │   │   └── app.module.ts   # Root module
│   │   ├── test/               # E2E integration tests
│   │   └── Dockerfile
│   └── frontend/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── today/      # Main "What to cook today" view
│       │   │   ├── weekplans/  # Weekly plan generator
│       │   │   ├── userplans/  # Saved plans history
│       │   │   ├── meals/      # Admin: meal management
│       │   │   ├── profile/    # User profile
│       │   │   └── ...
│       │   ├── store/          # Zustand stores
│       │   ├── components/     # Shared components
│       │   └── styles/         # Global CSS
│       ├── nginx.conf
│       └── Dockerfile
├── docker-compose.yml          # Production containers
├── docker-compose.db.yml       # Local MySQL + Redis + Redis Insight
└── package.json                # Monorepo root
```

---

## License

MIT

---

Built by **Mingyue Liu** | [mealdice.com](https://mealdice.com)
