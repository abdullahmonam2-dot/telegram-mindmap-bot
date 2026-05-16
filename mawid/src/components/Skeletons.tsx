import { motion } from 'framer-motion';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`skeleton ${className}`} />
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="card p-6 flex gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-2xl bg-slate-100" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-slate-100 rounded-full w-1/3" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-slate-50 rounded-full w-1/4" />
          <div className="h-8 bg-slate-100 rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="card p-6 flex gap-6">
        <div className="w-24 h-24 rounded-[28px] bg-slate-100" />
        <div className="flex-1 space-y-4">
          <div className="h-6 bg-slate-100 rounded-full w-1/2" />
          <div className="h-4 bg-slate-100 rounded-full w-1/3" />
          <div className="h-4 bg-slate-100 rounded-full w-1/4" />
        </div>
      </div>
      <div className="card p-6 space-y-4">
        <div className="h-4 bg-slate-100 rounded-full w-1/4" />
        <div className="space-y-2">
          <div className="h-3 bg-slate-50 rounded-full w-full" />
          <div className="h-3 bg-slate-50 rounded-full w-5/6" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white rounded-[32px] border border-slate-50 shadow-sm" />
        ))}
      </div>
      <div className="h-96 bg-white rounded-[32px] border border-slate-50 shadow-sm" />
    </div>
  );
}
