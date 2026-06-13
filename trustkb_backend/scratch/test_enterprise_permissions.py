import sys
import time
import requests
import io

BASE_URL = "http://127.0.0.1:8000"

def test_enterprise_permissions():
    suffix = int(time.time())
    username_a = f"emp_a_{suffix}"
    email_a = f"emp_a_{suffix}@docai.local"
    username_b = f"emp_b_{suffix}"
    email_b = f"emp_b_{suffix}@docai.local"
    password = "password123"

    print("=" * 60)
    print("STARTING ENTERPRISE PERMISSIONS TEST SUITE")
    print("=" * 60)

    # 0. Clean up previous test documents to ensure no leakage
    print("Logging in Admin for database cleanup...")
    res = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "username": "DocAIadmin",
        "password": "qwert12345"
    })
    if res.status_code == 200:
        token_admin = res.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {token_admin}"}
        res_docs = requests.get(f"{BASE_URL}/documents", headers=headers_admin)
        if res_docs.status_code == 200:
            docs_list = res_docs.json().get("documents", [])
            cleaned_count = 0
            for d in docs_list:
                doc_name = d.get("document", "")
                if "engineering_secrets" in doc_name:
                    d_res = requests.delete(f"{BASE_URL}/documents/{d['document_id']}", headers=headers_admin)
                    if d_res.status_code == 200:
                        cleaned_count += 1
            print(f"Cleaned up {cleaned_count} engineering_secrets documents from previous runs.")

    # 1. Sign up Employee A (Engineering)
    print("\n[Step 1] Signing up Employee A (Engineering)...")
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": f"Employee A {suffix}",
        "username": username_a,
        "email": email_a,
        "password": password,
        "department": "Engineering",
        "designation": "Software Engineer"
    })
    if res.status_code != 200:
        print(f"FAILED to sign up Employee A: {res.text}")
        sys.exit(1)
    token_a = res.json()["access_token"]
    user_a_id = res.json()["user"]["user_id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print(f"Employee A registered: {username_a} (ID: {user_a_id})")

    # 2. Sign up Employee B (Sales)
    print("\n[Step 2] Signing up Employee B (Sales)...")
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": f"Employee B {suffix}",
        "username": username_b,
        "email": email_b,
        "password": password,
        "department": "Sales",
        "designation": "Sales executive"
    })
    if res.status_code != 200:
        print(f"FAILED to sign up Employee B: {res.text}")
        sys.exit(1)
    token_b = res.json()["access_token"]
    user_b_id = res.json()["user"]["user_id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print(f"Employee B registered: {username_b} (ID: {user_b_id})")

    # 3. Log in Admin
    print("\n[Step 3] Logging in Admin...")
    res = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "username": "DocAIadmin",
        "password": "qwert12345"
    })
    if res.status_code != 200:
        print(f"FAILED to login Admin: {res.text}")
        sys.exit(1)
    token_admin = res.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    print("Admin logged in successfully.")

    # 4. Upload document as Employee A
    print("\n[Step 4] Uploading document as Employee A...")
    doc_content = f"This document contains confidential guidelines for the Engineering department on how to write code. Suffix: {suffix}"
    file_payload = {"file": (f"engineering_secrets_{suffix}.txt", io.BytesIO(doc_content.encode("utf-8")), "text/plain")}
    res = requests.post(f"{BASE_URL}/upload", files=file_payload, headers=headers_a)
    if res.status_code != 200:
        print(f"FAILED to upload document: {res.text}")
        sys.exit(1)
    doc_id = res.json()["document_id"]
    print(f"Document uploaded. ID: {doc_id}, Status: {res.json()['status']}")

    # Wait a few seconds for background processing
    print("Waiting 3 seconds for background processing...")
    time.sleep(3)

    # 5. Verify document visibility (Pending state)
    print("\n[Step 5] Checking document visibility in Pending state...")
    
    # Employee A should see their own pending document
    res = requests.get(f"{BASE_URL}/documents", headers=headers_a)
    docs_a = res.json().get("documents", [])
    found_a = any(d["document_id"] == doc_id for d in docs_a)
    print(f"Employee A can see own pending document: {found_a}")
    assert found_a, "Employee A should see their own pending document."

    # Employee B should NOT see Employee A's pending document
    res = requests.get(f"{BASE_URL}/documents", headers=headers_b)
    docs_b = res.json().get("documents", [])
    found_b = any(d["document_id"] == doc_id for d in docs_b)
    print(f"Employee B can see Employee A's pending document: {found_b}")
    assert not found_b, "Employee B should NOT see Employee A's pending document."

    # Admin should see the document in list
    res = requests.get(f"{BASE_URL}/documents", headers=headers_admin)
    docs_admin = res.json().get("documents", [])
    found_admin = any(d["document_id"] == doc_id for d in docs_admin)
    print(f"Admin can see pending document in list: {found_admin}")
    assert found_admin, "Admin should see the pending document."

    # 6. Verify Ask Agent excludes pending document chunks
    print("\n[Step 6] Verifying Ask Agent excludes pending document chunks...")
    res = requests.post(f"{BASE_URL}/ask", json={
        "question": "What are the confidential guidelines for the Engineering department?",
        "top_k": 3,
        "answer_mode": "detailed"
    }, headers=headers_a)
    print("Ask response as Employee A (Pending):")
    print("Status code:", res.status_code)
    # Since Employee A has no approved documents, their Ask Agent might return an error or empty result
    if res.status_code == 200:
        ans = res.json().get("answer", "")
        print(f"Answer: {ans}")
        # Make sure it does not contain the secret content
        assert "confidential guidelines" not in ans.lower(), "Should not retrieve from pending document."
    else:
        print(f"Response: {res.status_code} - {res.text}")

    # 7. Admin reviews and approves the document with specific department permissions (Engineering only, allow_download=False)
    print("\n[Step 7] Admin approving document with restricted permissions...")
    res = requests.patch(f"{BASE_URL}/admin/documents/{doc_id}/approve", json={
        "visibility": "department",
        "allowed_departments": ["Engineering"],
        "allowed_groups": [],
        "allow_download": False,
        "download_allowed_roles": ["employee"]
    }, headers=headers_admin)
    if res.status_code != 200:
        print(f"FAILED to approve document: {res.text}")
        sys.exit(1)
    print("Document approved with visibility=department (Engineering) and allow_download=False.")

    # 8. Verify Visibility after Approval
    print("\n[Step 8] Checking visibility after approval...")
    
    # Employee A (Engineering) should see it
    res = requests.get(f"{BASE_URL}/documents", headers=headers_a)
    docs_a = res.json().get("documents", [])
    doc_a_record = next((d for d in docs_a if d["document_id"] == doc_id), None)
    print(f"Employee A can see approved document: {doc_a_record is not None}")
    assert doc_a_record is not None, "Employee A (Engineering) should see the approved document."
    assert doc_a_record["status"] == "approved"

    # Employee B (Sales) should NOT see it
    res = requests.get(f"{BASE_URL}/documents", headers=headers_b)
    docs_b = res.json().get("documents", [])
    found_b = any(d["document_id"] == doc_id for d in docs_b)
    print(f"Employee B can see approved document: {found_b}")
    assert not found_b, "Employee B (Sales) should NOT see the approved document."

    # 9. Verify Download Protection (allow_download=False)
    print("\n[Step 9] Verifying download protection (allow_download=False)...")
    
    # Employee A is the owner, so can they download?
    # can_download_document: returns True for owner!
    res = requests.get(f"{BASE_URL}/documents/{doc_id}/download", headers=headers_a)
    print(f"Employee A (Owner) download status: {res.status_code}")
    assert res.status_code == 200, "Owner should be allowed to download their own document."

    # Now let's test if a NON-owner in the same department gets blocked when allow_download=False.
    # We will create Employee C in Engineering who is a non-owner, and verify they get blocked!
    username_c = f"emp_c_{suffix}"
    email_c = f"emp_c_{suffix}@docai.local"
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": f"Employee C {suffix}",
        "username": username_c,
        "email": email_c,
        "password": password,
        "department": "Engineering",
        "designation": "Software Engineer"
    })
    token_c = res.json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}
    
    # Employee C (non-owner in Engineering) tries to download. Should get 403 because allow_download is False.
    res = requests.get(f"{BASE_URL}/documents/{doc_id}/download", headers=headers_c)
    print(f"Employee C (Non-Owner, Same Dept) download status (allow_download=False): {res.status_code}")
    assert res.status_code == 403, "Non-owner should be blocked from download when allow_download is False."

    # 10. Admin enables download for the document
    print("\n[Step 10] Admin enabling download for the document...")
    res = requests.patch(f"{BASE_URL}/admin/documents/{doc_id}/approve", json={
        "visibility": "department",
        "allowed_departments": ["Engineering"],
        "allowed_groups": [],
        "allow_download": True,
        "download_allowed_roles": ["employee"]
    }, headers=headers_admin)
    if res.status_code != 200:
        print(f"FAILED to update document metadata: {res.text}")
        sys.exit(1)
    
    # Employee C tries to download again. Should succeed now!
    res = requests.get(f"{BASE_URL}/documents/{doc_id}/download", headers=headers_c)
    print(f"Employee C (Non-Owner, Same Dept) download status (allow_download=True): {res.status_code}")
    assert res.status_code == 200, "Non-owner should be allowed to download when allow_download is True."

    # 11. Verify Ask Agent filters search queries by department
    print("\n[Step 11] Verifying Ask Agent filters queries by department...")
    
    # Employee C (Engineering) asks a question. The document is approved and department matches, so they should get the answer.
    res = requests.post(f"{BASE_URL}/ask", json={
        "question": "What are the confidential guidelines for the Engineering department?",
        "top_k": 3,
        "answer_mode": "detailed"
    }, headers=headers_c)
    print(f"Employee C (Engineering) Ask Status: {res.status_code}")
    if res.status_code == 200:
        ans = res.json().get("answer", "")
        print(f"Answer for Employee C: {ans}")
        assert "confidential guidelines" in ans.lower(), "Employee C should retrieve answer from the document."
    else:
        print(f"Ask failed for Employee C: {res.text}")
        sys.exit(1)

    # Employee B (Sales) asks the same question. The document department does NOT match Sales, so they should not get it.
    res = requests.post(f"{BASE_URL}/ask", json={
        "question": "What are the confidential guidelines for the Engineering department?",
        "top_k": 3,
        "answer_mode": "detailed"
    }, headers=headers_b)
    print(f"Employee B (Sales) Ask Status: {res.status_code}")
    if res.status_code == 200:
        ans = res.json().get("answer", "")
        print(f"Answer for Employee B: {ans}")
        assert "confidential guidelines" not in ans.lower(), "Employee B should NOT retrieve answer from the document."
    elif res.status_code in [400, 403]:
        print(f"Employee B correctly blocked or rejected due to no accessible documents: {res.text}")
    else:
        print(f"Unexpected status for Employee B: {res.status_code}")

    print("\n" + "=" * 60)
    print("ALL ENTERPRISE ACCESS CONTROL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_enterprise_permissions()
