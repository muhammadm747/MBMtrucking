import os

from django.conf import settings
from django.db import migrations


def assign_existing_trucks(apps, schema_editor):
    """Trucks created before accounts were separate belong to the main admin account."""
    Truck = apps.get_model("fleet", "Truck")
    if not Truck.objects.exists():
        return
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    users = User.objects.order_by("id")
    username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "").strip()
    owner = (
        (username and users.filter(username__iexact=username).first())
        or users.filter(is_superuser=True).first()
        or users.first()
    )
    if owner is None:
        raise RuntimeError("Trucks exist but there is no user to own them. Create a superuser first.")
    Truck.objects.filter(owner__isnull=True).update(owner=owner)


class Migration(migrations.Migration):
    # Data only, in its own migration: PostgreSQL refuses ALTER TABLE in the same transaction as these updates.

    dependencies = [("fleet", "0002_truck_owner")]

    operations = [migrations.RunPython(assign_existing_trucks, migrations.RunPython.noop)]
