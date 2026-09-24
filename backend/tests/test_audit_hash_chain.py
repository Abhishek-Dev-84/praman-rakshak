from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from cases.models import Case
from documents.models import Document
from audit.models import AuditLog
from audit.services import verify_chain, create_genesis_audit_log, create_audit_log_entry

User = get_user_model()

class AuditHashChainTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="investigator_a", email="investigator@test.gov.in", password="password123", role="INVESTIGATOR"
        )
        self.case = Case.objects.create(
            case_number="FIR-999-2026", title="Hash Chain Case Test", created_by=self.user
        )
        # Mock file
        self.file = SimpleUploadedFile("evidence.txt", b"Mock evidence content.", content_type="text/plain")
        self.document = Document.objects.create(
            case=self.case,
            title="Evidence Report",
            file=self.file,
            document_hash="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
            uploaded_by=self.user,
            status="ACTIVE"
        )

    def test_genesis_entry_created_on_upload(self):
        # Create genesis audit entry
        genesis = create_genesis_audit_log(self.document)
        self.assertEqual(genesis.previous_log_hash, "0" * 64)
        self.assertEqual(genesis.action, "UPLOAD")
        
        # Verify chain validity
        res = verify_chain(self.document)
        self.assertTrue(res["valid"])

    def test_subsequent_entries_linked_in_chain(self):
        genesis = create_genesis_audit_log(self.document)
        
        # Action 2: View
        log2 = create_audit_log_entry(self.document, "VIEW", self.user)
        self.assertEqual(log2.previous_log_hash, genesis.current_log_hash)
        
        # Action 3: Edit
        log3 = create_audit_log_entry(self.document, "EDIT", self.user)
        self.assertEqual(log3.previous_log_hash, log2.current_log_hash)
        
        # Verify chain is valid
        res = verify_chain(self.document)
        self.assertTrue(res["valid"])

    def test_chain_detects_manual_db_tampering(self):
        genesis = create_genesis_audit_log(self.document)
        log2 = create_audit_log_entry(self.document, "VIEW", self.user)
        log3 = create_audit_log_entry(self.document, "EDIT", self.user)
        
        # Mutate log2 record directly in the database (bypassing service layer)
        log2.document_hash = "fakedhashfakedhashfakedhashfakedhashfakedhashfakedhashfakedhash1"
        log2.save()
        
        # Check integrity
        res = verify_chain(self.document)
        self.assertFalse(res["valid"])
        # Should flag log2 as the broken block
        self.assertEqual(res["broken_at"].log_id, log2.log_id)
        self.assertIn("payload altered", res["reason"])
