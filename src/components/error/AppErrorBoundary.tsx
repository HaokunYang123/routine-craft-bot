import { ErrorBoundary } from "react-error-boundary";
import { useLocation } from "react-router-dom";
import { ErrorFallback } from "./ErrorFallback";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const location = useLocation();

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
      console.error("[AppErrorBoundary] Error caught:", errorLog);
    } catch {
      // Prevent logging failures from crashing the app
      console.error("[AppErrorBoundary] Error logging failed:", error);
    }
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      resetKeys={[location.pathname]}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}
