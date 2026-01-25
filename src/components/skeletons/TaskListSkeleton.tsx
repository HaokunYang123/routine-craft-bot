import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for a single task item.
 */
function TaskItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <Skeleton className="h-5 w-5 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a list of 5 task items.
 */
function TaskListSkeleton() {
  return (
    <div className="space-y-0">
      <TaskItemSkeleton />
      <TaskItemSkeleton />
      <TaskItemSkeleton />
      <TaskItemSkeleton />
      <TaskItemSkeleton />
    </div>
  );
}

export { TaskListSkeleton, TaskItemSkeleton };
