import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from fleet.backup import BackupError, import_backup


class Command(BaseCommand):
    help = "Import a MBM Trucking backup JSON file. Only adds records that are missing; never changes or deletes."

    def add_arguments(self, parser):
        parser.add_argument("path", type=Path, help="Path to the backup .json file")

    def handle(self, *args, path, **options):
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
        except FileNotFoundError:
            raise CommandError(f"File not found: {path}")
        except json.JSONDecodeError as exc:
            raise CommandError(f"Not valid JSON: {exc}")
        try:
            result = import_backup(data)
        except BackupError as exc:
            raise CommandError(str(exc))
        self.stdout.write(self.style.SUCCESS(
            f"Trucks created: {result.trucks_created}, loads added: {result.loads_added}, "
            f"expenses added: {result.expenses_added}, already present: {result.skipped}, invalid: {result.invalid}"
        ))
