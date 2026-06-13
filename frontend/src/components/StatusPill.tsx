import React from 'react';
import { Play, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface StatusPillProps {
  status: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const getStyles = () => {
    const s = (status || '').toLowerCase();
    
    if (s.includes('processed') || s.includes('stored') || s.includes('healthy') || s.includes('completed') || s.includes('active') || s.includes('ready') || s.includes('approved')) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        icon: CheckCircle2
      };
    }
    
    if (s.includes('review') || s.includes('pending') || s.includes('warning') || s.includes('needed')) {
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        icon: AlertTriangle
      };
    }
    
    if (s.includes('progress') || s.includes('running') || s.includes('uploading') || s.includes('processing')) {
      return {
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25 animate-pulse',
        icon: Play
      };
    }

    if (s.includes('rejected') || s.includes('failed') || s.includes('error')) {
      return {
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
        icon: AlertTriangle
      };
    }

    return {
      bg: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
      icon: HelpCircle
    };
  };

  const { bg, icon: Icon } = getStyles();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${bg}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="capitalize">{status}</span>
    </div>
  );
};

export default StatusPill;
