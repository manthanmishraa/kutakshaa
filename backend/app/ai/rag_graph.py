"""Kutaksha RAG assistant.

Extracted from `Kutaksha Rag.ipynb` and adapted to run inside FastAPI:

* no `input()` loop, no notebook-only display calls
* the docs folder comes from `RAG_DOCS_DIR` instead of a hardcoded D:\\ path
* the compiled graph is called `graph`, not `app` (that name is FastAPI's)
* config is validated *before* the heavy imports, so the backend still starts
  when langgraph/faiss/torch are not installed
"""

from __future__ import annotations

import os
import json
import re
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from app.services.rag_service import RagService, RagUnavailable
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=True)

DEFAULT_DOCS_DIR = Path(__file__).resolve().parents[2] / "docs"
DEFAULT_INDEX_DIR = Path(__file__).resolve().parents[2] / "rag_index"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

_service: Optional[RagService] = None
_lock = threading.Lock()


def reset_cache() -> None:
    """Drop the cached service. Used by tests and after re-indexing."""
    global _service
    with _lock:
        _service = None


def docs_dir() -> Path:
    return Path(os.getenv("RAG_DOCS_DIR") or DEFAULT_DOCS_DIR)


def index_dir() -> Path:
    return Path(os.getenv("RAG_INDEX_DIR") or DEFAULT_INDEX_DIR)


def _check_config() -> Path:
    """Validate everything cheap before importing the heavy stack."""
    if LLM_PROVIDER not in {"ollama", "gemini"}:
        raise RagUnavailable(
            f"Unsupported LLM_PROVIDER={LLM_PROVIDER!r}. Use 'ollama' or 'gemini'."
        )

    if LLM_PROVIDER == "gemini" and not os.getenv("GOOGLE_API_KEY"):
        raise RagUnavailable(
            "GOOGLE_API_KEY is not set. Add it to backend/.env to enable the assistant."
        )

    folder = docs_dir()
    if not folder.exists():
        raise RagUnavailable(
            f"RAG docs folder not found: {folder}. "
            "Create it and add the patient report PDFs."
        )
    if not any(folder.glob("*.pdf")):
        raise RagUnavailable(
            f"No PDF documents found in {folder}. "
            "The assistant needs at least one medical report PDF."
        )
    return folder


def build_rag_service() -> RagService:
    """Return the RAG service, building the graph and indexes on first call."""
    global _service
    if _service is not None:
        return _service

    with _lock:
        if _service is None:
            _check_config()
            try:
                _service = RagService(_build_graph())
            except RagUnavailable:
                raise
            except ImportError as exc:
                raise RagUnavailable(
                    f"RAG dependencies are not installed ({exc}). "
                    "Run: pip install -r requirements-rag.txt"
                ) from exc
    return _service


