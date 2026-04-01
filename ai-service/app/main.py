import re
import os
from typing import List, Optional

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

MODEL_NAME = os.getenv("EMBED_MODEL_NAME", "all-MiniLM-L6-v2")
AI_EMBED_MODE = os.getenv("AI_EMBED_MODE", "lite").strip().lower()  # lite | semantic
ENABLE_HAYSTACK = os.getenv("ENABLE_HAYSTACK", "false").strip().lower() == "true"

app = FastAPI(title="Peer Connect Semantic AI Service", version="1.0.0")

model = None
MODEL_LOAD_ERROR = ""

HAYSTACK_AVAILABLE = False
HAYSTACK_IMPORT_ERROR = ""
_haystack_bootstrapped = False
Document = None
InMemoryDocumentStore = None
SentenceTransformersDocumentEmbedder = None
SentenceTransformersTextEmbedder = None
InMemoryEmbeddingRetriever = None
_doc_embedder = None
_text_embedder = None


class SemanticDocument(BaseModel):
    id: str
    text: str


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    documents: List[SemanticDocument]


class PeerCandidate(BaseModel):
    id: str
    text: str


class PeerMatchRequest(BaseModel):
    learning_skills: List[str]
    peers: List[PeerCandidate]


class RankedItem(BaseModel):
    id: str
    score: float


class RankedResponse(BaseModel):
    ranked: List[RankedItem]
    model: str


class QuizGenRequest(BaseModel):
    title: str = "AI Quiz"
    content: str = Field(..., min_length=1)
    num_questions: int = Field(default=5, ge=1, le=10)


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    explanation: str


class QuizGenResponse(BaseModel):
    title: str
    questions: List[QuizQuestion]
    model: str


class RagDocument(BaseModel):
    id: str
    title: Optional[str] = None
    text: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class RagRequest(BaseModel):
    question: str = Field(..., min_length=1)
    documents: List[RagDocument]
    top_k: int = Field(default=4, ge=1, le=10)


class RagContext(BaseModel):
    id: str
    title: Optional[str] = None
    snippet: str
    score: float


class RagResponse(BaseModel):
    answer: str
    contexts: List[RagContext]
    model: str
    provider: str


