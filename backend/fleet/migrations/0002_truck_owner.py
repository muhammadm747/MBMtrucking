import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("fleet", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(name="truck", options={"ordering": ["owner_id", "slot"]}),
        migrations.AlterField(
            model_name="truck",
            name="slot",
            field=models.PositiveSmallIntegerField(help_text="Display order within the owner's fleet (0 = first)."),
        ),
        migrations.AddField(
            model_name="truck",
            name="owner",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name="trucks", to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
