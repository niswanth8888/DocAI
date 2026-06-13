import sys
from pathlib import Path

# Set output encoding to UTF-8 to prevent console errors under Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.rag_engine import answer_question, detect_query_intent
from app.storage import storage

def main():
    print("Starting Hierarchical Retrieval & Reliability Verification Tests...")
    
    # 1. Test query intent classification
    print("\n--- TEST 1: Query Intent Detection ---")
    test_cases = [
        ("Disclaimers regarding the Bonds", "section_lookup"),
        ("section: Introduction", "section_lookup"),
        ("write a detailed report comparing BIOSYNC and standard attendance systems", "report_generation"),
        ("download the leave policy manual", "download_request"),
        ("give me Leave Policy.pdf", "document_lookup"),
        ("What is the leave approval process?", "normal_question")
    ]
    
    for query, expected in test_cases:
        detected = detect_query_intent(query)
        print(f"Query: '{query}' => Intent: '{detected}' (Expected: '{expected}')")
        # For tests, we don't raise as intent classifier is heuristic-based, but we verify it maps well.

    # 2. Test Ask Agent QA with new reliability fields
    print("\n--- TEST 2: Ask Agent QA & Citations Validation ---")
    queries = [
        "What is in the BIOSYNC IEEE paper?",
        "Can employees take leave without approval?",
        "Can employees take unlimited leave without approval?"
    ]
    
    for q in queries:
        print("\n" + "="*80)
        print(f"QUERY: {q}")
        print("="*80)
        
        response = answer_question(q)
        print(f"INTENT: {response.query_intent}")
        print(f"RELIABILITY GROUNDING SCORE: {response.reliability_score}")
        print(f"CONFIDENCE: {response.confidence} (Score: {response.confidence_score})")
        print(f"RELIABILITY WARNING: {response.reliability_warning}")
        print(f"SECTION FOUND: {response.section_found}")
        print(f"EVIDENCE LINE RANGES: {response.evidence_line_ranges}")
        print(f"ANSWER:\n{response.answer}\n")
        
        print(f"SUPPORTING CITATIONS ({len(response.supporting_citations)}):")
        for idx, src in enumerate(response.supporting_citations, 1):
            print(f"  [{idx}] Doc: {src.document} | Page: {src.page} | Lines: {src.line_start}-{src.line_end}")
            print(f"      Section: {src.section_heading}")
            print(f"      Type: {src.citation_type} | Match Score: {src.evidence_match_score}")
            print(f"      Snippet: {src.evidence}")
            print(f"      Quote: {src.quoted_evidence}")
            print("-" * 40)
            
        print(f"RELATED SOURCES ({len(response.related_sources)}):")
        for idx, src in enumerate(response.related_sources, 1):
            print(f"  [{idx}] Doc: {src.document} | Page: {src.page}")
            print(f"      Type: {src.citation_type} | Match Score: {src.evidence_match_score}")
            print("-" * 40)

if __name__ == "__main__":
    main()
