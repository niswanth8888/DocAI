# DocAI Backend

Production-style Python FastAPI backend for an Agentic RAG Knowledge Base system.

## What it does

- Upload PDF, DOCX, and TXT documents.
- Extract, clean, and chunk document text.
- Store chunks in a local vector retrieval store.
- Generate document summary, FAQs, and taxonomy tags.
- Answer questions with citations.
- Use document-grounded reasoning.
- Calculate confidence score.
- Move unsupported or low-confidence questions to human review.
- Maintain structured logs for demo and monitoring.

## Quick Start

```bash
cd trustkb_backend
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Mac/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env`:

```bash
copy .env.example .env
```

or on Mac/Linux:

```bash
cp .env.example .env
```

Add either `GEMINI_API_KEY` or `OPENAI_API_KEY` in `.env`.

Run backend:

```bash
uvicorn main:app --reload --port 8000
```

Open API docs:

```text
http://127.0.0.1:8000/docs
```

## Main endpoints

- `GET /health`
- `POST /upload`
- `POST /ask`
- `GET /dashboard`
- `GET /documents`
- `GET /faqs`
- `GET /tags`
- `GET /reviews`
- `GET /logs`
- `GET /logs/structured`

## ngrok for frontend connection

```bash
ngrok http 8000
```

Use the generated HTTPS URL as your frontend API base URL.

Example:

```text
VITE_API_BASE_URL=https://your-ngrok-url.ngrok-free.app
```
