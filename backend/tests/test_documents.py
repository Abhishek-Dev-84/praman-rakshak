from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from cases.models import Case, CaseAssignment
from documents.models import Document

User = get_user_model()

class DocumentsTestCase(APITestCase):
    def setUp(self):
        # Create users
        self.officer = User.objects.create_user(
            username="officer_sharma", email="sharma@mha.gov.in", password="password123", role="OFFICER"
        )
        self.investigator = User.objects.create_user(
            username="investigator_verma", email="verma@mha.gov.in", password="password123", role="INVESTIGATOR"
        )
        
        # Create case
        self.case = Case.objects.create(
            case_number="FIR-123-2026", title="Mock Fraud Case", created_by=self.officer
        )
        # Assign investigator to case
        CaseAssignment.objects.create(case=self.case, user=self.investigator, assigned_role="LEAD")

    def test_document_upload_requires_case_assignment(self):
        # Officer uploads document (Officer is not assigned but is Admin/Officer global role, wait, is Officer allowed if not assigned?)
        # Let's test investigator who is assigned vs other user
        unassigned_user = User.objects.create_user(
            username="unassigned_officer", email="unassigned@mha.gov.in", password="password123", role="OFFICER"
        )
        
        self.client.force_authenticate(user=unassigned_user)
        url = reverse('document-list') # DRF router defaults to document-list for POST upload
        file_data = SimpleUploadedFile("complaint.txt", b"Suspect Vijay stole funds.", content_type="text/plain")
        
        res = self.client.post(url, {"title": "Complaint Letter", "case_id": str(self.case.id), "file": file_data})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN) # Forbidden since not assigned to case

    def test_document_upload_success_for_assigned_user(self):
        self.client.force_authenticate(user=self.investigator)
        url = reverse('document-list')
        file_data = SimpleUploadedFile("complaint.txt", b"Vijay stole 1000 rupees on 2026-08-24. Call him at 9876543210.", content_type="text/plain")
        
        res = self.client.post(url, {"title": "Complaint Letter", "case_id": str(self.case.id), "file": file_data}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("document_hash", res.json())
        self.assertIn("pii_flags", res.json())
        
        # Check that hash and status are set correctly
        doc = Document.objects.get(id=res.json()["id"])
        self.assertIsNotNone(doc.document_hash)
        self.assertEqual(doc.status, "ACTIVE")
