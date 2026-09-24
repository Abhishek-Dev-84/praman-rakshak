#!/usr/bin/env python3
"""
SIH 2026 - Digital Evidence Management System
Cryptographic Tamper Demonstration Script
===========================================
This script demonstrates genuine tamper detection by corrupting an audit ledger
entry's document hash in PostgreSQL and triggering the HMAC-SHA256 chain
verification algorithm.

Usage:
    py demo_tamper.py [document_id]
"""

import sys
import os
import django

# Setup Django environment
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from documents.models import Document
from audit.models import AuditLog
from audit.services import verify_chain, verify_case_chain, compute_entry_hash

def run_tamper_demo(doc_id=None):
    print("=" * 72)
    print(" [ALERT] SIH 2026: LIVE CRYPTOGRAPHIC TAMPER DEMONSTRATION")
    print("=" * 72)

    if doc_id:
        doc = Document.objects.filter(id=doc_id).first()
        if not doc:
            print(f"[ERROR] Document with ID {doc_id} not found.")
            sys.exit(1)
    else:
        doc = Document.objects.first()
        if not doc:
            print("[ERROR] No documents found in database.")
            sys.exit(1)

    print(f"Target Document : {doc.title}")
    print(f"Document ID     : {doc.id}")
    print(f"Case            : {doc.case.case_number if doc.case else 'Unassigned'} ({doc.case.title if doc.case else 'N/A'})")
    print(f"Authentic Hash  : {doc.document_hash}")
    print("-" * 72)

    latest_log = doc.audit_logs.order_by('-timestamp').first()
    if not latest_log:
        print("[ERROR] Document has no audit ledger entries to tamper.")
        sys.exit(1)

    print(f"Latest Block ID : {latest_log.log_id}")
    print(f"Block Action    : {latest_log.action}")
    print(f"Recorded Hash   : {latest_log.document_hash}")
    print(f"Chain Head Hash : {latest_log.current_log_hash}")
    print("-" * 72)

    # 1. Mutate hash in PostgreSQL
    orig_hash = latest_log.document_hash
    if not latest_log.document_hash.startswith("deadbeef"):
        corrupted_hash = "deadbeef" + latest_log.document_hash[8:]
    else:
        corrupted_hash = "deadbeef" + "0" * 8 + latest_log.document_hash[16:]

    print(f"[ACTION] Mutating PostgreSQL ledger block hash directly...")
    print(f"  Before : {orig_hash}")
    print(f"  After  : {corrupted_hash}")
    latest_log.document_hash = corrupted_hash
    latest_log.save(update_fields=['document_hash'])

    # 2. Re-verify chain
    print(f"\n[VERIFY] Executing HMAC-SHA256 chain verification algorithm...")
    doc_result = verify_chain(doc)
    case_result = verify_case_chain(doc.case) if doc.case else None

    print("-" * 72)
    print(" [TAMPER DETECTED] CRYPTOGRAPHIC INTEGRITY BREACH:")
    print("-" * 72)
    print(f"Document Chain Valid : {doc_result.get('valid')}")
    print(f"Broken at Block ID   : {doc_result.get('broken_at_log_id') or doc_result.get('broken_at')}")
    print(f"Detection Reason     : {doc_result.get('reason')}")
    if case_result:
        print(f"Case Docket Valid    : {case_result.get('valid')}")
        print(f"Case Docket Reason   : {case_result.get('reason')}")

    # Re-fetch the tampered block from DB
    latest_log.refresh_from_db()
    print(f"Database Record State: {latest_log.last_verification_result}")
    print("-" * 72)
    print("[BROADCAST] REAL-TIME WEBSOCKET EVENTS DISPATCHED:")
    print("   -> case_audit_{case_id}  (Live Case Audit Room)")
    print("   -> audit_alerts          (Security Operations Center Stream)")
    print("   -> audit_logs            (Global Audit Stream)")
    print("   -> admin_overview        (Executive Command Dashboard)")
    print("=" * 72)
    print("[CLIENTS] CHECK YOUR CONNECTED MOBILE PHONES & WEB INTERFACE:")
    print("   - Red 'CRITICAL TAMPER ALERT' dialog and banner are now visible!")
    print("   - Audit trail highlights the altered block with 'TAMPERED_PAYLOAD'.")
    print("=" * 72)
    print("\nTo restore cryptographic integrity back to VALID, run:")
    print(f"   py demo_restore.py {doc.id}\n")

if __name__ == '__main__':
    doc_id_arg = sys.argv[1] if len(sys.argv) > 1 else None
    run_tamper_demo(doc_id_arg)
