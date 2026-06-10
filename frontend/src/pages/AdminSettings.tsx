import React, { useState } from 'react';
import { Settings, Cpu, Layers, Lock, Save, CheckCircle2, AlertTriangle } from 'lucide-react';

const AdminSettings: React.FC = () => {
  // System tuning options
  const [hideDefaultCredsWarning, setHideDefaultCredsWarning] = useState<boolean>(() => {
    return localStorage.getItem('docai_hide_admin_warning') === 'true';
  });

  const [llmModel, setLlmModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.2);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveSuccess(null);

    // Save warning preference
    localStorage.setItem('docai_hide_admin_warning', hideDefaultCredsWarning ? 'true' : 'false');
    
    // Trigger global event so app updates warning immediately
    window.dispatchEvent(new Event('docai_admin_warning_updated'));

    setTimeout(() => {
      setSubmitting(false);
      setSaveSuccess('System configurations updated successfully.');
    }, 800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-slate-300 font-sans p-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>System & Security Settings</span>
        </h1>
        <p className="text-xs text-slate-400">
          Fine-tune the document chunking models, customize prompt templates, and control administrative banners.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Security overrides */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
            <Lock className="w-4 h-4 text-red-400" />
            <span>Console Security Policies</span>
          </h3>

          <div className="flex items-start justify-between gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-white block">Acknowledge Default Admin Credentials Warning</label>
              <p className="text-slate-400 leading-relaxed max-w-xl text-[11px]">
                Checking this box dismisses the default admin credentials security banner displayed on the Topbar console. Keep warning active unless credentials have been changed.
              </p>
            </div>
            <input
              type="checkbox"
              checked={hideDefaultCredsWarning}
              onChange={(e) => setHideDefaultCredsWarning(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[#2A2A2A] bg-[#141414] focus:ring-cyan-500 focus:ring-offset-[#0d0d0d] accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Production Warning:</strong> Always configure custom credentials in <code className="text-white bg-slate-800 px-1 py-0.5 rounded">users.json</code> backend databases before exposing this workspace API to public domains.
            </span>
          </div>
        </div>

        {/* RAG settings */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>Generative AI Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 font-bold">Selected Inference Model</label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              >
                <option value="gemini-1.5-flash" className="bg-[#0d0d0d]">gemini-1.5-flash (Standard)</option>
                <option value="gemini-1.5-pro" className="bg-[#0d0d0d]">gemini-1.5-pro (Accurate)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 font-bold">Model Temperature: {temperature}</label>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#141414] rounded-lg border border-[#2A2A2A] appearance-none cursor-pointer accent-white mt-3.5"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>0.0 (Precise)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Indexer tuning */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Knowledge Base Indexer Tuner</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 font-bold">Vector Chunk Size (characters)</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value) || 500)}
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 font-bold">Chunk Overlap (characters)</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Form action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold tracking-wide transition-all shadow-md disabled:opacity-50 flex items-center gap-2 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Applying Settings...' : 'Save Workspace Config'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};

export default AdminSettings;
