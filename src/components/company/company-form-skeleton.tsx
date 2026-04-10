import { Skeleton } from "@/components/ui/skeleton"
import { PageShell } from "@/components/dashboard/page-shell"

export function CompanyFormSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ))}
      </div>

      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4" />
          <Skeleton className="h-3 w-24" />
        </div>
        
        {/* Address Lines */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>

        {/* Quad Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Contacts Skeleton */}
      <div className="pt-8 border-t border-border/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <Skeleton className="sm:col-span-2 h-11 rounded-xl" />
            <Skeleton className="sm:col-span-7 h-11 rounded-xl" />
            <Skeleton className="sm:col-span-3 h-11 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="flex justify-end pt-8">
        <Skeleton className="h-12 w-40 rounded-2xl" />
      </div>
    </div>
  )
}
