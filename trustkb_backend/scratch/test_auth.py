import sys
import time
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_auth():
    print("Waiting 3 seconds for uvicorn to fully start...")
    time.sleep(3)
    
    print("\n--- 1. Testing Admin Login (DocAIadmin / qwert12345) ---")
    res = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "username": "DocAIadmin",
        "password": "qwert12345"
    })
    print("Status code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Success! Admin Token:", data["access_token"][:20] + "...")
        print("User profile:", data["user"])
        admin_token = data["access_token"]
    else:
        print("Failed:", res.text)
        sys.exit(1)

    print("\n--- 2. Testing Normal User Signup (niswanth) ---")
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": "Niswanth T",
        "username": "niswanth",
        "email": "niswanth8888@gmail.com",
        "password": "qwert12345",
        "department": "Engineering",
        "designation": "Data Analyst"
    })
    print("Status code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Success! User Token:", data["access_token"][:20] + "...")
        print("User profile:", data["user"])
        user_token = data["access_token"]
    else:
        print("Failed:", res.text)
        sys.exit(1)

    print("\n--- 3. Testing Duplicate Username Signup ---")
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": "Another Name",
        "username": "niswanth",
        "email": "another@gmail.com",
        "password": "password123"
    })
    print("Status code:", res.status_code)
    print("Response text:", res.text)
    assert res.status_code == 400
    assert "Username already exists" in res.text

    print("\n--- 4. Testing Duplicate Email Signup ---")
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "name": "Another Name",
        "username": "different_username",
        "email": "niswanth8888@gmail.com",
        "password": "password123"
    })
    print("Status code:", res.status_code)
    print("Response text:", res.text)
    assert res.status_code == 400
    assert "Email already exists" in res.text

    print("\n--- 5. Testing Normal Login using Username (niswanth) ---")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "identifier": "niswanth",
        "password": "qwert12345"
    })
    print("Status code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Success! Logged in with username.")
    else:
        print("Failed:", res.text)
        sys.exit(1)

    print("\n--- 6. Testing Normal Login using Email (niswanth8888@gmail.com) ---")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "identifier": "niswanth8888@gmail.com",
        "password": "qwert12345"
    })
    print("Status code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Success! Logged in with email.")
    else:
        print("Failed:", res.text)
        sys.exit(1)

    print("\n--- 7. Testing Profile Update (PATCH /profile) ---")
    headers = {"Authorization": f"Bearer {user_token}"}
    res = requests.patch(f"{BASE_URL}/profile", json={
        "name": "Niswanth T",
        "username": "niswanth_t",
        "department": "Engineering",
        "designation": "AI Developer"
    }, headers=headers)
    print("Status code:", res.status_code)
    if res.status_code == 200:
        data = res.json()
        print("Success! Updated profile:", data)
        assert data["username"] == "niswanth_t"
    else:
        print("Failed:", res.text)
        sys.exit(1)

    print("\n--- 8. Testing Password Change (PATCH /profile/change-password) ---")
    res = requests.patch(f"{BASE_URL}/profile/change-password", json={
        "old_password": "qwert12345",
        "new_password": "newpassword123"
    }, headers=headers)
    print("Status code:", res.status_code)
    if res.status_code == 200:
        print("Success! Password changed successfully.")
    else:
        print("Failed:", res.text)
        sys.exit(1)

    print("\n--- 9. Verify Login with New Password ---")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "identifier": "niswanth_t",
        "password": "newpassword123"
    })
    print("Status code:", res.status_code)
    if res.status_code == 200:
        print("Success! Logged in with new password.")
    else:
        print("Failed:", res.text)
        sys.exit(1)

    print("\nALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_auth()
