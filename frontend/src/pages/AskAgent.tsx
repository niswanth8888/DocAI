import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Layers,
  HelpCircle,
  BrainCircuit,
  ShieldCheck,
  ChevronRight,
  Download,
  AlertTriangle,
  FileText,
  TrendingUp,
  Award,
  BookOpen
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfidenceBadge from '../components/ConfidenceBadge';
import SourceCard from '../components/SourceCard';
import StatusPill from '../components/StatusPill';
import { askQuestion, getDocuments, API_BASE_URL } from '../api/client';
import { AskResponse, SourceCitation, DocumentItem } from '../types/api';
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

interface ParsedOverview {
  executiveOverview: string;
  keyHighlights: string;
  financialHighlights: string;
  governanceHighlights: string;
  csrHighlights: string;
  risksDisclosures: string;
  sourceSections: string;
}

function parseOverview(answer: string): ParsedOverview {
  const sections: ParsedOverview = {
    executiveOverview: '',
    keyHighlights: '',
    financialHighlights: '',
    governanceHighlights: '',
    csrHighlights: '',
    risksDisclosures: '',
    sourceSections: ''
  };
  
  if (!answer) return sections;
  
  const blocks = answer.split('### ');
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    const heading = lines[0].trim().toLowerCase();
    const content = lines.slice(1).join('\n').trim();
    
    if (heading.includes('executive overview')) {
      sections.executiveOverview = content;
    } else if (heading.includes('key highlights')) {
      sections.keyHighlights = content;
    } else if (heading.includes('financial highlights')) {
      sections.financialHighlights = content;
    } else if (heading.includes('governance') || heading.includes('audit')) {
      sections.governanceHighlights = content;
    } else if (heading.includes('csr') || heading.includes('sustainability')) {
      sections.csrHighlights = content;
    } else if (heading.includes('risk') || heading.includes('disclosure')) {
      sections.risksDisclosures = content;
    } else if (heading.includes('source section') || heading.includes('where to look')) {
      sections.sourceSections = content;
    }
  }
  
  // If parsing failed to extract standard headers, map the entire answer to executiveOverview
  if (!sections.executiveOverview && !sections.keyHighlights) {
    sections.executiveOverview = answer;
  }
  
  return sections;
}

