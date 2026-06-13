from __future__ import annotations

from typing import Any
import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.storage import storage
from app.utils import short_evidence
import re

STOPWORDS_RETRIEVAL = {
    "what", "who", "where", "when", "why", "how", "is", "are", "was", "were", 
    "in", "on", "at", "the", "a", "an", "and", "or", "for", "to", "of", "about", 
    "explain", "summarize", "tell", "me", "details", "document", "paper", "role", 
    "seeking", "internship"
}

def extract_important_terms(text: str) -> list[str]:
    words = re.findall(r"\b[a-zA-Z0-9]{3,}\b", text.lower())
    return [w for w in words if w not in STOPWORDS_RETRIEVAL]


class LocalVectorStore:
    """
    Lightweight local retrieval engine with in-memory caching.
    """

    def __init__(self) -> None:
        self.vectorizer = HashingVectorizer(
            n_features=2**18,
            alternate_sign=False,
            norm="l2",
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
        )
        self._cache_chunks: list[dict[str, Any]] | None = None
        self._cache_matrix: Any = None
        self._cache_docs: dict[str, dict[str, Any]] | None = None

    def invalidate_cache(self) -> None:
        self._cache_chunks = None
        self._cache_matrix = None
        self._cache_docs = None

    def add_chunks(self, chunks: list[dict[str, Any]]) -> None:
        storage.add_chunks(chunks)
        self.invalidate_cache()

    def search(self, question: str, top_k: int = 5, document_id: str | None = None) -> list[dict[str, Any]]:
        # Load cache if empty
        if self._cache_chunks is None:
            self._cache_chunks = storage.read_chunks()
            if self._cache_chunks:
                texts = [chunk.get("text", "") for chunk in self._cache_chunks]
                self._cache_matrix = self.vectorizer.transform(texts)
                self._cache_docs = {d.get("document_id"): d for d in storage.read_documents()}
            else:
                self._cache_matrix = None
                self._cache_docs = {}

        chunks = self._cache_chunks
        matrix = self._cache_matrix
        docs = self._cache_docs

        if not chunks or matrix is None:
            return []

        # Filter chunks by document_id if requested
        if document_id:
            filtered_indices = [i for i, c in enumerate(chunks) if c.get("document_id") == document_id]
            if not filtered_indices:
                return []
            filtered_chunks = [chunks[i] for i in filtered_indices]
            # Subset the sparse matrix
            filtered_matrix = matrix[filtered_indices]
        else:
            filtered_chunks = chunks
            filtered_matrix = matrix

        query_vector = self.vectorizer.transform([question])
        scores = cosine_similarity(query_vector, filtered_matrix).flatten()

        query_terms = extract_important_terms(question)

        candidate_results: list[dict[str, Any]] = []
        for idx in range(len(filtered_chunks)):
            chunk = dict(filtered_chunks[idx])
            vector_score = float(scores[idx])
            
            # Hybrid ranking score calculation
            ranking_score = vector_score
            
            # Source of Truth Ranking
            c_doc_id = chunk.get("document_id")
            doc_meta = docs.get(c_doc_id) if c_doc_id else None
            sot_score = 0.5
            doc_status = "active"
            if doc_meta:
                sot_score = doc_meta.get("source_of_truth_score", 0.5)
                doc_status = doc_meta.get("status", "active").lower()
                
            ranking_score += sot_score * 0.20
            if doc_status in ["archived", "outdated"]:
                ranking_score -= 0.25
                
            doc_name = chunk.get("document", "").lower()
            chunk_text = chunk.get("text", "").lower()
            
            if query_terms:
                # 1. Term in chunk text: +0.10 per term, max +0.30
                terms_in_text = sum(1 for term in query_terms if term in chunk_text)
                ranking_score += min(terms_in_text * 0.10, 0.30)
                
                # 2. Term in document name: +0.25 per term
                terms_in_doc = sum(1 for term in query_terms if term in doc_name)
                ranking_score += terms_in_doc * 0.25
                
                # 3. Term length >= 5 in document name: +0.40
                has_len5_in_doc = any(len(term) >= 5 and term in doc_name for term in query_terms)
                if has_len5_in_doc:
                    ranking_score += 0.40
                    
                # 4. Term length >= 5 in chunk text: +0.30
                has_len5_in_text = any(len(term) >= 5 and term in chunk_text for term in query_terms)
                if has_len5_in_text:
                    ranking_score += 0.30
                    
                # Count total unique matched terms
                total_matched = sum(1 for term in query_terms if term in chunk_text or term in doc_name)
                
                # 5. Matched important terms >= 2: +0.20
                if total_matched >= 2:
                    ranking_score += 0.20
                    
                # 6. Query has important terms but chunk/document contains none of them: -0.35
                if total_matched == 0:
                    ranking_score -= 0.35
            
            chunk["similarity_score"] = round(vector_score, 4)
            chunk["ranking_score"] = round(ranking_score, 4)
            chunk["evidence"] = short_evidence(chunk.get("text", ""), 650)
            candidate_results.append(chunk)

        # Sort by ranking_score descending
        candidate_results.sort(key=lambda x: x.get("ranking_score", 0.0), reverse=True)
        
        return candidate_results[:top_k]


vector_store = LocalVectorStore()
