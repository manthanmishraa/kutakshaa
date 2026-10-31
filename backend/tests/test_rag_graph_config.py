import pytest

from app.ai import rag_graph
from app.services.rag_service import RagUnavailable


@pytest.fixture(autouse=True)
def reset_cache():
    rag_graph.reset_cache()
    yield
    rag_graph.reset_cache()


def test_build_fails_clearly_when_the_api_key_is_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(rag_graph, "LLM_PROVIDER", "gemini")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("RAG_DOCS_DIR", str(tmp_path))

    with pytest.raises(RagUnavailable, match="GOOGLE_API_KEY"):
        rag_graph.build_rag_service()


def test_build_fails_clearly_when_the_docs_folder_is_missing(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "fake-key")
    monkeypatch.setenv("RAG_DOCS_DIR", str(tmp_path / "does-not-exist"))

    with pytest.raises(RagUnavailable, match="does-not-exist"):
        rag_graph.build_rag_service()


def test_build_fails_clearly_when_the_docs_folder_has_no_pdfs(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "fake-key")
    monkeypatch.setenv("RAG_DOCS_DIR", str(tmp_path))
    (tmp_path / "notes.txt").write_text("not a pdf")

    with pytest.raises(RagUnavailable, match="[Nn]o PDF"):
        rag_graph.build_rag_service()
