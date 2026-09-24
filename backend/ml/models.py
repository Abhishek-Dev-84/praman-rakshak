import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class SearchQueryLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_logs')
    query_text = models.TextField()
    result_document_ids = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Search by {self.user.username} at {self.timestamp}"
