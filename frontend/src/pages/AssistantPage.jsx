import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { askRag, describeApiError } from '../utils/api';
import { buildChatHistory } from '../utils/chat';
import { getPatient, getPatientMetrics } from '../utils/storage';
import { DEFAULT_BASELINE, hsiFromCurrent, normalizeMetrics, riskFromCurrent, severityFromCurrent } from '../utils/metrics';
import { buildTrendData } from '../components/LiveCharts';

const SUGGESTIONS = [
  'Summarise the latest medical report',
  'What medications is the patient prescribed?',
  'Were there any changes to the prescription?',
  'What are the key findings in the case notes?',
];

const INTENT_LABELS = {
  'seeking factual data': 'Factual lookup',
  'seeking reports analyzation': 'Report analysis',
  'seeking medication analysis': 'Medication analysis',
  'general medical context': 'General context',
  'doctoral prescription and medical records': 'Records lookup',
};

function buildBehaviorContext(user) {
  const patient = getPatient(user?.patientId || 'p1');
  const baseline = normalizeMetrics(patient?.baseline, DEFAULT_BASELINE);
  const history = getPatientMetrics(patient?.id || 'p1', 60);
  const latest = history[history.length - 1] || baseline;

  return {
    patient_id: patient?.id || user?.patientId || 'p1',
    patient_name: patient?.name || user?.name,
    baseline,
    latest,
    history,
    graph_trend: buildTrendData(history, baseline),
    hsi: hsiFromCurrent(latest, baseline),
    risk_score: riskFromCurrent(latest, baseline),
    severity_score: severityFromCurrent(latest, baseline),
  };
}

function Bubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[85%] rounded-2xl rounded-bl-sm border px-4 py-3 text-sm shadow-sm ${
          message.isError
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        {message.intent && INTENT_LABELS[message.intent] && (
          <span className="mb-2 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
            {INTENT_LABELS[message.intent]}
          </span>
        )}
        <p className="whitespace-pre-wrap leading-6">{message.text}</p>
        {message.sources?.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sources</p>
            <ul className="mt-1 space-y-0.5">
              {message.sources.map((source) => (
                <li key={source} className="text-xs text-slate-600">• {source}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssistantPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (rawQuery) => {
    const query = rawQuery.trim();
    if (!query || loading) return;

    const history = buildChatHistory(messages);
    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    try {
      const response = await askRag(query, history, {
        behaviorContext: buildBehaviorContext(user),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.answer,
          intent: response.intent,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: describeApiError(error), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Sign in to use the assistant</h2>
          <p className="mt-2 text-sm text-slate-600">
            The medical records assistant is only available to signed-in care team members.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 md:px-6 lg:px-8">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-[11px] uppercase tracking-[0.32em] text-teal-700">Medical Records Assistant</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Ask about patient reports</h2>
          <p className="mt-1 text-xs text-slate-500">
            Retrieval-augmented answers grounded in the uploaded medical documents. Signed in as {user?.name}.
          </p>
        </div>

        <div ref={scrollRef} className="mt-4 max-h-[52vh] min-h-[280px] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
              <p className="text-sm font-medium text-slate-700">Try asking:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <Bubble key={index} message={message} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
                Searching the medical records...
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="mt-4 flex gap-2 border-t border-slate-200 pt-4"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={loading}
            placeholder="Ask about a patient report, medication, or finding..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </form>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          Answers are generated from retrieved documents and must be reviewed by a qualified
          healthcare professional. This is decision support, not a diagnosis.
        </p>
      </section>
    </div>
  );
}
