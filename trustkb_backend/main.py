from __future__ import annotations

import hashlib
import json
import re
import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, Query, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.auth_helper import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin,
    get_optional_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
    get_user_by_identifier,
    can_view_document,
    can_ask_document,
    can_download_document,
    can_edit_document,
    can_delete_document,
    require_admin,
)
from app.chunker import build_chunks
from app.config import UPLOAD_DIR, settings
from app.document_loader import extract_document_text, validate_file_extension
from app.knowledge_generator import (
    generate_document_intelligence,
    format_structured_document_log,
    generate_document_profile,
    generate_section_summaries,
)
from app.models import (
    AskRequest,
    AskResponse,
    UploadResponse,
    UploadDiagnostics,
    DocumentMetadataPatch,
    SignupRequest,
    LoginRequest,
    AdminLoginRequest,
    UserResponseItem,
    AuthTokenResponse,
    ProfileUpdateRequest,
    PasswordChangeRequest,
    AdminUserPatch,
    AdminResetPasswordRequest,
    UserCredentialsUpdateRequest,
    SystemSettingsResponse,
    SystemSettingsPatch,
    ApproveDocumentRequest,
    RejectDocumentRequest,
)
from app.rag_engine import answer_question
from app.storage import storage, read_system_settings, write_system_settings, get_default_system_settings
from app.utils import clean_text, new_id, slugify, utc_now
from app.vector_store import vector_store


app = FastAPI(
    title="DocAI",
    description="Agentic RAG Knowledge Base Backend with citations, reasoning, confidence scoring, FAQs, tags, logs, and review queue.",
    version="1.0.0",
)


# ------------------------------------------------------------
# CORS FIX FOR LOCALHOST + VERCEL + NGROK DEMO
# ------------------------------------------------------------
# This allows the frontend to communicate with the backend.
# It supports localhost, Vercel deployment, and ngrok URLs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ------------------------------------------------------------
# SMALL LOCAL HELPERS
# ------------------------------------------------------------

