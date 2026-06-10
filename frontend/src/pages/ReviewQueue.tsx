import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Clock,
  UserCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfidenceBadge from '../components/ConfidenceBadge';
import SourceCard from '../components/SourceCard';
import StatusPill from '../components/StatusPill';
import { getReviews } from '../api/client';
import { ReviewItem } from '../types/api';
import { formatDate } from '../utils/formatters';

const ReviewQueue: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 5;

  // Collapse/Expand state for source chunks
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviews();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error(err);
      setError('Could not fetch items from the review queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle local queue approval simulations
  const handleApprove = (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.review_id !== reviewId));
    alert('Query response approved and synced to knowledge base.');
  };

  const handleReject = (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.review_id !== reviewId));
    alert('Low confidence query response dismissed from queue.');
  };

  const toggleSources = (reviewId: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  // Filter reviews client-side
  const filteredReviews = React.useMemo(() => {
    return reviews.filter(item => {
      const matchesSearch = 
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesConf = confidenceFilter === 'all' || 
        item.confidence.toLowerCase() === confidenceFilter.toLowerCase();

      return matchesSearch && matchesConf;
    });
  }, [reviews, searchTerm, confidenceFilter]);

  // Paginated reviews
  const paginatedReviews = React.useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReviews.slice(start, start + limit);
  }, [filteredReviews, page]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-300 font-sans">
      <PageHeader
        title="Review Queue"
        description="Verify and correct low-confidence agent responses. Ensuring zero hallucinations reach production."
        action={
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sm font-semibold transition-all duration-300 shadow-lg text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync Queue</span>
          </button>
        }
      />

      {/* Safety Audit Banner */}
      <div className="glass-panel border-[#2A2A2A] bg-[#0d0d0d] border rounded-3xl p-6 flex flex-col md:flex-row gap-5 items-start justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/5 blur-[50px] pointer-events-none rounded-full" />
        
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-450 border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div className="space-y-1 text-xs">
            <h3 className="text-sm font-bold text-white">Human-In-The-Loop Safety Guardrails</h3>
            <p className="text-slate-400 leading-relaxed max-w-2xl font-medium">
              DocAI automatically captures queries with confidence values below the configured threshold (0.45) or matching parameters that suggest unsupported facts. Administrators must audit these outputs to maintain the integrity of the knowledge graph.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] px-3.5 py-1.5 rounded-full shrink-0 text-xs">
          <span className="font-bold text-slate-400">Queue Backlog:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20 font-extrabold">
            {reviews.length}
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center text-xs shadow-md">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search within captured queries, flagged answers..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={confidenceFilter}
            onChange={(e) => {
              setConfidenceFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400"
          >
            <option value="all">All confidence ratings</option>
            <option value="high">High Confidence</option>
            <option value="medium">Medium Confidence</option>
            <option value="low">Low Confidence</option>
          </select>
        </div>
      </div>

      {/* Reviews Queue List */}
      {loading ? (
        <LoadingSpinner message="Querying RAG safety buffer..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm text-center">
          {error}
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="space-y-6">
          {paginatedReviews.map((review) => {
            const showSources = !!expandedSources[review.review_id];
            return (
              <div
                key={review.review_id}
                className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 space-y-6 hover:border-slate-700/60 transition-all duration-300 shadow-xl"
              >
                {/* Top Meta info row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2A] pb-4">
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge confidence={review.confidence} score={review.confidence_score} />
                    <StatusPill status={review.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span>Captured: {formatDate(review.created_at)}</span>
                  </div>
                </div>

                {/* QA display panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Query Prompt
                    </span>
                    <div className="p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] font-bold text-slate-100">
                      {review.question}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Generated Answer (Flagged)
                    </span>
                    <div className="p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] text-slate-350 leading-relaxed font-medium">
                      {review.answer}
                    </div>
                  </div>
                </div>

                {/* Safety Issue Explanation */}
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-350/95 leading-relaxed font-medium flex items-start gap-2.5">
                  <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-400">Audit Triggered Reason: </span>
                    {review.reason}
                  </div>
                </div>

                {/* Retrieved sources toggle */}
                {review.retrieved_sources && review.retrieved_sources.length > 0 && (
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSources(review.review_id)}
                      className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 uppercase tracking-wider"
                    >
                      {showSources ? (
                        <>
                          <ChevronUp className="w-4 h-4 text-cyan-400" />
                          <span>Hide Retrieved Context Chunks</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-cyan-400" />
                          <span>Inspect Retrieved Context Chunks ({review.retrieved_sources.length})</span>
                        </>
                      )}
                    </button>

                    {showSources && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
                        {review.retrieved_sources.map((src, i) => (
                          <SourceCard key={i} source={src} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Operations Bar */}
                <div className="pt-4 border-t border-[#2A2A2A]/60 flex flex-wrap gap-3 items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {review.review_id}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(review.review_id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] hover:bg-rose-950/20 border border-[#2A2A2A] hover:border-rose-900/40 text-slate-400 hover:text-rose-450 transition-all font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Dismiss Query</span>
                    </button>
                    
                    <button
                      onClick={() => handleApprove(review.review_id)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold transition-all shadow-md"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Approve Response</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Review Queue Clear"
          description="Outstanding agent questions have been audited and resolved. All running queries meet system confidence thresholds."
          icon={ShieldCheck}
        />
      )}

      {/* Pagination */}
      {filteredReviews.length > limit && (
        <div className="flex justify-center items-center gap-3 text-xs">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-[#0d0d0d] border border-[#2A2A2A] text-white hover:border-slate-500 disabled:opacity-40 transition-all font-bold"
          >
            Prev
          </button>
          <span className="text-slate-400">
            Page {page} of {Math.ceil(filteredReviews.length / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= filteredReviews.length}
            className="px-4 py-2 rounded-xl bg-[#0d0d0d] border border-[#2A2A2A] text-white hover:border-slate-500 disabled:opacity-40 transition-all font-bold"
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
};

export default ReviewQueue;
