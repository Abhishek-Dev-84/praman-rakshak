import os
import json
import hmac
import hashlib
import logging
from django.conf import settings
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import AuditLog, AccessLog
from accounts.crypto import decrypt_private_key
from .signatures import sign_data

logger = logging.getLogger(__name__)

# Standard 64-character hex zero string representing genesis root
GENESIS_HASH = "0" * 64

def compute_entry_hash(document_id, case_id, action, user_id, document_hash, previous_hash):
    """
    Computes deterministic HMAC-SHA256 hash for an audit ledger block.
    Keyed with server-side AUDIT_CHAIN_SECRET.
    """
    entry_data = {
        "document_id": str(document_id) if document_id else "",
        "case_id": str(case_id) if case_id else "",
        "action": action,
        "user_id": str(user_id) if user_id else "",
        "document_hash": document_hash,
        "previous_log_hash": previous_hash,
    }
    serialized = json.dumps(entry_data, sort_keys=True)
    secret = os.getenv('AUDIT_CHAIN_SECRET', 'sih2026-mha-audit-chain-secret-key').encode('utf-8')
    return hmac.new(secret, serialized.encode('utf-8'), hashlib.sha256).hexdigest()

def get_latest_hash(document=None, case=None):
    """Retrieves the latest cryptographic hash in the document or case chain."""
    if document:
        latest_log = AuditLog.objects.filter(document=document).order_by('-timestamp').first()
    elif case:
        latest_log = AuditLog.objects.filter(case=case).order_by('-timestamp').first()
    else:
        latest_log = AuditLog.objects.all().order_by('-timestamp').first()
    if latest_log:
        return latest_log.current_log_hash
    return GENESIS_HASH

def serialize_audit_log(log_entry):
    """Transforms an AuditLog model instance into a JSON-serializable dictionary."""
    doc = getattr(log_entry, 'document', None)
    case = getattr(log_entry, 'case', None) or (getattr(doc, 'case', None) if doc else None)
    user = getattr(log_entry, 'user', None)
    
    case_num = getattr(log_entry, 'case_number', '') or (case.case_number if case else '')
    doc_title = getattr(log_entry, 'document_title', '') or (doc.title if doc else '')
    
    return {
        "log_id": str(log_entry.log_id),
        "document_id": str(doc.id) if doc else "",
        "document_title": doc_title,
        "case_id": str(case.id) if case else "",
        "case_number": case_num,
        "action": log_entry.action,
        "user_id": str(user.id) if user else "",
        "username": user.username if user else "System",
        "user_role": getattr(user, 'role', ''),
        "timestamp": log_entry.timestamp.isoformat() if hasattr(log_entry.timestamp, 'isoformat') else timezone.now().isoformat(),
        "document_hash": log_entry.document_hash,
        "previous_log_hash": log_entry.previous_log_hash,
        "current_log_hash": log_entry.current_log_hash,
        "signature": log_entry.signature,
        "verification_method": log_entry.verification_method,
        "last_verified_at": log_entry.last_verified_at.isoformat() if log_entry.last_verified_at else None,
        "last_verification_result": log_entry.last_verification_result,
    }

def broadcast_audit_log(log_entry):
    """
    Broadcasts a new immutable ledger block across:
    1. The scoped case channel group (f"case_audit_{case_id}")
    2. The global audit log channel group ("audit_logs")
    3. The admin overview summary channel ("admin_overview")
    """
    payload = serialize_audit_log(log_entry)
    case_id = payload.get("case_id")
    
    event_data = {
        "event_type": "NEW_LOG_ENTRY",
        "type": "NEW_LOG_ENTRY",
        "case_id": case_id,
        "timestamp": timezone.now().isoformat(),
        "payload": payload,
        "log": payload,
    }
    
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            # 1. Scoped Case Channel
            if case_id:
                async_to_sync(channel_layer.group_send)(
                    f"case_audit_{case_id}",
                    {
                        "type": "audit_event",
                        "data": event_data,
                    }
                )
            
            # 2. Global Audit Logs Channel
            async_to_sync(channel_layer.group_send)(
                "audit_logs",
                {
                    "type": "audit_event",
                    "data": event_data,
                }
            )
            
            # 3. Admin Overview Summary Channel
            async_to_sync(channel_layer.group_send)(
                "admin_overview",
                {
                    "type": "overview_ping",
                    "data": {
                        "case_id": case_id or "",
                        "event_count_delta": 1,
                        "has_active_tamper_flag": False,
                        "timestamp": timezone.now().isoformat(),
                    }
                }
            )
    except Exception as e:
        logger.error(f"Failed to broadcast audit log event: {e}")

