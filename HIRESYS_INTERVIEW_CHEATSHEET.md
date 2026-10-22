# 🚀 HireSys — High-Impact Interview Cheatsheet
> **Candidate**: Lucky Bhoir | **Role**: Software Developer  
> **Key Focus**: Core Architecture, Technical Decisions, System Design & Tricky Interview Questions.  
> *Memorize the bold technical buzzwords and core concepts tonight.*

---

## 📌 PART 1: The Killer Project Introduction

### ⚡ 30-Second Elevator Pitch (Memorize this word-for-word)
> "I built **HireSys**, an enterprise-grade, multi-tenant AI technical hiring platform. It combines a **real-time collaborative coding room** powered by WebSockets and Monaco Editor, an **isolated sandbox for running untrusted code**, and an **AI Interview Copilot** leveraging Google Gemini for live LeetCode problem generation and code complexity analysis. On the hiring side, it features an **asynchronous ATS resume ranking pipeline** processed via BullMQ and Redis queues, backed by PostgreSQL and Prisma ORM with strict role-based access control. I built it end-to-end using a TypeScript monorepo with Next.js and Node.js."

---

### 🎙️ 90-Second In-Depth Walkthrough (When they say: "Tell me more about how it works")
1. **The Problem It Solves**:
   - Traditional hiring is fragmented: recruiters use one tool for resumes, Google Meet for calls, Google Docs or HackerRank for coding, and email for feedback. HireSys unifies the entire lifecycle from job application to automated scoring and offer delivery.
2. **The 3 Core Engineering Pillars**:
   - **Real-Time Collaboration**: A synchronized Monaco code editor where interviewer and candidate type simultaneously, select from multiple languages, run code in an isolated Piston sandbox with live terminal output, and exchange problems in real time via WebSockets (`Socket.IO`).
   - **AI Interview Copilot**: Integrated Google Gemini 1.5/2.0 API to generate difficulty-calibrated LeetCode problems (Easy/Medium/Hard) and perform automated Big-O time and space complexity code audits.
   - **Asynchronous Resume & ATS Engine**: Heavy PDF text extraction and ATS scoring offloaded to background workers using **BullMQ + Redis**, ensuring zero API thread blocking.
3. **Architecture & Clean Code**:
   - Built with a **Repository Pattern** and Controller-Service architecture on Express, Prisma ORM on PostgreSQL with multi-tenancy, and JWT authentication with Redis token revocation.

---

## 🏗️ PART 2: High-Level Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │        Next.js 16 (App Router)         │
                        │    Monaco Editor • Tailwind • Zustand  │
                        └───────────────────┬────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
            HTTP / REST (Axios)                             WebSockets (Socket.IO)
                     │                                             │
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Express.js API Server   │◄───────────────►│    Socket.IO Room Hub     │
       │  (Controller-Service-Repo)│                 │ (Live Keystrokes, Term)   │
       └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                     │                                             │
      ┌──────────────┼──────────────┬──────────────┐               │
      ▼              ▼              ▼              ▼               ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐
