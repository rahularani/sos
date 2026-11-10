# 🚨 UYRA

> **Every Life. Every Second.**  
> *Public Emergency Response & Real-Time Incident Management Platform*

![Node.js](https://img.shields.io/badge/Node.js-v22.10-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-v10.4.15-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.7.3-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-v19.2.4-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-v8.0.8-646CFF?logo=vite&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-v6.4.0-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8.1-010101?logo=socket.io&logoColor=white)
![Status](https://img.shields.io/badge/Status-Competition--Verified-success?style=flat-square)

**UYRA** is a mission-critical, full-stack emergency response and real-time incident coordination platform. Engineered for national, state, and metropolitan emergency command centers, UYRA connects citizens facing immediate life-threatening perils with authorized dispatch coordinators and field response units. By combining client-side HTML5 High-Accuracy GPS acquisition, an automated 4-dimension deterministic priority scoring engine, Haversine geospatial dispatch recommendations with database-enforced concurrency locks, real-time bidirectional WebSocket telemetry, and complete 6-language Indic localization, UYRA eliminates manual triage bottlenecks and prevents dispatch race conditions during mass-casualty and disaster events.

---

## 📌 Problem Statement

Emergency response workflows worldwide suffer from structural vulnerabilities that lead to avoidable loss of life and misallocation of critical public safety resources:

1. **Reporting Latency & Inaccurate Location Telemetry:** Citizens calling emergency hotlines frequently struggle to convey precise street addresses under panic. Verbal miscommunication, noisy background environments, and unverified landmarks delay initial dispatch. UYRA delivers instant browser-native GPS capture with accuracy bounds and street-level reverse geocoding directly to dispatchers.
2. **Subjective, Non-Deterministic Prioritization:** Conventional dispatch desks operate on first-come-first-served queues or subjective human triage. When hundreds of simultaneous calls arrive during natural disasters or industrial accidents, lower-urgency incidents can preempt catastrophic life-threats. UYRA implements an automated, transparent, multi-attribute scoring model ($0 - 100$) that balances clinical severity, victim count, incident type, and wait-time aging.
3. **Fragmented Fleet Visibility & Manual Responder Selection:** Dispatchers often rely on radio check-ins or disjoint spreadsheets to determine which response vehicles are available, leading to suboptimal team assignments where distant units are deployed while nearby units sit idle.
4. **Dispatch Concurrency & Race Conditions:** In high-tempo command centers with multiple operators handling incoming queues, concurrent attempts to assign the same response team result in conflicting deployments and wasted minutes. UYRA utilizes PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) to guarantee zero duplicate team dispatch.
5. **Language & Accessibility Barriers:** In linguistically diverse nations like India, reporting emergencies in non-native languages introduces cognitive friction. UYRA natively supports English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), and Malayalam (മലയാളം), guaranteeing that distress reporting and administrative oversight remain accessible across native vernaculars.

---

## 🚀 Features Matrix

| # | Subsystem / Capability | Architectural Mechanism / Implemented Algorithm | Operational Output & Verification | Implementation Status |
|---|---|---|---|---|
| 1 | **High-Accuracy Citizen SOS** | HTML5 `navigator.geolocation` API with `enableHighAccuracy: true` and reverse geocoding fallback | Captures latitude, longitude, and accuracy radius ($< 15\text{ m}$) under HTTPS | **Implemented & Verified** |
| 2 | **Citizen Authentication & OTP** | Email OTP verification via Brevo transactional SMTP (`nodemailer`) + Google OAuth 2.0 | Cryptographic 6-digit verification code with 10-minute expiry and rate protection | **Implemented & Verified** |
| 3 | **Rule-Based Severity Engine** | Category base weights ($1-4$) + Victim brackets ($0-3$) + Critical keyword escalation | Computes `suggestedSeverity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with matched keywords | **Implemented & Verified** |
| 4 | **Deterministic Prioritization Engine** | Weighted multi-attribute score: $\text{Severity (40)} + \text{People (25)} + \text{Category (20)} + \text{Aging (15)}$ | Normalized $0-100$ score with automated wait-time aging ($+0.2\text{ pts/min}$, max $15$) | **Implemented & Verified** |
| 5 | **Priority Triage Queue** | Multi-key stable sorting: `priorityScore DESC` $\to$ `createdAt ASC` $\to$ `id ASC` | Dynamic priority ranking served via `GET /api/incidents/prioritized` | **Implemented & Verified** |
| 6 | **Fleet Management & CRUD** | `TeamsModule` with category compatibility, geospatial coordinates, and operational statuses | Full lifecycle management (`AVAILABLE`, `DISPATCHED`, `BUSY`, `OFF_DUTY`) | **Implemented & Verified** |
| 7 | **Geospatial Best-Fit Dispatch** | Haversine Great-Circle distance calculation ($R = 6371.0\text{ km}$) with category compatibility | Straight-line distance ranking (`categoryMatch` $\to$ `compatibilityScore` $\to$ `distanceKm`) | **Implemented & Verified** |
| 8 | **Atomic Concurrency Dispatch** | PostgreSQL transactional row locks (`SELECT ... FOR UPDATE`) on team and incident records | Strict prevention of duplicate assignments; rejects concurrent dispatches with `409 Conflict` | **Implemented & Verified** |
| 9 | **Decoupled Lifecycle State Machines** | Dual state transitions: Incident (`REPORTED` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED`) & Assignment (`ASSIGNED` $\to$ `EN_ROUTE` $\to$ `ON_SCENE` $\to$ `COMPLETED`) | Automatic team release back to `AVAILABLE` upon incident resolution | **Implemented & Verified** |
| 10 | **Real-Time WebSocket Gateway** | Socket.IO gateway (`@nestjs/websockets`) broadcasting operational telemetry | Instant updates (`incident:created`, `incident:assigned`, `team:status_changed`, etc.) | **Implemented & Verified** |
| 11 | **Executive Command Analytics** | Aggregated KPI calculation (`GET /api/dashboard/round2-stats`) via parallel Prisma queries | Fleet utilization, incident resolution rate, priority distribution, and stage funnels | **Implemented & Verified** |
| 12 | **Complete 6-Language Localization** | `i18next` + `react-i18next` covering User and Admin portals with Noto Sans typography | Native script rendering for English, Tamil, Hindi, Telugu, Kannada, and Malayalam | **Implemented & Verified** |

