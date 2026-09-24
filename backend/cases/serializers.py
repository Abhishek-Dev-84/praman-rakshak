from rest_framework import serializers
from .models import Case, CaseAssignment, CaseSummary
from django.contrib.auth import get_user_model

User = get_user_model()

class CaseSerializer(serializers.ModelSerializer):
    document_count = serializers.SerializerMethodField()
    assigned_users = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = ('id', 'case_number', 'title', 'description', 'case_type', 'status', 'created_by', 'created_at', 'document_count', 'assigned_users')
        read_only_fields = ('id', 'created_by', 'created_at')

    def get_document_count(self, obj):
        # We will import Document inside the method to avoid circular imports
        from documents.models import Document
        return Document.objects.filter(case=obj).count()

    def get_assigned_users(self, obj):
        assignments = CaseAssignment.objects.filter(case=obj)
        return [{
            "id": str(assign.user.id),
            "username": assign.user.username,
            "role": assign.user.role,
            "assigned_role": assign.assigned_role
        } for assign in assignments]

class CaseAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseAssignment
        fields = '__all__'
        read_only_fields = ('id', 'assigned_at')
