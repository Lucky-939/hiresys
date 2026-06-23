# Deployment Guide

This document outlines the procedure to deploy the HireSys platform to production.

## 1. Local Docker Deployment (Development / Testing)

You can run the entire application stack locally using Docker Compose.

1. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
2. Make sure you set your `GEMINI_API_KEY` and `JWT_SECRET` in `.env`.
3. Run docker compose:
   ```bash
   docker compose up --build -d
   ```
4. Access the frontend at `http://localhost:3000` and the backend at `http://localhost:5000`.

---

## 2. Production Deployment Targets

For a production environment, we deploy the services to dedicated managed platforms.

### Database: Supabase PostgreSQL
1. Create a new project on [Supabase](https://supabase.com).
2. Obtain the database connection string from the project settings.
3. Replace the local `DATABASE_URL` with this connection string. **Make sure to use the connection pooler URL if deploying on a serverless environment.**

### Redis: Upstash Redis
1. Create a new Redis database on [Upstash](https://upstash.com).
2. Copy the `REDIS_URL` connection string.

### Backend: Render
We deploy the `apps/server` using Render.

1. In the Render Dashboard, create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `apps/server`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `node dist/server.js`
4. Set the following Environment Variables in the Render dashboard:
   - `DATABASE_URL`: (from Supabase)
   - `REDIS_URL`: (from Upstash)
   - `JWT_SECRET`: (generate a secure random string)
   - `GEMINI_API_KEY`: (your Gemini API Key)
   - `CLIENT_URL`: `https://your-frontend-domain.vercel.app`
   - `NODE_ENV`: `production`

### Frontend: Vercel
We deploy the `apps/web` Next.js frontend using Vercel.

1. Import your GitHub repository in the Vercel Dashboard.
2. Set the **Root Directory** to `apps/web`.
3. Vercel will automatically detect it as a Next.js project.
4. Set the following Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-render-backend-url.onrender.com/api`
5. Click **Deploy**.

## Health Checks

Once deployed, verify the backend is healthy:
- `/health/live` - Verifies the Express server is up.
- `/health/ready` - Verifies the Express server can successfully communicate with PostgreSQL and Redis.
