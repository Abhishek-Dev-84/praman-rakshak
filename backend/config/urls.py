from pathlib import Path
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from web.views import health_check_view

FRONTEND_DIST = Path(settings.BASE_DIR) / 'frontend' / 'dist'

urlpatterns = [
    # Lightweight Healthcheck Endpoint for Railway and Cloud Orchestration
    path('health/', health_check_view, name='health_check'),

    # Django Built-in Admin
    path('django-admin/', admin.site.urls),

    # Backend REST APIs (Single Source of Truth for Flutter & API Clients)
    path('api/auth/', include('accounts.urls')),
    path('api/cases/', include('cases.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/', include('evidence.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/ml/', include('ml.urls')),
    path('api/webauthn/', include('audit.webauthn_urls')),

    # Static Assets
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIST / 'assets'}),
    re_path(r'^(?P<path>[^/]+\.(?:svg|png|jpg|jpeg|ico|json|txt))$', serve, {'document_root': FRONTEND_DIST}),

    # Media Files
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),

    # Web Application Routes (Django Templates Frontend)
    path('', include('web.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
