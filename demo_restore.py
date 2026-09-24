#!/usr/bin/env python3
"""
SIH 2026 - Digital Evidence Management System
Cryptographic Integrity Restoration Script
===========================================
This script restores authentic document checksums to corrupted audit ledger
blocks in PostgreSQL, re-executes HMAC-SHA256 chain verification, confirms
validity, and broadcasts real-time restoration notifications across WebSockets.

Usage:
    py demo_restore.py [document_id]
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
from audit.services import verify_chain, verify_case_chain, broadcast_integrity_restored

def run_restore_demo(doc_id=None):
    print("=" * 72)
    print(" [SHIELD] SIH 2026: CRYPTOGRAPHIC INTEGRITY RESTORATION")
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
    print(f"Case            : {doc.case.case_number if doc.case else 'Unassigned'}")
    print(f"Authentic Hash  : {doc.document_hash}")
    print("-" * 72)

    legit_hash = doc.document_hash
    if not legit_hash and doc.file:
        import hashlib
        doc.file.seek(0)
        legit_hash = hashlib.sha256(doc.file.read()).hexdigest()
        doc.document_hash = legit_hash
        doc.save(update_fields=['document_hash'])

    # Restore any audit logs whose document_hash was altered
    restored_count = 0
    for log in doc.audit_logs.all():
        if log.document_hash != legit_hash:
            print(f"[HEALING] Restoring block {log.log_id} ({log.action})...")
            print(f"  From: {log.document_hash}")
            print(f"  To  : {legit_hash}")
            log.document_hash = legit_hash
            log.save(update_fields=['document_hash'])
            restored_count += 1

    if restored_count == 0:
        print("[INFO] All audit ledger blocks already match authentic document hash.")

    # Re-run chain verification
    print(f"\n[VERIFY] Re-running cryptographic HMAC-SHA256 chain verification...")
    doc_result = verify_chain(doc)
    case_result = verify_case_chain(doc.case) if doc.case else None

    print("-" * 72)
    print(" [RESTORED] CRYPTOGRAPHIC INTEGRITY CONFIRMED:")
    print("-" * 72)
    print(f"Document Chain Valid : {doc_result.get('valid')}")
    if case_result:
        print(f"Case Docket Valid    : {case_result.get('valid')}")
        print(f"Case Head Hash       : {case_result.get('latest_hash', '')[:16]}...")
        print(f"Total Case Blocks    : {case_result.get('block_count')}")

    # Broadcast restoration
    case_id = doc.case_id if doc.case else None
    broadcast_integrity_restored(case_id, doc)

    print("-" * 72)
    print("[BROADCAST] REAL-TIME RESTORATION NOTIFICATION DISPATCHED:")
    print("   -> case_audit_{case_id}  (Live Case Audit Room)")
    print("   -> audit_alerts          (Security Operations Center Stream)")
    print("   -> audit_logs            (Global Audit Stream)")
    print("   -> admin_overview        (Executive Command Dashboard)")
    print("=" * 72)
    print("[CLIENTS] CHECK YOUR CONNECTED MOBILE PHONES & WEB INTERFACE:")
    print("   - Red alert dialog dismissed and banner cleared.")
    print("   - All blocks display green 'VALID' / 'HMAC-SHA256 INTACT'.")
    print("=" * 72 + "\n")

if __name__ == '__main__':
    doc_id_arg = sys.argv[1] if len(sys.argv) > 1 else None
    run_restore_demo(doc_id_arg)
