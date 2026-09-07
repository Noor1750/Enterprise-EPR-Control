import React from 'react';

export interface SkeletonProps {
  className?: string;
  count?: number;
  rows?: number;
  cols?: number;
  height?: string;
  type?: 'table' | 'card' | 'chart' | 'kpi' | 'default';
}

/**
 * Basic shimmer block
 */
export function SkeletonBlock({ 
  className = 'h-4 w-full',
  style 
}: { 
  className?: string; 
  style?: React.CSSProperties; 
}) {
  return (
    <div 
      style={style}
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-700/50 rounded-lg relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent ${className}`} 
    />
  );
}

/**
 * KPI Cards Progressive Skeleton
 */
export function KPICardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx} 
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <SkeletonBlock className="h-3.5 w-24 rounded-md" />
            <SkeletonBlock className="h-8 w-8 rounded-xl" />
          </div>
          <SkeletonBlock className="h-8 w-20 mb-2 rounded-lg" />
          <div className="flex items-center gap-2 mt-2">
            <SkeletonBlock className="h-3 w-16 rounded-md" />
            <SkeletonBlock className="h-3 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Executive Ribbon Skeleton
 */
export function ExecutiveRibbonSkeleton() {
  return (
    <div className="w-full bg-white/70 dark:bg-slate-800/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-1.5">
          <SkeletonBlock className="h-4 w-36 rounded" />
          <SkeletonBlock className="h-3 w-48 rounded" />
        </div>
      </div>
      <div className="hidden md:flex items-center gap-3">
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
        <SkeletonBlock className="h-8 w-28 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Chart Skeleton
 */
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`w-full ${height} bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-4 w-32 rounded" />
        <SkeletonBlock className="h-4 w-20 rounded" />
      </div>
      <div className="flex items-end justify-between gap-2 h-40 pt-4 px-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <SkeletonBlock 
              className="w-full rounded-t-md" 
              style={{ height: `${20 + (i % 4) * 20}%` }} 
            />
            <SkeletonBlock className="h-2.5 w-6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Table Rows Skeleton
 */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3.5 flex-1 max-w-[120px] rounded" />
        ))}
      </div>
      {/* Body Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1 flex-1">
                <SkeletonBlock className="h-3.5 w-28 rounded" />
                <SkeletonBlock className="h-2.5 w-20 rounded" />
              </div>
            </div>
            {Array.from({ length: cols - 1 }).map((_, cIdx) => (
              <SkeletonBlock key={cIdx} className="h-3.5 flex-1 max-w-[100px] rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card Grid Skeleton
 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <SkeletonBlock className="h-4 w-3/4 rounded" />
              <SkeletonBlock className="h-3 w-1/2 rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <SkeletonBlock className="h-3 w-full rounded" />
            <SkeletonBlock className="h-3 w-4/5 rounded" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <SkeletonBlock className="h-6 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Today Priorities Skeleton
 */
export function PrioritiesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-800/60 flex items-center gap-3">
          <SkeletonBlock className="w-5 h-5 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-3/4 rounded" />
            <SkeletonBlock className="h-2.5 w-1/3 rounded" />
          </div>
          <SkeletonBlock className="h-6 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Default multi-purpose SkeletonLoader component
 */
export default function SkeletonLoader({
  type = 'table',
  rows = 6,
  cols = 5,
  count = 6,
  height = 'h-64',
  className = ''
}: SkeletonProps) {
  if (type === 'table') {
    return <TableSkeleton rows={rows} cols={cols} />;
  }
  if (type === 'card') {
    return <CardGridSkeleton count={count} />;
  }
  if (type === 'chart') {
    return <ChartSkeleton height={height} />;
  }
  if (type === 'kpi') {
    return <KPICardsSkeleton count={count} />;
  }
  return <SkeletonBlock className={className} />;
}
