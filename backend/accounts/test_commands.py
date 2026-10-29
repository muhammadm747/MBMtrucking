import os
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase

ENV = {"DJANGO_SUPERUSER_USERNAME": "Muhammad", "DJANGO_SUPERUSER_PASSWORD": "new-Secret-77", "DJANGO_SUPERUSER_EMAIL": "a@b.c"}


class EnsureSuperuserTests(TestCase):
    def run_cmd(self, env):
        with mock.patch.dict(os.environ, env, clear=False):
            call_command("ensure_superuser", stdout=StringIO())

    def test_creates_admin(self):
        self.run_cmd(ENV)
        user = get_user_model().objects.get(username="Muhammad")
        self.assertTrue(user.is_superuser and user.is_staff)
        self.assertTrue(user.check_password("new-Secret-77"))

    def test_syncs_password_of_existing_user_case_insensitively(self):
        get_user_model().objects.create_user("muhammad", password="old-password")
        self.run_cmd(ENV)
        users = get_user_model().objects.all()
        self.assertEqual(users.count(), 1)
        self.assertTrue(users[0].check_password("new-Secret-77"))
        self.assertTrue(users[0].is_superuser)

    def test_skips_without_username(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            call_command("ensure_superuser", stdout=StringIO())
        self.assertFalse(get_user_model().objects.exists())

    def test_empty_password_is_an_error(self):
        with self.assertRaises(CommandError):
            self.run_cmd({**ENV, "DJANGO_SUPERUSER_PASSWORD": ""})
