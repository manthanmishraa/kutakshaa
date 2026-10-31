from typing import Callable

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.models import User
from app.schemas import ChatQueryRequest, ChatQueryResponse
from app.services.rag_service import RagError, RagService

router = APIRouter()


def get_rag_provider() -> Callable[[], RagService]:
    """Return a callable that builds the RAG service.

    A provider rather than the service itself: FastAPI resolves dependencies
    *before* validating the request body, so building here would report a
    malformed request as "assistant unavailable". The route calls the provider
    once the payload is known to be valid.
    """
    from app.ai.rag_graph import build_rag_service

    return build_rag_service


# NOTE: deliberately `def`, not `async def`. The LangGraph pipeline is blocking
# and takes seconds; FastAPI runs sync routes in a threadpool so the event loop
# stays free for everything else.
@router.post("/query", response_model=ChatQueryResponse)
def chat_query(
    payload: ChatQueryRequest,
    current_user: User = Depends(get_current_user),
    provider: Callable[[], RagService] = Depends(get_rag_provider),
):
    # May raise RagUnavailable -> handled app-wide as a 503.
    service = provider()

    try:
        answer_args = {
            "chat_history": [turn.model_dump() for turn in payload.chat_history],
        }
        if payload.behavior_context is not None:
            answer_args["behavior_context"] = payload.behavior_context.model_dump()
        result = service.answer(payload.query, **answer_args)
    except RagError as exc:
        error_text = str(exc)
        if "RESOURCE_EXHAUSTED" in error_text or "429" in error_text:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "The Gemini API quota has been exhausted. Wait before retrying "
                    "or check the Gemini API rate limits and billing plan."
                ),
                headers={"Retry-After": "30"},
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"The RAG assistant failed to answer: {error_text}",
        ) from exc

    return ChatQueryResponse(
        answer=result.answer, intent=result.intent, sources=result.sources
    )