def _cosine_scores(query_vector: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    query_norm = np.linalg.norm(query_vector)
    matrix_norm = np.linalg.norm(matrix, axis=1)
    denominator = (query_norm * matrix_norm) + 1e-10
    return (matrix @ query_vector) / denominator


def _tokenize(value: str) -> List[str]:
    return re.findall(r"[a-z0-9_]+", (value or "").lower())


def _lexical_rank(query_text: str, items: List[SemanticDocument]) -> List[RankedItem]:
    if not items:
        return []

    query_tokens = set(_tokenize(query_text))
    if not query_tokens:
        return [RankedItem(id=item.id, score=0.0) for item in items]

    ranked = []
    for item in items:
        doc_tokens = set(_tokenize(item.text))
        if not doc_tokens:
            score = 0.0
        else:
            overlap = len(query_tokens.intersection(doc_tokens))
            coverage = overlap / max(1, len(query_tokens))
            density = overlap / max(1, len(doc_tokens))
            score = float((coverage * 0.8) + (density * 0.2))

        ranked.append(RankedItem(id=item.id, score=score))

    ranked.sort(key=lambda row: row.score, reverse=True)
    return ranked


def _get_model():
    global model, MODEL_LOAD_ERROR

    if AI_EMBED_MODE != "semantic":
        return None

    if model is not None:
        return model

    if MODEL_LOAD_ERROR:
        return None

    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(MODEL_NAME)
        return model
    except Exception as exc:  # pragma: no cover - memory/runtime guard
        MODEL_LOAD_ERROR = str(exc)
        return None


def _bootstrap_haystack():
    global _haystack_bootstrapped
    global HAYSTACK_AVAILABLE, HAYSTACK_IMPORT_ERROR
    global Document, InMemoryDocumentStore
    global SentenceTransformersDocumentEmbedder, SentenceTransformersTextEmbedder, InMemoryEmbeddingRetriever

    if _haystack_bootstrapped:
        return HAYSTACK_AVAILABLE

    _haystack_bootstrapped = True

    if not ENABLE_HAYSTACK:
        HAYSTACK_AVAILABLE = False
        HAYSTACK_IMPORT_ERROR = "disabled (set ENABLE_HAYSTACK=true)"
        return False

    try:
        from haystack import Document as _Document
        from haystack.document_stores.in_memory import InMemoryDocumentStore as _InMemoryDocumentStore
        from haystack.components.embedders import (
            SentenceTransformersDocumentEmbedder as _SentenceTransformersDocumentEmbedder,
            SentenceTransformersTextEmbedder as _SentenceTransformersTextEmbedder,
        )
        from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever as _InMemoryEmbeddingRetriever

        Document = _Document
        InMemoryDocumentStore = _InMemoryDocumentStore
        SentenceTransformersDocumentEmbedder = _SentenceTransformersDocumentEmbedder
        SentenceTransformersTextEmbedder = _SentenceTransformersTextEmbedder
        InMemoryEmbeddingRetriever = _InMemoryEmbeddingRetriever
        HAYSTACK_AVAILABLE = True
        HAYSTACK_IMPORT_ERROR = ""
        return True
    except Exception as exc:  # pragma: no cover - optional dependency guard
        HAYSTACK_AVAILABLE = False
        HAYSTACK_IMPORT_ERROR = str(exc)
        return False


def _rank(query_text: str, items: List[SemanticDocument]) -> List[RankedItem]:
    if not items:
        return []

    active_model = _get_model()
    if active_model is None:
        return _lexical_rank(query_text, items)

    query_embedding = active_model.encode(query_text, normalize_embeddings=False)
    doc_embeddings = active_model.encode([item.text for item in items], normalize_embeddings=False)

    query_vec = np.array(query_embedding)
    doc_matrix = np.array(doc_embeddings)
    scores = _cosine_scores(query_vec, doc_matrix)

    ranking = sorted(
        [
            RankedItem(id=items[idx].id, score=float(scores[idx]))
            for idx in range(len(items))
        ],
        key=lambda row: row.score,
        reverse=True,
    )
    return ranking


def _build_quiz_questions(content: str, num_questions: int) -> List[QuizQuestion]:
    cleaned = re.sub(r"\s+", " ", content).strip()
    sentences = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", cleaned) if segment.strip()]
    if not sentences:
        sentences = [cleaned]

    keyword_pool = []
    for sentence in sentences:
        words = [word for word in re.findall(r"[A-Za-z][A-Za-z0-9_-]{3,}", sentence)]
        keyword_pool.extend(words)

    if not keyword_pool:
        keyword_pool = ["learning", "practice", "concept", "outcome"]

    questions: List[QuizQuestion] = []
    for idx in range(min(num_questions, len(sentences))):
        sentence = sentences[idx]
        key = keyword_pool[idx % len(keyword_pool)]
        prompt = f"What best matches this statement: \"{sentence[:140]}\"?"
        correct = sentence[:80] + ("..." if len(sentence) > 80 else "")
        distractors = [
            f"Focuses on {keyword_pool[(idx + 1) % len(keyword_pool)]} only",
            f"Rejects {key} entirely",
            "States an unrelated technical detail",
        ]
        options = [correct, *distractors]
        questions.append(
            QuizQuestion(
                question=prompt,
                options=options,
                correct_answer=0,
                explanation="The first option paraphrases the original statement most accurately.",
            )
        )

    while len(questions) < num_questions:
        n = len(questions) + 1
        questions.append(
            QuizQuestion(
                question=f"Which option is most aligned with the content focus? (Q{n})",
                options=[
                    "A direct summary of key ideas",
                    "An unrelated random statement",
                    "A contradictory claim",
                    "A generic filler phrase",
                ],
                correct_answer=0,
                explanation="The first option reflects the content-driven objective.",
            )
        )

    return questions[:num_questions]


def _get_haystack_embedders():
    global _doc_embedder, _text_embedder
    if not _bootstrap_haystack():
        return None, None

    if _doc_embedder is None:
        _doc_embedder = SentenceTransformersDocumentEmbedder(model=MODEL_NAME)
        _doc_embedder.warm_up()
    if _text_embedder is None:
        _text_embedder = SentenceTransformersTextEmbedder(model=MODEL_NAME)
        _text_embedder.warm_up()
    return _doc_embedder, _text_embedder


def _rank_with_haystack(query_text: str, docs: List[RagDocument], top_k: int) -> List[RagContext]:
    doc_embedder, text_embedder = _get_haystack_embedders()
    if not doc_embedder or not text_embedder:
        return []

    document_store = InMemoryDocumentStore(embedding_similarity_function="cosine")

    hay_docs = [
        Document(
            id=doc.id,
            content=doc.text,
            meta={
                "title": doc.title or "",
                "category": doc.category or "",
                "tags": doc.tags or [],
            },
        )
        for doc in docs
    ]

    embedded_docs = doc_embedder.run(documents=hay_docs)["documents"]
    document_store.write_documents(embedded_docs)

    query_embedding = text_embedder.run(query=query_text)["embedding"]
    retriever = InMemoryEmbeddingRetriever(document_store=document_store, top_k=top_k)
    retrieved_docs = retriever.run(query_embedding=query_embedding)["documents"]

    contexts: List[RagContext] = []
    for doc in retrieved_docs:
        snippet = (doc.content or "")[:240]
        contexts.append(
            RagContext(
                id=str(doc.id),
                title=(doc.meta or {}).get("title") or None,
                snippet=snippet,
                score=float(getattr(doc, "score", 0.0) or 0.0),
            )
        )
    return contexts


def _rank_with_fallback(query_text: str, docs: List[RagDocument], top_k: int) -> List[RagContext]:
    semantic_docs = [SemanticDocument(id=doc.id, text=doc.text) for doc in docs]
    ranked = _rank(query_text, semantic_docs)[:top_k]
    by_id = {doc.id: doc for doc in docs}
    contexts: List[RagContext] = []
    for row in ranked:
        original = by_id.get(row.id)
        if not original:
            continue
        contexts.append(
            RagContext(
                id=row.id,
                title=original.title,
                snippet=original.text[:240],
                score=row.score,
            )
        )
    return contexts


@app.get("/health")
def health():
    _bootstrap_haystack()
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "embed_mode": AI_EMBED_MODE,
        "model_loaded": model is not None,
        "model_error": MODEL_LOAD_ERROR or None,
        "haystack_available": HAYSTACK_AVAILABLE,
        "haystack_error": HAYSTACK_IMPORT_ERROR or None,
    }


