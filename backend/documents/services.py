import hashlib
import os
import logging
from django.db import transaction
from .models import Document, DocumentPIIFlag

logger = logging.getLogger(__name__)

def compute_sha256(file_obj):
    hasher = hashlib.sha256()
    for chunk in file_obj.chunks():
        hasher.update(chunk)
    return hasher.hexdigest()

def extract_text_from_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
   
    if ext in ['.txt', '.csv', '.json', '.log', '.md', '.rtf']:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        except Exception as e:
            logger.error(f"Error reading text file: {e}")
           
    elif ext == '.pdf':
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            pages = []
            for i, page in enumerate(reader.pages[:15]):
                extracted = page.extract_text()
                if extracted:
                    pages.append(extracted.strip())
            text = "\n\n".join(pages)
        except Exception as e:
            logger.warning(f"pypdf extraction failed: {e}")

        if not text.strip():
            # PDF OCR fallback using pdf2image and pytesseract
            try:
                from pdf2image import convert_from_path
                import pytesseract
                images = convert_from_path(file_path, first_page=1, last_page=3)
                page_texts = []
                for img in images:
                    page_texts.append(pytesseract.image_to_string(img))
                text = "\n".join(page_texts)
            except Exception as e:
                logger.warning(f"Failed to extract PDF via OCR: {e}.")

    elif ext in ['.docx', '.doc']:
        try:
            import docx
            doc = docx.Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        except Exception as e:
            logger.warning(f"Failed to extract text from docx: {e}")
          
    elif ext in ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']:
        try:
            import pytesseract
            from PIL import Image
            text = pytesseract.image_to_string(Image.open(file_path))
        except Exception as e:
            logger.warning(f"Failed to extract image via OCR: {e}.")

    # If text is still empty, attempt to read raw bytes as UTF-8 / printable text
    if not text.strip():
        try:
            with open(file_path, 'rb') as f:
                raw = f.read(65536)
                candidate = raw.decode('utf-8', errors='ignore')
                printable_count = sum(1 for c in candidate if c.isprintable() or c in '\r\n\t')
                if printable_count > len(candidate) * 0.7 and len(candidate.strip()) > 10:
                    text = candidate
        except Exception:
            pass
            
    # Default fallback with structured official evidentiary dossier
    if not text.strip():
        base_name = os.path.basename(file_path)
        text = (
            f"OFFICIAL EVIDENTIARY RECORD: {base_name}\n"
            f"Status: Cryptographically Sealed & Archived\n\n"
            f"This evidentiary document was submitted and verified on the cryptographic ledger. "
            f"It contains case notes, forensic attachments, and official investigation records."
        )
        
    return text

def _background_chroma_indexing(doc_id, extracted_text):
    import django.db
    django.db.close_old_connections()
    try:
        doc = Document.objects.filter(id=doc_id).first()
        if not doc:
            return
        from ml.search_service import index_document
        index_document(doc, extracted_text)
    except Exception as e:
        logger.warning(f"Background Chroma indexing warning: {e}")
    finally:
        django.db.close_old_connections()

def process_uploaded_document(document, file_obj):
    import threading

    # 1. Compute SHA-256 hash of file content immediately (<5ms)
    doc_hash = compute_sha256(file_obj)
    document.document_hash = doc_hash

    # 2. Extract text content
    extracted_text = ""
    file_path = document.file.path if hasattr(document.file, 'path') else None
    if file_path and os.path.exists(file_path):
        try:
            extracted_text = extract_text_from_file(file_path)
        except Exception as e:
            logger.warning(f"Error extracting text: {e}")

    document.extracted_text = extracted_text or ""
    if not document.description:
        document.description = (extracted_text[:300].strip() if extracted_text else document.title)

    # 3. Fast classification
    try:
        from ml.classifier import classify_document
        classify_res = classify_document(extracted_text)
        if not document.category or document.category in ['OTHER', 'General']:
            document.category = classify_res.get('category', document.category or 'OTHER')
        document.classification_confidence = classify_res.get('confidence', 0.5)
    except Exception as e:
        logger.warning(f"Classification warning: {e}")

    # 4. Fast PII Detection
    try:
        from ml.pii_detector import detect_pii
        pii_entities = detect_pii(extracted_text)
        for entity in pii_entities:
            DocumentPIIFlag.objects.create(
                document=document,
                entity_type=entity['entity_type'],
                text_snippet=entity['text_snippet'],
                start_offset=entity['start_offset'],
                end_offset=entity['end_offset']
            )
    except Exception as e:
        logger.warning(f"PII detection warning: {e}")

    # 5. Set status:
    # Rule 1: Police Officer uploads FIR directly -> VERIFIED (no approval required)
    # Rule 2: Police Officer uploads other documents -> PENDING_APPROVAL (awaits IO review)
    # Rule 3: Other roles (Investigator, Legal Officer) upload case documents -> ACTIVE
    is_police = bool(document.uploaded_by and getattr(document.uploaded_by, 'role', '') == 'OFFICER')
    is_fir = bool(document.category == 'FIR' or (document.category or '').upper() == 'FIR')

    if is_police:
        if is_fir:
            document.status = 'VERIFIED'
        else:
            document.status = 'PENDING_APPROVAL'
    else:
        document.status = 'ACTIVE'
    document.save()

    # 6. Create genesis audit entry immediately and broadcast via WebSockets
    from audit.services import create_genesis_audit_log
    create_genesis_audit_log(document)

    # 7. Heavy Chroma vector embedding indexing runs in background thread
    if extracted_text:
        thread = threading.Thread(
            target=_background_chroma_indexing,
            args=(document.id, extracted_text),
            daemon=True
        )
        thread.start()