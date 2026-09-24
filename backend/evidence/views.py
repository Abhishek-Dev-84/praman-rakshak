import hashlib
import uuid
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from cases.models import Case, CaseAssignment
from accounts.permissions import HasRole
from audit.services import log_access_event, create_audit_log_entry
from .models import (
    StorageFacility, StorageLocation, Evidence, EvidenceMedia,
    CustodyTransaction, MovementRequest, EvidenceConditionHistory, EvidenceSealHistory
)
from .serializers import (
    StorageFacilitySerializer, StorageLocationSerializer, EvidenceSerializer,
    EvidenceMediaSerializer, CustodyTransactionSerializer, MovementRequestSerializer,
    EvidenceConditionHistorySerializer, EvidenceSealHistorySerializer
)

class StorageFacilityViewSet(viewsets.ModelViewSet):
    queryset = StorageFacility.objects.all()
    serializer_class = StorageFacilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasRole(['ADMIN'])]
        return [permissions.IsAuthenticated()]


class StorageLocationViewSet(viewsets.ModelViewSet):
    queryset = StorageLocation.objects.all()
    serializer_class = StorageLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasRole(['ADMIN', 'OFFICER', 'INVESTIGATOR'])]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        facility_id = self.request.query_params.get('facility')
        if facility_id:
            qs = qs.filter(facility_id=facility_id)
        return qs


