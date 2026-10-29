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


class RegisterTests(APITestCase):
    url = "/api/auth/register/"

    def setUp(self):
        cache.clear()
        get_user_model().objects.create_user("Muhammad", password="s3cret-pass")

    def test_signup_creates_account_signs_in_and_starts_empty(self):
        res = self.client.post(self.url, {"username": "ali_trucks", "email": "ali@example.com", "password": "Long-enough-77"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["user"]["username"], "ali_trucks")
        self.assertEqual(self.client.get("/api/auth/me/").data["user"]["username"], "ali_trucks")
        self.assertEqual(self.client.get("/api/trucks/").data, [])
        user = get_user_model().objects.get(username="ali_trucks")
        self.assertFalse(user.is_staff or user.is_superuser)

    def test_username_taken_case_insensitively(self):
        res = self.client.post(self.url, {"username": "muhammad", "password": "Long-enough-77"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["username"], ["username_taken"])

    def test_weak_password_and_bad_username_are_rejected(self):
        res = self.client.post(self.url, {"username": "ali", "password": "12345678"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password_entirely_numeric", res.data["password"])
        res = self.client.post(self.url, {"username": "bad name!", "password": "Long-enough-77"}, format="json")
        self.assertEqual(res.data["username"], ["username_invalid"])
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_signup_can_be_turned_off(self):
        self.assertTrue(self.client.get("/api/auth/me/").data["signup"])
        with self.settings(ALLOW_SIGNUP=False):
            res = self.client.post(self.url, {"username": "ali_trucks", "password": "Long-enough-77"}, format="json")
            self.assertEqual(res.status_code, 403)
            self.assertFalse(self.client.get("/api/auth/me/").data["signup"])
