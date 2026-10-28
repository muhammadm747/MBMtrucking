from decimal import Decimal

from django.db.models import Max
from rest_framework import serializers

from .models import Expense, Load, StopType, Truck


class TruckSerializer(serializers.ModelSerializer):
    slot = serializers.IntegerField(min_value=0, max_value=999, required=False)
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = Truck
        fields = [
            "id", "slot", "name", "display_name", "monthly_rent", "rent_day",
            "driver_pay_type", "driver_rate", "dispatch_percent",
        ]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        return value

    def validate(self, attrs):
        pay_type = attrs.get("driver_pay_type", getattr(self.instance, "driver_pay_type", Truck.DriverPay.NONE))
        rate = attrs.get("driver_rate", getattr(self.instance, "driver_rate", Decimal(0)))
        if pay_type == Truck.DriverPay.NONE:
            attrs["driver_rate"] = Decimal(0)
        else:
            limit = Decimal(50) if pay_type == Truck.DriverPay.PER_MILE else Decimal(100)
            if not (Decimal(0) < rate <= limit):
                raise serializers.ValidationError({"driver_rate": f"Must be above 0 and at most {limit}."})
        return attrs

    def create(self, validated_data):
        if "slot" not in validated_data:
            top = Truck.objects.aggregate(m=Max("slot"))["m"]
            validated_data["slot"] = 0 if top is None else top + 1
        return super().create(validated_data)


def _stop_time(attrs, prefix):
    """The time a stop happens at, for ordering checks: exact time, or the FCFS window edge."""
    kind = attrs[f"{prefix}_type"]
    if kind == StopType.EXACT:
        return attrs.get(f"{prefix}_time")
    if kind == StopType.FCFS:
        return attrs.get(f"{prefix}_from" if prefix == "pickup" else f"{prefix}_to")
    return None


class LoadSerializer(serializers.ModelSerializer):
    truck = serializers.PrimaryKeyRelatedField(queryset=Truck.objects.all())

    class Meta:
        model = Load
        fields = [
            "id", "truck", "miles", "pay",
            "pickup_date", "pickup_type", "pickup_time", "pickup_from", "pickup_to", "pickup_address",
            "delivery_date", "delivery_type", "delivery_time", "delivery_from", "delivery_to", "delivery_address",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        merged = {}
        if self.instance is not None:
            merged.update({f: getattr(self.instance, f) for f in self.Meta.fields if hasattr(self.instance, f)})
        merged.update(attrs)

        # keep only the time fields that belong to the chosen stop type
        for prefix in ("pickup", "delivery"):
            kind = merged.get(f"{prefix}_type", StopType.EXACT)
            if kind != StopType.EXACT:
                attrs[f"{prefix}_time"] = merged[f"{prefix}_time"] = None
            if kind != StopType.FCFS:
                attrs[f"{prefix}_from"] = merged[f"{prefix}_from"] = None
                attrs[f"{prefix}_to"] = merged[f"{prefix}_to"] = None
            if f"{prefix}_address" in attrs:
                attrs[f"{prefix}_address"] = attrs[f"{prefix}_address"].strip()

        if merged["delivery_date"] < merged["pickup_date"]:
            raise serializers.ValidationError({"delivery_date": "delivery_before_pickup"})
        if merged["delivery_date"] == merged["pickup_date"]:
            a, b = _stop_time(merged, "pickup"), _stop_time(merged, "delivery")
            if a and b and b < a:
                raise serializers.ValidationError({"delivery_time": "delivery_time_before_pickup"})
        return attrs


class ExpenseSerializer(serializers.ModelSerializer):
    truck = serializers.PrimaryKeyRelatedField(queryset=Truck.objects.all())

    class Meta:
        model = Expense
        fields = ["id", "truck", "date", "category", "amount", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
