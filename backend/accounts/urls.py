from django.urls import path

from .views import LoginView, LogoutView, MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="auth-me"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
