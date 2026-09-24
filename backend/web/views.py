import os
from pathlib import Path
from django.conf import settings
from django.http import HttpResponse, Http404

def react_spa_view(request, *args, **kwargs):
    """
    Serves the React Single Page Application (SPA) index.html.
    This replaces all old server-rendered templates and makes the React frontend
    the authoritative web interface for all roles (Admin, Police, Investigator, Legal, Judge).
    """
    dist_dir = Path(settings.BASE_DIR) / 'frontend' / 'dist'
    index_file = dist_dir / 'index.html'

    if not index_file.exists():
        return HttpResponse(
            """
            <h2>React build not found.</h2>
            <p>Please run <code>npm run build</code> inside <code>backend/frontend/</code>.</p>
            """,
            status=500
        )

    with open(index_file, 'r', encoding='utf-8') as f:
        content = f.read()

    return HttpResponse(content, content_type='text/html')
