import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { RefreshCw, LogOut, ShieldAlert, Shield } from 'lucide-react';

interface TopbarProps {
  isOnline: boolean;
  onRefreshHealth: () => void;
  checkingHealth: boolean;
}

const Topbar: React.FC<TopbarProps> = ({
  isOnline,
  onRefreshHealth,
  checkingHealth,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [showWarning, setShowWarning] = useState(false);

  const checkWarningState = () => {
    const isDefaultAdmin = user?.username === 'DocAIadmin';
    const warningHidden = localStorage.getItem('docai_hide_admin_warning') === 'true';
    setShowWarning(isDefaultAdmin && !warningHidden);
  };

  useEffect(() => {
    checkWarningState();
    
    // Listen for custom settings update events
    window.addEventListener('docai_admin_warning_updated', checkWarningState);
    return () => {
      window.removeEventListener('docai_admin_warning_updated', checkWarningState);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col z-10 shrink-0">
      
      {/* Default Admin Security Warning Banner */}
      {showWarning && (
        <div className="bg-amber-600 text-black px-6 py-2 flex items-center justify-between text-xs font-bold shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
            <span>SECURITY WARNING: The system is using the default administrator profile. Please update this password immediately for safety.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/admin/settings" 
              className="px-2.5 py-0.5 rounded bg-black text-amber-500 hover:bg-slate-900 transition-colors text-[10px]"
            >
              Configure
            </Link>
          </div>
        </div>
      )}

      <header className="h-16 bg-[#050505] border-b border-[#2A2A2A] backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white tracking-wide block md:hidden">
            Doc<span className="text-slate-300">AI</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#141414] text-slate-300 border border-[#2a2a2a] tracking-wider">
            Enterprise Document Intelligence
          </span>
          {user?.role === 'admin' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-950/40 text-red-400 border border-red-900/40 tracking-wider">
              <Shield className="w-2.5 h-2.5" />
              <span>Admin Mode</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 tracking-wider">
              <span>Employee Portal</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Backend Connectivity Status */}
          <div className="flex items-center gap-3 bg-[#111111] border border-[#2A2A2A] rounded-xl px-3.5 py-1.5">
            <div className="flex items-center gap-2">
              <div className={`relative w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Backend: {isOnline ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <button
              onClick={onRefreshHealth}
              disabled={checkingHealth}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-[#181818] transition-colors"
              title="Recheck backend health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* User profile dropdown/logout controls */}
          {user && (
            <div className="flex items-center gap-3">
              <Link 
                to="/profile" 
                className="flex items-center gap-2.5 hover:bg-[#141414] p-1.5 rounded-xl border border-transparent hover:border-[#2A2A2A] transition-all"
                title="Go to settings"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase shadow-inner">
                  {user.avatar_initials}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200 leading-none">
                    {user.role === 'admin' ? `@${user.username}` : user.name}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 leading-none">
                    {user.role === 'admin' ? 'System Administrator' : user.department}
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-[#111111] border border-[#2A2A2A] hover:bg-rose-950/20 hover:border-rose-900/40 text-slate-400 hover:text-rose-400 transition-all"
                title="Sign out of console"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
};

export default Topbar;
