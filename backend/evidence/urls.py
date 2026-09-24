from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StorageFacilityViewSet, StorageLocationViewSet,
    EvidenceViewSet, MovementRequestViewSet
)

router = DefaultRouter()
router.register(r'storage/facilities', StorageFacilityViewSet, basename='storage-facility')
router.register(r'storage/locations', StorageLocationViewSet, basename='storage-location')
router.register(r'evidence', EvidenceViewSet, basename='evidence')
router.register(r'movement-requests', MovementRequestViewSet, basename='movement-request')

urlpatterns = [
    path('', include(router.urls)),
]
