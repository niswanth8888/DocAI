import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Layers, Lock, Save, CheckCircle2, AlertTriangle, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { patchProfileCredentials, getSystemSettings, patchSystemSettings } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SystemSettings } from '../types/api';

const AdminSettings: React.FC = () => {
  const { refreshMe } = useAuth();

  // Settings states from backend
  const [savedSettings, setSavedSettings] = useState<SystemSettings | null>(null);

  // System tuning form states
  const [llmModel, setLlmModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.2);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submittingSettings, setSubmittingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Security overrides
  const [hideDefaultCredsWarning, setHideDefaultCredsWarning] = useState<boolean>(() => {
    return localStorage.getItem('docai_hide_admin_warning') === 'true';
  });
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  // Admin password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setSettingsError(null);
    try {
      const data = await getSystemSettings();
      setSavedSettings(data);
      setLlmModel(data.selected_model);
      setTemperature(data.temperature);
      setChunkSize(data.chunk_size);
      setChunkOverlap(data.chunk_overlap);
    } catch (err: any) {
      console.error(err);
      setSettingsError('Failed to load system settings from server.');
    } finally {
      setLoading(false);
    }
  };

  // Compare local form state with last saved settings
  const hasUnsavedChanges = savedSettings ? (
    llmModel !== savedSettings.selected_model ||
    temperature !== savedSettings.temperature ||
    chunkSize !== savedSettings.chunk_size ||
    chunkOverlap !== savedSettings.chunk_overlap
  ) : false;

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSettings(true);
    setSettingsSuccess(null);
    setSettingsError(null);

    // Frontend validations
    if (chunkSize < 300 || chunkSize > 3000) {
      setSettingsError('Chunk size must be between 300 and 3000 characters.');
      setSubmittingSettings(false);
      return;
    }

    if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
      setSettingsError(`Chunk overlap must be between 0 and ${chunkSize - 1} characters.`);
      setSubmittingSettings(false);
      return;
    }

    try {
      const updated = await patchSystemSettings({
        selected_model: llmModel,
        temperature: temperature,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });
      setSavedSettings(updated);
      setLlmModel(updated.selected_model);
      setTemperature(updated.temperature);
      setChunkSize(updated.chunk_size);
      setChunkOverlap(updated.chunk_overlap);
      setSettingsSuccess('Configuration saved successfully.');
    } catch (err: any) {
      console.error(err);
      setSettingsError(err.response?.data?.detail || 'Failed to save system settings.');
    } finally {
      setSubmittingSettings(false);
    }
  };

  const handleSaveSecuritySettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySubmitting(true);
    setSecuritySuccess(null);

    // Save warning preference
    localStorage.setItem('docai_hide_admin_warning', hideDefaultCredsWarning ? 'true' : 'false');
    
    // Trigger global event so app updates warning immediately
    window.dispatchEvent(new Event('docai_admin_warning_updated'));

    setTimeout(() => {
      setSecuritySubmitting(false);
      setSecuritySuccess('Security policies updated successfully.');
    }, 800);
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSubmitting(true);

    try {
      await patchProfileCredentials({
        new_password: newPassword,
        current_password: currentPassword
      });
      
      await refreshMe();
      setPasswordSuccess('Administrator credentials updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');

      // Auto update warning status since admin changed default credentials
      localStorage.setItem('docai_hide_admin_warning', 'true');
      window.dispatchEvent(new Event('docai_admin_warning_updated'));
      setHideDefaultCredsWarning(true);
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.response?.data?.detail || 'Failed to update administrator password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-4">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-slate-400 text-xs tracking-wide">Loading system configurations...</p>
      </div>
    );
  }

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

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You have unsaved changes in your Generative AI or Indexer configuration.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/20 rounded-md border border-amber-500/30">
            Unsaved Changes
          </span>
        </div>
      )}

      {settingsSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{settingsSuccess}</span>
        </div>
      )}

      {settingsError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{settingsError}</span>
        </div>
      )}

      {/* Form for System Configurations */}
      <form onSubmit={handleSaveSystemSettings} className="space-y-6">
        {/* RAG settings */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>Generative AI Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
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
              <label className="block text-slate-400 font-semibold mb-1.5 font-bold">Model Temperature: {temperature.toFixed(1)}</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 font-bold">Vector Chunk Size (characters)</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                min="300"
                max="3000"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                Recommended: 1000. Supported range: 300 to 3000 characters.
              </p>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 font-bold">Chunk Overlap (characters)</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                min="0"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                Recommended: 200. Must be less than the current chunk size.
              </p>
            </div>
          </div>
        </div>

        {/* Save Configuration Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submittingSettings}
            className={`px-5 py-2.5 rounded-xl font-bold tracking-wide transition-all shadow-md disabled:opacity-50 flex items-center gap-2 text-xs cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-950/40'
                : 'bg-white hover:bg-slate-200 text-black'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{submittingSettings ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {securitySuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{securitySuccess}</span>
        </div>
      )}

      {/* Security overrides */}
      <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
          <Lock className="w-4 h-4 text-red-400" />
          <span>Console Security Policies</span>
        </h3>

        <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
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

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={securitySubmitting}
              className="px-4 py-2 rounded-xl bg-[#141414] border border-[#333] hover:border-slate-400 text-white font-bold tracking-wide transition-all shadow-md disabled:opacity-50 flex items-center gap-2 text-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{securitySubmitting ? 'Applying...' : 'Save Warning Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Administrator password update section */}
      <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
          <Key className="w-4 h-4 text-cyan-400" />
          <span>Update Administrator Password</span>
        </h3>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateAdminPassword} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-[11px] flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>
              <strong>Security Recommendation:</strong> If you are still using the default administrator credentials (password: <code>17215353</code>), update it immediately to restrict console access.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">New Administrator Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                required
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#2A2A2A]/60">
            <label className="block text-rose-300 font-bold mb-1.5 flex items-center gap-1">
              <span>Current Admin Password</span>
              <span className="text-rose-500 font-black">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Verify current administrator password to authorize change"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-rose-500 transition-colors placeholder:text-slate-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={passwordSubmitting}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold tracking-wide transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {passwordSubmitting ? 'Updating...' : 'Update Admin Password'}
          </button>
        </form>
      </div>

    </div>
  );
};

export default AdminSettings;
