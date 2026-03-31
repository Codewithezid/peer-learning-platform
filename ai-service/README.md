# Peer Connect Semantic AI Service

This service provides semantic ranking APIs backed by `sentence-transformers`.

## Endpoints

- `GET /health`
- `POST /semantic/search`
- `POST /semantic/peer-match`
- `POST /semantic-search`
- `POST /recommend`
- `POST /quiz-gen`
- `POST /rag/ask`

## Local Run

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Backend Integration

Set these in `backend/.env`:

```env
AI_SERVICE_URL=http://localhost:8001
AI_SERVICE_TIMEOUT_MS=8000
```

If `AI_SERVICE_URL` is not set, backend automatically falls back to current non-semantic behavior.
