import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


def env_true(name):
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


class Command(BaseCommand):
    help = (
        "Create the admin account from DJANGO_SUPERUSER_USERNAME / _EMAIL / _PASSWORD if it does not exist. "
        "An existing account keeps its password (changed on the site or reset by email) unless "
        "DJANGO_SUPERUSER_RESET_PASSWORD=true."
    )

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "").strip()
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "").strip()
        if not username:
            self.stdout.write("DJANGO_SUPERUSER_USERNAME is not set, skipping admin account.")
            return

        User = get_user_model()
        user = User.objects.filter(username__iexact=username).first()
        if user is None:
            if not password:
                raise CommandError("DJANGO_SUPERUSER_PASSWORD is empty.")
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f"Admin account '{username}' created."))
            return

        fields = []
        if not (user.is_staff and user.is_superuser and user.is_active):
            user.is_staff = user.is_superuser = user.is_active = True
            fields += ["is_staff", "is_superuser", "is_active"]
        if email and not user.email:
            user.email = email
            fields.append("email")
        reset = env_true("DJANGO_SUPERUSER_RESET_PASSWORD")
        if reset:
            if not password:
                raise CommandError("DJANGO_SUPERUSER_RESET_PASSWORD is on but DJANGO_SUPERUSER_PASSWORD is empty.")
            user.set_password(password)
            fields.append("password")
        if fields:
            user.save(update_fields=fields)
        if reset:
            self.stdout.write(self.style.WARNING(
                f"Admin account '{user.username}': password reset from DJANGO_SUPERUSER_PASSWORD. "
                "Remove DJANGO_SUPERUSER_RESET_PASSWORD so the next deploy keeps the password."
            ))
        else:
            self.stdout.write(f"Admin account '{user.username}' already exists; its password is left unchanged.")
