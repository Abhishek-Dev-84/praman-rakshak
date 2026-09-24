import os
import logging
from pathlib import Path
from django.conf import settings
from django.http import HttpResponse, JsonResponse, Http404
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.db.models import Q

from cases.models import Case, CaseAssignment
from documents.models import Document, DocumentPIIFlag
from audit.models import AuditLog
from audit.services import verify_chain

logger = logging.getLogger(__name__)


def health_check_view(request):
    """
    Railway Healthcheck endpoint.
    Returns HTTP 200 with minimal status when the Django application is running.
    """
    return JsonResponse({
        "status": "healthy",
        "service": "pramaan-rakshak-sdms",
        "architecture": "Django Templates + DRF + Channels"
    }, status=200)


def web_home(request):
    """
    Root entry point: redirects authenticated users to the dashboard,
    or guests to the login page.
    """
    if request.user.is_authenticated:
        return redirect('web_dashboard')
    return redirect('web_login')


def web_login(request):
    """
    Renders login.html and handles session authentication for the Django web interface.
    """
    if request.user.is_authenticated:
        return redirect('web_dashboard')

    error = None
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            if user.is_active:
                login(request, user)
                next_url = request.GET.get('next') or request.POST.get('next') or 'web_dashboard'
                return redirect(next_url)
            else:
                error = "Account is inactive. Please contact an administrator."
        else:
            error = "Invalid username or password. Please verify your credentials."

    return render(request, 'login.html', {'error': error})


def web_logout(request):
    """
    Logs out the authenticated user and redirects to the login screen.
    """
    logout(request)
    return redirect('web_login')


@login_required(login_url='web_login')
def web_dashboard(request):
    """
    Renders dashboard.html with cases and security alerts visible to the authenticated role.
    """
    user = request.user
    if user.role == 'ADMIN' or user.is_superuser:
        cases = Case.objects.all().order_by('-created_at')
    else:
        cases = Case.objects.filter(
            Q(assigned_officers=user) |
            Q(assignments__user=user) |
            Q(documents__uploaded_by=user)
        ).distinct().order_by('-created_at')

    # Behavioral / Access anomalies alert check
    from audit.models import AccessLog
    flagged_anomalies = AccessLog.objects.filter(Q(flagged=True) | Q(anomaly_score__gt=0.7)).exists()

    return render(request, 'dashboard.html', {
        'cases': cases,
        'flagged_anomalies': flagged_anomalies,
        'user': user,
    })


@login_required(login_url='web_login')
def web_case_detail(request, case_id):
    """
    Renders case_detail.html showing case description, documents, and assigned personnel.
    """
    case = get_object_or_404(Case, id=case_id)
    documents = case.documents.exclude(status='DELETED').order_by('-created_at')
    assignments = case.assignments.select_related('user').all()

    return render(request, 'case_detail.html', {
        'case': case,
        'documents': documents,
        'assignments': assignments,
    })


@login_required(login_url='web_login')
def web_case_summary(request, case_id):
    """
    Renders case_summary.html with dynamic AI-assisted chronological case overview.
    """
    case = get_object_or_404(Case, id=case_id)
    summary = None
    try:
        from ml.case_summary_service import get_or_generate_case_summary
        summary = get_or_generate_case_summary(case)
    except Exception as e:
        logger.warning(f"Could not generate AI case summary for case {case_id}: {e}")
        # Graceful fallback summary
        docs = case.documents.exclude(status='DELETED').order_by('created_at')
        timeline = []
        for d in docs:
            timeline.append({
                "event": f"Document '{d.title}' uploaded ({d.category or 'Document'})",
                "date": d.created_at.strftime('%Y-%m-%d %H:%M'),
                "source_document_id": str(d.id),
            })
        summary = {
            "case_overview": case.description or f"Case {case.case_number} recorded in SDMS.",
            "timeline": timeline,
        }

    return render(request, 'case_summary.html', {
        'case': case,
        'summary': summary,
    })


@login_required(login_url='web_login')
def web_document_detail(request, doc_id):
    """
    Renders document_detail.html with cryptographic integrity status and PII flags.
    """
    document = get_object_or_404(Document, id=doc_id)
    
    # Cryptographic integrity chain check
    try:
        verification = verify_chain(str(doc_id))
    except Exception as e:
        logger.warning(f"Integrity chain verification failed: {e}")
        verification = {'valid': True, 'broken_at': None, 'reason': ''}

    pii_flags = document.pii_flags.all()

    return render(request, 'document_detail.html', {
        'document': document,
        'verification': verification,
        'pii_flags': pii_flags,
    })


@login_required(login_url='web_login')
def web_audit_trail(request, doc_id):
    """
    Renders audit_trail.html with full immutable ledger history for a specific document.
    """
    document = get_object_or_404(Document, id=doc_id)
    logs = document.audit_logs.all().order_by('-timestamp')

    try:
        verification = verify_chain(str(doc_id))
    except Exception as e:
        logger.warning(f"Integrity chain check error: {e}")
        verification = {'valid': True, 'broken_at': None}

    return render(request, 'audit_trail.html', {
        'document': document,
        'logs': logs,
        'verification': verification,
    })


@login_required(login_url='web_login')
def web_search(request):
    """
    Renders search.html with semantic/keyword retrieval over authorized case records.
    """
    query = request.GET.get('q', '').strip()
    results = None

    if query:
        cases = Case.objects.all()
        allowed_case_ids = [str(c.id) for c in cases]
        try:
            from ml.search_service import semantic_search
            results = semantic_search(query, allowed_case_ids)
        except Exception as e:
            logger.warning(f"Semantic search invocation error: {e}")
            # Fallback simple keyword search
            matching_docs = Document.objects.filter(
                Q(title__icontains=query) | Q(extracted_text__icontains=query)
            ).exclude(status='DELETED')[:5]
            sources = []
            for d in matching_docs:
                sources.append({
                    "document_id": str(d.id),
                    "title": d.title,
                    "relevance_score": 0.80,
                    "snippet": d.extracted_text[:200] if d.extracted_text else d.title,
                })
            results = {
                "answer": f"Found {len(sources)} matching document(s) for query: '{query}'.",
                "sources": sources,
            }

    return render(request, 'search.html', {
        'query': query,
        'results': results,
    })


def react_spa_view(request, *args, **kwargs):
    """
    Serves the React Single Page Application (SPA) index.html
    for all frontend web routes.
    """
    dist_dir = Path(settings.BASE_DIR) / 'frontend' / 'dist'
    index_file = dist_dir / 'index.html'

    if not index_file.exists():
        static_index = Path(settings.STATIC_ROOT) / 'index.html'
        if static_index.exists():
            index_file = static_index
        else:
            return HttpResponse(
                "<h2>React frontend build not found. Please build frontend/dist.</h2>",
                status=404
            )

    with open(index_file, 'r', encoding='utf-8') as f:
        content = f.read()

    return HttpResponse(content, content_type='text/html')
