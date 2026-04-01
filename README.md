# Peer Connect

Peer Connect is a full-stack peer-learning platform where users can share skills, discover peers, chat in real-time, and run video mentoring sessions.

## Stack

- Frontend: Next.js (React + TypeScript)
- Backend: Express.js (Node.js)
- Database/Auth/Storage: Supabase (PostgreSQL)
- Realtime: Socket.IO
- Video: Jitsi Meet (Jitsi React SDK)
- AI Service: FastAPI + Sentence Transformers + Haystack (RAG-ready)

## Monorepo Structure

- `frontend/` - Next.js application
- `backend/` - Express API + Socket.IO server
- `ai-service/` - Python FastAPI semantic/RAG microservice
- `docs/` - architecture and project documentation

## Local Setup

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### 3) AI Service (optional but recommended)

```bash
cd ai-service
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Environment Variables

### Backend (`backend/.env`)

- `PORT`
- `FRONTEND_URL` / `FRONTEND_URLS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MISTRAL_API_KEY`
- `AI_SERVICE_URL`
- `AI_SERVICE_TIMEOUT_MS`
- `SUPABASE_AVATAR_BUCKET`
- `SUPABASE_RESOURCE_BUCKET`

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Quality Commands

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

### AI Service

```bash
python -m py_compile ai-service/app/main.py
```

## Security Notes

- Never commit `.env` files or real API keys.
- Rotate any leaked keys immediately.
- Production deployment should set strict CORS origins and HTTPS-only endpoints.

## Deployment (recommended)

- Frontend: Vercel
- Backend: Render
- AI Service: Render (separate service)
- Database/Auth/Storage: Supabase

Deployment guide:

- `docs/DEPLOY_RENDER_VERCEL.md`

