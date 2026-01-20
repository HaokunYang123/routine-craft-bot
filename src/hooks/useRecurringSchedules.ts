import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface RecurringSchedule {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  recurrence_type: "daily" | "weekly" | "custom";
  days_of_week: number[];
  custom_interval_days: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  assigned_student_id: string | null;
  class_session_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  template_name?: string;
  student_name?: string;
  class_name?: string;
}

export interface CreateRecurringScheduleInput {
  name: string;
  description?: string;
  recurrence_type: "daily" | "weekly" | "custom";
  days_of_week?: number[];
  custom_interval_days?: number;
  start_date: string;
  end_date?: string;
  template_id?: string;
  assigned_student_id?: string;
  class_session_id?: string;
}

export function useRecurringSchedules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recurring_schedules" as never)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Table might not exist yet
        if (error.code === "PGRST205" || error.message?.includes("not find")) {
          console.log("Recurring schedules table not yet created");
          setSchedules([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Fetch related data
      const scheduleData = data || [];

      // Get template names
      const templateIds = scheduleData
        .filter((s: RecurringSchedule) => s.template_id)
        .map((s: RecurringSchedule) => s.template_id);

      const templateMap: Record<string, string> = {};
      if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from("templates" as never)
          .select("id, name")
          .in("id", templateIds as string[]);
        (templates as Array<{ id: string; name: string }> | null)?.forEach((t) => {
          templateMap[t.id] = t.name;
        });
      }

      // Get student names
      const studentIds = scheduleData
        .filter((s: RecurringSchedule) => s.assigned_student_id)
        .map((s: RecurringSchedule) => s.assigned_student_id);

      const studentMap: Record<string, string> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", studentIds as string[]);
        (profiles as Array<{ user_id: string; display_name: string }> | null)?.forEach((p) => {
          studentMap[p.user_id] = p.display_name || "Student";
        });
      }

      // Get class names
      const classIds = scheduleData
        .filter((s: RecurringSchedule) => s.class_session_id)
        .map((s: RecurringSchedule) => s.class_session_id);

      const classMap: Record<string, string> = {};
      if (classIds.length > 0) {
        const { data: classes } = await supabase
          .from("class_sessions" as never)
          .select("id, name")
          .in("id", classIds as string[]);
        (classes as Array<{ id: string; name: string }> | null)?.forEach((c) => {
          classMap[c.id] = c.name;
        });
      }

      // Enrich schedules
      const enrichedSchedules: RecurringSchedule[] = scheduleData.map((s: any) => ({
        ...s,
        template_name: s.template_id ? templateMap[s.template_id] : undefined,
        student_name: s.assigned_student_id ? studentMap[s.assigned_student_id] : undefined,
        class_name: s.class_session_id ? classMap[s.class_session_id] : undefined,
      }));

      setSchedules(enrichedSchedules);
    } catch (error: any) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Error",
        description: "Failed to load recurring schedules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user, fetchSchedules]);

  const createSchedule = async (input: CreateRecurringScheduleInput): Promise<RecurringSchedule | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("recurring_schedules" as any)
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

      await fetchSchedules();
      return data as RecurringSchedule;
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create schedule.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateSchedule = async (
    id: string,
    updates: Partial<CreateRecurringScheduleInput & { is_active: boolean }>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("recurring_schedules" as any)
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Schedule Updated",
        description: "Recurring schedule has been updated.",
      });

      await fetchSchedules();
      return true;
    } catch (error: any) {
      console.error("Error updating schedule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteSchedule = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("recurring_schedules" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Schedule Deleted",
        description: "Recurring schedule has been removed.",
      });

      setSchedules((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete schedule.",
        variant: "destructive",
      });
      return false;
    }
  };

  const generateTasks = async (
    scheduleId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<{ success: boolean; taskCount?: number }> => {
    try {
      const { data, error } = await supabase.rpc("generate_recurring_tasks" as any, {
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
    } catch (error: any) {
      console.error("Error generating tasks:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate tasks.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  return {
    schedules,
    loading,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    generateTasks,
  };
}
