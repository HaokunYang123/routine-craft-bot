import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

/**
 * Skeleton for a single template card matching the Templates page layout.
 */
function TemplateCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-3 w-24 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-14" />
          <div className="pt-2 flex gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for the entire Templates page (header + tabs + template cards grid).
 */
function TemplatesSkeleton() {
  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-80" />

      {/* Template cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TemplateCardSkeleton />
        <TemplateCardSkeleton />
        <TemplateCardSkeleton />
        <TemplateCardSkeleton />
      </div>
    </div>
  );
}

export { TemplatesSkeleton, TemplateCardSkeleton };
