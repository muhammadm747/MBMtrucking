from django.contrib import admin

from .models import Expense, Load, Truck


@admin.register(Truck)
class TruckAdmin(admin.ModelAdmin):
    list_display = ("owner", "slot", "name", "monthly_rent", "rent_day", "driver_pay_type", "driver_rate", "dispatch_percent")
    list_display_links = ("name",)
    list_filter = ("owner",)
    ordering = ("owner", "slot")


@admin.register(Load)
class LoadAdmin(admin.ModelAdmin):
    list_display = ("pickup_date", "delivery_date", "truck", "miles", "pay", "pickup_address", "delivery_address")
    list_filter = ("truck__owner", "truck", "pickup_type", "delivery_type")
    date_hierarchy = "pickup_date"
    search_fields = ("id", "pickup_address", "delivery_address")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("date", "truck", "category", "amount")
    list_filter = ("truck__owner", "truck", "category")
    date_hierarchy = "date"
    readonly_fields = ("id", "created_at", "updated_at")
