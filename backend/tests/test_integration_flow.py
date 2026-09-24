import json
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from cases.models import Case, CaseAssignment
from documents.models import Document
from audit.models import AuditLog

User = get_user_model()

class IntegrationUploadFlowTestCase(APITestCase):
    def setUp(self):
        # 1. Register and login a user
        register_url = reverse('auth_register')
        self.client.post(register_url, {
            "username": "lead_investigator",
            "email": "lead@mha.gov.in",
            "password": "investigator_pass_123",
            "role": "INVESTIGATOR"
        })
        
        login_url = reverse('auth_login')
        login_res = self.client.post(login_url, {
            "username": "lead_investigator",
            "password": "investigator_pass_123"
        })
        self.token = login_res.json()["access_token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        
        self.user = User.objects.get(username="lead_investigator")
        
        # Create Case
        self.case = Case.objects.create(
            case_number="FIR-300-2026", title="Integration Case", created_by=self.user
        )
        CaseAssignment.objects.create(case=self.case, user=self.user, assigned_role="LEAD_OFFICER")

        # Create Reviewing Judge (as uploaders cannot approve their own uploads)
        self.judge = User.objects.create_user(
            username="hon_judge",
            email="judge@court.gov.in",
            password="judge_pass_123",
            role="JUDGE"
        )
        CaseAssignment.objects.create(case=self.case, user=self.judge, assigned_role="JUDGE")

    def test_full_upload_to_verify_flow_integration(self):
        # 2. Upload a document
        upload_url = reverse('document-list')
        file_data = SimpleUploadedFile("case_report.txt", b"Ramesh saw the suspect at 12:00 PM on 2026-08-24. Call him at 9876543210.", content_type="text/plain")
        
        upload_res = self.client.post(upload_url, {
            "title": "Case Investigation Report",
            "case_id": str(self.case.id),
            "file": file_data
        }, format='multipart')
        
        self.assertEqual(upload_res.status_code, status.HTTP_201_CREATED)
        doc_id = upload_res.json()["id"]
        
        # 3. Assert classification & PII flags are present
        self.assertEqual(upload_res.json()["category"], "FIR") # Fallback rule tags it as FIR
        self.assertGreater(len(upload_res.json()["pii_flags"]), 0)
        
        # 4. Assert genesis audit entry exists and chain is valid
        verify_url = reverse('document-verify', args=[doc_id])
        verify_res = self.client.get(verify_url)
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_res.json()["valid"])
        
        # 5. Reviewing Judge requests an APPROVE action (Step 1)
        self.client.force_authenticate(user=self.judge)
        action_url = reverse('document-action', args=[doc_id])
        action_res = self.client.post(action_url, {"action": "APPROVE"})
        self.assertEqual(action_res.status_code, status.HTTP_202_ACCEPTED)
        challenge_id = action_res.json()["challenge_id"]
        
        # Complete step-up verification (Step 2)
        confirm_res = self.client.post(action_url, {
            "action": "APPROVE",
            "challenge_id": challenge_id,
            "verification_method": "OTP",
            "verification_proof": "123456",
            "password": "judge_pass_123"
        })
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)
        self.assertTrue(confirm_res.json()["signed"])
        
        # 6. Directly tamper with the audit entry in the database
        audit_log = AuditLog.objects.filter(document_id=doc_id).order_by('-timestamp').first()
        audit_log.document_hash = "tamperedcontenttamperedcontenttamperedcontenttamperedcontent12"
        audit_log.save()
        
        # 7. Call verify endpoint -> assert valid is False
        verify_tampered_res = self.client.get(verify_url)
        self.assertEqual(verify_tampered_res.status_code, status.HTTP_200_OK)
        self.assertFalse(verify_tampered_res.json()["valid"])
        self.assertEqual(verify_tampered_res.json()["broken_at"], str(audit_log.log_id))
