# DocAI Frontend - Neural Midnight RAG Interface

This is the premium React + TypeScript + Vite + Tailwind CSS frontend for **DocAI**, an Agentic RAG Knowledge Base System.

## Features

- **Dashboard**: High-level view of document statistics, chunks, FAQs, tags, and reviews, with health monitoring.
- **Upload Knowledge**: Multi-step file parsing UI featuring visual steps (Uploading, Chunking, Embedding) and output inspect.
- **Ask Agent**: Chat-style RAG query page with citation badges, confidence scores, reasoning cards, and expandable sources.
- **Generated FAQs & Taxonomy Tags**: Browse and search structured intelligence extracted from files.
- **Review Queue**: Secure human-in-the-loop review board for validating low-confidence agent inferences.
- **System Logs**: Dual-panel viewer displaying technical FastAPI logs and structured document intelligence summaries.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (Icons)
- React Router DOM
- Axios

## Setup Instructions

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file from the example:
   ```bash
   copy .env.example .env
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Environment Variables Configuration

The frontend connects to the FastAPI backend using `VITE_API_BASE_URL`.

### Local Development
By default, the fallback is set to:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Tunneling with Ngrok
If running the backend behind an ngrok tunnel, update your `.env` file:
```env
VITE_API_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

### Vercel Deployment
To deploy this frontend to Vercel:
1. Connect this repository to Vercel.
2. In the Project Settings under **Environment Variables**, add:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-production-fastapi-backend.com`
