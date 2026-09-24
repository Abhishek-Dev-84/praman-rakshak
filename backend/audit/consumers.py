import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

@database_sync_to_async
def user_has_case_access(user, case_id):
    """
    Checks if a user is authorized to access real-time telemetry for a specific case.
    Admins have access to all cases.
    Officers, Investigators, Legal Officers, and Judges must be assigned or be creators.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'role', '') == 'ADMIN' or getattr(user, 'is_superuser', False):
        return True
    
    try:
        from cases.models import Case, CaseAssignment
        if CaseAssignment.objects.filter(case_id=case_id, user=user).exists():
            return True
        if Case.objects.filter(id=case_id, created_by=user).exists():
            return True
    except Exception as e:
        logger.error(f"Error checking case access: {e}")
    return False

@database_sync_to_async
def get_recent_case_audit_logs(case_id, limit=20):
    """Fetches the latest audit logs for resynchronization upon client reconnect."""
    try:
        from audit.models import AuditLog
        from audit.serializers import AuditLogSerializer
        logs = AuditLog.objects.filter(case_id=case_id).order_by('-timestamp')[:limit]
        return AuditLogSerializer(logs, many=True).data
    except Exception as e:
        logger.error(f"Error fetching recent logs for case {case_id}: {e}")
        return []

class CaseAuditConsumer(AsyncWebsocketConsumer):
    """
    Per-Case Real-Time Live Audit and Tamper Event Channel Consumer.
    
    Scopes all real-time events strictly to f"case_audit_{case_id}".
    Enforces server-side authentication & case-level access control.
    """
    async def connect(self):
        self.case_id = self.scope['url_route']['kwargs'].get('case_id')
        self.group_name = f"case_audit_{self.case_id}"
        user = self.scope.get('user')

        # Verify authentication
        if not user or not user.is_authenticated:
            logger.warning(f"Unauthenticated WebSocket connection attempt to {self.group_name}")
            await self.close(code=4401)
            return

        # Enforce server-side Case-level access control
        has_access = await user_has_case_access(user, self.case_id)
        if not has_access:
            logger.warning(f"Forbidden WebSocket connection attempt to {self.group_name} by {user.username} ({getattr(user, 'role', '')})")
            await self.close(code=4403)
            return

        # Join the scoped case group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"User {user.username} ({getattr(user, 'role', '')}) joined {self.group_name}")
        
        # Send initial connection confirmation
        await self.send(text_data=json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "case_id": self.case_id,
            "channel": self.group_name,
            "user": user.username,
            "role": getattr(user, 'role', ''),
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action') or data.get('type')
            if action == 'PING':
                await self.send(text_data=json.dumps({"type": "PONG"}))
            elif action == 'RESYNC':
                # Return recent logs for resynchronization after reconnection
                recent_logs = await get_recent_case_audit_logs(self.case_id)
                await self.send(text_data=json.dumps({
                    "type": "RESYNC_RESPONSE",
                    "case_id": self.case_id,
                    "logs": recent_logs,
                }))
        except Exception as e:
            logger.error(f"Error parsing WebSocket message in {self.group_name}: {e}")

    async def audit_event(self, event):
        """Handler for 'audit.event' messages sent to this case group."""
        await self.send(text_data=json.dumps(event['data']))

    async def tamper_alert(self, event):
        """Handler for 'tamper.alert' messages sent to this case group."""
        await self.send(text_data=json.dumps(event['data']))


class AlertsConsumer(AsyncWebsocketConsumer):
    """
    Live Tampering & Anomaly Alert Stream.
    Broadcasts critical security tamper events and flagged behavioral anomalies to authorized clients.
    """
    async def connect(self):
        self.group_name = "audit_alerts"
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"User {user.username} joined {self.group_name}")

        await self.send(text_data=json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "channel": self.group_name,
            "user": user.username,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('action') == 'PING':
                await self.send(text_data=json.dumps({"type": "PONG"}))
        except Exception:
            pass

    async def tamper_alert(self, event):
        """Handler for tamper alert broadcasts."""
        await self.send(text_data=json.dumps(event['data']))

    async def anomaly_alert(self, event):
        """Handler for anomaly alert broadcasts."""
        await self.send(text_data=json.dumps(event['data']))

    async def audit_event(self, event):
        """Handler for audit events that are critical."""
        await self.send(text_data=json.dumps(event['data']))


class GlobalAuditConsumer(AsyncWebsocketConsumer):
    """
    Live Global Audit Trail Consumer.
    Streams new HMAC-SHA256 ledger blocks in real time across the application.
    """
    async def connect(self):
        self.group_name = "audit_logs"
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        await self.send(text_data=json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "channel": self.group_name,
            "user": user.username,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('action') == 'PING':
                await self.send(text_data=json.dumps({"type": "PONG"}))
        except Exception:
            pass

    async def audit_event(self, event):
        """Handler for audit events."""
        await self.send(text_data=json.dumps(event['data']))

    async def tamper_alert(self, event):
        """Handler for tamper alerts."""
        await self.send(text_data=json.dumps(event['data']))


class AdminOverviewConsumer(AsyncWebsocketConsumer):
    """
    Cross-Case Summary Ping Consumer for Admin dashboard overview.
    """
    async def connect(self):
        self.group_name = "admin_overview"
        user = self.scope.get('user')
        if not user or not user.is_authenticated or getattr(user, 'role', '') != 'ADMIN':
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def overview_ping(self, event):
        await self.send(text_data=json.dumps(event['data']))

    async def overview_tamper(self, event):
        await self.send(text_data=json.dumps(event['data']))
