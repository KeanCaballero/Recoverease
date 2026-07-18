# RecoverEase 🏥

### Post-Treatment Patient Recovery Management System

A full-stack, cloud-ready Progressive Web Application for outpatient clinics, connecting **Patients**, **Healthcare Providers (Doctors)**, and **Administrators** through intelligent recovery monitoring, medication tracking, AI-assisted chat support, and appointment management.

> **Powered by** React · Node.js · Prisma · Supabase · Anthropic Claude

---

## 📑 Table of Contents

- [Feature Modules](#-feature-modules)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start-local-development)
- [Demo Credentials](#-demo-credentials)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [AI Chatbot](#-ai-chatbot)
- [Security](#-security)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Testing the System](#-testing-the-system)
- [License](#-license)

---

## ✨ Feature Modules

| Module | Doctor | Patient | Admin |
|---|---|---|---|
| **Authentication & RBAC** | ✅ | ✅ | ✅ |
| **User Management** | Register patients | View profile | Register doctors |
| **Treatment Plans** | Create / update / goals | View + track | — |
| **Medication** | Prescribe + schedule | Mark taken + adherence | — |
| **Recovery Monitoring** | View dashboard + notes | Log daily progress + mood | — |
| **Appointments** | Schedule + approve reschedule | View + request reschedule + confirm | — |
| **Notifications** | Send to patient, receive critical alerts | Receive reminders + announcements | — |
| **AI Chat (Claude)** | View transcripts + critical alerts | Chat + history | Configure + logs |
| **Reports & Analytics** | Patient recovery report | — | System-wide report |
| **Audit Logs** | — | — | Full filterable log |
| **System Settings** | — | — | Clinic info + chatbot prompt |
| **Announcements** | — | View | Create / manage |
| **Data Privacy Consent** | — | First-login consent | — |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 · TypeScript · Vite |
| **Styling** | Tailwind CSS v4 · Radix UI |
| **State Management** | React Context + Hooks |
| **Backend** | Node.js · Express |
| **ORM** | Prisma 5 |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | JWT (access + refresh tokens) |
| **AI Chatbot** | Anthropic Claude (claude-haiku) |
| **PWA** | Web Manifest · Nginx SPA |
| **Deployment** | Vercel · Render · Supabase |

---

## ✅ Prerequisites

Before you begin, ensure you have the following:

| Requirement | Version / Notes |
|---|---|
| [Node.js](https://nodejs.org/) | v20 or higher |
| [Git](https://git-scm.com/) | Any recent version |
| [Supabase Account](https://supabase.com/) | Free tier is sufficient for development |

> **No local database installation required.** RecoverEase uses Supabase as its managed PostgreSQL provider, so you do not need to install or configure PostgreSQL on your machine.

---

## 🚀 Quick Start (Local Development)

### Step 1 — Clone the Repository

```bash
git clone <repo-url> recoverease
cd recoverease
```

### Step 2 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign in.
2. Click **New Project** and fill in your project details.
3. Once your project is ready, go to **Settings → Database**.
4. Copy the two connection strings you will need:
   - **Connection string (Transaction mode)** → used as `DATABASE_URL`
   - **Connection string (Session mode / Direct)** → used as `DIRECT_URL`

> Supabase provides both a pooled connection (via PgBouncer) and a direct connection. Prisma requires the direct connection for schema migrations.

### Step 3 — Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in your Supabase credentials (see [Environment Variables](#-environment-variables) for the full reference).

### Step 4 — Install Dependencies and Push the Schema

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push          # pushes schema to your Supabase database
npx tsx src/seed.ts         # seeds demo data

# Frontend (open a new terminal)
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

### Step 5 — Start the Backend

```bash
cd backend
npm run dev                 # → http://localhost:3001
```

Both servers must be running simultaneously. The Vite dev server proxies all `/api` requests to the Express backend automatically.

---

### Option B — One-Command Setup Script

If you have already configured `backend/.env`, you can run the included setup script to install dependencies, push the schema, seed the database, and start both servers in one step:

```bash
./setup.sh
```

---

### Option C — Docker (Frontend + Backend only)

> **Note:** Docker Compose bundles the frontend and backend containers only. You still need a Supabase project for the database — set your `DATABASE_URL` and `DIRECT_URL` in `.env` before building.

```bash
cp backend/.env.example backend/.env   # fill in your Supabase credentials
docker-compose up --build
```

App will be available at **http://localhost:5173**

---

## 🔐 Demo Credentials

After seeding (`npx tsx src/seed.ts`), the following accounts are available:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@recoverease.app` | `Admin@123` |
| **Doctor** | `dr.santos@recoverease.app` | `Doctor@123` |
| **Patient** | `juan.dela.cruz@email.com` | `Patient@123` |

---

## 📁 Project Structure

```
recoverease/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma               # 20-table Supabase schema
│   └── src/
│       ├── index.ts                    # Express app entry point
│       ├── lib/
│       │   └── prisma.ts               # Prisma client singleton
│       ├── middleware/
│       │   ├── auth.middleware.ts      # JWT verification + role guards
│       │   └── error.middleware.ts     # Global error handler
│       ├── controllers/                # Business logic
│       │   ├── auth.controller.ts
│       │   ├── doctor.controller.ts
│       │   ├── treatment.controller.ts
│       │   ├── medication.controller.ts
│       │   ├── appointment.controller.ts
│       │   ├── recovery.controller.ts
│       │   ├── chat.controller.ts      # AI chatbot + critical alert pipeline
│       │   ├── admin.controller.ts
│       │   ├── notification.controller.ts
│       │   └── announcement.controller.ts
│       ├── routes/                     # Express routers (14 route files)
│       ├── utils/
│       │   ├── jwt.ts                  # Token sign / verify
│       │   ├── audit.ts                # Audit log writer
│       │   └── response.ts             # Typed HTTP response helpers
│       └── seed.ts                     # Demo data seeder
│
└── frontend/
    └── src/
        ├── types/index.ts              # All TypeScript interfaces
        ├── lib/
        │   ├── api.ts                  # Axios client + refresh token interceptor
        │   └── utils.ts                # Formatters, cn(), helpers
        ├── contexts/
        │   ├── AuthContext.tsx         # Auth state + login / logout
        │   └── NotificationContext.tsx # Polling-based notification state
        ├── components/
        │   ├── ui/index.tsx            # Button, Card, Input, Modal, Badge, ...
        │   └── layout/AppLayout.tsx   # Role-aware sidebar navigation
        └── pages/
            ├── auth/                   # Login, Data Privacy Consent
            ├── doctor/                 # Dashboard, Patients, Patient Detail
            ├── patient/                # Dashboard, Treatment, Medications,
            │                           # Recovery, Appointments, AI Chat
            └── admin/                  # Dashboard, Doctors, Announcements,
                                        # Chat Logs, Audit Logs, Settings
```

---

## 🗄 Database Schema (20 Tables)

All tables are hosted on Supabase and managed through Prisma ORM. The schema is pushed via `prisma db push` — no raw SQL required.

```
UserAccount ──┬── Doctor ──┬── Patient ──┬── TreatmentPlan ── TreatmentGoal
              │            │             ├── Prescription ── MedicationSchedule ── MedicationLog
              │            │             ├── RecoveryLog
              │            │             ├── DoctorNote
              │            │             ├── Appointment ── RescheduleRequest
              │            │             ├── ChatSession ── ChatMessage
              │            │             └── Report
              ├── Admin ───┼── Announcement
              │            └── SystemSetting
              ├── Notification
              └── AuditLog
```

---

## 🔌 API Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Login, returns JWT access + refresh tokens |
| `POST` | `/api/auth/refresh` | — | Refresh access token |
| `GET` | `/api/auth/me` | ✅ | Get current authenticated user profile |
| `POST` | `/api/auth/consent` | Patient | Accept data privacy consent |
| `PATCH` | `/api/auth/password` | ✅ | Change account password |

### Doctor

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/doctors/dashboard` | Stats + upcoming appointments |
| `GET` | `/api/doctors/patients` | List patients (supports search + status filter) |
| `POST` | `/api/doctors/patients` | Register a new patient |
| `GET` | `/api/doctors/patients/:id` | Full patient profile |
| `POST` | `/api/doctors/patients/:id/notes` | Add a clinical note |

### Treatment

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/treatments` | Create a treatment plan |
| `GET` | `/api/treatments/patient/:patId` | Get all plans for a patient |
| `PATCH` | `/api/treatments/:planId` | Update a treatment plan |
| `POST` | `/api/treatments/:planId/goals` | Add or update a treatment goal |

### Medications

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/medications/prescriptions` | Issue a prescription |
| `GET` | `/api/medications/today` | Today's medication schedule (patient) |
| `PATCH` | `/api/medications/logs/:id/taken` | Mark a medication as taken |
| `GET` | `/api/medications/adherence` | 7-day adherence statistics |

### Appointments

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/appointments` | Schedule an appointment |
| `GET` | `/api/appointments` | List appointments (role-filtered) |
| `PATCH` | `/api/appointments/:id/status` | Update appointment status |
| `POST` | `/api/appointments/:id/reschedule` | Request a reschedule |
| `PATCH` | `/api/appointments/reschedule/:id` | Approve or decline a reschedule request |

### Recovery

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/recovery/log` | Log a daily recovery entry + mood rating |
| `GET` | `/api/recovery/history` | Recovery history + streak count |
| `GET` | `/api/patients/dashboard` | Full patient recovery dashboard |

### AI Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat/message` | Send a message to the AI assistant |
| `GET` | `/api/chat/history` | List all chat sessions |
| `GET` | `/api/chat/sessions/:id` | Full session transcript |
| `GET` | `/api/chat/admin/logs` | All sessions with usage metadata (admin) |

### Admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | System-wide overview |
| `POST` | `/api/admin/doctors` | Register a new doctor |
| `GET` | `/api/admin/doctors` | List all doctor accounts |
| `PATCH` | `/api/admin/doctors/:id/toggle` | Activate or deactivate a doctor |
| `GET` | `/api/audit` | Filterable audit log |
| `GET` | `/api/settings` | Retrieve all system settings |
| `POST` | `/api/settings` | Create or update a system setting |

---

## 🤖 AI Chatbot

The AI assistant uses **Anthropic Claude** (`claude-haiku-4-5`) with the following capabilities:

- **Patient context injection** — the AI is automatically provided the patient's name, assigned doctor, active treatment plan, and current medications on every session.
- **Critical keyword detection** — messages containing terms such as `chest pain`, `difficulty breathing`, `emergency`, `overdose`, and similar are automatically flagged.
- **Automatic doctor notification** — when a critical concern is detected, the assigned doctor receives an in-app notification with a preview of the message.
- **Configurable system prompt** — administrators can override the default system prompt via the System Settings page.
- **Full chat history** — every session is stored and can be reviewed by the patient and their assigned doctor.

> Set `ANTHROPIC_API_KEY` in `backend/.env` to enable the chatbot. Without it, a graceful fallback message is shown to the patient.

---

## 🔒 Security

| Mechanism | Details |
|---|---|
| **JWT Authentication** | 15-minute access tokens + 7-day refresh tokens |
| **Password Hashing** | bcrypt with cost factor 12 |
| **HTTP Security Headers** | Helmet.js on all responses |
| **CORS Policy** | Restricted to the configured `FRONTEND_URL` origin |
| **Rate Limiting** | 300 req / 15 min globally · 20 req / 15 min on auth routes |
| **Role-Based Access Control** | Every API route protected by role middleware |
| **Audit Logging** | Every CREATE, UPDATE, DELETE, and LOGIN event recorded |
| **Data Privacy Consent** | Patients must accept on first login (RA 10173 compliant) |

---

## 📋 Environment Variables

Create a `.env` file in the `backend/` directory based on `.env.example`.

```env
# ── Database (Supabase) ───────────────────────────────────────────────────────
# Pooled connection string — used by Prisma at runtime (via PgBouncer)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection string — used by Prisma for schema migrations
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# ── Authentication ────────────────────────────────────────────────────────────
JWT_SECRET="your-super-secret-minimum-32-characters"
JWT_REFRESH_SECRET="your-refresh-secret-minimum-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ── Server ────────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# ── AI Chatbot (optional) ─────────────────────────────────────────────────────
ANTHROPIC_API_KEY="sk-ant-..."   # Leave blank to disable; a fallback message is shown
```

> **Where to find your Supabase connection strings:**
> Supabase Dashboard → Your Project → **Settings** → **Database** → **Connection string**
> - Select **Transaction** mode for `DATABASE_URL`
> - Select **Session** mode for `DIRECT_URL`

You must also update `backend/prisma/schema.prisma` to reference `DIRECT_URL` for migrations:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## ☁️ Deployment

RecoverEase is designed for modern cloud deployment. The recommended stack is:

### Frontend → Vercel

1. Push your repository to GitHub.
2. Import the project on [vercel.com](https://vercel.com/).
3. Set the **Root Directory** to `frontend`.
4. Add the environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
5. Vercel will build and deploy automatically on every push to `main`.

### Backend → Render *(preferred)* or Railway

**Render:**

1. Create a new **Web Service** on [render.com](https://render.com/).
2. Connect your GitHub repository.
3. Set the **Root Directory** to `backend`.
4. Set the **Build Command** to:
   ```bash
   npm install && npx prisma generate && npm run build
   ```
5. Set the **Start Command** to:
   ```bash
   npx prisma db push && node dist/index.js
   ```
6. Add all environment variables from `backend/.env` in the Render dashboard.

**Railway:**

1. Create a new project on [railway.app](https://railway.app/).
2. Connect your GitHub repository and select the `backend/` directory.
3. Railway auto-detects Node.js — add your environment variables in the **Variables** tab.

### Database → Supabase

Your Supabase project serves as the managed PostgreSQL database for both local development and production. No additional configuration is required beyond setting the correct connection strings per environment.

> **Tip:** Use separate Supabase projects for development and production to avoid data conflicts.

### File Storage → Supabase Storage

If you extend RecoverEase to support file uploads (e.g., report PDFs, profile photos), use [Supabase Storage](https://supabase.com/docs/guides/storage) for managed, CDN-backed object storage. It integrates directly with your existing Supabase project and Row-Level Security policies.

---

### Recommended Environment Configuration per Stage

| Variable | Local Dev | Production |
|---|---|---|
| `DATABASE_URL` | Supabase dev project (Transaction) | Supabase prod project (Transaction) |
| `DIRECT_URL` | Supabase dev project (Session) | Supabase prod project (Session) |
| `FRONTEND_URL` | `http://localhost:5173` | `https://your-app.vercel.app` |
| `NODE_ENV` | `development` | `production` |

---

## 🧪 Testing the System

After completing setup and seeding the database:

1. **Login as Admin** → Register a new doctor account.
2. **Login as Doctor** → Register a patient, create a treatment plan, and issue a prescription.
3. **Login as Patient** → Accept the data privacy consent → explore the dashboard, log a recovery entry, and chat with the AI assistant.
4. **Return to Doctor** → View the patient's recovery dashboard, add clinical notes, and check for any critical chat alerts.
5. **Return to Admin** → Review audit logs, inspect chatbot session logs, and adjust system settings.

---

## 📄 License

MIT — Built for the RecoverEase capstone project, University of Cebu, 2025.
