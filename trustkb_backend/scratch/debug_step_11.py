import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.storage import storage
from app.auth_helper import can_ask_document
from app.rag_engine import hybrid_retrieve, answer_question

def main():
    # 1. Replicate Employee C
    user = {
        "user_id": "temp_debug_c",
        "username": "debug_c",
        "role": "employee",
        "department": "Engineering",
        "access_groups": [],
        "is_active": True
    }
    
    # 2. Find the engineering_secrets document
    docs = storage.read_documents()
    target_doc = None
    for doc in reversed(docs):
        doc_name = doc.get("document", "")
        if "engineering_secrets" in doc_name:
            target_doc = doc
            break
            
    if not target_doc:
        print("ERROR: No engineering_secrets document found in storage.")
        return
        
    print(f"Found Target Document: {target_doc.get('document')} (ID: {target_doc.get('document_id')})")
    print(f"Status: {target_doc.get('status')}")
    print(f"Visibility: {target_doc.get('visibility')}")
    print(f"Allowed Departments: {target_doc.get('allowed_departments')}")
    print(f"Allowed Groups: {target_doc.get('allowed_groups')}")
    
    # 3. Check permissions
    can_ask = can_ask_document(user, target_doc)
    print(f"can_ask_document(user, target_doc): {can_ask}")
    
    # 4. Check if chunks for this doc are stored
    chunks = storage.read_chunks()
    doc_chunks = [c for c in chunks if c.get("document_id") == target_doc.get("document_id")]
    print(f"Number of chunks stored in JSON for this doc: {len(doc_chunks)}")
    if doc_chunks:
        print("First chunk sample text:")
        print(doc_chunks[0].get("text"))
    else:
        print("WARNING: No chunks exist in storage.json for this document!")
        
    # 5. Run hybrid_retrieve
    question = "What are the confidential guidelines for the Engineering department?"
    print(f"\nRunning hybrid_retrieve for: '{question}'")
    
    # Let's inspect before hybrid_retrieve
    all_docs = storage.read_documents()
    allowed_docs = [d for d in all_docs if can_ask_document(user, d)]
    allowed_doc_ids = {d.get("document_id") for d in allowed_docs}
    print(f"Total allowed documents for user: {len(allowed_docs)}")
    print(f"Is target doc ID in allowed_doc_ids? {target_doc.get('document_id') in allowed_doc_ids}")
    
    import app.vector_store
    app.vector_store.vector_store.search("", top_k=1) # load cache
    cached_chunks = app.vector_store.vector_store._cache_chunks or []
    target_cached_chunks = [c for c in cached_chunks if c.get("document_id") == target_doc.get("document_id")]
    print(f"Total chunks in vector store cache: {len(cached_chunks)}")
    print(f"Chunks for target doc in cache: {len(target_cached_chunks)}")
    if target_cached_chunks:
        print(f"Target chunk IDs: {[c.get('chunk_id') for c in target_cached_chunks]}")
    
    retrieved = hybrid_retrieve(question, top_k=3, user=user)
    print(f"Retrieved {len(retrieved)} chunks:")
    for idx, c in enumerate(retrieved):
        print(f"[{idx}] Doc: {c.get('document')} | Chunk ID: {c.get('chunk_id')}")
        print(f"    Text: {c.get('text')}")
        print(f"    Citation Type: {c.get('citation_type')}")
        print(f"    Evidence Match Score: {c.get('evidence_match_score')}")
        print(f"    Similarity Score: {c.get('similarity_score')}")
        print(f"    Ranking Score: {c.get('ranking_score')}")
        
    # 6. Run answer_question
    print("\nRunning answer_question...")
    ans = answer_question(question, top_k=3, user=user)
    print("Answer response:")
    print(f"Answer: {ans.answer}")
    print(f"Confidence score: {ans.confidence_score}")
    print(f"Exact match found: {ans.exact_match_found}")

if __name__ == "__main__":
    main()
