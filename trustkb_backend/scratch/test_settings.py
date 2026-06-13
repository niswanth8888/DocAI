import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory is in path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
from app.storage import storage, read_system_settings, write_system_settings, get_default_system_settings
from app.chunker import build_chunks

class TestSystemSettings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # Authenticate as admin
        res = cls.client.post("/auth/admin-login", json={
            "username": "DocAIadmin",
            "password": "17215353"
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        cls.admin_token = res.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def setUp(self):
        # Reset system settings before each test
        default_settings = get_default_system_settings()
        write_system_settings(default_settings)

    def tearDown(self):
        # Clean up settings
        default_settings = get_default_system_settings()
        write_system_settings(default_settings)

    def test_01_get_settings_defaults(self):
        res = self.client.get("/admin/settings", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["selected_model"], "gemini-1.5-flash")
        self.assertEqual(data["temperature"], 0.2)
        self.assertEqual(data["chunk_size"], 1000)
        self.assertEqual(data["chunk_overlap"], 200)

    def test_02_patch_valid_settings(self):
        patch_payload = {
            "selected_model": "gemini-1.5-pro",
            "temperature": 0.4,
            "chunk_size": 1500,
            "chunk_overlap": 300
        }
        res = self.client.patch("/admin/settings", json=patch_payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["selected_model"], "gemini-1.5-pro")
        self.assertEqual(data["temperature"], 0.4)
        self.assertEqual(data["chunk_size"], 1500)
        self.assertEqual(data["chunk_overlap"], 300)
        self.assertEqual(data["updated_by"], "DocAIadmin")

        # Verify persistence
        persisted = read_system_settings()
        self.assertEqual(persisted["selected_model"], "gemini-1.5-pro")
        self.assertEqual(persisted["temperature"], 0.4)
        self.assertEqual(persisted["chunk_size"], 1500)
        self.assertEqual(persisted["chunk_overlap"], 300)

    def test_03_invalid_temperature(self):
        # Too high
        res = self.client.patch("/admin/settings", json={"temperature": 1.2}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Temperature must be between 0.0 and 1.0", res.json()["detail"])

        # Too low
        res2 = self.client.patch("/admin/settings", json={"temperature": -0.5}, headers=self.admin_headers)
        self.assertEqual(res2.status_code, 400)

    def test_04_invalid_chunk_size(self):
        # Too low
        res = self.client.patch("/admin/settings", json={"chunk_size": 250}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Chunk size must be between 300 and 3000", res.json()["detail"])

        # Too high
        res2 = self.client.patch("/admin/settings", json={"chunk_size": 3500}, headers=self.admin_headers)
        self.assertEqual(res2.status_code, 400)

    def test_05_invalid_chunk_overlap(self):
        # Greater than or equal to chunk size
        res = self.client.patch("/admin/settings", json={"chunk_overlap": 1000}, headers=self.admin_headers) # defaults chunk_size=1000
        self.assertEqual(res.status_code, 400)
        self.assertIn("Chunk overlap must be between 0 and 999", res.json()["detail"])

        # negative overlap
        res2 = self.client.patch("/admin/settings", json={"chunk_overlap": -10}, headers=self.admin_headers)
        self.assertEqual(res2.status_code, 400)

    def test_06_chunker_uses_saved_settings(self):
        # Set chunk size to 400
        patch_payload = {
            "chunk_size": 400,
            "chunk_overlap": 50
        }
        res = self.client.patch("/admin/settings", json=patch_payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

        # Mock document pages
        mock_pages = [
            {
                "page": 1,
                "text": "This is page one text.",
                "text_units": [
                    {"page_number": 1, "section_heading": "Intro", "line_start": 1, "line_end": 1, "paragraph_index": 1, "exact_text": "Sentence one is here."},
                    {"page_number": 1, "section_heading": "Intro", "line_start": 2, "line_end": 2, "paragraph_index": 1, "exact_text": "Sentence two is here to test custom sizes."}
                ]
            }
        ]
        
        # If we build chunks, it should use chunk_size=400.
        # Medium chunks are built based on units. Let's provide a long text unit so it chunks it at 400.
        long_text = "A " * 300  # 600 characters
        mock_pages_long = [
            {
                "page": 1,
                "text": long_text,
                "text_units": [
                    {"page_number": 1, "section_heading": "Intro", "line_start": 1, "line_end": 10, "paragraph_index": 1, "exact_text": long_text}
                ]
            }
        ]

        chunks = build_chunks("doc_test", "test.pdf", mock_pages_long)
        medium_chunks = [c for c in chunks if c["chunk_type"] == "medium"]
        
        # We expect it to split long_text into multiple medium chunks if it uses size 400 (600 characters > 400).
        # Wait, if we have 1 unit of 600 characters, does it split?
        # Let's verify that the chunker uses the system settings.
        # Inside build_chunks:
        # settings = read_system_settings() -> size=400
        # `current_len >= chunk_size` condition triggers splitting of units or sliding overlap.
        # In our case, the unit is 600 chars, so `current_len` becomes 600, which is >= 400. So it forms one chunk.
        # If we had multiple units of 200 chars:
        mock_pages_multi = [
            {
                "page": 1,
                "text": "Multi unit text",
                "text_units": [
                    {"page_number": 1, "section_heading": "Intro", "line_start": 1, "line_end": 1, "paragraph_index": 1, "exact_text": "A" * 250},
                    {"page_number": 1, "section_heading": "Intro", "line_start": 2, "line_end": 2, "paragraph_index": 2, "exact_text": "B" * 250},
                    {"page_number": 1, "section_heading": "Intro", "line_start": 3, "line_end": 3, "paragraph_index": 3, "exact_text": "C" * 250}
                ]
            }
        ]
        chunks = build_chunks("doc_test", "test.pdf", mock_pages_multi)
        medium_chunks = [c for c in chunks if c["chunk_type"] == "medium"]
        # With chunk_size=400, unit 1 (250) + unit 2 (250) = 500 >= 400, so it splits.
        # Unit 3 (250) is left over and forms a second chunk.
        # With default chunk_size=1000, 250 + 250 + 250 = 750 < 1000, so it remains as 1 medium chunk.
        self.assertEqual(len(medium_chunks), 2)

if __name__ == "__main__":
    unittest.main()
