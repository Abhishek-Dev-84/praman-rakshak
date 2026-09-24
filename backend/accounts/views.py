from rest_framework import status, generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from django.db.models import Q
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Rename default keys
        data['access_token'] = data.pop('access')
        data['refresh_token'] = data.pop('refresh')
        data['user'] = {
            'id': str(self.user.id),
            'username': self.user.username,
            'role': self.user.role,
            'email': self.user.email
        }
        return data

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            try:
                from audit.services import log_access_event, create_audit_log_entry
                from cases.models import Case
                from django.db.models import Q
                username = request.data.get('username')
                user = User.objects.get(username=username)
                log_access_event(user, None, 'LOGIN', request)
                create_audit_log_entry(
                    document=None,
                    action='LOGIN',
                    user=user,
                    case=None,
                    verification_method='PASSWORD',
                    details=f"Official {user.username} ({user.role}) authenticated successfully"
                )

                # Broadcast login to case-level stream and record on case-level audit trail
                if user.role == 'ADMIN':
                    user_cases = Case.objects.all().order_by('-created_at')[:20]
                else:
                    user_cases = Case.objects.filter(Q(assignments__user=user) | Q(created_by=user)).distinct()

                for c in user_cases:
                    create_audit_log_entry(
                        document=None,
                        action='LOGIN',
                        user=user,
                        case=c,
                        verification_method='PASSWORD',
                        details=f"Official {user.username} ({user.role}) authenticated (Session active on case {c.case_number})"
                    )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Login audit log creation failed: {e}")
        return response

class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        # simplejwt expects 'refresh' key
        attrs['refresh'] = attrs.get('refresh_token', attrs.get('refresh'))
        if not attrs.get('refresh'):
            raise serializers.ValidationError({'refresh_token': 'This field is required.'})
        
        data = super().validate(attrs)
        # Rename default access key
        data['access_token'] = data.pop('access')
        return data

class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Match register API_SPEC response
        return Response({
            "id": str(user.id),
            "username": user.username,
            "role": user.role,
            "public_key": user.public_key
        }, status=status.HTTP_201_CREATED)

class MeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        return Response({
            "id": str(user.id),
            "username": user.username,
            "role": user.role,
            "email": user.email,
            "is_active": user.is_active,
        })

class UserListView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = User.objects.all().order_by('-created_at')
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(username__icontains=search) | Q(email__icontains=search))
        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Admin authorization required."}, status=status.HTTP_403_FORBIDDEN)
        
        reg_serializer = RegisterSerializer(data=request.data)
        reg_serializer.is_valid(raise_exception=True)
        user = reg_serializer.save()

        try:
            from audit.services import create_audit_log_entry
            create_audit_log_entry(
                document=None,
                action='USER',
                user=request.user,
                case=None,
                verification_method='PASSWORD',
                details=f"Admin created official account for {user.username} ({user.role})"
            )
        except Exception:
            pass

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)
    lookup_field = 'id'

    def update(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Admin authorization required."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        if 'role' in request.data:
            user.role = request.data['role']
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
        if 'email' in request.data:
            user.email = request.data['email']
        if 'password' in request.data and request.data['password']:
            user.set_password(request.data['password'])
        user.save()

        try:
            from audit.services import create_audit_log_entry
            create_audit_log_entry(
                document=None,
                action='USER',
                user=request.user,
                case=None,
                verification_method='PASSWORD',
                details=f"Admin updated profile/role for {user.username} ({user.role})"
            )
        except Exception:
            pass

        return Response(UserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Admin authorization required."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = False
        user.save()

        try:
            from audit.services import create_audit_log_entry
            create_audit_log_entry(
                document=None,
                action='USER',
                user=request.user,
                case=None,
                verification_method='PASSWORD',
                details=f"Admin deactivated user {user.username} ({user.role})"
            )
        except Exception:
            pass

        return Response({"detail": "User deactivated successfully."}, status=status.HTTP_200_OK)

class AssignableOfficersView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        role_filter = request.query_params.get('role')
        search = request.query_params.get('search')
        users = User.objects.filter(is_active=True).order_by('role', 'username')
        if role_filter and role_filter != 'ALL':
            users = users.filter(role=role_filter)
        if search:
            from django.db.models import Q
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(role__icontains=search)
            )
        data = [
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "badge_number": getattr(u, 'badge_number', '') or '',
                "department": getattr(u, 'department', '') or '',
            }
            for u in users
        ]
        return Response(data, status=status.HTTP_200_OK)

class SystemStatsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from cases.models import Case
        from documents.models import Document
        from audit.models import AuditLog, AccessLog
        from evidence.models import Evidence, MovementRequest

        total_users = User.objects.count()
        users_by_role = {
            "ADMIN": User.objects.filter(role="ADMIN").count(),
            "OFFICER": User.objects.filter(role="OFFICER").count(),
            "INVESTIGATOR": User.objects.filter(role="INVESTIGATOR").count(),
            "LEGAL_OFFICER": User.objects.filter(role="LEGAL_OFFICER").count(),
            "JUDGE": User.objects.filter(role="JUDGE").count(),
        }
        active_users = User.objects.filter(is_active=True).count()
        total_cases = Case.objects.count()
        active_cases = Case.objects.filter(status='OPEN').count()
        total_docs = Document.objects.count()
        total_logs = AuditLog.objects.count()
        total_evidence = Evidence.objects.count()
        pending_movements = MovementRequest.objects.filter(status='PENDING').count()
        flagged = AccessLog.objects.filter(flagged=True).count()

        return Response({
            "total_users": total_users,
            "users_by_role": users_by_role,
            "active_users": active_users,
            "total_cases": total_cases,
            "active_cases": active_cases,
            "total_documents": total_docs,
            "total_audit_logs": total_logs,
            "total_evidence": total_evidence,
            "pending_movements": pending_movements,
            "flagged_anomalies": flagged,
            "integrity_score": 100.0 if flagged == 0 else max(0.0, 100.0 - flagged),
        })