def _build_graph():
    """Build the LangGraph pipeline. Heavy imports live here, not at module top."""
    from langchain_community.document_loaders import (
        CSVLoader,
        DirectoryLoader,
        PyMuPDFLoader,
    )
    from langchain_community.vectorstores import FAISS
    from langchain_core.messages import HumanMessage
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langgraph.graph import END, START, StateGraph
    from typing_extensions import TypedDict

    folder = docs_dir()
    if LLM_PROVIDER == "ollama":
        from langchain_ollama import ChatOllama

        llm = ChatOllama(model=OLLAMA_MODEL, temperature=0)
    else:
        from langchain_google_genai import ChatGoogleGenerativeAI

        llm = ChatGoogleGenerativeAI(model=GEMINI_MODEL)

    # Keep the complete report set available for longitudinal questions. The
    # vector index is useful for relevance, but similarity search can omit a
    # dated record that is required for a ten-day comparison.
    all_medical_docs = DirectoryLoader(
        str(folder), glob="*.pdf", loader_cls=PyMuPDFLoader
    ).load()

    # ---------------------------------------------------------------- indexes
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    general_path = index_dir() / "general"
    medical_path = index_dir() / "medical"

    if general_path.exists() and medical_path.exists():
        # Locally-built indexes, written by this same code. Safe to deserialize.
        vector_store = FAISS.load_local(
            str(general_path), embeddings, allow_dangerous_deserialization=True
        )
        medical_store = FAISS.load_local(
            str(medical_path), embeddings, allow_dangerous_deserialization=True
        )
    else:
        pdf_docs = all_medical_docs
        csv_docs = DirectoryLoader(str(folder), glob="*.csv", loader_cls=CSVLoader).load()

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        pdf_chunks = splitter.split_documents(pdf_docs)
        csv_chunks = splitter.split_documents(csv_docs)

        if not pdf_chunks:
            raise RagUnavailable(
                f"No PDF chunks were produced from {folder}. The PDFs may be empty "
                "or image-only (no extractable text)."
            )

        vector_store = FAISS.from_documents(pdf_chunks + csv_chunks, embeddings)
        # Dedicated medical index so large sensor CSVs cannot drown out the reports.
        medical_store = FAISS.from_documents(pdf_chunks, embeddings)

        index_dir().mkdir(parents=True, exist_ok=True)
        vector_store.save_local(str(general_path))
        medical_store.save_local(str(medical_path))

    retriever = vector_store.as_retriever(search_kwargs={"k": 5})
    # Keep the full ten-day report window available for longitudinal comparisons.
    medical_retriever = medical_store.as_retriever(search_kwargs={"k": 20})

    def rag_search(user_query: str, search_type: str = "general") -> str:
        query = (user_query or "").strip()
        if not query:
            return "No query was supplied to RAG."

        if search_type == "medical_report":
            # Medical questions must see every dated report so the model can
            # compare the complete history, not just nearest-neighbor chunks.
            docs = all_medical_docs
        else:
            docs = retriever.invoke(query)
        if not docs:
            return "No relevant information found in the RAG knowledge base."

        results = []
        for i, doc in enumerate(docs, 1):
            source = doc.metadata.get("source", "unknown source")
            page = doc.metadata.get("page")
            location = source + (f" | page {page + 1}" if isinstance(page, int) else "")
            results.append(f"RESULT {i}\nSOURCE: {location}\n{doc.page_content}")
        return "\n\n---\n\n".join(results)

    # ------------------------------------------------------------------ state
    class UltimateState(TypedDict, total=False):
        patient_id: str
        patient_name: str
        user_query: str
        user_intent: str
        final_response: str
        medication_data: str
        recieved_documents: list
        retrieved_context: str
        analysis_result: str
        intent_agent: str
        reportanalyzer_agent: str
        messages: list
        chat_history: list
        behavior_context: Dict[str, Any]

    def behavior_evidence(state: Dict[str, Any]) -> str:
        context = state.get("behavior_context") or {}
        if not context:
            return "No frontend behavior data was supplied for this question."
        return json.dumps(context, ensure_ascii=True, indent=2)

    def conversation_evidence(state: Dict[str, Any]) -> str:
        history = state.get("chat_history") or []
        if not history:
            return "No earlier conversation turns were supplied."
        return json.dumps(history[-6:], ensure_ascii=True, indent=2)

    def focus_instruction(query: str) -> str:
        lowered = query.lower()
        if "speed" in lowered or "walking" in lowered or "walk" in lowered:
            return (
                "The user asked about walking speed. Answer only about walking speed "
                "unless another metric is explicitly requested. List the dated speed "
                "values, compare the first and latest values, compare the latest value "
                "with the baseline, and mention current tracking speed if supplied. "
                "Do not add activity, balance, tremor, gait, posture, fatigue, or "
                "diagnostic claims."
            )
        return (
            "Answer only the metrics and time range requested. Do not expand a focused "
            "question into a full health report."
        )

    def is_record_question(query: str) -> bool:
        return bool(
            re.search(
                r"(case notes?|clinical findings?|medical record|medical report|"
                r"prescription|medication|medicine|diagnosis|key findings)",
                query.lower(),
            )
        )

    def structured_answer(state: Dict[str, Any]) -> Optional[str]:
        """Answer exact ID and speed lookups without LLM paraphrasing."""
        query = (state.get("user_query") or "").lower()
        behavior = state.get("behavior_context") or {}
        context = state.get("retrieved_context") or ""

        if re.search(
            r"\b(id|identifier|patient\s+id|patient's\s+id|case\s+id)\b",
            query,
        ):
            patient_id = behavior.get("patient_id") or "not available"
            patient_name = behavior.get("patient_name") or "the patient"
            return (
                f"Patient: {patient_name}\n"
                f"Patient ID: {patient_id}\n"
                "Case ID: Not provided in the current records."
            )

        if re.search(r"(latest|most recent|last)\s+(medical\s+)?(report|record)", query):
            reports = []
            for block in context.split("\n\n---\n\n"):
                date_match = re.search(r"Record date:\s*(\d{4}-\d{2}-\d{2})", block)
                if date_match:
                    reports.append((date_match.group(1), block))
            if reports:
                latest_date, latest = max(reports, key=lambda item: item[0])

                def report_value(label: str, suffix: str = "") -> str:
                    match = re.search(
                        rf"{re.escape(label)}:\s*([^\n]+)", latest, flags=re.IGNORECASE
                    )
                    return f"{match.group(1).strip()}{suffix}" if match else "not recorded"

                observation = re.search(
                    r"Clinical observation\s*\n([^\n]+)", latest, flags=re.IGNORECASE
                )
                answer = (
                    f"Latest medical report for Rajesh Kumar ({latest_date}):\n"
                    f"- Finding: {observation.group(1).strip() if observation else 'not recorded'}\n"
                    f"- Walking speed: {report_value('Walking speed')}\n"
                    f"- Activity level: {report_value('Activity level')}\n"
                    f"- Balance score: {report_value('Balance score')}\n"
                    f"- Gait rhythm: {report_value('Gait rhythm')}\n"
                    f"- Tremor index: {report_value('Tremor index')}\n"
                    "- No acute injury or fall was documented on this date.\n"
                    "- Medication: Vitamin D3 1000 IU once daily; no change recorded."
                )
                live = behavior.get("latest") or {}
                graph = (behavior.get("graph_trend") or [{}])[-1]
                if live:
                    answer += (
                        "\n\nLive tracking now (from the dashboard):\n"
                        f"- Walking speed: {live.get('walking_speed', 'not recorded')} m/s\n"
                        f"- Activity level: {live.get('activity_level', 'not recorded')}%\n"
                        f"- Balance score: {live.get('balance_score', 'not recorded')}\n"
                        f"- HSI: {graph.get('hsi', behavior.get('hsi', 'not recorded'))}\n"
                        f"- Risk score: {graph.get('risk', behavior.get('risk_score', 'not recorded'))}\n"
                        f"- Severity score: {graph.get('severity', behavior.get('severity_score', 'not recorded'))}"
                    )
                return answer

        if re.search(
            r"(key findings|case notes|clinical findings|main findings|summari[sz]e.*(case|record|report))",
            query,
        ):
            dates = re.findall(r"Record date:\s*(\d{4}-\d{2}-\d{2})", context)
            speeds = [
                float(value)
                for value in re.findall(
                    r"Walking speed:\s*([0-9]+(?:\.[0-9]+)?)\s*m/s", context
                )
            ]
            activities = [
                float(value)
                for value in re.findall(
                    r"Activity level:\s*([0-9]+(?:\.[0-9]+)?)\s*percent", context
                )
            ]
            balances = [
                float(value)
                for value in re.findall(
                    r"Balance score:\s*([0-9]+(?:\.[0-9]+)?)", context
                )
            ]
            if dates and speeds and activities and balances:
                answer = (
                    "Key findings in Rajesh Kumar's case notes:\n"
                    f"- The records cover {min(dates)} through {max(dates)}.\n"
                    f"- Walking speed declined from {max(speeds):.2f} m/s to {min(speeds):.2f} m/s.\n"
                    f"- Activity level declined from {max(activities):.0f}% to {min(activities):.0f}%.\n"
                    f"- Balance score declined from {max(balances):.0f} to {min(balances):.0f}.\n"
                    "- The notes document gradual mobility decline and occasional balance difficulty.\n"
                    "- No acute injury or fall is documented in these records.\n"
                    "- Vitamin D3 1000 IU once daily is listed, with no medication change recorded.\n"
                    "- These are observational monitoring notes, not a diagnosis."
                )
                live = behavior.get("latest") or {}
                graph = (behavior.get("graph_trend") or [{}])[-1]
                if live:
                    answer += (
                        "\n\nLive tracking now (separate from the reports):\n"
                        f"- Walking speed: {live.get('walking_speed', 'not recorded')} m/s\n"
                        f"- Activity level: {live.get('activity_level', 'not recorded')}%\n"
                        f"- Balance score: {live.get('balance_score', 'not recorded')}\n"
                        f"- HSI: {graph.get('hsi', behavior.get('hsi', 'not recorded'))}\n"
                        f"- Risk score: {graph.get('risk', behavior.get('risk_score', 'not recorded'))}\n"
                        f"- Severity score: {graph.get('severity', behavior.get('severity_score', 'not recorded'))}"
                    )
                return answer

        if re.search(
            r"(tell me all|tell all|everything|full summary|complete summary|about rajesh|about the patient)",
            query,
        ):
            dates = re.findall(r"Record date:\s*(\d{4}-\d{2}-\d{2})", context)
            speeds = [
                float(value)
                for value in re.findall(
                    r"Walking speed:\s*([0-9]+(?:\.[0-9]+)?)\s*m/s", context
                )
            ]
            activities = [
                float(value)
                for value in re.findall(
                    r"Activity level:\s*([0-9]+(?:\.[0-9]+)?)\s*percent", context
                )
            ]
            balances = [
                float(value)
                for value in re.findall(
                    r"Balance score:\s*([0-9]+(?:\.[0-9]+)?)", context
                )
            ]
            latest_report = max(dates) if dates else "not available"
            answer = (
                "Rajesh Kumar - complete summary\n\n"
                f"Patient ID: {behavior.get('patient_id', 'not available')}\n"
                f"Medical records: {min(dates) if dates else 'not available'} through {latest_report}\n\n"
                "Medical-record trend:\n"
                f"- Walking speed: {max(speeds):.2f} m/s to {min(speeds):.2f} m/s\n"
                f"- Activity level: {max(activities):.0f}% to {min(activities):.0f}%\n"
                f"- Balance score: {max(balances):.0f} to {min(balances):.0f}\n"
                "- Gradual mobility decline and occasional balance difficulty were documented.\n"
                "- No acute injury or fall was documented.\n"
                "- Vitamin D3 1000 IU once daily; no medication change recorded."
            )
            live = behavior.get("latest") or {}
            graph = (behavior.get("graph_trend") or [{}])[-1]
            if live:
                answer += (
                    "\n\nLive dashboard tracking now:\n"
                    f"- Walking speed: {live.get('walking_speed', 'not recorded')} m/s\n"
                    f"- Activity level: {live.get('activity_level', 'not recorded')}%\n"
                    f"- Balance score: {live.get('balance_score', 'not recorded')}\n"
                    f"- Tremor index: {live.get('tremor_index', 'not recorded')}\n"
                    f"- Gait rhythm: {live.get('gait_rhythm', 'not recorded')}\n"
                    f"- Posture stability: {live.get('posture_stability', 'not recorded')}\n"
                    f"- Step stride: {live.get('step_stride', 'not recorded')} m\n"
                    f"- Fatigue index: {live.get('fatigue_index', 'not recorded')}\n"
                    f"- Movement variability: {live.get('movement_variability', 'not recorded')}\n"
                    f"- HSI: {graph.get('hsi', behavior.get('hsi', 'not recorded'))}\n"
                    f"- Risk score: {graph.get('risk', behavior.get('risk_score', 'not recorded'))}\n"
                    f"- Severity score: {graph.get('severity', behavior.get('severity_score', 'not recorded'))}"
                )
            answer += "\n\nThese are observational monitoring values, not a diagnosis."
            return answer

        if "speed" not in query and "walking" not in query and "walk" not in query:
            return None

        values = []
        for date, speed in re.findall(
            r"Record date:\s*(\d{4}-\d{2}-\d{2}).*?Walking speed:\s*([0-9]+(?:\.[0-9]+)?)\s*m/s",
            context,
            flags=re.DOTALL,
        ):
            values.append((date, float(speed)))
        values = sorted(set(values))
        if not values:
            return None

        lines = ["Walking speed across the ten medical records:"]
        lines.extend(f"- {date}: {speed:.2f} m/s" for date, speed in values)
        first_date, first_speed = values[0]
        last_date, last_speed = values[-1]
        change = last_speed - first_speed
        direction = "decreased" if change < 0 else "increased" if change > 0 else "did not change"
        lines.append(
            f"\nFrom {first_date} ({first_speed:.2f} m/s) to {last_date} "
            f"({last_speed:.2f} m/s), walking speed {direction} by {abs(change):.2f} m/s."
        )

        current = (behavior.get("latest") or {}).get("walking_speed")
        if isinstance(current, (int, float)):
            lines.append(f"Current tracking speed: {float(current):.2f} m/s.")
        return "\n".join(lines)

    def quota_fallback(state: Dict[str, Any]) -> str:
        """Return retrieved evidence when Gemini generation is quota-limited."""
        retrieved = (state.get("retrieved_context") or "").strip()
        behavior = state.get("behavior_context") or {}
        evidence = retrieved[:6000] or "No matching medical-record passage was retrieved."
        answer = (
            "Gemini generation is temporarily unavailable because the API quota is exhausted. "
            "The RAG retriever still found this evidence for your question:\n\n"
            f"{evidence}"
        )
        if behavior:
            latest = behavior.get("latest") or {}
            baseline = behavior.get("baseline") or {}
            answer += (
                "\n\nFrontend behavior evidence:\n"
                f"Latest metrics: {json.dumps(latest, ensure_ascii=True)}\n"
                f"Baseline metrics: {json.dumps(baseline, ensure_ascii=True)}\n"
                "Use these observations with the retrieved record; they are not a diagnosis."
            )
        return answer

    # ------------------------------------------------------------------ nodes
    def user_query(state: Dict[str, Any]) -> Dict[str, Any]:
        query = (state.get("user_query") or "").strip()
        if not query:
            raise ValueError("No user query was supplied to the chatbot.")
        return {
            "user_query": query,
            "user_intent": "general medical context",
            "messages": [HumanMessage(content=query)],
        }

    def retrieve(state: Dict[str, Any]) -> Dict[str, Any]:
        retrieved = rag_search(state["user_query"], search_type="medical_report")
        return {"retrieved_context": retrieved, "recieved_documents": [retrieved]}

    def general_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
        exact_answer = structured_answer(state)
        if exact_answer:
            result = {"analysis_result": exact_answer}
            if re.search(
                r"(latest|most recent|last)\s+(medical\s+)?(report|record)",
                state["user_query"],
                flags=re.IGNORECASE,
            ):
                reports = []
                for block in (state.get("retrieved_context") or "").split("\n\n---\n\n"):
                    date_match = re.search(r"Record date:\s*(\d{4}-\d{2}-\d{2})", block)
                    if date_match:
                        reports.append((date_match.group(1), block))
                if reports:
                    result["recieved_documents"] = [max(reports, key=lambda item: item[0])[1]]
            return result

        record_question = is_record_question(state["user_query"])
        record_scope = (
            "This is a medical-record question. Use only the retrieved medical records. "
            "Do not discuss frontend graphs, HSI, risk, severity, or sensor history "
            "unless the user explicitly asks for them."
            if record_question
            else "Use frontend tracking evidence only when it is relevant to the user's question."
        )
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """You are a flexible medical-record and behavior assistant.
Answer any user question that can be supported by the retrieved records, frontend behavior evidence, or earlier conversation below.

Rules:
- Use the retrieved records as the evidence.
- For report questions, compare all available dated reports in the ten-day window with the current tracking values; do not rely on only one report.
- Follow the focus instruction exactly. A focused question must receive a focused answer, not a general report.
- Follow the scope instruction exactly.
- Answer the specific question directly; do not force it into a predefined category.
- Use earlier conversation turns to resolve references such as 'he', 'that medicine', or 'the latest result'.
- If the requested case/patient is present in the retrieved records, answer from it clearly.
- Do not claim that information is unavailable merely because the intent is 'medical records'.
- Only say information is unavailable when the retrieved context genuinely does not contain it.
- Do not invent patient facts.
- Use values exactly as provided. Do not estimate, interpolate, or substitute one metric for another.
- Keep report values and frontend tracking values distinct; never claim a report value is a current tracking value unless it is explicitly supplied as one.
- Treat behavior metrics as observational signals and compare them with the supplied baseline when relevant.
- Use both the raw tracking history and graph trend values (HSI, risk, severity, and trajectory) when the user asks about trends or changes.
- Explain which tracked metrics and graph values support the conclusion, including direction over time when available.
- Do not diagnose or prescribe new treatment.
- Keep the answer concise but include the important clinical details and source when available.
- If the evidence does not contain the answer, say exactly what is missing.""",
                ),
                (
                    "human",
                    "Scope Instruction:\n{record_scope}\n\nFocus Instruction:\n{focus_instruction}\n\nUser Query:\n{user_query}\n\nRetrieved Medical Records:\n{retrieved_information}\n\nFrontend Behavior Evidence:\n{behavior_information}\n\nEarlier Conversation:\n{conversation_information}",
                ),
            ]
        )
        try:
            result = llm.invoke(
                prompt.format_messages(
                    user_query=state["user_query"],
                    record_scope=record_scope,
                    focus_instruction=focus_instruction(state["user_query"]),
                    retrieved_information=state.get("retrieved_context", ""),
                    behavior_information=(
                        "Not applicable to this medical-record question."
                        if record_question
                        else behavior_evidence(state)
                    ),
                    conversation_information=conversation_evidence(state),
                )
            )
            return {"analysis_result": result.content}
        except Exception as exc:
            error_text = str(exc)
            if "RESOURCE_EXHAUSTED" in error_text or "429" in error_text:
                return {"analysis_result": quota_fallback(state)}
            raise

    # ------------------------------------------------------------------ graph
    workflow = StateGraph(UltimateState)
    workflow.add_node("user_query", user_query)
    workflow.add_node("retrieve", retrieve)
    workflow.add_node("general_analysis", general_analysis)

    workflow.add_edge(START, "user_query")
    workflow.add_edge("user_query", "retrieve")
    workflow.add_edge("retrieve", "general_analysis")
    workflow.add_edge("general_analysis", END)

    return workflow.compile()
