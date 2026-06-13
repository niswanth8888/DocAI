import sys
from pathlib import Path

# Set output encoding to UTF-8 to prevent console errors under Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.rag_engine import answer_question

def main():
    queries = [
        "What is in the BIOSYNC IEEE paper?",
        "Who is Niswanth T?",
        "What is the target internship role of Niswanth T?"
    ]
    
    for q in queries:
        print("="*60)
        print(f"QUESTION: {q}")
        print("="*60)
        
        response = answer_question(q)
        print(f"ANSWER:\n{response.answer}\n")
        print(f"CONFIDENCE: {response.confidence} (Score: {response.confidence_score})")
        print(f"ANSWER TYPE: {response.answer_type}")
        print(f"REASONING SUMMARY: {response.reasoning_summary}")
        print(f"PRIMARY DOCUMENT: {response.primary_document} (ID: {response.primary_document_id})")
        print(f"DOWNLOAD URL: {response.download_url}")
        
        print("\nSOURCES:")
        for idx, src in enumerate(response.sources, 1):
            print(f"  Source {idx}:")
            print(f"    Document: {src.document} (Page {src.page})")
            print(f"    Relevance: {src.citation_relevance_score}")
            print(f"    Support Summary: {src.citation_support_summary}")
            print(f"    Evidence snippet: {src.evidence}")
            print(f"    Download URL: {src.download_url}")
            print("-" * 40)
            
if __name__ == "__main__":
    main()
