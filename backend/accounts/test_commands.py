import os
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase

ENV = {"DJANGO_SUPERUSER_USERNAME": "Muhammad", "DJANGO_SUPERUSER_PASSWORD": "new-Secret-77", "DJANGO_SUPERUSER_EMAIL": "a@b.c"}


class EnsureSuperuserTests(TestCase):
    def run_cmd(self, env):
        out = StringIO()
        with mock.patch.dict(os.environ, {"DJANGO_SUPERUSER_RESET_PASSWORD": "", **env}, clear=False):
            call_command("ensure_superuser", stdout=out)
        return out.getvalue()

    def test_creates_admin(self):
        self.run_cmd(ENV)
        user = get_user_model().objects.get(username="Muhammad")
        self.assertTrue(user.is_superuser and user.is_staff)
        self.assertEqual(user.email, "a@b.c")
        self.assertTrue(user.check_password("new-Secret-77"))

    def test_existing_password_is_kept_on_deploy(self):
        # e.g. changed on the site or reset by email: a redeploy must not undo it
        get_user_model().objects.create_superuser("muhammad", email="", password="changed-on-site-1")
        out = self.run_cmd(ENV)
        users = get_user_model().objects.all()
        self.assertEqual(users.count(), 1)
        self.assertTrue(users[0].check_password("changed-on-site-1"))
        self.assertEqual(users[0].email, "a@b.c")  # filled in only because it was empty
        self.assertIn("left unchanged", out)

    def test_existing_email_is_not_overwritten(self):
        get_user_model().objects.create_superuser("Muhammad", email="mine@example.com", password="pw-12345678")
        self.run_cmd(ENV)
        self.assertEqual(get_user_model().objects.get().email, "mine@example.com")

    def test_explicit_reset_flag_sets_password_and_admin_flags(self):
        get_user_model().objects.create_user("muhammad", password="old-password")
        self.run_cmd({**ENV, "DJANGO_SUPERUSER_RESET_PASSWORD": "true"})
        user = get_user_model().objects.get()
        self.assertTrue(user.check_password("new-Secret-77"))
        self.assertTrue(user.is_superuser and user.is_staff)

    def test_skips_without_username(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            call_command("ensure_superuser", stdout=StringIO())
        self.assertFalse(get_user_model().objects.exists())

    def test_empty_password_is_an_error_when_creating(self):
        with self.assertRaises(CommandError):
            self.run_cmd({**ENV, "DJANGO_SUPERUSER_PASSWORD": ""})
