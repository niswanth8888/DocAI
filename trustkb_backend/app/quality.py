from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.llm_client import llm_client
from app.utils import extract_json_object, utc_now


def extract_important_terms(text: str) -> list[str]:
    stopwords = {
        "what", "who", "where", "when", "why", "how", "is", "are", "was", "were", 
        "in", "on", "at", "the", "a", "an", "and", "or", "for", "to", "of", "about", 
        "explain", "summarize", "tell", "me", "details", "document", "paper", "role", 
        "seeking", "internship", "with", "from", "that", "this", "these", "those",
        "they", "their", "them", "his", "her", "its", "our", "your", "into", "over",
        "under", "between", "through", "during", "before", "after", "above", "below",
        "such", "other", "some", "any", "no", "not", "only", "own", "same", "so", "than",
        "too", "very", "can", "will", "just", "should", "now"
    }
    words = re.findall(r"\b[a-zA-Z0-9]{3,}\b", text.lower())
    return [w for w in words if w not in stopwords]


def calculate_knowledge_health(document: dict[str, Any], chunks: list[dict[str, Any]] | None = None) -> float:
    diagnostics = document.get("diagnostics") or {}
    text_len = document.get("extracted_text_length") or diagnostics.get("extracted_text_length", 0)
    chunks_created = document.get("chunks_created") or diagnostics.get("chunks_created", 0)
    
    doc_id = document.get("document_id")
    if doc_id and (text_len <= 0 or chunks_created <= 0):
        if chunks is None:
            try:
                from app.storage import storage
                chunks = storage.read_chunks()
            except Exception:
                chunks = []
        matching = [c for c in chunks if c.get("document_id") == doc_id]
        if text_len <= 0:
            text_len = sum(len(c.get("text", "")) for c in matching)
        if chunks_created <= 0:
            chunks_created = len(matching)
            
    summary = document.get("summary", "")
    faqs = document.get("generated_faqs") or []
    tags = document.get("generated_tags") or []
    vector_status = document.get("vector_status", "")
    warning = document.get("warning") or diagnostics.get("warning")
    
    score = 0.0
    if text_len > 1000:
        score += 0.20
    if chunks_created > 3:
        score += 0.20
    if summary and len(summary.strip()) > 0:
        score += 0.15
    if len(faqs) >= 3:
        score += 0.15
    if len(tags) >= 3:
        score += 0.10
    if vector_status == "stored":
        score += 0.10
    if not warning:
        score += 0.10
        
    score = float(round(max(0.0, min(1.0, score)), 4))
    
    if text_len < 500:
        score = min(score, 0.30)
        
    return score


def get_recency_boost(uploaded_at: str, all_docs: list[dict[str, Any]], doc_id: str) -> float:
    if not uploaded_at or not all_docs:
        return 0.0
    
    valid_docs = [d for d in all_docs if d.get("uploaded_at")]
    if len(valid_docs) <= 1:
        return 0.15
        
    sorted_docs = sorted(valid_docs, key=lambda x: x.get("uploaded_at", ""))
    oldest = sorted_docs[0].get("uploaded_at", "")
    newest = sorted_docs[-1].get("uploaded_at", "")
    
    if oldest == newest:
        return 0.15
        
    try:
        t_oldest = datetime.fromisoformat(oldest.replace('Z', '+00:00'))
        t_newest = datetime.fromisoformat(newest.replace('Z', '+00:00'))
        t_current = datetime.fromisoformat(uploaded_at.replace('Z', '+00:00'))
        
        total_diff = (t_newest - t_oldest).total_seconds()
        if total_diff <= 0:
            return 0.15
        current_diff = (t_current - t_oldest).total_seconds()
        return float(round(0.15 * (current_diff / total_diff), 4))
    except Exception:
        try:
            idx = next((i for i, d in enumerate(sorted_docs) if d.get("document_id") == doc_id), 0)
            return float(round(0.15 * (idx / (len(sorted_docs) - 1)), 4))
        except Exception:
            return 0.0


def calculate_source_of_truth_score(document: dict[str, Any], all_docs: list[dict[str, Any]]) -> float:
    authority = document.get("authority_level", "standard").lower()
    status = document.get("status", "active").lower()
    review_status = document.get("review_status", "pending").lower()
    health_score = document.get("knowledge_health_score", 0.5)
    uploaded_at = document.get("uploaded_at", "")
    
    score = 0.0
    
    # Authority Level
    if authority == "official":
        score += 0.35
    elif authority == "approved":
        score += 0.25
    elif authority == "standard":
        score += 0.15
    elif authority == "draft":
        score += 0.05
    elif authority == "archived":
        score -= 0.30
        
    # Status
    if status == "active":
        score += 0.25
    elif status == "outdated":
        score -= 0.25
    elif status == "archived":
        score -= 0.40
        
    # Review Status
    if review_status == "approved":
        score += 0.20
    elif review_status == "pending":
        score += 0.05
    elif review_status == "rejected":
        score -= 0.30
        
    # Recency Boost
    recency_boost = get_recency_boost(uploaded_at, all_docs, document.get("document_id", ""))
    score += recency_boost
    
    # Health Boost
    score += health_score * 0.20
    
    return float(round(max(0.0, min(1.0, score)), 4))


