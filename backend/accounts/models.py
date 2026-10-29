import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

CODE_TTL = timedelta(minutes=15)
MAX_ATTEMPTS = 5


def hash_code(code):
    return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


class PasswordResetCodeQuerySet(models.QuerySet):
    def usable(self):
        return self.filter(used_at__isnull=True, expires_at__gt=timezone.now(), attempts__lt=MAX_ATTEMPTS)


class PasswordResetCode(models.Model):
    """A 6-digit code emailed to reset a forgotten password. Only its HMAC is stored."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reset_codes")
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)

    objects = PasswordResetCodeQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def issue(cls, user):
        """Cancel the user's earlier codes and return (record, plain code)."""
        now = timezone.now()
        cls.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
        code = f"{secrets.randbelow(10**6):06d}"
        return cls.objects.create(user=user, code_hash=hash_code(code), expires_at=now + CODE_TTL), code

    def matches(self, code):
        """Compare in constant time; a wrong guess uses up one of the attempts."""
        if hmac.compare_digest(self.code_hash, hash_code(code.strip())):
            return True
        self.attempts += 1
        self.save(update_fields=["attempts"])
        return False
