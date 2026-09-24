# SecureDocs — Secure Digital Document Management System

Frontend for **SIH26190** — *Secure Digital Document Management System for Legal and
Investigation Documents* (Ministry of Home Affairs). This is the complete web
frontend, built to the provided wireframes, with mock authentication and a mock
API/service layer designed to be swapped for a real Django REST Framework backend
with minimal changes.

## Tech Stack

- React 19 + Vite
- React Router v7
- Tailwind CSS v3
- lucide-react (icons)
- Recharts (charts)
- Context API for auth / UI state (toasts, mobile sidebar)
- A mock API service layer (`src/api/mockApi.js`) that mimics real HTTP calls —
  every function returns a Promise and is shaped the way a real `fetch`/`axios`
  call to a DRF backend would be, so wiring up the real backend later is a
  drop-in swap.

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

To build for production:

```bash
npm run build
npm run preview   # serve the production build locally
```

## Project Structure

```
src/
├── api/               Mock API / service layer (swap for real HTTP calls later)
├── components/
│   ├── charts/         Recharts wrappers (trend line, donut, line)
│   ├── common/          Reusable UI: Badge, Modal, DataTable, Toaster,
│   │                     SignatureConfirmModal, FileDropzone, States, Controls…
│   └── layout/          Sidebar, Topbar, BottomNav, DashboardLayout
├── context/            AuthContext (mock login/session), UIContext (toasts, drawer)
├── data/               Mock data: users, cases, documents, audit logs, tasks…
├── pages/
│   ├── auth/            Portal selector, Login, Register (role-aware)
│   ├── admin/            Admin Panel pages
│   ├── judge/            Judicial Access Portal pages
│   ├── investigator/     Investigator App pages
│   ├── legalOfficer/     Legal Officer Workspace pages
│   ├── police/           Police Officer Panel pages
│   └── shared/           Pages reused across roles (Case Detail, Document
│                          Review, Documents list, Audit Trail, Profile) —
│                          rendered with role-specific permissions/props
├── router/              Route nav configuration + RequireRole route guard
└── utils/               Role/theme constants
```

## Roles & Demo Credentials

Every account uses the password **`Demo@123`**. You can also use the
**"Login with Biometrics"** button on any login screen, which simulates a
fingerprint/WebAuthn check and signs you in as that role's demo user — no
password needed. There's also an **"Autofill demo credentials"** link on
every login screen.

| Role | Portal URL | User ID | Password |
|---|---|---|---|
| Admin | `/login/admin` | `admin@gov.in` | `Demo@123` |
| Judge | `/login/judge` | `justice.verma` | `Demo@123` |
| Investigator | `/login/investigator` | `arjun.singh` | `Demo@123` |
| Legal Officer | `/login/legalOfficer` | `neha.legal` | `Demo@123` |
| Police Officer | `/login/police` | `ramesh.po` | `Demo@123` |

Start at `/` to see the portal selector, or go straight to any of the login
URLs above.

## Role-Based Access

Each role has its own themed sidebar, dashboard, and permitted actions,
matching the wireframes:

- **Admin** — Users, Roles & Permissions, Departments, Cases, Documents,
  Audit Trail (with a live tamper-detection demo), Reports, Alerts, System
  Health, Settings, Backup & Restore.
- **Judge** — My Docket, Document Review & Signature (biometric/OTP-gated),
  AI-powered Search, Audit Trail (verified vs. tampered chain demo), Profile.
- **Investigator** — Dashboard, My Cases, Documents, Create Document (with
  a pre-submit integrity check step), Tasks, Evidence Management, Profile.
- **Legal Officer** — My Cases (filtered), Documents, Collaborative
  Workspace (secure comments), Legal Templates & Clauses, Audit Trail, Profile.
- **Police Officer** — Dashboard, My Cases, Documents, Upload Document,
  Reports, Audit Trail, Alerts, Profile.

Route access is enforced client-side via `RequireRole` — visiting another
role's URL while logged in shows an "Access Restricted" state rather than
the page content.

## Key Interactive Features

- **Biometric / OTP signature confirmation** (`SignatureConfirmModal`) — used
  wherever a document needs to be signed/approved (Judge orders, Admin/
  Investigator sign-off), simulating fingerprint verification with a
  password + OTP fallback.
- **Tamper-detection demo** — the Audit Trail page (Admin & Judge) includes a
  "Simulate Tampering" toggle that switches the chain-of-custody view between
  a verified, unbroken hash chain and a broken one with a visible tamper alert
  — recreating the hackathon's signature demo moment.
- **Mock semantic search** — the Judge's Search page and Legal workflows use
  a mock AI-powered search returning ranked, relevance-scored results.
- **Upload → Review → Submit flow** — Investigator's Create Document page
  shows a pre-submission integrity check (hash preview, "no tampering
  detected") before final submission.
- **Toasts, loading, empty, and error states** are implemented throughout via
  shared components (`Toaster`, `Spinner`, `EmptyState`, `ErrorState`,
  `Unauthorized`).

## Connecting to the Real Django Backend

All data currently comes from `src/data/*.js` and is served through
`src/api/mockApi.js`. To connect the real DRF backend:

1. Replace the bodies of the functions in `mockApi.js` with real `fetch`/
   `axios` calls to your API endpoints (the function signatures already match
   what the UI needs).
2. Point `loginRequest` at your JWT/session auth endpoint and store the real
   token instead of the mock one in `AuthContext`.
3. Swap the static imports in `src/data/*.js` for API-driven state (e.g. via
   `useEffect` + `useState`, or a data-fetching library) inside the pages
   that currently import mock data directly.

No component structure, routing, or styling changes are required — the
mock layer was intentionally shaped to mirror a real REST API.

## Responsiveness

The layout is fully responsive: a fixed sidebar + topbar on desktop, a
slide-out drawer sidebar with a hamburger trigger on tablet/mobile, and a
bottom tab bar on mobile for the most-used sections per role.