│PostgreSQL │  │   Redis   │  │  BullMQ   │  │  Gemini   │  │Piston Sandbox│
│  (Prisma) │  │(Cache/Rev)│  │ (Workers) │  │  (AI API) │  │ (Docker Exec)│
└───────────┘  └───────────┘  └───────────┘  └───────────┘  └──────────────┘
```

---

## 💬 PART 3: Top Technical Interview Questions & Perfect Answers

---

### 🌐 Category 1: Real-Time Collaborative Coding Room (WebSockets)

#### Q1: Why did you use WebSockets (`Socket.IO`) instead of HTTP Polling or Server-Sent Events (SSE)?
- **Answer**: 
  - **HTTP Polling** adds immense network overhead and latency (constant TCP handshakes) and is unacceptable for character-by-character coding synchronization.
  - **SSE** is strictly unidirectional (server-to-client). Coding interviews require **bi-directional, low-latency duplex communication** where both interviewer and candidate type simultaneously, execute code, and exchange active problem statements.
  - **Socket.IO** provides built-in rooms (`socket.join(roomId)`), automatic reconnection with exponential backoff, and fallback to HTTP long-polling if corporate firewalls block raw WebSockets.

#### Q2: How do you prevent infinite update loops when synchronizing code changes?
- **Answer**:
  - We use a ref flag `isRemoteChange.current`. When the local Monaco editor receives a `code:update` event from the server, we set `isRemoteChange.current = true`, update the state, and ignore firing the outgoing `code:change` socket emit during that render cycle.
  - Furthermore, on the server we broadcast using `socket.to(roomId).emit("code:update")` instead of `io.to(roomId).emit()`, which broadcasts to **all other participants in the room except the sender**.

#### Q3: How is user code executed securely? Why not just `eval()` or child process?
- **Answer**:
  - Executing user-submitted code using `eval()` or Node's `child_process.exec()` creates catastrophic **Remote Code Execution (RCE)** vulnerabilities where malicious candidates could read server environment variables or kill the host process.
  - We route code execution to **Piston**, an isolated containerized sandbox engine. It executes code inside ephemeral, unprivileged Linux cgroups with strict memory limits (256MB), CPU quotas, disabled network access, and a hard 3-second timeout limit.

---

### 🤖 Category 2: AI Integration & Prompt Engineering (Google Gemini)

#### Q4: How does the AI Interview Copilot generate LeetCode problems?
- **Answer**:
  - We created a dedicated `question.service.ts` that interfaces with the Google Gemini API.
  - We engineered a calibrated prompt specifying:
    1. **Strict LeetCode-style algorithmic format** (e.g., function signature, problem description, concrete example input/output test cases, and target Big-O complexity).
    2. **Difficulty parameter** (`Easy`, `Medium`, `Hard`) mapped to standard algorithmic paradigms (Two Pointers, Sliding Window, Greedy, Dynamic Programming, Monotonic Stacks).
    3. Strict JSON output enforcement to eliminate markdown chatter.
  - We implemented Redis caching (`leetcode-questions:${role}:${difficulty}:${count}`) so repeated requests don't waste API tokens.

#### Q5: What happens if the Gemini API has a quota exhaustion or network timeout?
- **Answer**:
  - We implemented a **Resilience Strategy** consisting of:
    1. **Exponential Backoff Retries**: Up to 3 attempts with dynamic jitter.
    2. **Circuit Breaker**: If 5 consecutive failures occur within a minute, the circuit trips open for 60 seconds to avoid flooding a failing endpoint.
    3. **Deterministic Fallbacks**: A built-in offline pool of classic LeetCode problems (e.g., Two Sum, Group Anagrams, Trapping Rain Water) guarantees that an active interview room **never crashes or freezes** during a network failure.

---

### ⚡ Category 3: Background Jobs, Queues & ATS Engine (BullMQ + Redis)

#### Q6: Why did you use BullMQ for resume parsing and ATS scoring instead of handling it directly in the Express request?
- **Answer**:
  - PDF text extraction (`pdfjs-dist` / `pdf-text-extract`) and LLM token analysis are **CPU-intensive and I/O-bound** operations that take between 2 to 6 seconds per resume.
  - If handled synchronously in an Express route handler, it would **block Node's single-threaded event loop**, causing latency spikes and dropped requests for other concurrent users.
  - Using **BullMQ on top of Redis**, the API endpoint immediately enqueues the job and returns a `202 Accepted` response with a `jobId`. A dedicated worker picks up the job, processes it in the background, updates PostgreSQL via Prisma, and notifies the client.

#### Q7: Why Redis for the queue instead of RabbitMQ or Kafka?
- **Answer**:
  - **RabbitMQ/Kafka** introduce massive infrastructure overhead and complexity.
  - **Redis** was already in our stack for session management, token blocklisting, and query caching. BullMQ leverages Redis atomic Lua scripts for job locking, delayed retries, and high-throughput job transitions with sub-millisecond overhead.

---

### 🛡️ Category 4: Authentication, Multi-Tenancy & Security

#### Q8: How does Multi-Tenancy work in HireSys? How do you prevent data leaks between companies?
- **Answer**:
  - HireSys uses a **Row-Level Shared Database, Shared Schema Multi-Tenancy model**.
  - Every core entity (`Candidate`, `Interview`, `Job`, `PipelineStage`) has a foreign key `organizationId`.
  - In our middleware (`auth.middleware.ts`), we verify the user's JWT and extract their active `organizationId`.
  - Every Prisma query strictly scopes where conditions: `where: { id, organizationId }`. A recruiter from Organization A can never query or mutate candidates from Organization B.

#### Q9: How does HireSys handle Role-Based Access Control (RBAC)?
- **Answer**:
  - We define discrete roles: `OWNER`, `ADMIN`, `RECRUITER`, `INTERVIEWER`, and `CANDIDATE`.
  - Organization admins and recruiters have global visibility into candidates, pipeline stages, and analytics.
  - Assigned **Interviewers** can only access rooms and candidates they are assigned to.
  - **Candidates** joining via a magic link have scoped JWTs: private interviewer evaluation notes, scoring rubrics, and final reports are scrubbed from the payload before returning to the candidate.

#### Q10: How do you handle JWT logout/revocation? JWTs are stateless!
- **Answer**:
  - While JWTs are stateless, we implemented a **Redis Token Blocklist**.
  - Upon logout or password reset, the token's remaining TTL is calculated, and the key `bl_${token}` is stored in Redis with an automatic expiry matching the JWT's lifespan.
  - In the auth middleware and Socket.IO handshake, we check `redis.get(bl_${token})`. If found, the request is rejected immediately with a `401 Unauthorized`.

---

## 🎯 PART 4: Tough Technical Curveball Questions

### Q11: "What was the most challenging technical bug you encountered in this project, and how did you resolve it?"
- **Best Answer**:
  > *"The most challenging issue was a **race condition and session overwrite** during collaborative interview testing. When an interviewer opened a candidate's magic join link in another tab, the candidate's JWT overwrote the interviewer's persistent `localStorage` auth token. Additionally, the WebSocket connection wasn't re-authenticating with the candidate's active credentials.*  
  > *I solved this by decoupling persistent recruiter storage from per-tab session credentials using `sessionStorage` and passing explicit authorization headers. On the WebSocket layer, I refactored the client socket factory to track `currentSocketToken` and trigger a seamless reconnect with clean room membership validation whenever credentials changed."*

---

### Q12: "How would you scale HireSys to support 10,000 concurrent interview rooms?"
- **Answer (3-point scaling strategy)**:
  1. **Stateless Node APIs & Horizontal Pod Autoscaling (HPA)**: Deploy Express APIs behind an NGINX / AWS ALB load balancer.
  2. **Socket.IO Redis Adapter**: Currently, Socket.IO runs in-memory. For multiple server instances, attach `@socket.io/redis-adapter` so room events broadcast seamlessly across different physical servers using Redis Pub/Sub.
  3. **Database Read Replicas & Connection Pooling**: Implement **Prisma Accelerate / PgBouncer** for connection pooling and route write queries to a primary database while offloading reporting and dashboard queries to read replicas.

---

### Q13: "If you had 2 more weeks to work on this, what would you add or improve?"
- **Answer**:
  1. **Operational Transformation (OT) / CRDTs (Yjs)**: Replace full-string synchronization with character-diff operational transforms for offline conflict resolution.
  2. **WebRTC Video/Audio Streaming**: Integrate peer-to-peer audio and video directly alongside the coding room so users don't need Google Meet.
  3. **Automated Unit Test Suites**: Allow recruiters to define hidden unit test suites (e.g. Jest / PyTest) that automatically grade candidate code on "Run Code".

---

## 📋 PART 5: Quick-Glance Tech Stack Matrix

| Layer | Technologies Used | Architectural Justification |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Zustand | Server-side rendering for landing pages, fast client state with Zustand, zero-dependency modern UI. |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) | Industry-standard VS Code engine in the browser; provides syntax highlighting, auto-indent, and line markers. |
| **Real-Time** | WebSockets via `Socket.IO` | Bi-directional, event-driven live communication with built-in room clustering and fallback mechanisms. |
| **Backend API** | Node.js, Express, TypeScript | Controller-Service-Repository pattern; modular, predictable, clean separation of concerns. |
| **Database** | PostgreSQL + Prisma ORM | ACID compliance, relational integrity across multi-tenant organizations, type-safe query generation with Prisma. |
| **Cache & Queue**| Redis + BullMQ | Sub-millisecond distributed caching, rate-limiting counters, and background job processing for heavy PDF extraction. |
| **Sandbox** | Piston Code Execution Engine | Secure, multi-language containerized execution environment with resource and execution quotas. |
| **AI Layer** | Google Gemini Generative AI | High-speed LLM processing for algorithmic problem generation and Big-O code complexity analysis. |

---

### 💡 Golden Rules for Tomorrow's Interview
1. **Be Proud & Confident**: You designed an entire multi-tenant system with live sockets, AI, queues, and containerization. That puts you in the top 5% of candidates.
2. **Think Before Answering**: Take a 2-second pause before answering technical design questions.
3. **Always Mention the "Why"**: Don't just say *"I used Redis"*; say *"I used Redis because BullMQ relies on atomic Lua scripts to prevent duplicate job execution."*
4. **Speak in Metrics**: Mention *"sub-3 second sandbox timeouts"*, *"60-second circuit breakers"*, *"O(N) vs O(N^2) complexity"*.

**Good luck tomorrow Lucky! You are 100% prepared to crush it.** 🚀
