import { ErrorBoundary } from "react-error-boundary";
import { useLocation } from "react-router-dom";
import { ErrorFallback } from "./ErrorFallback";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const location = useLocation();

  const handleError = (error: Error, info: React.ErrorInfo) => {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
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
