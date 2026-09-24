from django.urls import re_path
from .views import react_spa_view

urlpatterns = [
    # Catch-all route to serve the React Frontend SPA
    re_path(r'^.*$', react_spa_view, name='react_spa'),
]
