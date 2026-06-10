import React, { useState, useEffect } from 'react';
import { getSearchHistory, deleteSearchHistory } from '../api/client';
import { SearchHistoryItem } from '../types/api';
import { Search, Trash2, Calendar, FileText, ChevronDown, ChevronUp, Download, Eye, AlertCircle, Compass } from 'lucide-react';

const SearchHistory: React.FC = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, filter & page settings
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Track expanded cards
  const [expandedSearches, setExpandedSearches] = useState<Record<string, boolean>>({});

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        skip: (page - 1) * limit,
        limit: limit
      };
      if (searchQuery) params.query = searchQuery;
      if (confidenceFilter !== 'all') params.confidence = confidenceFilter;

      const data = await getSearchHistory(params);
      setHistory(data.history);
      setCount(data.count);
    } catch (err: any) {
      console.error(err);
      setError('Could not retrieve search history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, confidenceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleDelete = async (searchId: string) => {
    if (!window.confirm('Are you sure you want to delete this search from your history?')) return;
    try {
      await deleteSearchHistory(searchId);
      setHistory(history.filter(item => item.search_id !== searchId));
      setCount(prev => prev - 1);
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete query record.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSearches(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getConfidenceBadgeColor = (confidence: 'High' | 'Medium' | 'Low') => {
    switch (confidence) {
      case 'High':
        return 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400';
      case 'Medium':
        return 'bg-amber-950/40 border-amber-900/40 text-amber-400';
      case 'Low':
        return 'bg-rose-950/40 border-rose-900/40 text-rose-400';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-slate-300 font-sans p-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-slate-400" />
            <span>Search & Query History</span>
          </h1>
          <p className="text-xs text-slate-400">
            Access previous answers, review retrieval confidence scores, and read cited passages.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center text-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords or queries..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        <div className="flex gap-4">
          <div className="w-44">
            <select
              value={confidenceFilter}
              onChange={(e) => {
                setConfidenceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
            >
              <option value="all">All Confidence Levels</option>
              <option value="High">High Confidence</option>
              <option value="Medium">Medium Confidence</option>
              <option value="Low">Low Confidence</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold tracking-wide transition-all"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Query List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Loading history entries...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-12 text-center text-xs text-slate-500">
          No matching queries found in your history log.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => {
            const isExpanded = !!expandedSearches[item.search_id];
            return (
              <div 
                key={item.search_id} 
                className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all hover:border-slate-700"
              >
                
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs mb-3">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-white text-sm tracking-tight">{item.question}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span>•</span>
                      <span className="uppercase tracking-wider font-bold">Mode: {item.answer_mode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getConfidenceBadgeColor(item.confidence)}`}>
                      {item.confidence} ({(item.confidence_score * 100).toFixed(0)}%)
                    </span>
                    <button
                      onClick={() => handleDelete(item.search_id)}
                      className="p-1.5 rounded-lg border border-[#2A2A2A] hover:bg-rose-950/20 hover:border-rose-900/40 text-slate-500 hover:text-rose-400 transition-all"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Answer Preview */}
                <div className={`p-3.5 rounded-xl bg-[#141414]/50 border border-[#2A2A2A]/40 text-slate-300 text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {item.answer}
                </div>

                {/* Actions and Expansion toggles */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#2A2A2A]/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(item.search_id)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Collapse Citations</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Show Citations ({item.sources?.length || 0})</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {item.primary_document && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-[#141414] px-3 py-1 rounded-lg border border-[#2A2A2A]">
                      <FileText className="w-3 h-3 text-slate-500" />
                      <span className="max-w-[150px] truncate">{item.primary_document}</span>
                    </div>
                  )}
                </div>

                {/* Citations & sources detailed expansion */}
                {isExpanded && item.sources && item.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A2A]/60 space-y-3.5 text-xs">
                    <h4 className="font-bold text-white text-[11px] tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Retrieved Reference Citations</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {item.sources.map((source, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-[#141414] border border-[#2A2A2A]/60 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-[11px] truncate max-w-[280px]">
                              [{idx + 1}] {source.document} (Page {source.page || 'N/A'})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-500">
                                Match: {(source.similarity_score * 100).toFixed(0)}%
                              </span>
                              {source.download_url && (
                                <a
                                  href={source.download_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                                  title="Download cited document"
                                >
                                  <Download className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-400 leading-normal text-[11px] border-l-2 border-slate-700 pl-3 italic">
                            "{source.evidence}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {count > limit && (
        <div className="flex justify-center items-center gap-3 pt-4 text-xs">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-[#0d0d0d] border border-[#2A2A2A] text-white hover:border-slate-500 disabled:opacity-40 transition-all font-semibold"
          >
            Prev
          </button>
          <span className="text-slate-400">
            Page {page} of {Math.ceil(count / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= count}
            className="px-4 py-2 rounded-xl bg-[#0d0d0d] border border-[#2A2A2A] text-white hover:border-slate-500 disabled:opacity-40 transition-all font-semibold"
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
};

export default SearchHistory;
