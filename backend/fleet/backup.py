"""
Backup export/import in the original MBM Trucking app's JSON format
({"app": "truck-hisob", "v": 1, "cfg": {...}, "loads": [...], "exps": [...]}),
so files saved from the old Claude artifact can be restored here and vice versa.

Import only ever adds: records whose id already exists are skipped, nothing is changed or deleted.
"""
import datetime as dt
import re
from dataclasses import asdict, dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from .models import MAX_AMOUNT, MAX_MILES, Expense, Load, StopType, Truck, new_id

APP_TAG = "truck-hisob"
SAFE_ID = re.compile(r"^[A-Za-z0-9_\-:@+~][A-Za-z0-9_\-.:@+~]{0,39}$")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
CENT = Decimal("0.01")


class BackupError(ValueError):
    pass


@dataclass
class ImportResult:
    trucks_created: int = 0
    loads_added: int = 0
    expenses_added: int = 0
    skipped: int = 0
    invalid: int = 0

    def as_dict(self):
        return asdict(self)


# ---------- export ----------

def _hhmm(value):
    return value.strftime("%H:%M") if value else ""


def _ms(value):
    return int(value.timestamp() * 1000)


def export_backup():
    trucks = list(Truck.objects.order_by("slot"))
    index = {t.pk: i for i, t in enumerate(trucks)}
    cfg = {
        "names": [t.name for t in trucks],
        "rent": [float(t.monthly_rent) for t in trucks],
        "day": [t.rent_day for t in trucks],
        "dt": [t.driver_pay_type for t in trucks],
        "dr": [float(t.driver_rate) for t in trucks],
        "dp": [float(t.dispatch_percent) for t in trucks],
    }
    loads = []
    for load in Load.objects.order_by("pickup_date", "created_at"):
        row = {"id": load.id, "truck": index[load.truck_id], "miles": float(load.miles), "pay": float(load.pay),
               "created": _ms(load.created_at)}
        for prefix, key in (("pickup", "p"), ("delivery", "d")):
            row[f"{key}Date"] = getattr(load, f"{prefix}_date").isoformat()
            row[f"{key}Type"] = getattr(load, f"{prefix}_type")
            row[f"{key}Time"] = _hhmm(getattr(load, f"{prefix}_time"))
            row[f"{key}From"] = _hhmm(getattr(load, f"{prefix}_from"))
            row[f"{key}To"] = _hhmm(getattr(load, f"{prefix}_to"))
            row[f"{key}Addr"] = getattr(load, f"{prefix}_address")
        loads.append(row)
    exps = [
        {"id": e.id, "truck": index[e.truck_id], "date": e.date.isoformat(), "type": e.category,
         "amount": float(e.amount), "created": _ms(e.created_at)}
        for e in Expense.objects.order_by("date", "created_at")
    ]
    return {"app": APP_TAG, "v": 1, "exported": timezone.localdate().isoformat(), "cfg": cfg,
            "loads": loads, "exps": exps}


# ---------- import ----------

