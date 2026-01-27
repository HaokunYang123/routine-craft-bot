import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ListStatusProps {
  isLoading: boolean;
  hasMore: boolean;
  itemCount: number;
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * Displays loading spinner, end of list message, or error state.
 * Shows "That's everything" when all items loaded (per CONTEXT.md).
 */
export function ListStatus({
  isLoading,
  hasMore,
  itemCount,
  error,
  onRetry,
}: ListStatusProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state with retry
  if (error && onRetry) {
    return (
      <div className="flex flex-col items-center py-6 gap-2">
        <p className="text-sm text-destructive">Failed to load. Please try again.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  // End of list (only show if there are items)
  if (!hasMore && itemCount > 0) {
    return (
      <div className="flex items-center justify-center py-6 gap-4">
        <div className="h-px flex-1 bg-border" />
        <p className="text-sm text-muted-foreground">That's everything</p>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return null;
}