---

## 💻 Technology Stack

### Frontend Applications

| Component / Library | Version | Architecture Role | File Location / Context | Rationale & Selection Criteria |
|---|---|---|---|---|
| **React** | `^19.2.4` | View Layer | `user-frontend/`, `admin-frontend/` | Concurrent rendering performance, zero-boilerplate hooks architecture |
| **Vite** | `^8.0.8` | Build Tool & Dev Server | `vite.config.js` | Sub-second HMR, optimized production asset bundling |
| **@vitejs/plugin-basic-ssl** | `^2.3.0` | HTTPS Development SSL | `user-frontend/vite.config.js` | Mandatory for browser HTML5 Geolocation API permissions on localhost |
| **Socket.IO Client** | `^4.8.1` | Real-Time Telemetry | `App.jsx`, `uyra_admin.tsx` | Low-latency bi-directional WebSocket connection with automated reconnection |
| **Recharts** | `^2.15.1` | Dashboard Visualizations | `admin-frontend/src/uyra_admin.tsx` | Responsive SVG rendering for priority and fleet availability analytics |
| **Lucide React** | `^1.8.0` | Iconography | Both frontends | Consistent, accessible emergency domain iconography |
| **i18next & react-i18next** | `^27.1.0` / `^18.0.1` | Internationalization | `src/i18n/` | Multi-namespace translation caching, language detection, zero-flicker re-rendering |
| **@react-oauth/google** | `^0.13.5` | Google Identity Services | `user-frontend/src/CitizenAuthModal.tsx` | Fast, credentialed citizen sign-in via Google Identity Platform |

### Backend API Services

| Component / Library | Version | Architecture Role | File Location / Context | Rationale & Selection Criteria |
|---|---|---|---|---|
| **NestJS** | `^10.4.15` | Enterprise Framework | `backend/src/` | Modular TypeScript architecture, dependency injection, declarative validation |
| **TypeScript** | `^5.7.3` | Programming Language | Entire Backend | Strict type safety, interface contracts, zero runtime undefined reference defects |
| **Prisma ORM** | `^6.4.0` | Database Abstraction | `backend/prisma/` | Type-safe query building, connection pooling, programmatic schema migrations |
| **Socket.IO** | `^4.8.1` | WebSocket Gateway | `src/realtime/realtime.gateway.ts` | Multi-room broadcasting, cross-origin communication, client heartbeat management |
| **Passport & JWT** | `^0.7.0` / `^10.2.0` | Authentication & RBAC | `src/auth/jwt.strategy.ts` | Stateless cryptographically signed bearer tokens for administrator and user endpoints |
| **bcrypt** | `^5.1.1` | Password Hashing | `src/auth/auth.service.ts` | Salted 10-round key derivation function for secure credential storage |
| **class-validator** | `^0.14.1` | Payload Sanitization | `src/*/dto/*.dto.ts` | Declarative validation pipes blocking malformed payloads before controller execution |
| **nodemailer** | `^10.4.0` | Transactional Delivery | `src/auth/email.service.ts` | Reliable SMTP dispatch for citizen OTP generation via Brevo relay |

### Database & Infrastructure

| Technology | Provider / Environment | Role | Configuration / Rationale |
|---|---|---|---|
| **PostgreSQL 15+** | Supabase Managed Cloud | Relational Database | ACID transactional guarantees, row-level locking (`SELECT ... FOR UPDATE`), B-Tree indexing |
| **Docker / Node Engine** | macOS / Linux (Node v22) | Execution Runtime | High-throughput asynchronous I/O with V8 performance |
| **Google Maps API** | Google Cloud Platform | Spatial Mapping | Dynamic map canvas, marker clustering, team radius visualization |

---

## 📂 Project Directory Structure

