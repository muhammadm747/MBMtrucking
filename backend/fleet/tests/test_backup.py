import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APITestCase

from fleet.backup import BackupError, export_backup, import_backup
from fleet.models import Expense, Load, Truck

SAMPLE = {
    "app": "truck-hisob", "v": 1, "exported": "2026-10-27",
    "cfg": {"names": ["1364", "1365"], "rent": [1500, 0], "day": [5, 0], "dt": ["pct", "none"],
            "dr": [32, 0], "dp": [0, 3]},
    "loads": [
        {"id": "muznd83rj18dds", "truck": 1, "miles": 799, "pay": 2400, "created": 1791818956592,
         "pDate": "2026-10-12", "pType": "asap", "pTime": "", "pFrom": "", "pTo": "", "pAddr": " Curwensville PA ",
         "dDate": "2026-10-13", "dType": "exact", "dTime": "07:00", "dFrom": "", "dTo": "", "dAddr": "Goose Creek SC"},
        {"id": "nopay1", "truck": 0, "miles": "850.5", "pay": 0, "created": 1791818956000,
         "pDate": "2026-10-20", "pType": "fcfs", "pFrom": "08:00", "pTo": "14:00",
         "dDate": "2026-10-19", "dType": "exact", "dTime": "25:00"},
        {"id": "bad-miles", "truck": 0, "miles": 0, "pay": 100, "pDate": "2026-10-20"},
        {"id": "bad-truck", "truck": -1, "miles": 10, "pDate": "2026-10-20"},
    ],
    "exps": [
        {"id": "mv8ais5fttt4l3", "truck": 4, "date": "2026-10-04", "type": "fuel", "amount": 3011, "created": 1791993264387},
        {"id": "weird-type", "truck": 0, "date": "2026-10-05", "type": "snacks", "amount": "12.5"},
    ],
}


class ImportBackupTests(TestCase):
    def test_fresh_import_creates_trucks_and_records(self):
        result = import_backup(SAMPLE)
        self.assertEqual(result.loads_added, 2)
        self.assertEqual(result.expenses_added, 2)
        self.assertEqual(result.invalid, 2)
        # two trucks from cfg, plus slot 4 referenced by an expense
        self.assertEqual(result.trucks_created, 3)
        self.assertEqual(list(Truck.objects.values_list("name", flat=True)), ["1364", "1365", "Truck 5"])

        first = Truck.objects.get(slot=0)
        self.assertEqual((first.monthly_rent, first.rent_day, first.driver_pay_type, first.driver_rate), (1500, 5, "pct", 32))

        load = Load.objects.get(pk="muznd83rj18dds")
        self.assertEqual(load.truck.slot, 1)
        self.assertEqual(load.pickup_address, "Curwensville PA")
        self.assertIsNone(load.pickup_time)
        self.assertEqual(load.delivery_time.strftime("%H:%M"), "07:00")

        nopay = Load.objects.get(pk="nopay1")
        self.assertEqual(nopay.pay, 0)
        self.assertEqual(str(nopay.miles), "850.50")
        self.assertEqual(nopay.delivery_date, nopay.pickup_date)  # fixed: was before pickup
        self.assertIsNone(nopay.delivery_time)  # "25:00" is not a time
        self.assertEqual(Expense.objects.get(pk="weird-type").category, "other")

    def test_second_import_adds_nothing(self):
        import_backup(SAMPLE)
        result = import_backup(SAMPLE)
        self.assertEqual((result.loads_added, result.expenses_added, result.trucks_created), (0, 0, 0))
        self.assertEqual(result.skipped, 4)
        self.assertEqual(Load.objects.count(), 2)

    def test_existing_truck_settings_are_kept(self):
        Truck.objects.create(slot=0, name="Mine", monthly_rent=99)
        import_backup(SAMPLE)
        self.assertEqual(Truck.objects.get(slot=0).name, "Mine")

    def test_export_round_trip(self):
        import_backup(SAMPLE)
        exported = export_backup()
        self.assertEqual(exported["app"], "truck-hisob")
        self.assertEqual(exported["cfg"]["names"], ["1364", "1365", "Truck 5"])
        row = next(r for r in exported["loads"] if r["id"] == "muznd83rj18dds")
        self.assertEqual((row["truck"], row["pType"], row["dTime"], row["created"]), (1, "asap", "07:00", 1791818956592))

        Load.objects.all().delete()
        Expense.objects.all().delete()
        result = import_backup(exported)
        self.assertEqual((result.loads_added, result.expenses_added, result.invalid), (2, 2, 0))

    def test_empty_file_is_rejected(self):
        with self.assertRaises(BackupError):
            import_backup({"loads": []})

    def test_management_command(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "b.json"
            path.write_text(json.dumps(SAMPLE), encoding="utf-8")
            out = StringIO()
            call_command("import_backup", str(path), stdout=out)
        self.assertIn("loads added: 2", out.getvalue())


class BackupApiTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(get_user_model().objects.create_user("owner", password="pw-12345678"))

    def test_upload_and_download(self):
        upload = SimpleUploadedFile("b.json", json.dumps(SAMPLE).encode(), content_type="application/json")
        res = self.client.post("/api/backup/import/", {"file": upload}, format="multipart")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["loads_added"], 2)

        res = self.client.get("/api/backup/export/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("attachment", res["Content-Disposition"])
        self.assertEqual(len(json.loads(res.content)["loads"]), 2)

    def test_upload_rejects_non_json(self):
        upload = SimpleUploadedFile("b.json", b"not json", content_type="application/json")
        res = self.client.post("/api/backup/import/", {"file": upload}, format="multipart")
        self.assertEqual(res.status_code, 400)
