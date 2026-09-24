import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Case(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('CLOSED', 'Closed'),
        ('ARCHIVED', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    case_type = models.CharField(max_length=100, default='FIR', blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_cases')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.case_number}: {self.title}"

class CaseAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='case_assignments')
    assigned_role = models.CharField(max_length=50)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('case', 'user')

    def __str__(self):
        return f"{self.user.username} -> {self.case.case_number} ({self.assigned_role})"

class CaseSummary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.OneToOneField(Case, on_delete=models.CASCADE, related_name='summary')
    summary_json = models.JSONField()
    generated_at = models.DateTimeField(auto_now=True)
    source_document_count = models.IntegerField()

    def __str__(self):
        return f"Summary of {self.case.case_number}"
