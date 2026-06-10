import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  glowColor?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose';
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  glowColor = 'cyan',
  loading = false,
}) => {
  const getGlowStyles = () => {
    return 'border-[#2A2A2A] hover:border-[#333333]';
  };

  const getIconColor = () => {
    switch (glowColor) {
      case 'emerald': return 'text-emerald-400 bg-emerald-500/10';
      case 'amber': return 'text-amber-400 bg-amber-500/10';
      case 'rose': return 'text-rose-400 bg-rose-500/10';
      default: return 'text-slate-300 bg-[#181818]';
    }
  };

  return (
    <div className={`glass-panel rounded-2xl p-6 transition-all duration-300 border ${getGlowStyles()} animate-slide-up relative overflow-hidden group`}>
      {/* Background glow node */}
      <div className="absolute -right-10 -top-10 w-24 h-24 rounded-full blur-2xl opacity-[0.02] bg-slate-500 pointer-events-none" />

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-800 rounded w-24"></div>
            <div className="h-10 w-10 bg-slate-800 rounded-lg"></div>
          </div>
          <div className="h-8 bg-slate-800 rounded w-16"></div>
          <div className="h-3 bg-slate-800 rounded w-36"></div>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-start justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              {title}
            </span>
            <div className={`p-2.5 rounded-xl border border-white/5 transition-transform duration-300 group-hover:scale-110 ${getIconColor()}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">
              {value}
            </h3>
            
            {description && (
              <p className="mt-2 text-xs text-slate-400 font-medium">
                {trend && (
                  <span className={`mr-1.5 font-bold ${
                    trend.type === 'positive' ? 'text-emerald-400' :
                    trend.type === 'negative' ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {trend.value}
                  </span>
                )}
                {description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
