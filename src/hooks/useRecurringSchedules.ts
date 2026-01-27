import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from "@/lib/queries/keys";

import type { Tables } from "@/integrations/supabase/types";

// Database row type
type RecurringScheduleRow = Tables<"recurring_schedules">;

// Extended type with joined data
export interface RecurringSchedule extends RecurringScheduleRow {
  // Joined data (not in database)
  template_name?: string;
  student_name?: string;
  class_name?: string;
}

export interface CreateRecurringScheduleInput {
  name: string;
  description?: string;
  recurrence_type: string;
  days_of_week?: number[];
  custom_interval_days?: number;
  start_date?: string;
  end_date?: string;
  template_id?: string;
  assigned_student_id?: string;
  class_session_id?: string;
}

/**
 * Fetches recurring schedules with parallel enrichment of template, student, and class names.
 * Uses Promise.all to avoid waterfall queries.
 */
async function fetchSchedulesWithEnrichment(userId: string): Promise<RecurringSchedule[]> {
  const { data: schedules, error } = await supabase
    .from("recurring_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    // Handle PGRST205 gracefully per D-1003-01 (table might not exist yet)
    if (error.code === "PGRST205" || error.message?.includes("not find")) {
      console.log("Recurring schedules table not yet created");
      return [];
    }
    throw error;
  }

  if (!schedules?.length) return [];

  // Collect IDs for batch fetching (avoid waterfall)
  const templateIds = [...new Set(schedules.filter(s => s.template_id).map(s => s.template_id!))] as string[];
  const studentIds = [...new Set(schedules.filter(s => s.assigned_student_id).map(s => s.assigned_student_id!))] as string[];
  const classIds = [...new Set(schedules.filter(s => s.class_session_id).map(s => s.class_session_id!))] as string[];

  // Parallel fetch enrichment data using Promise.all
  const [templates, profiles, classes] = await Promise.all([
    templateIds.length > 0
      ? supabase.from("templates").select("id, name").in("id", templateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    studentIds.length > 0
      ? supabase.from("profiles").select("user_id, display_name").in("user_id", studentIds)
      : Promise.resolve({ data: [] as { user_id: string; display_name: string | null }[] }),
    classIds.length > 0
      ? supabase.from("class_sessions").select("id, name").in("id", classIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  // Build lookup maps
  const templateMap: Record<string, string> = {};
  (templates.data || []).forEach(t => { templateMap[t.id] = t.name; });

  const studentMap: Record<string, string> = {};
  (profiles.data || []).forEach(p => { studentMap[p.user_id] = p.display_name || "Student"; });

  const classMap: Record<string, string> = {};
  (classes.data || []).forEach(c => { classMap[c.id] = c.name; });

  // Enrich schedules
  return schedules.map(s => ({
    ...s,
    template_name: s.template_id ? templateMap[s.template_id] : undefined,
    student_name: s.assigned_student_id ? studentMap[s.assigned_student_id] : undefined,
    class_name: s.class_session_id ? classMap[s.class_session_id] : undefined,
  }));
}

export function useRecurringSchedules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: schedules,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.recurringSchedules.list(user?.id ?? ''),
    queryFn: () => fetchSchedulesWithEnrichment(user!.id),
    enabled: !!user,
  });

  const createSchedule = async (input: CreateRecurringScheduleInput): Promise<RecurringSchedule | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("recurring_schedules")
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          recurrence_type: input.recurrence_type,
          days_of_week: input.days_of_week || [],
          custom_interval_days: input.custom_interval_days || null,
          start_date: input.start_date,
          end_date: input.end_date || null,
          template_id: input.template_id || null,
          assigned_student_id: input.assigned_student_id || null,
          class_session_id: input.class_session_id || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Schedule Created",
        description: `"${input.name}" recurring schedule has been created.`,
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.recurringSchedules.list(user.id) });
      return data as RecurringSchedule;
    } catch (error) {
      handleError(error, { component: 'useRecurringSchedules', action: 'create schedule' });
      return null;
    }
  };

  const updateSchedule = async (
    id: string,
    updates: Partial<CreateRecurringScheduleInput & { is_active: boolean }>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Delete future pending task_instances for this schedule before updating
      // This prevents "ghost tasks" from remaining when schedule pattern changes
      const today = new Date().toISOString().split("T")[0];
      const { error: deleteError } = await supabase
        .from("task_instances")
        .delete()
        .eq("schedule_id", id)
        .eq("status", "pending")
        .gt("scheduled_date", today);

      if (deleteError) {
        console.warn("Could not delete future tasks for schedule:", deleteError.message);
        // Continue anyway - the schedule update is more important
      }

      const { error } = await supabase
        .from("recurring_schedules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Schedule Updated",
        description: "Recurring schedule has been updated. Future pending tasks have been cleared.",
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.recurringSchedules.list(user.id) });
      return true;
    } catch (error) {
      handleError(error, { component: 'useRecurringSchedules', action: 'update schedule' });
      return false;
    }
  };

  const deleteSchedule = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Delete all pending task_instances for this schedule first
      // This prevents "ghost tasks" from remaining after schedule deletion
      const today = new Date().toISOString().split("T")[0];
      const { error: deleteTasksError } = await supabase
        .from("task_instances")
        .delete()
        .eq("schedule_id", id)
        .eq("status", "pending")
        .gte("scheduled_date", today);

      if (deleteTasksError) {
        console.warn("Could not delete pending tasks for schedule:", deleteTasksError.message);
        // Continue anyway - the schedule deletion is more important
      }

      const { error } = await supabase
        .from("recurring_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Schedule Deleted",
        description: "Recurring schedule and pending tasks have been removed.",
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.recurringSchedules.list(user.id) });
      return true;
    } catch (error) {
      handleError(error, { component: 'useRecurringSchedules', action: 'delete schedule' });
      return false;
    }
  };

  const generateTasks = async (
    scheduleId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<{ success: boolean; taskCount?: number }> => {
    try {
      const { data, error } = await supabase.rpc("generate_recurring_tasks", {
        p_schedule_id: scheduleId,
        p_from_date: fromDate || new Date().toISOString().split("T")[0],
        p_to_date: toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

      if (error) throw error;

      const result = data as { success: boolean; task_count?: number; message?: string };

      if (result.success) {
        toast({
          title: "Tasks Generated",
          description: result.message || `Generated ${result.task_count} tasks.`,
        });
        return { success: true, taskCount: result.task_count };
      } else {
        throw new Error("Failed to generate tasks");
      }
    } catch (error) {
      handleError(error, { component: 'useRecurringSchedules', action: 'generate tasks' });
      return { success: false };
    }
  };

  return {
    schedules: schedules ?? [],
    loading: isPending,           // Backward compatible
    isFetching,                   // NEW - for background refresh indicator
    isError,                      // NEW - for error state display
    error,                        // NEW - for error details
    fetchSchedules: refetch,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    generateTasks,
  };
}
