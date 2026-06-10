import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await adminLogin({ username, password });
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Administrative authentication failed. Please verify credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#050505] p-4 text-slate-300 font-sans">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Branding header */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1c1c1c] to-[#0d0d0d] border border-red-500/20 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Doc<span className="text-slate-400">AI</span> <span className="text-xs px-2 py-0.5 rounded bg-red-950/40 border border-red-900/40 text-red-400 font-bold ml-1 uppercase">Admin</span>
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">
            System Console Access
          </span>
        </div>

        {/* Security Warning about Default Credentials */}
        <div className="p-3 mb-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Security Notice</p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Default admin credentials: <code className="text-white bg-slate-800 px-1 py-0.5 rounded text-[10px]">DocAIadmin</code> / <code className="text-white bg-slate-800 px-1 py-0.5 rounded text-[10px]">qwert12345</code>. Change these credentials from Profile Settings after first login.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Admin Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="DocAIadmin"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-red-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-red-400 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold tracking-wide transition-all shadow-lg hover:shadow-white/5 disabled:opacity-50 mt-6"
          >
            {submitting ? 'Authenticating Console...' : 'Open Admin Portal'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#2A2A2A] text-center text-xs text-slate-500">
          Not an administrator?{' '}
          <Link to="/login" className="text-white hover:underline font-semibold">
            User Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
