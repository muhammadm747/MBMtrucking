import json

from django.db.models import ProtectedError
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .backup import BackupError, export_backup, import_backup
from .models import Expense, Load, Truck
from .serializers import ExpenseSerializer, LoadSerializer, TruckSerializer

MAX_BACKUP_BYTES = 10 * 1024 * 1024


class TruckViewSet(viewsets.ModelViewSet):
    queryset = Truck.objects.all()
    serializer_class = TruckSerializer

    def get_queryset(self):
        return super().get_queryset().filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({"detail": "truck_has_records"}, status=status.HTTP_409_CONFLICT)


class LoadViewSet(viewsets.ModelViewSet):
    """All loads, newest pickup first. Unpaginated: the reports are computed over the full set."""

    queryset = Load.objects.select_related("truck")
    serializer_class = LoadSerializer

    def get_queryset(self):
        return super().get_queryset().filter(truck__owner=self.request.user)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("truck")
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        return super().get_queryset().filter(truck__owner=self.request.user)


class BackupExportView(APIView):
    def get(self, request):
        response = JsonResponse(export_backup(request.user), json_dumps_params={"ensure_ascii": False, "indent": 1})
        name = f"mbm-trucking-{timezone.localdate().isoformat()}.json"
        response["Content-Disposition"] = f'attachment; filename="{name}"'
        return response


class BackupImportView(APIView):
    """Restore from a backup file (multipart field `file`) or a JSON body. Only adds missing records."""

    parser_classes = [MultiPartParser, JSONParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is not None:
            if upload.size > MAX_BACKUP_BYTES:
                return Response({"detail": "file_too_large"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                data = json.loads(upload.read().decode("utf-8-sig"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                return Response({"detail": "invalid_json"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            data = request.data
        try:
            result = import_backup(data, request.user)
        except BackupError as exc:
            return Response({"detail": "nothing_to_restore", "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result.as_dict())
