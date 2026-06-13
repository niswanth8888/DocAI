from __future__ import annotations

import uuid
from pathlib import Path
from threading import Lock
from typing import Any

from app.config import METADATA_DIR, DATA_DIR
from app.utils import safe_json_load, safe_json_write, utc_now, hash_password


class JsonStorage:
    def __init__(self) -> None:
        self.lock = Lock()
        self.documents_path = METADATA_DIR / "documents.json"
        self.chunks_path = METADATA_DIR / "chunks.json"
        self.logs_path = METADATA_DIR / "logs.json"
        self.reviews_path = METADATA_DIR / "review_queue.json"
        self.query_history_path = METADATA_DIR / "query_history.json"
        
        # New Enterprise paths
        # Migrate users.json from METADATA_DIR to DATA_DIR if needed
        old_users_path = METADATA_DIR / "users.json"
        self.users_path = DATA_DIR / "users.json"
        if old_users_path.exists() and not self.users_path.exists():
            try:
                import shutil
                shutil.copy(old_users_path, self.users_path)
            except Exception as e:
                print("Failed to migrate users.json:", e)

        self.auth_logs_path = METADATA_DIR / "auth_logs.json"
        self.user_activity_path = METADATA_DIR / "user_activity.json"
        self.user_search_history_path = METADATA_DIR / "user_search_history.json"
        self.download_history_path = METADATA_DIR / "download_history.json"
        self.knowledge_gaps_path = METADATA_DIR / "knowledge_gaps.json"

        for path, default in [
            (self.documents_path, []),
            (self.chunks_path, []),
            (self.logs_path, []),
            (self.reviews_path, []),
            (self.query_history_path, []),
            (self.users_path, []),
            (self.auth_logs_path, []),
            (self.user_activity_path, []),
            (self.user_search_history_path, []),
            (self.download_history_path, []),
            (self.knowledge_gaps_path, []),
        ]:
            if not path.exists():
                safe_json_write(path, default)
                
        # Generate/migrate users and default admin
        users = self.read_users()
        modified = False
        try:
            # 1. Make sure every user has a username
            existing_usernames = {u["username"].lower() for u in users if "username" in u}
            for u in users:
                if "username" not in u:
                    base_username = ""
                    if u.get("email"):
                        base_username = u["email"].split("@")[0]
                    elif u.get("name"):
                        base_username = u["name"].replace(" ", "")
                    else:
                        base_username = "user"
                    
                    import re
                    base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username.lower())
                    if not base_username:
                        base_username = "user"
                    
                    candidate = base_username
                    counter = 1
                    while candidate.lower() in existing_usernames:
                        candidate = f"{base_username}_{counter}"
                        counter += 1
                    
                    u["username"] = candidate
                    existing_usernames.add(candidate.lower())
                    modified = True

            # 2. Check if any admin exists. If not, create default admin DocAIadmin / qwert12345
            any_admin = any(u.get("role") == "admin" for u in users)
            if not any_admin:
                hashed_pw = hash_password("qwert12345")
                admin_user = {
                    "user_id": f"admin_{uuid.uuid4().hex[:12]}",
                    "name": "DocAI Admin",
                    "full_name": "DocAI Admin",
                    "username": "DocAIadmin",
                    "email": "admin@docai.local",
                    "password_hash": hashed_pw,
                    "role": "admin",
                    "department": "Administration",
                    "designation": "System Administrator",
                    "title": "System Administrator",
                    "status": "active",
                    "is_active": True,
                    "created_at": utc_now(),
                    "updated_at": utc_now(),
                    "last_login_at": None,
                    "last_login": None,
                    "must_change_password": False,
                    "avatar_initials": "DA"
                }
                users.append(admin_user)
                modified = True

            # 3. Ensure every user has all new schema fields without altering password/credentials
            for u in users:
                if "full_name" not in u:
                    u["full_name"] = u.get("name") or u.get("username") or ""
                    modified = True
                if "title" not in u:
                    u["title"] = u.get("designation") or "Employee"
                    modified = True
                if "access_groups" not in u:
                    dept = u.get("department", "General").lower().strip()
                    u["access_groups"] = ["all_employees", dept] if dept else ["all_employees"]
                    modified = True
                if "id" not in u:
                    u["id"] = u.get("user_id")
                    modified = True
                if "is_active" not in u:
                    u["is_active"] = (u.get("status", "active") == "active")
                    modified = True
                if "must_change_password" not in u:
                    u["must_change_password"] = False
                    modified = True
                if "last_login" not in u:
                    u["last_login"] = u.get("last_login_at")
                    modified = True
                    
            if modified:
                safe_json_write(self.users_path, users)

            # 4. Migrate documents
            docs = self.read_documents()
            modified_docs = False
            for doc in docs:
                if "status" not in doc or doc["status"] not in ["pending", "approved", "rejected", "archived"]:
                    doc["status"] = "approved"
                    modified_docs = True
                if "visibility" not in doc:
                    doc["visibility"] = "public"
                    modified_docs = True
                if "allowed_groups" not in doc:
                    doc["allowed_groups"] = ["all_employees"]
                    modified_docs = True
                if "allowed_departments" not in doc:
                    doc["allowed_departments"] = []
                    modified_docs = True
                if "allow_download" not in doc:
                    doc["allow_download"] = False
                    modified_docs = True
                if "download_allowed_roles" not in doc:
                    doc["download_allowed_roles"] = []
                    modified_docs = True
                if "owner_user_id" not in doc:
                    doc["owner_user_id"] = "system"
                    modified_docs = True
                if "owner_username" not in doc:
                    doc["owner_username"] = "System"
                    modified_docs = True
                if "owner_department" not in doc:
                    doc["owner_department"] = "General"
                    modified_docs = True
                if "uploaded_by_role" not in doc:
                    doc["uploaded_by_role"] = "admin"
                    modified_docs = True
                if "rejection_reason" not in doc:
                    doc["rejection_reason"] = None
                    modified_docs = True
                if "approved_by" not in doc:
                    doc["approved_by"] = None
                    modified_docs = True
                if "approved_at" not in doc:
                    doc["approved_at"] = None
                    modified_docs = True
                if "created_at" not in doc:
                    doc["created_at"] = doc.get("uploaded_at") or utc_now()
                    modified_docs = True
                if "updated_at" not in doc:
                    doc["updated_at"] = doc.get("created_at") or utc_now()
                    modified_docs = True
                if "id" not in doc:
                    doc["id"] = doc.get("document_id")
                    modified_docs = True
                if "filename" not in doc:
                    doc["filename"] = doc.get("document")
                    modified_docs = True
                if "original_filename" not in doc:
                    doc["original_filename"] = doc.get("document")
                    modified_docs = True

            if modified_docs:
                safe_json_write(self.documents_path, docs)

        except Exception as e:
            import traceback
            traceback.print_exc()
            print("ERROR IN STORAGE INITIALIZATION:", e)

    def read_documents(self) -> list[dict[str, Any]]:
        return safe_json_load(self.documents_path, [])

    def read_chunks(self) -> list[dict[str, Any]]:
        return safe_json_load(self.chunks_path, [])

    def read_logs(self) -> list[dict[str, Any]]:
        return safe_json_load(self.logs_path, [])

    def read_reviews(self) -> list[dict[str, Any]]:
        return safe_json_load(self.reviews_path, [])

    def read_query_history(self) -> list[dict[str, Any]]:
        return safe_json_load(self.query_history_path, [])

    def read_users(self) -> list[dict[str, Any]]:
        return safe_json_load(self.users_path, [])

    def write_users(self, users: list[dict[str, Any]]) -> None:
        with self.lock:
            safe_json_write(self.users_path, users)

    def read_auth_logs(self) -> list[dict[str, Any]]:
        return safe_json_load(self.auth_logs_path, [])

    def add_auth_log(self, user_id: str, email: str, status: str, ip: str = "127.0.0.1") -> None:
        with self.lock:
            logs = self.read_auth_logs()
            logs.append({
                "log_id": f"alog_{uuid.uuid4().hex[:12]}",
                "timestamp": utc_now(),
                "user_id": user_id,
                "email": email,
                "status": status,
                "ip_address": ip
            })
            safe_json_write(self.auth_logs_path, logs[-1000:])

    def read_user_activity(self) -> list[dict[str, Any]]:
        return safe_json_load(self.user_activity_path, [])

    def add_user_activity(self, user_id: str, username: str, activity_type: str, message: str, payload: dict[str, Any] | None = None) -> None:
        with self.lock:
            activity = self.read_user_activity()
            activity.append({
                "activity_id": f"act_{uuid.uuid4().hex[:12]}",
                "timestamp": utc_now(),
                "user_id": user_id,
                "username": username,
                "activity_type": activity_type,
                "message": message,
                "payload": payload or {}
            })
            safe_json_write(self.user_activity_path, activity[-2000:])

    def read_user_search_history(self) -> list[dict[str, Any]]:
        return safe_json_load(self.user_search_history_path, [])

    def add_user_search_history(self, search_record: dict[str, Any]) -> None:
        with self.lock:
            history = self.read_user_search_history()
            history.append(search_record)
            safe_json_write(self.user_search_history_path, history)

    def read_download_history(self) -> list[dict[str, Any]]:
        return safe_json_load(self.download_history_path, [])

    def add_download_history(self, download_record: dict[str, Any]) -> None:
        with self.lock:
            history = self.read_download_history()
            history.append(download_record)
            safe_json_write(self.download_history_path, history)

    def read_knowledge_gaps(self) -> list[dict[str, Any]]:
        return safe_json_load(self.knowledge_gaps_path, [])

    def write_knowledge_gaps(self, gaps: list[dict[str, Any]]) -> None:
        with self.lock:
            safe_json_write(self.knowledge_gaps_path, gaps)

    def add_knowledge_gap(self, gap: dict[str, Any]) -> None:
        with self.lock:
            gaps = self.read_knowledge_gaps()
            gaps.append(gap)
            safe_json_write(self.knowledge_gaps_path, gaps)

    def add_document(self, document: dict[str, Any]) -> None:
        if "department" not in document: document["department"] = "General"
        if "document_type" not in document: document["document_type"] = "Document"
        if "owner" not in document: document["owner"] = "Unassigned"
        if "authority_level" not in document: document["authority_level"] = "standard"
        if "version" not in document: document["version"] = "v1"
        if "status" not in document: document["status"] = "active"
        if "review_status" not in document: document["review_status"] = "pending"
        if "last_reviewed_at" not in document: document["last_reviewed_at"] = None
        if "expiry_warning" not in document: document["expiry_warning"] = None
        if "duplicate_candidates" not in document: document["duplicate_candidates"] = []
        if "conflict_candidates" not in document: document["conflict_candidates"] = []
        
        try:
            from app.quality import calculate_knowledge_health, calculate_source_of_truth_score
            docs = self.read_documents()
            document["knowledge_health_score"] = calculate_knowledge_health(document)
            document["source_of_truth_score"] = calculate_source_of_truth_score(document, docs + [document])
        except Exception:
            document["knowledge_health_score"] = 0.5
            document["source_of_truth_score"] = 0.5

        with self.lock:
            docs = self.read_documents()
            docs.append(document)
            safe_json_write(self.documents_path, docs)

    def update_document_metadata(self, document_id: str, metadata: dict[str, Any]) -> dict[str, Any] | None:
        with self.lock:
            docs = self.read_documents()
            for doc in docs:
                if doc.get("document_id") == document_id:
                    doc.update(metadata)
                    try:
                        from app.quality import calculate_knowledge_health, calculate_source_of_truth_score
                        doc["knowledge_health_score"] = calculate_knowledge_health(doc)
                        doc["source_of_truth_score"] = calculate_source_of_truth_score(doc, docs)
                    except Exception:
                        pass
                    safe_json_write(self.documents_path, docs)
                    return doc
            return None

    def write_documents(self, docs: list[dict[str, Any]]) -> None:
        with self.lock:
            safe_json_write(self.documents_path, docs)

    def write_chunks(self, chunks: list[dict[str, Any]]) -> None:
        with self.lock:
            safe_json_write(self.chunks_path, chunks)

    def write_reviews(self, reviews: list[dict[str, Any]]) -> None:
        with self.lock:
            safe_json_write(self.reviews_path, reviews)

    def add_chunks(self, chunks: list[dict[str, Any]]) -> None:
        with self.lock:
            existing = self.read_chunks()
            existing.extend(chunks)
            safe_json_write(self.chunks_path, existing)

    def add_log(self, event_type: str, message: str, payload: dict[str, Any] | None = None) -> None:
        with self.lock:
            logs = self.read_logs()
            logs.append({
                "timestamp": utc_now(),
                "event_type": event_type,
                "message": message,
                "payload": payload or {},
            })
            safe_json_write(self.logs_path, logs[-500:])

    def add_review(self, review: dict[str, Any]) -> None:
        with self.lock:
            reviews = self.read_reviews()
            reviews.append(review)
            safe_json_write(self.reviews_path, reviews)

    def add_query_history(self, item: dict[str, Any]) -> None:
        with self.lock:
            history = self.read_query_history()
            history.append(item)
            safe_json_write(self.query_history_path, history[-1000:])

    def delete_document_and_chunks(self, document_name: str) -> None:
        with self.lock:
            docs = self.read_documents()
            updated_docs = [doc for doc in docs if doc.get("document") != document_name]
            safe_json_write(self.documents_path, updated_docs)

            chunks = self.read_chunks()
            updated_chunks = [c for c in chunks if c.get("document") != document_name]
            safe_json_write(self.chunks_path, updated_chunks)
            
            try:
                from app.vector_store import vector_store
                vector_store.invalidate_cache()
            except Exception:
                pass

    def dashboard(self) -> dict[str, Any]:
        docs = self.read_documents()
        chunks = self.read_chunks()
        reviews = self.read_reviews()
        history = self.read_query_history()

        total_faqs = sum(len(d.get("generated_faqs", [])) for d in docs)
        tags = set()
        for d in docs:
            for tag in d.get("generated_tags", []):
                tags.add(tag)

        return {
            "total_documents": len(docs),
            "total_chunks": len(chunks),
            "total_faqs": total_faqs,
            "total_tags": len(tags),
            "questions_answered": len(history),
            "low_confidence_queries": len([q for q in history if q.get("confidence") == "Low"]),
            "pending_reviews": len([r for r in reviews if r.get("status") == "Needs Review"]),
        }


storage = JsonStorage()


def get_default_system_settings() -> dict[str, Any]:
    return {
        "selected_model": "gemini-1.5-flash",
        "temperature": 0.2,
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "updated_at": utc_now(),
        "updated_by": "system"
    }


def read_system_settings() -> dict[str, Any]:
    path = METADATA_DIR.parent / "system_settings.json"
    if not path.exists():
        settings = get_default_system_settings()
        write_system_settings(settings)
        return settings
    return safe_json_load(path, get_default_system_settings())


def write_system_settings(settings: dict[str, Any]) -> None:
    path = METADATA_DIR.parent / "system_settings.json"
    safe_json_write(path, settings)

