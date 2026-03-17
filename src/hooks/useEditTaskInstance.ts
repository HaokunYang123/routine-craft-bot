import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queries/keys";

export interface EditSingleParams {
  instanceId: string;
  revisedDate?: string;
  revisedStartTime?: string;
  revisedEndTime?: string;
  modificationReason?: string;
}

export interface EditRecurringParams {
  scheduleId: string;
  revisedWeekday?: number;
  revisedPatternStart?: string;
  revisedPatternEnd?: string;
  cascadeToFuture?: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  instance_not_found_or_unauthorized: "Task not found or you don't have permission to edit it.",
  instance_not_editable: "This task can't be edited because it's already completed or excused.",
  revised_date_in_past: "The new date can't be in the past.",
  invalid_time_range: "End time must be after start time.",
  invalid_time_value: "Please enter a valid time.",
  not_a_coach: "Only coaches can edit tasks.",
  schedule_not_found_or_unauthorized: "Schedule not found or you don't have permission to edit it.",
  invalid_weekday_range: "Invalid day of week.",
  weekday_not_applicable: "This recurring assignment doesn't support changing the day of week.",
  not_authenticated: "Please sign in again and try once more.",
};

function mapEditTaskError(error: unknown): string {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  return ERROR_MESSAGES[message] || "Something went wrong. Please try again.";
}

async function invalidateEditTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
    queryClient.invalidateQueries({ queryKey: ["task_instances"] }),
  ]);
}

export function useEditTaskInstance() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const singleMutation = useMutation({
    mutationFn: async (params: EditSingleParams) => {
      const { data, error } = await supabase.rpc("coach_edit_single_instance", {
        p_target_instance_id: params.instanceId,
        p_revised_date: params.revisedDate ?? null,
        p_revised_start_time: params.revisedStartTime ?? null,
        p_revised_end_time: params.revisedEndTime ?? null,
        p_modification_reason: params.modificationReason ?? null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await invalidateEditTaskQueries(queryClient);
    },
  });

  const recurringMutation = useMutation({
    mutationFn: async (params: EditRecurringParams) => {
      const { data, error } = await supabase.rpc("coach_edit_recurring_pattern", {
        p_target_schedule_id: params.scheduleId,
        p_revised_weekday: params.revisedWeekday ?? null,
        p_revised_pattern_start: params.revisedPatternStart ?? null,
        p_revised_pattern_end: params.revisedPatternEnd ?? null,
        p_cascade_to_future: params.cascadeToFuture ?? true,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await invalidateEditTaskQueries(queryClient);
    },
  });

  const editSingleInstance = useCallback(async (params: EditSingleParams) => {
    setError(null);
    try {
      return await singleMutation.mutateAsync(params);
    } catch (mutationError) {
      const message = mapEditTaskError(mutationError);
      setError(message);
      throw new Error(message);
    }
  }, [singleMutation]);

  const editRecurringPattern = useCallback(async (params: EditRecurringParams) => {
    setError(null);
    try {
      return await recurringMutation.mutateAsync(params);
    } catch (mutationError) {
      const message = mapEditTaskError(mutationError);
      setError(message);
      throw new Error(message);
    }
  }, [recurringMutation]);

  const isEditing = useMemo(
    () => singleMutation.isPending || recurringMutation.isPending,
    [singleMutation.isPending, recurringMutation.isPending],
  );

  return {
    editSingleInstance,
    editRecurringPattern,
    isEditing,
    error,
  };
}
