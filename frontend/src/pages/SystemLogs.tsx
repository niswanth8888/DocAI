import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal,
  Cpu,
  RefreshCw,
  Clock,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { getLogs, getStructuredLogs, getFAQs, getTags, getDocuments, getBackendHealthStatus, API_BASE_URL } from '../api/client';
import { LogItem, StructuredLogItem } from '../types/api';
import { formatDate, formatJSON, formatLabel } from '../utils/formatters';

const SystemLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'structured' | 'technical'>('structured');
  
  // States
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [structuredLogs, setStructuredLogs] = useState<StructuredLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Expanded payload state for technical logs
  const [expandedPayloads, setExpandedPayloads] = useState<Record<number, boolean>>({});

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debug Panel States
  const [debugOpen, setDebugOpen] = useState<boolean>(false);
  const [debugData, setDebugData] = useState<{
    baseUrl: string;
    lastFetch: string;
    faqsCount: number;
    tagsCount: number;
    docsCount: number;
    connected: boolean;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'technical') {
        const data = await getLogs();
        setLogs(data.logs || []);
      } else {
        const data = await getStructuredLogs();
        setStructuredLogs(data.structured_logs || []);
      }

      // Fetch debug counts
      try {
        const [faqsData, tagsData, docsData] = await Promise.all([
          getFAQs(),
          getTags(),
          getDocuments()
        ]);
        setDebugData({
          baseUrl: API_BASE_URL,
          lastFetch: new Date().toLocaleTimeString(),
          faqsCount: faqsData.count || 0,
          tagsCount: tagsData.count || 0,
          docsCount: docsData.count || 0,
          connected: true
        });
      } catch (err) {
        console.warn('API debug data fetch failed:', err);
        setDebugData(prev => ({
          baseUrl: API_BASE_URL,
          lastFetch: new Date().toLocaleTimeString(),
          faqsCount: prev?.faqsCount || 0,
          tagsCount: prev?.tagsCount || 0,
          docsCount: prev?.docsCount || 0,
          connected: false
        }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch system logs from the backend endpoints.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePayload = (idx: number) => {
    setExpandedPayloads(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getLogColorStyles = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('error') || t.includes('fail') || t.includes('low_confidence')) {
      return 'bg-rose-500/10 text-rose-450 border-rose-500/20';
    }
    if (t.includes('warn')) {
      return 'bg-amber-500/10 text-amber-450 border-amber-500/20';
    }
    if (t.includes('upload') || t.includes('ingest') || t.includes('sync')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
    if (t.includes('embedding') || t.includes('chunk')) {
      return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700/60';
  };

  // Extract unique event types for filters
  const uniqueEventTypes = React.useMemo(() => {
    const types = logs.map(l => l.event_type);
    return Array.from(new Set(types)).sort();
  }, [logs]);

  // Client side filtering for technical logs
  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.event_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [logs, searchTerm, eventTypeFilter]);

  // Client side paginating for technical logs
  const paginatedLogs = React.useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLogs.slice(start, start + limit);
  }, [filteredLogs, page]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-350 font-sans">
      <PageHeader
        title="System Logs"
        description="Inspect operations pipeline triggers, extraction audits, vector calculations, and server lifecycle logs."
        action={
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sm font-semibold transition-all duration-300 shadow-lg text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Reload Logs</span>
          </button>
        }
      />

      {/* Tabs Navigator */}
      <div className="flex border-b border-[#2A2A2A] gap-6">
        <button
          onClick={() => {
            setActiveTab('structured');
            setPage(1);
          }}
          className={`pb-4 text-sm font-extrabold tracking-wide border-b-2 transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'structured'
              ? 'border-slate-200 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Structured Intelligence Logs</span>
        </button>
        
        <button
          onClick={() => {
            setActiveTab('technical');
            setPage(1);
          }}
          className={`pb-4 text-sm font-extrabold tracking-wide border-b-2 transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'technical'
              ? 'border-slate-200 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Technical Logs</span>
        </button>
      </div>

      {/* Error notify */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Technical Logs Filter Toolbar */}
      {activeTab === 'technical' && !loading && logs.length > 0 && (
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
              placeholder="Search logs message or event type..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {uniqueEventTypes.length > 0 && (
            <div className="w-full sm:w-56">
              <select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400"
              >
                <option value="all">All event types</option>
                {uniqueEventTypes.map(type => (
                  <option key={type} value={type}>{formatLabel(type)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Content canvases */}
      {loading ? (
        <LoadingSpinner message="Querying system logging buffer..." />
      ) : activeTab === 'structured' ? (
        /* Structured logs */
        structuredLogs.length > 0 ? (
          <div className="space-y-6">
            {structuredLogs.map((log) => (
              <div
                key={log.document_id}
                className="glass-panel border-[#2A2A2A] bg-[#0d0d0d] border rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
              >
                {/* Document details bar */}
                <div className="px-6 py-4 bg-slate-950/70 border-b border-[#2A2A2A] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4.5 h-4.5 text-cyan-400" />
                    <h4 className="font-bold text-white">
                      {log.document}
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Document ID: {log.document_id}
                  </span>
                </div>

                {/* Structured Text Console */}
                <div className="p-6 bg-slate-950/30 overflow-x-auto">
                  <pre className="text-xs text-slate-350 leading-relaxed font-medium whitespace-pre-wrap font-mono select-all">
                    {log.structured_log}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Structured Logs"
            description="System logs are currently empty. Upload files to generate structured document summaries and FAQs."
            icon={Terminal}
          />
        )
      ) : (
        /* Technical logs */
        filteredLogs.length > 0 ? (
          <div className="space-y-4">
            {paginatedLogs.map((log, idx) => {
              const globalIndex = (page - 1) * limit + idx;
              const isExpanded = !!expandedPayloads[globalIndex];
              return (
                <div
                  key={globalIndex}
                  className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-5 hover:border-slate-800 transition-all duration-200 animate-slide-up shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 text-xs">
                    <div className="flex items-start gap-4">
                      {/* Event Type tag */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider shrink-0 ${getLogColorStyles(log.event_type)}`}>
                        {formatLabel(log.event_type)}
                      </span>

                      {/* Log Message */}
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-200">
                          {log.message}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Drawer Toggle */}
                    {Object.keys(log.payload).length > 0 && (
                      <button
                        onClick={() => togglePayload(globalIndex)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-slate-500 text-xs font-bold text-slate-450 hover:text-white transition-all shrink-0"
                      >
                        <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Expanded Payload Code Block */}
                  {isExpanded && Object.keys(log.payload).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#2A2A2A]/50 animate-slide-up">
                      <pre className="p-4 bg-slate-950 rounded-xl border border-slate-900 text-xs leading-relaxed text-slate-350 overflow-x-auto select-all font-mono">
                        <code>{formatJSON(log.payload)}</code>
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={searchTerm || eventTypeFilter !== 'all' ? 'No Matching Logs' : 'No Technical Logs'}
            description={
              searchTerm || eventTypeFilter !== 'all'
                ? 'No technical logs matched your search or event-type filters.'
                : 'System operations logs are currently clear. Operations such as uploads, queries, and errors trigger logger nodes.'
            }
            icon={Cpu}
          />
        )
      )}

      {/* Technical Logs Pagination */}
      {activeTab === 'technical' && filteredLogs.length > limit && (
        <div className="flex justify-center items-center gap-3 text-xs pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-[#0d0d0d] border border-[#2A2A2A] text-white hover:border-slate-500 disabled:opacity-40 transition-all font-bold"
          >
            Prev
          </button>
          <span className="text-slate-405">
            Page {page} of {Math.ceil(filteredLogs.length / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= filteredLogs.length}
            className="px-4 py-2 rounded-xl bg-[#0d0d0d] border border-[#2A2A2A] text-white hover:border-slate-500 disabled:opacity-40 transition-all font-bold"
          >
            Next
          </button>
        </div>
      )}

      {/* API Debug Panel */}
      <div className="mt-8 border border-[#2A2A2A] rounded-2xl bg-[#0D0D0D] overflow-hidden shadow-xl">
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-[#111111] transition-all border-0"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>API Debug Info</span>
          </div>
          <span>{debugOpen ? 'Hide' : 'Show'}</span>
        </button>

        {debugOpen && (
          <div className="px-5 pb-5 pt-2 border-t border-[#2A2A2A] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-400 bg-slate-950/20 animate-slide-up">
            <div className="space-y-2">
              <div>
                <span className="text-slate-500">API Base URL:</span>
                <span className="text-slate-300 ml-2 block truncate font-mono">{debugData?.baseUrl}</span>
              </div>
              <div>
                <span className="text-slate-500">Last Fetch Timestamp:</span>
                <span className="text-slate-300 ml-2">{debugData?.lastFetch || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-500">Documents Count:</span>
                <span className="text-slate-300 ml-2">{debugData?.docsCount ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-500">FAQs Count:</span>
                <span className="text-slate-300 ml-2">{debugData?.faqsCount ?? 0}</span>
              </div>
              <div>
                <span className="text-slate-500">Tags Count:</span>
                <span className="text-slate-300 ml-2">{debugData?.tagsCount ?? 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-500">Backend Connected:</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                  debugData?.connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                }`}>
                  {debugData?.connected ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Connection State:</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                  getBackendHealthStatus() ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                }`}>
                  {getBackendHealthStatus() ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
