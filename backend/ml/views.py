from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SearchQueryLog
from .search_service import semantic_search
from audit.models import AccessLog
from audit.serializers import AccessLogSerializer
from cases.models import CaseAssignment, Case
from accounts.permissions import IsAdminUserRole

class SearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = request.data.get('query')
        if not query:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "query parameter is required."}},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user = request.user
        
        # Enforce RBAC case-level access restriction
        if user.role == 'ADMIN':
            allowed_case_ids = list(Case.objects.all().values_list('id', flat=True))
        else:
            allowed_case_ids = list(CaseAssignment.objects.filter(user=user).values_list('case_id', flat=True))
            
        allowed_case_ids = [str(cid) for cid in allowed_case_ids]
        
        # Run semantic search service
        search_res = semantic_search(query, allowed_case_ids)
        
        # Log search query
        result_doc_ids = [src["document_id"] for src in search_res.get("sources", [])]
        SearchQueryLog.objects.create(
            user=user,
            query_text=query,
            result_document_ids=result_doc_ids
        )
        
        return Response(search_res, status=status.HTTP_200_OK)

class AnomalyListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        flagged_events = AccessLog.objects.filter(flagged=True).order_by('-timestamp')
        serializer = AccessLogSerializer(flagged_events, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
