# HireSys — Complete Real-World Flow & System Architecture Guide

> **Permanent Reference Guide**: This document details the entire end-to-end recruitment lifecycle of HireSys, explaining every feature, underlying technical architecture, and real-world workflows across all roles (**Owner**, **Recruiter**, **Interviewer**, and **Candidate**).

---

## 1. System Overview & Role Matrix

HireSys is a modern, AI-powered technical hiring platform that connects candidate sourcing, AI resume intelligence, pipeline management, collaborative live coding interviews, and automated evaluation reports into a cohesive workflow.

### User Roles & Permissions Matrix

| Feature / Action | Owner | Admin | Recruiter | Interviewer | Candidate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Organization & Billing Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Team Member Management & Roles** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Pipeline Stages Configuration** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create & Manage Job Postings** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View & Filter Candidates** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **AI Resume Intelligence & PDF Viewer** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Move Candidates Across Stages** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Interview Copilot (Question Generator)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Schedule Technical Interviews** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Generate Candidate Direct Access Links** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Conduct Live Coding Room Session** | ✅ | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| **Execute Code via Piston Engine** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **In-Room AI Code Review & Feedback** | ✅ | ✅ | ✅ | ✅ | ❌ *(Hidden)* |
| **Interviewer Notes & Scorecard Submission** | ✅ | ✅ | ✅ | ✅ | ❌ *(Hidden)* |
| **Generate Post-Interview AI Report** | ✅ | ✅ | ✅ | ✅ | ❌ *(Hidden)* |
| **Final Hiring Decision & Outcome Email** | ✅ | ✅ | ✅ | ❌ | ❌ *(Recipient)*|

---

## 2. End-to-End Real-World Flow (Phase-by-Phase)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HIRESYS LIFECYCLE                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘

  [Phase 1: Setup]          [Phase 2: Sourcing]              [Phase 3: Screening]
  Organization & Stages ───► Job Posting & Career Portal ───► Candidate Resume Analysis
                                                                    │
  [Phase 6: Live Room]      [Phase 5: Scheduling]            [Phase 4: Pipeline]
  Real-time Coding Room ◄─── Interview Copilot & Link ◄───── 1-Click Fast Advancement
        │
        ▼
  [Phase 7: AI Report]      [Phase 8: Decision]              [Phase 9: Outcome Email]
  Automated Scorecard   ───► Final Offer / Reject        ───► 1-Click Personalized Email
