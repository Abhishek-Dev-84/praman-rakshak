from django.db import models
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import Case, CaseAssignment, CaseSummary
from .serializers import CaseSerializer, CaseAssignmentSerializer
from accounts.permissions import HasRole, IsAdminUserRole
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from audit.services import create_audit_log_entry

User = get_user_model()

class CaseViewSet(viewsets.ModelViewSet):
    serializer_class = CaseSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [HasRole(['ADMIN', 'OFFICER', 'INVESTIGATOR'])]
        elif self.action == 'destroy':
            return [HasRole(['ADMIN', 'OFFICER'])]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Case.objects.all().order_by('-created_at')
        # Filter by assignments OR created_by
        assigned_case_ids = CaseAssignment.objects.filter(user=user).values_list('case_id', flat=True)
        return Case.objects.filter(models.Q(id__in=assigned_case_ids) | models.Q(created_by=user)).distinct().order_by('-created_at')

    @action(detail=False, methods=['get'])
    def dockets(self, request):
        """Returns docket list (id, case_number, title, status) for audit dropdown across all authorized roles."""
        cases = self.get_queryset()
        data = [
            {
                "id": str(c.id),
                "case_number": c.case_number,
                "title": c.title,
                "status": c.status,
            }
            for c in cases
        ]
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        # Enforce object-level permission check
        pk = kwargs.get('pk')
        case = Case.objects.filter(pk=pk).first()
        if not case:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Case docket not found."}},
                status=status.HTTP_404_NOT_FOUND
            )
        user = request.user
        if user.role != 'ADMIN' and not CaseAssignment.objects.filter(case=case, user=user).exists() and case.created_by != user:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "You do not have access to this case."}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Include documents in detail response
        from documents.models import Document
        from documents.serializers import DocumentSerializer
        docs = Document.objects.filter(case=case).exclude(status='DELETED').order_by('-created_at')
        
        serializer = self.get_serializer(case)
        data = serializer.data
        data['documents'] = DocumentSerializer(docs, many=True).data

        try:
            create_audit_log_entry(
                document=None,
                action='VIEW',
                user=user,
                case=case,
                verification_method='NONE',
                details=f"Viewed case dossier {case.case_number}: {case.title}"
            )
        except Exception:
            pass

        return Response(data)

    def create(self, request, *args, **kwargs):
        user = request.user
        assigned_user_id = request.data.get('assigned_user_id') or request.data.get('assigned_user') or request.data.get('assignee_id')
        if assigned_user_id and user.role == 'INVESTIGATOR':
            try:
                target_user = User.objects.get(id=assigned_user_id)
                if target_user.role != 'OFFICER':
                    return Response(
                        {"error": {"code": "PERMISSION_DENIED", "message": "Investigating Officers can only assign Police Officers to cases."}},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except User.DoesNotExist:
                return Response(
                    {"error": {"code": "NOT_FOUND", "message": "Assigned user not found."}},
                    status=status.HTTP_404_NOT_FOUND
                )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        assigned_user_id = request.data.get('assigned_user_id') or request.data.get('assigned_user') or request.data.get('assignee_id')
        if assigned_user_id and user.role == 'INVESTIGATOR':
            try:
                target_user = User.objects.get(id=assigned_user_id)
                if target_user.role != 'OFFICER':
                    return Response(
                        {"error": {"code": "PERMISSION_DENIED", "message": "Investigating Officers can only assign Police Officers to cases."}},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except User.DoesNotExist:
                return Response(
                    {"error": {"code": "NOT_FOUND", "message": "Assigned user not found."}},
                    status=status.HTTP_404_NOT_FOUND
                )
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        case = serializer.save(created_by=self.request.user)

        # Assign creator if police officer or investigator
        if self.request.user.role in ['OFFICER', 'INVESTIGATOR']:
            CaseAssignment.objects.get_or_create(
                case=case,
                user=self.request.user,
                defaults={'assigned_role': self.request.user.role}
            )

        # Handle user assignment from request payload
        assigned_user_id = self.request.data.get('assigned_user_id') or self.request.data.get('assigned_user') or self.request.data.get('assignee_id')
        assigned_role = self.request.data.get('assigned_role')
        assigned_desc = ""
        if assigned_user_id:
            try:
                target_user = User.objects.get(id=assigned_user_id)
                role = assigned_role or target_user.role
                CaseAssignment.objects.get_or_create(
                    case=case,
                    user=target_user,
                    defaults={'assigned_role': role}
                )
                assigned_desc = f" (Assigned to {target_user.username} - {role})"
            except User.DoesNotExist:
                pass

        # Record single consolidated immutable CASE_CREATE audit entry
        try:
            create_audit_log_entry(
                document=None,
                action='CASE_CREATE',
                user=self.request.user,
                verification_method='PASSWORD',
                case=case,
                details=f"Case {case.case_number} registered: {case.title}{assigned_desc}"
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        case = serializer.save()
        assigned_user_id = self.request.data.get('assigned_user_id') or self.request.data.get('assigned_user') or self.request.data.get('assignee_id')
        if assigned_user_id:
            try:
                target_user = User.objects.get(id=assigned_user_id)
                role = self.request.data.get('assigned_role') or target_user.role
                assignment, created = CaseAssignment.objects.get_or_create(
                    case=case,
                    user=target_user,
                    defaults={'assigned_role': role}
                )
                if not created:
                    assignment.assigned_role = role
                    assignment.save()
                create_audit_log_entry(
                    document=None,
                    action='CASE_ASSIGN',
                    user=self.request.user,
                    verification_method='NONE',
                    case=case,
                    details=f"Assigned {target_user.username} ({role}) to case {case.case_number}"
                )
            except Exception:
                pass
        else:
            try:
                create_audit_log_entry(
                    document=None,
                    action='CASE_UPDATE',
                    user=self.request.user,
                    verification_method='NONE',
                    case=case,
                    details=f"Updated case {case.case_number}: {case.title}"
                )
            except Exception:
                pass

    def perform_destroy(self, instance):
        case_number = instance.case_number
        case_title = instance.title
        case_id = str(instance.id)

        # 1. Record immutable CASE_DELETE audit block BEFORE deletion to link the cryptographic chain
        try:
            create_audit_log_entry(
                document=None,
                action='CASE_DELETE',
                user=self.request.user,
                verification_method='BIOMETRIC',
                case=instance,
                details=f"Case docket {case_number} ({case_title}) was permanently deleted"
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to record CASE_DELETE audit block: {e}")

        # 2. Execute deletion (associated AuditLogs will have case set to NULL while retaining snapshot fields)
        instance.delete()

        # 3. Broadcast CASE_DELETED event across WebSockets so clients remove it live
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                event_data = {
                    "type": "audit_event",
                    "data": {
                        "event_type": "CASE_DELETED",
                        "type": "CASE_DELETED",
                        "case_id": case_id,
                        "case_number": case_number,
                    }
                }
                async_to_sync(channel_layer.group_send)("audit_logs", event_data)
                async_to_sync(channel_layer.group_send)(f"case_audit_{case_id}", event_data)
        except Exception:
            pass

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign(self, request, pk=None):
        case = Case.objects.filter(pk=pk).first()
        if not case:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Case docket not found."}},
                status=status.HTTP_404_NOT_FOUND
            )
        user = request.user
        if user.role != 'ADMIN' and not CaseAssignment.objects.filter(case=case, user=user).exists() and case.created_by != user:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "You do not have authority to assign officers to this case."}},
                status=status.HTTP_403_FORBIDDEN
            )
        user_id = request.data.get('user_id') or request.data.get('assigned_user_id')
        assigned_role = request.data.get('assigned_role')
        
        if not user_id:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "user_id is required."}},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        if user.role == 'INVESTIGATOR' and target_user.role != 'OFFICER':
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "Investigating Officers can only assign Police Officers to cases."}},
                status=status.HTTP_403_FORBIDDEN
            )
            
        role = assigned_role or target_user.role
        assignment, created = CaseAssignment.objects.get_or_create(
            case=case,
            user=target_user,
            defaults={'assigned_role': role}
        )
        if not created:
            assignment.assigned_role = role
            assignment.save()

        # Record CASE_ASSIGN audit log
        try:
            create_audit_log_entry(
                document=None,
                action='CASE_ASSIGN',
                user=request.user,
                verification_method='NONE',
                case=case,
                details=f"Assigned {target_user.username} ({role}) to case {case.case_number}"
            )
        except Exception:
            pass
            
        return Response({
            "id": str(assignment.id),
            "case_id": str(case.id),
            "user_id": str(target_user.id),
            "assigned_role": assignment.assigned_role
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        case = Case.objects.filter(pk=pk).first()
        if not case:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Case docket not found."}},
                status=status.HTTP_404_NOT_FOUND
            )
        user = request.user
        if user.role != 'ADMIN' and not CaseAssignment.objects.filter(case=case, user=user).exists() and case.created_by != user:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "You do not have access to this case."}},
                status=status.HTTP_403_FORBIDDEN
            )
            
        from ml.case_summary_service import get_or_generate_case_summary
        try:
            summary_data = get_or_generate_case_summary(case)
            return Response(summary_data)
        except Exception as e:
            return Response(
                {"error": {"code": "SERVER_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def complete_investigation(self, request, pk=None):
        case = Case.objects.filter(pk=pk).first()
        if not case:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Case docket not found."}},
                status=status.HTTP_404_NOT_FOUND
            )
        user = request.user
        if user.role not in ['INVESTIGATOR', 'ADMIN']:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "Only Investigating Officers can submit the final investigation report."}},
                status=status.HTTP_403_FORBIDDEN
            )
        case.status = 'CLOSED'
        case.save(update_fields=['status'])
        notes = request.data.get('notes', 'Final Case Report submitted and investigation completed.')
        try:
            create_audit_log_entry(
                document=None,
                action='FINAL_REPORT',
                user=user,
                verification_method='PASSWORD',
                case=case,
                details=f"Investigation completed and Final Case Report submitted by {user.username}: {notes}"
            )
        except Exception:
            pass
        return Response({
            "message": "Investigation completed and Final Case Report submitted.",
            "case_id": str(case.id),
            "status": case.status
        }, status=status.HTTP_200_OK)