class EvidenceViewSet(viewsets.ModelViewSet):
    serializer_class = EvidenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [HasRole(['ADMIN', 'OFFICER', 'INVESTIGATOR'])]
        elif self.action in ['destroy']:
            return [HasRole(['ADMIN', 'OFFICER'])]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            qs = Evidence.objects.all()
        else:
            assigned_cases = CaseAssignment.objects.filter(user=user).values_list('case_id', flat=True)
            created_cases = Case.objects.filter(created_by=user).values_list('id', flat=True)
            accessible_cases = set(assigned_cases).union(set(created_cases))
            qs = Evidence.objects.filter(case_id__in=accessible_cases)

        # Query Filters
        case_id = self.request.query_params.get('case_id')
        if case_id:
            qs = qs.filter(case_id=case_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        evidence_type = self.request.query_params.get('evidence_type')
        if evidence_type:
            qs = qs.filter(evidence_type=evidence_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(title__icontains=search) |
                models.Q(evidence_number__icontains=search) |
                models.Q(fir_number__icontains=search) |
                models.Q(serial_number__icontains=search) |
                models.Q(category__icontains=search)
            )

        return qs.order_by('-registered_at')

    def retrieve(self, request, *args, **kwargs):
        evidence = self.get_object()
        user = request.user
        try:
            create_audit_log_entry(
                document=None,
                action='VIEW',
                user=user,
                case=evidence.case,
                verification_method='NONE',
                details=f"Viewed evidence item {evidence.evidence_number}: {evidence.title}"
            )
        except Exception:
            pass
        return super().retrieve(request, *args, **kwargs)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        case_id = data.get('case') or data.get('case_id')
        if not case_id:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "case_id is required."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        case = get_object_or_404(Case, id=case_id)
        user = request.user
        if user.role != 'ADMIN' and not CaseAssignment.objects.filter(case=case, user=user).exists() and case.created_by != user:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "You are not assigned to this case docket."}},
                status=status.HTTP_403_FORBIDDEN
            )

        data['case'] = str(case.id)
        loc_text = data.get('storage_location_name') or data.get('location_name') or data.get('current_location_name')
        if loc_text and not data.get('storage_location_name'):
            data['storage_location_name'] = loc_text

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        evidence = serializer.save(
            collected_by=user,
            current_custodian=user,
            responsible_officer=user
        )

        # Record Initial Custody Transaction
        remarks_loc = evidence.current_location.hierarchy_path if evidence.current_location else (evidence.storage_location_name or 'Vault Storage')
        CustodyTransaction.objects.create(
            evidence=evidence,
            previous_custodian=None,
            new_custodian=user,
            previous_location=None,
            new_location=evidence.current_location,
            transfer_reason="Initial Evidence Registration and Intake into SDMS Ledger",
            requested_by=user,
            received_by=user,
            status='COMPLETED',
            remarks=f"Registered by {user.username} at {remarks_loc} with seal {evidence.current_seal_number or 'N/A'}"
        )

        # Record Initial Condition
        EvidenceConditionHistory.objects.create(
            evidence=evidence,
            previous_condition="NEW",
            new_condition=evidence.current_condition,
            reason="Initial intake condition evaluation",
            recorded_by=user
        )

        # Record Initial Seal if present
        if evidence.current_seal_number:
            EvidenceSealHistory.objects.create(
                evidence=evidence,
                seal_number=evidence.current_seal_number,
                action='INITIAL_SEAL',
                seal_condition=evidence.seal_condition,
                reason="Initial evidence packaging tamper seal",
                operator=user
            )

        # Record immutable audit log entry
        try:
            create_audit_log_entry(
                document=None,
                action='REGISTER',
                user=user,
                verification_method='NONE',
                case=case,
                details=f"Evidence registered: {evidence.title} ({evidence.evidence_number})"
            )
        except Exception:
            pass

        log_access_event(user, None, 'EVIDENCE_REGISTER', request)
        return Response(self.get_serializer(evidence).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def media(self, request, pk=None):
        evidence = self.get_object()
        if request.method == 'GET':
            media_files = evidence.media_files.all()
            serializer = EvidenceMediaSerializer(media_files, many=True)
            return Response(serializer.data)

        # POST: Upload multimedia
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "No file uploaded."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        media_category = request.data.get('media_category', 'GENERAL')
        description = request.data.get('description', '')
        file_type = request.data.get('file_type', 'PHOTO')

        media_item = EvidenceMedia.objects.create(
            evidence=evidence,
            file=file_obj,
            file_name=file_obj.name,
            file_type=file_type,
            media_category=media_category,
            uploaded_by=request.user,
            description=description
        )

        serializer = EvidenceMediaSerializer(media_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def custody(self, request, pk=None):
        evidence = self.get_object()
        transactions = evidence.custody_transactions.all()
        serializer = CustodyTransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def movements(self, request, pk=None):
        evidence = self.get_object()
        movements = evidence.movement_requests.all()
        serializer = MovementRequestSerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='condition-history')
    def condition_history(self, request, pk=None):
        evidence = self.get_object()
        if request.method == 'GET':
            history = evidence.condition_history.all()
            serializer = EvidenceConditionHistorySerializer(history, many=True)
            return Response(serializer.data)

        new_condition = request.data.get('new_condition')
        reason = request.data.get('reason', '')
        if not new_condition:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "new_condition is required."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        prev_condition = evidence.current_condition
        evidence.current_condition = new_condition
        evidence.save(update_fields=['current_condition'])

        record = EvidenceConditionHistory.objects.create(
            evidence=evidence,
            previous_condition=prev_condition,
            new_condition=new_condition,
            reason=reason,
            recorded_by=request.user
        )

        return Response(EvidenceConditionHistorySerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='seal-history')
    def seal_history(self, request, pk=None):
        evidence = self.get_object()
        if request.method == 'GET':
            history = evidence.seal_history.all()
            serializer = EvidenceSealHistorySerializer(history, many=True)
            return Response(serializer.data)

        seal_number = request.data.get('seal_number') or evidence.current_seal_number
        seal_action = request.data.get('action', 'VERIFIED_INTACT')
        seal_condition = request.data.get('seal_condition', 'INTACT')
        reason = request.data.get('reason', '')
        new_seal_number = request.data.get('new_seal_number', '')

        if new_seal_number:
            evidence.current_seal_number = new_seal_number
        evidence.seal_condition = seal_condition
        evidence.save(update_fields=['current_seal_number', 'seal_condition'])

        record = EvidenceSealHistory.objects.create(
            evidence=evidence,
            seal_number=seal_number,
            action=seal_action,
            seal_condition=seal_condition,
            reason=reason,
            operator=request.user,
            new_seal_number=new_seal_number
        )

        return Response(EvidenceSealHistorySerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        if user.role == 'ADMIN':
            qs = Evidence.objects.all()
        else:
            assigned_cases = CaseAssignment.objects.filter(user=user).values_list('case_id', flat=True)
            qs = Evidence.objects.filter(case_id__in=assigned_cases)

        total_count = qs.count()
        in_storage = qs.filter(status='IN_STORAGE').count()
        in_transit = qs.filter(status='IN_TRANSIT').count()
        movement_pending = MovementRequest.objects.filter(status='PENDING').count()
        damaged_seals = qs.filter(seal_condition='DAMAGED').count()

        return Response({
            "total_evidence": total_count,
            "in_storage": in_storage,
            "in_transit": in_transit,
            "pending_movements": movement_pending,
            "damaged_seals": damaged_seals,
            "high_sensitivity": qs.filter(sensitivity_level__in=['HIGH', 'RESTRICTED']).count(),
        })


class MovementRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MovementRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return MovementRequest.objects.all()
        assigned_cases = CaseAssignment.objects.filter(user=user).values_list('case_id', flat=True)
        created_cases = Case.objects.filter(created_by=user).values_list('id', flat=True)
        accessible_cases = set(assigned_cases).union(set(created_cases))
        return MovementRequest.objects.filter(evidence__case_id__in=accessible_cases)

    def create(self, request, *args, **kwargs):
        evidence_id = request.data.get('evidence') or request.data.get('evidence_id')
        if not evidence_id:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "evidence_id is required."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        evidence = get_object_or_404(Evidence, id=evidence_id)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set required approval role based on evidence sensitivity
        req_role = 'INVESTIGATOR'
        if evidence.sensitivity_level in ['HIGH', 'RESTRICTED']:
            req_role = 'JUDGE' if request.data.get('purpose') == 'COURT_PROCEEDING' else 'ADMIN'

        movement = serializer.save(
            evidence=evidence,
            current_location=evidence.current_location,
            requested_by=request.user,
            status='PENDING',
            required_approval_role=req_role
        )

        evidence.status = 'MOVEMENT_PENDING'
        evidence.save(update_fields=['status'])

        # Record audit log
        try:
            create_audit_log_entry(
                document=None,
                action='MOVE',
                user=request.user,
                verification_method='NONE',
                case=evidence.case,
                details=f"Movement requested for evidence {evidence.evidence_number}"
            )
        except Exception:
            pass

        return Response(self.get_serializer(movement).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        movement = self.get_object()
        user = request.user

        # Enforce RBAC for approval
        if user.role not in ['ADMIN', 'JUDGE', 'INVESTIGATOR', 'OFFICER', 'LEGAL_OFFICER']:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "You do not have authority to approve movement requests."}},
                status=status.HTTP_403_FORBIDDEN
            )

        notes = request.data.get('notes', '')
        signature = request.data.get('signature', f"APPROVED_BY_{user.username}_{timezone.now().timestamp()}")
        verif_method = request.data.get('verification_method', 'BIOMETRIC')

        movement.status = 'APPROVED'
        movement.approved_by = user
        movement.approved_at = timezone.now()
        movement.approval_notes = notes
        movement.approval_signature = signature
        movement.save()

        # Record audit log
        try:
            create_audit_log_entry(
                document=None,
                action='APPROVE',
                user=user,
                verification_method=verif_method,
                case=movement.evidence.case,
                details=f"Approved movement for evidence {movement.evidence.evidence_number}"
            )
        except Exception:
            pass

        return Response(self.get_serializer(movement).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        movement = self.get_object()
        user = request.user

        if user.role not in ['ADMIN', 'JUDGE', 'INVESTIGATOR', 'OFFICER', 'LEGAL_OFFICER']:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "You do not have authority to reject movement requests."}},
                status=status.HTTP_403_FORBIDDEN
            )

        verif_method = request.data.get('verification_method', 'BIOMETRIC')
        movement.status = 'REJECTED'
        movement.approved_by = user
        movement.approved_at = timezone.now()
        movement.approval_notes = request.data.get('notes', 'Rejected by reviewing officer.')
        movement.save()

        # Revert evidence status
        movement.evidence.status = 'IN_STORAGE'
        movement.evidence.save(update_fields=['status'])

        # Record audit log
        try:
            create_audit_log_entry(
                document=None,
                action='REJECT',
                user=user,
                verification_method=verif_method,
                case=movement.evidence.case,
                details=f"Rejected movement for evidence {movement.evidence.evidence_number}"
            )
        except Exception:
            pass

        return Response(self.get_serializer(movement).data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def release(self, request, pk=None):
        movement = self.get_object()
        user = request.user

        if movement.status != 'APPROVED':
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Movement must be in APPROVED state before release."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        movement.status = 'IN_TRANSIT'
        movement.released_by = user
        movement.released_at = timezone.now()
        movement.release_condition = request.data.get('release_condition', 'INTACT')
        movement.release_seal_condition = request.data.get('release_seal_condition', 'INTACT')
        movement.save()

        # Update Evidence
        evidence = movement.evidence
        evidence.status = 'IN_TRANSIT'
        evidence.save(update_fields=['status'])

        # Record in Chain of Custody
        CustodyTransaction.objects.create(
            evidence=evidence,
            previous_custodian=evidence.current_custodian,
            new_custodian=None,
            previous_location=movement.current_location,
            new_location=movement.requested_destination,
            transfer_reason=f"Evidence released for: {movement.get_purpose_display()}",
            requested_by=movement.requested_by,
            approved_by=movement.approved_by,
            released_by=user,
            status='IN_TRANSIT',
            remarks=f"Dispatched by {user.username}. Seal: {movement.release_seal_condition}"
        )

        # Record audit log
        try:
            create_audit_log_entry(
                document=None,
                action='RELEASE',
                user=user,
                verification_method='NONE',
                case=evidence.case,
                details=f"Released evidence {evidence.evidence_number} for transfer"
            )
        except Exception:
            pass

        return Response(self.get_serializer(movement).data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def receive(self, request, pk=None):
        movement = self.get_object()
        user = request.user

        if movement.status != 'IN_TRANSIT':
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Movement must be IN_TRANSIT to confirm receipt."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        receive_condition = request.data.get('receive_condition', 'INTACT')
        receive_seal_condition = request.data.get('receive_seal_condition', 'INTACT')
        remarks = request.data.get('remarks', '')

        movement.status = 'RECEIVED'
        movement.received_by = user
        movement.received_at = timezone.now()
        movement.receive_condition = receive_condition
        movement.receive_seal_condition = receive_seal_condition
        movement.receiving_remarks = remarks
        movement.save()

        # Update Evidence Location & Custodian
        evidence = movement.evidence
        evidence.previous_location = movement.current_location
        evidence.current_location = movement.requested_destination
        evidence.current_custodian = user
        evidence.status = 'IN_STORAGE' if movement.requested_destination else 'IN_COURT'
        evidence.current_condition = receive_condition
        evidence.seal_condition = receive_seal_condition
        evidence.save()

        # Record completed Custody Transaction
        CustodyTransaction.objects.create(
            evidence=evidence,
            previous_custodian=movement.released_by,
            new_custodian=user,
            previous_location=movement.current_location,
            new_location=movement.requested_destination,
            transfer_reason=f"Receipt confirmed at destination: {movement.external_destination_notes or (movement.requested_destination.hierarchy_path if movement.requested_destination else 'Destination')}",
            requested_by=movement.requested_by,
            approved_by=movement.approved_by,
            released_by=movement.released_by,
            received_by=user,
            status='COMPLETED',
            remarks=f"Received by {user.username}. Condition: {receive_condition}. Seal: {receive_seal_condition}."
        )

        # Record audit log
        try:
            create_audit_log_entry(
                document=None,
                action='RECEIVE',
                user=user,
                verification_method='NONE',
                case=evidence.case,
                details=f"Received evidence {evidence.evidence_number} at destination"
            )
        except Exception:
            pass

        return Response(self.get_serializer(movement).data)
