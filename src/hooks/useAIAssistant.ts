import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Types for AI Assistant actions
export interface GeneratedTask {
    title: string;
    description: string;
    duration_minutes: number;
    day_offset: number;
}

export interface GeneratedPlan {
    name: string;
    description: string;
    tasks: GeneratedTask[];
}

export interface CompletionDataItem {
    name: string;
    completed: number;
    total: number;
    streak: number;
}

interface AIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    context?: { studentCount: number; classCount: number };
}

// Timeout duration in milliseconds (20 seconds for more complex operations)
const AI_REQUEST_TIMEOUT = 20000;

// Retry configuration: 3 attempts with exponential backoff (1s, 2s, 4s)
const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

/**
 * Check if an error is retryable (transient server/timeout errors)
 * Do NOT retry: auth errors, rate limits, client errors
 */
function isRetryableError(errorMsg: string | undefined, errorCode?: number | string): boolean {
    // Don't retry auth errors
    if (errorCode === 401 || errorCode === 403) return false;
    // Don't retry rate limits
    if (errorCode === 429) return false;
    // Don't retry client errors (4xx except rate limit)
    if (typeof errorCode === 'number' && errorCode >= 400 && errorCode < 500) return false;

    if (!errorMsg) return false;
    const msg = errorMsg.toLowerCase();

    // Don't retry auth-related messages
    if (msg.includes('unauthorized') || msg.includes('jwt') || msg.includes('forbidden')) return false;
    // Don't retry rate limit messages
    if (msg.includes('rate limit') || msg.includes('too many requests')) return false;

    // Retry on timeout errors
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('abort')) return true;
    // Retry on server errors (5xx)
    if (msg.includes('service error') || msg.includes('internal')) return true;
    if (msg.includes('504') || msg.includes('503') || msg.includes('502') || msg.includes('500')) return true;
    // Retry on network errors
    if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) return true;

    return false;
}

