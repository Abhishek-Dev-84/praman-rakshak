from pathlib import Path
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

FRONTEND_DIST = Path(settings.BASE_DIR) / 'frontend' / 'dist'

urlpatterns = [
    # Django Built-in Admin (moved to avoid conflict with React /admin/* routes)
    path('django-admin/', admin.site.urls),

    # Backend REST APIs (Single Source of Truth for React & Flutter)
    path('api/auth/', include('accounts.urls')),
    path('api/cases/', include('cases.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/', include('evidence.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/ml/', include('ml.urls')),
    path('api/webauthn/', include('audit.webauthn_urls')),

    # React Static Assets
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIST / 'assets'}),
    re_path(r'^(?P<path>[^/]+\.(?:svg|png|jpg|jpeg|ico|json|txt))$', serve, {'document_root': FRONTEND_DIST}),

    # Media Files (MUST be placed before SPA catch-all to prevent index.html hijacking)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),

    # React Single Page Application (SPA Catch-All for all Web Routes)
    path('', include('web.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
