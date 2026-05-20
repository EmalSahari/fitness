export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-800 rounded-lg animate-pulse ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-36" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <SkeletonBlock className="h-9 w-28 rounded-lg" />
      </div>
      {/* Calorie ring card */}
      <SkeletonBlock className="h-48 rounded-xl" />
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-xl" />)}
      </div>
      {/* Recent entries */}
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-24" />
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-14 rounded-xl" />)}
      </div>
    </div>
  );
}

export function FoodSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-32" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <SkeletonBlock className="h-20 rounded-xl" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-32" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <SkeletonBlock className="h-44 rounded-xl" />
      <SkeletonBlock className="h-44 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-xl" />)}
      </div>
    </div>
  );
}

export function WorkoutsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-9 w-28 rounded-lg" />
      </div>
      <SkeletonBlock className="h-20 rounded-xl" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  );
}
