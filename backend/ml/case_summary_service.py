import json
from django.utils import timezone
from cases.models import CaseSummary, Case
from documents.models import Document
from .llm_client import call_llm

def summarize_document(doc_title: str, doc_category: str, doc_text: str) -> str:
    """
    Map step: Summarizes a single document.
    """
    prompt = (
        f"You are a legal assistant summarizing a case file document.\n"
        f"Document Title: {doc_title}\n"
        f"Document Category/Type: {doc_category}\n"
        "Instructions: Summarize this document in 3-4 factual sentences covering key people, dates, and locations. "
        "Do not speculate or infer beyond what is explicitly stated in the text.\n\n"
        f"Document Text:\n{doc_text[:3000]}\n\n"
        "Summary:"
    )
    return call_llm(prompt)

def get_or_generate_case_summary(case: Case) -> dict:
    """
    Retrieves the cached case summary, or runs a Map-Reduce pipeline to generate a new one.
    """
    active_docs = Document.objects.filter(case=case).exclude(status='DELETED').order_by('created_at')
    doc_count = active_docs.count()
    
    # 1. Check Cache
    try:
        cached_summary = CaseSummary.objects.get(case=case)
        if cached_summary.source_document_count == doc_count:
            return cached_summary.summary_json
    except CaseSummary.DoesNotExist:
        cached_summary = None

    # If no documents, return empty summary structure
    if doc_count == 0:
        empty_summary = {
            "case_overview": "No documents are currently uploaded to this case.",
            "key_entities": { "people": [], "locations": [], "dates": [] },
            "timeline": [],
            "document_breakdown": [],
            "open_flags": [],
            "generated_at": timezone.now().isoformat()
        }
        return empty_summary

    # 2. Map Step: Summarize each document
    doc_summaries = []
    doc_breakdown = []
    
    for doc in active_docs:
        # Extract text
        from documents.services import extract_text_from_file
        try:
            doc_text = extract_text_from_file(doc.file.path)
        except Exception:
            doc_text = f"Document titled {doc.title} of type {doc.category}."
            
        doc_summary = summarize_document(doc.title, doc.category or 'Document', doc_text)
        doc_summaries.append(f"Document: {doc.title} (ID: {doc.id}, Type: {doc.category})\nSummary: {doc_summary}")
        
        doc_breakdown.append({
            "document_id": str(doc.id),
            "title": doc.title,
            "type": doc.category or 'OTHER',
            "one_line_summary": doc_summary[:100] + ("..." if len(doc_summary) > 100 else "")
        })

    # 3. Reduce Step: Synthesize summaries
    context_str = "\n\n".join(doc_summaries)
    prompt = (
        "You are an expert case analyst working for the Ministry of Home Affairs.\n"
        "Synthesize the following summaries of all documents in a case into a single structured overview.\n"
        "You must return ONLY a JSON object matching this schema:\n"
        "{\n"
        "  \"case_overview\": \"2-3 sentence plain-language summary of what this case is about\",\n"
        "  \"key_entities\": {\n"
        "    \"people\": [\"List of unique names of key people mentioned across documents\"],\n"
        "    \"locations\": [\"List of key cities, sites, or locations\"],\n"
        "    \"dates\": [\"List of key dates (YYYY-MM-DD or descriptive) mentioned in the timeline\"]\n"
        "  },\n"
        "  \"timeline\": [\n"
        "    { \"date\": \"date string\", \"event\": \"description of what occurred\", \"source_document_id\": \"UUID of the source document\" }\n"
        "  ],\n"
        "  \"open_flags\": [\"List of unresolved details, missing documents, or warnings highlighted by the records\"]\n"
        "}\n\n"
        "Strict rules:\n"
        "- Do not speculate or make assumptions. Rely only on the provided context.\n"
        "- Ensure the source_document_id in the timeline corresponds to the actual document UUID provided in the document summaries.\n"
        f"Document Summaries:\n{context_str}\n\n"
        "JSON Response:"
    )

    try:
        response_text = call_llm(prompt, json_mode=True)
        summary_json = json.loads(response_text)
    except Exception as e:
        # Resilient fallback if LLM response fails to parse
        summary_json = {
            "case_overview": "Unable to automatically synthesize case summaries. Individual document summaries are available.",
            "key_entities": { "people": [], "locations": [], "dates": [] },
            "timeline": [],
            "open_flags": ["Failed to parse AI-generated synthesis."],
        }
        
    summary_json["document_breakdown"] = doc_breakdown
    summary_json["generated_at"] = timezone.now().isoformat()

    # 4. Cache/Update Summary
    if cached_summary:
        cached_summary.summary_json = summary_json
        cached_summary.source_document_count = doc_count
        cached_summary.save()
    else:
        CaseSummary.objects.create(
            case=case,
            summary_json=summary_json,
            source_document_count=doc_count
        )

    return summary_json
