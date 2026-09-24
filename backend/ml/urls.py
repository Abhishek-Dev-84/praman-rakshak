from django.urls import path
from .views import SearchView, AnomalyListView

urlpatterns = [
    path('search/', SearchView.as_view(), name='ml_search'),
    path('anomalies/', AnomalyListView.as_view(), name='ml_anomalies'),
]
