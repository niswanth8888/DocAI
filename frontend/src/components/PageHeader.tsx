import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-slate-800/60 pb-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm md:text-base text-slate-400 font-medium max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
