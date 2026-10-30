"""Brevo (brevo.com) transactional email over HTTPS, for hosts that block SMTP ports (e.g. Render free tier)."""
import json
import logging
import urllib.error
import urllib.request
from email.utils import parseaddr

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

log = logging.getLogger(__name__)
API_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            name, address = parseaddr(message.from_email or settings.DEFAULT_FROM_EMAIL)
            payload = {
                "sender": {"email": address, **({"name": name} if name else {})},
                "to": [{"email": parseaddr(rcpt)[1]} for rcpt in message.to],
                "subject": message.subject,
                "textContent": message.body,
            }
            html = next((body for body, mime in getattr(message, "alternatives", []) if mime == "text/html"), None)
            if html:
                payload["htmlContent"] = html
            request = urllib.request.Request(
                API_URL, data=json.dumps(payload).encode(), method="POST",
                headers={"api-key": settings.BREVO_API_KEY, "content-type": "application/json", "accept": "application/json"},
            )
            try:
                with urllib.request.urlopen(request, timeout=15) as response:
                    log.info("Brevo accepted the email: HTTP %s", response.status)
                    sent += 1
            except (urllib.error.URLError, TimeoutError) as exc:
                detail = exc.read().decode(errors="replace")[:300] if isinstance(exc, urllib.error.HTTPError) else exc
                log.error("Brevo email failed: %s", detail)
                if not self.fail_silently:
                    raise
        return sent
