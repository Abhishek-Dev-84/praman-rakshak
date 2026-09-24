import json
from .llm_client import call_llm

def classify_document(text: str) -> dict:
    """
    Classifies a document's text into one of the designated categories:
    FIR, CHARGE_SHEET, WITNESS_STATEMENT, FORENSIC_REPORT, COURT_FILING, JUDGMENT, LEGAL_NOTICE, OTHER.
    Returns a dict with 'category' and 'confidence'.
    """
    if not text or len(text.strip()) < 10:
        return {"category": "OTHER", "confidence": 0.1}

    categories = ["FIR", "CHARGE_SHEET", "WITNESS_STATEMENT", "FORENSIC_REPORT", "COURT_FILING", "JUDGMENT", "LEGAL_NOTICE", "OTHER"]
    
    prompt = (
        f"Classify the following document text into exactly one of these categories: {', '.join(categories)}.\n"
        "Return your answer as a JSON object with keys:\n"
        "1. \"category\": (must be one of the strings above)\n"
        "2. \"confidence\": (a float between 0.0 and 1.0 representing classification confidence)\n\n"
        f"Document text:\n{text[:2000]}\n"
    )

    try:
        response_text = call_llm(prompt, json_mode=True)
        # Parse JSON
        result = json.loads(response_text)
        category = result.get("category", "OTHER").upper().strip()
        if category not in categories:
            category = "OTHER"
        confidence = float(result.get("confidence", 0.5))
        return {"category": category, "confidence": confidence}
    except Exception:
        # Fallback in case of parse errors
        return {"category": "OTHER", "confidence": 0.5}
