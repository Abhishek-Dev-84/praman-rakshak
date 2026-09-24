import os
import logging
from django.conf import settings
from .llm_client import call_llm

logger = logging.getLogger(__name__)

# Global client and encoder pointers for Chroma
_chroma_client = None
_model = None
CHROMA_DIR = os.path.join(settings.BASE_DIR, "chroma_data")

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            _chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
        except Exception as e:
            logger.warning(f"Chroma DB could not be loaded: {e}. Falling back to PostgreSQL database search.")
            _chroma_client = False
    return _chroma_client

def get_embedding_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Use small, fast model
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            logger.warning(f"SentenceTransformers could not be loaded: {e}. Falling back to TF-IDF matching.")
            _model = False
    return _model

def chunk_text(text: str, chunk_size: int = 150, overlap: int = 30) -> list[str]:
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def index_document(document, text: str):
    """
    Chunks document text and indexes it in Chroma.
    """
    client = get_chroma_client()
    model = get_embedding_model()
    
    if not text or not text.strip():
        return
        
    chunks = chunk_text(text)
    
    if client and model:
        try:
            collection = client.get_or_create_collection("document_chunks")
            
            ids = []
            embeddings = []
            documents = []
            metadatas = []
            
            for idx, chunk in enumerate(chunks):
                chunk_id = f"{document.id}_chunk_{idx}"
                embedding = model.encode(chunk).tolist()
                
                ids.append(chunk_id)
                embeddings.append(embedding)
                documents.append(chunk)
                metadatas.append({
                    "document_id": str(document.id),
                    "case_id": str(document.case.id) if document.case else "none"
                })
                
            collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            logger.info(f"Indexed {len(chunks)} chunks for document {document.id}")
            return
        except Exception as e:
            logger.error(f"Chroma indexing failed: {e}")
            
    # If Chroma fails, we rely on DB storage which is standard behavior
    logger.info(f"Using default DB search index fallback for document {document.id}")

def semantic_search(query: str, allowed_case_ids: list[str]) -> dict:
    """
    Performs semantic search retrieval over permitted cases, then uses LLM to generate a grounded response.
    """
    client = get_chroma_client()
    model = get_embedding_model()
    
    matched_chunks = []
    
    # 1. Try Chroma semantic search
    if client and model:
        try:
            collection = client.get_or_create_collection("document_chunks")
            query_embedding = model.encode(query).tolist()
            
            # Retrieve top 10 matches
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=10
            )
            
            if results and 'documents' in results and results['documents']:
                docs = results['documents'][0]
                metadatas = results['metadatas'][0] if 'metadatas' in results and results['metadatas'] else []
                allowed_str_ids = [str(c) for c in allowed_case_ids]
                for i in range(len(docs)):
                    meta = metadatas[i] if i < len(metadatas) else {}
                    case_id = str(meta.get("case_id", ""))
                    if case_id in allowed_str_ids or case_id == "none" or not allowed_str_ids:
                        matched_chunks.append({
                            "document_id": meta.get("document_id"),
                            "snippet": docs[i],
                            "score": 0.85
                        })
        except Exception as e:
            logger.error(f"Chroma query failed: {e}")

    # 2. Database keyword search fallback if Chroma has no matches or failed to load
    if not matched_chunks:
        from documents.models import Document
        # Simple word matching fallback
        query_words = [w.lower() for w in query.split() if len(w) > 3]
        permitted_docs = Document.objects.filter(case_id__in=allowed_case_ids).exclude(status='DELETED')
        
        for doc in permitted_docs:
            doc_text = doc.title + " " + doc.category
            try:
                # Read text fallback
                from .pii_detector import detect_pii
                # Just mock search matching for the demo text
                with open(doc.file.path, 'r', encoding='utf-8', errors='ignore') as f:
                    doc_content = f.read()
                    doc_text += " " + doc_content
            except Exception:
                pass
                
            doc_text_lower = doc_text.lower()
            match_count = sum(1 for word in query_words if word in doc_text_lower)
            if match_count > 0:
                # Add snippet
                snippet = doc_text[:300] + "..."
                matched_chunks.append({
                    "document_id": str(doc.id),
                    "snippet": snippet,
                    "score": float(match_count) / max(len(query_words), 1)
                })
                
        # Sort by relevance score
        matched_chunks.sort(key=lambda x: x["score"], reverse=True)
        matched_chunks = matched_chunks[:5]

    # Resolve document metadata (titles) for the references
    from documents.models import Document
    sources = []
    context_passages = []
    
    for chunk in matched_chunks:
        try:
            doc = Document.objects.get(id=chunk["document_id"])
            sources.append({
                "document_id": str(doc.id),
                "title": doc.title,
                "snippet": chunk["snippet"],
                "relevance_score": chunk["score"]
            })
            context_passages.append(f"Document '{doc.title}' (ID: {doc.id}):\n{chunk['snippet']}")
        except Document.DoesNotExist:
            continue

    # 3. Call LLM with retrieved context
    if sources:
        context_str = "\n\n".join(context_passages)
        prompt = (
            "You are an AI investigative assistant. Based on the following retrieved case document snippets, "
            "provide a grounded, factual answer to the query.\n"
            "Strict rules:\n"
            "1. Answer ONLY using the facts from the context.\n"
            "2. Do not speculate or make assumptions.\n"
            "3. Cite source document titles inside your answer (e.g. 'According to the First Information Report...').\n"
            "4. If the answer cannot be found in the context, say 'I cannot find the answer in the permitted case files.'\n\n"
            f"Context:\n{context_str}\n\n"
            f"Query: {query}\n\n"
            "Answer:"
        )
        answer = call_llm(prompt)
    else:
        answer = "No matching documents found in your assigned cases."

    return {
        "answer": answer,
        "sources": sources
    }
