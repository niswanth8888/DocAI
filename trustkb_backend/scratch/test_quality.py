import sys
from pathlib import Path
import json

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from main import app

def main():
    client = TestClient(app)
    
    print("=" * 60)
    print("TESTING QUALITY ENDPOINTS (AUTHENTICATED)")
    print("=" * 60)
    
    # 0. Admin Authentication
    print("\n0. Authenticating as DocAIadmin...")
    auth_res = client.post("/auth/admin-login", json={
        "username": "DocAIadmin",
        "password": "17215353"
    })
    print(f"Auth Status: {auth_res.status_code}")
    if auth_res.status_code != 200:
        print(f"Authentication failed: {auth_res.text}")
        return
        
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Dashboard
    print("\n1. GET /quality/dashboard")
    res = client.get("/quality/dashboard", headers=headers)
    print(f"Status: {res.status_code}")
    print(json.dumps(res.json(), indent=2))
    
    # 2. Source of Truth
    print("\n2. GET /quality/source-of-truth")
    res = client.get("/quality/source-of-truth", headers=headers)
    print(f"Status: {res.status_code}")
    sot_docs = res.json().get("source_of_truth_documents", [])
    print(json.dumps(res.json(), indent=2))
    
    # 3. Duplicates
    print("\n3. GET /quality/duplicates")
    res = client.get("/quality/duplicates", headers=headers)
    print(f"Status: {res.status_code}")
    print(json.dumps(res.json(), indent=2))
    
    # 4. Conflicts
    print("\n4. GET /quality/conflicts")
    res = client.get("/quality/conflicts", headers=headers)
    print(f"Status: {res.status_code}")
    print(json.dumps(res.json(), indent=2))
    
    # 5. Knowledge Gaps
    print("\n5. GET /quality/knowledge-gaps")
    res = client.get("/quality/knowledge-gaps", headers=headers)
    print(f"Status: {res.status_code}")
    print(json.dumps(res.json(), indent=2))
    
    # 6. Metadata Patch
    if sot_docs:
        doc_id = sot_docs[0]["document_id"]
        print(f"\n6. PATCH /documents/{doc_id}/metadata")
        patch_payload = {
            "department": "Engineering",
            "document_type": "Technical Spec",
            "owner": "Niswanth T",
            "authority_level": "official",
            "version": "2026.06",
            "status": "active",
            "review_status": "approved"
        }
        res = client.patch(f"/documents/{doc_id}/metadata", json=patch_payload, headers=headers)
        print(f"Status: {res.status_code}")
        print(json.dumps(res.json(), indent=2))
        
        # Verify recalculation of scores
        print("\nVerifying updated scores in Source of Truth listing:")
        res = client.get("/quality/source-of-truth", headers=headers)
        print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    main()
