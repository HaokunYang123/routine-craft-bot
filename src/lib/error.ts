import { toast } from "sonner";

/**
 * Context for error handling - provides structured information about where and how the error occurred
 */
export interface ErrorContext {
  /** Component name where error occurred */
  component?: string;
  /** User action that triggered error (e.g., "save", "delete", "fetch") */
  action?: string;
  /** Current user ID if available */
  userId?: string;
  /** Optional retry function - if provided, shows Retry button in toast */
  retry?: () => void | Promise<void>;
  /** If true, log only - no toast shown (for background operations) */
  silent?: boolean;
}

/**
 * Internal type for structured error log entries
 */
interface ErrorLogEntry {
  severity: "error" | "warning" | "info";
  timestamp: string;
  message: string;
  stack?: string;
  context: {
    component?: string;
    action?: string;
    userId?: string;
    route: string;
    [key: string]: unknown;
  };
  environment: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
  };
}

/**
 * Maps technical error messages to user-friendly messages
 * @param errorMessage - The technical error message
 * @returns A user-friendly message suitable for display in a toast
 */
export function getUserFriendlyMessage(errorMessage: string): string {
  // Map technical errors to user-friendly messages
  const mappings: Array<{ pattern: RegExp; message: string }> = [
    {
      pattern: /network|fetch|ECONNREFUSED/i,
      message: "Unable to connect. Please check your internet connection.",
    },
    {
      pattern: /timeout|ETIMEDOUT/i,
      message: "Request timed out. Please try again.",
    },
    {
      pattern: /unauthorized|401/i,
      message: "Your session has expired. Please log in again.",
    },
    {
      pattern: /forbidden|403/i,
      message: "You don't have permission to perform this action.",
    },
    {
      pattern: /not found|404/i,
      message: "The requested item could not be found.",
    },
    {
      pattern: /server error|500|502|503/i,
      message: "Something went wrong on our end. Please try again later.",
    },
    {
      pattern: /validation|invalid/i,
      message: "Please check your input and try again.",
    },
  ];

  for (const { pattern, message } of mappings) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  // Default friendly message for unmapped errors
  return "Something went wrong. Please try again.";
}

/**
 * Logs error with structured context to console
 * Internal function - not exported
 */
function logError(
  error: unknown,
  context: ErrorContext = {},
  severity: ErrorLogEntry["severity"] = "error"
): void {
  const entry: ErrorLogEntry = {
    severity,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: {
      component: context.component,
      action: context.action,
      userId: context.userId,
      route: typeof window !== "undefined" ? window.location.pathname : "unknown",
    },
    environment: {
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      viewport: {
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
      },
    },
  };

  // Structured console output - easy to filter in DevTools
  console.error("[App Error]", entry);
}

/**
 * Centralized error handler - shows user-friendly toast and logs structured error
 *
 * @param error - The error to handle (Error object, string, or unknown)
 * @param context - Additional context about where/how the error occurred
 *
 * @example
 * // Basic usage
 * handleError(error, { component: 'TaskList', action: 'fetch' });
 *
 * @example
 * // With retry button
 * handleError(error, {
 *   component: 'TaskForm',
 *   action: 'save',
 *   retry: () => saveTask()
 * });
 *
 * @example
 * // Silent mode (log only, no toast)
 * handleError(error, { silent: true });
 */
export function handleError(error: unknown, context: ErrorContext = {}): void {
  // 1. Extract error message safely
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 2. Always log with structure (never skip logging)
  try {
    logError(error, context);
  } catch {
    // Logging should never crash the app
    console.error("[Logging Failed]", errorMessage);
  }

  // 3. Show toast unless silent mode
  if (!context.silent) {
    const friendlyMessage = getUserFriendlyMessage(errorMessage);

    // Build toast options
    const toastOptions: Parameters<typeof toast.error>[1] = {};

    // Add retry action if provided (opt-in per user decision)
    if (context.retry) {
      toastOptions.action = {
        label: "Retry",
        onClick: () => {
          // Wrap retry in try/catch to prevent unhandled promise rejections
          try {
            const result = context.retry?.();
            if (result instanceof Promise) {
              result.catch((retryError) => {
                // Prevent infinite retry loops by removing retry function
                handleError(retryError, { ...context, retry: undefined });
              });
            }
          } catch (retryError) {
            handleError(retryError, { ...context, retry: undefined });
          }
        },
      };
    }

    toast.error(friendlyMessage, toastOptions);
  }
}
