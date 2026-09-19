import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'teal' | 'amber' | 'blue' | 'indigo' | 'rose' | 'emerald' | 'slate';
  trend?: {
    value: string;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
    isPositive?: boolean;
  };
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  badge?: {
    text: string;
    variant?: 'teal' | 'amber' | 'blue' | 'rose' | 'emerald' | 'slate';
  };
  footer?: React.ReactNode;
  id?: string;
}

const variantStyles = {
  teal: {
    bg: 'bg-white hover:border-teal-300',
    border: 'border-slate-200/80',
    iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
    valueText: 'text-teal-900',
    accentText: 'text-teal-700',
    subText: 'text-teal-600/90'
  },
  amber: {
    bg: 'bg-white hover:border-amber-300',
    border: 'border-slate-200/80',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    valueText: 'text-amber-900',
    accentText: 'text-amber-700',
    subText: 'text-amber-600/90'
  },
  blue: {
    bg: 'bg-white hover:border-blue-300',
    border: 'border-slate-200/80',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    valueText: 'text-blue-900',
    accentText: 'text-blue-700',
    subText: 'text-blue-600/90'
  },
  indigo: {
    bg: 'bg-white hover:border-indigo-300',
    border: 'border-slate-200/80',
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    valueText: 'text-indigo-900',
    accentText: 'text-indigo-700',
    subText: 'text-indigo-600/90'
  },
  rose: {
    bg: 'bg-white hover:border-rose-300',
    border: 'border-slate-200/80',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
    valueText: 'text-rose-900',
    accentText: 'text-rose-700',
    subText: 'text-rose-600/90'
  },
  emerald: {
    bg: 'bg-white hover:border-emerald-300',
    border: 'border-slate-200/80',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    valueText: 'text-emerald-900',
    accentText: 'text-emerald-700',
    subText: 'text-emerald-600/90'
  },
  slate: {
    bg: 'bg-white hover:border-slate-300',
    border: 'border-slate-200/80',
    iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
    valueText: 'text-slate-900',
    accentText: 'text-slate-700',
    subText: 'text-slate-500'
  }
};

const badgeStyles = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200'
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'teal',
  trend,
  progress,
  badge,
  footer,
  id
}) => {
  const styles = variantStyles[variant] || variantStyles.teal;

  const percentage = progress && progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div
      id={id}
      className={`p-5 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${styles.bg} ${styles.border}`}
    >
      <div>
        {/* Top Header: Title & Icon */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block leading-tight">
              {title}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono tracking-tight ${styles.valueText}`}>
                {value}
              </span>
              {badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyles[badge.variant || variant]}`}>
                  {badge.text}
                </span>
              )}
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${styles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Progress Bar (Optional) */}
        {progress && (
          <div className="mt-3 mb-2">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-1">
              <span>{progress.label || 'نسبة الإنجاز'}</span>
              <span className="font-mono text-slate-700">{percentage}%</span>
            </div>
            <ProgressBar value={percentage} color={variant} height="sm" />
          </div>
        )}

        {/* Subtitle / Context */}
        {subtitle && (
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom Footer / Trend */}
      {(trend || footer) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
          {trend ? (
            <div className="flex items-center gap-1.5 font-bold">
              <span
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : trend.direction === 'neutral'
                    ? 'bg-slate-50 text-slate-600 border border-slate-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}
              >
                {trend.direction === 'up' ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : trend.direction === 'down' ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                <span>{trend.value}</span>
              </span>
              {trend.label && <span className="text-slate-500 font-medium">{trend.label}</span>}
            </div>
          ) : (
            <div />
          )}

          {footer && <div className="text-slate-500">{footer}</div>}
        </div>
      )}
    </div>
  );
};
