import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./ErrorFallback";

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Route-level error boundary for granular error containment.
 * Unlike AppErrorBoundary, this does not use resetKeys since
 * the parent AppErrorBoundary already handles route-change resets.
 */
export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  const handleError = (error: unknown, info: React.ErrorInfo) => {
    try {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: errorObj.message,
        stack: errorObj.stack,
        componentStack: info.componentStack,
        url: window.location.href,
      };
      console.error("[RouteErrorBoundary] Error caught:", errorLog);
    } catch {
      // Prevent logging failures from crashing the app
      console.error("[RouteErrorBoundary] Error logging failed:", error);
    }
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