```text
sos/
├── admin-frontend/                      # Emergency Operations & Command Center Portal
│   ├── index.html                       # HTML5 entry with Noto Sans Indic web fonts
│   ├── package.json                     # Vite 8 + React 19 + Recharts + Socket.IO dependencies
│   ├── vite.config.js                   # Dev server configured on port 5174
│   └── src/
│       ├── App.jsx                      # Root container managing authentication & active view state
│       ├── GoogleMapsCanvas.tsx         # Interactive Google Maps canvas with incident & team markers
│       ├── LanguageSelector.tsx         # Multi-language switcher with native font rendering
│       ├── index.css                    # Tailwind-inspired utility styling & Indic word-break rules
│       ├── main.jsx                     # React DOM bootstrap mounting i18n
│       ├── uyra_admin.tsx               # Master command dashboard (Triage Queue, Dispatch, Analytics)
│       ├── uyra_shared.tsx              # Shared enums, types, and localized label formatting helpers
│       └── i18n/
│           ├── index.ts                 # i18next configuration & language change listeners
│           ├── languages.ts             # Supported language manifests (en, ta, hi, te, kn, ml)
│           └── locales.ts               # Translation dictionaries for administrative namespaces
├── backend/                             # NestJS High-Performance Core API
│   ├── nest-cli.json                    # NestJS CLI configuration
│   ├── package.json                     # NestJS 10, Prisma 6, Socket.IO, Nodemailer, JWT
│   ├── prisma/
│   │   ├── schema.prisma                # Relational schema (Admin, User, Team, Incident, Assignment)
│   │   ├── seed.ts                      # Idempotent seed script initializing admin & response teams
│   │   └── clear-staging.ts             # Maintenance utility to purge transient demo records
│   └── src/
│       ├── app.module.ts                # Root application module registering feature dependencies
│       ├── main.ts                      # App bootstrap with CORS, Global Validation Pipes & Logging
│       ├── auth/                        # Authentication & Access Control Subsystem
│       │   ├── auth.controller.ts       # Endpoints: /register, /login, /verify-otp, /google, /admin/login
│       │   ├── auth.service.ts          # Salted hashing, JWT generation, OTP issuance logic
│       │   ├── email.service.ts         # SMTP transport via Brevo
│       │   ├── jwt.strategy.ts          # Passport JWT extraction and validation
│       │   ├── jwt-auth.guard.ts        # Route guard protecting administrative mutations
│       │   └── dto/                     # Auth payload DTOs with validation rules
│       ├── dashboard/                   # Executive Analytics Subsystem
│       │   ├── dashboard.controller.ts  # Endpoints: GET /api/dashboard/stats, /round2-stats
│       │   ├── dashboard.module.ts      # Dashboard dependency container
│       │   └── dashboard.service.ts     # Aggregated KPI computations & fleet utilization trends
│       ├── incidents/                   # Core Incident & Dispatch Management Subsystem
│       │   ├── geo-dispatch.utils.ts    # Haversine distance algorithm & coordinate range validation
│       │   ├── incidents.controller.ts  # Endpoints: /prioritized, /recommended-teams, /assign, /status
│       │   ├── incidents.module.ts      # Incidents dependency container
│       │   ├── incidents.service.ts     # Triage queue, atomic dispatch transactions & lifecycles
│       │   └── dto/                     # Incident creation, dispatch, and status transition DTOs
│       ├── prisma/                      # Database Layer
│       │   ├── prisma.module.ts         # Global Prisma provider registration
│       │   └── prisma.service.ts        # Prisma client lifecycle management
│       ├── realtime/                    # Bi-Directional Event Gateway
│       │   ├── realtime.gateway.ts      # Socket.IO WebSocket gateway broadcasting telemetry
│       │   └── realtime.module.ts       # Global WebSocket module
│       ├── severity/                    # Rule-Based Severity & Priority Scoring
│       │   ├── priority.service.ts      # 4-factor deterministic priority scoring algorithm
│       │   ├── severity.module.ts       # Severity dependency container
│       │   └── severity.service.ts      # Base category, victim bracket & critical keyword rules
│       └── teams/                       # Response Fleet Subsystem
│           ├── teams.controller.ts      # Endpoints: CRUD /api/teams, PATCH /api/teams/:id/status
│           ├── teams.module.ts          # Teams dependency container
│           ├── teams.service.ts         # Fleet registry, availability updates & deletion protection
│           └── dto/                     # Team creation and availability modification DTOs
├── user-frontend/                       # Public Citizen Emergency Reporting Portal
│   ├── index.html                       # HTML5 entry with mobile responsive viewport
│   ├── package.json                     # React 19 + Basic SSL + Google OAuth dependencies
│   ├── vite.config.js                   # Dev server on port 5173 with basicSsl() and API proxy
│   └── src/
│       ├── App.jsx                      # Main public application orchestrating the reporting workflow
│       ├── CitizenAuthModal.tsx         # Citizen sign-up, sign-in, and Brevo OTP modal dialog
│       ├── LanguageSelector.tsx         # Vernacular selector with native language rendering
│       ├── index.css                    # Emergency UI theme styles & button pulse animations
│       ├── main.jsx                     # Public portal bootstrap
│       └── i18n/                        # 6-Language localization dictionaries for citizens
├── test_concurrency_assignment.py       # Multi-threaded concurrent dispatch race test suite
├── test_full_competition_readiness.py   # Comprehensive 13/13 integration test suite
├── test_full_multilingual_audit.py      # Automated 6-language key parity & fallback audit script
└── test_phase3_dispatch_suite.py        # Geospatial distance & dispatch lifecycle test suite
```

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js**: `v20.0.0` or higher (verified on `v22.10.7`)
- **npm**: `v10.0.0` or higher
- **PostgreSQL**: Supabase PostgreSQL database instance or local PostgreSQL `15+`
- **Modern Web Browser**: Chrome / Safari / Firefox with Geolocation permissions enabled

