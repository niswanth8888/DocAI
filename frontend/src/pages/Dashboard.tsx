import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Layers,
  HelpCircle,
  Tag,
  MessageSquareCode,
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  Search,
  Brain,
  ShieldAlert
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import { getDashboard } from '../api/client';
import { DashboardStats } from '../types/api';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  isOnline: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isOnline }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboard();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Could not establish a connection to retrieve statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const cardsInfo = stats
    ? [
        { title: 'Total Documents', value: stats.total_documents, icon: FileText, glow: 'cyan', desc: 'Active files ingested' },
        { title: 'Total Chunks', value: stats.total_chunks, icon: Layers, glow: 'violet', desc: 'Vectorized text nodes' },
        { title: 'Generated FAQs', value: stats.total_faqs, icon: HelpCircle, glow: 'cyan', desc: 'QA intelligent extraction' },
        { title: 'Generated Tags', value: stats.total_tags, icon: Tag, glow: 'violet', desc: 'Taxonomy categorizations' },
        { title: 'Questions Answered', value: stats.questions_answered, icon: MessageSquareCode, glow: 'emerald', desc: 'Successful agent queries' },
        { title: 'Low Conf. Queries', value: stats.low_confidence_queries, icon: AlertOctagon, glow: 'amber', desc: 'Queries needing review' },
        { title: 'Pending Reviews', value: stats.pending_reviews, icon: ShieldCheck, glow: 'rose', desc: 'Validation backlog queue' },
      ]
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="High-level operational stats and extraction analytics for the DocAI knowledge network."
        action={
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sm font-semibold transition-all duration-300 shadow-lg text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Analytics</span>
          </button>
        }
      />

      {/* Hero Banner Panel */}
      <div className="relative glass-panel border-[#2A2A2A] rounded-3xl p-8 md:p-10 overflow-hidden shadow-2xl animate-slide-up">
        {/* Glow backdrop layer */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-slate-500/5 to-slate-700/5 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="max-w-3xl relative z-10 space-y-4">
          <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            isOnline ? 'bg-[#181818] text-slate-300 border border-[#2a2a2a]' : 'bg-slate-800 text-slate-400 border border-slate-700/50'
          }`}>
            Agentic RAG Engine: {isOnline ? 'Connected' : 'Offline Demo'}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Welcome back, <span className="text-slate-300">{user?.name || 'Employee'}</span>
          </h2>
          <p className="text-base md:text-lg text-slate-300 font-medium leading-relaxed">
            Turn scattered company policies, guidelines, and handbooks into trusted, searchable, citation-backed knowledge. Powered by dense vector matching, structured metadata extraction, and human-in-the-loop safety loops.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-semibold">Semantic Match Threshold: <strong className="text-white">0.45</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600 animate-pulse" />
              <span className="text-xs text-slate-400 font-semibold">Confidence Mode: <strong className="text-white">Reasoned Guardrails</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Failure banner */}
      {error && !stats && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <span>{error} Operating in standalone offline demonstration mode.</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading && !stats
          ? Array.from({ length: 7 }).map((_, i) => (
              <MetricCard
                key={i}
                title="Loading..."
                value={0}
                icon={FileText}
                loading={true}
              />
            ))
          : cardsInfo.map((card, idx) => (
              <MetricCard
                key={idx}
                title={card.title}
                value={card.value}
                icon={card.icon}
                glowColor={card.glow as 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose'}
                description={card.desc}
              />
            ))}
      </div>

      {/* Feature Highlight cards */}
      <div className="pt-4 space-y-6">
        <h3 className="text-xl font-bold text-white tracking-wide">
          Core System Capabilities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Citations */}
          <div className="glass-panel border-slate-800 rounded-2xl p-6 hover:border-[#333333] transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 text-slate-400 border border-[#2a2a2a] w-fit group-hover:scale-105 transition-transform duration-300">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Citation-Backed Answers</h4>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Every RAG response generates precise, chunk-level citations identifying the parent document, page, and semantic matching score.
              </p>
            </div>
            <div className="mt-6 text-xs text-slate-400 font-semibold group-hover:translate-x-1 transition-transform duration-300">
              Verify sources on Ask Agent &rarr;
            </div>
          </div>

          {/* Card 2: Human-Like Reasoning */}
          <div className="glass-panel border-slate-800 rounded-2xl p-6 hover:border-[#333333] transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 text-slate-400 border border-[#2a2a2a] w-fit group-hover:scale-105 transition-transform duration-300">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Document-Grounded Reasoning</h4>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Goes beyond standard keyword lookups. The LLM outlines its reasoning path, confirming logical inference boundaries and identifying unsupported claims.
              </p>
            </div>
            <div className="mt-6 text-xs text-slate-400 font-semibold group-hover:translate-x-1 transition-transform duration-300">
              Query the LLM &rarr;
            </div>
          </div>

          {/* Card 3: Review Queue */}
          <div className="glass-panel border-slate-800 rounded-2xl p-6 hover:border-[#333333] transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 text-slate-400 border border-[#2a2a2a] w-fit group-hover:scale-105 transition-transform duration-300">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Low-Confidence Review Queue</h4>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Queries returning low confidence scores are routed to a human validation desk, guaranteeing zero hallucinations make it to critical channels.
              </p>
            </div>
            <div className="mt-6 text-xs text-slate-400 font-semibold group-hover:translate-x-1 transition-transform duration-300">
              Audit queries &rarr;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
