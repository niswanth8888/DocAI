import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, AlertCircle, User, Mail, Lock, Building, Briefcase } from 'lucide-react';

const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [designation, setDesignation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const departments = [
    'Engineering',
    'Human Resources',
    'Finance',
    'Sales & Marketing',
    'IT / Administration',
    'Customer Support',
    'Operations',
    'Legal / Compliance'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    let finalUsername = username.trim();
    if (!finalUsername) {
      finalUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    if (!finalUsername) {
      setError('Username is required.');
      return;
    }

    setSubmitting(true);

    try {
      await signup({
        name: name.trim(),
        full_name: name.trim(),
        username: finalUsername,
        email: email.trim(),
        password,
        department,
        designation: designation.trim(),
        title: designation.trim()
      });
      navigate('/login?registered=true');
    } catch (err: any) {
      console.error(err);
      let errorMessage = 'Registration failed. Please check details and try again.';
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
      <div className="w-full max-w-md bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl relative overflow-hidden my-8">
        
        {/* Branding header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1c1c1c] to-[#0d0d0d] border border-[#2a2a2a] flex items-center justify-center mb-3">
            <Cpu className="w-6 h-6 text-slate-300" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Doc<span className="text-slate-400">AI</span>
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">
            Employee Self-Registration
          </span>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Niswanth S"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Username</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="niswanth"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="niswanth@example.com"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>Department</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept} className="bg-[#0d0d0d]">{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                <span>Designation</span>
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="AI Intern"
                className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Confirm Password</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#2A2A2A] text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