@app.post("/semantic/search", response_model=RankedResponse)
def semantic_search(payload: SearchRequest):
    ranked = _rank(payload.query, payload.documents)
    return RankedResponse(ranked=ranked, model=MODEL_NAME)


@app.post("/semantic-search", response_model=RankedResponse)
def semantic_search_alias(payload: SearchRequest):
    ranked = _rank(payload.query, payload.documents)
    return RankedResponse(ranked=ranked, model=MODEL_NAME)


@app.post("/semantic/peer-match", response_model=RankedResponse)
def semantic_peer_match(payload: PeerMatchRequest):
    query_text = ", ".join([item for item in payload.learning_skills if item]).strip()
    if not query_text:
        return RankedResponse(ranked=[], model=MODEL_NAME)
    docs = [SemanticDocument(id=peer.id, text=peer.text) for peer in payload.peers]
    ranked = _rank(query_text, docs)
    return RankedResponse(ranked=ranked, model=MODEL_NAME)


@app.post("/recommend", response_model=RankedResponse)
def recommend(payload: PeerMatchRequest):
    query_text = ", ".join([item for item in payload.learning_skills if item]).strip()
    if not query_text:
        return RankedResponse(ranked=[], model=MODEL_NAME)
    docs = [SemanticDocument(id=peer.id, text=peer.text) for peer in payload.peers]
    ranked = _rank(query_text, docs)
    return RankedResponse(ranked=ranked, model=MODEL_NAME)


@app.post("/quiz-gen", response_model=QuizGenResponse)
def quiz_gen(payload: QuizGenRequest):
    questions = _build_quiz_questions(payload.content, payload.num_questions)
    return QuizGenResponse(
        title=payload.title,
        questions=questions,
        model=MODEL_NAME,
    )


@app.post("/rag/ask", response_model=RagResponse)
def rag_ask(payload: RagRequest):
    docs = [doc for doc in payload.documents if doc.text and doc.text.strip()]

    if not docs:
        return RagResponse(
            answer="No documents available to answer this question.",
            contexts=[],
            model=MODEL_NAME,
            provider="haystack" if HAYSTACK_AVAILABLE else "fallback",
        )

    try:
        if HAYSTACK_AVAILABLE:
            contexts = _rank_with_haystack(payload.question, docs, payload.top_k)
            provider = "haystack"
        else:
            contexts = _rank_with_fallback(payload.question, docs, payload.top_k)
            provider = "fallback-semantic"
    except Exception:
        contexts = _rank_with_fallback(payload.question, docs, payload.top_k)
        provider = "fallback-semantic"

    if not contexts:
        return RagResponse(
            answer=f'I could not find relevant context for "{payload.question}".',
            contexts=[],
            model=MODEL_NAME,
            provider=provider,
        )

    context_lines = []
    for idx, context in enumerate(contexts, start=1):
        title = context.title or f"Document {context.id}"
        context_lines.append(f"{idx}. {title}: {context.snippet}")

    answer = (
        f'Best answer for "{payload.question}" based on repository context:\n'
        + "\n".join(context_lines)
    )

    return RagResponse(
        answer=answer,
        contexts=contexts,
        model=MODEL_NAME,
        provider=provider,
    )
