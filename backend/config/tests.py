import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings


class SpaViewTests(SimpleTestCase):
    def test_serves_index_for_client_routes(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "index.html").write_text("<div id=root></div>", encoding="utf-8")
            with override_settings(FRONTEND_DIST=Path(tmp)):
                for url in ("/", "/loads", "/report"):
                    res = self.client.get(url)
                    self.assertEqual(res.status_code, 200, url)
                    self.assertIn(b"id=root", b"".join(res.streaming_content))
                    res.close()

    def test_missing_build_returns_503_with_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            with override_settings(FRONTEND_DIST=Path(tmp)):
                res = self.client.get("/")
        self.assertEqual(res.status_code, 503)
        self.assertIn(str(Path(tmp, "index.html")), res.content.decode())

    def test_api_routes_are_not_swallowed(self):
        res = self.client.get("/api/auth/me/")
        self.assertNotEqual(res.status_code, 503)
