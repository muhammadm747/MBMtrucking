from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BackupExportView, BackupImportView, ExpenseViewSet, LoadViewSet, TruckViewSet

router = DefaultRouter()
router.register("trucks", TruckViewSet)
router.register("loads", LoadViewSet)
router.register("expenses", ExpenseViewSet)

urlpatterns = [
    path("backup/export/", BackupExportView.as_view(), name="backup-export"),
    path("backup/import/", BackupImportView.as_view(), name="backup-import"),
    *router.urls,
]
