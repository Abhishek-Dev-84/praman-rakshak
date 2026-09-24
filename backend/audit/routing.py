from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/audit/case/(?P<case_id>[0-9a-fA-F-]+)/$', consumers.CaseAuditConsumer.as_asgi()),
    re_path(r'^ws/case/(?P<case_id>[0-9a-fA-F-]+)/$', consumers.CaseAuditConsumer.as_asgi()),
    re_path(r'^ws/admin/case/(?P<case_id>[0-9a-fA-F-]+)/$', consumers.CaseAuditConsumer.as_asgi()),
    re_path(r'^ws/audit/alerts/$', consumers.AlertsConsumer.as_asgi()),
    re_path(r'^ws/audit/logs/$', consumers.GlobalAuditConsumer.as_asgi()),
    re_path(r'^ws/admin/overview/$', consumers.AdminOverviewConsumer.as_asgi()),
]
