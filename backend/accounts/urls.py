from django.urls import path

from .views import (
    LoginView, LogoutView, MeView, PasswordChangeView, PasswordForgotView, PasswordResetView, RegisterView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="auth-me"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("password/change/", PasswordChangeView.as_view(), name="auth-password-change"),
    path("password/forgot/", PasswordForgotView.as_view(), name="auth-password-forgot"),
    path("password/reset/", PasswordResetView.as_view(), name="auth-password-reset"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
