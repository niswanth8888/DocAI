import React, { useState, useEffect, useCallback } from 'react';
import {
  Edit3,
  Download,
  RefreshCw,
  AlertOctagon,
  GitMerge,
  FileSpreadsheet
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  getQualityDashboard,
  getQualitySourceOfTruth,
  getQualityDuplicates,
  getQualityConflicts,
  getQualityKnowledgeGaps,
  patchDocumentMetadata,
  API_BASE_URL
} from '../api/client';
import {
  QualityDashboardResponse,
  SourceOfTruthDocument,
  DuplicateCandidate,
  PolicyConflict,
  KnowledgeGap
} from '../types/api';
import { formatPercent } from '../utils/formatters';

const KnowledgeQuality: React.FC = () => {
  const [dashboard, setDashboard] = useState<QualityDashboardResponse | null>(null);
  const [sotDocs, setSotDocs] = useState<SourceOfTruthDocument[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [conflicts, setConflicts] = useState<PolicyConflict[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'duplicates' | 'conflicts' | 'gaps'>('duplicates');
  const [sotSearch, setSotSearch] = useState('');

  const filteredSotDocs = React.useMemo(() => {
    if (!sotSearch) return sotDocs;
    const q = sotSearch.toLowerCase();
    return sotDocs.filter(d => 
      d.document.toLowerCase().includes(q) ||
      (d.department && d.department.toLowerCase().includes(q))
    );
  }, [sotDocs, sotSearch]);

  // Edit Metadata Modal State
  const [editingDoc, setEditingDoc] = useState<SourceOfTruthDocument | null>(null);
  const [editForm, setEditForm] = useState({
    department: '',
    document_type: '',
    owner: '',
    authority_level: 'standard',
    version: 'v1',
    status: 'active',
    review_status: 'pending'
  });
  const [savingMetadata, setSavingMetadata] = useState<boolean>(false);

  const fetchQualityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, sotRes, dupRes, confRes, gapRes] = await Promise.all([
        getQualityDashboard(),
        getQualitySourceOfTruth(),
        getQualityDuplicates(),
        getQualityConflicts(),
        getQualityKnowledgeGaps()
      ]);
      setDashboard(dashRes);
      setSotDocs(sotRes.source_of_truth_documents || []);
      setDuplicates(dupRes.duplicates || []);
      setConflicts(confRes.conflicts || []);
      setGaps(gapRes.knowledge_gaps || []);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve enterprise knowledge statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQualityData();
  }, [fetchQualityData]);

  const handleOpenEdit = (doc: SourceOfTruthDocument) => {
    setEditingDoc(doc);
    setEditForm({
      department: doc.department || 'General',
      document_type: doc.document_type || 'Document',
      owner: 'Unassigned', // Backend placeholder or standard default
      authority_level: doc.authority_level || 'standard',
      version: 'v1',
      status: doc.status || 'active',
      review_status: doc.review_status || 'pending'
    });
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    
    setSavingMetadata(true);
    try {
      await patchDocumentMetadata(editingDoc.document_id, editForm);
      setEditingDoc(null);
      await fetchQualityData();
    } catch (err) {
      console.error(err);
      alert('Failed to update document metadata. Please ensure the backend server is online.');
    } finally {
      setSavingMetadata(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'text-rose-450 bg-rose-500/10 border-rose-500/20';
      case 'medium':
        return 'text-amber-450 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-350">
      <PageHeader
        title="Knowledge Quality"
        description="Monitor RAG knowledge health, conflict warnings, version tracking, and source-of-truth score configurations."
        action={
          <button
            onClick={fetchQualityData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sm font-semibold transition-all duration-300 shadow-lg text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Audit Metrics</span>
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <span>{error} Rendering offline cached parameters.</span>
        </div>
      )}

      {/* A. Quality Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#2A2A2A] relative overflow-hidden group">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Average Health</span>
          <h3 className="text-3xl font-black text-white mt-2">
            {dashboard ? formatPercent(dashboard.average_knowledge_health) : 'N/A'}
          </h3>
          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
            Overall Doc Quality Score
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#2A2A2A] relative overflow-hidden group">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">SOT Documents</span>
          <h3 className="text-3xl font-black text-white mt-2">
            {dashboard ? dashboard.official_documents : 0}
          </h3>
          <div className="text-[10px] text-cyan-400 font-semibold mt-1">
            Official Sources Ranked
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#2A2A2A] relative overflow-hidden group">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Conflicts Found</span>
          <h3 className={`text-3xl font-black mt-2 ${dashboard && dashboard.conflict_candidates > 0 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            {dashboard ? dashboard.conflict_candidates : 0}
          </h3>
          <div className="text-[10px] text-rose-400 font-semibold mt-1">
            Contradiction Alerts
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#2A2A2A] relative overflow-hidden group">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Knowledge Gaps</span>
          <h3 className="text-3xl font-black text-white mt-2">
            {dashboard ? dashboard.knowledge_gaps : 0}
          </h3>
          <div className="text-[10px] text-amber-400 font-semibold mt-1">
            Failed Query Topics
          </div>
        </div>
      </div>

      {/* B. Source of Truth Ranking Table */}
      <div className="glass-panel border-[#2A2A2A] rounded-2xl p-6 bg-[#0D0D0D]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Source of Truth & Metadata Routing</h3>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={sotSearch}
              onChange={(e) => setSotSearch(e.target.value)}
              placeholder="Search SOT documents..."
              className="pl-3 pr-3 py-1.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 text-xs w-44"
            />
            <span className="text-xs text-slate-500">Sorted by Rank</span>
          </div>
        </div>

        {loading && filteredSotDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">Loading document indices...</div>
        ) : filteredSotDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No matching documents found in database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Dept / Type</th>
                  <th className="py-3 px-4">Authority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Review</th>
                  <th className="py-3 px-4 text-center">SOT Score</th>
                  <th className="py-3 px-4 text-center">Health</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredSotDocs.map((doc) => (
                  <tr key={doc.document_id} className="hover:bg-[#141414]/30 transition-all duration-200">
                    <td className="py-3.5 px-4 font-bold text-slate-100 max-w-[200px] truncate">
                      {doc.document}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200">{doc.department}</div>
                      <div className="text-slate-500 text-[10px]">{doc.document_type}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        doc.authority_level === 'official' ? 'bg-emerald-500/10 text-emerald-400' :
                        doc.authority_level === 'approved' ? 'bg-cyan-500/10 text-cyan-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {doc.authority_level}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        doc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                        doc.status === 'outdated' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        doc.review_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        doc.review_status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {doc.review_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-cyan-400">
                      {formatPercent(doc.source_of_truth_score)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                      {formatPercent(doc.knowledge_health_score)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#2A2A2A] text-slate-400 hover:text-white transition-all duration-200"
                          title="Edit Metadata"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`${API_BASE_URL}/documents/${doc.document_id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#2A2A2A] text-slate-400 hover:text-white transition-all duration-200"
                          title="Download Original"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit tabs toggle */}
      <div className="flex border-b border-[#2A2A2A]">
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === 'duplicates'
              ? 'border-cyan-400 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Duplicate Candidates ({duplicates.length})
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === 'conflicts'
              ? 'border-rose-500 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Contradiction Conflicts ({conflicts.length})
        </button>
        <button
          onClick={() => setActiveTab('gaps')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
            activeTab === 'gaps'
              ? 'border-amber-500 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Knowledge Gaps ({gaps.length})
        </button>
      </div>

      {/* Audit panels content */}
      <div className="glass-panel border-[#2A2A2A] rounded-2xl p-6 bg-[#0D0D0D]">
        {activeTab === 'duplicates' && (
          <div className="space-y-4">
            {duplicates.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No duplicate documents detected.</div>
            ) : (
              duplicates.map((dup, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#2A2A2A] bg-[#141414]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200">
                      <GitMerge className="w-4 h-4 text-violet-400" />
                      <span className="font-bold text-xs">{dup.document_a.document}</span>
                      <span className="text-slate-600 text-xs font-semibold">&harr;</span>
                      <span className="font-bold text-xs">{dup.document_b.document}</span>
                    </div>
                    <span className="text-xs font-extrabold text-violet-400">
                      Similarity: {formatPercent(dup.similarity_score)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 text-xs text-slate-300">
                    <strong className="text-violet-300">Auditor Recommendation:</strong> {dup.recommendation}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div className="space-y-4">
            {conflicts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No contradiction conflicts detected between policies.</div>
            ) : (
              conflicts.map((conf, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#2A2A2A] bg-[#141414]/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white capitalize">{conf.topic}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getSeverityColor(conf.severity)}`}>
                      {conf.severity} Severity
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                    {conf.documents.map((cdoc, cidx) => (
                      <div key={cidx} className="p-3 rounded-lg bg-slate-950/30 border border-[#222222]">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1 truncate">{cdoc.document}</div>
                        <p className="text-xs italic text-slate-300">"{cdoc.claim}"</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 text-xs text-slate-300">
                    <strong className="text-rose-400">Resolution Guidelines:</strong> {conf.recommendation}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-4">
            {gaps.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No knowledge gaps identified from failed questions.</div>
            ) : (
              gaps.map((gap, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#2A2A2A] bg-[#141414]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white capitalize">{gap.topic}</h4>
                    <span className="text-xs font-semibold text-amber-500">
                      Failed Attempts: {gap.frequency}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Failed Queries:</div>
                    <ul className="list-disc pl-4 text-xs space-y-0.5 text-slate-300 italic">
                      {gap.questions.map((q, qidx) => (
                        <li key={qidx}>"{q}"</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 text-xs text-slate-300">
                    <strong className="text-amber-400">Content Requirement:</strong> {gap.recommendation}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Document Lifecycle Statement Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-[#222222] shadow-xl text-center">
        <p className="text-xs font-medium text-slate-400 max-w-4xl mx-auto italic leading-relaxed">
          “Vector databases retrieve similar chunks. DocAI manages the enterprise knowledge lifecycle by ranking trusted source documents, detecting duplicates and conflicts, identifying knowledge gaps, monitoring document health, and routing low-confidence answers for review.”
        </p>
      </div>

      {/* EDIT METADATA MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <h4 className="text-sm font-bold text-white truncate max-w-[280px]">
                Edit Metadata: {editingDoc.document}
              </h4>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-slate-500 hover:text-white transition-colors duration-200"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveMetadata} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Department</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Document Type</label>
                <input
                  type="text"
                  value={editForm.document_type}
                  onChange={(e) => setEditForm({ ...editForm, document_type: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Owner</label>
                <input
                  type="text"
                  value={editForm.owner}
                  onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Authority Level</label>
                  <select
                    value={editForm.authority_level}
                    onChange={(e) => setEditForm({ ...editForm, authority_level: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  >
                    <option value="official">Official</option>
                    <option value="approved">Approved</option>
                    <option value="standard">Standard</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Version</label>
                  <input
                    type="text"
                    value={editForm.version}
                    onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="outdated">Outdated</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Review Status</label>
                  <select
                    value={editForm.review_status}
                    onChange={(e) => setEditForm({ ...editForm, review_status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMetadata}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {savingMetadata && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Metadata</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeQuality;
