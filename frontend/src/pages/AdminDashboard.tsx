import React, { useState, useEffect } from 'react';
import { getAdminDashboard } from '../api/client';
import { AdminDashboardStats } from '../types/api';
import { Users, Search, Download, ShieldAlert, FileText, Activity, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminDashboard();
        setStats(data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load administrative workspace metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500 text-xs font-sans">Loading admin dashboard workspace...</div>;
  }

  if (error || !stats) {
    return (
      <div className="p-4 mx-6 my-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-sans">
        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
        <span>{error || 'An unexpected error occurred loading admin stats.'}</span>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-6 text-slate-300 font-sans p-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-500" />
          <span>Administrative Console Dashboard</span>
        </h1>
        <p className="text-xs text-slate-400">
          Global operations telemetry: inspect active profiles, search volumes, low-confidence warning distributions, and active user requests.
        </p>
      </div>

      {/* Grid: Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-4.5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Registered Users</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-none">{stats.total_users}</h2>
            <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-500" />
              <span>{stats.active_users} active this cycle</span>
            </p>
          </div>
        </div>

        {/* Total Searches */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-4.5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Search Traffic</span>
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-none">{stats.total_searches}</h2>
            <p className="text-[9px] text-slate-500 mt-1">
              <span className="text-cyan-400 font-bold">{stats.searches_today}</span> queries submitted today
            </p>
          </div>
        </div>

        {/* Total Downloads */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-4.5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Document Accesses</span>
            <Download className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-none">{stats.total_downloads}</h2>
            <p className="text-[9px] text-slate-500 mt-1">
              Source file downloads recorded
            </p>
          </div>
        </div>

        {/* Low Confidence / Reviews */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-4.5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Quality Incidents</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-none">{stats.low_confidence_searches + stats.pending_reviews}</h2>
            <p className="text-[9px] text-red-400 mt-1 flex items-center gap-1.5 font-bold">
              <span>{stats.low_confidence_searches} low score</span>
              <span>•</span>
              <span>{stats.pending_reviews} review tasks</span>
            </p>
          </div>
        </div>

      </div>

      {/* Grid: Middle Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Top items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Questions Card */}
          <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
              <Search className="w-4 h-4 text-cyan-500" />
              <span>Frequent Knowledge Queries</span>
            </h3>
            {stats.top_questions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No query logs recorded.</p>
            ) : (
              <div className="divide-y divide-[#2A2A2A]/40 text-xs">
                {stats.top_questions.map((q, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center gap-4">
                    <span className="text-slate-300 font-medium truncate">{q.question}</span>
                    <span className="shrink-0 bg-slate-900 border border-[#2A2A2A] text-white px-2 py-0.5 rounded font-bold text-[10px]">
                      {q.count} calls
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Documents Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Documents */}
            <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>Frequently Hit Documents</span>
              </h3>
              {stats.top_documents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No file downloads or searches matched.</p>
              ) : (
                <div className="divide-y divide-[#2A2A2A]/40 text-xs">
                  {stats.top_documents.map((d, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center gap-4">
                      <span className="text-slate-300 truncate font-medium">{d.document}</span>
                      <span className="shrink-0 bg-slate-900 border border-[#2A2A2A] text-slate-400 px-2 py-0.5 rounded text-[9px]">
                        {d.count} hits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Active Users */}
            <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
                <Users className="w-4 h-4 text-purple-500" />
                <span>Most Active Accounts</span>
              </h3>
              {stats.top_users.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No user activity recorded yet.</p>
              ) : (
                <div className="divide-y divide-[#2A2A2A]/40 text-xs">
                  {stats.top_users.map((u, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center gap-4">
                      <span className="text-slate-300 font-medium">{u.username}</span>
                      <span className="shrink-0 bg-slate-900 border border-[#2A2A2A] text-slate-400 px-2 py-0.5 rounded text-[9px]">
                        {u.count} tasks
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: Recent activity stream */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Telemetry Operations Log</span>
          </h3>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 text-[11px] scrollbar-thin">
            {stats.recent_activity.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No backend operations stream found.</p>
            ) : (
              stats.recent_activity.map((act) => (
                <div key={act.activity_id} className="border-l border-[#2A2A2A] pl-3 relative space-y-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 absolute -left-1 top-1.5" />
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span className="font-bold text-slate-400">{act.username}</span>
                    <span>{new Date(act.timestamp).toLocaleTimeString(undefined, { timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-slate-300 leading-normal">{act.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-[#2A2A2A]">
            <Link 
              to="/admin/searches" 
              className="text-[11px] text-cyan-400 hover:underline font-bold flex items-center justify-center gap-1 py-1"
            >
              <span>Explore full audit logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
