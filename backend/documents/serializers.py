from rest_framework import serializers
from .models import Document, DocumentPIIFlag

class DocumentPIIFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentPIIFlag
        fields = '__all__'
        read_only_fields = ('id',)

class DocumentSerializer(serializers.ModelSerializer):
    pii_flags = DocumentPIIFlagSerializer(many=True, read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True, default='')
    case_id = serializers.CharField(source='case.id', read_only=True, default='')

    class Meta:
        model = Document
        fields = (
            'id', 'case', 'case_id', 'case_number', 'title', 'file', 'document_hash', 'category',
            'classification_confidence', 'status', 'version', 'uploaded_by',
            'uploaded_by_username', 'description', 'extracted_text', 'created_at', 'updated_at', 'pii_flags'
        )
        read_only_fields = ('id', 'document_hash', 'version', 'uploaded_by', 'created_at', 'updated_at', 'case_number', 'case_id')
