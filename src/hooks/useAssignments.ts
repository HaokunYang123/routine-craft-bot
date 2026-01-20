import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { addDays, format, eachDayOfInterval, getDay } from "date-fns";

export interface Assignment {
  id: string;
  template_id: string | null;
  group_id: string | null;
  assignee_id: string | null;
  assigned_by: string;
  schedule_type: "once" | "daily" | "weekly" | "custom";
  schedule_days: number[];
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  template_name?: string;
  group_name?: string;
  assignee_name?: string;
}

export interface TaskInstance {
  id: string;
  assignment_id: string;
  assignee_id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: "pending" | "completed" | "missed";
  completed_at: string | null;
  student_note: string | null;
  created_at: string;
}

interface CreateAssignmentInput {
  template_id?: string;
  group_id?: string;
  assignee_id?: string;
  schedule_type: "once" | "daily" | "weekly" | "custom";
  schedule_days?: number[];
  start_date: string;
  end_date?: string;
  tasks?: Array<{
    name: string;
    description?: string;
    duration_minutes?: number;
    due_date?: string;
  }>;
}

export function useAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createAssignment = useCallback(async (input: CreateAssignmentInput) => {
    if (!user) return null;
    setLoading(true);

    try {
      // Create the assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          template_id: input.template_id || null,
          group_id: input.group_id || null,
          assignee_id: input.assignee_id || null,
          assigned_by: user.id,
          schedule_type: input.schedule_type,
          schedule_days: input.schedule_days || [],
          start_date: input.start_date,
          end_date: input.end_date || null,
          is_active: true,
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Get assignees (either from group or individual)
      let assigneeIds: string[] = [];
      if (input.group_id) {
        const { data: members } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", input.group_id);
        assigneeIds = (members || []).map((m) => m.user_id);
      } else if (input.assignee_id) {
        assigneeIds = [input.assignee_id];
      }

      if (assigneeIds.length === 0) {
        toast({
          title: "Warning",
          description: "No assignees found for this assignment",
          variant: "destructive",
        });
        return assignment;
      }

      // Get tasks from template or use provided tasks
      let tasks: Array<{ name: string; description?: string; duration_minutes?: number; day_offset?: number; due_date?: string }> = [];

      if (input.template_id) {
        const { data: templateTasks } = await supabase
          .from("template_tasks")
          .select("title, description, duration_minutes, day_offset, sort_order")
          .eq("template_id", input.template_id)
          .order("sort_order", { ascending: true });
        tasks = (templateTasks || []).map((t) => ({
          name: t.title,
          description: t.description,
          duration_minutes: t.duration_minutes,
          day_offset: t.day_offset || 0,
        }));
      } else if (input.tasks) {
        tasks = input.tasks;
      }

      // Generate task instances based on schedule
      const startDate = new Date(input.start_date);
      const endDate = input.end_date ? new Date(input.end_date) : addDays(startDate, 30);

      // Create task instances for each assignee
      const taskInstances: Array<{
        assignment_id: string;
        assignee_id: string;
        name: string;
        description: string | null;
        duration_minutes: number | null;
        scheduled_date: string;
        status: string;
      }> = [];

      // Check if tasks have day_offset (template-based scheduling)
      const hasTaskOffsets = tasks.some(t => t.day_offset !== undefined && t.day_offset !== 0);
      // Check if any custom task has a specific due_date
      const hasCustomDueDates = tasks.some(t => t.due_date);

      if (hasCustomDueDates) {
        // Custom tasks with specific due dates: Each task uses its own due_date or falls back to start_date
        for (const assigneeId of assigneeIds) {
          for (const task of tasks) {
            const taskDate = task.due_date || input.start_date;
            taskInstances.push({
              assignment_id: assignment.id,
              assignee_id: assigneeId,
              name: task.name,
              description: task.description || null,
              duration_minutes: task.duration_minutes || null,
              scheduled_date: taskDate,
              status: "pending",
            });
          }
        }
      } else if (hasTaskOffsets || input.template_id) {
        // Template-based: Use day_offset from each task to schedule on different days
        // Each task gets scheduled on startDate + day_offset
        for (const assigneeId of assigneeIds) {
          for (const task of tasks) {
            const taskDate = addDays(startDate, task.day_offset || 0);
            taskInstances.push({
              assignment_id: assignment.id,
              assignee_id: assigneeId,
              name: task.name,
              description: task.description || null,
              duration_minutes: task.duration_minutes || null,
              scheduled_date: format(taskDate, "yyyy-MM-dd"),
              status: "pending",
            });
          }
        }
      } else {
        // Custom tasks or recurring: Use schedule_type to determine dates
        const scheduledDates = getScheduledDates(
          startDate,
          endDate,
          input.schedule_type,
          input.schedule_days || []
        );

        for (const assigneeId of assigneeIds) {
          for (const date of scheduledDates) {
            for (const task of tasks) {
              taskInstances.push({
                assignment_id: assignment.id,
                assignee_id: assigneeId,
                name: task.name,
                description: task.description || null,
                duration_minutes: task.duration_minutes || null,
                scheduled_date: format(date, "yyyy-MM-dd"),
                status: "pending",
              });
            }
          }
        }
      }

      if (taskInstances.length > 0) {
        const { error: instancesError } = await supabase
          .from("task_instances")
          .insert(taskInstances);

        if (instancesError) throw instancesError;
      }

      toast({
        title: "Assignment Created",
        description: `Created ${taskInstances.length} task instances`,
      });

      return assignment;
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const getTaskInstances = useCallback(async (
    filters: {
      assigneeId?: string;
      groupId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TaskInstance[]> => {
    try {
      let query = supabase
        .from("task_instances")
        .select("*")
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (filters.assigneeId) {
        query = query.eq("assignee_id", filters.assigneeId);
      }

      if (filters.date) {
        query = query.eq("scheduled_date", filters.date);
      }

      if (filters.startDate) {
        query = query.gte("scheduled_date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("scheduled_date", filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching task instances:", error);
      return [];
    }
  }, []);

  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: "pending" | "completed" | "missed",
    note?: string
  ) => {
    try {
      const updates: any = {
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      };

      if (note !== undefined) {
        updates.student_note = note;
      }

      const { error } = await supabase
        .from("task_instances")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      if (status === "completed") {
        toast({
          title: "Task Completed",
          description: "Great job!",
        });
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const getGroupProgress = useCallback(async (groupId: string, date?: string) => {
    const targetDate = date || format(new Date(), "yyyy-MM-dd");

    try {
      // Get group members
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (!members || members.length === 0) {
        return { completed: 0, total: 0, members: [] };
      }

      const memberIds = members.map((m) => m.user_id);

      // Get profiles for display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", memberIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        // Use display_name, fallback to email prefix, then "Student"
        const emailPrefix = p.email ? p.email.split("@")[0] : null;
        profileMap[p.user_id] = p.display_name || emailPrefix || "Student";
      });

      // Get task instances for the date
      const { data: instances } = await supabase
        .from("task_instances")
        .select("*")
        .in("assignee_id", memberIds)
        .eq("scheduled_date", targetDate);

      // Calculate per-member stats
      const memberStats = memberIds.map((userId) => {
        const userTasks = (instances || []).filter((t) => t.assignee_id === userId);
        const completed = userTasks.filter((t) => t.status === "completed").length;
        const total = userTasks.length;

        return {
          id: userId,
          name: profileMap[userId] || "Student",
          completedToday: completed,
          totalToday: total,
        };
      });

      const totalCompleted = memberStats.reduce((sum, m) => sum + m.completedToday, 0);
      const totalTasks = memberStats.reduce((sum, m) => sum + m.totalToday, 0);

      return {
        completed: totalCompleted,
        total: totalTasks,
        members: memberStats,
      };
    } catch (error) {
      console.error("Error getting group progress:", error);
      return { completed: 0, total: 0, members: [] };
    }
  }, []);

  return {
    loading,
    createAssignment,
    getTaskInstances,
    updateTaskStatus,
    getGroupProgress,
  };
}

// Helper function to get scheduled dates based on schedule type
function getScheduledDates(
  startDate: Date,
  endDate: Date,
  scheduleType: string,
  scheduleDays: number[]
): Date[] {
  const dates: Date[] = [];

  if (scheduleType === "once") {
    return [startDate];
  }

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  for (const day of allDays) {
    const dayOfWeek = getDay(day); // 0 = Sunday, 1 = Monday, etc.

    switch (scheduleType) {
      case "daily":
        dates.push(day);
        break;
      case "weekly":
        // Default to same day of week as start date
        if (dayOfWeek === getDay(startDate)) {
          dates.push(day);
        }
        break;
      case "custom":
        if (scheduleDays.includes(dayOfWeek)) {
          dates.push(day);
        }
        break;
    }
  }

  return dates;
}
