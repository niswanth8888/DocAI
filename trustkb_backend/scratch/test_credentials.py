import requests
import uuid

BASE_URL = "http://127.0.0.1:8000"

def test_admin_login():
    print("--- Test 1: Admin Login ---")
    payload = {
        "username": "DocAIadmin",
        "password": "qwert12345"
    }
    r = requests.post(f"{BASE_URL}/auth/admin-login", json=payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    print("Admin login passed successfully.")
    return data["access_token"]

def test_employee_signup_and_login():
    print("--- Test 2: Employee Signup & Multi-User Isolation ---")
    username = f"testuser_{uuid.uuid4().hex[:6]}"
    email = f"{username}@example.com"
    password = "testpassword123"
    
    # 1. Signup
    signup_payload = {
        "username": f"  {username}  ", # leading/trailing spaces
        "email": f"  {email.upper()}  ", # uppercase and spacing
        "password": password,
        "full_name": "Test Employee User",
        "department": "Engineering",
        "title": "Junior Developer"
    }
    r = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["user"]["username"] == username
    assert data["user"]["email"] == email.lower()
    assert "password_hash" not in data["user"]
    print("Signup verified successfully.")

    # 2. Reject Duplicate Username
    r_dup_user = requests.post(f"{BASE_URL}/auth/signup", json={**signup_payload, "email": "another@example.com"})
    assert r_dup_user.status_code == 400, f"Expected 400 for duplicate username, got {r_dup_user.status_code}"
    assert "Username already exists" in r_dup_user.json()["detail"]
    print("Reject duplicate username passed.")

    # 3. Reject Duplicate Email
    r_dup_email = requests.post(f"{BASE_URL}/auth/signup", json={**signup_payload, "username": "anotheruser"})
    assert r_dup_email.status_code == 400, f"Expected 400 for duplicate email, got {r_dup_email.status_code}"
    assert "Email already exists" in r_dup_email.json()["detail"]
    print("Reject duplicate email passed.")

    # 4. Login with username
    login_payload_username = {
        "identifier": f"  {username}  ",
        "password": password
    }
    r_login = requests.post(f"{BASE_URL}/auth/login", json=login_payload_username)
    assert r_login.status_code == 200, f"Expected 200, got {r_login.status_code}: {r_login.text}"
    login_data = r_login.json()
    assert "access_token" in login_data
    assert "password_hash" not in login_data["user"]
    user_id = login_data["user"]["user_id"]
    print("Login with username verified successfully.")

    # 5. Login with email (case insensitive)
    login_payload_email = {
        "identifier": f"  {email.upper()}  ",
        "password": password
    }
    r_login_email = requests.post(f"{BASE_URL}/auth/login", json=login_payload_email)
    assert r_login_email.status_code == 200, f"Expected 200, got {r_login_email.status_code}"
    print("Login with email verified successfully.")

    return user_id, username, email, password

def test_deactivation_blocks_login(admin_token, user_id, username, password):
    print("--- Test 3: Deactivation blocks login ---")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Inactivate user
    patch_payload = {
        "is_active": False
    }
    r_patch = requests.patch(f"{BASE_URL}/admin/users/{user_id}", json=patch_payload, headers=headers)
    assert r_patch.status_code == 200, f"Expected 200, got {r_patch.status_code}: {r_patch.text}"
    assert r_patch.json()["user"]["is_active"] is False
    assert r_patch.json()["user"]["status"] == "disabled"
    print("User inactivated successfully via admin.")

    # 2. Login should fail
    login_payload = {
        "identifier": username,
        "password": password
    }
    r_login = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    assert r_login.status_code == 403, f"Expected 403, got {r_login.status_code}: {r_login.text}"
    assert "Account is disabled. Contact administrator." in r_login.json()["detail"]
    print("Inactivated user login block verified successfully.")

    # 3. Reactivate user
    patch_payload = {
        "is_active": True
    }
    r_patch = requests.patch(f"{BASE_URL}/admin/users/{user_id}", json=patch_payload, headers=headers)
    assert r_patch.status_code == 200
    assert r_patch.json()["user"]["is_active"] is True
    print("User reactivated successfully via admin.")

    # 4. Login should work again
    r_login = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    assert r_login.status_code == 200
    print("Reactivated user login verified successfully.")

def test_password_reset(admin_token, user_id, username, old_password):
    print("--- Test 4: Password reset via admin ---")
    headers = {"Authorization": f"Bearer {admin_token}"}
    new_password = "newsupersecurepassword99"
    
    # 1. Reset password
    reset_payload = {
        "new_password": new_password,
        "must_change_password": False
    }
    r_reset = requests.patch(f"{BASE_URL}/admin/users/{user_id}/password", json=reset_payload, headers=headers)
    assert r_reset.status_code == 200, f"Expected 200, got {r_reset.status_code}: {r_reset.text}"
    print("Password reset request submitted successfully.")

    # 2. Login with old password should fail
    login_payload_old = {
        "identifier": username,
        "password": old_password
    }
    r_login_old = requests.post(f"{BASE_URL}/auth/login", json=login_payload_old)
    assert r_login_old.status_code == 401, f"Expected 401, got {r_login_old.status_code}"
    print("Login with old password blocked correctly.")

    # 3. Login with new password should succeed
    login_payload_new = {
        "identifier": username,
        "password": new_password
    }
    r_login_new = requests.post(f"{BASE_URL}/auth/login", json=login_payload_new)
    assert r_login_new.status_code == 200, f"Expected 200, got {r_login_new.status_code}"
    print("Login with new password succeeded.")

if __name__ == "__main__":
    try:
        admin_tok = test_admin_login()
        u_id, u_name, u_email, u_pwd = test_employee_signup_and_login()
        test_deactivation_blocks_login(admin_tok, u_id, u_name, u_pwd)
        test_password_reset(admin_tok, u_id, u_name, u_pwd)
        print("\nALL CREDENTIALS AND AUTH TESTS COMPLETED SUCCESSFULLY!")
    except AssertionError as ae:
        print(f"\nAssertion Error: {ae}")
    except Exception as e:
        print(f"\nUnexpected Error: {e}")
