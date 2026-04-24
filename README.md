# 🏢 HR System

> Modern Human Resources management platform — built with Rust power and React polish.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](./TESTING.md)
[![Rust](https://img.shields.io/badge/rust-1.94%2B-orange?logo=rust)](./backend/Cargo.toml)
[![Node](https://img.shields.io/badge/node-20%2B-339933?logo=nodedotjs)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](./TESTING.md)

<!-- TODO: Replace with a demo GIF or screen recording -->
<!-- ![Demo GIF](./docs/assets/demo.gif) -->

```text
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    HR System — Employee Management, Simplified               ║
║                                                               ║
║    [ Employees ]  [ Departments ]  [ Complaints ]            ║
║    [ Time-off ]   [ Reviews ]      [ Org Chart ]             ║
║    [ Onboarding ] [ Development ]  [ Audit Log ]             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🏗️ Architecture Overview

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind CSS |
| **Backend** | Rust + Axum + Rusqlite (SQLite) |
| **Tests** | Vitest (unit) + Playwright (E2E) |
| **DevOps** | Docker + Fly.io + docker-compose |

The project is a split frontend/backend application:
- **Frontend**: A modern React SPA with PWA support, built with Vite and styled with Tailwind CSS.
- **Backend**: A high-performance Rust API server using Axum, with SQLite for data persistence.
- **Communication**: RESTful JSON API with session-based authentication and optional SSE for real-time events.

---

## ✨ Features

### Core HR Management
- [x] 👤 Employee CRUD with profile management
- [x] 🏢 Department & Position management
- [x] 📊 Visual Organization Chart with hierarchy & employee chips
- [x] 📋 Employee Complaints & Case Tracking
- [x] 💬 Complaint Comments & Timeline
- [x] 🌴 Time-off Requests with Approval Workflow
- [x] ⭐ Performance Reviews
- [x] 📄 Document Storage & Downloads
- [x] 💰 Payroll Runs with Finalization
- [x] 📅 Shift Scheduling with Conflict Detection

### Recruitment & Talent Acquisition
- [x] 🎯 Kanban-style Candidate Pipeline (New → Hired)
- [x] 📊 Candidate Rating & Source Tracking

### Employee Engagement
- [x] 📊 Employee Surveys & Polls with Live Results
- [x] 🎫 Internal Help Desk / Ticket System

### Employee Development
- [x] 🎯 Development Goals with Kanban-style Tracking
- [x] 📝 Development Feedback System
- [x] 📅 1-on-1 Meeting Scheduling
- [x] 🚀 Onboarding Task Management
- [x] 🎓 Employee Self-Service Portal
- [x] 🎓 Training Courses & Assignments

### Admin & Security
- [x] 🔐 Session-based Authentication with Argon2
- [x] 🛡️ Role-Based Access Control (RBAC) with Permission Matrix
- [x] 📜 Comprehensive Audit Logging
- [x] 🔍 Full-Text Search (FTS) across records
- [x] ⚡ API Rate Limiting
- [x] 🚦 Feature Flags for gradual rollouts
- [x] 🔑 API Key Authentication (Enterprise)
- [x] 🔒 Change Password Endpoint

### Bulk Operations
- [x] 📦 Bulk Delete Employees
- [x] ✏️ Bulk Update Employees
- [x] 📦 Bulk Delete Complaints
- [x] ✏️ Bulk Update Complaints
- [x] 📥 CSV Import Preview & Commit
- [x] 📤 CSV Export for Employees & Complaints

### Communication & Real-time
- [x] 📧 SMTP Email Integration
- [x] 🔊 Server-Sent Events (SSE) for live updates
- [x] 🔔 In-app Notification System with Unread Count
- [x] 📱 PWA Support with Offline Capability
- [x] 🖥️ Desktop Push Notifications

### Reporting & Analytics
- [x] 📈 Dynamic Reports (Payroll, Training, Scheduling, Audit)
- [x] 📊 Employee 360° Dashboard
- [x] 📈 Activity Feed & Audit Timeline
- [x] 📉 Compliance Analytics with Charts

### Developer Experience
- [x] 🧪 Full Test Suite (Unit + Integration + E2E)
- [x] 📖 Auto-generated OpenAPI Specification
- [x] 🐳 Docker & docker-compose Support
- [x] ☁️ Fly.io Deployment Ready
- [x] 🐛 Sentry Error Tracking Integration
- [x] 🔄 Database Migrations & Seeding

---

## 🚀 Quick Start

### Prerequisites
- [Rust](https://rustup.rs/) 1.94+
- [Node.js](https://nodejs.org/) 20+
- [npm](https://www.npmjs.com/) 10+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd HR_System

# Install dependencies (frontend + tools)
npm install
```

### Development

Run the frontend and backend together with hot-reload:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Full Verification

Run the complete test and build pipeline:

```bash
npm run verify:e2e
```

This runs: lint checks → backend tests → frontend tests → build → Playwright E2E tests.

### Install Playwright Browsers (first time only)

```bash
npm run playwright:install
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root (see [`.env.example`](./.env.example) for a template):

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend HTTP server port | `3000` |
| `HR_SYSTEM_DB_PATH` | Path to SQLite database file | `./backend/hr_system.db` |
| `HR_SYSTEM_FRONTEND_DIST` | Path to built frontend assets | `./frontend/dist` |
| `HR_SYSTEM_COOKIE_SECURE` | Set `true` for HTTPS-only cookies | `true` |
| `HR_SYSTEM_COOKIE_SAMESITE` | Cookie SameSite policy (`lax`/`strict`/`none`) | `lax` |
| `HR_SYSTEM_CORS_ORIGIN` | Frontend origin for credentialed CORS | `https://app.example.com` |
| `HR_SYSTEM_RATE_LIMIT_DISABLED` | Set `true` to disable rate limiting (dev only) | `false` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP authentication username | `hr@example.com` |
| `SMTP_PASSWORD` | SMTP authentication password | `app-password` |
| `SMTP_FROM` | Default sender email address | `HR System <hr@example.com>` |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://xxx@yyy.ingest.sentry.io/zzz` |
| `VITE_API_ORIGIN` | External API origin for split deployments | `https://api.example.com` |

> **Note:** For local development, most variables have sensible defaults. You only need to set `SMTP_*` and `SENTRY_DSN` if you use those features.

---

## 🐳 Deployment

### Docker

Build and run with Docker:

```bash
# Build the image
npm run docker:build

# Run with persistent SQLite volume
npm run docker:run
```

Or use `docker-compose`:

```bash
docker-compose up --build
```

### Fly.io

Deploy to [Fly.io](https://fly.io) in minutes:

```bash
fly auth login
fly launch --copy-config --no-deploy
fly deploy
```

The included `fly.toml` configures:
- App port `3000` with health checks
- Volume-mounted SQLite at `/data/hr_system.db`
- Secure cookies enabled

---

## 📸 Screenshots

<!-- TODO: Add screenshots to ./docs/assets/screenshots/ -->
<!-- | Dashboard | Employee List | Org Chart | -->
<!-- |-----------|---------------|-----------| -->
<!-- | ![Dashboard](./docs/assets/screenshots/dashboard.png) | ![Employees](./docs/assets/screenshots/employees.png) | ![Org Chart](./docs/assets/screenshots/org-chart.png) | -->

> Screenshots will be added in a future update. Run `npm run dev` to explore the UI locally.

---

## 🤝 Contributing

<!-- TODO: Add contribution guidelines -->

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Make sure all tests pass before submitting:

```bash
npm run verify:e2e
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<p align="center">
  Built with ❤️ using Rust & React
</p>
