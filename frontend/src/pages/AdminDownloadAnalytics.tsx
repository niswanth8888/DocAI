import React, { useState, useEffect } from 'react';
import { getAdminDownloads } from '../api/client';
import { DownloadHistoryItem } from '../types/api';
import { Download, Search, User, FileText, Calendar, AlertCircle } from 'lucide-react';

const AdminDownloadAnalytics: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadHistoryItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local filtering (since the endpoint doesn't support complex server filters, we filter client-side or display all)
  const [filterQuery, setFilterQuery] = useState('');

  const fetchDownloads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDownloads();
      setDownloads(data.downloads);
      setCount(data.count);
    } catch (err: any) {
      console.error(err);
      setError('Could not retrieve document download audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, []);

  const filteredDownloads = downloads.filter(item => {
    const q = filterQuery.toLowerCase();
    return (
      item.document.toLowerCase().includes(q) ||
      item.user_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full mx-auto space-y-6 text-slate-300 font-sans p-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-slate-400" />
          <span>Document Download Telemetry</span>
          <span className="px-2 py-0.5 rounded bg-[#141414] text-slate-400 border border-[#2a2a2a] text-[10px] font-bold">
            {count} total
          </span>
        </h1>
        <p className="text-xs text-slate-400">
          Trace document access logs: verify which employees downloaded knowledge source files, and audit IP compliance.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-4 flex gap-4 items-center text-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by document name or user name..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Loading document access logs...
        </div>
      ) : filteredDownloads.length === 0 ? (
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-12 text-center text-xs text-slate-500">
          No matching download events recorded in system log.
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#141414] border-b border-[#2A2A2A] text-slate-400 font-bold">
                  <th className="px-6 py-4.5">Document Title</th>
                  <th className="px-6 py-4.5">Downloaded By</th>
                  <th className="px-6 py-4.5">Time of Event</th>
                  <th className="px-6 py-4.5">Document ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]/40">
                {filteredDownloads.map((item) => (
                  <tr key={item.download_id} className="hover:bg-slate-900/10 transition-colors">
                    
                    {/* Document */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5 font-bold text-white">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-sm">{item.document}</span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{item.user_name}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-slate-400">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>
                          {new Date(item.downloaded_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Document ID */}
                    <td className="px-6 py-4 text-slate-500 text-[10px] font-mono">
                      {item.document_id}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDownloadAnalytics;
