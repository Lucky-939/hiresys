# HireSys – AI-Powered Collaborative Hiring & Technical Interview Platform

HireSys is an enterprise-grade, end-to-end technical interview and applicant tracking platform. It unifies live collaborative coding rooms (with multi-language compilation sandboxes), real-time WebSockets synchronization, AI-powered LeetCode algorithmic question generation, automated resume matching, and actionable post-interview candidate evaluation reports.

---

## 📚 Essential Guides & Documentation

- 🚀 **[Complete End-to-End Flow Guide](HIRESYS_COMPLETE_FLOW_GUIDE.md)**: Full walkthrough of every role (Owner, Recruiter/Admin, Interviewer, Candidate), job stages, real-world candidate journey, and technical room workflows.
- 🎯 **[Interview Cheatsheet & Technical Deep Dive](HIRESYS_INTERVIEW_CHEATSHEET.md)**: 30-second pitch, 90-second technical architecture, deep-dive Q&A (WebSockets, BullMQ/Redis, PostgreSQL/Prisma, Gemini AI, multi-tenancy IDOR defense), and system design solutions.
- 🚢 **[Deployment Architecture](DEPLOYMENT.md)**: Production deployment instructions for Vercel, Render, Supabase, and Upstash.

---

## 🌟 Key Features

- **Live Collaborative Coding Rooms**: Real-time multi-tab synchronized code editor powered by Monaco Editor and Socket.io with syntax highlighting, custom test case runners, and real-time cursor/selection tracking.
- **Sandboxed Code Execution**: Instant multi-language execution (JavaScript, TypeScript, Python, Java, C++, Go) with memory and execution timeouts via Piston.
- **AI LeetCode Problem Copilot**: Instant generator for algorithmic coding challenges (two-sum, graph BFS/DFS, sliding window, dynamic programming) complete with starter boilerplate, hidden test cases, and difficulty tuning (Easy/Medium/Hard).
- **One-Click Problem Sync**: Recruiters can broadcast selected coding challenges directly into the candidate's editor in real-time.
- **AI Resume Matcher & Scorecard**: Background processing queue (BullMQ + Redis) that parses candidate resumes against job descriptions, returning match percentages, keyword matches, and strengths/weaknesses.
- **Automated Post-Interview Reports**: Generates structured AI evaluations synthesizing code quality, problem-solving approach, time complexity, and behavioral rubrics.
- **Applicant Tracking System (ATS)**: Dynamic drag-and-drop Kanban pipeline from Screening to Technical Round to Offer/Reject.
- **Enterprise Multi-Tenancy & RBAC**: Strict tenant isolation across Organizations, with role-based policies for `OWNER`, `ADMIN`, and `MEMBER`.
- **Security Hardening**: JWT revocation blocklist via Redis, OTP rate-limiting, HTML entity encoding against template injection, and strict cross-tenant IDOR validation.

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Lucide Icons, Glassmorphism UI tokens
- **State & Sync**: Zustand, Socket.io Client
- **Editor**: Monaco Editor (`@monaco-editor/react`)

### Backend & Services
- **Runtime & API**: Node.js, Express 5, TypeScript
- **ORM & Database**: Prisma ORM, PostgreSQL
- **Async Queue & Cache**: Redis, BullMQ
- **Real-Time Engine**: Socket.io (WebSocket with HTTP long-polling fallback)
- **AI Engine**: Google Gemini API (`@google/genai` / `@google/generative-ai`)
- **Code Execution**: Piston Sandbox Engine

---

## 🚀 Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis
- (Optional) Docker & Docker Compose

### Quickstart

1. **Clone the repository**
   ```bash
   git clone https://github.com/Lucky-939/hiresys.git
   cd hiresys
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd apps/web && npm install
   cd ../server && npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env` in the root and configure your values.
   Ensure `apps/server/.env` and `apps/web/.env.local` have the correct settings.

4. **Database Setup**
   ```bash
   cd apps/server
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Servers**
   In `apps/server`:
   ```bash
   npm run dev
   ```
   In `apps/web`:
   ```bash
   npm run dev
   ```

## Docker Setup

To run the entire stack locally using Docker Compose without installing PostgreSQL and Redis natively:

1. Setup your `.env` file at the root.
2. Run the following command:
   ```bash
   docker compose up --build
   ```
3. The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:5000`.

## Environment Variables

**Backend (`apps/server/.env` / Root `.env`)**:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT signing
- `GEMINI_API_KEY`: API Key for Google Gemini
- `CLIENT_URL`: URL of the frontend (e.g., `http://localhost:3000`)
- `NODE_ENV`: `development` or `production`

**Frontend (`apps/web/.env.local`)**:
- `NEXT_PUBLIC_API_URL`: Backend API URL (e.g., `http://localhost:5000/api`)

## Deployment Instructions

Please refer to [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying the frontend to Vercel, the backend to Render, the database to Supabase, and Redis to Upstash.


## Security Architecture & Known Limitations

HireSys implements comprehensive role-based access control (RBAC), multi-tenant isolation, WebSocket authentication and rate limiting, and output encoding:

- **Cross-Tenant & IDOR Protection**: All database queries and operations verify organizational membership and role authority. Stage reordering, candidate access, interview operations, and resume analysis strictly enforce tenant boundary constraints.
- **Privilege Separation (SEC-02)**: The `OWNER` role cannot be assigned, transferred, or granted through member updates or invites.
- **WebSocket Security (SEC-09 & SEC-10)**: Handshake authorization validates JWT signatures and checks the Redis token revocation blocklist (`bl_*`). Code execution via Piston is rate limited to 5 runs/min per user per room.
- **Email Injection Hardening (SEC-05)**: All dynamic template variables are sanitized through HTML entity encoding before rendering.
- **OTP Brute-Force Defense (SEC-06)**: Verification OTP attempts are capped at 5 per code in Redis; upon the 5th failed attempt, the code is immediately invalidated.

### Known Limitations

1. **Client-Side JWT Storage in `localStorage` (SEC-11)**:
   - *Current State*: The web frontend stores the authentication JWT in `localStorage` for cross-tab session sharing.
   - *Rationale & Risk*: In the presence of an arbitrary JavaScript execution vulnerability (XSS), `localStorage` tokens can be extracted. Mitigations include strict output escaping, HTTP header security via Helmet, and instant revocation via Redis blocklisting on logout.
   - *Roadmap*: Future enterprise hardening plans include migrating to `httpOnly`, `SameSite=Strict`, `Secure` session cookies with rotating refresh tokens and CSRF protection.

2. **Upstream Dependency Advisories (SEC-07)**:
   - Several flagged dependencies (`deepmerge-ts` in `@prisma/config`, `pdfjs-dist`, `next`) require major version upgrades with breaking API changes (e.g., Prisma 7/8, Next.js 15+). These will be upgraded alongside targeted framework migration testing.
