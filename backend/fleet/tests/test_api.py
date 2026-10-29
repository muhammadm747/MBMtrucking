from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from fleet.models import Expense, Load, Truck


def load_payload(truck, **over):
    data = {
        "truck": truck.pk, "miles": 850, "pay": 2000,
        "pickup_date": "2026-10-12", "pickup_type": "exact", "pickup_time": "08:00",
        "delivery_date": "2026-10-13", "delivery_type": "fcfs", "delivery_from": "07:00", "delivery_to": "15:00",
        "pickup_address": "  Dallas, TX ", "delivery_address": "Atlanta, GA",
    }
    data.update(over)
    return data


class ApiTestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("owner", password="pw-12345678")
        self.client.force_authenticate(self.user)
        self.truck = Truck.objects.create(owner=self.user, slot=0, name="1364")


class AuthRequiredTests(APITestCase):
    def test_every_endpoint_needs_login(self):
        for url in ("/api/trucks/", "/api/loads/", "/api/expenses/", "/api/backup/export/"):
            self.assertEqual(self.client.get(url).status_code, 403, url)


class TruckTests(ApiTestCase):
    def test_create_assigns_next_slot_and_display_name(self):
        res = self.client.post("/api/trucks/", {"name": "1365"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["slot"], 1)
        self.assertEqual(res.data["display_name"], "Truck 1365")

    def test_driver_rate_limits(self):
        url = f"/api/trucks/{self.truck.pk}/"
        self.assertEqual(self.client.patch(url, {"driver_pay_type": "mile", "driver_rate": 60}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(url, {"driver_pay_type": "pct", "driver_rate": 0}, format="json").status_code, 400)
        res = self.client.patch(url, {"driver_pay_type": "pct", "driver_rate": 32}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        res = self.client.patch(url, {"driver_pay_type": "none"}, format="json")
        self.assertEqual(res.data["driver_rate"], 0)

    def test_truck_with_records_cannot_be_deleted(self):
        Expense.objects.create(truck=self.truck, date="2026-10-01", category="fuel", amount=10)
        self.assertEqual(self.client.delete(f"/api/trucks/{self.truck.pk}/").status_code, 409)


class LoadTests(ApiTestCase):
    def test_create_normalises_times_by_stop_type(self):
        res = self.client.post("/api/loads/", load_payload(self.truck, pickup_from="01:00", delivery_time="09:00"), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["pickup_time"], "08:00")
        self.assertIsNone(res.data["pickup_from"])
        self.assertIsNone(res.data["delivery_time"])
        self.assertEqual(res.data["delivery_to"], "15:00")
        self.assertEqual(res.data["pickup_address"], "Dallas, TX")
        self.assertEqual(res.json()["miles"], 850)  # numbers, not strings, in JSON

    def test_delivery_before_pickup_is_rejected(self):
        res = self.client.post("/api/loads/", load_payload(self.truck, delivery_date="2026-10-11"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("delivery_date", res.data)

    def test_same_day_delivery_time_before_pickup_is_rejected(self):
        res = self.client.post("/api/loads/", load_payload(
            self.truck, delivery_date="2026-10-12", delivery_type="exact", delivery_time="07:00"), format="json")
        self.assertEqual(res.status_code, 400)

    def test_miles_must_be_positive_and_pay_may_be_empty(self):
        self.assertEqual(self.client.post("/api/loads/", load_payload(self.truck, miles=0), format="json").status_code, 400)
        res = self.client.post("/api/loads/", load_payload(self.truck, pay=0), format="json")
        self.assertEqual(res.status_code, 201)

    def test_quick_pay_patch_keeps_other_fields(self):
        load_id = self.client.post("/api/loads/", load_payload(self.truck, pay=0), format="json").data["id"]
        res = self.client.patch(f"/api/loads/{load_id}/", {"pay": 2400}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(Load.objects.get(pk=load_id).pay, 2400)
        self.assertEqual(res.data["pickup_time"], "08:00")

    def test_list_is_newest_pickup_first(self):
        self.client.post("/api/loads/", load_payload(self.truck, pickup_date="2026-10-01", delivery_date="2026-10-02"), format="json")
        self.client.post("/api/loads/", load_payload(self.truck), format="json")
        dates = [row["pickup_date"] for row in self.client.get("/api/loads/").data]
        self.assertEqual(dates, ["2026-10-12", "2026-10-01"])


class ExpenseTests(ApiTestCase):
    def test_crud(self):
        res = self.client.post("/api/expenses/", {"truck": self.truck.pk, "date": "2026-10-04", "category": "fuel", "amount": 3011}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        url = f"/api/expenses/{res.data['id']}/"
        self.assertEqual(self.client.patch(url, {"amount": 100}, format="json").data["amount"], 100)
        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_amount_must_be_positive(self):
        res = self.client.post("/api/expenses/", {"truck": self.truck.pk, "date": "2026-10-04", "category": "fuel", "amount": 0}, format="json")
        self.assertEqual(res.status_code, 400)


class OwnershipTests(ApiTestCase):
    """Each account is a separate company: nobody sees or touches another account's fleet."""

    def setUp(self):
        super().setUp()
        self.other = get_user_model().objects.create_user("stranger", password="pw-12345678")
        self.their_truck = Truck.objects.create(owner=self.other, slot=0, name="9999")
        self.their_load = Load.objects.create(truck=self.their_truck, miles=100, pickup_date="2026-10-01", delivery_date="2026-10-02")
        self.their_exp = Expense.objects.create(truck=self.their_truck, date="2026-10-01", category="fuel", amount=10)

    def test_lists_show_only_own_records(self):
        Load.objects.create(truck=self.truck, miles=50, pickup_date="2026-10-03", delivery_date="2026-10-03")
        self.assertEqual([t["name"] for t in self.client.get("/api/trucks/").data], ["1364"])
        self.assertEqual(len(self.client.get("/api/loads/").data), 1)
        self.assertEqual(self.client.get("/api/expenses/").data, [])

    def test_other_accounts_records_are_not_found(self):
        for url in (f"/api/trucks/{self.their_truck.pk}/", f"/api/loads/{self.their_load.pk}/", f"/api/expenses/{self.their_exp.pk}/"):
            self.assertEqual(self.client.get(url).status_code, 404, url)
            self.assertEqual(self.client.patch(url, {}, format="json").status_code, 404, url)
            self.assertEqual(self.client.delete(url).status_code, 404, url)
        self.assertTrue(Load.objects.filter(pk=self.their_load.pk).exists())

    def test_cannot_attach_records_to_another_accounts_truck(self):
        res = self.client.post("/api/loads/", load_payload(self.their_truck), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("truck", res.data)
        res = self.client.post("/api/expenses/", {"truck": self.their_truck.pk, "date": "2026-10-04", "category": "fuel", "amount": 5}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_new_truck_belongs_to_creator_and_slots_are_per_account(self):
        res = self.client.post("/api/trucks/", {"name": "1365"}, format="json")
        self.assertEqual(res.data["slot"], 1)  # the other account's slot 0 does not count
        self.assertEqual(Truck.objects.get(pk=res.data["id"]).owner, self.user)

    def test_slot_already_used_is_rejected(self):
        res = self.client.post("/api/trucks/", {"name": "X", "slot": 0}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("slot", res.data)
