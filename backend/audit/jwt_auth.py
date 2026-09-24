from urllib.parse import parse_qs
import logging
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)
User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_str):
    """
    Validates a JWT access token and returns the authenticated User instance.
    Returns AnonymousUser if token is missing, expired, or invalid.
    """
    if not token_str:
        return AnonymousUser()
    try:
        token = AccessToken(token_str)
        user_id = token.get('user_id') or token.get('id')
        if user_id:
            user = User.objects.get(id=user_id)
            if user.is_active:
                return user
    except Exception as e:
        logger.debug(f"WebSocket JWT authentication failed: {e}")
    return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Channels ASGI Middleware for JWT Authentication.
    Extracts token from query string (e.g. ?token=...) or Authorization header.
    """
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if not token:
            headers = dict(scope.get('headers', []))
            auth_header = headers.get(b'authorization', b'').decode('utf-8')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
            elif b'sec-websocket-protocol' in headers:
                proto = headers[b'sec-websocket-protocol'].decode('utf-8')
                for part in proto.split(','):
                    part = part.strip()
                    if part.startswith('token.'):
                        token = part.replace('token.', '')
                    elif len(part) > 20 and '.' in part:
                        token = part

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            # Fallback to session user if available, otherwise AnonymousUser
            if not scope.get('user') or scope['user'].is_anonymous:
                scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
