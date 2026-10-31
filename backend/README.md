# Kutaksha Backend

A modular FastAPI backend for an AI-powered preventive elder wellness platform.

## Features
- JWT authentication with role-based access
- Patient and caregiver workflows
- Camera analysis and behaviour intelligence simulation
- Risk scoring with explainable summaries
- PDF report generation and notifications

## Run locally
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Test the backend
```bash
cd backend
python -m pytest -q
```

## RAG assistant (`/chat/query`)

The LangGraph + Gemini assistant from `../data/Kutaksha Rag.ipynb` lives in
`app/ai/rag_graph.py` and is served at `POST /chat/query` (JWT required).

It is **optional**. The backend starts and every other route works without it;
`/chat/query` returns `503` with a message explaining what is missing.

To enable it:

```bash
cd backend
	pip install -r requirements-rag.txt      # langgraph, faiss, Ollama/Gemini, embeddings
	cp .env.example .env                     # configure LLM_PROVIDER
mkdir -p docs                            # add the patient report PDFs here
python -m uvicorn app.main:app --reload
```

By default the assistant uses local Ollama, so it does not consume Gemini API
quota. Install Ollama and download the configured model before starting the
backend:

```bash
ollama pull llama3.2:3b
```

Set `LLM_PROVIDER=gemini` and `GOOGLE_API_KEY` in `backend/.env` only when you
want to use Gemini instead.

Indexes are built on the first request (slow: it downloads the embedding model)
and cached in `backend/rag_index/`. Delete that folder after changing the docs.

| Status | Meaning |
|--------|---------|
| 200 | Answer, routed intent, and source filenames |
| 401 | Missing or expired JWT |
| 422 | Blank or oversized query |
| 502 | The graph ran but failed (e.g. Gemini error) |
| 503 | RAG not configured: missing key, deps, or PDFs |

## Notes
This prototype uses simulated AI outputs and SQLite by default for local demos while keeping the architecture production-ready for future integration with real models and PostgreSQL.

## Judge presentation notes
- The backend exposes a health endpoint at `/health`
- API docs are available at `/docs` and `/redoc`
- The backend can be started with `python -m uvicorn app.main:app --reload`
- The Dockerfile builds a self-contained service on port `8000`
