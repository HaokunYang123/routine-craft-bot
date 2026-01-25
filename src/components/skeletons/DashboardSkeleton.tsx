import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

/**
 * Skeleton for a single stats card matching the dashboard layout.
 */
function StatsCardSkeleton() {
  return (
    <Card className="bg-card shadow-card border-0 rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-12" />
        <Skeleton className="h-3 w-28 mt-2" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for the entire dashboard stats grid (4 cards).
 */
function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  );
}

export { DashboardSkeleton, StatsCardSkeleton };
