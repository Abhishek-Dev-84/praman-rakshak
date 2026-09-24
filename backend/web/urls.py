from django.urls import path, re_path
from . import views

urlpatterns = [
    # Core Web Frontend Routes (Django Templates)
    path('', views.web_home, name='web_home'),
    path('login/', views.web_login, name='web_login'),
    path('logout/', views.web_logout, name='web_logout'),
    path('dashboard/', views.web_dashboard, name='web_dashboard'),
    path('cases/<uuid:case_id>/', views.web_case_detail, name='web_case_detail'),
    path('cases/<uuid:case_id>/summary/', views.web_case_summary, name='web_case_summary'),
    path('documents/<uuid:doc_id>/', views.web_document_detail, name='web_document_detail'),
    path('documents/<uuid:doc_id>/audit/', views.web_audit_trail, name='web_audit_trail'),
    path('search/', views.web_search, name='web_search'),

    # Optional: React SPA fallback (accessible under /app/)
    path('app/', views.react_spa_view, name='react_spa'),
    re_path(r'^app/.*$', views.react_spa_view, name='react_spa_catchall'),
]
