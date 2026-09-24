from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from .models import AuditLog, AccessLog
from .serializers import AuditLogSerializer, AccessLogSerializer
from .services import verify_chain, verify_case_chain
from documents.models import Document
from cases.models import Case
from accounts.permissions import HasRole

class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        doc_id = self.request.query_params.get('document_id')
        case_id = self.request.query_params.get('case_id')
        
        if user.role == 'ADMIN':
            qs = AuditLog.objects.all().order_by('-timestamp')
        else:
            from cases.models import CaseAssignment
            assigned_case_ids = list(CaseAssignment.objects.filter(user=user).values_list('case_id', flat=True))
            created_case_ids = list(Case.objects.filter(created_by=user).values_list('id', flat=True))
            accessible_cases = set(assigned_case_ids + created_case_ids)
            qs = AuditLog.objects.filter(
                Q(user=user) |
                Q(case_id__in=accessible_cases) |
                Q(document__case_id__in=accessible_cases)
            ).order_by('-timestamp')

        if doc_id:
            qs = qs.filter(document_id=doc_id)
        if case_id:
            qs = qs.filter(Q(case_id=case_id) | Q(document__case_id=case_id))
        return qs

class AccessAnomalyListView(generics.ListAPIView):
    serializer_class = AccessLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return AccessLog.objects.all().order_by('-timestamp')
        return AccessLog.objects.filter(user=user).order_by('-timestamp')

class VerifyChainView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        doc = Document.objects.filter(id=pk).first()
        if doc:
            if request.user.role != 'ADMIN':
                from cases.models import CaseAssignment
                assigned = doc.case and CaseAssignment.objects.filter(case=doc.case, user=request.user).exists()
                created = doc.case and doc.case.created_by == request.user
                uploaded = doc.uploaded_by == request.user
                if not (assigned or created or uploaded):
                    return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            result = verify_chain(doc)
            if not result.get("valid", False):
                broken = result.get("broken_at")
                broken_id = str(broken.log_id) if hasattr(broken, 'log_id') else str(broken)
                return Response({
                    "valid": False,
                    "broken_at": broken_id,
                    "broken_at_log_id": broken_id,
                    "reason": result.get("reason", "Chain broken")
                }, status=status.HTTP_200_OK)
            return Response(result, status=status.HTTP_200_OK)
        case = Case.objects.filter(id=pk).first()
        if case:
            if request.user.role != 'ADMIN':
                from cases.models import CaseAssignment
                assigned = CaseAssignment.objects.filter(case=case, user=request.user).exists()
                created = case.created_by == request.user
                if not (assigned or created):
                    return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            result = verify_case_chain(case)
            return Response(result, status=status.HTTP_200_OK)
        return Response({"error": "Document or Case not found"}, status=status.HTTP_404_NOT_FOUND)

class AuditStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_logs = AuditLog.objects.count()
        total_anomalies = AccessLog.objects.filter(flagged=True).count()
        action_breakdown = AuditLog.objects.values('action').annotate(count=Count('action'))
        return Response({
            'total_logs': total_logs,
            'total_anomalies': total_anomalies,
            'action_breakdown': action_breakdown,
        }, status=status.HTTP_200_OK)
