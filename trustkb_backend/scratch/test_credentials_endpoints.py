import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory is in path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
from app.storage import storage
from app.utils import hash_password

class TestCredentialsEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # We will retrieve the default admin credentials and make sure they are active
        cls.users = storage.read_users()
        # Find DocAIadmin
        cls.admin_user = next((u for u in cls.users if u.get("username") == "DocAIadmin"), None)
        if not cls.admin_user:
            raise Exception("DocAIadmin not found in database")
        
        # Log in as admin to get token
        res = cls.client.post("/auth/admin-login", json={
            "username": "DocAIadmin",
            "password": "17215353"
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        cls.admin_token = res.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_01_user_signup_and_uniqueness(self):
        # Create a new user
        signup_payload = {
            "username": "testuser1",
            "email": "testuser1@example.com",
            "password": "testpassword123",
            "full_name": "Test User One",
            "department": "Engineering",
            "title": "Engineer"
        }
        res = self.client.post("/auth/signup", json=signup_payload)
        self.assertEqual(res.status_code, 200, f"Signup failed: {res.text}")
        data = res.json()
        self.assertNotIn("password_hash", data["user"])
        self.assertEqual(data["user"]["username"], "testuser1")
        self.assertEqual(data["user"]["full_name"], "Test User One")
        self.assertEqual(data["user"]["title"], "Engineer")
        self.assertEqual(data["user"]["designation"], "Engineer") # compat check

        # Attempt duplicate username signup
        res_dup_user = self.client.post("/auth/signup", json={
            "username": "testuser1",
            "email": "diff@example.com",
            "password": "testpassword123",
            "full_name": "Diff Name",
            "department": "Engineering",
            "title": "Engineer"
        })
        self.assertEqual(res_dup_user.status_code, 400)
        self.assertIn("Username already exists", res_dup_user.json()["detail"])

        # Attempt duplicate email signup
        res_dup_email = self.client.post("/auth/signup", json={
            "username": "diffuser",
            "email": "testuser1@example.com",
            "password": "testpassword123",
            "full_name": "Diff Name",
            "department": "Engineering",
            "title": "Engineer"
        })
        self.assertEqual(res_dup_email.status_code, 400)
        self.assertIn("Email already exists", res_dup_email.json()["detail"])

    def test_02_admin_user_patch_and_guard(self):
        # Find testuser1
        users = storage.read_users()
        user_obj = next((u for u in users if u.get("username") == "testuser1"), None)
        self.assertIsNotNone(user_obj)

        # Patch user details
        patch_payload = {
            "full_name": "Updated User One",
            "title": "Senior Engineer",
            "department": "IT / Administration",
            "role": "user"
        }
        res = self.client.patch(f"/admin/users/{user_obj['user_id']}", json=patch_payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200, f"Patch failed: {res.text}")
        data = res.json()["user"]
        self.assertEqual(data["full_name"], "Updated User One")
        self.assertEqual(data["name"], "Updated User One") # compat check
        self.assertEqual(data["title"], "Senior Engineer")
        self.assertEqual(data["designation"], "Senior Engineer") # compat check
        self.assertEqual(data["department"], "IT / Administration")

        # Test active admin protection: try to demote the admin
        res_demote = self.client.patch(f"/admin/users/{self.admin_user['user_id']}", json={"role": "user"}, headers=self.admin_headers)
        self.assertEqual(res_demote.status_code, 400)
        self.assertIn("Cannot deactivate or demote the last active administrator", res_demote.json()["detail"])

        # Test active admin protection: try to deactivate the admin
        res_deactivate = self.client.patch(f"/admin/users/{self.admin_user['user_id']}", json={"is_active": False}, headers=self.admin_headers)
        self.assertEqual(res_deactivate.status_code, 400)
        self.assertIn("Cannot deactivate or demote the last active administrator", res_deactivate.json()["detail"])

    def test_03_admin_reset_user_password(self):
        # Find testuser1
        users = storage.read_users()
        user_obj = next((u for u in users if u.get("username") == "testuser1"), None)
        
        # Reset password
        reset_payload = {
            "new_password": "newresetpassword123",
            "must_change_password": True
        }
        res = self.client.patch(f"/admin/users/{user_obj['user_id']}/password", json=reset_payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")

        # Verify that we can login with the reset password
        login_res = self.client.post("/auth/login", json={
            "identifier": "testuser1",
            "password": "newresetpassword123"
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.json()["user"]["must_change_password"])

    def test_04_profile_credentials_self_update(self):
        # Log in as testuser1
        login_res = self.client.post("/auth/login", json={
            "identifier": "testuser1",
            "password": "newresetpassword123"
        })
        user_token = login_res.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # Update username, email, and password using credentials self-update
        self_update_payload = {
            "username": "testuser1_updated",
            "email": "testuser1_new@example.com",
            "current_password": "newresetpassword123",
            "new_password": "finalpassword789"
        }
        res = self.client.patch("/profile/credentials", json=self_update_payload, headers=user_headers)
        self.assertEqual(res.status_code, 200, f"Self-update failed: {res.text}")
        data = res.json()
        self.assertEqual(data["username"], "testuser1_updated")
        self.assertEqual(data["email"], "testuser1_new@example.com")
        self.assertFalse(data["must_change_password"])

        # Try to log in with new password and new username
        login_res_new = self.client.post("/auth/login", json={
            "identifier": "testuser1_updated",
            "password": "finalpassword789"
        })
        self.assertEqual(login_res_new.status_code, 200)
        self.assertNotIn("password_hash", login_res_new.json()["user"])

    @classmethod
    def tearDownClass(cls):
        # Cleanup testuser1 from users file so we don't clutter storage
        users = storage.read_users()
        users = [u for u in users if u.get("username") not in ("testuser1", "testuser1_updated")]
        storage.write_users(users)

if __name__ == "__main__":
    unittest.main()
