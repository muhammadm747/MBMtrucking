"""Session-based auth for the React app (same origin, CSRF protected)."""
from django.contrib.auth import authenticate, get_user_model, login, logout
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


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """Who is signed in. Also sets the CSRF cookie the SPA needs for writes."""

    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        return Response({"user": user_payload(user) if user.is_authenticated else None})


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


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
