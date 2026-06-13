# DocAI — Enterprise Document Intelligence Platform

DocAI is an AI-powered document intelligence platform that helps organizations retrieve trusted information from large collections of documents quickly and accurately.

Instead of manually searching through PDFs, Word files, policies, reports, handbooks, manuals, and internal records, users can ask questions in natural language and receive clear, citation-backed answers from the company’s own documents.

DocAI is designed for companies where information is scattered across many files and teams need a faster, more reliable way to access knowledge.

---

## Overview

In many organizations, employees spend valuable time searching for information across folders, shared drives, policy files, project documents, and internal manuals. DocAI solves this by converting uploaded and stored documents into a searchable knowledge base.

Once a document is uploaded, DocAI extracts the text, indexes the content, generates useful metadata, and makes it available for future question answering.

Users can ask questions such as:

```text
What is the leave approval process?
What role is mentioned in this internship document?
What is the main purpose of this project paper?
```

DocAI retrieves the most relevant information, explains it clearly, shows source citations, and allows users to download the original document for reference.

---

## Key Features

### Document Upload and Processing

DocAI supports document upload and processing for:

* PDF
* DOCX
* TXT

After upload, the system extracts text, chunks the content, stores metadata, and prepares the document for retrieval.

---

### Retrieval from Uploaded and Stored Documents

DocAI can answer questions from both newly uploaded documents and previously indexed documents stored in the knowledge base.

This means users do not need to upload the same document repeatedly. Once a document is processed, it becomes part of the searchable enterprise knowledge base.

---

### Ask Agent

The Ask Agent allows users to ask natural language questions and receive document-grounded answers.

Users can ask across all documents or select a specific document for more focused retrieval.

Answer modes include:

* Simple Answer
* Detailed Answer
* Executive Summary
* Step-by-Step Explanation

---

### Citation-Backed Answers

Every answer includes source evidence from the retrieved document.

Citations may include:

* Document name
* Page number
* Relevant evidence
* Evidence match score
* Citation relevance
* Download source document option

This helps users verify the answer instead of blindly trusting AI-generated text.

---

### Auto FAQs and Tags

DocAI automatically generates FAQs and taxonomy tags from uploaded documents.

This helps organize knowledge and makes important document content easier to discover.

Example tags:

```text
HR Policy, Leave Management, Employee Benefits, Approval Workflow
```

---

### User Accounts and Search History

DocAI supports individual user accounts.

Users can:

* Sign up and login
* Maintain profile details
* Change password
* Ask questions
* View personal search history

This makes the platform suitable for company-wide usage.

---

### Admin Console

DocAI includes a separate admin console for managing the platform.

Admins can:

* View users
* Monitor searches
* Track document downloads
* Review low-confidence answers
* View system logs
* Analyze knowledge quality

Default demo admin credentials:

```text
Username: DocAIadmin
Password: qwert12345
```

---

### Knowledge Quality Management

DocAI is designed to be more than a simple vector search system. It helps organizations maintain the quality of their knowledge base.

Knowledge quality features include:

* Source-of-truth ranking
* Duplicate document detection
* Conflict detection
* Knowledge gap detection
* Review queue for low-confidence answers

These features help companies keep their document knowledge clean, trusted, and easier to manage.

---

## System Architecture

```text
User / Admin
↓
React Frontend
↓
FastAPI Backend
↓
Document Processing Pipeline
↓
Text Extraction and Chunking
↓
Retrieval Engine
↓
LLM Reasoning
↓
Citation-Backed Answer
```

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Axios
* Vercel

### Backend

* Python
* FastAPI
* Uvicorn
* Gemini API
* Local JSON storage
* Local document storage
* ngrok for backend tunneling during demo

---

## Main Use Case

DocAI is useful for companies that manage large document repositories such as:

* HR policies
* IT manuals
* Finance documents
* Legal files
* Employee handbooks
* Project reports
* Training materials
* Internal knowledge documents

Instead of opening multiple files manually, employees can ask DocAI and receive the right information with source proof.

---

## Project Status

Current implementation includes:

* Document upload
* Document-based question answering
* Citation display
* Original document download
* Auto FAQ generation
* Taxonomy tag generation
* User login and signup
* Admin login
* User search history
* Review queue
* Knowledge quality dashboard
* Vercel frontend deployment
* FastAPI backend with ngrok support



