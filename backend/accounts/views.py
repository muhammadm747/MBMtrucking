"""Session-based auth for the React app (same origin, CSRF protected)."""
import logging

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import CODE_TTL, PasswordResetCode

log = logging.getLogger(__name__)


def user_payload(user):
    return {
        "id": user.id, "username": user.get_username(), "name": user.get_full_name() or user.get_username(),
        "email": user.email,
    }


def find_user(login_or_email):
    """Active user by username, or else by email (both case-insensitive)."""
    value = (login_or_email or "").strip()
    if not value:
        return None
    users = get_user_model().objects.filter(is_active=True)
    match = users.filter(username__iexact=value).first()
    if match is None and "@" in value:
        match = users.filter(email__iexact=value).order_by("id").first()
    return match


def email_backend_name():
    """"brevo", "smtp" or "console": where a sent email actually goes."""
    return "brevo" if "Brevo" in settings.EMAIL_BACKEND else settings.EMAIL_BACKEND.split(".")[-2]


def mask_email(email):
    """For request logs, which should not hold full addresses: "max***740@gmail.com"."""
    name, _, domain = email.partition("@")
    return f"{name[:3]}***{name[-3:]}@{domain}" if len(name) > 6 else f"{name[:1]}***@{domain}"


def password_errors(password, user):
    """Django's password validators as a list of error codes, for the SPA to translate."""
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        return [e.code or "password_invalid" for e in exc.error_list]
    return []


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, trim_whitespace=False)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(max_length=128, trim_whitespace=False)

    def validate_username(self, value):
        User = get_user_model()
        for validator in User._meta.get_field("username").validators:
            try:
                validator(value)
            except DjangoValidationError:
                raise serializers.ValidationError("username_invalid")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("username_taken")
        return value

    def validate(self, attrs):
        errors = password_errors(attrs["password"], get_user_model()(username=attrs["username"], email=attrs.get("email", "")))
        if errors:
            raise serializers.ValidationError({"password": errors})
        return attrs


class ProfileSerializer(serializers.Serializer):
    email = serializers.EmailField(allow_blank=True, max_length=254)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=128, trim_whitespace=False)
    new_password = serializers.CharField(max_length=128, trim_whitespace=False)


class ForgotSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=254)


class ResetSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=254)
    code = serializers.RegexField(r"^\s*\d{6}\s*$", error_messages={"invalid": "code_invalid"})
    password = serializers.CharField(max_length=128, trim_whitespace=False)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """Who is signed in (also sets the CSRF cookie the SPA needs for writes); PATCH updates the email."""

    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        return Response({
            "user": user_payload(user) if user.is_authenticated else None,
            "signup": settings.ALLOW_SIGNUP,
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "not_authenticated"}, status=status.HTTP_403_FORBIDDEN)
        data = ProfileSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        request.user.email = data.validated_data["email"].strip()
        request.user.save(update_fields=["email"])
        return Response({"user": user_payload(request.user)})


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        creds = dict(data.validated_data)
        # "muhammad" and "Muhammad" are the same person: match the username case-insensitively
        match = get_user_model().objects.filter(username__iexact=creds["username"]).first()
        if match is not None:
            creds["username"] = match.get_username()
        user = authenticate(request, **creds)
        if user is None or not user.is_active:
            return Response({"detail": "invalid_credentials"}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response({"user": user_payload(user)})


class RegisterView(APIView):
    """Open sign-up: every new account starts as its own, empty company."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        if not settings.ALLOW_SIGNUP:
            return Response({"detail": "signup_disabled"}, status=status.HTTP_403_FORBIDDEN)
        data = RegisterSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        fields = data.validated_data
        user = get_user_model().objects.create_user(
            username=fields["username"], email=fields.get("email", ""), password=fields["password"],
        )
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response({"user": user_payload(user)}, status=status.HTTP_201_CREATED)


class PasswordChangeView(APIView):
    def post(self, request):
        data = PasswordChangeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(data.validated_data["current_password"]):
            return Response({"current_password": ["password_wrong"]}, status=status.HTTP_400_BAD_REQUEST)
        errors = password_errors(data.validated_data["new_password"], user)
        if errors:
            return Response({"new_password": errors}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(data.validated_data["new_password"])
        user.save(update_fields=["password"])
        update_session_auth_hash(request, user)  # stay signed in on this device
        return Response(status=status.HTTP_204_NO_CONTENT)


def reset_email_text(user, code):
    minutes = int(CODE_TTL.total_seconds() // 60)
    return (
        f"Salom, {user.get_username()}!\n\n"
        f"Parolni tiklash kodingiz: {code}\n"
        f"Kod {minutes} daqiqa amal qiladi.\n\n"
        "Agar buni siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring: parolingiz o'zgarmaydi.\n\n"
        f"Your MBM Trucking password reset code is {code} (valid for {minutes} minutes)."
    )


class PasswordForgotView(APIView):
    """Email a 6-digit reset code. Answers the same way for unknown accounts, so it does not reveal which exist."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"
    resend_after = 60  # seconds between codes for one account

    def post(self, request):
        data = ForgotSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = find_user(data.validated_data["login"])
        if user is None:
            log.info("Password reset: no matching active account, nothing sent")
            return Response({"sent": True})
        if not user.email:
            log.warning("Password reset: user %s has no email, nothing sent", user.pk)
            return Response({"sent": True})
        last = PasswordResetCode.objects.filter(user=user).first()
        if last is not None and (timezone.now() - last.created_at).total_seconds() < self.resend_after:
            log.info("Password reset: user %s asked again within %ss, nothing sent", user.pk, self.resend_after)
            return Response({"sent": True})
        record, code = PasswordResetCode.issue(user)
        try:
            send_mail(
                subject=f"MBM Trucking: parolni tiklash kodi {code}",
                message=reset_email_text(user, code),
                from_email=None,
                recipient_list=[user.email],
            )
        except Exception:  # a mail provider outage must not become a 500
            log.exception("Could not send the password reset email to user %s", user.pk)
            record.delete()
            return Response({"detail": "email_failed"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        log.info("Password reset: code for user %s handed to %s, to %s", user.pk, email_backend_name(), mask_email(user.email))
        return Response({"sent": True})


class PasswordResetView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        data = ResetSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        fields = data.validated_data
        user = find_user(fields["login"])
        record = PasswordResetCode.objects.usable().filter(user=user).first() if user else None
        if record is None or not record.matches(fields["code"]):
            return Response({"code": ["code_invalid"]}, status=status.HTTP_400_BAD_REQUEST)
        errors = password_errors(fields["password"], user)
        if errors:
            return Response({"password": errors}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(fields["password"])
        user.save(update_fields=["password"])
        record.used_at = timezone.now()
        record.save(update_fields=["used_at"])
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response({"user": user_payload(user)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
