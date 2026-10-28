from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponse
from django.urls import include, path, re_path
from django.views.decorators.csrf import ensure_csrf_cookie


@ensure_csrf_cookie
def spa(request):
    """Serve the built React app for every non-API route (client-side routing)."""
    index = settings.FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(index.open("rb"), content_type="text/html")
    return HttpResponse(
        "Frontend is not built yet. Run `npm run build` in frontend/, "
        "or use the Vite dev server at http://localhost:5173 during development.",
        content_type="text/plain",
        status=503,
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("fleet.urls")),
    re_path(r"^(?!api/|admin/|static/).*$", spa),
]
