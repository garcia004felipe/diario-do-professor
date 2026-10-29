import React from 'react';

interface SkeletonProps {
  variant?: 'card' | 'table-row' | 'text' | 'avatar' | 'chart';
  count?: number;
  className?: string;
}

const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} 
    style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
  />
);

const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <SkeletonPulse className="h-5 w-3/5" />
        <SkeletonPulse className="h-3 w-2/5" />
      </div>
      <SkeletonPulse className="h-12 w-12 rounded-lg" />
    </div>
    <div className="flex items-center gap-3 pt-2">
      <SkeletonPulse className="h-3 w-16" />
      <SkeletonPulse className="h-3 w-20" />
    </div>
  </div>
);

const TableRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 py-3 px-4">
    <SkeletonPulse className="h-8 w-8 rounded-full shrink-0" />
    <div className="flex-1 space-y-1.5">
      <SkeletonPulse className="h-4 w-2/5" />
      <SkeletonPulse className="h-3 w-1/4" />
    </div>
    <SkeletonPulse className="h-4 w-16" />
  </div>
);

const TextSkeleton: React.FC = () => (
  <div className="space-y-2">
    <SkeletonPulse className="h-4 w-full" />
    <SkeletonPulse className="h-4 w-4/5" />
    <SkeletonPulse className="h-4 w-3/5" />
  </div>
);

const AvatarSkeleton: React.FC = () => (
  <div className="flex items-center gap-3">
    <SkeletonPulse className="h-10 w-10 rounded-full shrink-0" />
    <div className="space-y-1.5">
      <SkeletonPulse className="h-4 w-28" />
      <SkeletonPulse className="h-3 w-20" />
    </div>
  </div>
);

const ChartSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
    <SkeletonPulse className="h-5 w-40 mb-2" />
    <SkeletonPulse className="h-3 w-64 mb-6" />
    <div className="flex items-end justify-center gap-3 h-48">
      <SkeletonPulse className="h-24 w-10 rounded-t" />
      <SkeletonPulse className="h-36 w-10 rounded-t" />
      <SkeletonPulse className="h-20 w-10 rounded-t" />
      <SkeletonPulse className="h-32 w-10 rounded-t" />
      <SkeletonPulse className="h-28 w-10 rounded-t" />
    </div>
  </div>
);

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'card', count = 1, className = '' }) => {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderVariant = () => {
    switch (variant) {
      case 'card': return items.map(i => <CardSkeleton key={i} />);
      case 'table-row': return items.map(i => <TableRowSkeleton key={i} />);
      case 'text': return items.map(i => <TextSkeleton key={i} />);
      case 'avatar': return items.map(i => <AvatarSkeleton key={i} />);
      case 'chart': return items.map(i => <ChartSkeleton key={i} />);
    }
  };

  return <div className={className}>{renderVariant()}</div>;
};

/**
 * Dashboard skeleton: 4 stat cards + 1 chart area + student table
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
      <div className="space-y-2">
        <SkeletonPulse className="h-5 w-28" />
        <SkeletonPulse className="h-3 w-48" />
      </div>
      <SkeletonPulse className="h-9 w-36 rounded-lg" />
    </div>

    {/* 4 stat cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Skeleton variant="card" count={4} className="contents" />
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton variant="chart" count={2} className="contents" />
    </div>

    {/* Table */}
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b">
        <SkeletonPulse className="h-5 w-44" />
      </div>
      <Skeleton variant="table-row" count={5} className="divide-y divide-gray-50" />
    </div>
  </div>
);

/**
 * Students list skeleton 
 */
export const StudentsListSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <SkeletonPulse className="h-6 w-32" />
      <SkeletonPulse className="h-9 w-28 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <SkeletonPulse className="h-4 w-3/4" />
              <SkeletonPulse className="h-3 w-1/2" />
            </div>
          </div>
          <SkeletonPulse className="h-2 w-full rounded-full" />
          <div className="flex gap-2">
            <SkeletonPulse className="h-6 w-16 rounded-full" />
            <SkeletonPulse className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Classes grid skeleton
 */
export const ClassesGridSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <SkeletonPulse className="h-6 w-28" />
      <SkeletonPulse className="h-9 w-32 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex justify-between">
            <SkeletonPulse className="h-11 w-11 rounded-xl" />
            <div className="flex gap-2">
              <SkeletonPulse className="h-8 w-8 rounded" />
              <SkeletonPulse className="h-8 w-8 rounded" />
              <SkeletonPulse className="h-8 w-8 rounded" />
            </div>
          </div>
          <SkeletonPulse className="h-5 w-3/5" />
          <SkeletonPulse className="h-3 w-2/5" />
          <SkeletonPulse className="h-3 w-1/3" />
          <div className="flex gap-4 pt-2">
            <SkeletonPulse className="h-3 w-16" />
            <SkeletonPulse className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
