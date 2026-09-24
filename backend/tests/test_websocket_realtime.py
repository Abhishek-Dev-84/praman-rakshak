import json
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from config.asgi import application
from cases.models import Case, CaseAssignment
from documents.models import Document
from audit.services import create_genesis_audit_log, create_audit_log_entry, verify_chain

User = get_user_model()

@database_sync_to_async
def create_test_doc(case, user, title, document_hash):
    return Document.objects.create(
        case=case,
        title=title,
        document_hash=document_hash,
        uploaded_by=user,
        status="ACTIVE"
    )

@database_sync_to_async
def run_genesis_log(doc):
    return create_genesis_audit_log(doc)

@database_sync_to_async
def run_view_log(doc, user):
    return create_audit_log_entry(doc, "VIEW", user)

@database_sync_to_async
def tamper_log(log_entry):
    log_entry.document_hash = "corruptedhash"*4
    log_entry.save()

@database_sync_to_async
def run_verify(doc):
    return verify_chain(doc)

class WebSocketRealtimeTestCase(TransactionTestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin_ws", email="admin_ws@test.gov.in", password="Password@123", role="ADMIN"
        )
        self.officer_user = User.objects.create_user(
            username="officer_ws", email="officer_ws@test.gov.in", password="Password@123", role="OFFICER"
        )
        self.unauth_user = User.objects.create_user(
            username="unauth_ws", email="unauth_ws@test.gov.in", password="Password@123", role="INVESTIGATOR"
        )
        
        self.case1 = Case.objects.create(
            case_number="FIR-WS-001", title="WebSocket Live Test 1", created_by=self.officer_user
        )
        self.case2 = Case.objects.create(
            case_number="FIR-WS-002", title="WebSocket Live Test 2", created_by=self.admin_user
        )
        
        # Assign officer to case 1
        CaseAssignment.objects.create(case=self.case1, user=self.officer_user, assigned_role="LEAD")

    async def test_unauthenticated_connection_rejected(self):
        communicator = WebsocketCommunicator(
            application, f"/ws/audit/case/{self.case1.id}/"
        )
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4401)
        await communicator.disconnect()

    async def test_case_isolation_unauthorized_user_rejected(self):
        # unauth_user tries to connect to case2 without assignment
        token = str(AccessToken.for_user(self.unauth_user))
        communicator = WebsocketCommunicator(
            application, f"/ws/audit/case/{self.case2.id}/?token={token}"
        )
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4403)
        await communicator.disconnect()

    async def test_authorized_user_connects_and_receives_live_audit_event(self):
        token = str(AccessToken.for_user(self.officer_user))
        communicator = WebsocketCommunicator(
            application, f"/ws/audit/case/{self.case1.id}/?token={token}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Read initial confirmation message
        init_msg = await communicator.receive_json_from()
        self.assertEqual(init_msg["type"], "CONNECTION_ESTABLISHED")
        self.assertEqual(init_msg["case_id"], str(self.case1.id))
        
        # Create a document and genesis audit log for case1
        doc = await create_test_doc(self.case1, self.officer_user, "Evidence Report WS", "a"*64)
        await run_genesis_log(doc)
        
        # Verify event arrives live on websocket
        response = await communicator.receive_json_from()
        self.assertEqual(response["event_type"], "NEW_LOG_ENTRY")
        self.assertEqual(response["case_id"], str(self.case1.id))
        self.assertEqual(response["payload"]["action"], "UPLOAD")
        
        await communicator.disconnect()

    async def test_tamper_alert_broadcasts_live_to_case_subscribers(self):
        token = str(AccessToken.for_user(self.admin_user))
        communicator = WebsocketCommunicator(
            application, f"/ws/audit/case/{self.case1.id}/?token={token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from() # Init msg

        # Create doc and logs
        doc = await create_test_doc(self.case1, self.admin_user, "Tamper Test Doc", "b"*64)
        genesis = await run_genesis_log(doc)
        await communicator.receive_json_from() # Genesis upload msg

        log2 = await run_view_log(doc, self.admin_user)
        await communicator.receive_json_from() # View log msg

        # Corrupt log2 hash to trigger tampering
        await tamper_log(log2)

        # Run verify_chain
        res = await run_verify(doc)
        self.assertFalse(res["valid"])

        # Tamper alert should be received live on websocket
        tamper_msg = await communicator.receive_json_from()
        self.assertEqual(tamper_msg["event_type"], "TAMPER_ALERT")
        self.assertTrue(tamper_msg["is_tampered"])
        self.assertEqual(tamper_msg["severity"], "CRITICAL")
        self.assertIn("mismatch", tamper_msg["reason"])

        await communicator.disconnect()