---

### Step 1: Environment Configuration

Navigate to each application directory and configure the environment variables:

#### Backend Configuration (`sos/backend/.env`)
```bash
# ==============================================================================
# UYRA – Public Emergency Response Platform Backend Environment Configuration
# ==============================================================================

PORT=4000
NODE_ENV=development

# Supabase PostgreSQL Database Connection
# Port 6543 (Transaction Pooler with pgbouncer) & Port 5432 (Direct Connection)
DATABASE_URL="postgresql://postgres.kporbqrkkagevauezbwr:Ura%402026%4026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5"
DIRECT_URL="postgresql://postgres.kporbqrkkagevauezbwr:Ura%402026%4026@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"

# JWT Authentication Secret & Lifespan
JWT_SECRET="uyra_super_secret_jwt_emergency_key_2026_every_second_counts"
JWT_EXPIRATION="24h"

# CORS & Allowed Frontend Origins (User Portal & Separate Admin Portal)
FRONTEND_URL="http://localhost:5173"
ADMIN_URL="http://localhost:5174"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174"

# Brevo (Sendinblue) Transactional Email & OTP Configuration
BREVO_API_KEY="xkeysib-your_brevo_api_key_here"
BREVO_SENDER_EMAIL="rahulramesharani@gmail.com"
BREVO_SENDER_NAME="UYRA Emergency Platform"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your_google_client_secret_here"
```

#### User Frontend Configuration (`sos/user-frontend/.env`)
```bash
VITE_API_BASE_URL="/api"
VITE_SOCKET_URL=""
VITE_ADMIN_PORTAL_URL="http://192.168.0.60:5174"
VITE_GOOGLE_MAPS_API_KEY="AIzaSyCBVGSbpNcMpXcszsZbBmH7A1d-om1M0rU"
VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
```

#### Admin Frontend Configuration (`sos/admin-frontend/.env`)
```bash
VITE_API_BASE_URL="http://192.168.0.60:4000/api"
VITE_SOCKET_URL="http://192.168.0.60:4000"
VITE_PUBLIC_PORTAL_URL="http://192.168.0.60:5173"
VITE_GOOGLE_MAPS_API_KEY="AIzaSyCBVGSbpNcMpXcszsZbBmH7A1d-om1M0rU"
```bash
# Backend REST & WebSocket URL
VITE_API_URL="http://localhost:4000"
VITE_SOCKET_URL="http://localhost:4000"

# Google Maps JavaScript API Key (For Live GPS Incident & Fleet Canvas)
VITE_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

---

### Step 2: Database Initialization & Migrations

```bash
cd sos/backend

# Install backend dependencies
npm install

# Push schema directly to database
npx prisma db push

# Generate Prisma Client bindings
npx prisma generate

# Seed baseline administrator account and sample emergency response units
npx ts-node prisma/seed.ts
```

*Default Seeded Administrator Credentials:*
- **Email:** `admin@uyra.gov.in`
- **Password:** `Admin@12345`

---

### Step 3: Starting the Applications

Open three independent terminal sessions:

#### Terminal 1: NestJS Backend Service
```bash
cd sos/backend
npm run start:dev
# Running on http://localhost:4000
```

#### Terminal 2: Public Citizen SOS Portal
```bash
cd sos/user-frontend
npm run dev
# Running on https://localhost:5173 (HTTPS required for browser Geolocation)
```

#### Terminal 3: Administrator Command Center
```bash
cd sos/admin-frontend
npm run dev
# Running on http://localhost:5174
```

---

### Step 4: Verification Endpoints

Verify system readiness by testing the health endpoints:
```bash
# Backend Health Check
curl -s http://localhost:4000/health
# Response: {"status":"ok","timestamp":"...","uptime":...}

# Prioritized Incident Triage Queue
curl -s http://localhost:4000/api/incidents/prioritized | jq '.[0]'

# Round 2 Advanced Operations Analytics
curl -s http://localhost:4000/api/dashboard/round2-stats | jq '.kpi'
```

---

