import React from 'react';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { formatPercent } from '../utils/formatters';

interface ConfidenceBadgeProps {
  confidence: 'High' | 'Medium' | 'Low' | string;
  score?: number;
  showIcon?: boolean;
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  score,
  showIcon = true,
}) => {
  const normalizedConf = (confidence || '').toLowerCase();

  const getConfig = () => {
    switch (normalizedConf) {
      case 'high':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: ShieldCheck,
          label: 'High Confidence',
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: Shield,
          label: 'Medium Confidence',
        };
      case 'low':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: ShieldAlert,
          label: 'Low Confidence',
        };
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: Shield,
          label: confidence || 'Unknown',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.bg} w-fit`}>
        {showIcon && <Icon className="w-3.5 h-3.5" />}
        <span>{config.label}</span>
        {score !== undefined && (
          <span className="font-extrabold opacity-80 pl-1 border-l border-current/25">
            {formatPercent(score)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConfidenceBadge;
