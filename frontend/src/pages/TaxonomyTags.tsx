import React, { useState, useEffect, useCallback } from 'react';
import { Tags, Search, FileText, RefreshCw, Hash, Filter, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import TagBadge from '../components/TagBadge';
import { getTags, getBackendHealthStatus, deleteTags } from '../api/client';
import { TagItem } from '../types/api';

const TaxonomyTags: React.FC = () => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const handleDeleteTags = async (docId: string, docName: string) => {
    if (window.confirm(`Are you sure you want to clear all generated tags for "${docName}"?`)) {
      try {
        await deleteTags(docId);
        setTags((prev) => prev.filter((item) => item.document_id !== docId));
        setSelectedTag(null);
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || err.message || "Failed to clear tags");
      }
    }
  };

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTags();
      setTags(data.tags || []);
    } catch (err) {
      console.error(err);
      setError('Could not fetch taxonomy tags from the knowledge base.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Extract unique tag list for top pills
  const uniqueTagsList = React.useMemo(() => {
    const all = tags.map(t => t.tag.trim());
    return Array.from(new Set(all)).sort();
  }, [tags]);

  const filteredTags = React.useMemo(() => {
    return tags.filter((item) => {
      const matchesSearch = 
        item.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.document.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSelectedTag = 
        !selectedTag || item.tag.trim().toLowerCase() === selectedTag.toLowerCase();

      return matchesSearch && matchesSelectedTag;
    });
  }, [tags, searchTerm, selectedTag]);

  // Group tags by document
  const groupedTags = React.useMemo(() => {
    return filteredTags.reduce((acc, item) => {
      const docKey = item.document_id;
      if (!acc[docKey]) {
        acc[docKey] = {
          document: item.document,
          document_id: item.document_id,
          tags: []
        };
      }
      if (!acc[docKey].tags.includes(item.tag)) {
        acc[docKey].tags.push(item.tag);
      }
      return acc;
    }, {} as Record<string, { document: string; document_id: string; tags: string[] }>);
  }, [filteredTags]);

  const groupedList = Object.values(groupedTags);

  const handleSelectTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null); // Deselect
    } else {
      setSelectedTag(tag);
      setSearchTerm(''); // Clear text search to avoid conflicts
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-300 font-sans">
      <PageHeader
        title="Taxonomy Tags"
        description="Explore classifications and metadata terms extracted from documents to construct the RAG knowledge graph."
        action={
          <button
            onClick={fetchTags}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sm font-semibold transition-all duration-300 shadow-lg text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Reload Tags</span>
          </button>
        }
      />

      {/* Filter and stats row */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          <span className="font-bold text-slate-400 uppercase tracking-wider">
            Total Unique Tags:
          </span>
          <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-extrabold">
            {uniqueTagsList.length}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2 w-full md:max-w-sm">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedTag(null); // Clear pill filter if typing
            }}
            placeholder="Search tags or documents..."
            className="bg-transparent border-0 outline-none text-xs text-slate-100 placeholder-slate-500 w-full"
          />
        </div>
      </div>

      {/* Quick Tag Pills Panel */}
      {uniqueTagsList.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-5 space-y-3">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-violet-400" />
            <span>Filter by Semantic Term</span>
          </h4>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1 text-xs scrollbar-thin">
            {uniqueTagsList.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => handleSelectTag(tag)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                    isSelected
                      ? 'bg-violet-500/20 border-violet-500 text-violet-300 shadow-md font-bold'
                      : 'bg-[#141414] border-[#2A2A2A] text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {getBackendHealthStatus() && (
        <div className="text-[10px] text-emerald-400 font-bold tracking-wider flex items-center gap-1.5 justify-end uppercase select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Showing live data from backend</span>
        </div>
      )}

      {/* Grouped Display */}
      {loading ? (
        <LoadingSpinner message="Reconstructing knowledge taxonomy tree..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm text-center">
          {error}
        </div>
      ) : groupedList.length > 0 ? (
        <div className="space-y-6">
          {groupedList.map((group, idx) => (
            <div
              key={group.document_id}
              className="glass-panel border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-violet-500/20 animate-slide-up bg-[#0d0d0d] border border-[#2A2A2A]"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Document Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A2A2A]/60 pb-4 mb-4 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-slate-400 shrink-0">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate max-w-lg" title={group.document}>
                      {group.document}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                      ID: {group.document_id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteTags(group.document_id, group.document)}
                    className="p-1.5 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-450 transition-colors border border-transparent hover:border-rose-900/30"
                    title="Clear tags for this document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] border border-[#2A2A2A] font-bold text-slate-400">
                    <Hash className="w-3.5 h-3.5 text-violet-400" />
                    <span>{group.tags.length} Tags</span>
                  </div>
                </div>
              </div>

              {/* Tag Badges Grid */}
              <div className="flex flex-wrap gap-2.5">
                {group.tags.map((tag, tIdx) => (
                  <button
                    key={tIdx}
                    onClick={() => handleSelectTag(tag)}
                    className="cursor-pointer"
                  >
                    <TagBadge
                      label={tag}
                      variant={tag === selectedTag ? 'violet' : 'cyan'}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={searchTerm || selectedTag ? 'No Matching Tags' : 'No Taxonomy Tags'}
          description={
            searchTerm || selectedTag
              ? `No tags or parent documents matched your filter options.`
              : 'Knowledge taxonomy requires document parsing. Upload files to generate automatic tags.'
          }
          icon={Tags}
        />
      )}
    </div>
  );
};

export default TaxonomyTags;