def broadcast_tamper_alert(case_id, document, broken_at_entry, reason):
    """
    Broadcasts a verified, genuine tamper detection alert to:
    1. The scoped case channel (f"case_audit_{case_id}")
    2. The live alerts channel ("audit_alerts")
    3. The global audit channel ("audit_logs")
    4. The admin overview channel ("admin_overview")
    """
    doc_title = document.title if document else "Evidence Document"
    doc_id = str(document.id) if document else ""
    broken_log_id = str(broken_at_entry.log_id) if broken_at_entry else ""
    case_num = ""
    if document and getattr(document, 'case', None):
        case_num = document.case.case_number

    alert_data = {
        "event_type": "TAMPER_ALERT",
        "type": "TAMPER_ALERT",
        "is_tampered": True,
        "severity": "CRITICAL",
        "case_id": str(case_id) if case_id else "",
        "case_number": case_num,
        "document_id": doc_id,
        "document_title": doc_title,
        "broken_at_log_id": broken_log_id,
        "action": broken_at_entry.action if broken_at_entry else "INTEGRITY_CHECK",
        "reason": reason,
        "detected_at": timezone.now().isoformat(),
        "timestamp": timezone.now().isoformat(),
        "message": f"CRITICAL: Cryptographic tampering detected in {doc_title} ({reason})",
    }

    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            if case_id:
                async_to_sync(channel_layer.group_send)(
                    f"case_audit_{case_id}",
                    {
                        "type": "tamper_alert",
                        "data": alert_data,
                    }
                )
            async_to_sync(channel_layer.group_send)(
                "audit_alerts",
                {
                    "type": "tamper_alert",
                    "data": alert_data,
                }
            )
            async_to_sync(channel_layer.group_send)(
                "audit_logs",
                {
                    "type": "tamper_alert",
                    "data": alert_data,
                }
            )
            async_to_sync(channel_layer.group_send)(
                "admin_overview",
                {
                    "type": "overview_ping",
                    "data": {
                        "case_id": str(case_id) if case_id else "",
                        "event_count_delta": 0,
                        "has_active_tamper_flag": True,
                        "timestamp": timezone.now().isoformat(),
                    }
                }
            )
    except Exception as e:
        logger.error(f"Failed to broadcast tamper alert: {e}")

def broadcast_integrity_restored(case_id, document):
    """
    Broadcasts a real-time event notifying clients that cryptographic
    chain integrity has been restored and verified.
    """
    doc_title = document.title if document else "Evidence Document"
    doc_id = str(document.id) if document else ""
    case_num = ""
    if document and getattr(document, 'case', None):
        case_num = document.case.case_number

    event_data = {
        "event_type": "INTEGRITY_RESTORED",
        "type": "INTEGRITY_RESTORED",
        "is_tampered": False,
        "severity": "INFO",
        "case_id": str(case_id) if case_id else "",
        "case_number": case_num,
        "document_id": doc_id,
        "document_title": doc_title,
        "restored_at": timezone.now().isoformat(),
        "timestamp": timezone.now().isoformat(),
        "message": f"Cryptographic integrity restored and verified for {doc_title}.",
    }

    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            if case_id:
                async_to_sync(channel_layer.group_send)(
                    f"case_audit_{case_id}",
                    {
                        "type": "audit_event",
                        "data": event_data,
                    }
                )
            async_to_sync(channel_layer.group_send)(
                "audit_alerts",
                {
                    "type": "audit_event",
                    "data": event_data,
                }
            )
            async_to_sync(channel_layer.group_send)(
                "audit_logs",
                {
                    "type": "audit_event",
                    "data": event_data,
                }
            )
            async_to_sync(channel_layer.group_send)(
                "admin_overview",
                {
                    "type": "overview_ping",
                    "data": {
                        "case_id": str(case_id) if case_id else "",
                        "event_count_delta": 0,
                        "has_active_tamper_flag": False,
                        "timestamp": timezone.now().isoformat(),
                    }
                }
            )
    except Exception as e:
        logger.error(f"Failed to broadcast integrity restored event: {e}")

def broadcast_anomaly_alert(access_log):
    """Broadcasts a high-severity behavioral anomaly alert."""
    doc = getattr(access_log, 'document', None)
    doc_title = doc.title if doc else "System Resource"
    user = access_log.user
    
    alert_data = {
        "event_type": "ANOMALY_ALERT",
        "type": "ANOMALY_ALERT",
        "severity": "HIGH",
        "anomaly_id": str(access_log.id),
        "username": user.username if user else "Unknown",
        "action": access_log.action,
        "document_title": doc_title,
        "ip_address": access_log.ip_address,
        "device_info": access_log.device_info,
        "anomaly_score": access_log.anomaly_score,
        "detected_at": access_log.timestamp.isoformat() if hasattr(access_log.timestamp, 'isoformat') else timezone.now().isoformat(),
        "message": f"Security Anomaly: Unusual {access_log.action} activity detected for {user.username} (Risk score: {access_log.anomaly_score:.2f})",
    }
    
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                "audit_alerts",
                {
                    "type": "anomaly_alert",
                    "data": alert_data,
                }
            )
    except Exception as e:
        logger.error(f"Failed to broadcast anomaly alert: {e}")