export function useAIAssistant() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    // Cancel function to abort pending requests
    const cancel = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setLoading(false);
        setError(null);
    }, []);

    const callAIAssistant = useCallback(async <T>(body: Record<string, unknown>): Promise<AIResponse<T>> => {
        setLoading(true);
        setError(null);

        // Create new AbortController for this request chain
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Retry loop with exponential backoff
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            // Check if cancelled before each attempt
            if (signal.aborted) {
                setLoading(false);
                return { success: false, error: 'Request cancelled' };
            }

            // Create abort controller for timeout on each attempt
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), AI_REQUEST_TIMEOUT);

            try {
                const { data, error: funcError } = await supabase.functions.invoke("ai-assistant", {
                    body: {
                        ...body,
                        userId: user?.id,
                    },
                });

                clearTimeout(timeoutId);

                // Check if cancelled during request
                if (signal.aborted) {
                    setLoading(false);
                    return { success: false, error: 'Request cancelled' };
                }

                if (funcError) {
                    const errorMsg = funcError.message;
                    const errorCode = (funcError as { status?: number }).status;

                    // Check if error is retryable
                    if (!isRetryableError(errorMsg, errorCode)) {
                        // Non-retryable error - return immediately
                        const userError = parseErrorMessage(funcError.message, errorCode);
                        setError(userError);
                        setLoading(false);
                        return { success: false, error: userError };
                    }

                    // Retryable error - wait and try again (unless last attempt)
                    if (attempt < MAX_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
                        continue;
                    }
                }

                if (data?.error) {
                    const errorCode = data.status || data.code;
                    // Check if data error is retryable
                    if (!isRetryableError(data.error, errorCode)) {
                        const userError = parseErrorMessage(data.error, errorCode);
                        setError(userError);
                        setLoading(false);
                        return { success: false, error: userError };
                    }

                    // Retryable error - wait and try again (unless last attempt)
                    if (attempt < MAX_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
                        continue;
                    }
                }

                // Success!
                setLoading(false);
                return {
                    success: true,
                    data: data.result as T,
                    context: data.context
                };
            } catch (err: unknown) {
                clearTimeout(timeoutId);

                // Check if user cancelled
                if (signal.aborted) {
                    setLoading(false);
                    return { success: false, error: 'Request cancelled' };
                }

                const errObj = err as { name?: string; message?: string; code?: number | string; status?: number };
                const errMsg = errObj.message || '';
                const errCode = errObj.code || errObj.status;

                console.error(`AI Assistant Error (attempt ${attempt + 1}/${MAX_RETRIES}):`, err);

                // Check if error is retryable
                const isAbortError = errObj.name === 'AbortError' || errMsg.toLowerCase().includes('abort');
                const isRetryable = isAbortError || isRetryableError(errMsg, errCode as number);

                if (!isRetryable) {
                    // Non-retryable error - return immediately
                    const userError = parseErrorMessage(errMsg, errCode as number);
                    setError(userError);
                    setLoading(false);
                    return { success: false, error: userError };
                }

                // Retryable error - wait and try again (unless last attempt)
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
                    continue;
                }
            }
        }

        // All retries exhausted - return timeout message
        const timeoutError = "Request timed out. Try asking for less information at once.";
        setError(timeoutError);
        setLoading(false);
        return { success: false, error: timeoutError };
    }, [user?.id]);

    // Generate a training/study plan from natural language
    // e.g., "make a 5-week beginner plan, 3x/week"
    const generatePlan = useCallback(async (request: string, context?: string): Promise<AIResponse<GeneratedPlan>> => {
        return callAIAssistant<GeneratedPlan>({
            action: "generate_plan",
            payload: { request, context }
        });
    }, [callAIAssistant]);

    // Personalize a plan for a specific student
    // e.g., "Make this plan harder for Sarah" or "adjust for knee injury"
    const personalizePlan = useCallback(async (
        currentTasks: GeneratedTask[],
        modificationRequest: string
    ): Promise<AIResponse<GeneratedTask[]>> => {
        return callAIAssistant<GeneratedTask[]>({
            action: "personalize_plan",
            payload: { currentTasks, modification_request: modificationRequest }
        });
    }, [callAIAssistant]);

    // Modify an existing plan with constraints (legacy, uses personalize internally)
    const modifyPlan = useCallback(async (
        currentTasks: GeneratedTask[],
        feedback: string
    ): Promise<AIResponse<GeneratedTask[]>> => {
        return callAIAssistant<GeneratedTask[]>({
            action: "modify_plan",
            payload: { currentTasks, feedback }
        });
    }, [callAIAssistant]);

    // Summarize progress for a student
    const summarizeProgress = useCallback(async (
        studentName: string,
        completedCount: number,
        totalCount: number,
        logs: unknown[]
    ): Promise<AIResponse<string>> => {
        return callAIAssistant<string>({
            action: "summarize_progress",
            payload: { studentName, completedCount, totalCount, logs }
        });
    }, [callAIAssistant]);

    // Refine raw task text into clear instructions
    // e.g., "warmup stretches" -> "Do 5 minutes of dynamic stretches - arm circles, leg swings, high knees"
    const refineTask = useCallback(async (description: string): Promise<AIResponse<string>> => {
        const response = await callAIAssistant<string>({
            action: "refine_task",
            payload: { description }
        });
        return response;
    }, [callAIAssistant]);

    // Generate weekly summary for all students
    // Auto-generates completion stats, what got missed, highlights
    const generateWeeklySummary = useCallback(async (
        completionData?: CompletionDataItem[]
    ): Promise<AIResponse<string>> => {
        return callAIAssistant<string>({
            action: "weekly_summary",
            payload: { completionData }
        });
    }, [callAIAssistant]);

    // Chat with AI assistant (full context awareness)
    const chat = useCallback(async (message: string): Promise<AIResponse<string>> => {
        return callAIAssistant<string>({
            action: "chat",
            payload: { message }
        });
    }, [callAIAssistant]);

    return {
        loading,
        error,
        cancel,
        generatePlan,
        personalizePlan,
        modifyPlan,
        summarizeProgress,
        refineTask,
        generateWeeklySummary,
        chat,
    };
}

/**
 * Parse error details into user-friendly messages
 */
function parseErrorMessage(errMsg: string | undefined, errCode?: number | string): string {
    const msg = errMsg?.toLowerCase() || "";

    // 1. Timeout errors (504 or AbortError)
    if (msg.includes("abort")) {
        return "AI is taking too long. Try a shorter request (e.g., '2 weeks' instead of '5 weeks').";
    }
    if (errCode === 504 || msg.includes("timeout") || msg.includes("timed out") || msg.includes("gateway")) {
        return "Request timed out. Try asking for a shorter plan (2 weeks max).";
    }
    // 2. Rate limit errors (429 only)
    if (errCode === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
        return "Too many requests. Please wait a moment and try again.";
    }
    // 3. Auth errors (401)
    if (errCode === 401 || msg.includes("unauthorized") || msg.includes("jwt")) {
        return "Session expired. Please refresh the page and try again.";
    }
    // 4. Server errors (500)
    if (errCode === 500 || msg.includes("internal")) {
        return "AI service error. Please try again in a moment.";
    }
    // 5. API key / config errors
    if (msg.includes("not configured") || msg.includes("api key")) {
        return "AI service is not configured. Please contact support.";
    }
    // 6. Generic fallback with actual message
    return errMsg || "Something went wrong. Please try again.";
}
