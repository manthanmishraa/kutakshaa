import pytest

from app.services.rag_service import RagError, RagService


class FakeGraph:
    """Stands in for the compiled LangGraph. Records the state it was invoked with."""

    def __init__(self, final_state):
        self.final_state = final_state
        self.invoked_with = None

    def invoke(self, state):
        self.invoked_with = state
        return self.final_state


def test_answer_returns_analysis_result_from_graph():
    graph = FakeGraph({"analysis_result": "Case 102 shows a subdural hematoma."})
    service = RagService(graph)

    result = service.answer("What happened in case 102?")

    assert result.answer == "Case 102 shows a subdural hematoma."


def test_answer_seeds_graph_state_with_query_and_empty_messages():
    graph = FakeGraph({"analysis_result": "ok"})
    service = RagService(graph)

    service.answer("What medication is prescribed?")

    assert graph.invoked_with["user_query"] == "What medication is prescribed?"
    # LangGraph's add_messages reducer needs a list to append onto.
    assert graph.invoked_with["messages"] == []
    assert graph.invoked_with["chat_history"] == []


def test_answer_reports_the_routed_intent():
    graph = FakeGraph(
        {"analysis_result": "ok", "user_intent": "seeking medication analysis"}
    )
    service = RagService(graph)

    result = service.answer("Which drugs is he on?")

    assert result.intent == "seeking medication analysis"


def test_answer_returns_document_sources():
    graph = FakeGraph(
        {
            "analysis_result": "ok",
            "recieved_documents": ["case_102.pdf", "discharge_note.pdf"],
        }
    )
    service = RagService(graph)

    result = service.answer("Summarise the report")

    assert result.sources == ["case_102.pdf", "discharge_note.pdf"]


def test_answer_falls_back_to_a_message_when_graph_produces_no_analysis():
    # agent_tool_router has an "end" branch that reaches END without ever
    # running an analysis node, leaving analysis_result unset.
    graph = FakeGraph({"user_intent": "seeking factual data"})
    service = RagService(graph)

    result = service.answer("Tell me something")

    assert isinstance(result.answer, str)
    assert result.answer.strip() != ""
    assert "null" not in result.answer.lower()


def test_answer_drops_raw_retrieval_dumps_from_sources():
    # medication_agent / general_answer put the whole retrieved blob into
    # recieved_documents. That must not be shown to the user as a "source".
    raw_dump = (
        "RESULT 1\nSOURCE: C:\\docs\\case_102.pdf | page 3\n"
        + "Patient presented with confusion following a ground-level fall. " * 20
    )
    graph = FakeGraph({"analysis_result": "ok", "recieved_documents": [raw_dump]})
    service = RagService(graph)

    result = service.answer("What medication is prescribed?")

    assert result.sources == ["case_102.pdf"]


def test_answer_passes_prior_turns_into_the_graph():
    graph = FakeGraph({"analysis_result": "ok"})
    service = RagService(graph)
    history = [{"user": "Who is case 102?", "assistant": "A 78-year-old man."}]

    service.answer("What was he taking?", chat_history=history)

    assert graph.invoked_with["chat_history"] == history


def test_answer_wraps_graph_failures_in_a_rag_error():
    class ExplodingGraph:
        def invoke(self, state):
            raise RuntimeError("google api key not found")

    service = RagService(ExplodingGraph())

    with pytest.raises(RagError):
        service.answer("anything")
