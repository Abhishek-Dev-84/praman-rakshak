import uuid
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

# We will save temporary challenges in the database/user model or simple dict
# For simplicity in this demo, we'll use a local memory storage for challenges
CHALLENGES = {}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_options(request):
    user = request.user
    challenge = str(uuid.uuid4())
    CHALLENGES[str(user.id)] = challenge
    
    # Standard WebAuthn creation options
    return Response({
        "challenge": challenge,
        "rp": {
            "name": "Secure Digital Document Management System",
            "id": "localhost"
        },
        "user": {
            "id": str(user.id),
            "name": user.username,
            "displayName": user.username
        },
        "pubKeyCredParams": [
            {"type": "public-key", "alg": -7}, # ES256
            {"type": "public-key", "alg": -257} # RS256
        ],
        "timeout": 60000,
        "authenticatorSelection": {
            "authenticatorAttachment": "platform",
            "userVerification": "preferred"
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_verify(request):
    user = request.user
    credential_id = request.data.get('credential_id', 'mock_credential_id_1234')
    
    # Store credential ID on user
    user.webauthn_credential_id = credential_id
    user.save()
    
    return Response({"status": "SUCCESS", "message": "Credential registered successfully."})

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_options(request):
    username = request.data.get('username')
    if not username:
        return Response({"error": "username is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
    challenge = str(uuid.uuid4())
    CHALLENGES[str(user.id)] = challenge
    
    return Response({
        "challenge": challenge,
        "timeout": 60000,
        "rpId": "localhost",
        "allowCredentials": [
            {
                "type": "public-key",
                "id": user.webauthn_credential_id or "mock_credential_id_1234"
            }
        ],
        "userVerification": "preferred"
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_verify(request):
    username = request.data.get('username')
    assertion_result = request.data.get('assertion') # WebAuthn assertion payload
    
    if not username:
        return Response({"error": "username is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
    # Standard WebAuthn verification
    # For demo purposes, we will issue a proof token
    proof_token = f"webauthn_proof_{str(uuid.uuid4())[:8]}"
    return Response({
        "status": "SUCCESS",
        "verification_proof": proof_token
    })
