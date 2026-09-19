import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  color?: 'teal' | 'amber' | 'blue' | 'indigo' | 'rose' | 'emerald' | 'slate';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  labelPosition?: 'right' | 'left' | 'top' | 'inside';
  className?: string;
  animate?: boolean;
}

const colorMap = {
  teal: 'bg-teal-600',
  amber: 'bg-amber-500',
  blue: 'bg-blue-600',
  indigo: 'bg-indigo-600',
  rose: 'bg-rose-500',
  emerald: 'bg-emerald-600',
  slate: 'bg-slate-600'
};

const bgColorMap = {
  teal: 'bg-teal-50',
  amber: 'bg-amber-50',
  blue: 'bg-blue-50',
  indigo: 'bg-indigo-50',
  rose: 'bg-rose-50',
  emerald: 'bg-emerald-50',
  slate: 'bg-slate-100'
};

const heightMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'teal',
  height = 'md',
  showLabel = false,
  labelPosition = 'top',
  className = '',
  animate = true
}) => {
  const clampedValue = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));

  return (
    <div className={`w-full ${className}`}>
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
          <span>مستوى الإنجاز</span>
          <span className="font-mono text-slate-700">{clampedValue}%</span>
        </div>
      )}

      <div className={`w-full ${bgColorMap[color]} ${heightMap[height]} rounded-full overflow-hidden relative`}>
        <div
          className={`${colorMap[color]} h-full rounded-full transition-all duration-500 ease-out ${
            animate ? 'transform-gpu' : ''
          }`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>

      {showLabel && labelPosition === 'left' && (
        <span className="text-[10px] font-mono font-bold text-slate-600 mt-1 block">
          {clampedValue}%
        </span>
      )}
    </div>
  );
};
