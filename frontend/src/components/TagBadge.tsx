import React from 'react';
import { Tag } from 'lucide-react';

interface TagBadgeProps {
  label: string;
  onClick?: () => void;
  variant?: 'cyan' | 'violet' | 'emerald' | 'slate';
}

const TagBadge: React.FC<TagBadgeProps> = ({
  label,
  onClick,
  variant = 'violet',
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'cyan':
        return 'bg-slate-900 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40';
      case 'slate':
        return 'bg-slate-850 text-slate-300 border-slate-700/40 hover:bg-slate-800 hover:border-slate-600';
      default: // violet
        return 'bg-slate-900 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-300 ${getStyles()} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <Tag className="w-3 h-3 opacity-70 shrink-0" />
      <span>{label}</span>
    </button>
  );
};

export default TagBadge;