## ⚙️ How It Works (End-to-End Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as 👤 Citizen / Reporter
    participant UserUI as 📱 User Portal (HTTPS)
    participant Backend as ⚙️ NestJS API Engine
    participant DB as 🗄️ PostgreSQL (Supabase)
    participant Gateway as ⚡ Socket.IO Gateway
    actor Admin as 👨‍✈️ Dispatch Commander
    participant AdminUI as 🖥️ Admin Command Center

    Citizen->>UserUI: 1. Tap Emergency Category & Trigger SOS
    UserUI->>UserUI: 2. Acquire HTML5 GPS (lat, lon, accuracy)
    UserUI->>Backend: 3. POST /api/incidents (Payload + Coordinates)
    Backend->>Backend: 4. SeverityService: Rule evaluation & Keyword check
    Backend->>Backend: 5. PriorityService: 4-Factor deterministic calculation
    Backend->>DB: 6. Insert Incident record (Status: REPORTED)
    Backend->>Gateway: 7. Emit incident:created
    Gateway-->>AdminUI: 8. Real-time Incident Alert Stream
    AdminUI->>Backend: 9. GET /api/incidents/:id/recommended-teams
    Backend->>Backend: 10. Compute Haversine distance to available teams
    Backend-->>AdminUI: 11. Return best-fit ranked teams
    Admin->>AdminUI: 12. Confirm Dispatch Action
    AdminUI->>Backend: 13. POST /api/incidents/:id/assign (Pessimistic Row Lock)
    Backend->>DB: 14. BEGIN Tx: SELECT ... FOR UPDATE -> Team DISPATCHED
    Backend->>Gateway: 15. Emit incident:assigned & team:status_changed
    Gateway-->>AdminUI: 16. Map markers update & active tracking begins
    AdminUI->>Backend: 17. PATCH /api/incidents/:id/status (RESOLVED)
    Backend->>DB: 18. Update Incident -> Complete Assignments -> Release Team
    Backend->>Gateway: 19. Emit assignment:completed & dashboard:stats_updated
```

### Stage 1: Citizen Emergency Reporting & Telemetry
A citizen accesses `https://localhost:5173`. Upon selecting an emergency category (e.g., *Road Accident*, *Fire*, *Building Collapse*), the client queries `navigator.geolocation.getCurrentPosition`. The captured high-precision GPS coordinates, estimated accuracy radius, affected victim bracket, and descriptive notes are transmitted via `POST /api/incidents`.

### Stage 2: Automated Severity & Critical Keyword Escalation
In `SeverityService`, the incident is evaluated against rule-based criteria:
- **Category Weights:** `BUILDING_COLLAPSE` (4), `FIRE` (3), `MEDICAL` (3), `ROAD_ACCIDENT` (2), `FLOOD` (2), `OTHER` (1).
- **People Brackets:** `1` (0), `2-5` (1), `6-10` (2), `10+` (3).
- **Critical Keyword Escalation:** If the description contains critical strings (e.g., *trapped*, *unconscious*, *explosion*, *fatal*, *infant*), severity is automatically escalated to `CRITICAL`.

### Stage 3: The 4-Factor Deterministic Priority Algorithm
Unlike subjective triage, UYRA uses a deterministic mathematical function in `PriorityService` producing a score $P \in [0, 100]$:

$$P = S_{\text{sev}} + P_{\text{peo}} + C_{\text{cat}} + A_{\text{age}}$$

#### Mathematical Scoring Breakdown:
1. **Severity Component ($S_{\text{sev}} \in [0, 40]$):**
   - $\text{CRITICAL} \implies 40$
   - $\text{HIGH} \implies 28$
   - $\text{MEDIUM} \implies 16$
   - $\text{LOW} \implies 6$

2. **People Affected Component ($P_{\text{peo}} \in [0, 25]$):**
   - $\text{Count} > 10 \text{ or bracket } 10+ \implies 25$
   - $\text{Count} \in [6, 10] \text{ or bracket } 6-10 \implies 18$
   - $\text{Count} \in [2, 5] \text{ or bracket } 2-5 \implies 10$
   - $\text{Count} = 1 \implies 3$

3. **Emergency Category Component ($C_{\text{cat}} \in [0, 20]$):**
   - $\text{BUILDING\_COLLAPSE} \implies 20$
   - $\text{FIRE} \implies 17$
   - $\text{MEDICAL} \implies 17$
   - $\text{FLOOD} \implies 13$
   - $\text{ROAD\_ACCIDENT} \implies 13$
   - $\text{OTHER} \implies 7$

4. **Wait-Time Aging Component ($A_{\text{age}} \in [0, 15]$):**
   To prevent indefinite neglect of lower-severity incidents:
   $$A_{\text{age}} = \min\left(15, \; \lfloor t_{\text{wait}} \rfloor \times 0.2\right)$$
   *(Adds $+1.0$ point every 5 minutes elapsed, capping at 15 points after 75 minutes).*

#### Priority Level Mapping:
- $P \ge 75 \lor \text{Severity} = \text{CRITICAL} \implies \mathbf{CRITICAL}$
- $55 \le P < 75 \implies \mathbf{HIGH}$
- $35 \le P < 55 \implies \mathbf{MEDIUM}$
- $P < 35 \implies \mathbf{LOW}$

