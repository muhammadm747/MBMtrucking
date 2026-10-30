import os
from email.utils import parseaddr

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.views import email_backend_name


class Command(BaseCommand):
    help = "Print how password reset emails are set up (no secrets), so the deploy log shows what is missing."

    def handle(self, *args, **options):
        backend = email_backend_name()
        sender = parseaddr(settings.DEFAULT_FROM_EMAIL)[1]
        self.stdout.write(f"Email backend: {backend}")
        self.stdout.write(f"Email sender: {sender}")
        if backend == "console":
            self.stdout.write(self.style.WARNING("BREVO_API_KEY is not set: reset codes only go to the server log."))
        elif sender.endswith("@localhost"):
            self.stdout.write(self.style.WARNING("DJANGO_DEFAULT_FROM_EMAIL is not set: the provider will refuse this sender."))

        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "").strip()
        user = get_user_model().objects.filter(username__iexact=username).first() if username else None
        if user is not None:
            self.stdout.write(f"Admin '{user.username}' email: {user.email or 'NONE'}")
