import pytest

from app.api.chat_routes import get_rag_provider
from app.main import app
from app.services.rag_service import RagAnswer, RagError, RagUnavailable


class StubService:
    """A RagService-shaped object, so the route is tested without Gemini/FAISS."""

    def __init__(self, answer=None, raises=None):
        self._answer = answer or RagAnswer(answer="stub answer")
        self._raises = raises
        self.called_with = None

    def answer(self, query, chat_history=None):
        self.called_with = (query, chat_history)
        if self._raises:
            raise self._raises
        return self._answer


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def use_service(service):
    # The route depends on a provider callable, not the service itself.
    app.dependency_overrides[get_rag_provider] = lambda: (lambda: service)


def use_unavailable(message):
    def provider():
        raise RagUnavailable(message)

    app.dependency_overrides[get_rag_provider] = lambda: provider


def test_chat_query_returns_answer_intent_and_sources(client, auth_headers):
    use_service(
        StubService(
            RagAnswer(
                answer="Case 102 had an undetected subdural hematoma.",
                intent="seeking reports analyzation",
                sources=["case_102.pdf"],
            )
        )
    )

    response = client.post(
        "/chat/query", json={"query": "What happened in case 102?"}, headers=auth_headers
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["answer"] == "Case 102 had an undetected subdural hematoma."
    assert body["intent"] == "seeking reports analyzation"
    assert body["sources"] == ["case_102.pdf"]


def test_chat_query_requires_authentication(client):
    use_service(StubService())

    response = client.post("/chat/query", json={"query": "What happened in case 102?"})

    assert response.status_code in (401, 403)


def test_chat_query_rejects_an_empty_query(client, auth_headers):
    use_service(StubService())

    response = client.post("/chat/query", json={"query": "   "}, headers=auth_headers)

    assert response.status_code == 422


def test_chat_query_forwards_prior_turns_to_the_service(client, auth_headers):
    service = StubService()
    use_service(service)
    history = [{"user": "Who is case 102?", "assistant": "A 78-year-old man."}]

    client.post(
        "/chat/query",
        json={"query": "What was he taking?", "chat_history": history},
        headers=auth_headers,
    )

    assert service.called_with == ("What was he taking?", history)


def test_chat_query_returns_503_when_the_rag_stack_is_unavailable(client, auth_headers):
    use_unavailable("GOOGLE_API_KEY is not set")

    response = client.post("/chat/query", json={"query": "hello"}, headers=auth_headers)

    assert response.status_code == 503
    assert "GOOGLE_API_KEY" in response.json()["detail"]


def test_a_bad_request_is_reported_as_422_even_when_rag_is_unavailable(
    client, auth_headers
):
    # Request validation must run before the RAG stack is resolved, otherwise a
    # malformed request is misreported as "assistant unavailable".
    use_unavailable("GOOGLE_API_KEY is not set")

    response = client.post("/chat/query", json={"query": "   "}, headers=auth_headers)

    assert response.status_code == 422


def test_chat_query_returns_502_when_the_graph_fails(client, auth_headers):
    use_service(StubService(raises=RagError("gemini timed out")))

    response = client.post("/chat/query", json={"query": "hello"}, headers=auth_headers)

    assert response.status_code == 502
    assert "gemini timed out" in response.json()["detail"]
