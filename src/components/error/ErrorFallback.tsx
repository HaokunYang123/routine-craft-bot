import type { FallbackProps } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-4 p-6",
        "rounded-lg bg-background text-foreground shadow-lg"
      )}
    >
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-center text-muted-foreground">
        We encountered an unexpected error. Please try again.
      </p>
      <Button onClick={resetErrorBoundary}>Try Again</Button>
    </div>
  );
}
