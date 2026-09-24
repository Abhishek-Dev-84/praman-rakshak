from rest_framework import serializers
from .models import AuditLog, AccessLog

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    case_number = serializers.SerializerMethodField()
    document_title = serializers.SerializerMethodField()

    def get_case_number(self, obj):
        if getattr(obj, 'case_number', None):
            return obj.case_number
        if obj.case:
            return obj.case.case_number
        if obj.document and getattr(obj.document, 'case', None):
            return obj.document.case.case_number
        return ''

    def get_document_title(self, obj):
        if getattr(obj, 'document_title', None):
            return obj.document_title
        if obj.document:
            return obj.document.title
        return ''

    class Meta:
        model = AuditLog
        fields = (
            'log_id', 'document', 'document_title', 'case', 'case_number', 'action', 'user', 'username', 'user_role',
            'timestamp', 'document_hash', 'previous_log_hash',
            'current_log_hash', 'signature', 'verification_method',
            'last_verified_at', 'last_verification_result'
        )
        read_only_fields = ('log_id', 'timestamp')

class AccessLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)

    class Meta:
        model = AccessLog
        fields = '__all__'
        read_only_fields = ('id', 'timestamp')
