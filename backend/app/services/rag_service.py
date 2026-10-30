from __future__ import annotations

import ntpath
import posixpath
import re
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Protocol

NO_ANSWER = (
    "The assistant could not produce an answer for that question. "
    "Try rephrasing it, or ask about a specific patient report."
)

# Matches the "SOURCE: <path> | page N" header that rag_search writes.
_SOURCE_LINE = re.compile(r"^SOURCE:\s*(.+?)\s*(?:\|\s*page\s*\d+)?$", re.MULTILINE)

# Anything longer than this is a retrieval dump, not a source name.
_MAX_SOURCE_LEN = 200


class RagError(RuntimeError):
    """The RAG pipeline was reachable but failed while answering."""


class RagUnavailable(RuntimeError):
    """The RAG pipeline could not be loaded at all (missing deps, key, or docs)."""


class RagGraph(Protocol):
    """Anything that can run the LangGraph pipeline (the compiled graph)."""

    def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]: ...


@dataclass
class RagAnswer:
    answer: str
    intent: str = "unknown"
    sources: List[str] = field(default_factory=list)


class RagService:
    """Drives the RAG graph and maps its final state onto the API response."""

    def __init__(self, graph: RagGraph):
        self._graph = graph

    def answer(
        self,
        query: str,
        chat_history: List[Dict[str, str]] | None = None,
        behavior_context: Dict[str, Any] | None = None,
    ) -> RagAnswer:
        try:
            final_state = self._graph.invoke(
                {
                    "user_query": query,
                    "chat_history": list(chat_history or []),
                    "messages": [],
                    "behavior_context": behavior_context or {},
                }
            )
        except Exception as exc:  # noqa: BLE001 - surfaced to the caller as RagError
            raise RagError(str(exc)) from exc

        answer = (final_state.get("analysis_result") or "").strip()
        return RagAnswer(
            answer=answer or NO_ANSWER,
            intent=final_state.get("user_intent", "unknown"),
            # NOTE: "recieved_documents" is misspelled in the graph state itself.
            sources=_clean_sources(final_state.get("recieved_documents") or []),
        )


def _basename(path: str) -> str:
    return ntpath.basename(posixpath.basename(path)) or path


def _clean_sources(raw: Iterable[Any]) -> List[str]:
    """Turn graph output into short, displayable source names.

    Some nodes store clean filenames; others store the entire retrieved text
    blob. Pull the SOURCE: headers out of the latter and never leak the body.
    """
    cleaned: List[str] = []
    for entry in raw:
        if not isinstance(entry, str):
            continue
        text = entry.strip()
        if not text:
            continue
        matches = _SOURCE_LINE.findall(text)
        if matches:
            cleaned.extend(_basename(m.strip()) for m in matches)
        elif len(text) <= _MAX_SOURCE_LEN:
            cleaned.append(text)

    seen = set()
    unique: List[str] = []
    for name in cleaned:
        if name and name not in seen:
            seen.add(name)
            unique.append(name)
    return unique
