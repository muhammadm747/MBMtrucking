import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Create the admin account from DJANGO_SUPERUSER_USERNAME / _EMAIL / _PASSWORD, "
        "or bring an existing one in line with them (password, staff and superuser flags)."
    )

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "").strip()
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "").strip()
        if not username:
            self.stdout.write("DJANGO_SUPERUSER_USERNAME is not set, skipping admin account.")
            return
        if not password:
            raise CommandError("DJANGO_SUPERUSER_PASSWORD is empty.")

        User = get_user_model()
        user = User.objects.filter(username__iexact=username).first()
        created = user is None
        if created:
            user = User(username=username)
        if email:
            user.email = email
        user.is_staff = user.is_superuser = user.is_active = True
        user.set_password(password)
        user.save()
        verb = "created" if created else "updated (password synced from DJANGO_SUPERUSER_PASSWORD)"
        self.stdout.write(self.style.SUCCESS(f"Admin account '{user.username}' {verb}."))
