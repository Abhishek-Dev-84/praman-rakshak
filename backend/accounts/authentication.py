from rest_framework.authentication import BaseAuthentication
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

class BypassAuthentication(BaseAuthentication):
    """
    Authentication class that bypasses authentication when no valid JWT or session is present.
    Ensures request.user is always a valid User instance so views depending on request.user
    (e.g., case assignment, audit logs, role checks) function without failure.
    """
    def authenticate(self, request):
        User = get_user_model()

        # Check for role/username hint in headers or query params
        target_role = request.headers.get('X-Role') or request.GET.get('role')
        target_username = request.headers.get('X-Username') or request.GET.get('username')

        user = None
        if target_username:
            user = User.objects.filter(username=target_username).first()

        if not user and target_role:
            role_upper = target_role.upper()
            if role_upper in ['POLICE', 'OFFICER']:
                role_upper = 'OFFICER'
            user = User.objects.filter(role=role_upper).first()

        if not user:
            # Default to admin user
            user = User.objects.filter(role='ADMIN').first() or User.objects.first()

        if not user:
            # Auto-create fallback admin user
            try:
                user, _ = User.objects.get_or_create(
                    username='admin',
                    defaults={
                        'email': 'admin@sdms.gov.in',
                        'role': 'ADMIN',
                        'is_staff': True,
                        'is_superuser': True,
                    }
                )
            except Exception as e:
                logger.warning(f"BypassAuthentication could not create default admin: {e}")
                return None

        return (user, None)