### Stage 4: Dynamic Priority Triage Queue
The administrative command center polls and streams `GET /api/incidents/prioritized`. Active incidents are sorted using a multi-key deterministic comparator:
```typescript
sortedIncidents.sort((a, b) => {
  if (b.priorityScore !== a.priorityScore) {
    return b.priorityScore - a.priorityScore; // Highest priority score first
  }
  const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (timeDiff !== 0) {
    return timeDiff; // Older waiting incidents first
  }
  return a.id.localeCompare(b.id); // Strict tie-breaker
});
```

### Stage 5: Geospatial Dispatch & Haversine Distance
When an incident is selected for dispatch, `GET /api/incidents/:id/recommended-teams` filters registered response teams with `status = AVAILABLE` and calculates the straight-line great-circle distance using the **Haversine Formula**:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \; \sqrt{1 - a}\right)$$

$$d = R \cdot c \quad (R = 6371.0\text{ km})$$

Where $\phi$ is latitude in radians and $\lambda$ is longitude in radians.

#### Recommendation Ranking Hierarchy:
1. **Exact Category Match:** Units whose trained capability equals incident category (e.g. Fire Unit for Fire).
2. **Category Compatibility Score:** Fallback domain suitability (e.g. Medical for Road Accident = $0.9$; Fire for Collapse = $0.8$).
3. **Haversine Distance:** Proximity in kilometers ($d$).
4. **Alphabetical Tie-Breaker:** By team name.

### Stage 6: Atomic Dispatch & Row Lock Protection
To eliminate race conditions when multiple operators attempt to deploy the same vehicle simultaneously, `assignTeam()` wraps the dispatch operation in a PostgreSQL transaction:
```sql
SELECT * FROM response_teams WHERE id = $1 FOR UPDATE;
SELECT * FROM incidents WHERE id = $2 FOR UPDATE;
```
If another transaction currently holds the lock or if `team.status !== AVAILABLE`, a `409 ConflictException` is returned, preventing double dispatch.

### Stage 7: Decoupled State Machine & Automated Release
UYRA decouples incident states from responder assignment states:
- **Incident Lifecycle:** $\text{REPORTED} \to \text{ASSIGNED} \to \text{IN\_PROGRESS} \to \text{RESOLVED}$ (or $\text{CANCELLED}$).
- **Assignment Lifecycle:** $\text{ASSIGNED} \to \text{EN\_ROUTE} \to \text{ON\_SCENE} \to \text{COMPLETED}$ (or $\text{CANCELLED}$).
- **Automated Fleet Release:** When an incident transitions to `RESOLVED`, all active assignments are finalized to `COMPLETED`, and the associated response team's status is automatically restored to `AVAILABLE`.

### Stage 8: Real-Time Operational Telemetry
All status transitions emit WebSocket events via `RealtimeGateway`:
- `incident:created` $\to$ Injects new emergency into dispatcher queue.
- `incident:assigned` $\to$ Locks assigned unit and updates dispatch maps.
- `team:status_changed` $\to$ Re-renders fleet availability indicators.
- `dashboard:stats_updated` $\to$ Updates KPI analytics panels across connected sessions.

---

## 🏛️ Scalability & System Architecture

