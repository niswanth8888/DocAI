import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  Bot,
  MessageSquare,
  Tags,
  ShieldCheck,
  Terminal,
  Cpu,
  Activity,
  Users,
  Compass,
  Download,
  Settings,
  User,
  ArrowRightLeft
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { role } = useAuth();

  // Navigation lists based on active user roles
  const employeeItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Ask Agent', path: '/ask', icon: Bot },
    { name: 'Upload Knowledge', path: '/upload', icon: UploadCloud },
    { name: 'Generated FAQs', path: '/faqs', icon: MessageSquare },
    { name: 'Taxonomy Tags', path: '/tags', icon: Tags },
    { name: 'Search History', path: '/history', icon: Compass },
    { name: 'Profile Settings', path: '/profile', icon: User },
  ];

  const adminItems = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Registry', path: '/admin/users', icon: Users },
    { name: 'Search Analytics', path: '/admin/searches', icon: Compass },
    { name: 'File Downloads', path: '/admin/downloads', icon: Download },
    { name: 'Review Queue', path: '/reviews', icon: ShieldCheck },
    { name: 'Knowledge Quality', path: '/quality', icon: Activity },
    { name: 'System Logs', path: '/logs', icon: Terminal },
    { name: 'Global Settings', path: '/admin/settings', icon: Settings },
  ];

  const activeItems = role === 'admin' ? adminItems : employeeItems;

  return (
    <aside className="w-64 bg-[#050505] border-r border-[#2A2A2A] flex flex-col h-full shrink-0">
      
      {/* Brand logo container */}
      <div className="p-6 border-b border-[#2A2A2A] flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#1c1c1c] to-[#0d0d0d] border border-[#2a2a2a] shadow-md">
          <Cpu className="w-5 h-5 text-slate-300" />
          <div className="absolute inset-0 rounded-xl border border-white/5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-1.5">
            Doc<span className="text-[#A3A3A3]">AI</span>
          </h2>
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-extrabold block -mt-1">
            {role === 'admin' ? 'Admin Console' : 'Enterprise Portal'}
          </span>
        </div>
      </div>

      {/* Navigation items list */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {activeItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 text-sm font-semibold transition-all duration-300 group border ${
                  isActive
                    ? 'bg-[#141414] border-l-2 border-l-cyan-400 border-y-transparent border-r-transparent text-[#F5F5F5] rounded-r-xl rounded-l-none'
                    : 'border-transparent text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#141414]/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                      isActive 
                        ? (role === 'admin' ? 'text-red-400' : 'text-cyan-400') 
                        : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <span className="flex-1">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Admin Quick Switch link if user is admin */}
      {role === 'admin' && (
        <div className="p-4 border-t border-[#2A2A2A] bg-[#090909]">
          <Link
            to="/ask"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#2A2A2A] bg-[#111111] hover:bg-slate-900 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-md"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Launch Employee App</span>
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
