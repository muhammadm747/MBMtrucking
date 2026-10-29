import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("fleet", "0003_assign_truck_owner")]

    operations = [
        migrations.AlterField(
            model_name="truck",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name="trucks", to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="truck",
            constraint=models.UniqueConstraint(fields=("owner", "slot"), name="truck_slot_unique_per_owner"),
        ),
    ]
