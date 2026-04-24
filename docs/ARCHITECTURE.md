# Architecture

This document describes the architecture of the HR System using the [C4 Model](https://c4model.com/) and explains the data flow, security model, and technology stack.

---

## C4 Model — Level 1: System Context

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │   Admin      │         │   Employee   │         │  HR Manager  │       │
│   │  (Browser)   │         │  (Browser)   │         │  (Browser)   │       │
│   └──────┬───────┘         └──────┬───────┘         └──────┬───────┘       │
│          │                        │                        │               │
│          │                        │                        │               │
│          └────────────────────────┼────────────────────────┘               │
│                                   │                                        │
│                                   ▼                                        │
│                          ┌──────────────┐                                  │
│                          │  HR System   │                                  │
│                          │  (Web App)   │                                  │
│                          └──────┬───────┘                                  │
│                                 │                                          │
│                                 ▼                                          │
│                          ┌──────────────┐                                  │
│                          │ Email Service│                                  │
│                          │   (SMTP)     │                                  │
│                          └──────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Actor | Description |
|-------|-------------|
| **Admin** | System administrator who manages users, roles, feature flags, and audit logs. |
| **HR Manager** | Manages employees, departments, complaints, time-off requests, and reviews. |
| **Employee** | Views personal data, submits complaints, requests time-off, and tracks development goals. |
| **Email Service** | External SMTP provider for sending notifications and alerts. |

---

## C4 Model — Level 2: Container Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Web Browser                                  │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│   │  │ React SPA    │  │ Service      │  │ Browser Cache (PWA)      │  │   │
│   │  │ (Vite + TS)  │  │ Worker       │  │ - Offline assets         │  │   │
│   │  └──────┬───────┘  └──────────────┘  └──────────────────────────┘  │   │
│   │         │                                                           │   │
│   └─────────┼───────────────────────────────────────────────────────────┘   │
│             │ HTTPS / JSON REST                                           │
│             ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        API Server (Rust + Axum)                      │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│   │  │ Auth Layer   │  │ Handlers     │  │ Middleware   │              │   │
│   │  │ (Argon2)     │  │ (REST API)   │  │ (Rate Limit) │              │   │
│   │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│   │                                                                     │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│   │  │ Database     │  │ Email Client │  │ SSE Stream   │              │   │
│   │  │ (SQLite)     │  │ (Lettre)     │  │ (Tokio)      │              │   │
│   │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Container | Technology | Responsibility |
|-----------|-----------|--------------|
| **Browser (React SPA)** | React 19, Vite, TypeScript, Tailwind CSS | User interface, client-side routing, state management, PWA capabilities |
| **Browser Cache** | Service Worker, Cache API | Offline asset caching for PWA support |
| **API Server** | Rust, Axum, Tokio | HTTP request handling, business logic, authentication |
| **Database** | SQLite (Rusqlite) | Persistent storage for all application data |
| **Email Client** | Lettre (SMTP) | Sending transactional emails and notifications |
| **SSE Stream** | Tokio Streams | Real-time server-sent events for live updates |

---

## C4 Model — Level 3: Component Diagram

### Backend Components

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Server (Rust + Axum)                           │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Auth Module    │  │  Handlers       │  │  DB Layer       │             │
│  │  ─────────────  │  │  ─────────────  │  │  ─────────────  │             │
│  │  • Sessions     │  │  • Employees    │  │  • Migrations   │             │
│  │  • Argon2       │  │  • Departments  │  │  • Queries      │             │
│  │  • RBAC         │  │  • Complaints   │  │  • FTS Search   │             │
│  │  • API Keys     │  │  • Reviews      │  │  • Transactions │             │
│  └─────────────────┘  │  • Time-off     │  └─────────────────┘             │
│                       │  • Bulk Ops     │                                 │
│  ┌─────────────────┐  │  • Search       │  ┌─────────────────┐             │
│  │  Middleware     │  │  • SSE Events   │  │  Models           │             │
│  │  ─────────────  │  │  • Portal       │  │  ─────────────  │             │
│  │  • Rate Limit   │  └─────────────────┘  │  • Serialization│             │
│  │  • CORS         │                       │  • Validation   │             │
│  │  • Audit Log    │  ┌─────────────────┐  │  • Pagination   │             │
│  └─────────────────┘  │  Services       │  └─────────────────┘             │
│                       │  ─────────────  │                                 │
│                       │  • Email        │                                 │
│                       │  • Sentry       │                                 │
│                       │  • Events       │                                 │
│                       └─────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Component | Responsibility |
|-----------|--------------|
| **Auth Module** | Session management, Argon2 password hashing, RBAC permission checks, API key validation |
| **Handlers** | REST API route handlers for all domain entities (employees, departments, complaints, etc.) |
| **DB Layer** | Database migrations, query builders, FTS search indexing, connection pooling via spawn_blocking |
| **Models** | Data structures, JSON schemas, input validation, pagination helpers |
| **Middleware** | Rate limiting, CORS configuration, automatic audit logging |
| **Services** | Email sending (SMTP), error reporting (Sentry), SSE event broadcasting |

### Frontend Layers

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React SPA (Vite + TypeScript)                      │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Components     │  │  Hooks          │  │  API Layer      │             │
│  │  ─────────────  │  │  ─────────────  │  │  ─────────────  │             │
│  │  • UI Primitives│  │  • useAuth      │  │  • api.ts       │             │
│  │  • Layout       │  │  • useAppState  │  │  • Fetch wrappers│             │
│  │  • Forms        │  │  • useRuntime   │  │  • SSE client   │             │
│  │  • Tables       │  │  • Controllers  │  │  • Error handling│             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Styles         │  │  State          │  │  Utils          │             │
│  │  ─────────────  │  │  ─────────────  │  │  ─────────────  │             │
│  │  • Tailwind CSS │  │  • App Context  │  │  • Notifications│             │
│  │  • CSS Modules  │  │  • Builders     │  │  • Export       │             │
│  │  • Responsive   │  │  • Modal Utils  │  │  • Validation   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Responsibility |
|-------|--------------|
| **Components** | Reusable UI primitives, page layouts, forms, data tables, modals |
| **Hooks** | Custom React hooks for authentication, application state, runtime config, feature controllers |
| **API Layer** | Typed fetch wrappers, SSE event source management, centralized error handling |
| **Styles** | Tailwind CSS utility classes, responsive design tokens, dark mode support |
| **State** | Global app context, state builders, modal DOM utilities |
| **Utils** | Desktop notifications, CSV/PDF export helpers, form validation, onboarding utilities |

---

## 🔄 Data Flow: Authentication Example

```text
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│ Browser │────▶│  POST /api/ │────▶│   Argon2     │────▶│  SQLite  │────▶│  Session │
│         │     │  auth/login │     │   Verify     │     │  Query   │     │  Cookie  │
└─────────┘     └─────────────┘     └──────────────┘     └──────────┘     └──────────┘
     │                                                                        │
     │                                                                        ▼
     │                                                                 ┌──────────┐
     │                                                                 │  Set-Cookie: hr_session=...
     │                                                                 │  HttpOnly; SameSite=Lax
     │                                                                 └──────────┘
     │                                                                        │
     ▼                                                                        ▼
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│ Browser │────▶│  GET /api/  │────▶│  Cookie      │────▶│  SQLite  │────▶│  JSON    │
│ (auth)  │     │  employees  │     │  Validation  │     │  Query   │     │  Response│
└─────────┘     └─────────────┘     └──────────────┘     └──────────┘     └──────────┘
```

1. **Login Request**: Browser sends credentials to `POST /api/auth/login`
2. **Password Verification**: Backend hashes incoming password with Argon2 and compares against stored hash
3. **Session Creation**: On success, a new session row is inserted into SQLite
4. **Cookie Response**: Server sets an `HttpOnly` session cookie (`hr_session`)
5. **Authenticated Request**: Browser automatically sends the cookie with subsequent API requests
6. **Session Validation**: Middleware validates the session against the database
7. **RBAC Check**: Handler verifies the user has permission for the requested resource
8. **Response**: Data is queried, serialized to JSON, and returned to the browser

---

## 🔒 Security Model

| Layer | Mechanism | Implementation |
|-------|-----------|----------------|
| **Authentication** | Password hashing | Argon2id with secure salt |
| **Session Management** | HTTP-only cookies | Signed session IDs stored server-side |
| **Authorization** | RBAC | Role-based permissions checked per endpoint |
| **Audit** | Immutable logs | Every mutation is recorded with actor, action, and timestamp |
| **Rate Limiting** | Token bucket | 5 requests per 60 seconds per IP (configurable) |
| **CORS** | Origin whitelist | Credentialed requests only from configured origin |
| **Input Validation** | Schema validation | Strict JSON payload validation on all endpoints |
| **Error Handling** | Sanitized responses | Internal details never leak to clients |
| **Monitoring** | Error tracking | Optional Sentry integration for production alerts |

---

## 🛠️ Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Language (Backend)** | Rust | 1.94+ | High-performance API server |
| **Web Framework** | Axum | 0.8+ | HTTP routing and middleware |
| **Database** | SQLite | 3.x | Embedded relational database |
| **DB Driver** | Rusqlite | 0.37+ | Rust SQLite bindings |
| **Async Runtime** | Tokio | 1.48+ | Async I/O and task scheduling |
| **Password Hashing** | Argon2 | 0.5+ | Secure password storage |
| **Email** | Lettre | 0.11+ | SMTP email transport |
| **Error Tracking** | Sentry | 0.36+ | Production error monitoring |
| **Language (Frontend)** | TypeScript | 5.8+ | Typed JavaScript |
| **Framework** | React | 19.1+ | UI library |
| **Build Tool** | Vite | 8.0+ | Dev server and bundler |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS |
| **PWA** | Vite PWA Plugin | 1.2+ | Service worker and manifest |
| **Unit Testing** | Vitest | 4.1+ | Frontend unit tests |
| **E2E Testing** | Playwright | 1.59+ | Browser automation tests |
| **Container** | Docker | 24+ | Application packaging |
| **Orchestration** | docker-compose | 2.20+ | Local multi-service setup |
| **Deployment** | Fly.io | — | Cloud platform |