const AskAgent: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('detailed');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentsList, setDocumentsList] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);

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
            {response.exact_match_found === false && response.missing_source === true ? (
              /* Lookup failure Warning Card */
              <div className="glass-panel border-rose-500/20 bg-rose-950/5 rounded-2xl p-6 relative overflow-hidden space-y-6">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-rose-500/5 blur-3xl pointer-events-none rounded-full" />
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl shrink-0">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Requested Source Not Found</h3>
                    <p className="text-xs text-rose-300 font-semibold">
                      {response.reliability_warning || "No exact matching document was found in the corporate knowledge base."}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 leading-relaxed text-slate-100 font-medium text-sm">
                  {response.answer}
                </div>

                {response.related_documents && response.related_documents.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                      Related Documents Available
                    </h4>
                    <p className="text-xs text-slate-400 font-semibold">
                      Although the requested document type does not exist, we found these related files:
                    </p>
                    <div className="flex flex-col gap-2">
                      {response.related_documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800/80 rounded-xl">
                          <span className="text-xs font-bold text-slate-200">{doc.document}</span>
                          <a
                            href={`${API_BASE_URL}/documents/${doc.document_id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1C1C1C] hover:bg-[#2C2C2C] border border-[#2A2A2A] rounded-lg text-xs font-bold text-[#F5F5F5] transition-all duration-300"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Download</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Standard Answer Panel */
              <>
                {/* Answer Reliability Panel */}
                <div className="flex flex-wrap items-center gap-2 bg-[#0D1527]/40 border border-cyan-500/10 p-3 rounded-xl mb-4 w-full">
                  <div className="flex items-center gap-2 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase text-slate-350 tracking-wider">
                      Reliability Profile:
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                      (response.reliability_score || 0) >= 0.85
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : (response.reliability_score || 0) >= 0.50
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {(response.reliability_score || 0) >= 0.85 ? 'Evidence Grounded' : (response.reliability_score || 0) >= 0.50 ? 'Partially Grounded' : 'Unverified Source'}
                    </span>
                    
                    {response.query_intent && (
                      <span className="px-2.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 capitalize">
                        Intent: {response.query_intent.replace('_', ' ')}
                      </span>
                    )}

                    {response.section_found && (
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400">
                        Section: {response.section_found}
                      </span>
                    )}

                    {response.reliability_score !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400">
                        Score: {formatPercent(response.reliability_score || 0)}
                      </span>
                    )}

                    {/* Answer Quality Badge */}
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                      (response.query_intent === 'document_overview' || response.query_intent === 'report_generation')
                        ? 'bg-violet-500/10 border-violet-500/20 text-violet-455 text-violet-400'
                        : (response.reliability_score || 0) >= 0.85 && response.confidence === 'High'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : (response.reliability_score || 0) >= 0.40
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {(response.query_intent === 'document_overview' || response.query_intent === 'report_generation')
                        ? 'Overview Synthesized'
                        : (response.reliability_score || 0) >= 0.85 && response.confidence === 'High'
                        ? 'Verified Grounded'
                        : (response.reliability_score || 0) >= 0.40
                        ? 'Weak Evidence'
                        : 'Parametric Warning'}
                    </span>
                  </div>
                </div>

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
 
                      {/* Reliability warning ribbon */}
                      {response.reliability_warning && (
                        <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-semibold animate-pulse">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 animate-bounce" />
                          <span>{response.reliability_warning}</span>
                        </div>
                      )}
 
                      {/* Answer text / Overview Layout */}
                      <div className="space-y-2">
                        {response.query_intent === 'document_overview' || response.query_intent === 'report_generation' ? (
                          <div className="space-y-6">
                            {(() => {
                              const parsed = parseOverview(response.answer);
                              return (
                                <div className="space-y-6">
                                  {parsed.executiveOverview && (
                                    <div className="p-5 rounded-2xl bg-cyan-950/5 border border-cyan-800/20 shadow-inner">
                                      <span className="text-[10px] font-extrabold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 mb-2">
                                        <BrainCircuit className="w-4 h-4 text-cyan-400" />
                                        <span>Executive Overview</span>
                                      </span>
                                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                                        {parsed.executiveOverview}
                                      </p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {parsed.keyHighlights && (
                                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                                        <span className="text-[10px] font-extrabold uppercase text-violet-450 text-violet-400 tracking-wider flex items-center gap-1.5">
                                          <Sparkles className="w-3.5 h-3.5" />
                                          <span>Key Highlights</span>
                                        </span>
                                        <div className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-wrap">
                                          {parsed.keyHighlights}
                                        </div>
                                      </div>
                                    )}

                                    {parsed.financialHighlights && (
                                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                                        <span className="text-[10px] font-extrabold uppercase text-emerald-450 text-emerald-400 tracking-wider flex items-center gap-1.5">
                                          <TrendingUp className="w-3.5 h-3.5" />
                                          <span>Financial Highlights</span>
                                        </span>
                                        <div className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-wrap font-mono">
                                          {parsed.financialHighlights}
                                        </div>
                                      </div>
                                    )}

                                    {parsed.governanceHighlights && (
                                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                                        <span className="text-[10px] font-extrabold uppercase text-cyan-450 text-cyan-400 tracking-wider flex items-center gap-1.5">
                                          <Award className="w-3.5 h-3.5" />
                                          <span>Governance / Audit Highlights</span>
                                        </span>
                                        <div className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-wrap">
                                          {parsed.governanceHighlights}
                                        </div>
                                      </div>
                                    )}

                                    {parsed.csrHighlights && (
                                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                                        <span className="text-[10px] font-extrabold uppercase text-teal-450 text-teal-450 tracking-wider flex items-center gap-1.5">
                                          <Layers className="w-3.5 h-3.5" />
                                          <span>CSR / Sustainability Highlights</span>
                                        </span>
                                        <div className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-wrap">
                                          {parsed.csrHighlights}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {parsed.risksDisclosures && (
                                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                                      <span className="text-[10px] font-extrabold uppercase text-amber-450 text-amber-450 tracking-wider flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Important Risks & Disclosures</span>
                                      </span>
                                      <div className="text-[11px] text-amber-350 leading-relaxed whitespace-pre-wrap">
                                        {parsed.risksDisclosures}
                                      </div>
                                    </div>
                                  )}

                                  {parsed.sourceSections && (
                                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2">
                                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>Important Source Sections</span>
                                      </span>
                                      <div className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap font-mono">
                                        {parsed.sourceSections}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Recommended Follow-up Questions */}
                                  <div className="pt-2 space-y-2">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                                      Recommended Follow-up Questions
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        "What were the primary revenue streams?",
                                        "Who are the members of the Board?",
                                        "What CSR activities were funded?",
                                        "Are there any qualifications in the auditor's report?"
                                      ].map((q, i) => (
                                        <button
                                          key={i}
                                          onClick={() => handleSampleClick(q)}
                                          className="text-[10px] font-bold text-cyan-400 bg-cyan-950/10 hover:bg-cyan-950/20 border border-cyan-800/20 hover:border-cyan-700/30 rounded-lg px-3 py-1.5 transition-all duration-300 text-left"
                                        >
                                          {q}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                              Synthesized Grounded Answer
                            </span>
                            <p className="text-sm md:text-base text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                              {response.answer}
                            </p>
                          </div>
                        )}
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

                {/* Sources / Citations Split List */}
                <div className="space-y-6">
                  {/* Supporting Citations */}
                  {response.supporting_citations && response.supporting_citations.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                        <span>Grounded Supporting Evidence ({response.supporting_citations.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {response.supporting_citations.map((src, i) => (
                          <SourceCard key={i} source={src} onOpenLocation={(s) => { setActiveCitation(s); setModalOpen(true); }} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Related Sources */}
                  {response.related_sources && response.related_sources.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                        <Layers className="w-4.5 h-4.5 text-slate-400" />
                        <span>Related Sources / General Context ({response.related_sources.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {response.related_sources.map((src, i) => (
                          <SourceCard key={i} source={src} onOpenLocation={(s) => { setActiveCitation(s); setModalOpen(true); }} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Fallback if neither list exists */}
                  {(!response.supporting_citations && !response.related_sources) && (
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span>Source Citations ({response.sources.length})</span>
                      </h3>
                      {response.sources.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {response.sources.map((src, i) => (
                            <SourceCard key={i} source={src} onOpenLocation={(s) => { setActiveCitation(s); setModalOpen(true); }} />
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 font-semibold italic text-center">
                          No source citations returned. This query was answered from general parametric reasoning or flagged for review.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Related FAQs */}
            {response.related_faqs && response.related_faqs.length > 0 && (
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
        
        {/* Source Location Preview Overlay Modal */}
        {modalOpen && activeCitation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-3xl bg-[#090D1A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-400 border border-cyan-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{activeCitation.document}</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Page {activeCitation.page || activeCitation.page_number || 1} • Lines {activeCitation.line_start}-{activeCitation.line_end}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setModalOpen(false); setActiveCitation(null); }}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {activeCitation.section_heading && (
                    <span className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400">
                      Section: {activeCitation.section_heading}
                    </span>
                  )}
                  {activeCitation.citation_type && (
                    <span className="px-3 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400 capitalize">
                      Match Type: {activeCitation.citation_type.replace('_', ' ')}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                    Score: {formatPercent(activeCitation.similarity_score)}
                  </span>
                </div>

                {/* Context/Line Editor Preview */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Document Line View Context
                  </span>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-350 leading-relaxed overflow-x-auto">
                    {activeCitation.quoted_evidence ? (
                      activeCitation.quoted_evidence.split('\n').map((line, idx) => {
                        const lineNum = (activeCitation.line_start || 1) + idx;
                        return (
                          <div key={idx} className="flex gap-4 hover:bg-slate-900/60 py-0.5 px-1 rounded transition-colors">
                            <span className="text-slate-600 select-none w-8 text-right border-r border-slate-850 pr-2">
                              {lineNum}
                            </span>
                            <span className="text-slate-300 whitespace-pre-wrap">{line}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex gap-4">
                        <span className="text-slate-600 select-none w-8 text-right border-r border-slate-850 pr-2">
                          {(activeCitation.line_start || 1)}
                        </span>
                        <span className="text-slate-300 whitespace-pre-wrap">"{activeCitation.evidence}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Support summary why this supports */}
                {activeCitation.citation_support_summary && (
                  <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-850 space-y-1">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Grounding Relevance Summary
                    </h4>
                    <p className="text-xs text-slate-350 leading-relaxed font-medium">
                      {activeCitation.citation_support_summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="p-5 border-t border-slate-800/80 bg-slate-950/20 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  DocAI Line-Level Citation Locking
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={activeCitation.download_url ? (activeCitation.download_url.startsWith('http') ? activeCitation.download_url : `${API_BASE_URL}${activeCitation.download_url}`) : `${API_BASE_URL}/documents/${activeCitation.document_id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-550 border border-cyan-500 rounded-xl text-xs font-bold text-white transition-all duration-300"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Document</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AskAgent;
