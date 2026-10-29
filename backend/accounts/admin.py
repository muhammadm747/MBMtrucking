from django.contrib import admin

from .models import PasswordResetCode


@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expires_at", "attempts", "used_at")
    readonly_fields = ("user", "code_hash", "created_at", "expires_at", "attempts", "used_at")
