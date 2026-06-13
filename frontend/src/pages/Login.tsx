import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, AlertCircle, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired');
  const registered = searchParams.get('registered');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await login({ identifier, password });
      if (res.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = 'Sign in failed. Please check your credentials and try again.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#050505] p-4 text-slate-300 font-sans">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Branding header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1c1c1c] to-[#0d0d0d] border border-[#2a2a2a] flex items-center justify-center mb-3">
            <Cpu className="w-6 h-6 text-slate-300" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Doc<span className="text-slate-400">AI</span>
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">
            Enterprise Document Intelligence
          </span>
        </div>

        {registered && (
          <div className="p-3 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Account created successfully. Please login.</span>
          </div>
        )}

        {expired && (
          <div className="p-3 mb-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Session expired. Please sign in again.</span>
          </div>
        )}

        {error && (
          <div className="p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Username or Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="niswanth or niswanth@example.com"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold tracking-wide transition-all shadow-lg hover:shadow-white/5 disabled:opacity-50 mt-6"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#2A2A2A] flex flex-col gap-2.5 text-center text-xs text-slate-500">
          <div>
            Don't have an account?{' '}
            <Link to="/signup" className="text-white hover:underline font-semibold">
              Sign up
            </Link>
          </div>
          <div>
            <Link to="/admin/login" className="text-slate-400 hover:text-white hover:underline">
              Access Administrative Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