def string_similarity(s1: str, s2: str) -> float:
    w1 = set(re.findall(r"\w+", s1.lower()))
    w2 = set(re.findall(r"\w+", s2.lower()))
    if not w1 or not w2:
        return 0.0
    return len(w1 & w2) / len(w1 | w2)


def get_document_text_representation(doc: dict[str, Any], doc_chunks: list[dict[str, Any]]) -> str:
    summary = doc.get("summary", "")
    faqs = " ".join(doc.get("generated_faqs", []))
    tags = " ".join(doc.get("generated_tags", []))
    
    chunk_previews = " ".join(c.get("text", "")[:200] for c in doc_chunks)
    
    return f"{summary} {faqs} {tags} {chunk_previews}"


def detect_duplicates(all_docs: list[dict[str, Any]], all_chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(all_docs) < 2:
        return []
        
    # Group chunks by document_id for O(1) lookup
    chunks_by_doc = {}
    for c in all_chunks:
        d_id = c.get("document_id")
        if d_id:
            chunks_by_doc.setdefault(d_id, []).append(c)
            
    texts = [get_document_text_representation(doc, chunks_by_doc.get(doc.get("document_id"), [])) for doc in all_docs]
    
    vectorizer = HashingVectorizer(n_features=2**14, stop_words="english")
    matrix = vectorizer.transform(texts)
    sim_matrix = cosine_similarity(matrix)
    
    duplicates = []
    for i in range(len(all_docs)):
        for j in range(i + 1, len(all_docs)):
            doc_a = all_docs[i]
            doc_b = all_docs[j]
            
            sim_score = float(sim_matrix[i][j])
            name_sim = string_similarity(doc_a.get("document", ""), doc_b.get("document", ""))
            
            is_dup = False
            rec = ""
            
            if sim_score >= 0.80:
                is_dup = True
                rec = "Possible duplicate or new version. Review whether one should be archived."
            elif sim_score >= 0.65 and name_sim >= 0.40:
                is_dup = True
                rec = "Related documents or possible version. Consider updating metadata version and status."
                
            if is_dup:
                duplicates.append({
                    "document_a": {
                        "document_id": doc_a.get("document_id"),
                        "document": doc_a.get("document")
                    },
                    "document_b": {
                        "document_id": doc_b.get("document_id"),
                        "document": doc_b.get("document")
                    },
                    "similarity_score": round(sim_score, 4),
                    "recommendation": rec
                })
                
    return duplicates


def verify_conflict_with_llm(doc_a_name: str, claim_a: str, doc_b_name: str, claim_b: str) -> dict[str, Any] | None:
    prompt = f"""
You are an expert enterprise auditor. Your task is to detect whether two claims from different company documents conflict or contradict each other.

Document A: {doc_a_name}
Claim A: "{claim_a}"

Document B: {doc_b_name}
Claim B: "{claim_b}"

Are these two statements in conflict or inconsistent? (e.g. they specify different days, numbers, policies, permissions, or actions for the same situation).

Return ONLY a valid JSON object:
{{
  "is_conflict": true | false,
  "topic": "the specific policy/topic area (e.g. leave notice period)",
  "severity": "low | medium | high",
  "reason": "why they conflict (or why they are consistent)"
}}
""".strip()

    output = llm_client.generate(prompt, temperature=0.1)
    if not output:
        return None
    return extract_json_object(output)


def extract_rule_sentences(text: str) -> list[str]:
    raw_sentences = re.split(r'(?<=[.!?])\s+', text)
    rule_words = {"must", "should", "required", "allowed", "approval", "days", "limit", "maximum", "minimum", "deadline", "policy", "eligible"}
    
    rules = []
    for s in raw_sentences:
        s_clean = s.strip()
        if len(s_clean) < 15:
            continue
        s_words = set(re.findall(r"\b\w+\b", s_clean.lower()))
        if s_words & rule_words:
            rules.append(s_clean)
    return rules


def check_sentence_pair_conflict(doc_a: dict[str, Any], sent_a: str, doc_b: dict[str, Any], sent_b: str) -> dict[str, Any] | None:
    if doc_a.get("document_id") == doc_b.get("document_id"):
        return None
        
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "to", "for", "in", "on", "at", "by", "with", "must", "should", "required", "allowed", "approval", "days", "limit", "maximum", "minimum", "deadline", "policy", "eligible"}
    w1 = {w for w in re.findall(r"\b[a-zA-Z]{4,}\b", sent_a.lower()) if w not in stop_words}
    w2 = {w for w in re.findall(r"\b[a-zA-Z]{4,}\b", sent_b.lower()) if w not in stop_words}
    
    common = w1 & w2
    if len(common) < 2:
        return None
        
    num1 = set(re.findall(r"\b\d+\b", sent_a))
    num2 = set(re.findall(r"\b\d+\b", sent_b))
    
    is_conflict = False
    reason = ""
    severity = "medium"
    topic = f"Policy conflict on {' & '.join(list(common)[:2])}"
    
    if num1 and num2 and num1 != num2:
        is_conflict = True
        reason = f"Statement A mentions numbers {list(num1)} while Statement B mentions numbers {list(num2)} in the context of {', '.join(common)}."
        
    allowed_terms = {"allowed", "permitted", "approved", "can"}
    denied_terms = {"not allowed", "prohibited", "forbidden", "denied", "cannot", "must not"}
    
    has_allowed_a = any(t in sent_a.lower() for t in allowed_terms) or "allowed" in sent_a.lower()
    has_denied_a = any(t in sent_a.lower() for t in denied_terms) or "not allowed" in sent_a.lower()
    has_allowed_b = any(t in sent_b.lower() for t in allowed_terms) or "allowed" in sent_b.lower()
    has_denied_b = any(t in sent_b.lower() for t in denied_terms) or "not allowed" in sent_b.lower()
    
    if (has_allowed_a and has_denied_b) or (has_denied_a and has_allowed_b):
        is_conflict = True
        reason = f"Statement A and Statement B specify opposite permission states (allowed vs prohibited) regarding {', '.join(common)}."
        severity = "high"
        
    if is_conflict:
        llm_res = verify_conflict_with_llm(doc_a.get("document", ""), sent_a, doc_b.get("document", ""), sent_b)
        if llm_res and isinstance(llm_res, dict):
            if not llm_res.get("is_conflict", False):
                return None
            return {
                "topic": llm_res.get("topic", topic),
                "documents": [
                    {"document_id": doc_a.get("document_id"), "document": doc_a.get("document"), "claim": sent_a},
                    {"document_id": doc_b.get("document_id"), "document": doc_b.get("document"), "claim": sent_b}
                ],
                "severity": llm_res.get("severity", severity),
                "recommendation": llm_res.get("reason", "Review policy inconsistency and mark the latest official document as source of truth.")
            }
            
        return {
            "topic": topic,
            "documents": [
                {"document_id": doc_a.get("document_id"), "document": doc_a.get("document"), "claim": sent_a},
                {"document_id": doc_b.get("document_id"), "document": doc_b.get("document"), "claim": sent_b}
            ],
            "severity": severity,
            "recommendation": reason + " Review policy inconsistency and mark the latest official document as source of truth."
        }
        
    return None


