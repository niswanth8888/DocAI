import sys
from pathlib import Path
import json

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.quality import update_all_documents_metadata_and_scores
from app.storage import storage

def main():
    print("Running recalculation...")
    try:
        update_all_documents_metadata_and_scores()
        print("Recalculation finished successfully.")
        
        # Read and print the updated health scores
        docs = storage.read_documents()
        for doc in docs:
            print(f"Document: {doc.get('document')} | Health: {doc.get('knowledge_health_score')} | SOT: {doc.get('source_of_truth_score')}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