```text
                           ┌──────────────────────────────────────────────┐
                           │               CLIENT APPLICATION LAYER       │
                           │                                              │
                           │   📱 User Portal (5173)   🖥️ Admin Ops (5174)│
                           │   (React 19 + Geolocation)  (Maps + Recharts) │
                           └───────────────▲──────────────────────▲───────┘
                                           │ HTTPS                │ HTTP / WS
                                           ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              UYRA BACKEND REST & WS ENGINE                             │
│                                                                                        │
│   ┌────────────────────┐   ┌─────────────────────┐   ┌─────────────────────────────┐   │
│   │    AuthModule      │   │   SeverityModule    │   │      IncidentsModule        │   │
│   │ - JWT Strategy     │   │ - Severity Rules    │   │ - Deterministic Triage      │   │
│   │ - Brevo OTP SMTP   │   │ - 4-Factor Priority │   │ - Haversine Distance Engine │   │
│   │ - Google OAuth 2.0 │   │ - Aging Escalation  │   │ - Atomic Pessimistic Locks  │   │
│   └────────────────────┘   └─────────────────────┘   └─────────────────────────────┘   │
│              │                        │                             │                  │
│              ▼                        ▼                             ▼                  │
│   ┌────────────────────┐   ┌─────────────────────┐   ┌─────────────────────────────┐   │
│   │   RealtimeModule   │   │     TeamsModule     │   │       DashboardModule       │   │
│   │ - Socket.IO Server │   │ - Fleet Availability│   │ - Round 2 Advanced Metrics  │   │
│   │ - Event Broadcasts │   │ - Category Matrix   │   │ - Utilization & Stage Trends│   │
│   └────────────────────┘   └─────────────────────┘   └─────────────────────────────┘   │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Prisma v6 Connection Pool
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PERSISTENCE & STORAGE LAYER                               │
│                                                                                        │
│                          🗄️ PostgreSQL 15+ (Supabase Managed)                         │
│   - Pessimistic Row Locking (`SELECT ... FOR UPDATE`)                                 │
│   - B-Tree Multi-Column Indexes (`status`, `priorityScore`, `category`, `createdAt`)    │
│   - Relational Referential Integrity (Cascading history, Restrictive team deletion)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Scalability Strategies:
- **Stateless Application Nodes:** The NestJS API engine maintains zero in-memory session state; all authentication relies on cryptographically verified JWT tokens, permitting horizontal scaling behind an NGINX or AWS ALB load balancer.
- **WebSocket Scaling:** For distributed multi-node deployments, the Socket.IO gateway supports the `@socket.io/redis-adapter`, allowing real-time event distribution across multiple server instances.
- **Database Indexing Optimization:** High-frequency query columns (`status`, `priorityScore`, `category`, `createdAt`) are explicitly indexed in the PostgreSQL schema to prevent full table scans during triage queue evaluation.

---

## 📈 Feasibility Analysis

| Dimension | Prototype Feasibility | Enterprise Production Feasibility |
|---|---|---|
| **Deployment Simplicity** | Monorepo structure with automated npm scripts and environment templates | Containerized micro-services deployable via Docker and Kubernetes |
| **Geospatial Processing** | Client-side HTML5 Geolocation + in-memory Haversine formula | PostGIS spatial indexing with real-time routing engines (OSRM / OpenRouteService) |
| **Operational Hardware** | Runs completely on a single standard workstation (macOS / Linux, 8 GB RAM) | Cloud-native multi-AZ configuration handling thousands of concurrent reports |
| **Network Footprint** | Lightweight JSON REST payloads ($< 2\text{ KB}$) and compressed WebSocket packets | Minimal bandwidth consumption suitable for cellular 3G / 4G emergency conditions |
| **Cost Profile** | Open-source runtime stack utilizing free-tier Supabase and Brevo tiers | Predictable, linear database compute scaling based on metropolitan incident volume |

---

## 💡 Novelty & Comparative Analysis

| Feature Capability | Traditional Emergency Dispatch (Manual / CAD) | Generic SOS Applications | UYRA Emergency Response Platform |
|---|---|---|---|
| **Prioritization Method** | Subjective dispatcher triage; vulnerable to caller emotion and queue bias | Static FIFO (First In, First Out) ordering | **Deterministic 4-Factor Scoring** (Severity, Victims, Category, Aging) |
| **Neglect Prevention** | Manual review of pending call logs | None; unresolved calls remain static | **Automated Dynamic Aging** ($+0.2\text{ pts/min}$, max 15 pts) |
| **Team Recommendation** | Radio voice coordination or manual map browsing | Nearest distance only without capability filtering | **Haversine Distance + Domain Compatibility Matrix** |
| **Concurrent Dispatch** | High risk of double dispatch under multiple dispatchers | No concurrency controls; single-user assumptions | **PostgreSQL Pessimistic Row Locks** (`SELECT ... FOR UPDATE`) |
| **Lifecycle Integration** | Fragmented between incident logs and field radio status | Simple open/closed binary status | **Decoupled Incident & Assignment Dual State Machines** |
| **Multilingual Support** | Single language or operator-dependent translation | Limited to browser auto-translate | **6 Native Indic Languages** with typographic styling |

---

## 🔬 Feature Depth & Edge-Case Engineering

### 1. Concurrency Protection & Duplicate Prevention
In emergency operations, two operators might simultaneously click "Dispatch" on the last available ambulance. UYRA solves this at the database engine level. In `incidents.service.ts`, `assignTeam()` executes:
```typescript
const lockedTeams: any[] = await tx.$queryRaw`
  SELECT * FROM response_teams WHERE id = ${dto.teamId} FOR UPDATE
`;
```
This forces concurrent database transactions to wait in a serialized queue. The first transaction updates the team's status to `DISPATCHED`; the second transaction then wakes up, evaluates `team.status !== AVAILABLE`, and immediately aborts with a `409 ConflictException`, guaranteeing that no response unit is ever double-booked.

### 2. Geographic Coordinate Boundary Validation
To prevent crashes resulting from invalid GPS inputs or corrupted simulator data, `geo-dispatch.utils.ts` enforces strict boundary checks:
```typescript
if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 || 
    lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
  return NaN;
}
```
If an incident lacks valid coordinates, the recommendation engine gracefully degrades by sorting teams purely on category compatibility and team name, preventing dispatch gridlock.

### 3. Deletion Protection with Historical Integrity
In `TeamsService`, attempting to delete a response unit that has participated in historical assignments is strictly prevented:
```typescript
const assignmentCount = await this.prisma.teamAssignment.count({ where: { teamId: id } });
if (assignmentCount > 0) {
  throw new BadRequestException('Cannot delete response team with existing assignment history.');
}
```
This preserves legal audit logs and post-incident investigation records.

### 4. Automatic Team De-Allocation on Incident Closure
When an administrator resolves an incident via `PATCH /api/incidents/:id/status`, the platform automatically inspects all active assignments linked to that incident, transitions their status to `COMPLETED`, and sets the team status back to `AVAILABLE`, ensuring that units become instantly eligible for subsequent emergency dispatches without manual dispatcher intervention.

---

## 🔐 Security and Privacy

- **Stateless JWT Authentication:** Administrative operations (`/api/incidents/:id/assign`, `/api/teams/*`) require a cryptographically signed Bearer JWT token validated by `@UseGuards(JwtAuthGuard)`.
- **Argon2 / Salted bcrypt Credential Storage:** Administrator and citizen passwords are encrypted with bcrypt using 10 salt rounds; plaintext credentials are never written to disk or logs.
- **Cryptographic OTP Verification:** Citizen phone/email verification utilizes single-use, 6-digit numeric codes generated with a strict 10-minute time-to-live (`expiresAt`) and immediate invalidation (`consumed = true`) upon consumption.
- **Input Sanitization & Declarative DTOs:** All API entrypoints utilize NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`, rejecting unauthorized payload properties and neutralizing injection vulnerabilities.
- **Pessimistic Data Isolation:** Database mutations operate within atomic transactions (`prisma.$transaction`) to maintain referential integrity.
- **Privacy & Operational Disclaimer:** UYRA's rule-based priority score is an operational scheduling tool and does not constitute certified clinical triage. Citizens in immediate life-threatening distress are instructed to dial official national emergency numbers (e.g., 112 / 108).

---

## 🧪 Testing & Verification

The platform has been rigorously validated across four dedicated automated test suites, confirming zero functional defects across all Round 2 phases:

| Test Suite Script | Target Subsystem & Capabilities Verified | Verified Test Result |
|---|---|---|
| `test_full_competition_readiness.py` | Full end-to-end integration: Admin JWT auth $\to$ Citizen OTP registration $\to$ SOS submission $\to$ Deterministic priority scoring $\to$ Triage queue $\to$ Team commissioning $\to$ Geospatial dispatch $\to$ Unauthenticated guard blocking $\to$ Dual lifecycle progression $\to$ Automated fleet release $\to$ Round 2 operational analytics | **13 / 13 Core Tests Passed (100% Success)** |
| `test_concurrency_assignment.py` | Multi-threaded race condition test: Dispatches two concurrent HTTP requests attempting to assign the same response team simultaneously | **Verified (1 Dispatched, 1 Rejected with 409 Conflict)** |
| `test_phase3_dispatch_suite.py` | Geospatial distance calculation accuracy, category recommendation matrix, atomic status transitions, and automated team release | **Passed (100% Success)** |
| `test_full_multilingual_audit.py` | Complete translation key audit across all 6 languages (`en`, `ta`, `hi`, `te`, `kn`, `ml`), dynamic enum label preservation, and Noto Sans typography rules | **Passed (Zero Missing Translation Keys)** |

### Production Build Verification

All three independent applications build cleanly with zero compilation errors:
- **Backend:** `nest build` $\to$ `dist/src/main.js` (Compiled with TypeScript 5.7.3)
- **Admin Frontend:** `vite build` $\to$ `dist/` (Built with Vite 8.0.8, zero bundle warnings)
- **User Frontend:** `vite build` $\to$ `dist/` (Built with Vite 8.0.8, zero bundle warnings)

---

## ⚠️ Limitations & Operational Disclaimer

1. **Straight-Line vs. Real-World Road Routing:** The current geospatial dispatch engine calculates distances using the Haversine great-circle formula. While computationally instantaneous and robust against external network outages, it represents straight-line distance rather than actual vehicular road routes, bridge closures, or traffic congestion.
2. **Device GPS Accuracy:** Browser HTML5 Geolocation accuracy depends on client hardware, satellite line-of-sight, and cellular triangulation. Accuracy radii can vary between 5 meters and several hundred meters in dense urban or indoor environments.
3. **External Service Dependability:** Citizen OTP delivery via SMTP and map tile rendering depend on third-party service availability (Brevo and Google Maps Platform).
4. **Operational Scope:** UYRA is an academic and competitive engineering prototype. It is not currently certified as a primary public safety answering point (PSAP) under ISO 22320 or NFPA 1221 emergency dispatch standards.

### Roadmap & Future Enhancements
- **Isochrone-Based Travel Time (ETA) Dispatch:** Integrating Open Source Routing Machine (OSRM) or OpenRouteService for real-time traffic-aware road distance calculations.
- **Offline Mesh SOS Forwarding:** Progressive Web App (PWA) background synchronization for queuing emergency reports in intermittent connectivity areas.
- **AI Voice-to-Text Vernacular Distress Ingestion:** Utilizing Whisper-based speech models for automated transcription of citizen distress calls into the priority queue.

---

## 📜 License

No formal license has been specified yet for this competition prototype. All intellectual property and source code rights are reserved by the UYRA Engineering Team.

---

## 👨‍💻 Project Credits

- **Engineering & Architecture:** UYRA Full-Stack Engineering Team
- **Backend Architecture & Priority Engine:** NestJS + Prisma + PostgreSQL
- **Frontend & Localization:** React 19 + Vite + i18next Multi-Language Core
- **Real-Time Infrastructure:** Socket.IO WebSocket Gateway

---

*UYRA — Every Life. Every Second.*