```

---

### Phase 1: Organization Setup & Custom Hiring Stages
- **Role**: **Owner** or **Admin**
- **URL**: `/dashboard/settings/stages` & `/dashboard/organization`
- **Real-World Purpose**: Tech companies evaluate different roles with distinct interview steps (e.g. *Applied ➔ Resume Screening ➔ Technical Interview ➔ System Design ➔ Founder Fit ➔ Offer ➔ Hired*).
- **HireSys Workflow**:
  1. The Owner signs up, creates an Organization (e.g., *TechNova*), and invites recruiters and engineers.
  2. The Admin navigates to **Settings ➔ Pipeline Stages** to customize the organization's recruitment funnel, colors, and terminal states (`POSITIVE_TERMINAL` like *Hired*, `NEGATIVE_TERMINAL` like *Rejected*).

---

### Phase 2: Job Creation & Public Candidate Application
- **Role**: **Recruiter** (Posting) & **Candidate** (Applying)
- **URL**: `/dashboard/jobs` & `/jobs/[id]`
- **Real-World Purpose**: Recruiters open requisitions for open roles, and candidates apply directly by uploading resumes.
- **HireSys Workflow**:
  1. Recruiter goes to **Jobs ➔ Create New Job** (e.g., *"Senior Full Stack Engineer (React & Node.js)"*).
  2. System generates a public career portal application link (`/jobs/[id]`).
  3. The Candidate (e.g., *Bhumi*) opens the application link, fills in their details (Name, Email, LinkedIn), and uploads their PDF resume.
  4. On submit, the system saves the original PDF file securely to storage and registers the candidate in the database under the **Applied** stage.

---

### Phase 3: AI Resume Intelligence & Dual-Mode Viewer
- **Role**: **Recruiter**
- **URL**: `/dashboard/candidates` & `/dashboard/candidates/[id]`
- **Real-World Purpose**: Sifting through hundreds of resumes manually takes hours. HireSys evaluates candidate match against requirements in seconds.
- **HireSys Workflow**:
  1. Background worker triggers Gemini AI parsing of the candidate's resume.
  2. The candidate card receives an **AI Match Score** (e.g., *90% Match*).
  3. Recruiter clicks candidate profile:
     - **Dual-Mode Resume Viewer**: Recruiter can click **View Resume** to inspect the **Original PDF** embedded in a viewer, or switch to the clean **Extracted Structured Reader**.
     - **AI Intelligence Report**: Displays Executive Summary, ATS Formatting Score, Quantified Strengths, Key Matched Keywords, and Actionable Hiring Risks.

---

### Phase 4: Streamlined Pipeline Operations (No Dragging Required)
- **Role**: **Recruiter**
- **URL**: `/dashboard/pipeline`
- **Real-World Problem Solved**: In traditional Kanban boards, dragging 20+ candidate cards across 6 wide horizontal columns on a trackpad is exhausting.
- **HireSys Workflow**:
  1. **1-Click Advance Button (`Advance ➔`)**: Every candidate card has a direct advance button that moves the candidate to the next sequential stage in 1 click (e.g. *Applied ➔ Screening*).
  2. **Direct Stage Selector Dropdown (`Move to...`)**: Recruiter can immediately jump a candidate to *any* stage (e.g., jump directly from *Screening* to *Technical Interview*).
  3. **Multi-Select Bulk Actions Bar**: Checkboxes on candidate cards allow selecting 5 candidates at once to **Advance All**, **Move All to Stage**, or **Bulk Reject**.
  4. **Interactive Profile Stepper**: Inside the candidate's profile page, a horizontal progress bar (`[Applied] ➔ [Screening] ➔ [Technical] ➔ [Offer] ➔ [Hired]`) allows instant 1-click stage transitions.

---

### Phase 5: Interview Copilot (AI Question Generation)
- **Role**: **Recruiter** or **Interviewer**
- **URL**: `/dashboard/question-gen`
- **Real-World Purpose**: Interviewers often struggle to craft rigorous, calibrated technical questions for specific stacks (e.g. React concurrency, Node Libuv event loop, OT vs CRDT).
- **HireSys Workflow**:
  1. Recruiter or Interviewer selects a **Quick Preset** (e.g., *Full Stack (React & Node.js)*) or enters role, difficulty, and focus topics (*System Design, Algorithms, Async JS*).
  2. Clicks **Generate Questions**.
  3. AI produces calibrated questions categorized with badges:
     - *System Design*: Distributed WebSocket sync, rate limiting, token bucket.
     - *Concurrency & Async*: Libuv event loop phases, microtasks vs nextTick, memory leaks.
     - *Frontend & UI*: React 18/19 Concurrent Mode, startTransition, state rollback.
  4. User clicks **Copy** on any question or **Copy All Questions** to carry into the upcoming live coding round.

---

### Phase 6: Interview Scheduling & Direct Candidate Access Link
- **Role**: **Recruiter**
- **URL**: `/dashboard/interviews`
- **Real-World Problem Solved**: What if the candidate's invitation email fails or gets stuck in spam? How does the candidate join?
- **HireSys Workflow**:
  1. Recruiter schedules an interview (e.g., *"Full Stack Round 1"*), assigning candidate *Bhumi* and interviewer *Recruiter/Engineer*.
  2. **Direct Candidate Access Link (Zero-Password Magic Join)**:
     - On `/dashboard/interviews`, each interview row has a **`Candidate Link`** button.
     - Clicking this generates a pre-authenticated candidate session token valid for that room:
       ```
       http://localhost:3000/room/[id]?token=[secure_candidate_token]
       ```
     - The recruiter can copy this link and send it via WhatsApp, Slack, Teams, or Gmail.
     - When Bhumi clicks the link, the coding room automatically logs her in as the candidate with **zero password required**.

---

### Phase 7: Live Collaborative Coding Room
- **Role**: **Interviewer** & **Candidate** simultaneously
- **URL**: `/room/[id]`
- **Real-World Purpose**: Real-time collaborative coding environment where interviewer evaluates candidate problem-solving and coding ability live.
- **HireSys Workflow**:
  1. **Dual-User Synchronization**:
     - Both Interviewer and Candidate see each other's avatars, colored cursor carets, and live keystroke updates synchronized via WebSockets (`socket.io`).
  2. **Monaco Code Editor**:
     - Full VSCode editor experience with syntax highlighting and language switcher (**JavaScript**, **Python**).
  3. **Piston Code Execution Sandbox**:
     - Clicking **Run Code** compiles and runs code in an isolated Docker sandbox, displaying stdout, runtime, and stderr immediately in the terminal drawer.
  4. **Interviewer Workspace**:
     - **Question Drawer**: Interviewer pastes the questions copied from Interview Copilot.
     - **Private Notes**: Interviewer writes notes that auto-save every 2 seconds. These notes are hidden from the candidate.
     - **In-Session AI Code Review**: The interviewer can click **Analyze Code** to obtain Big-O time/space complexity analysis and code improvement suggestions.
  5. **Completion**:
     - When the session ends, the interviewer clicks **Complete Interview**.

---

### Phase 8: Post-Interview AI Evaluation Report
- **Role**: **Interviewer** & **Recruiter**
- **URL**: `/dashboard/interviews/[id]/report`
- **Real-World Purpose**: Replaces subjective interviewer memory with objective, AI-synthesized scorecard and rubric ratings.
- **HireSys Workflow**:
  1. The AI evaluates the submitted code, interview notes, and session metrics.
  2. Generates an executive scorecard:
     - **Overall Score** (0-100) & **Recommendation** (*STRONG_HIRE*, *HIRE*, *MAYBE*, *NO_HIRE*).
     - Breakdown: Coding Quality Score, Problem Solving Score, Technical Knowledge Score.
     - Key Observed Strengths & Areas for Growth.
  3. The report is permanently linked to the candidate's profile timeline.

---

### Phase 9: Final Decision & 1-Click Outcome Emails
- **Role**: **Recruiter**
- **URL**: `/dashboard/candidates/[id]`
- **Real-World Purpose**: Candidates appreciate fast, professional communication once a hiring decision is reached.
- **HireSys Workflow**:
  1. Recruiter reviews the candidate profile, resume score, and interview report.
  2. Uses the **Stage Progression Stepper** to move candidate to **Offer** or **Hired** (or **Rejected**).
  3. Clicks **Send outcome email**:
     - Selects template: **Offer / Next Steps** or **Rejection / Closure**.
     - System auto-populates candidate name, job title, and organization name.
     - Recruiter reviews and clicks **Confirm & Send Email**.
  4. Candidate receives a formal branded notification, closing the loop.

---

## 3. Testing the Multi-Role Flow Locally (Browser Tabs)

To simulate the entire real-world flow on your local machine:

| Tab | Browser Window | Role | URL | Action |
| :--- | :--- | :--- | :--- | :--- |
| **Tab 1** | Normal Browser | **Recruiter / Admin** | `http://localhost:3000/dashboard` | Manage Pipeline, Question Gen, and Interviews |
| **Tab 2** | Incognito Window | **Candidate (Bhumi)** | `http://localhost:3000/room/[id]?token=...` | Paste the **Candidate Direct Link** to enter the coding room |
| **Tab 1** | Normal Browser | **Interviewer** | `http://localhost:3000/room/[id]` | Click **Enter Room** on interviews page to code together |

Both windows will connect to the same room in real-time, allowing you to test typing, running code, and completing the interview session side-by-side.
