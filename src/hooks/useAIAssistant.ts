import { useState, useCallback } from "react";
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

export function useAIAssistant() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const callAIAssistant = useCallback(async <T>(body: Record<string, any>): Promise<AIResponse<T>> => {
        setLoading(true);
        setError(null);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);

        try {
            const { data, error: funcError } = await supabase.functions.invoke("ai-assistant", {
                body: {
                    ...body,
                    userId: user?.id, // Pass user ID for database context
                },
            });

            clearTimeout(timeoutId);

            if (funcError) {
                throw new Error(funcError.message);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            return {
                success: true,
                data: data.result as T,
                context: data.context
            };
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error("AI Assistant Error:", err);

            // Parse error details for better messaging
            let errorMessage: string;
            const errMsg = err.message?.toLowerCase() || "";
            const errCode = err.code || err.status;

            // 1. Timeout errors (504 or AbortError)
            if (err.name === "AbortError" || errMsg.includes("abort")) {
                errorMessage = "AI is taking too long. Try a shorter request (e.g., '2 weeks' instead of '5 weeks').";
            } else if (errCode === 504 || errMsg.includes("timeout") || errMsg.includes("timed out") || errMsg.includes("gateway")) {
                errorMessage = "Request timed out. Try asking for a shorter plan (2 weeks max).";
            }
            // 2. Rate limit errors (429)
            else if (errCode === 429 || errMsg.includes("rate") || errMsg.includes("too many")) {
                errorMessage = "Too many requests. Please wait a moment and try again.";
            }
            // 3. Auth errors (401)
            else if (errCode === 401 || errMsg.includes("unauthorized") || errMsg.includes("jwt")) {
                errorMessage = "Session expired. Please refresh the page and try again.";
            }
            // 4. Server errors (500)
            else if (errCode === 500 || errMsg.includes("internal")) {
                errorMessage = "AI service error. Please try again in a moment.";
            }
            // 5. API key / config errors
            else if (errMsg.includes("not configured") || errMsg.includes("api key")) {
                errorMessage = "AI service is not configured. Please contact support.";
            }
            // 6. Generic fallback with actual message
            else {
                errorMessage = err.message || "Something went wrong. Please try again.";
            }

            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
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
        logs: any[]
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
        generatePlan,
        personalizePlan,
        modifyPlan,
        summarizeProgress,
        refineTask,
        generateWeeklySummary,
        chat,
    };
}
