from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase


class AuthFlowTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user("owner", password="s3cret-pass")

    def test_me_is_anonymous_by_default(self):
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["user"])

    def test_login_then_me_then_logout(self):
        res = self.client.post("/api/auth/login/", {"username": "owner", "password": "s3cret-pass"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"]["username"], "owner")
        self.assertEqual(self.client.get("/api/auth/me/").data["user"]["username"], "owner")
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.assertIsNone(self.client.get("/api/auth/me/").data["user"])

    def test_username_is_case_insensitive(self):
        res = self.client.post("/api/auth/login/", {"username": "OWNER", "password": "s3cret-pass"}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_wrong_password_is_rejected(self):
        res = self.client.post("/api/auth/login/", {"username": "owner", "password": "nope"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], "invalid_credentials")

    def test_authenticated_writes_require_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        client.login(username="owner", password="s3cret-pass")
        self.assertEqual(client.post("/api/auth/logout/").status_code, 403)
