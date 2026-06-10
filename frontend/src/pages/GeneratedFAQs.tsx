import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, Search, FileText, RefreshCw, ChevronDown, ChevronUp, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { getFAQs, getBackendHealthStatus, deleteFAQs } from '../api/client';
import { FAQItem } from '../types/api';

const GeneratedFAQs: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Track open/collapsed accordions for document groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const handleDeleteFAQs = async (docId: string, docName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to clear all generated FAQs for "${docName}"?`)) {
      try {
        await deleteFAQs(docId);
        setFaqs((prev) => prev.filter((faq) => faq.document_id !== docId));
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || err.message || "Failed to clear FAQs");
      }
    }
  };

  const fetchFAQs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFAQs();
      setFaqs(data.faqs || []);
    } catch (err) {
      console.error(err);
      setError('Could not fetch FAQs from the knowledge base.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  // Client-side deduplication of exact FAQ strings
  const deduplicatedFaqs = React.useMemo(() => {
    const seen = new Set<string>();
    return faqs.filter(item => {
      const uniqueKey = `${item.document_id}:${item.faq.trim().toLowerCase()}`;
      if (seen.has(uniqueKey)) {
        return false;
      }
      seen.add(uniqueKey);
      return true;
    });
  }, [faqs]);

  // Filter FAQs based on search
  const filteredFaqs = React.useMemo(() => {
    if (!searchTerm) return deduplicatedFaqs;
    const q = searchTerm.toLowerCase();
    return deduplicatedFaqs.filter(
      (item) =>
        item.faq.toLowerCase().includes(q) ||
        item.document.toLowerCase().includes(q)
    );
  }, [deduplicatedFaqs, searchTerm]);

  // Group FAQs by document
  const groupedFaqs = React.useMemo(() => {
    const groups: Record<string, { documentName: string; documentId: string; items: FAQItem[] }> = {};
    filteredFaqs.forEach((item) => {
      const docId = item.document_id;
      if (!groups[docId]) {
        groups[docId] = {
          documentName: item.document,
          documentId: docId,
          items: []
        };
      }
      groups[docId].items.push(item);
    });
    return Object.values(groups);
  }, [filteredFaqs]);

  // Expand all groups by default if search is active
  useEffect(() => {
    if (searchTerm) {
      const expanded: Record<string, boolean> = {};
      groupedFaqs.forEach((group) => {
        expanded[group.documentId] = true;
      });
      setOpenGroups(expanded);
    }
  }, [searchTerm, groupedFaqs]);

  const toggleGroup = (docId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-300 font-sans">
      <PageHeader
        title="Generated FAQs"
        description="Browse questions and answers automatically extracted from your documents during vectorization."
        action={
          <button
            onClick={fetchFAQs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sm font-semibold transition-all duration-300 shadow-lg text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Reload FAQs</span>
          </button>
        }
      />

      {/* Filter and stats row */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          <span className="font-bold text-slate-400 uppercase tracking-wider">
            Total Extracted FAQs:
          </span>
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-extrabold">
            {faqs.length}
          </span>
          {deduplicatedFaqs.length !== faqs.length && (
            <span className="text-slate-500 font-semibold">
              ({deduplicatedFaqs.length} unique)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2 w-full md:max-w-sm">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search FAQs or document names..."
            className="bg-transparent border-0 outline-none text-xs text-slate-100 placeholder-slate-500 w-full"
          />
        </div>
      </div>

      {getBackendHealthStatus() && (
        <div className="text-[10px] text-emerald-400 font-bold tracking-wider flex items-center gap-1.5 justify-end uppercase select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Showing live data from backend</span>
        </div>
      )}

      {/* Accordion Group display */}
      {loading ? (
        <LoadingSpinner message="Retrieving intelligence from knowledge network..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm text-center">
          {error}
        </div>
      ) : groupedFaqs.length > 0 ? (
        <div className="space-y-6">
          {groupedFaqs.map((group) => {
            const isOpen = !!openGroups[group.documentId];
            return (
              <div 
                key={group.documentId}
                className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-lg"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleGroup(group.documentId)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-[#141414]/40 hover:bg-[#141414] transition-colors border-b border-[#2A2A2A]/40 text-left text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-white truncate max-w-lg">
                      {group.documentName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-[#2A2A2A] text-slate-400 font-bold text-[9px] uppercase">
                      {group.items.length} FAQ{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="font-mono text-[10px] text-slate-600 hidden sm:inline">
                      ID: {group.documentId}
                    </span>
                    <button
                      onClick={(e) => handleDeleteFAQs(group.documentId, group.documentName, e)}
                      className="p-1.5 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-450 transition-colors border border-transparent hover:border-rose-900/30"
                      title="Clear FAQs for this document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="p-6 bg-slate-950/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="glass-panel border-slate-900 hover:border-cyan-500/20 rounded-xl p-4 transition-all duration-300 group flex items-start gap-3 text-xs bg-[#111111]/30"
                      >
                        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 shrink-0">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors leading-relaxed">
                            {item.faq}
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Extracted automatically on document upload.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={searchTerm ? 'No Matching FAQs' : 'No FAQs Available'}
          description={
            searchTerm
              ? `No extracted FAQs matched the query "${searchTerm}". Try refinement or query for general concepts.`
              : 'Upload policy or process documents in the "Upload Knowledge" portal to generate automatic FAQ listings.'
          }
          icon={Sparkles}
        />
      )}
    </div>
  );
};

export default GeneratedFAQs;
