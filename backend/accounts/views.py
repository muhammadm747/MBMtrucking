"""Session-based auth for the React app (same origin, CSRF protected)."""
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView


def user_payload(user):
    return {"id": user.id, "username": user.get_username(), "name": user.get_full_name() or user.get_username()}


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
        user = get_user_model()(username=attrs["username"], email=attrs.get("email", ""))
        try:
            validate_password(attrs["password"], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": [e.code or "password_invalid" for e in exc.error_list]})
        return attrs


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """Who is signed in. Also sets the CSRF cookie the SPA needs for writes."""

    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        return Response({
            "user": user_payload(user) if user.is_authenticated else None,
            "signup": settings.ALLOW_SIGNUP,
        })


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


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
