from django.urls import path
from .views import AuditLogListView, AccessAnomalyListView, VerifyChainView, AuditStatsView

urlpatterns = [
    path('logs/', AuditLogListView.as_view(), name='audit_log_list'),
    path('anomalies/', AccessAnomalyListView.as_view(), name='access_anomaly_list'),
    path('verify-chain/<uuid:pk>/', VerifyChainView.as_view(), name='verify_chain'),
    path('stats/', AuditStatsView.as_view(), name='audit_stats'),
]
