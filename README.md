# HireSys Platform

HireSys is a modern, end-to-end technical interview platform built to streamline the hiring process. It provides real-time collaborative coding environments, AI-powered interview question generation, and instant AI resume analysis.

## Overview

HireSys enables engineering teams to conduct, manage, and analyze technical interviews efficiently. The platform features an applicant tracking pipeline, organization management, a live collaborative code editor, and deep integrations with AI for code feedback and candidate evaluation.

## Features

- **Live Collaborative Coding**: Real-time code execution and shared editor using Monaco and Socket.io.
- **AI Code Review & Feedback**: Get instant AI feedback on candidate coding solutions during interviews.
- **AI Resume Analysis**: Upload candidate resumes to instantly receive an AI match score, strength analysis, and identified gaps.
- **Dynamic Question Generator**: Automatically generate tailored technical and behavioral questions based on candidate profiles.
- **Applicant Tracking System (ATS)**: Manage candidate pipelines from Screening to Hired using a modern Kanban board.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Owners, Admins, and Members.

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Monaco Editor (Code Editor)
- Socket.io-client (Real-time syncing)

### Backend
- Node.js & Express 5
- Prisma ORM
- PostgreSQL
- Redis & BullMQ (Job Queuing)
- Socket.io (WebSockets)
- Google Gemini AI Integration

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd interview-platform
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