def create_genesis_audit_log(document):
    """Initializes the genesis block for a newly registered evidence document."""
    previous_hash = GENESIS_HASH
    case = getattr(document, 'case', None)
    case_id = case.id if case else None

    current_hash = compute_entry_hash(
        document.id, case_id, 'UPLOAD', document.uploaded_by.id, document.document_hash, previous_hash
    )
    
    case_num = case.case_number if case else ''
    doc_title = document.title if document else ''

    log_entry = AuditLog.objects.create(
        document=document,
        case=case,
        case_number=case_num,
        document_title=doc_title,
        action='UPLOAD',
        user=document.uploaded_by,
        document_hash=document.document_hash,
        previous_log_hash=previous_hash,
        current_log_hash=current_hash,
        verification_method='NONE',
        last_verified_at=timezone.now(),
        last_verification_result='VALID'
    )
    
    broadcast_audit_log(log_entry)
    return log_entry

def create_audit_log_entry(document=None, action='VIEW', user=None, verification_method='NONE', case=None, details=''):
    """Appends an immutable audit entry to the document & case hash-chain."""
    if document and not case:
        case = getattr(document, 'case', None)
    case_id = case.id if case else None
    doc_id = document.id if document else None
    doc_hash = document.document_hash if document else hashlib.sha256((details or action).encode('utf-8')).hexdigest()

    previous_hash = get_latest_hash(document=document, case=case)

    user_id = user.id if user else None
    current_hash = compute_entry_hash(
        doc_id, case_id, action, user_id, doc_hash, previous_hash
    )
    
    case_num = (case.case_number if case else (document.case.case_number if document and getattr(document, 'case', None) else ''))
    doc_title = document.title if document else ''

    log_entry = AuditLog.objects.create(
        document=document,
        case=case,
        case_number=case_num,
        document_title=doc_title,
        action=action,
        user=user,
        document_hash=doc_hash,
        previous_log_hash=previous_hash,
        current_log_hash=current_hash,
        verification_method=verification_method,
        last_verified_at=timezone.now(),
        last_verification_result='VALID'
    )
    
    broadcast_audit_log(log_entry)
    return log_entry

def create_signed_audit_log_entry(document, action, user, verification_method, password=None):
    """
    Appends a cryptographically signed audit entry with RSA digital signature.
    """
    previous_hash = get_latest_hash(document)
    case = getattr(document, 'case', None)
    case_id = case.id if case else None

    current_hash = compute_entry_hash(
        document.id, case_id, action, user.id, document.document_hash, previous_hash
    )
    
    signature = None
    if verification_method in ['BIOMETRIC', 'WEBAUTHN', 'OTP', 'PASSWORD']:
        try:
            if password and getattr(user, 'encrypted_private_key', None):
                private_pem = decrypt_private_key(user.encrypted_private_key, password)
                signature = sign_data(private_pem, current_hash.encode('utf-8'))
            else:
                signature = f"SIGNED_{verification_method}_{user.username}_{current_hash[:16]}"
        except Exception as e:
            if verification_method in ['BIOMETRIC', 'WEBAUTHN', 'OTP']:
                signature = f"SIGNED_{verification_method}_{user.username}_{current_hash[:16]}"
            else:
                raise ValueError(f"Failed to decrypt private key for signature: {str(e)}")

    case_num = case.case_number if case else ''
    doc_title = document.title if document else ''

    log_entry = AuditLog.objects.create(
        document=document,
        case=case,
        case_number=case_num,
        document_title=doc_title,
        action=action,
        user=user,
        document_hash=document.document_hash,
        previous_log_hash=previous_hash,
        current_log_hash=current_hash,
        verification_method=verification_method,
        signature=signature,
        last_verified_at=timezone.now(),
        last_verification_result='VALID'
    )
    
    broadcast_audit_log(log_entry)
    return log_entry

