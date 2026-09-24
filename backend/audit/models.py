import uuid
from django.db import models
from django.contrib.auth import get_user_model
from documents.models import Document

User = get_user_model()

class AuditLog(models.Model):
    """
    Cryptographic HMAC-SHA256 Hash-Chain Audit Log.
    
    Architectural Decision Rationale (Signed Hash-Chain vs Blockchain):
    ------------------------------------------------------------------
    The Ministry of Home Affairs (MHA) operates as a single trusted sovereign authority.
    Blockchain's primary value proposition—achieving decentralized consensus among
    mutually distrusting anonymous parties—does not apply in this closed, hierarchical
    jurisdiction. A signed, HMAC-strengthened hash-chain with per-user RSA/ECDSA signatures
    provides mathematically equivalent tamper-evidence and non-repudiation with 
    sub-millisecond throughput, zero consensus overhead, and no decentralized attack surface.
    """
    ACTION_CHOICES = [
        ('UPLOAD', 'Upload'),
        ('VIEW', 'View'),
        ('EDIT', 'Edit'),
        ('SHARE', 'Share'),
        ('APPROVE', 'Approve'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('REGISTER', 'Register Evidence'),
        ('MOVE', 'Movement Request'),
        ('RELEASE', 'Evidence Release'),
        ('RECEIVE', 'Evidence Receive'),
        ('REJECT', 'Reject'),
        ('SEAL', 'Seal Operation'),
        ('CONDITION', 'Condition Change'),
        ('USER', 'User Administration'),
        ('CASE_CREATE', 'Case Creation'),
        ('CASE_ASSIGN', 'Case Assignment'),
        ('CASE_UPDATE', 'Case Update'),
        ('CASE_DELETE', 'Case Deletion'),
        ('FINAL_REPORT', 'Final Case Report'),
    ]

    VERIFICATION_CHOICES = [
        ('BIOMETRIC', 'Biometric'),
        ('WEBAUTHN', 'WebAuthn'),
        ('OTP', 'OTP'),
        ('PASSWORD', 'Password'),
        ('NONE', 'None'),
    ]

    log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, related_name='audit_logs', null=True, blank=True)
    case = models.ForeignKey('cases.Case', on_delete=models.SET_NULL, related_name='audit_logs', null=True, blank=True)
    case_number = models.CharField(max_length=100, blank=True, default='')
    document_title = models.CharField(max_length=255, blank=True, default='')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    document_hash = models.CharField(max_length=64)
    previous_log_hash = models.CharField(max_length=64)
    current_log_hash = models.CharField(max_length=64)
    signature = models.TextField(null=True, blank=True)
    verification_method = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='NONE')
    last_verified_at = models.DateTimeField(null=True, blank=True)
    last_verification_result = models.CharField(max_length=50, default='PENDING')

    class Meta:
        indexes = [
            models.Index(fields=['case', 'timestamp']),
            models.Index(fields=['document', 'timestamp']),
        ]
        ordering = ['timestamp']

    def __str__(self):
        target = self.document_title or (self.document.title if self.document else (self.case_number or (self.case.case_number if self.case else 'System')))
        return f"{self.action} on {target} by {self.user.username} [{self.current_log_hash[:8]}]"

class AccessLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_logs')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='access_logs', null=True, blank=True)
    action = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.CharField(max_length=255, blank=True)
    anomaly_score = models.FloatField(null=True, blank=True)
    flagged = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"
