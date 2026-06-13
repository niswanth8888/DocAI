DocAI
DocAI is an AI-powered enterprise document intelligence platform that turns uploaded company documents into a searchable, citation-backed knowledge base. It helps employees and administrators upload documents, generate structured knowledge, ask document-grounded questions, review low-confidence answers, and maintain cleaner company knowledge.
DocAI is designed for organizations that manage large volumes of internal documents such as policies, annual reports, manuals, contracts, onboarding files, financial documents, compliance documents, and technical documentation.
---
Project Overview
Many companies store important knowledge across multiple PDFs, Word files, text documents, reports, and policy files. Employees often waste time manually searching these documents or asking repeated questions to HR, finance, operations, or management teams.
DocAI solves this problem by converting uploaded documents into a structured knowledge base. Users can ask questions in natural language and receive answers backed by document evidence, citations, confidence scores, and related sources.
The platform is not just a chatbot. It acts as an enterprise knowledge intelligence system with document upload, indexing, RAG-based retrieval, generated FAQs, taxonomy tags, admin analytics, user management, review queue, and knowledge quality controls.
---
Key Features
Document Upload and Indexing
Users can upload PDF, DOCX, and TXT documents. After upload, DocAI saves the original file, extracts readable text, splits the text into semantic chunks, stores indexed knowledge, generates a summary, FAQs, taxonomy tags, and updates the knowledge library.
Ask Agent
The Ask Agent allows users to ask questions from uploaded documents. It retrieves relevant document chunks and generates a grounded answer using RAG logic. Responses include source citations, confidence score, related FAQs, and reliability warnings when evidence is weak.
Citation-Backed Answers
DocAI focuses on reliable enterprise answers. It attaches source references wherever possible and avoids unsupported answers when evidence is missing.
Generated FAQs
DocAI automatically generates frequently asked questions from uploaded documents. This helps companies convert policies, reports, and manuals into self-service knowledge.
Taxonomy Tags
DocAI generates taxonomy tags to classify uploaded documents by topic, department, process, policy type, or business area.
Knowledge Library
The Knowledge Library displays uploaded and indexed documents, including metadata, chunk counts, summaries, FAQs, and tags.
Admin Console
The admin console supports user management, dashboard analytics, search analytics, download analytics, global settings, knowledge quality monitoring, and review queue management.
User Authentication
DocAI supports signup, login, JWT-based sessions, role-based access, admin-only routes, profile management, secure password hashing, and password reset flows.
Passwords are not stored or displayed in plain text. Admins can reset passwords but cannot view existing passwords.
Knowledge Quality Management
DocAI includes concepts such as duplicate document detection, cascade deletion, knowledge gap detection, review queue for weak answers, source-of-truth ranking, conflict detection, and document health monitoring.
Global Configuration
Admins can configure AI and indexing settings such as inference model, model temperature, vector chunk size, and chunk overlap.
Recommended reliable settings:
```text
Model Temperature: 0.2
Vector Chunk Size: 1000
Chunk Overlap: 200
```
Low temperature helps DocAI provide more consistent, evidence-focused answers.
---
System Architecture
```text
User / Admin
   ↓
React Frontend
   ↓
FastAPI Backend
   ↓
Document Processing + RAG Engine
   ↓
JSON Storage + Local Vector Store
   ↓
Citation-Backed Response
```
---
Tech Stack
Frontend
React
TypeScript
Vite
Tailwind CSS
Axios
Vercel deployment
Backend
Python
FastAPI
Uvicorn
Pydantic
JWT authentication
Local JSON storage
Document parsing utilities
Local vector retrieval
AI / RAG
Retrieval-Augmented Generation
Chunk-based document search
Confidence scoring
Citation selection
Summary, FAQ, and tag generation
Gemini integration support
---
Main Workflow
Document Upload Workflow
```text
Upload document
   ↓
Validate file type
   ↓
Save original file
   ↓
Extract text
   ↓
Create chunks
   ↓
Store searchable knowledge
   ↓
Generate summary, FAQs, and tags
   ↓
Update dashboard and knowledge library
```
Ask Agent Workflow
```text
User asks a question
   ↓
Detect query intent
   ↓
Search indexed chunks
   ↓
Retrieve relevant evidence
   ↓
Generate answer
   ↓
Validate confidence
   ↓
Return answer with citations
```
---
Folder Structure
```text
DocAI/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
│
├── trustkb_backend/
│   ├── app/
│   │   ├── auth_helper.py
│   │   ├── chunker.py
│   │   ├── confidence.py
│   │   ├── config.py
│   │   ├── document_loader.py
│   │   ├── knowledge_generator.py
│   │   ├── llm_client.py
│   │   ├── models.py
│   │   ├── quality.py
│   │   ├── rag_engine.py
│   │   ├── storage.py
│   │   ├── utils.py
│   │   └── vector_store.py
│   ├── main.py
│   └── requirements.txt
│
├── README.md
├── LICENSE
└── .gitignore
```
---
Backend Setup
Open CMD:
```cmd
cd C:\Users\niswa\Downloads\DocAI\trustkb_backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Backend runs at:
```text
http://127.0.0.1:8000
```
Health check:
```text
http://127.0.0.1:8000/health
```
---
Frontend Setup
Open another CMD:
```cmd
cd C:\Users\niswa\Downloads\DocAI\frontend
npm install
npm run dev
```
Frontend runs at:
```text
http://localhost:5173
```
For local frontend, create `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
---
Public Deployment
Frontend Deployment
The frontend can be deployed on Vercel.
Vercel settings:
```text
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```
Backend Access Using ngrok
For demo purposes, the local FastAPI backend can be exposed using ngrok:
```cmd
ngrok http 8000
```
Then set the Vercel environment variable:
```env
VITE_API_BASE_URL=https://your-ngrok-url.ngrok-free.app
```
After changing the environment variable, redeploy the Vercel project.
---
API Highlights
Important backend endpoints:
```text
GET  /health
POST /auth/signup
POST /auth/login
GET  /profile
POST /upload
POST /ask
GET  /documents
GET  /faqs
GET  /tags
GET  /dashboard
GET  /admin/users
GET  /admin/settings
PATCH /admin/settings
```
---
Reliability Improvements
DocAI is designed to improve answer reliability through strict source verification, query intent detection, citation validation, confidence scoring, low-confidence review queue, related-source separation, knowledge gap detection, and document metadata verification.
The system should not substitute unrelated documents when an exact document or section is requested. If evidence is missing, DocAI should clearly say that the source was not found instead of guessing.
---
Example Use Cases
DocAI can be used by companies for:
HR policy search
Employee onboarding support
Annual report analysis
Compliance document retrieval
Internal knowledge management
Finance and reimbursement queries
Legal and contract document search
IT support documentation
Enterprise FAQ generation
Admin knowledge quality monitoring
---
Why DocAI Is Useful
DocAI helps companies reduce manual document searching, improve employee self-service, generate FAQs automatically, organize documents with taxonomy tags, provide citation-backed answers, improve trust with confidence scoring, detect missing or duplicate knowledge, maintain a cleaner knowledge base, and support admin-level knowledge governance.
---
Project Status
DocAI is a working prototype for enterprise document intelligence. It currently supports document upload, indexing, Ask Agent, generated FAQs, taxonomy tags, dashboard, authentication, admin controls, and reliability-focused RAG improvements.
Future improvements may include permanent backend cloud hosting, OCR for scanned PDFs, advanced line-level citations, multi-document comparison, full database migration, background indexing workers, department-level access control, and advanced audit logging.
---
License
This project is licensed under the Apache License 2.0.
---
Short Description
DocAI turns uploaded company documents into a searchable, citation-backed knowledge base where users can ask questions, retrieve trusted answers, and manage enterprise knowledge with FAQs, tags, history, admin analytics, and knowledge quality controls.
