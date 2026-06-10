import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  size = 'md',
  fullPage = false,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="relative">
        {/* Outer glowing ring */}
        <div className={`${sizeClasses[size]} rounded-full border-t-slate-200 border-r-transparent border-b-slate-700 border-l-transparent animate-spin`} />
        {/* Inner static node */}
        <div className="absolute inset-0 m-auto w-2 h-2 bg-slate-400 rounded-full blur-[1px]" />
      </div>
      {message && (
        <p className="text-sm text-slate-400 font-semibold tracking-wide animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-[#050505]/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12 w-full h-full">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
