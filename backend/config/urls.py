from pathlib import Path
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from web.views import health_check_view, react_spa_view

FRONTEND_DIST = Path(settings.BASE_DIR) / 'frontend' / 'dist'

urlpatterns = [
    # Lightweight Healthcheck Endpoint for Railway and Cloud Orchestration
    path('health/', health_check_view, name='health_check'),

    # Django Built-in Admin
    path('django-admin/', admin.site.urls),

    # Backend REST APIs (Single Source of Truth for React & Flutter Clients)
    path('api/auth/', include('accounts.urls')),
    path('api/cases/', include('cases.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/', include('evidence.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/ml/', include('ml.urls')),
    path('api/webauthn/', include('audit.webauthn_urls')),

    # Static Assets for React Frontend (built by Vite into frontend/dist)
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIST / 'assets'}),
    re_path(r'^(?P<path>[^/]+\.(?:svg|png|jpg|jpeg|ico|json|txt|js|css|woff|woff2|ttf))$', serve, {'document_root': FRONTEND_DIST}),

    # Media Files
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),

    # Optional Django Templates fallback accessible under /legacy/
    path('legacy/', include('web.urls')),

    # React Single Page Application (SPA Catch-All for all Web Routes: /, /login/*, /admin/*, /police/*, etc.)
    re_path(r'^(?!api/|media/|health/|django-admin/|legacy/|assets/).*$', react_spa_view, name='react_spa_catchall'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
