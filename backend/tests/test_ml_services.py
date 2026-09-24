from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from cases.models import Case, CaseAssignment
from documents.models import Document, DocumentPIIFlag
from ml.classifier import classify_document
from ml.pii_detector import detect_pii
from ml.search_service import index_document, semantic_search
from ml.case_summary_service import get_or_generate_case_summary
from ml.anomaly_service import score_access_event
from audit.models import AccessLog

User = get_user_model()

class MLServicesTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analyst_x", email="analyst@test.gov.in", password="password123", role="INVESTIGATOR"
        )
        self.case = Case.objects.create(
            case_number="FIR-444-2026", title="AI Investigation Case", created_by=self.user
        )

    def test_document_classification_service(self):
        text = "This records the First Information Report (FIR) under section 154 CrPC alleging robbery."
        res = classify_document(text)
        self.assertEqual(res["category"], "FIR")
        self.assertGreaterEqual(res["confidence"], 0.7)

    def test_pii_detection_service(self):
        text = "Contact Officer Ramesh Kumar immediately on phone number 9876543210 regarding the matter."
        res = detect_pii(text)
        
        # Verify both Name and Phone are flagged
        entity_types = [item["entity_type"] for item in res]
        self.assertIn("NAME", entity_types)
        self.assertIn("PHONE", entity_types)

    def test_search_rbac_isolation(self):
        from ml.search_service import get_chroma_client
        client = get_chroma_client()
        if client:
            try:
                client.delete_collection("document_chunks")
            except Exception:
                pass

        # User 1 and Case 1
        user1 = User.objects.create_user(username="user1", email="user1@test.gov.in", password="pwd", role="INVESTIGATOR")
        case1 = Case.objects.create(case_number="FIR-1", title="Case 1", created_by=user1)
        CaseAssignment.objects.create(case=case1, user=user1, assigned_role="LEAD")
        doc1 = Document.objects.create(case=case1, title="Confidential File 1", document_hash="h1", uploaded_by=user1, status="ACTIVE")
        index_document(doc1, "Secret keyword: Alpha77.")
        
        # User 2 and Case 2
        user2 = User.objects.create_user(username="user2", email="user2@test.gov.in", password="pwd", role="INVESTIGATOR")
        case2 = Case.objects.create(case_number="FIR-2", title="Case 2", created_by=user2)
        CaseAssignment.objects.create(case=case2, user=user2, assigned_role="LEAD")
        doc2 = Document.objects.create(case=case2, title="Confidential File 2", document_hash="h2", uploaded_by=user2, status="ACTIVE")
        index_document(doc2, "Secret keyword: Beta99.")

        # Search query by User 1 (should only retrieve doc1 results)
        allowed_case_ids = [str(case1.id)]
        search_res = semantic_search("Secret keyword", allowed_case_ids)
        
        source_doc_ids = [src["document_id"] for src in search_res["sources"]]
        self.assertIn(str(doc1.id), source_doc_ids)
        self.assertNotIn(str(doc2.id), source_doc_ids) # Strict RBAC segregation!

    def test_case_summarization_and_cache(self):
        doc1 = Document.objects.create(case=self.case, title="Doc 1", document_hash="h1", uploaded_by=self.user, status="ACTIVE")
        
        # Generate summary
        summary1 = get_or_generate_case_summary(self.case)
        self.assertEqual(len(summary1["document_breakdown"]), 1)
        
        # Request again (should load from cache - generated_at matching)
        summary2 = get_or_generate_case_summary(self.case)
        self.assertEqual(summary1["generated_at"], summary2["generated_at"])

    def test_anomaly_detection_scoring(self):
        log = AccessLog.objects.create(
            user=self.user,
            action="VIEW",
            device_info="Mock Client",
            ip_address="127.0.0.1"
        )
        # Normal query should score low
        score1 = score_access_event(log)
        self.assertLess(score1, 0.7)