def safe_json_write(path: Path, data) -> None:
    """
    Safely writes JSON data to disk.
    This is used when deleting one search-history item.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = path.with_suffix(path.suffix + ".tmp")
    with temp_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    temp_path.replace(path)


def short_evidence(text: str, max_chars: int = 240) -> str:
    """
    Creates a short preview snippet from a larger text chunk.
    """
    cleaned = " ".join((text or "").split())
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[:max_chars].rstrip() + "..."


# ------------------------------------------------------------
# STARTUP HELPERS
# ------------------------------------------------------------

def ensure_default_admin_user() -> None:
    """
    Ensures the default demo admin account exists if no admin accounts exist.

    Username: DocAIadmin
    Password: qwert12345
    """
    try:
        if not hasattr(storage, "read_users") or not hasattr(storage, "write_users"):
            return

        users = storage.read_users()
        any_admin = any(u.get("role") == "admin" for u in users)
        if not any_admin:
            now = utc_now()
            default_username = "DocAIadmin"
            default_password = "qwert12345"
            hashed_pw = hash_password(default_password)
            
            admin_data = {
                "user_id": f"admin_{uuid.uuid4().hex[:12]}",
                "id": f"admin_{uuid.uuid4().hex[:12]}",
                "name": "DocAI Administrator",
                "full_name": "DocAI Administrator",
                "username": default_username,
                "email": "admin@docai.local",
                "password_hash": hashed_pw,
                "role": "admin",
                "department": "Administration",
                "designation": "System Administrator",
                "title": "System Administrator",
                "status": "active",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
                "last_login_at": None,
                "last_login": None,
                "avatar_initials": "DA",
                "must_change_password": False,
                "access_groups": ["all_employees", "administration", "management", "confidential_reviewers"],
            }
            users.append(admin_data)
            storage.write_users(users)

    except Exception as exc:
        try:
            storage.add_log(
                "default_admin_setup_failed",
                "Failed to create default admin account.",
                {"error": str(exc)},
            )
        except Exception:
            pass


def run_quality_update_safely() -> None:
    """
    Runs document quality update in the background.
    This prevents Uvicorn from getting stuck at:
    'Waiting for application startup.'
    """
    try:
        from app.quality import update_all_documents_metadata_and_scores

        update_all_documents_metadata_and_scores()
    except Exception as exc:
        try:
            storage.add_log(
                "quality_startup_update_failed",
                "Startup quality update failed.",
                {"error": str(exc)},
            )
        except Exception:
            pass


@app.on_event("startup")
def startup_event():
    ensure_default_admin_user()
    threading.Thread(target=run_quality_update_safely, daemon=True).start()


# ------------------------------------------------------------
# BASIC ROUTES
# ------------------------------------------------------------

@app.get("/")
def root():
    return {
        "app": settings.app_name,
        "message": "DocAI backend is running.",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "message": "Backend is ready.",
    }


@app.options("/{full_path:path}")
def preflight_handler(full_path: str):
    return {
        "status": "ok",
        "path": full_path,
    }


# ------------------------------------------------------------
# FAST FALLBACK FOR SUMMARY / FAQ / TAG GENERATION
# ------------------------------------------------------------

def build_local_document_intelligence(original_name: str, full_text: str) -> dict:
    """
    Fast local fallback generator for summary, FAQs, and tags.
    This prevents upload from getting stuck if Gemini/API is slow or fails.
    """
    text = clean_text(full_text or "")
    text_len = len(text)
    
    clean_name = original_name.rsplit(".", 1)[0]
    # Clean up standard GUID prefixes if present (e.g. doc_xxxxx_)
    clean_name = re.sub(r"^doc_[a-f0-9]{12}_", "", clean_name)
    clean_name = clean_name.replace("_", " ").replace("-", " ").strip()
    
    # Check if text extraction was weak
    is_weak = text_len < 100
    
    # 1. Summary
    if is_weak:
        summary = (
            f"This document '{original_name}' has been successfully indexed in DocAI. "
            "However, limited readable text could be extracted, so semantic search and full summaries are constrained."
        )
    else:
        # Get first few sentences
        sentences = re.split(r"(?<=[.!?])\s+", text[:2500])
        useful_sentences = [
            s.strip()
            for s in sentences
            if len(s.strip()) > 35 and not any(w in s.lower() for w in ["javascript", "css", "html", "http", "www"])
        ]
        if len(useful_sentences) >= 2:
            summary = " ".join(useful_sentences[:3])
            if len(summary) > 750:
                summary = summary[:747] + "..."
        else:
            summary = (
                f"This document discusses topics related to {clean_name}. "
                f"It contains sections of reference information extracted from the original file."
            )
            
    # 2. Extract keywords for FAQs and Tags
    stopwords = {
        "this", "that", "with", "from", "have", "will", "your", "about",
        "there", "their", "which", "when", "were", "been", "into", "than",
        "then", "them", "they", "and", "the", "for", "are", "was", "you",
        "can", "not", "all", "any", "use", "used", "using", "document",
        "page", "file", "pdf", "docx", "txt", "what", "where", "while",
        "also", "such", "these", "those", "more", "most", "some", "only",
        "shall", "should", "must", "other", "their", "would", "could", "here",
        "been", "each", "both", "same", "than", "upon", "under", "over", "into"
    }

    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9-]{3,}\b", text.lower())
    freq: dict[str, int] = {}
    for word in words:
        if word not in stopwords and len(word) > 3:
            freq[word] = freq.get(word, 0) + 1

    top_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    detected_keywords = [word.title() for word, _ in top_words[:12]]
    
    # 3. FAQs (5 useful FAQs)
    # Generate questions using detected keywords and document name
    kw1 = detected_keywords[0] if len(detected_keywords) > 0 else "Details"
    kw2 = detected_keywords[1] if len(detected_keywords) > 1 else "Policies"
    kw3 = detected_keywords[2] if len(detected_keywords) > 2 else "Requirements"
    kw4 = detected_keywords[3] if len(detected_keywords) > 3 else "Procedures"
    
    faqs = [
        f"What is the primary scope and objective of the {clean_name} document?",
        f"What does this document state regarding {kw1} and associated guidelines?",
        f"Are there specific rules, deadlines, or {kw2} outlined in this reference?",
        f"Who is the main audience or department responsible for {kw3}?",
        f"What are the standard operational steps or {kw4} described here?"
    ]
    
    # 4. Tags (6-10 relevant tags)
    tags = []
    # Add domain specific tags based on keywords/document name
    lower_text = text.lower() + " " + original_name.lower()
    if "leave" in lower_text or "holiday" in lower_text or "vacation" in lower_text:
        tags.extend(["HR Policy", "Leave Management", "Employee Benefits"])
    if "onboard" in lower_text or "welcome" in lower_text or "training" in lower_text:
        tags.extend(["Onboarding", "HR Onboarding", "Employee Training"])
    if "support" in lower_text or "it " in lower_text or "helpdesk" in lower_text or "password" in lower_text or "system" in lower_text:
        tags.extend(["IT Support", "Helpdesk", "Systems Policy"])
    if "reimburse" in lower_text or "expense" in lower_text or "finance" in lower_text or "travel" in lower_text:
        tags.extend(["Finance", "Reimbursement", "Expense Policy"])
    if "security" in lower_text or "privacy" in lower_text or "confidential" in lower_text:
        tags.extend(["Security Policy", "Compliance", "Data Privacy"])
    if "engineering" in lower_text or "code" in lower_text or "developer" in lower_text or "api" in lower_text:
        tags.extend(["Engineering", "Technical Docs", "API Guide"])

    # Add keywords
    tags.extend(detected_keywords)
    # Filter out tags that are just file extensions or too generic
    extensions_to_filter = {"Pdf", "Docx", "Txt", "Doc", "Xls", "Xlsx", "Ppt", "Pptx", "File", "Page", "Document"}
    tags = [t for t in tags if t not in extensions_to_filter and len(t) > 2]
    
    # Deduplicate and limit to 6-10 tags
    unique_tags = list(dict.fromkeys(tags))
    if len(unique_tags) < 6:
        # Pad with some general tags if needed
        general_tags = ["Knowledge Library", "Corporate Info", "Internal Reference", "Operations", "Policy Manual"]
        for gt in general_tags:
            if gt not in unique_tags:
                unique_tags.append(gt)
                if len(unique_tags) >= 8:
                    break
    
    generated_tags = unique_tags[:10]
    
    return {
        "summary": summary,
        "generated_faqs": faqs,
        "generated_tags": generated_tags
    }


def safe_generate_document_intelligence(original_name: str, full_text: str) -> dict:
    """
    Attempts AI generation, but falls back quickly if it is slow or fails.
    This prevents the frontend from rotating forever during upload.
    """
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(generate_document_intelligence, original_name, full_text)

    try:
        # Short timeout for API generation to not block upload
        result = future.result(timeout=8)

        if not isinstance(result, dict):
            raise ValueError("Invalid intelligence result format")

        result.setdefault("summary", "")
        result.setdefault("generated_faqs", [])
        result.setdefault("generated_tags", [])

        if (
            not result["summary"]
            or not isinstance(result["generated_faqs"], list)
            or not isinstance(result["generated_tags"], list)
        ):
            raise ValueError("Incomplete intelligence result")

        return result

    except FutureTimeoutError:
        return build_local_document_intelligence(original_name, full_text)

    except Exception:
        return build_local_document_intelligence(original_name, full_text)

    finally:
        executor.shutdown(wait=False, cancel_futures=True)


# ------------------------------------------------------------
# DOCUMENT PROCESSING
# ------------------------------------------------------------

def calculate_file_hash(filepath: Path) -> str:
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def process_and_index_document(
    filepath: Path,
    original_name: str,
    document_id: str,
    extension: str,
    file_hash: str,
) -> dict:
    pages = extract_document_text(filepath)
    full_text = clean_text("\n\n".join(page["text"] for page in pages))
    text_len = len(full_text)

    # Compute content_hash
    if full_text.strip():
        content_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
    else:
        sha = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha.update(chunk)
        content_hash = sha.hexdigest()

    existing_docs = storage.read_documents()
    duplicate_doc = None
    for doc in existing_docs:
        if doc.get("document_id") != document_id and doc.get("content_hash") == content_hash:
            duplicate_doc = doc
            break
        if (
            doc.get("document_id") != document_id
            and doc.get("document") == original_name
            and doc.get("extracted_text_length") == text_len
            and text_len > 0
        ):
            duplicate_doc = doc
            break

    if duplicate_doc:
        try:
            if filepath.exists():
                filepath.unlink()
        except Exception:
            pass

        # If placeholder exists, delete it so we don't have duplicates
        docs = storage.read_documents()
        updated_docs = [d for d in docs if d.get("document_id") != document_id]
        storage.write_documents(updated_docs)

        return {
            "document_id": duplicate_doc["document_id"],
            "document": duplicate_doc["document"],
            "status": duplicate_doc.get("status", "processed"),
            "summary": duplicate_doc.get("summary", ""),
            "generated_faqs": duplicate_doc.get("generated_faqs", []),
            "generated_tags": duplicate_doc.get("generated_tags", []),
            "chunks_created": duplicate_doc.get("chunks_created", 0),
            "vector_status": duplicate_doc.get("vector_status", "stored"),
            "structured_log": duplicate_doc.get("structured_log", ""),
            "diagnostics": duplicate_doc.get("diagnostics"),
            "duplicate_detected": True,
            "existing_document_id": duplicate_doc["document_id"],
            "message": "This document already exists in the knowledge base.",
        }

    warning = None
    doc_status = "processed"

    if text_len < 500:
        warning = "Limited readable text was extracted from this document. It may be scanned, image-based, or code-formatted PDF."
        doc_status = "processed_with_warning"

    chunks = build_chunks(
        document_id=document_id,
        document_name=original_name,
        pages=pages,
    )

    if not chunks:
        raise ValueError("Document text was extracted, but no valid chunks could be created.")

    vector_store.add_chunks(chunks)

    intelligence = safe_generate_document_intelligence(original_name, full_text)
    summary = intelligence["summary"]
    generated_faqs = intelligence["generated_faqs"]
    generated_tags = intelligence["generated_tags"]

    structured_log = format_structured_document_log(
        original_name,
        summary,
        generated_faqs,
        generated_tags,
    )

    if warning:
        structured_log = (
            f"WARNING: Text extraction was limited (length: {text_len}). "
            f"This document may be scanned or image-based.\n\n"
            + structured_log
        )

    diagnostics = {
        "extracted_text_length": text_len,
        "chunks_created": len(chunks),
        "indexed": False,
        "sample_extracted_text": full_text[:700],
        "warning": warning,
    }

    # Build doc_map
    sections = []
    for page in pages:
        p_num = int(page["page"])
        for unit in page.get("text_units", []):
            sec_heading = unit.get("section_heading", "General")
            existing_sec = next((s for s in sections if s["heading"] == sec_heading), None)
            if existing_sec:
                existing_sec["page_end"] = max(existing_sec["page_end"], p_num)
                existing_sec["line_end"] = max(existing_sec["line_end"], unit.get("line_end", 1))
            else:
                sections.append({
                    "heading": sec_heading,
                    "page_start": p_num,
                    "page_end": p_num,
                    "line_start": unit.get("line_start", 1),
                    "line_end": unit.get("line_end", 1)
                })

    doc_map = {
        "title": original_name,
        "pages": len(pages),
        "sections": sections,
        "extracted_text_length": text_len,
        "extraction_quality_score": round(max(0.0, min(1.0, text_len / max(1, filepath.stat().st_size))), 4) if filepath.exists() else 1.0
    }

    # Generate document profile
    section_headings = [s["heading"] for s in sections]
    doc_profile = generate_document_profile(
        document_id=document_id,
        document_name=original_name,
        full_text=full_text,
        page_count=len(pages),
        section_headings=section_headings
    )

    document_record = {
        "document_id": document_id,
        "document": original_name,
        "stored_filename": filepath.name,
        "file_type": extension.replace(".", ""),
        "uploaded_at": utc_now(),
        "summary": summary,
        "generated_faqs": generated_faqs,
        "generated_tags": generated_tags,
        "chunks_created": len(chunks),
        "vector_status": "stored",
        "structured_log": structured_log,
        "file_hash": file_hash,
        "content_hash": content_hash,
        "diagnostics": diagnostics,
        "warning": warning,
        "extracted_text_length": text_len,
        "doc_map": doc_map,
        "document_profile": doc_profile
    }

    # If placeholder exists, update it, otherwise add it.
    docs = storage.read_documents()
    existing_doc = next((d for d in docs if d.get("document_id") == document_id), None)
    if existing_doc:
        # Preserve access control and owner metadata
        document_record["status"] = existing_doc.get("status", "pending")
        document_record["visibility"] = existing_doc.get("visibility", "private")
        document_record["allowed_groups"] = existing_doc.get("allowed_groups", [])
        document_record["allowed_departments"] = existing_doc.get("allowed_departments", [])
        document_record["allow_download"] = existing_doc.get("allow_download", False)
        document_record["download_allowed_roles"] = existing_doc.get("download_allowed_roles", [])
        document_record["owner_user_id"] = existing_doc.get("owner_user_id", "system")
        document_record["owner_username"] = existing_doc.get("owner_username", "System")
        document_record["owner_department"] = existing_doc.get("owner_department", "General")
        document_record["uploaded_by_role"] = existing_doc.get("uploaded_by_role", "admin")
        document_record["rejection_reason"] = existing_doc.get("rejection_reason")
        document_record["approved_by"] = existing_doc.get("approved_by")
        document_record["approved_at"] = existing_doc.get("approved_at")
        document_record["created_at"] = existing_doc.get("created_at") or existing_doc.get("uploaded_at") or utc_now()
        document_record["updated_at"] = utc_now()
        document_record["id"] = existing_doc.get("id") or document_id
        document_record["filename"] = existing_doc.get("filename") or original_name
        document_record["original_filename"] = existing_doc.get("original_filename") or original_name
    else:
        document_record["status"] = "approved"
        document_record["visibility"] = "public"
        document_record["allowed_groups"] = ["all_employees"]
        document_record["allowed_departments"] = []
        document_record["allow_download"] = False
        document_record["download_allowed_roles"] = []
        document_record["owner_user_id"] = "system"
        document_record["owner_username"] = "System"
        document_record["owner_department"] = "General"
        document_record["uploaded_by_role"] = "admin"
        document_record["rejection_reason"] = None
        document_record["approved_by"] = None
        document_record["approved_at"] = None
        document_record["created_at"] = utc_now()
        document_record["updated_at"] = utc_now()
        document_record["id"] = document_id
        document_record["filename"] = original_name
        document_record["original_filename"] = original_name

    if existing_doc:
        storage.update_document_metadata(document_id, document_record)
    else:
        storage.add_document(document_record)

    try:
        from app.quality import update_all_documents_metadata_and_scores
        update_all_documents_metadata_and_scores()
    except Exception:
        pass

    docs_db = storage.read_documents()
    chunks_db = storage.read_chunks()

    is_doc_in_db = any(d.get("document_id") == document_id for d in docs_db)
    is_chunks_in_db = any(c.get("document_id") == document_id for c in chunks_db)

    diagnostics["indexed"] = is_doc_in_db and is_chunks_in_db

    return {
        "document_id": document_id,
        "document": original_name,
        "status": document_record["status"],
        "summary": summary,
        "generated_faqs": generated_faqs,
        "generated_tags": generated_tags,
        "chunks_created": len(chunks),
        "vector_status": "stored",
        "structured_log": structured_log,
    }


def process_and_index_background_task(
    filepath: Path,
    original_name: str,
    document_id: str,
    extension: str,
    file_hash: str
):
    try:
        process_and_index_document(
            filepath=filepath,
            original_name=original_name,
            document_id=document_id,
            extension=extension,
            file_hash=file_hash
        )
    except Exception as exc:
        storage.add_log(
            "document_processing_failed",
            "Background document processing failed.",
            {
                "document_id": document_id,
                "document": original_name,
                "error": str(exc),
            },
        )
        storage.update_document_metadata(document_id, {
            "vector_status": "failed",
            "structured_log": f"Processing failed: {exc}",
            "warning": f"Processing failed: {exc}"
        })


@app.post("/upload", response_model=UploadResponse)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        extension = validate_file_extension(file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    document_id = new_id("doc")
    safe_name = f"{document_id}_{slugify(Path(file.filename or 'document').stem)}{extension}"
    saved_path = UPLOAD_DIR / safe_name
    original_name = file.filename or safe_name

    try:
        with saved_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_hash = calculate_file_hash(saved_path)

        # Check duplicate before starting processing
        existing_docs = storage.read_documents()
        duplicate_doc = None
        for doc in existing_docs:
            if doc.get("file_hash") == file_hash:
                duplicate_doc = doc
                break

        if duplicate_doc:
            try:
                if saved_path.exists():
                    saved_path.unlink()
            except Exception:
                pass

            storage.add_log(
                "document_upload_duplicate_skipped",
                "Document upload skipped because it already exists.",
                {
                    "document_id": duplicate_doc["document_id"],
                    "document": duplicate_doc["document"],
                },
            )

            return UploadResponse(
                document_id=duplicate_doc["document_id"],
                document=duplicate_doc["document"],
                status=duplicate_doc.get("status", "approved"),
                summary=duplicate_doc.get("summary", ""),
                generated_faqs=duplicate_doc.get("generated_faqs", []),
                generated_tags=duplicate_doc.get("generated_tags", []),
                chunks_created=duplicate_doc.get("chunks_created", 0),
                vector_status=duplicate_doc.get("vector_status", "stored"),
                structured_log=duplicate_doc.get("structured_log", ""),
                duplicate_detected=True,
                existing_document_id=duplicate_doc["document_id"],
                message="This document already exists in the knowledge base."
            )

        is_admin = current_user.get("role") == "admin"

        if is_admin:
            storage.add_log(
                "document_uploaded",
                "Document uploaded successfully. Queued for indexing.",
                {
                    "document_id": document_id,
                    "document": original_name,
                    "saved_path": str(saved_path),
                    "uploaded_by": current_user.get("username")
                },
            )
        else:
            storage.add_log(
                "document_submitted_for_review",
                "Employee document uploaded and submitted for admin review.",
                {
                    "document_id": document_id,
                    "document": original_name,
                    "saved_path": str(saved_path),
                    "uploaded_by": current_user.get("username")
                },
            )

        # Add placeholder document with access control properties
        placeholder = {
            "document_id": document_id,
            "id": document_id,
            "document": original_name,
            "filename": original_name,
            "original_filename": original_name,
            "stored_filename": saved_path.name,
            "file_type": extension.replace(".", ""),
            "uploaded_at": utc_now(),
            "status": "approved" if is_admin else "pending",
            "visibility": "public" if is_admin else "private",
            "allowed_groups": ["all_employees"] if is_admin else [],
            "allowed_departments": [],
            "allow_download": False,
            "download_allowed_roles": [],
            "owner_user_id": current_user.get("user_id"),
            "owner_username": current_user.get("username"),
            "owner_department": current_user.get("department", "General"),
            "uploaded_by_role": current_user.get("role", "employee"),
            "rejection_reason": None,
            "approved_by": None,
            "approved_at": None,
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "summary": "Processing document intelligence...",
            "generated_faqs": [],
            "generated_tags": [],
            "chunks_created": 0,
            "vector_status": "processing",
            "structured_log": "Indexing queued in background...",
            "file_hash": file_hash,
            "content_hash": "",
            "extracted_text_length": 0,
            "diagnostics": {
                "extracted_text_length": 0,
                "chunks_created": 0,
                "indexed": False,
                "sample_extracted_text": "",
                "warning": None
            }
        }
        storage.add_document(placeholder)

        # Add background task
        background_tasks.add_task(
            process_and_index_background_task,
            filepath=saved_path,
            original_name=original_name,
            document_id=document_id,
            extension=extension,
            file_hash=file_hash
        )

        return UploadResponse(
            document_id=document_id,
            document=original_name,
            status="approved" if is_admin else "pending",
            summary="Processing document intelligence in the background...",
            generated_faqs=[],
            generated_tags=[],
            chunks_created=0,
            vector_status="processing",
            structured_log="Indexing queued...",
            message="Document uploaded successfully." if is_admin else "Your document will be submitted for admin review before becoming available in company search.",
            duplicate_detected=False
        )

    except Exception as exc:
        storage.add_log(
            "document_processing_failed",
            "Document processing failed during upload.",
            {
                "document_id": document_id,
                "document": original_name,
                "error": str(exc),
            },
        )
        raise HTTPException(status_code=500, detail=f"Document processing failed: {exc}")


@app.post("/sync-uploads")
def sync_uploads(force: bool = Query(False), current_admin: dict = Depends(get_current_admin)):
    storage.add_log("sync_started", "Upload folder sync started.")

    try:
        existing_docs = storage.read_documents()
        processed_documents = []
        skipped_documents = []
        failed_documents = []

        files = list(UPLOAD_DIR.iterdir()) if UPLOAD_DIR.exists() else []

        for filepath in files:
            if filepath.is_dir():
                continue

            extension = filepath.suffix.lower()
            if extension not in {".pdf", ".docx", ".txt"}:
                continue

            filename = filepath.name

            try:
                file_hash = calculate_file_hash(filepath)
            except Exception as exc:
                failed_documents.append(
                    {
                        "document": filename,
                        "error": f"Failed to compute file hash: {exc}",
                    }
                )
                continue

            dup_record = None
            for doc in existing_docs:
                if (
                    doc.get("stored_filename") == filename
                    or doc.get("document") == filename
                    or doc.get("file_hash") == file_hash
                ):
                    dup_record = doc
                    break

            if dup_record:
                if not force:
                    storage.add_log(
                        "sync_skipped",
                        "Document already indexed. Skipping.",
                        {"document": filename},
                    )
                    skipped_documents.append(
                        {
                            "document": dup_record.get("document", filename),
                            "reason": "Already indexed",
                        }
                    )
                    continue

                storage.delete_document_and_chunks(dup_record.get("document"))
                existing_docs = storage.read_documents()

            document_id = new_id("doc")
            original_name = filename

            if not filename.startswith("doc_"):
                safe_name = f"{document_id}_{slugify(filepath.stem)}{extension}"
                new_path = UPLOAD_DIR / safe_name

                try:
                    filepath.rename(new_path)
                    filepath = new_path
                    filename = safe_name
                except Exception as exc:
                    failed_documents.append(
                        {
                            "document": original_name,
                            "error": f"Failed to rename file: {exc}",
                        }
                    )
                    continue

            try:
                res = process_and_index_document(
                    filepath=filepath,
                    original_name=original_name if not dup_record else dup_record.get("document", original_name),
                    document_id=document_id,
                    extension=extension,
                    file_hash=file_hash,
                )

                processed_documents.append(
                    {
                        "document_id": document_id,
                        "document": res["document"],
                        "status": res["status"],
                        "summary": res["summary"],
                        "generated_faqs": res["generated_faqs"],
                        "generated_tags": res["generated_tags"],
                        "chunks_created": res["chunks_created"],
                        "vector_status": res["vector_status"],
                        "diagnostics": res["diagnostics"],
                    }
                )

                storage.add_log(
                    "document_synced",
                    "Document synced from uploads folder.",
                    {
                        "document_id": document_id,
                        "document": res["document"],
                        "stored_filename": filepath.name,
                    },
                )

            except Exception as exc:
                failed_documents.append(
                    {
                        "document": original_name,
                        "error": str(exc),
                    }
                )

        try:
            from app.quality import update_all_documents_metadata_and_scores

            update_all_documents_metadata_and_scores()
        except Exception:
            pass

        storage.add_log(
            "sync_completed",
            "Upload folder sync completed.",
            {
                "processed_count": len(processed_documents),
                "skipped_count": len(skipped_documents),
                "failed_count": len(failed_documents),
            },
        )

        return {
            "status": "completed",
            "processed_count": len(processed_documents),
            "skipped_count": len(skipped_documents),
            "failed_count": len(failed_documents),
            "processed_documents": processed_documents,
            "skipped_documents": skipped_documents,
            "failed_documents": failed_documents,
        }

    except Exception as exc:
        storage.add_log(
            "sync_failed",
            "Upload folder sync failed.",
            {"error": str(exc)},
        )
        raise HTTPException(status_code=500, detail=f"Upload folder sync failed: {exc}")


# ------------------------------------------------------------
# DELETE AND CLEANUP ROUTES
# ------------------------------------------------------------

@app.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
):
    docs = storage.read_documents()
    target_doc = None
    updated_docs = []

    for doc in docs:
        if doc.get("document_id") == document_id:
            target_doc = doc
        else:
            updated_docs.append(doc)

    if not target_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not can_delete_document(current_user, target_doc):
        storage.add_log(
            "unauthorized_document_access_attempt",
            f"Unauthorized delete attempt for document '{target_doc.get('document')}' by user '{current_user.get('username')}'",
            {
                "document_id": document_id,
                "user_id": current_user.get("user_id"),
                "username": current_user.get("username")
            }
        )
        raise HTTPException(status_code=403, detail="Delete access denied.")

    # Cascade deletes:
    # 1. Delete original file from uploads directory
    stored_filename = target_doc.get("stored_filename")
    if stored_filename:
        file_path = UPLOAD_DIR / stored_filename
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            storage.add_log(
                "document_file_delete_failed",
                f"Failed to delete file from disk: {e}",
                {"document_id": document_id, "stored_filename": stored_filename},
            )

    # 2. Delete chunks
    chunks = storage.read_chunks()
    updated_chunks = [
        c
        for c in chunks
        if c.get("document_id") != document_id
        and c.get("document") != target_doc.get("document")
    ]
    storage.write_chunks(updated_chunks)

    # 3. Delete reviews
    reviews = storage.read_reviews()
    updated_reviews = []
    for r in reviews:
        if r.get("document_id") == document_id:
            continue
        sources = r.get("retrieved_sources", [])
        if any(s.get("document_id") == document_id for s in sources):
            continue
        updated_reviews.append(r)
    storage.write_reviews(updated_reviews)

    # 4. Save updated documents
    storage.write_documents(updated_docs)

    # 5. Trigger metric recalculation
    try:
        from app.quality import update_all_documents_metadata_and_scores

        update_all_documents_metadata_and_scores()
    except Exception:
        pass

    storage.add_log(
        "document_deleted",
        "Document deleted successfully.",
        {
            "document_id": document_id,
            "document": target_doc.get("document"),
            "deleted_by": current_user.get("username"),
        },
    )

    return {
        "status": "success",
        "message": "Document and all associated data deleted successfully.",
    }


@app.delete("/faqs/{document_id}")
def delete_faqs(
    document_id: str,
    current_user: dict = Depends(get_current_user),
):
    docs = storage.read_documents()
    target_doc = None

    for doc in docs:
        if doc.get("document_id") == document_id:
            doc["generated_faqs"] = []
            target_doc = doc
            break

    if not target_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    storage.write_documents(docs)

    storage.add_log(
        "document_faqs_cleared",
        "Document FAQs cleared successfully.",
        {
            "document_id": document_id,
            "document": target_doc.get("document"),
            "cleared_by": current_user.get("username"),
        },
    )

    return {"status": "success", "message": "Document FAQs cleared successfully."}


@app.delete("/tags/{document_id}")
def delete_tags(
    document_id: str,
    current_user: dict = Depends(get_current_user),
):
    docs = storage.read_documents()
    target_doc = None

    for doc in docs:
        if doc.get("document_id") == document_id:
            doc["generated_tags"] = []
            target_doc = doc
            break

    if not target_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    storage.write_documents(docs)

    # Trigger metric recalculation
    try:
        from app.quality import update_all_documents_metadata_and_scores

        update_all_documents_metadata_and_scores()
    except Exception:
        pass

    storage.add_log(
        "document_tags_cleared",
        "Document tags cleared successfully.",
        {
            "document_id": document_id,
            "document": target_doc.get("document"),
            "cleared_by": current_user.get("username"),
        },
    )

    return {"status": "success", "message": "Document tags cleared successfully."}


@app.post("/admin/cleanup-duplicates")
def cleanup_duplicates(
    current_admin: dict = Depends(get_current_admin),
):
    docs = storage.read_documents()
    groups = {}

    for doc in docs:
        doc_id = doc.get("document_id")
        content_hash = doc.get("content_hash")
        doc_name = doc.get("document")
        text_len = doc.get("extracted_text_length") or doc.get("diagnostics", {}).get(
            "extracted_text_length", 0
        )

        if content_hash:
            key = f"hash:{content_hash}"
        elif doc_name and text_len:
            key = f"fallback:{doc_name}_{text_len}"
        else:
            key = f"unique:{doc_id}"

        groups.setdefault(key, []).append(doc)

    duplicate_docs = []
    for key, group in groups.items():
        if len(group) > 1:
            group.sort(
                key=lambda d: (d.get("uploaded_at") or "", d.get("document_id") or "")
            )
            for dup in group[1:]:
                duplicate_docs.append(dup)

    if not duplicate_docs:
        return {
            "status": "success",
            "message": "No duplicates found.",
            "deleted_count": 0,
            "deleted_documents": [],
        }

    duplicate_ids = {d["document_id"] for d in duplicate_docs}
    duplicate_names = {d["document"] for d in duplicate_docs}

    # 1. Delete original files from disk
    for doc in duplicate_docs:
        stored_filename = doc.get("stored_filename")
        if stored_filename:
            file_path = UPLOAD_DIR / stored_filename
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                print(f"Error unlinking {file_path}: {e}")

    # 2. Delete chunks
    chunks = storage.read_chunks()
    updated_chunks = [
        c
        for c in chunks
        if c.get("document_id") not in duplicate_ids
        and c.get("document") not in duplicate_names
    ]
    storage.write_chunks(updated_chunks)

    # 3. Delete reviews
    reviews = storage.read_reviews()
    updated_reviews = []
    for r in reviews:
        if r.get("document_id") in duplicate_ids:
            continue
        sources = r.get("retrieved_sources", [])
        if any(s.get("document_id") in duplicate_ids for s in sources):
            continue
        updated_reviews.append(r)
    storage.write_reviews(updated_reviews)

    # 4. Save updated documents
    updated_docs = [doc for doc in docs if doc.get("document_id") not in duplicate_ids]
    storage.write_documents(updated_docs)

    # 5. Trigger metric recalculation
    try:
        from app.quality import update_all_documents_metadata_and_scores

        update_all_documents_metadata_and_scores()
    except Exception:
        pass

    storage.add_log(
        "admin_duplicates_cleaned",
        f"Cleaned up {len(duplicate_docs)} duplicate documents.",
        {
            "deleted_count": len(duplicate_docs),
            "deleted_ids": list(duplicate_ids),
            "cleaned_by": current_admin.get("username"),
        },
    )

    return {
        "status": "success",
        "message": f"Successfully cleaned up {len(duplicate_ids)} duplicate documents.",
        "deleted_count": len(duplicate_ids),
        "deleted_documents": [
            {"document_id": d["document_id"], "document": d["document"]}
            for d in duplicate_docs
        ],
    }


# ------------------------------------------------------------
# DEBUG + DOCUMENT ROUTES
# ------------------------------------------------------------

@app.get("/debug-paths")
def debug_paths():
    files = []

    if UPLOAD_DIR.exists():
        for f in UPLOAD_DIR.iterdir():
            if f.is_file():
                files.append(
                    {
                        "file": f.name,
                        "suffix": f.suffix,
                        "size_bytes": f.stat().st_size,
                    }
                )

    return {
        "upload_dir": str(UPLOAD_DIR),
        "upload_files": files,
        "documents_count": len(storage.read_documents()),
        "chunks_count": len(storage.read_chunks()),
    }


@app.get("/documents/{document_id}/chunks")
def get_document_chunks(document_id: str):
    docs = storage.read_documents()
    doc_name = "Unknown"

    for d in docs:
        if d.get("document_id") == document_id:
            doc_name = d.get("document", "Unknown")
            break

    all_chunks = storage.read_chunks()
    doc_chunks = []

    for c in all_chunks:
        if c.get("document_id") == document_id:
            doc_chunks.append(
                {
                    "chunk_id": c.get("chunk_id"),
                    "document": c.get("document", doc_name),
                    "page": c.get("page"),
                    "chunk_index": c.get("chunk_index"),
                    "text": c.get("text"),
                    "preview": c.get("preview"),
                }
            )

    return {
        "document_id": document_id,
        "document": doc_name,
        "chunks": doc_chunks,
        "count": len(doc_chunks),
    }


@app.get("/find-in-documents")
def find_in_documents(keyword: str):
    all_chunks = storage.read_chunks()
    matches = []
    kw_lower = keyword.lower()

    for c in all_chunks:
        if kw_lower in c.get("text", "").lower() or kw_lower in c.get("document", "").lower():
            matches.append(
                {
                    "document_id": c.get("document_id"),
                    "document": c.get("document"),
                    "chunk_id": c.get("chunk_id"),
                    "page": c.get("page"),
                    "preview": c.get("preview") or short_evidence(c.get("text", ""), 220),
                }
            )

    return {
        "keyword": keyword,
        "matches": matches,
        "count": len(matches),
    }


@app.get("/search-debug")
def search_debug(query: str, top_k: int = 10):
    from app.rag_engine import expand_query

    expanded = expand_query(query)
    retrieved = vector_store.search(expanded, top_k=top_k)

    results = []

    for r in retrieved:
        results.append(
            {
                "document_id": r.get("document_id"),
                "document": r.get("document"),
                "page": r.get("page"),
                "chunk_id": r.get("chunk_id"),
                "similarity_score": r.get("similarity_score", 0.0),
                "ranking_score": r.get("ranking_score", 0.0),
                "evidence": r.get("preview") or short_evidence(r.get("text", ""), 650),
            }
        )

    return {
        "query": query,
        "expanded_query": expanded,
        "results": results,
    }


# ------------------------------------------------------------
# ASK + DASHBOARD
# ------------------------------------------------------------

@app.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest, user: dict = Depends(get_current_user)):
    if request.selected_document_id:
        doc = next((d for d in storage.read_documents() if d.get("document_id") == request.selected_document_id), None)
        if not doc or not can_ask_document(user, doc):
            storage.add_log(
                "unauthorized_document_access_attempt",
                f"Unauthorized ask attempt for document '{request.selected_document_id}' by user '{user.get('username')}'",
                {
                    "document_id": request.selected_document_id,
                    "user_id": user.get("user_id"),
                    "username": user.get("username")
                }
            )
            raise HTTPException(status_code=403, detail="Access denied to this document.")

    try:
        res = answer_question(
            request.question,
            top_k=request.top_k,
            answer_mode=request.answer_mode,
            selected_document_id=request.selected_document_id,
            user=user,
        )

        if res.exact_match_found is False and res.missing_source is True:
            try:
                from app.rag_engine import extract_query_constraints
                constraints = extract_query_constraints(request.question)
                missing_entity = ", ".join(constraints.get("entities", [])) or "unknown"
                missing_document_type = constraints.get("doc_types", [None])[0] or "document"
                
                gap_record = {
                    "query": request.question,
                    "missing_entity": missing_entity,
                    "missing_document_type": missing_document_type,
                    "timestamp": utc_now(),
                    "user_id": user["user_id"] if user else "anonymous",
                    "suggested_action": "Upload missing document"
                }
                storage.add_knowledge_gap(gap_record)
            except Exception as e:
                storage.add_log("knowledge_gap_logging_failed", f"Failed to log knowledge gap: {e}")

        if user:
            safe_sources = [
                s.model_dump() if hasattr(s, "model_dump") else dict(s)
                for s in (res.sources or [])
            ]

            search_record = {
                "search_id": f"search_{uuid.uuid4().hex[:12]}",
                "user_id": user["user_id"],
                "user_name": user["name"],
                "question": request.question,
                "answer": res.answer,
                "answer_mode": request.answer_mode,
                "selected_document_id": request.selected_document_id,
                "selected_document": res.primary_document or "All Documents",
                "primary_document_id": res.primary_document_id or "",
                "primary_document": res.primary_document or "",
                "confidence": res.confidence,
                "confidence_score": res.confidence_score,
                "answer_type": res.answer_type,
                "status": res.status,
                "sources": safe_sources,
                "created_at": utc_now(),
            }

            storage.add_user_search_history(search_record)

            storage.add_user_activity(
                user["user_id"],
                user["name"],
                "search",
                f"Asked question: '{request.question[:40]}...'",
                {"search_id": search_record["search_id"]},
            )

        return res

    except Exception as exc:
        storage.add_log(
            "answer_generation_failed",
            "Answer generation failed.",
            {
                "question": request.question,
                "error": str(exc),
            },
        )
        raise HTTPException(status_code=500, detail=f"Answer generation failed: {exc}")


@app.get("/dashboard")
def dashboard():
    return storage.dashboard()


@app.get("/documents")
def documents(user: dict = Depends(get_current_user)):
    docs = storage.read_documents()
    filtered_docs = []

    for doc in docs:
        if user.get("role") == "admin":
            filtered_docs.append(doc)
        else:
            is_owner = (user.get("user_id") == doc.get("owner_user_id") or 
                        (user.get("username") and doc.get("owner_username") and user.get("username") == doc.get("owner_username")))
            if is_owner:
                filtered_docs.append(doc)
            elif doc.get("status") == "approved" and can_view_document(user, doc):
                filtered_docs.append(doc)

    for doc in filtered_docs:
        doc_id = doc.get("document_id")
        if doc_id:
            doc["download_url"] = f"/documents/{doc_id}/download"

    return {
        "documents": filtered_docs,
        "count": len(filtered_docs),
    }


@app.get("/documents/{document_id}/download")
def download_document(document_id: str, user: dict = Depends(get_current_user)):
    docs = storage.read_documents()
    doc = next((d for d in docs if d.get("document_id") == document_id), None)

    if not doc:
        storage.add_log(
            "unauthorized_download_attempt",
            f"Failed download attempt: Document '{document_id}' not found.",
            {"document_id": document_id, "user_id": user.get("user_id")}
        )
        raise HTTPException(status_code=404, detail="Document not found")

    original_name = doc.get("document") or doc.get("stored_filename")

    if not can_download_document(user, doc):
        storage.add_log(
            "unauthorized_download_attempt",
            f"Unauthorized download attempt for document '{original_name}' by user '{user.get('username')}'",
            {
                "document_id": document_id,
                "user_id": user.get("user_id"),
                "username": user.get("username")
            }
        )
        raise HTTPException(status_code=403, detail="Download not allowed for this document.")

    stored_filename = doc.get("stored_filename")
    file_path = UPLOAD_DIR / stored_filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Original file not found in uploads folder")

    # Audit log
    storage.add_log(
        "document_downloaded",
        f"Document '{original_name}' downloaded by user '{user.get('username')}'",
        {
            "document_id": document_id,
            "user_id": user.get("user_id"),
            "username": user.get("username")
        }
    )

    download_record = {
        "download_id": f"download_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "user_name": user["name"],
        "document_id": document_id,
        "document": original_name,
        "downloaded_at": utc_now(),
    }
    storage.add_download_history(download_record)

    storage.add_user_activity(
        user["user_id"],
        user["name"],
        "download",
        f"Downloaded document '{original_name}'",
        {
            "document_id": document_id,
            "download_id": download_record["download_id"],
        },
    )

    return FileResponse(
        path=file_path,
        filename=original_name,
        media_type="application/octet-stream",
    )


@app.get("/faqs")
def faqs(user: dict = Depends(get_current_user)):
    docs = storage.read_documents()
    faq_items = []

    for doc in docs:
        if user.get("role") == "admin" or (doc.get("status") == "approved" and can_view_document(user, doc)):
            for faq in doc.get("generated_faqs", []):
                faq_items.append(
                    {
                        "document_id": doc.get("document_id"),
                        "document": doc.get("document"),
                        "faq": faq,
                    }
                )

    return {
        "faqs": faq_items,
        "count": len(faq_items),
    }


@app.get("/tags")
def tags(user: dict = Depends(get_current_user)):
    docs = storage.read_documents()
    tag_items = []

    for doc in docs:
        if user.get("role") == "admin" or (doc.get("status") == "approved" and can_view_document(user, doc)):
            for tag in doc.get("generated_tags", []):
                tag_items.append(
                    {
                        "document_id": doc.get("document_id"),
                        "document": doc.get("document"),
                        "tag": tag,
                    }
                )

    return {
        "tags": tag_items,
        "count": len(tag_items),
    }


@app.get("/reviews")
def reviews(current_admin: dict = Depends(get_current_admin)):
    review_items = storage.read_reviews()

    return {
        "reviews": review_items,
        "count": len(review_items),
    }


@app.get("/logs")
def logs(limit: int = 100, current_admin: dict = Depends(get_current_admin)):
    all_logs = storage.read_logs()

    return {
        "logs": all_logs[-limit:],
        "count": len(all_logs[-limit:]),
    }


@app.get("/logs/structured")
def structured_logs(current_admin: dict = Depends(get_current_admin)):
    docs = storage.read_documents()

    return {
        "structured_logs": [
            {
                "document_id": doc.get("document_id"),
                "document": doc.get("document"),
                "structured_log": doc.get("structured_log"),
            }
            for doc in docs
        ],
        "count": len(docs),
    }


@app.get("/queries")
def query_history(limit: int = 100):
    history = storage.read_query_history()

    return {
        "queries": history[-limit:],
        "count": len(history[-limit:]),
    }


# ------------------------------------------------------------
# KNOWLEDGE QUALITY ROUTES
# ------------------------------------------------------------

@app.get("/quality/duplicates")
def quality_duplicates(current_admin: dict = Depends(get_current_admin)):
    try:
        from app.quality import detect_duplicates

        docs = storage.read_documents()
        chunks = storage.read_chunks()
        dups = detect_duplicates(docs, chunks)

        storage.add_log(
            "duplicate_detection_completed",
            f"Detected {len(dups)} duplicate candidate(s).",
        )

        return {
            "duplicates": dups,
            "count": len(dups),
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Duplicate detection failed: {exc}")


@app.get("/quality/conflicts")
def quality_conflicts(current_admin: dict = Depends(get_current_admin)):
    try:
        from app.quality import detect_conflicts

        docs = storage.read_documents()
        chunks = storage.read_chunks()
        conflicts = detect_conflicts(docs, chunks)

        storage.add_log(
            "conflict_detection_completed",
            f"Detected {len(conflicts)} policy conflict(s).",
        )

        return {
            "conflicts": conflicts,
            "count": len(conflicts),
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Conflict detection failed: {exc}")


def get_merged_knowledge_gaps() -> list[dict[str, Any]]:
    from app.quality import detect_knowledge_gaps

    history = storage.read_query_history()
    reviews_data = storage.read_reviews()
    gaps = detect_knowledge_gaps(history, reviews_data)

    logged_gaps = storage.read_knowledge_gaps()
    grouped_logged = {}
    for entry in logged_gaps:
        entity = entry.get("missing_entity", "unknown").strip().lower()
        doc_type = entry.get("missing_document_type", "document").strip().lower()
        key = (entity, doc_type)
        if key not in grouped_logged:
            grouped_logged[key] = {
                "queries": [],
                "timestamps": []
            }
        grouped_logged[key]["queries"].append(entry.get("query"))
        grouped_logged[key]["timestamps"].append(entry.get("timestamp"))

    formatted_logged_gaps = []
    for (entity, doc_type), data in grouped_logged.items():
        topic_name = f"{entity} {doc_type}"
        last_asked = max(data["timestamps"]) if data["timestamps"] else utc_now()
        questions = list(set(data["queries"]))
        formatted_logged_gaps.append({
            "topic": topic_name,
            "questions": questions,
            "frequency": len(questions),
            "last_asked_at": last_asked,
            "recommendation": f"Upload a {doc_type} matching topic '{entity}' to resolve this information gap."
        })

    merged = {}
    for gap in gaps:
        topic_key = gap["topic"].lower().strip()
        merged[topic_key] = dict(gap)

    for gap in formatted_logged_gaps:
        topic_key = gap["topic"].lower().strip()
        if topic_key in merged:
            merged_questions = list(set(merged[topic_key]["questions"] + gap["questions"]))
            merged[topic_key]["questions"] = merged_questions
            merged[topic_key]["frequency"] = len(merged_questions)
            merged[topic_key]["last_asked_at"] = max(merged[topic_key]["last_asked_at"], gap["last_asked_at"])
        else:
            merged[topic_key] = gap

    merged_gaps_list = list(merged.values())
    merged_gaps_list.sort(key=lambda x: x["frequency"], reverse=True)
    return merged_gaps_list


@app.get("/quality/knowledge-gaps")
def quality_knowledge_gaps(current_admin: dict = Depends(get_current_admin)):
    try:
        gaps = get_merged_knowledge_gaps()

        storage.add_log(
            "knowledge_gap_detection_completed",
            f"Found {len(gaps)} knowledge gap(s).",
        )

        return {
            "knowledge_gaps": gaps,
            "count": len(gaps),
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Knowledge gap detection failed: {exc}")


@app.get("/quality/dashboard")
def quality_dashboard(current_admin: dict = Depends(get_current_admin)):
    try:
        from app.quality import detect_duplicates, detect_conflicts

        docs = storage.read_documents()
        chunks = storage.read_chunks()
        history = storage.read_query_history()
        reviews_data = storage.read_reviews()

        dups = detect_duplicates(docs, chunks)
        conflicts = detect_conflicts(docs, chunks)
        gaps = get_merged_knowledge_gaps()

        total_docs = len(docs)
        healths = [d.get("knowledge_health_score", 0.5) for d in docs]
        avg_health = sum(healths) / total_docs if total_docs > 0 else 0.0

        official_docs = len([d for d in docs if d.get("authority_level") == "official"])
        outdated_docs = len([d for d in docs if d.get("status") in ["outdated", "archived"]])
        low_confidence = len([q for q in history if q.get("confidence") == "Low"])

        extraction_warnings = 0
        top_risks = []

        for d in docs:
            diag = d.get("diagnostics") or {}
            warning = d.get("warning") or diag.get("warning")
            text_len = d.get("extracted_text_length") or diag.get("extracted_text_length", 0)

            has_warning = bool(warning) or text_len < 500

            if has_warning:
                extraction_warnings += 1

            health_score = d.get("knowledge_health_score", 1.0)

            if health_score < 0.5 or has_warning:
                top_risks.append(
                    {
                        "document_id": d.get("document_id"),
                        "document": d.get("document"),
                        "knowledge_health_score": health_score,
                        "issue": warning or ("Low text extraction" if text_len < 500 else "Low knowledge health score"),
                    }
                )

        top_risks.sort(key=lambda x: x["knowledge_health_score"])

        storage.add_log(
            "quality_dashboard_generated",
            "Enterprise quality dashboard metrics generated.",
        )

        return {
            "total_documents": total_docs,
            "indexed_documents": total_docs,
            "average_knowledge_health": float(round(avg_health, 4)),
            "official_documents": official_docs,
            "outdated_documents": outdated_docs,
            "duplicate_candidates": len(dups),
            "conflict_candidates": len(conflicts),
            "knowledge_gaps": len(gaps),
            "low_confidence_questions": low_confidence,
            "documents_with_extraction_warnings": extraction_warnings,
            "top_risk_documents": top_risks[:5],
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {exc}")


@app.get("/quality/source-of-truth")
def quality_source_of_truth(current_admin: dict = Depends(get_current_admin)):
    try:
        docs = storage.read_documents()
        source_of_truth_list = []

        for d in docs:
            authority = d.get("authority_level", "standard").capitalize()
            doc_status = d.get("status", "active").capitalize()
            rev = d.get("review_status", "pending").capitalize()
            health = d.get("knowledge_health_score", 0.5)
            reason = f"{authority}, {doc_status}, {rev}, health: {int(health * 100)}%."

            source_of_truth_list.append(
                {
                    "document_id": d.get("document_id"),
                    "document": d.get("document"),
                    "department": d.get("department", "General"),
                    "document_type": d.get("document_type", "Document"),
                    "authority_level": d.get("authority_level", "standard"),
                    "status": d.get("status", "active"),
                    "review_status": d.get("review_status", "pending"),
                    "source_of_truth_score": d.get("source_of_truth_score", 0.5),
                    "knowledge_health_score": health,
                    "reason": reason,
                }
            )

        source_of_truth_list.sort(
            key=lambda x: x["source_of_truth_score"],
            reverse=True,
        )

        storage.add_log(
            "source_of_truth_ranking_completed",
            f"Ranked {len(source_of_truth_list)} documents by trust score.",
        )

        return {
            "source_of_truth_documents": source_of_truth_list,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Source of truth calculation failed: {exc}")


@app.patch("/documents/{document_id}/metadata")
def update_document_metadata(
    document_id: str,
    patch: DocumentMetadataPatch,
    current_admin: dict = Depends(get_current_admin),
):
    docs = storage.read_documents()
    target_doc = next((d for d in docs if d.get("document_id") == document_id), None)
    if not target_doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    patch_data = {
        k: v for k, v in patch.model_dump().items() if v is not None
    }

    old_visibility = target_doc.get("visibility")
    new_visibility = patch_data.get("visibility")

    updated_doc = storage.update_document_metadata(document_id, patch_data)

    if not updated_doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if new_visibility is not None and new_visibility != old_visibility:
        storage.add_log(
            "document_visibility_changed",
            f"Visibility for document '{target_doc.get('document')}' changed from '{old_visibility}' to '{new_visibility}'",
            {
                "document_id": document_id,
                "old_visibility": old_visibility,
                "new_visibility": new_visibility
            }
        )

    try:
        from app.quality import update_all_documents_metadata_and_scores

        update_all_documents_metadata_and_scores()
        docs = storage.read_documents()
        updated_doc = next(d for d in docs if d.get("document_id") == document_id)
    except Exception:
        pass

    storage.add_log(
        "document_metadata_updated",
        f"Metadata for document '{updated_doc.get('document')}' updated.",
        {
            "document_id": document_id,
            "patch": patch_data,
        },
    )

    return {
        "status": "success",
        "message": "Document metadata updated successfully.",
        "document": updated_doc,
    }


@app.get("/admin/review-queue")
def get_admin_review_queue(current_admin: dict = Depends(get_current_admin)):
    docs = storage.read_documents()
    pending_docs = [d for d in docs if d.get("status") == "pending"]
    return {
        "documents": pending_docs,
        "count": len(pending_docs)
    }


@app.patch("/admin/documents/{document_id}/approve")
def approve_document(
    document_id: str,
    req: ApproveDocumentRequest,
    current_admin: dict = Depends(get_current_admin)
):
    docs = storage.read_documents()
    doc = next((d for d in docs if d.get("document_id") == document_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    approval_data = {
        "status": "approved",
        "visibility": req.visibility,
        "allowed_departments": req.allowed_departments,
        "allowed_groups": req.allowed_groups,
        "allow_download": req.allow_download,
        "download_allowed_roles": req.download_allowed_roles,
        "approved_by": current_admin.get("username") or current_admin.get("user_id"),
        "approved_at": utc_now(),
        "updated_at": utc_now()
    }
    
    storage.update_document_metadata(document_id, approval_data)
    
    # Audit log
    storage.add_log(
        "document_approved",
        f"Document '{doc.get('document')}' approved by admin '{current_admin.get('username')}'",
        {
            "document_id": document_id,
            "approved_by": current_admin.get("username"),
            "visibility": req.visibility
        }
    )
    
    # Re-calculate quality scores
    try:
        from app.quality import update_all_documents_metadata_and_scores
        update_all_documents_metadata_and_scores()
    except Exception:
        pass
        
    return {"status": "success", "message": "Document approved successfully."}


@app.patch("/admin/documents/{document_id}/reject")
def reject_document(
    document_id: str,
    req: RejectDocumentRequest,
    current_admin: dict = Depends(get_current_admin)
):
    docs = storage.read_documents()
    doc = next((d for d in docs if d.get("document_id") == document_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    rejection_data = {
        "status": "rejected",
        "visibility": "private",  # remains private
        "rejection_reason": req.rejection_reason,
        "updated_at": utc_now()
    }
    
    storage.update_document_metadata(document_id, rejection_data)
    
    # Audit log
    storage.add_log(
        "document_rejected",
        f"Document '{doc.get('document')}' rejected by admin '{current_admin.get('username')}'",
        {
            "document_id": document_id,
            "rejected_by": current_admin.get("username"),
            "rejection_reason": req.rejection_reason
        }
    )
    
    # Re-calculate quality scores
    try:
        from app.quality import update_all_documents_metadata_and_scores
        update_all_documents_metadata_and_scores()
    except Exception:
        pass
        
    return {"status": "success", "message": "Document rejected successfully."}


# ------------------------------------------------------------
# AUTH ENDPOINTS
# ------------------------------------------------------------

@app.post("/auth/signup", response_model=AuthTokenResponse)
def auth_signup(request: SignupRequest):
    username_clean = request.username.strip()
    email_clean = request.email.lower().strip()
    
    # Map fields for compatibility
    full_name = request.full_name or request.name
    title = request.title or request.designation
    
    if not username_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required",
        )
    if not email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required",
        )
    if not request.password or len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )
    if not full_name or not full_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full Name is required",
        )
    if not request.department or not request.department.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department is required",
        )
    if not title or not title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title/Designation is required",
        )

    if get_user_by_username(username_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    if get_user_by_email(email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )

    parts = full_name.strip().split()
    if len(parts) >= 2:
        initials = (parts[0][0] + parts[1][0]).upper()
    elif len(parts) == 1 and len(parts[0]) >= 2:
        initials = parts[0][:2].upper()
    else:
        initials = "US"

    user_id = f"user_{uuid.uuid4().hex[:12]}"

    new_user = {
        "user_id": user_id,
        "id": user_id,
        "username": username_clean,
        "email": email_clean,
        "full_name": full_name.strip(),
        "name": full_name.strip(),  # compat
        "password_hash": hash_password(request.password),
        "role": "user",
        "department": request.department or "General",
        "title": title.strip(),
        "designation": title.strip(),  # compat
        "status": "active",
        "is_active": True,
        "created_at": utc_now(),
        "updated_at": utc_now(),
        "last_login": None,
        "last_login_at": None,  # compat
        "must_change_password": False,
        "avatar_initials": initials,
        "access_groups": ["all_employees", (request.department or "General").lower().strip()],
    }

    users = storage.read_users()
    users.append(new_user)
    storage.write_users(users)

    storage.add_auth_log(user_id, email_clean, "signup_success")
    storage.add_user_activity(
        user_id,
        full_name,
        "signup",
        "User signed up successfully",
    )

    access_token = create_access_token({"sub": user_id})

    user_res = dict(new_user)
    user_res.pop("password_hash", None)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_res,
    }


@app.post("/auth/login", response_model=AuthTokenResponse)
def auth_login(request: LoginRequest):
    identifier = request.identifier

    if not identifier and request.email:
        identifier = request.email

    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifier (username or email) is required",
        )

    identifier_clean = identifier.strip()
    user = get_user_by_identifier(identifier_clean)

    if not user or not verify_password(request.password, user.get("password_hash", "")):
        storage.add_auth_log("unknown", identifier_clean, "login_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    if not user.get("is_active", True) or user.get("status") != "active":
        storage.add_auth_log(
            user["user_id"],
            user.get("email") or user["username"],
            "login_inactive_blocked",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact administrator.",
        )

    user["last_login"] = utc_now()
    user["last_login_at"] = utc_now()  # compat
    user["updated_at"] = utc_now()

    # ensure new fields exist
    if "full_name" not in user:
        user["full_name"] = user.get("name") or user["username"]
    if "title" not in user:
        user["title"] = user.get("designation") or "Employee"
    if "is_active" not in user:
        user["is_active"] = (user.get("status") == "active")
    if "must_change_password" not in user:
        user["must_change_password"] = False

    users = storage.read_users()

    for i, u in enumerate(users):
        if u["user_id"] == user["user_id"]:
            users[i] = user
            break

    storage.write_users(users)

    storage.add_auth_log(
        user["user_id"],
        user.get("email") or user["username"],
        "login_success",
    )

    storage.add_user_activity(
        user["user_id"],
        user["name"],
        "login",
        "User logged in successfully",
    )

    access_token = create_access_token({"sub": user["user_id"]})

    user_res = dict(user)
    user_res.pop("password_hash", None)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_res,
    }


@app.post("/auth/admin-login", response_model=AuthTokenResponse)
def auth_admin_login(request: AdminLoginRequest):
    user = get_user_by_username(request.username)

    if not user or not verify_password(request.password, user.get("password_hash", "")):
        storage.add_auth_log("unknown", request.username, "admin_login_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if user.get("role") != "admin":
        storage.add_auth_log(
            user["user_id"],
            user.get("email") or user["username"],
            "admin_login_unauthorized_role",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative access required",
        )

    if not user.get("is_active", True) or user.get("status") != "active":
        storage.add_auth_log(
            user["user_id"],
            user.get("email") or user["username"],
            "admin_login_inactive_blocked",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact administrator.",
        )

    user["last_login"] = utc_now()
    user["last_login_at"] = utc_now()  # compat
    user["updated_at"] = utc_now()

    # ensure new fields exist
    if "full_name" not in user:
        user["full_name"] = user.get("name") or user["username"]
    if "title" not in user:
        user["title"] = user.get("designation") or "Employee"
    if "is_active" not in user:
        user["is_active"] = (user.get("status") == "active")
    if "must_change_password" not in user:
        user["must_change_password"] = False

    users = storage.read_users()

    for i, u in enumerate(users):
        if u["user_id"] == user["user_id"]:
            users[i] = user
            break

    storage.write_users(users)

    storage.add_auth_log(
        user["user_id"],
        user.get("email") or user["username"],
        "login_success",
    )

    storage.add_user_activity(
        user["user_id"],
        user["name"],
        "login",
        "User logged in successfully",
    )

    access_token = create_access_token({"sub": user["user_id"]})

    user_res = dict(user)
    user_res.pop("password_hash", None)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_res,
    }

@app.get("/auth/me", response_model=UserResponseItem)
def auth_me(current_user: dict = Depends(get_current_user)):
    return current_user


@app.post("/auth/logout")
def auth_logout(user: dict | None = Depends(get_optional_user)):
    if user:
        storage.add_user_activity(
            user["user_id"],
            user["name"],
            "logout",
            "User logged out",
        )

    return {
        "status": "success",
        "message": "Logged out successfully",
    }


# ------------------------------------------------------------
# PROFILE ENDPOINTS
# ------------------------------------------------------------

@app.get("/profile", response_model=UserResponseItem)
def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user


@app.patch("/profile", response_model=UserResponseItem)
def update_profile(
    patch: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    users = storage.read_users()

    if patch.username is not None:
        username_clean = patch.username.strip()

        if not username_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is required",
            )

        for u in users:
            if (
                u["user_id"] != current_user["user_id"]
                and u.get("username", "").lower().strip() == username_clean.lower()
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists",
                )

    if patch.email is not None:
        email_clean = patch.email.lower().strip()

        if email_clean:
            for u in users:
                if (
                    u["user_id"] != current_user["user_id"]
                    and u.get("email", "").lower().strip() == email_clean
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists",
                    )

    for u in users:
        if u["user_id"] == current_user["user_id"]:
            if patch.name is not None:
                u["name"] = patch.name

                parts = patch.name.strip().split()

                if len(parts) >= 2:
                    u["avatar_initials"] = (parts[0][0] + parts[1][0]).upper()
                elif len(parts) == 1 and len(parts[0]) >= 2:
                    u["avatar_initials"] = parts[0][:2].upper()

            if patch.username is not None:
                u["username"] = patch.username.strip()

            if patch.email is not None:
                u["email"] = patch.email.lower().strip()

            if patch.department is not None:
                u["department"] = patch.department

            if patch.designation is not None:
                u["designation"] = patch.designation

            u["updated_at"] = utc_now()

            storage.write_users(users)

            storage.add_user_activity(
                u["user_id"],
                u["name"],
                "profile_update",
                "Updated profile information",
            )

            return u

    raise HTTPException(status_code=404, detail="User profile not found")


@app.patch("/profile/change-password")
def change_password(
    request: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user),
):
    users = storage.read_users()

    for u in users:
        if u["user_id"] == current_user["user_id"]:
            if not verify_password(request.old_password, u.get("password_hash", "")):
                raise HTTPException(
                    status_code=400,
                    detail="Incorrect current password",
                )

            u["password_hash"] = hash_password(request.new_password)
            u["updated_at"] = utc_now()

            storage.write_users(users)

            storage.add_user_activity(
                u["user_id"],
                u["name"],
                "password_change",
                "Changed account password",
            )

            return {
                "status": "success",
                "message": "Password changed successfully",
            }

    raise HTTPException(status_code=404, detail="User profile not found")


@app.patch("/profile/credentials", response_model=UserResponseItem)
def update_profile_credentials(
    request: UserCredentialsUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    if not request.current_password:
        raise HTTPException(
            status_code=400,
            detail="Current password is required to update credentials",
        )

    users = storage.read_users()
    target_user = None
    for u in users:
        if u["user_id"] == current_user["user_id"]:
            target_user = u
            break

    if not target_user:
        raise HTTPException(status_code=404, detail="User profile not found")

    if not verify_password(request.current_password, target_user.get("password_hash", "")):
        raise HTTPException(
            status_code=400,
            detail="Incorrect current password",
        )

    if request.username is not None:
        username_clean = request.username.strip()
        if not username_clean:
            raise HTTPException(
                status_code=400,
                detail="Username cannot be empty",
            )
        for u in users:
            if u["user_id"] != current_user["user_id"] and u.get("username", "").lower().strip() == username_clean.lower():
                raise HTTPException(
                    status_code=400,
                    detail="Username already exists",
                )
        target_user["username"] = username_clean

    if request.email is not None:
        email_clean = request.email.lower().strip()
        if not email_clean:
            raise HTTPException(
                status_code=400,
                detail="Email cannot be empty",
            )
        for u in users:
            if u["user_id"] != current_user["user_id"] and u.get("email", "").lower().strip() == email_clean:
                raise HTTPException(
                    status_code=400,
                    detail="Email already exists",
                )
        target_user["email"] = email_clean

    if request.new_password is not None:
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters",
            )
        target_user["password_hash"] = hash_password(request.new_password)
        target_user["must_change_password"] = False

    target_user["updated_at"] = utc_now()

    storage.write_users(users)

    storage.add_user_activity(
        target_user["user_id"],
        target_user["name"],
        "credentials_update",
        "Updated account credentials",
    )

    user_res = dict(target_user)
    user_res.pop("password_hash", None)
    return user_res


@app.get("/profile/search-history")
def get_user_search_history(
    limit: int = Query(default=50, ge=1, le=200),
    q: str | None = Query(default=None),
    confidence: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    history = storage.read_user_search_history()
    filtered = [h for h in history if h.get("user_id") == current_user["user_id"]]

    if q:
        q_lower = q.lower()
        filtered = [
            h for h in filtered
            if q_lower in h.get("question", "").lower()
            or q_lower in h.get("answer", "").lower()
        ]

    if confidence:
        filtered = [
            h for h in filtered
            if h.get("confidence", "").lower() == confidence.lower()
        ]

    if from_date:
        filtered = [
            h for h in filtered
            if h.get("created_at", "") >= from_date
        ]

    if to_date:
        filtered = [
            h for h in filtered
            if h.get("created_at", "") <= to_date
        ]

    filtered.sort(
        key=lambda x: x.get("created_at", ""),
        reverse=True,
    )

    return {
        "history": filtered[:limit],
        "count": len(filtered),
    }


@app.delete("/profile/search-history/{search_id}")
def delete_search_history_item(
    search_id: str,
    current_user: dict = Depends(get_current_user),
):
    history = storage.read_user_search_history()

    found = False
    new_history = []

    for h in history:
        if h.get("search_id") == search_id:
            if h.get("user_id") != current_user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete other user's history",
                )
            found = True
        else:
            new_history.append(h)

    if not found:
        raise HTTPException(
            status_code=404,
            detail="History record not found",
        )

    with storage.lock:
        safe_json_write(storage.user_search_history_path, new_history)

    storage.add_user_activity(
        current_user["user_id"],
        current_user["name"],
        "delete_search_history",
        f"Deleted search history item: {search_id}",
    )

    return {
        "status": "success",
        "message": "Search history record deleted successfully",
    }


# ------------------------------------------------------------
# ADMIN PORTAL ENDPOINTS
# ------------------------------------------------------------

@app.get("/admin/dashboard")
def get_admin_dashboard(current_admin: dict = Depends(get_current_admin)):
    users = storage.read_users()
    searches = storage.read_user_search_history()
    downloads = storage.read_download_history()
    reviews_data = storage.read_reviews()
    docs = storage.read_documents()
    activity = storage.read_user_activity()

    total_users = len(users)
    active_users = len([u for u in users if u.get("status") == "active"])
    total_searches = len(searches)
    total_downloads = len(downloads)

    today_str = utc_now()[:10]
    searches_today = len(
        [
            s for s in searches
            if s.get("created_at", "")[:10] == today_str
        ]
    )

    low_confidence = len(
        [
            s for s in searches
            if s.get("confidence") == "Low"
        ]
    )

    pending_reviews = len(
        [
            r for r in reviews_data
            if r.get("status") == "Needs Review"
        ]
    )

    total_documents = len(docs)

    from collections import Counter

    question_list = [
        s.get("question", "").strip()
        for s in searches
        if s.get("question")
    ]

    top_questions = [
        {
            "question": q,
            "count": count,
        }
        for q, count in Counter(question_list).most_common(5)
    ]

    doc_list = [
        s.get("primary_document")
        for s in searches
        if s.get("primary_document")
    ]

    top_documents = [
        {
            "document": d,
            "count": count,
        }
        for d, count in Counter(doc_list).most_common(5)
    ]

    user_list = [
        s.get("user_name", "Anonymous")
        for s in searches
        if s.get("user_name")
    ]

    top_users = [
        {
            "username": u,
            "count": count,
        }
        for u, count in Counter(user_list).most_common(5)
    ]

    sorted_activity = sorted(
        activity,
        key=lambda x: x.get("timestamp", ""),
        reverse=True,
    )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_searches": total_searches,
        "searches_today": searches_today,
        "total_downloads": total_downloads,
        "low_confidence_searches": low_confidence,
        "pending_reviews": pending_reviews,
        "total_documents": total_documents,
        "top_questions": top_questions,
        "top_documents": top_documents,
        "top_users": top_users,
        "recent_activity": sorted_activity[:10],
    }


@app.get("/admin/users")
def get_admin_users(current_admin: dict = Depends(get_current_admin)):
    users = storage.read_users()
    response_users = []

    for u in users:
        u_copy = dict(u)
        u_copy.pop("password_hash", None)
        response_users.append(u_copy)

    return {
        "users": response_users,
        "count": len(response_users),
    }


@app.patch("/admin/users/{user_id}")
def admin_patch_user(
    user_id: str,
    patch: AdminUserPatch,
    current_admin: dict = Depends(get_current_admin),
):
    users = storage.read_users()
    target_user = next((u for u in users if u["user_id"] == user_id), None)
    if not target_user:
        raise HTTPException(status_code=404, detail="User record not found")

    # Enforce role validation
    if patch.role is not None and patch.role not in ("admin", "user"):
        raise HTTPException(
            status_code=400,
            detail="Role must be either 'admin' or 'user'",
        )

    # Active admin protection
    active_admins = [
        u for u in users
        if u.get("role") == "admin"
        and u.get("is_active", True)
        and u.get("status") == "active"
    ]
    is_target_active_admin = (
        target_user.get("role") == "admin"
        and target_user.get("is_active", True)
        and target_user.get("status") == "active"
    )

    trying_to_deactivate = False
    if patch.is_active is not None and not patch.is_active:
        trying_to_deactivate = True
    if patch.status is not None and patch.status != "active":
        trying_to_deactivate = True

    trying_to_demote = False
    if patch.role is not None and patch.role != "admin":
        trying_to_demote = True

    if is_target_active_admin and (trying_to_deactivate or trying_to_demote):
        if len(active_admins) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot deactivate or demote the last active administrator.",
            )

    if patch.username is not None:
        username_clean = patch.username.strip()
        if not username_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is required",
            )
        for u in users:
            if (
                u["user_id"] != user_id
                and u.get("username", "").lower().strip() == username_clean.lower()
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists",
                )
        target_user["username"] = username_clean

    if patch.email is not None:
        email_clean = patch.email.lower().strip()
        if email_clean:
            for u in users:
                if (
                    u["user_id"] != user_id
                    and u.get("email", "").lower().strip() == email_clean
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists",
                    )
        target_user["email"] = email_clean

    # Sync full name and name
    new_name = patch.full_name or patch.name
    if new_name is not None:
        name_clean = new_name.strip()
        target_user["name"] = name_clean
        target_user["full_name"] = name_clean
        parts = name_clean.split()
        if len(parts) >= 2:
            target_user["avatar_initials"] = (parts[0][0] + parts[1][0]).upper()
        elif len(parts) == 1 and len(parts[0]) >= 2:
            target_user["avatar_initials"] = parts[0][:2].upper()
        else:
            target_user["avatar_initials"] = "US"

    # Sync title and designation
    new_title = patch.title or patch.designation
    if new_title is not None:
        title_clean = new_title.strip()
        target_user["title"] = title_clean
        target_user["designation"] = title_clean

    if patch.department is not None:
        target_user["department"] = patch.department

    if patch.role is not None:
        target_user["role"] = patch.role

    # Sync is_active and status
    if patch.is_active is not None:
        target_user["is_active"] = patch.is_active
        target_user["status"] = "active" if patch.is_active else "disabled"
    elif patch.status is not None:
        target_user["status"] = patch.status
        target_user["is_active"] = (patch.status == "active")

    target_user["updated_at"] = utc_now()

    storage.write_users(users)

    storage.add_user_activity(
        current_admin["user_id"],
        current_admin["name"],
        "admin_edit_user",
        f"Edited user details for: {target_user['username']}",
        {
            "edited_user_id": user_id,
        },
    )

    u_copy = dict(target_user)
    u_copy.pop("password_hash", None)

    return {
        "status": "success",
        "message": "User updated successfully",
        "user": u_copy,
    }


@app.patch("/admin/users/{user_id}/password")
def admin_reset_user_password(
    user_id: str,
    request: AdminResetPasswordRequest,
    current_admin: dict = Depends(get_current_admin),
):
    users = storage.read_users()
    target_user = next((u for u in users if u["user_id"] == user_id), None)
    if not target_user:
        raise HTTPException(status_code=404, detail="User record not found")

    target_user["password_hash"] = hash_password(request.new_password)
    target_user["must_change_password"] = request.must_change_password
    target_user["updated_at"] = utc_now()

    storage.write_users(users)

    storage.add_user_activity(
        current_admin["user_id"],
        current_admin["name"],
        "admin_reset_password",
        f"Reset password for user: {target_user['username']}",
        {
            "reset_user_id": user_id,
            "must_change_password": request.must_change_password,
        },
    )

    return {
        "status": "success",
        "message": f"Password reset successfully for user {target_user['username']}.",
    }


@app.get("/admin/searches")
def get_admin_searches(
    user_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    confidence: str | None = Query(default=None),
    status: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_admin: dict = Depends(get_current_admin),
):
    history = storage.read_user_search_history()
    filtered = list(history)

    if user_id:
        filtered = [
            h for h in filtered
            if h.get("user_id") == user_id
        ]

    if q:
        q_lower = q.lower()
        filtered = [
            h for h in filtered
            if q_lower in h.get("question", "").lower()
            or q_lower in h.get("answer", "").lower()
        ]

    if confidence:
        filtered = [
            h for h in filtered
            if h.get("confidence", "").lower() == confidence.lower()
        ]

    if status:
        filtered = [
            h for h in filtered
            if h.get("status", "").lower() == status.lower()
        ]

    if from_date:
        filtered = [
            h for h in filtered
            if h.get("created_at", "") >= from_date
        ]

    if to_date:
        filtered = [
            h for h in filtered
            if h.get("created_at", "") <= to_date
        ]

    filtered.sort(
        key=lambda x: x.get("created_at", ""),
        reverse=True,
    )

    return {
        "searches": filtered[:limit],
        "count": len(filtered),
    }


@app.get("/admin/downloads")
def get_admin_downloads(current_admin: dict = Depends(get_current_admin)):
    downloads = storage.read_download_history()

    sorted_downloads = sorted(
        downloads,
        key=lambda x: x.get("downloaded_at", ""),
        reverse=True,
    )

    return {
        "downloads": sorted_downloads,
        "count": len(sorted_downloads),
    }


@app.get("/admin/activity")
def get_admin_activity(current_admin: dict = Depends(get_current_admin)):
    activity = storage.read_user_activity()

    sorted_act = sorted(
        activity,
        key=lambda x: x.get("timestamp", ""),
        reverse=True,
    )

    return {
        "activity": sorted_act,
        "count": len(sorted_act),
    }


@app.get("/admin/analytics")
def get_admin_analytics(current_admin: dict = Depends(get_current_admin)):
    searches = storage.read_user_search_history()
    downloads = storage.read_download_history()
    reviews_data = storage.read_reviews()
    users = storage.read_users()

    from collections import Counter

    days = [
        s.get("created_at", "")[:10]
        for s in searches
        if s.get("created_at")
    ]

    day_counts = Counter(days)

    search_volume = [
        {
            "date": d,
            "count": count,
        }
        for d, count in sorted(day_counts.items())
    ]

    if not search_volume:
        search_volume = [
            {
                "date": utc_now()[:10],
                "count": 0,
            }
        ]

    confs = [
        s.get("confidence", "Medium")
        for s in searches
    ]

    conf_counts = Counter(confs)

    conf_distribution = {
        "High": conf_counts.get("High", 0),
        "Medium": conf_counts.get("Medium", 0),
        "Low": conf_counts.get("Low", 0),
    }

    stopwords = {
        "what",
        "is",
        "the",
        "a",
        "an",
        "how",
        "to",
        "in",
        "on",
        "for",
        "with",
        "who",
        "are",
        "of",
        "and",
        "from",
        "this",
        "that",
    }

    words = []

    for s in searches:
        tokens = re.findall(
            r"\b[a-zA-Z]{4,}\b",
            s.get("question", "").lower(),
        )
        words.extend(
            [
                t for t in tokens
                if t not in stopwords
            ]
        )

    word_counts = Counter(words)

    most_searched = [
        {
            "topic": w,
            "count": count,
        }
        for w, count in word_counts.most_common(5)
    ]

    doc_downloads = [
        d.get("document", "Unknown")
        for d in downloads
    ]

    doc_searches = [
        s.get("primary_document", "Unknown")
        for s in searches
        if s.get("primary_document")
    ]

    combined_docs = doc_downloads + doc_searches
    doc_counts = Counter(combined_docs)

    most_used = [
        {
            "document": doc,
            "count": count,
        }
        for doc, count in doc_counts.most_common(5)
    ]

    depts = [
        u.get("department", "General")
        for u in users
    ]

    dept_counts = Counter(depts)

    users_by_department = [
        {
            "department": dept,
            "count": count,
        }
        for dept, count in dept_counts.items()
    ]

    rev_statuses = [
        r.get("status", "Needs Review")
        for r in reviews_data
    ]

    rev_counts = Counter(rev_statuses)

    review_stats = {
        "pending": rev_counts.get("Needs Review", 0) + rev_counts.get("pending", 0),
        "approved": rev_counts.get("approved", 0) + rev_counts.get("Approved", 0),
        "dismissed": rev_counts.get("rejected", 0)
        + rev_counts.get("Rejected", 0)
        + rev_counts.get("dismissed", 0),
    }

    return {
        "search_volume_by_day": search_volume,
        "confidence_distribution": conf_distribution,
        "most_searched_topics": most_searched,
        "most_used_documents": most_used,
        "users_by_department": users_by_department,
        "review_queue_stats": review_stats,
    }


@app.get("/admin/settings", response_model=SystemSettingsResponse)
def get_admin_settings(current_admin: dict = Depends(get_current_admin)):
    settings = read_system_settings()
    return settings


@app.patch("/admin/settings", response_model=SystemSettingsResponse)
def patch_admin_settings(
    patch: SystemSettingsPatch,
    current_admin: dict = Depends(get_current_admin),
):
    settings = read_system_settings()

    new_chunk_size = patch.chunk_size if patch.chunk_size is not None else settings.get("chunk_size", 1000)
    new_chunk_overlap = patch.chunk_overlap if patch.chunk_overlap is not None else settings.get("chunk_overlap", 200)

    if patch.selected_model is not None:
        settings["selected_model"] = patch.selected_model

    if patch.temperature is not None:
        if not (0.0 <= patch.temperature <= 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Temperature must be between 0.0 and 1.0",
            )
        settings["temperature"] = patch.temperature

    if patch.chunk_size is not None:
        if not (300 <= new_chunk_size <= 3000):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chunk size must be between 300 and 3000",
            )
        settings["chunk_size"] = new_chunk_size

    if patch.chunk_overlap is not None or patch.chunk_size is not None:
        if not (0 <= new_chunk_overlap < new_chunk_size):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chunk overlap must be between 0 and {new_chunk_size - 1}",
            )
        settings["chunk_overlap"] = new_chunk_overlap

    settings["updated_at"] = utc_now()
    settings["updated_by"] = current_admin.get("username", "admin")

    write_system_settings(settings)
    return settings


