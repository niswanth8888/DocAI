import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
}) => {
  return (
    <div className="glass-panel border-dashed border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8 animate-fade-in">
      <div className="p-4 rounded-full bg-slate-900 border border-slate-800/60 text-slate-500 mb-4 inline-flex">
        <Icon className="w-8 h-8 opacity-70" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
