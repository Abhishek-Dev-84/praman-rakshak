import uuid
from django.db import models
from django.contrib.auth import get_user_model
from cases.models import Case

User = get_user_model()

class Document(models.Model):
    STATUS_CHOICES = [
        ('PROCESSING', 'Processing'),
        ('ACTIVE', 'Active'),
        ('PENDING_APPROVAL', 'Pending Approval'),
        ('VERIFIED', 'Verified & Endorsed'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('ARCHIVED', 'Archived'),
        ('DELETED', 'Deleted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    document_hash = models.CharField(max_length=64, blank=True)
    category = models.CharField(max_length=50, blank=True)
    classification_confidence = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROCESSING')
    version = models.IntegerField(default=1)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_documents')
    description = models.TextField(blank=True, default='')
    extracted_text = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} (v{self.version}) - {self.category or 'Unclassified'}"

class DocumentPIIFlag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='pii_flags')
    entity_type = models.CharField(max_length=50)  # e.g., PHONE, NAME, ADDRESS, ID_NUMBER
    text_snippet = models.CharField(max_length=255)
    start_offset = models.IntegerField()
    end_offset = models.IntegerField()
    reviewed = models.BooleanField(default=False)
    redact_approved = models.BooleanField(null=True, blank=True)

    def __str__(self):
        return f"{self.entity_type} flag in {self.document.title}"
