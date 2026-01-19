import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types for AI Assistant actions
export interface GeneratedTask {
    title: string;
    description: string;
    duration_minutes: number;
    day_offset: number;
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
}

export function useAIAssistant() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const callAIAssistant = useCallback(async <T>(body: Record<string, any>): Promise<AIResponse<T>> => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: funcError } = await supabase.functions.invoke("ai-assistant", {
                body,
            });

            if (funcError) {
                throw new Error(funcError.message);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            return { success: true, data: data.result as T };
        } catch (err: any) {
            console.error("AI Assistant Error:", err);
            const errorMessage = err.message || "Brainstorming... please try again.";
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    // Generate a training/study plan from natural language
    const generatePlan = useCallback(async (request: string, context?: string): Promise<AIResponse<GeneratedTask[]>> => {
        return callAIAssistant<GeneratedTask[]>({
            action: "generate_plan",
            payload: { request, context }
        });
    }, [callAIAssistant]);

    // Modify an existing plan with constraints
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
    const refineTask = useCallback(async (description: string): Promise<AIResponse<string>> => {
        const response = await callAIAssistant<string>({
            action: "refine_task",
            payload: { description }
        });
        return response;
    }, [callAIAssistant]);

    // Generate weekly summary for all students
    const generateWeeklySummary = useCallback(async (
        completionData: CompletionDataItem[]
    ): Promise<AIResponse<string>> => {
        return callAIAssistant<string>({
            action: "weekly_summary",
            payload: { completionData }
        });
    }, [callAIAssistant]);

    return {
        loading,
        error,
        generatePlan,
        modifyPlan,
        summarizeProgress,
        refineTask,
        generateWeeklySummary,
    };
}
