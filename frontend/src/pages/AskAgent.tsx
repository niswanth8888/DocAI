import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Layers,
  HelpCircle,
  BrainCircuit,
  ShieldCheck,
  ChevronRight,
  Download
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfidenceBadge from '../components/ConfidenceBadge';
import SourceCard from '../components/SourceCard';
import StatusPill from '../components/StatusPill';
import { askQuestion, getDocuments, API_BASE_URL } from '../api/client';
import { AskResponse, DocumentItem } from '../types/api';
import { formatPercent, formatLabel } from '../utils/formatters';

const SAMPLE_QUESTIONS = [
  'What is the leave approval process?',
  'Can employees take leave without approval?',
  'Can employees take unlimited leave without approval?',
  'What is the CEO favorite food?'
];

const MODES = [
  { value: 'simple', label: 'Simple' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'executive', label: 'Executive Summary' },
  { value: 'step_by_step', label: 'Step-by-Step Explanation' }
];

const AskAgent: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('detailed');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentsList, setDocumentsList] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await getDocuments();
        setDocumentsList(res.documents || []);
      } catch (err) {
        console.error('Failed to fetch documents list for dropdown:', err);
      }
    };
    fetchDocs();
  }, []);

  const handleSearch = async (queryText: string, modeOverride?: string) => {
    if (!queryText.trim()) return;

    setLoading(true);
    setError(null);
    setQuestion(queryText);

    try {
      const res = await askQuestion(queryText, modeOverride || selectedMode, selectedDocumentId);
      setResponse(res);
    } catch (err) {
      console.error(err);
      setError('An error occurred while communicating with the agent. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = (q: string) => {
    setQuestion(q);
    handleSearch(q);
  };

  const getConfidenceBarColor = (confidence: string) => {
    const c = (confidence || '').toLowerCase();
    if (c === 'high') return 'bg-emerald-500';
    if (c === 'medium') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Ask Agent"
        description="Interact with company policy and guidelines using natural language query grounding."
      />

      <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#222222] text-xs text-[#9F9F9F] leading-relaxed">
        DocAI searches indexed company documents, retrieves the most relevant evidence, and generates citation-backed answers so users do not need to manually search through large document repositories.
      </div>

      {/* Main input wrapper */}
      <div className="space-y-6">
        <div className="relative glass-panel border-cyan-500/10 focus-within:border-cyan-500/30 transition-all duration-300 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col gap-1.5 mb-4">
            <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
              <span>Document-Grounded Human-Like Reasoning</span>
            </span>
            <p className="text-xs text-slate-400 font-semibold">
              Ask policy, process, onboarding, HR, IT, or internal knowledge questions and receive citation-backed answers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Answer Mode Selector */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Answer Mode
              </span>
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => {
                  const isSelected = selectedMode === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMode(m.value)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border ${
                        isSelected
                          ? 'bg-[#1C1C1C] border-[#444444] text-[#F5F5F5]'
                          : 'bg-[#0D0D0D] border-[#222222] text-[#9F9F9F] hover:text-[#F5F5F5] hover:bg-[#111111]'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ask From Selector */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Ask From Document
              </span>
              <select
                value={selectedDocumentId || ''}
                onChange={(e) => setSelectedDocumentId(e.target.value || null)}
                disabled={loading}
                className="bg-[#0D0D0D] border border-[#222222] text-[#9F9F9F] rounded-lg text-xs font-semibold px-3 py-2 outline-none focus:border-[#444444] w-full h-[38px] transition-all"
              >
                <option value="">All Documents</option>
                {documentsList.map((doc) => (
                  <option key={doc.document_id} value={doc.document_id}>
                    {doc.document}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
            <Search className="w-5 h-5 text-slate-500 shrink-0 ml-2" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(question)}
              placeholder="e.g. Can employees take leave without approval?"
              disabled={loading}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-100 placeholder-slate-500 w-full"
            />
            <button
              onClick={() => handleSearch(question)}
              disabled={loading || !question.trim()}
              className="py-2.5 px-6 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#333333] hover:border-[#444444] disabled:from-slate-900 disabled:to-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-bold text-[#F5F5F5] transition-all duration-300 flex items-center gap-2"
            >
              <span>Ask DocAI</span>
            </button>
          </div>

          {/* Quick-action Sample Questions */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              Suggestions:
            </span>
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSampleClick(q)}
                disabled={loading}
                className="text-[11px] font-bold text-slate-400 bg-slate-900/60 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-1.5 transition-all duration-300 text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Error messaging */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading display */}
        {loading && (
          <div className="glass-panel border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 animate-slide-up">
            <div className="relative">
              <BrainCircuit className="w-12 h-12 text-cyan-400 animate-pulse" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">RAG Reasoning Active</h4>
              <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                Retrieving evidence and reasoning over documents...
              </p>
            </div>
          </div>
        )}

        {/* Answer Layout */}
        {response && !loading && (
          <div className="space-y-6 animate-slide-up">
            {/* Primary Answer Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Answer details */}
              <div className="lg:col-span-7 glass-panel border-cyan-500/15 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />

                <div className="space-y-6">
                  {/* Badge Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ConfidenceBadge
                        confidence={response.confidence}
                        score={response.confidence_score}
                      />
                      <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 capitalize">
                        {formatLabel(response.answer_type)}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400">
                        Answer Mode: {MODES.find(m => m.value === (response.answer_mode || 'detailed'))?.label || 'Detailed'}
                      </span>
                    </div>
                    <StatusPill status={response.status} />
                  </div>

                  {/* Answer text */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Synthesized Grounded Answer
                    </span>
                    <p className="text-sm md:text-base text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                      {response.answer}
                    </p>
                  </div>

                  {/* Download Source Document Button */}
                  {(response.primary_document_id || (response.sources && response.sources.length > 0)) && (
                    <div className="pt-2">
                      <a
                        href={`${API_BASE_URL}/documents/${response.primary_document_id || response.sources[0].document_id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1C1C] hover:bg-[#2C2C2C] border border-[#2A2A2A] rounded-xl text-xs font-bold text-[#F5F5F5] transition-all duration-300"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Download Source Document ({response.primary_document || response.sources[0].document})</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Score Progress Bar */}
                <div className="mt-6 pt-4 border-t border-slate-900/60">
                  <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
                    <span className="font-semibold">Answer Confidence</span>
                    <span className="font-bold text-slate-200">{formatPercent(response.confidence_score)}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getConfidenceBarColor(
                        response.confidence
                      )}`}
                      style={{ width: `${response.confidence_score * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Reasoning Summary Panel */}
              <div className="lg:col-span-5 glass-panel border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-violet-500/5 blur-3xl pointer-events-none rounded-full" />
                
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>Agent Reasoning Log</span>
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed font-medium flex-1 whitespace-pre-wrap">
                  {response.reasoning_summary}
                </p>

                <div className="mt-6 p-3 rounded-lg bg-slate-950/40 border border-slate-900 text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1.5 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Grounded in corporate documents</span>
                </div>
              </div>
            </div>

            {/* Sources / Citations list */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Source Citations ({response.sources.length})</span>
              </h3>
              {response.sources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {response.sources.map((src, i) => (
                    <SourceCard key={i} source={src} />
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 font-semibold italic text-center">
                  No source citations returned. This query was answered from general parametric reasoning or flagged for review.
                </div>
              )}
            </div>

            {/* Related FAQs */}
            {response.related_faqs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-violet-400" />
                  <span>Related Questions</span>
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {response.related_faqs.map((faq, i) => (
                    <button
                      key={i}
                      onClick={() => handleSampleClick(faq)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/25 transition-all duration-300 text-left cursor-pointer group"
                    >
                      <span>{faq}</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AskAgent;
