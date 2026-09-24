import hashlib
from rest_framework import serializers
from .models import (
    StorageFacility, StorageLocation, Evidence, EvidenceMedia,
    CustodyTransaction, MovementRequest, EvidenceConditionHistory, EvidenceSealHistory
)

class StorageFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageFacility
        fields = '__all__'


class StorageLocationSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    hierarchy_path = serializers.CharField(read_only=True)

    class Meta:
        model = StorageLocation
        fields = '__all__'


class EvidenceMediaSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = EvidenceMedia
        fields = '__all__'
        read_only_fields = ('id', 'uploaded_at', 'checksum_sha256')

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

    def create(self, validated_data):
        file_obj = validated_data.get('file')
        if file_obj:
            hasher = hashlib.sha256()
            for chunk in file_obj.chunks():
                hasher.update(chunk)
            validated_data['checksum_sha256'] = hasher.hexdigest()
            validated_data['file_size'] = file_obj.size
            validated_data['file_name'] = file_obj.name
        return super().create(validated_data)


class CustodyTransactionSerializer(serializers.ModelSerializer):
    previous_custodian_name = serializers.CharField(source='previous_custodian.username', read_only=True)
    new_custodian_name = serializers.CharField(source='new_custodian.username', read_only=True)
    previous_location_path = serializers.CharField(source='previous_location.hierarchy_path', read_only=True)
    new_location_path = serializers.CharField(source='new_location.hierarchy_path', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)

    class Meta:
        model = CustodyTransaction
        fields = '__all__'
        read_only_fields = ('id', 'timestamp')


class MovementRequestSerializer(serializers.ModelSerializer):
    evidence_number = serializers.CharField(source='evidence.evidence_number', read_only=True)
    evidence_title = serializers.CharField(source='evidence.title', read_only=True)
    current_location_path = serializers.CharField(source='current_location.hierarchy_path', read_only=True)
    requested_destination_path = serializers.CharField(source='requested_destination.hierarchy_path', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    released_by_name = serializers.CharField(source='released_by.username', read_only=True)
    received_by_name = serializers.CharField(source='received_by.username', read_only=True)

    class Meta:
        model = MovementRequest
        fields = '__all__'
        read_only_fields = ('id', 'request_number', 'requested_at')


class EvidenceConditionHistorySerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)

    class Meta:
        model = EvidenceConditionHistory
        fields = '__all__'
        read_only_fields = ('id', 'timestamp')


class EvidenceSealHistorySerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)

    class Meta:
        model = EvidenceSealHistory
        fields = '__all__'
        read_only_fields = ('id', 'timestamp')


class EvidenceSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    case_title = serializers.CharField(source='case.title', read_only=True)
    case_id = serializers.CharField(write_only=True, required=False)
    collected_by_name = serializers.CharField(source='collected_by.username', read_only=True)
    current_custodian_name = serializers.CharField(source='current_custodian.username', read_only=True)
    responsible_officer_name = serializers.CharField(source='responsible_officer.username', read_only=True)
    current_location_path = serializers.SerializerMethodField()
    media_files = EvidenceMediaSerializer(many=True, read_only=True)
    media_count = serializers.IntegerField(source='media_files.count', read_only=True)

    class Meta:
        model = Evidence
        fields = '__all__'
        read_only_fields = ('id', 'evidence_number', 'registered_at', 'qr_code_token')

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'case_id' in mutable_data and 'case' not in mutable_data:
            mutable_data['case'] = mutable_data['case_id']
        return super().to_internal_value(mutable_data)

    def get_current_location_path(self, obj):
        if obj.current_location:
            return obj.current_location.hierarchy_path
        if obj.storage_location_name:
            return obj.storage_location_name
        return "Vault Storage (Unassigned)"