def _num(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        value = value.replace("$", "").replace(",", "").strip()
    try:
        n = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    return n if n.is_finite() else None


def _money(value, upper):
    n = _num(value)
    if n is None:
        return Decimal(0)
    return min(upper, max(Decimal(0), n)).quantize(CENT, rounding=ROUND_HALF_UP)


def _date(value):
    if not isinstance(value, str):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def _time(value):
    if isinstance(value, str) and TIME.match(value):
        return dt.time(int(value[:2]), int(value[3:]))
    return None


def _created(value):
    n = _num(value)
    if n is None or n <= 0:
        return timezone.now()
    try:
        return dt.datetime.fromtimestamp(float(n) / 1000, tz=dt.timezone.utc)
    except (OverflowError, OSError, ValueError):
        return timezone.now()


def _record_id(raw):
    value = raw.get("id")
    return value if isinstance(value, str) and SAFE_ID.match(value) else new_id()


def _truck_index(raw):
    n = _num(raw.get("truck"))
    if n is None or n != n.to_integral_value() or n < 0 or n > 999:
        return None
    return int(n)


def _truck_from_cfg(cfg, i):
    def pick(key, default):
        values = cfg.get(key)
        return values[i] if isinstance(values, list) and i < len(values) else default

    name = pick("names", "")
    name = name.strip()[:30] if isinstance(name, str) and name.strip() else f"Truck {i + 1}"
    day = _num(pick("day", 0)) or Decimal(0)
    pay_type = pick("dt", "none")
    pay_type = pay_type if pay_type in Truck.DriverPay.values else Truck.DriverPay.NONE
    limit = Decimal(50) if pay_type == Truck.DriverPay.PER_MILE else Decimal(100)
    return Truck(
        slot=i,
        name=name,
        monthly_rent=_money(pick("rent", 0), MAX_AMOUNT),
        rent_day=int(day) if 1 <= day <= 31 else 0,
        driver_pay_type=pay_type,
        driver_rate=Decimal(0) if pay_type == Truck.DriverPay.NONE else _money(pick("dr", 0), limit),
        dispatch_percent=_money(pick("dp", 0), Decimal(100)),
    )


def _build_load(raw, truck, record_id):
    pickup = _date(raw.get("pDate"))
    miles = _num(raw.get("miles"))
    if pickup is None or miles is None or not (Decimal(0) < miles <= MAX_MILES):
        return None
    load = Load(id=record_id, truck=truck, miles=miles.quantize(CENT, rounding=ROUND_HALF_UP),
                pay=_money(raw.get("pay"), MAX_AMOUNT), created_at=_created(raw.get("created")))
    for prefix, key in (("pickup", "p"), ("delivery", "d")):
        date = _date(raw.get(f"{key}Date")) or pickup
        kind = raw.get(f"{key}Type")
        kind = kind if kind in (StopType.FCFS, StopType.ASAP) else StopType.EXACT
        address = raw.get(f"{key}Addr")
        setattr(load, f"{prefix}_date", date)
        setattr(load, f"{prefix}_type", kind)
        setattr(load, f"{prefix}_time", _time(raw.get(f"{key}Time")) if kind == StopType.EXACT else None)
        setattr(load, f"{prefix}_from", _time(raw.get(f"{key}From")) if kind == StopType.FCFS else None)
        setattr(load, f"{prefix}_to", _time(raw.get(f"{key}To")) if kind == StopType.FCFS else None)
        setattr(load, f"{prefix}_address", address.strip()[:200] if isinstance(address, str) else "")
    if load.delivery_date < load.pickup_date:
        load.delivery_date = load.pickup_date
    return load


def _build_expense(raw, truck, record_id):
    date = _date(raw.get("date"))
    amount = _num(raw.get("amount"))
    if date is None or amount is None or not (Decimal(0) < amount <= MAX_AMOUNT):
        return None
    category = raw.get("type")
    category = category if category in Expense.Category.values else Expense.Category.OTHER
    return Expense(id=record_id, truck=truck, date=date, category=category,
                   amount=amount.quantize(CENT, rounding=ROUND_HALF_UP), created_at=_created(raw.get("created")))


@transaction.atomic
def import_backup(data):
    if not isinstance(data, dict):
        raise BackupError("Backup must be a JSON object.")
    raw_loads = data.get("loads") if isinstance(data.get("loads"), list) else []
    raw_exps = data.get("exps") if isinstance(data.get("exps"), list) else []
    cfg = data.get("cfg") if isinstance(data.get("cfg"), dict) else None
    if not raw_loads and not raw_exps and cfg is None:
        raise BackupError("No loads, expenses or truck settings found in the file.")

    result = ImportResult()
    trucks = {t.slot: t for t in Truck.objects.all()}
    fresh = not trucks

    def truck_at(i):
        if i not in trucks:
            trucks[i] = _truck_from_cfg(cfg or {}, i)
            trucks[i].save()
            result.trucks_created += 1
        return trucks[i]

    # Truck settings from the file only apply to a database that has no trucks yet.
    if fresh and cfg and isinstance(cfg.get("names"), list):
        for i in range(len(cfg["names"])):
            truck_at(i)

    have_loads = set(Load.objects.values_list("id", flat=True))
    have_exps = set(Expense.objects.values_list("id", flat=True))
    new_loads, new_exps = [], []

    for items, have, build, out in (
        (raw_loads, have_loads, _build_load, new_loads),
        (raw_exps, have_exps, _build_expense, new_exps),
    ):
        for raw in items:
            index = _truck_index(raw) if isinstance(raw, dict) else None
            if index is None:
                result.invalid += 1
                continue
            record_id = _record_id(raw)
            if record_id in have:
                result.skipped += 1
                continue
            record = build(raw, None, record_id)
            if record is None:
                result.invalid += 1
                continue
            record.truck = truck_at(index)
            have.add(record_id)
            out.append(record)

    Load.objects.bulk_create(new_loads)
    Expense.objects.bulk_create(new_exps)
    result.loads_added, result.expenses_added = len(new_loads), len(new_exps)
    return result
