import secrets
import time
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

MAX_AMOUNT = Decimal("1000000")
MAX_MILES = Decimal("20000")


def new_id():
    """Short sortable id (base36 ms timestamp + random), same shape as the original app's ids."""
    n, digits = int(time.time() * 1000), "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while n:
        n, r = divmod(n, 36)
        out = digits[r] + out
    return out + secrets.token_hex(3)


class Truck(models.Model):
    class DriverPay(models.TextChoices):
        NONE = "none", "Not calculated"
        PER_MILE = "mile", "Per mile ($)"
        PERCENT = "pct", "Percent of load pay (%)"

    slot = models.PositiveSmallIntegerField(unique=True, help_text="Display order (0 = first).")
    name = models.CharField(max_length=30)
    monthly_rent = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(MAX_AMOUNT)],
    )
    rent_day = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(31)],
        help_text="Day of month the rent is paid (1-31). 0 = not set: weekly reports then use 12/52 of the rent.",
    )
    driver_pay_type = models.CharField(max_length=4, choices=DriverPay.choices, default=DriverPay.NONE)
    driver_rate = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        help_text="$ per mile, or percent of load pay, depending on driver_pay_type.",
    )
    dispatch_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    class Meta:
        ordering = ["slot"]

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        # "1364" -> "Truck 1364"; named trucks stay as typed
        return f"Truck {self.name}" if self.name.isdigit() else self.name

    def clean(self):
        if self.driver_pay_type == self.DriverPay.NONE:
            self.driver_rate = Decimal(0)
        limit = Decimal(50) if self.driver_pay_type == self.DriverPay.PER_MILE else Decimal(100)
        if self.driver_rate > limit:
            raise ValidationError({"driver_rate": f"Must be at most {limit}."})


class StopType(models.TextChoices):
    EXACT = "exact", "Exact time"
    FCFS = "fcfs", "FCFS (time window)"
    ASAP = "asap", "ASAP"


class Load(models.Model):
    id = models.CharField(primary_key=True, max_length=40, default=new_id, editable=False)
    truck = models.ForeignKey(Truck, on_delete=models.PROTECT, related_name="loads")
    miles = models.DecimalField(
        max_digits=8, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01")), MaxValueValidator(MAX_MILES)],
    )
    pay = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(MAX_AMOUNT)],
        help_text="0 means the rate has not been entered yet.",
    )

    pickup_date = models.DateField(db_index=True)
    pickup_type = models.CharField(max_length=5, choices=StopType.choices, default=StopType.EXACT)
    pickup_time = models.TimeField(null=True, blank=True)
    pickup_from = models.TimeField(null=True, blank=True)
    pickup_to = models.TimeField(null=True, blank=True)
    pickup_address = models.CharField(max_length=200, blank=True)

    delivery_date = models.DateField()
    delivery_type = models.CharField(max_length=5, choices=StopType.choices, default=StopType.EXACT)
    delivery_time = models.TimeField(null=True, blank=True)
    delivery_from = models.TimeField(null=True, blank=True)
    delivery_to = models.TimeField(null=True, blank=True)
    delivery_address = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-pickup_date", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(delivery_date__gte=models.F("pickup_date")),
                name="load_delivery_not_before_pickup",
            ),
        ]

    def __str__(self):
        return f"{self.truck} {self.pickup_date} → {self.delivery_date} ({self.miles} mi)"


class Expense(models.Model):
    class Category(models.TextChoices):
        FUEL = "fuel", "Fuel"
        DRIVER = "driver", "Driver pay"
        REPAIR = "repair", "Repairs"
        INSURANCE = "insurance", "Insurance"
        LEASE = "lease", "Truck payment (lease)"
        TOLL = "toll", "Toll"
        PARKING = "parking", "Parking"
        OTHER = "other", "Other"

    id = models.CharField(primary_key=True, max_length=40, default=new_id, editable=False)
    truck = models.ForeignKey(Truck, on_delete=models.PROTECT, related_name="expenses")
    date = models.DateField(db_index=True)
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.OTHER)
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01")), MaxValueValidator(MAX_AMOUNT)],
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.truck} {self.get_category_display()} {self.amount} ({self.date})"
