import re
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import MAX_ATTEMPTS, PasswordResetCode

FORGOT, RESET = "/api/auth/password/forgot/", "/api/auth/password/reset/"
NEW = "Brand-new-pass-77"


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user("Muhammad", email="m@example.com", password="old-pass-123")

    def request_code(self, login="muhammad"):
        res = self.client.post(FORGOT, {"login": login}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1) if mail.outbox else None

    def test_full_flow_by_username_signs_in_with_new_password(self):
        code = self.request_code()
        self.assertEqual(mail.outbox[0].to, ["m@example.com"])
        res = self.client.post(RESET, {"login": "MUHAMMAD", "code": code, "password": NEW}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["user"]["username"], "Muhammad")
        self.assertEqual(self.client.get("/api/auth/me/").data["user"]["username"], "Muhammad")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW))
        # a code works only once
        res = self.client.post(RESET, {"login": "muhammad", "code": code, "password": "Another-pass-88"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_code_can_be_requested_by_email(self):
        self.assertIsNotNone(self.request_code("M@Example.com"))

    def test_unknown_account_or_no_email_looks_the_same_and_sends_nothing(self):
        get_user_model().objects.create_user("noemail", password="x-pass-12345")
        for login in ("nobody", "noemail", "who@example.com"):
            res = self.client.post(FORGOT, {"login": login}, format="json")
            self.assertEqual((res.status_code, res.data), (200, {"sent": True}), login)
        self.assertEqual(len(mail.outbox), 0)

    def test_code_is_stored_hashed(self):
        code = self.request_code()
        self.assertNotIn(code, PasswordResetCode.objects.get().code_hash)

    def test_wrong_code_attempts_are_limited(self):
        code = self.request_code()
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(MAX_ATTEMPTS):
            res = self.client.post(RESET, {"login": "muhammad", "code": wrong, "password": NEW}, format="json")
            self.assertEqual(res.data, {"code": ["code_invalid"]})
        # after too many wrong guesses even the right code is refused
        res = self.client.post(RESET, {"login": "muhammad", "code": code, "password": NEW}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_expired_code_is_refused(self):
        code = self.request_code()
        PasswordResetCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        res = self.client.post(RESET, {"login": "muhammad", "code": code, "password": NEW}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_new_code_replaces_old_one_and_resend_has_cooldown(self):
        first = self.request_code()
        self.request_code()
        self.assertEqual(len(mail.outbox), 1)  # within a minute: no second email
        PasswordResetCode.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        second = self.request_code()
        self.assertEqual(len(mail.outbox), 2)
        if first != second:
            res = self.client.post(RESET, {"login": "muhammad", "code": first, "password": NEW}, format="json")
            self.assertEqual(res.status_code, 400)
        res = self.client.post(RESET, {"login": "muhammad", "code": second, "password": NEW}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_weak_new_password_keeps_code_usable(self):
        code = self.request_code()
        res = self.client.post(RESET, {"login": "muhammad", "code": code, "password": "123"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password_too_short", res.data["password"])
        res = self.client.post(RESET, {"login": "muhammad", "code": code, "password": NEW}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_mail_failure_is_reported_without_leaving_a_code(self):
        with mock.patch("accounts.views.send_mail", side_effect=OSError("smtp down")):
            res = self.client.post(FORGOT, {"login": "muhammad"}, format="json")
        self.assertEqual(res.status_code, 503)
        self.assertFalse(PasswordResetCode.objects.exists())


class AccountSettingsTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user("owner", password="old-pass-123")
        self.client.force_authenticate(self.user)

    def test_update_email(self):
        res = self.client.patch("/api/auth/me/", {"email": " new@example.com "}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["user"]["email"], "new@example.com")
        self.assertEqual(self.client.patch("/api/auth/me/", {"email": "not-an-email"}, format="json").status_code, 400)

    def test_change_password(self):
        url = "/api/auth/password/change/"
        res = self.client.post(url, {"current_password": "wrong", "new_password": NEW}, format="json")
        self.assertEqual(res.data, {"current_password": ["password_wrong"]})
        res = self.client.post(url, {"current_password": "old-pass-123", "new_password": "12345678"}, format="json")
        self.assertIn("password_entirely_numeric", res.data["new_password"])
        res = self.client.post(url, {"current_password": "old-pass-123", "new_password": NEW}, format="json")
        self.assertEqual(res.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW))

    def test_anonymous_cannot_change_profile(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.patch("/api/auth/me/", {"email": "a@b.co"}, format="json").status_code, 403)
        self.assertEqual(self.client.post("/api/auth/password/change/", {}, format="json").status_code, 403)


class BrevoBackendTests(APITestCase):
    @override_settings(EMAIL_BACKEND="accounts.email_backends.BrevoEmailBackend", BREVO_API_KEY="test-key",
                       DEFAULT_FROM_EMAIL="MBM Trucking <owner@example.com>")
    def test_sends_json_to_brevo_api(self):
        import json

        with mock.patch("accounts.email_backends.urllib.request.urlopen") as urlopen:
            urlopen.return_value.__enter__.return_value = mock.Mock()
            sent = mail.send_mail("Subject", "Body 123456", None, ["m@example.com"])
        self.assertEqual(sent, 1)
        request = urlopen.call_args[0][0]
        self.assertEqual(request.full_url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(request.get_header("Api-key"), "test-key")
        body = json.loads(request.data)
        self.assertEqual(body["sender"], {"email": "owner@example.com", "name": "MBM Trucking"})
        self.assertEqual(body["to"], [{"email": "m@example.com"}])
        self.assertEqual(body["textContent"], "Body 123456")