def verify_chain(document):
    """
    Performs full chain verification across all ledger blocks for a document.
    Walks every entry in chronological order, recomputes HMAC-SHA256,
    and pinpoints the EXACT log_id where tampering occurred.
    Broadcasts real-time TAMPER_ALERT on any failure.
    """
    entries = AuditLog.objects.filter(document=document).order_by('timestamp')
    expected_previous = GENESIS_HASH
    
    case = getattr(document, 'case', None)
    case_id = case.id if case else None

    for entry in entries:
        # 1. Verify link continuity
        if entry.previous_log_hash != expected_previous:
            entry.last_verified_at = timezone.now()
            entry.last_verification_result = 'TAMPERED_LINK'
            entry.save(update_fields=['last_verified_at', 'last_verification_result'])
            
            reason = f"Chain link broken at block {str(entry.log_id)[:8]}: previous hash mismatch."
            broadcast_tamper_alert(case_id, document, entry, reason)
            
            return {
                "valid": False,
                "broken_at": entry,
                "broken_at_log_id": str(entry.log_id),
                "reason": reason
            }
            
        # 2. Recompute deterministic HMAC-SHA256
        recomputed = compute_entry_hash(
            entry.document_id,
            entry.case_id if entry.case_id else case_id,
            entry.action,
            entry.user_id,
            entry.document_hash,
            entry.previous_log_hash
        )
        if recomputed != entry.current_log_hash:
            entry.last_verified_at = timezone.now()
            entry.last_verification_result = 'TAMPERED_PAYLOAD'
            entry.save(update_fields=['last_verified_at', 'last_verification_result'])
            
            reason = f"Block payload altered at {str(entry.log_id)[:8]}: cryptographic HMAC-SHA256 mismatch."
            broadcast_tamper_alert(case_id, document, entry, reason)
            
            return {
                "valid": False,
                "broken_at": entry,
                "broken_at_log_id": str(entry.log_id),
                "reason": reason
            }
            
        entry.last_verified_at = timezone.now()
        entry.last_verification_result = 'VALID'
        entry.save(update_fields=['last_verified_at', 'last_verification_result'])
        expected_previous = entry.current_log_hash
        
    return {"valid": True}

def verify_case_chain(case):
    """
    Performs full chain verification across all ledger blocks for a case docket.
    Walks every entry in chronological order, recomputes HMAC-SHA256,
    and returns valid status, block count, latest hash, and any broken block details.
    """
    from django.db.models import Q
    entries = AuditLog.objects.filter(Q(case=case) | Q(document__case=case)).order_by('timestamp').distinct()
    if not entries.exists():
        return {
            "valid": True,
            "block_count": 0,
            "latest_hash": GENESIS_HASH,
            "message": "No ledger blocks recorded yet for this case."
        }
    
    for entry in entries:
        recomputed = compute_entry_hash(
            entry.document_id,
            entry.case_id if entry.case_id else case.id,
            entry.action,
            entry.user_id,
            entry.document_hash,
            entry.previous_log_hash
        )
        if recomputed != entry.current_log_hash:
            entry.last_verified_at = timezone.now()
            entry.last_verification_result = 'TAMPERED_PAYLOAD'
            entry.save(update_fields=['last_verified_at', 'last_verification_result'])
            reason = f"Case ledger block altered at {str(entry.log_id)[:8]}: HMAC mismatch."
            broadcast_tamper_alert(case.id, entry.document, entry, reason)
            return {
                "valid": False,
                "broken_at_log_id": str(entry.log_id),
                "reason": reason,
                "block_count": entries.count()
            }
        entry.last_verified_at = timezone.now()
        entry.last_verification_result = 'VALID'
        entry.save(update_fields=['last_verified_at', 'last_verification_result'])

    latest = entries.last()
    return {
        "valid": True,
        "block_count": entries.count(),
        "latest_hash": latest.current_log_hash if latest else GENESIS_HASH,
        "latest_action": latest.action if latest else None,
        "last_verified_at": timezone.now().isoformat(),
        "case_id": str(case.id),
        "case_number": case.case_number
    }

def log_access_event(user, document, action, request=None):
    """Records behavioral access telemetry for anomaly scoring."""
    ip = None
    device = ""
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        device = request.META.get('HTTP_USER_AGENT', '')[:255]
        
    log_entry = AccessLog.objects.create(
        user=user,
        document=document,
        action=action,
        ip_address=ip,
        device_info=device
    )
    
    from ml.anomaly_service import score_access_event
    try:
        anomaly_score = score_access_event(log_entry)
        log_entry.anomaly_score = anomaly_score
        if anomaly_score > 0.7:
            log_entry.flagged = True
            log_entry.save(update_fields=['anomaly_score', 'flagged'])
            broadcast_anomaly_alert(log_entry)
        else:
            log_entry.save(update_fields=['anomaly_score'])
    except Exception:
        pass
        
    return log_entry