def detect_conflicts(all_docs: list[dict[str, Any]], all_chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # Group chunks by document_id for O(1) lookup
    chunks_by_doc = {}
    for c in all_chunks:
        d_id = c.get("document_id")
        if d_id:
            chunks_by_doc.setdefault(d_id, []).append(c)

    doc_rules = {}
    doc_terms = {}
    for doc in all_docs:
        doc_id = doc.get("document_id")
        doc_chunks = chunks_by_doc.get(doc_id, [])
        
        # Optimize: limit chunk parsing for extremely large documents (e.g. books)
        # to avoid O(N^2) sentence comparisons hanging the CPU
        if len(doc_chunks) > 100:
            doc_chunks = doc_chunks[:100]
            
        doc_chunks_text = [c.get("text", "") for c in doc_chunks]
        combined_text = "\n".join(doc_chunks_text)
        rules = extract_rule_sentences(combined_text)
        if rules:
            doc_rules[doc_id] = rules[:50]
        doc_terms[doc_id] = set(extract_important_terms(combined_text))
            
    conflicts = []
    seen_pairs = set()
    
    doc_ids = list(doc_rules.keys())
    for i in range(len(doc_ids)):
        for j in range(i + 1, len(doc_ids)):
            id_a = doc_ids[i]
            id_b = doc_ids[j]
            
            # Stricter heuristic: skip if documents share very few important terms
            if len(doc_terms[id_a] & doc_terms[id_b]) < 3:
                continue
                
            doc_a = next(d for d in all_docs if d.get("document_id") == id_a)
            doc_b = next(d for d in all_docs if d.get("document_id") == id_b)
            
            for sent_a in doc_rules[id_a]:
                for sent_b in doc_rules[id_b]:
                    conflict = check_sentence_pair_conflict(doc_a, sent_a, doc_b, sent_b)
                    if conflict:
                        conflict_key = tuple(sorted([id_a, id_b])) + (conflict["topic"].lower(),)
                        if conflict_key not in seen_pairs:
                            seen_pairs.add(conflict_key)
                            conflicts.append(conflict)
                            
    return conflicts


def detect_knowledge_gaps(history: list[dict[str, Any]], reviews: list[dict[str, Any]]) -> list[dict[str, Any]]:
    failed_queries = []
    seen_questions = set()
    
    def add_failed_query(q_item: dict[str, Any]):
        question = q_item.get("question", "").strip()
        if not question or question.lower() in seen_questions:
            return
            
        is_failed = (
            q_item.get("confidence") == "Low" or 
            q_item.get("status") == "moved_to_review" or 
            q_item.get("answer_type") == "unsupported"
        )
        if is_failed:
            seen_questions.add(question.lower())
            failed_queries.append({
                "question": question,
                "timestamp": q_item.get("created_at") or q_item.get("timestamp") or utc_now()
            })
            
    for item in history:
        add_failed_query(item)
    for item in reviews:
        add_failed_query(item)
        
    if not failed_queries:
        # Default mock gaps if history is completely empty, to show gaps features immediately
        return [
            {
                "topic": "remote internship policy",
                "questions": [
                    "Can interns work remotely?",
                    "Is remote internship allowed?"
                ],
                "frequency": 2,
                "last_asked_at": utc_now(),
                "recommendation": "Create or upload a remote internship policy document."
            }
        ]
        
    groups = []
    for q in failed_queries:
        q_text = q["question"]
        q_terms = set(extract_important_terms(q_text))
        
        matched_group = None
        for g in groups:
            overlap = q_terms & g["terms"]
            if overlap:
                matched_group = g
                break
                
        if matched_group:
            matched_group["questions"].append(q_text)
            matched_group["timestamps"].append(q["timestamp"])
            matched_group["terms"].update(q_terms)
        else:
            groups.append({
                "terms": set(q_terms),
                "questions": [q_text],
                "timestamps": [q["timestamp"]]
            })
            
    knowledge_gaps = []
    for g in groups:
        sorted_terms = sorted(list(g["terms"]), key=len, reverse=True)
        topic_words = sorted_terms[:2] if sorted_terms else ["general"]
        topic_name = " ".join(topic_words) + " policy"
        
        last_asked = max(g["timestamps"]) if g["timestamps"] else utc_now()
        
        knowledge_gaps.append({
            "topic": topic_name,
            "questions": list(set(g["questions"])),
            "frequency": len(g["questions"]),
            "last_asked_at": last_asked,
            "recommendation": f"Create or upload a {topic_name} document to resolve this information gap."
        })
        
    knowledge_gaps.sort(key=lambda x: x["frequency"], reverse=True)
    return knowledge_gaps


def update_all_documents_metadata_and_scores():
    from app.storage import storage, safe_json_write
    docs = storage.read_documents()
    chunks = storage.read_chunks()
    
    # 1. Initialize metadata defaults and compute health scores
    for doc in docs:
        if "department" not in doc: doc["department"] = "General"
        if "document_type" not in doc: doc["document_type"] = "Document"
        if "owner" not in doc: doc["owner"] = "Unassigned"
        if "authority_level" not in doc: doc["authority_level"] = "standard"
        if "version" not in doc: doc["version"] = "v1"
        if "status" not in doc: doc["status"] = "active"
        if "review_status" not in doc: doc["review_status"] = "pending"
        if "last_reviewed_at" not in doc: doc["last_reviewed_at"] = None
        if "expiry_warning" not in doc: doc["expiry_warning"] = None
        
        doc["knowledge_health_score"] = calculate_knowledge_health(doc, chunks)
        
    # 2. Compute source-of-truth score
    for doc in docs:
        doc["source_of_truth_score"] = calculate_source_of_truth_score(doc, docs)
        
    # 3. Detect duplicates and conflicts
    duplicates = detect_duplicates(docs, chunks)
    conflicts = detect_conflicts(docs, chunks)
    
    # 4. Populate duplicate and conflict candidates in metadata
    for doc in docs:
        doc_id = doc.get("document_id")
        
        dup_cands = []
        for dup in duplicates:
            da_id = dup["document_a"]["document_id"]
            db_id = dup["document_b"]["document_id"]
            if da_id == doc_id:
                dup_cands.append(db_id)
            elif db_id == doc_id:
                dup_cands.append(da_id)
        doc["duplicate_candidates"] = list(set(dup_cands))
        
        conf_cands = []
        for conf in conflicts:
            conf_doc_ids = [d["document_id"] for d in conf["documents"]]
            if doc_id in conf_doc_ids:
                other_ids = [cid for cid in conf_doc_ids if cid != doc_id]
                conf_cands.extend(other_ids)
        doc["conflict_candidates"] = list(set(conf_cands))
        
    safe_json_write(storage.documents_path, docs)
