from django.urls import path
from .views import (
    RegisterView, LoginView, CustomTokenRefreshView, MeView,
    UserListView, UserDetailView, SystemStatsView, AssignableOfficersView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='auth_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<uuid:id>/', UserDetailView.as_view(), name='user_detail'),
    path('assignable-officers/', AssignableOfficersView.as_view(), name='assignable_officers'),
    path('stats/', SystemStatsView.as_view(), name='system_stats'),
]
