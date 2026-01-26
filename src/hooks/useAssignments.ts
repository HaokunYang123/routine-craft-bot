import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { addDays, format, eachDayOfInterval, getDay, parseISO, startOfDay } from "date-fns";

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
  assignment_id: string | null;
  assignee_id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  completed_at: string | null;
  student_note: string | null;
  coach_note: string | null;
  created_at: string | null;
  updated_at: string | null;
  updated_by: string | null;
  is_customized: boolean;
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
    description?: string | null;
    duration_minutes?: number | null;
    start_date?: string;
    due_date?: string;
    scheduled_time?: string;
    day_offset: number;
  }>;
}

export function useAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createAssignment = useCallback(async (input: CreateAssignmentInput) => {
    console.log("[useAssignments] createAssignment called with input:", JSON.stringify(input, null, 2));
    console.log("[useAssignments] user:", user?.id);

    if (!user) {
      console.log("[useAssignments] No user, returning null");
      return null;
    }
    setLoading(true);

    try {
      console.log("[useAssignments] Starting assignment creation...");
      // Create the assignment
      const insertData = {
        template_id: input.template_id || null,
        group_id: input.group_id || null,
        assignee_id: input.assignee_id || null,
        assigned_by: user.id,
        schedule_type: input.schedule_type,
        schedule_days: input.schedule_days || [],
        start_date: input.start_date,
        end_date: input.end_date || null,
        is_active: true,
      };
      console.log("[useAssignments] Inserting assignment:", insertData);

      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert(insertData)
        .select()
        .single();

      console.log("[useAssignments] Assignment insert result - data:", assignment, "error:", assignmentError);

      if (assignmentError) throw assignmentError;

      // Get assignees (either from group or individual)
      let assigneeIds: string[] = [];
      console.log("[useAssignments] Getting assignees - group_id:", input.group_id, "assignee_id:", input.assignee_id);

      if (input.group_id) {
        const { data: members, error: membersError } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", input.group_id);
        console.log("[useAssignments] Group members result - data:", members, "error:", membersError);
        assigneeIds = (members || []).map((m) => m.user_id);
      } else if (input.assignee_id) {
        assigneeIds = [input.assignee_id];
      }

      console.log("[useAssignments] assigneeIds:", assigneeIds);

      if (assigneeIds.length === 0) {
        console.log("[useAssignments] No assignees found, returning early");
        toast({
          title: "Warning",
          description: "No assignees found for this assignment",
          variant: "destructive",
        });
        return assignment;
      }

      // Get tasks from template or use provided tasks
      let tasks: Array<{ name: string; description?: string | null; duration_minutes?: number | null; day_offset: number; start_date?: string; due_date?: string; scheduled_time?: string }> = [];

      if (input.template_id) {
        const { data: templateTasks, error: templateError } = await supabase
          .from("template_tasks")
          .select("title, description, duration_minutes, day_offset, sort_order")
          .eq("template_id", input.template_id)
          .order("sort_order", { ascending: true });

        if (templateError) {
          console.error("[useAssignments] Error fetching template tasks:", templateError);
          throw templateError;
        }

        console.log("[useAssignments] Template tasks fetched:", templateTasks?.length, "tasks");

        // Map tasks and assign sequential day_offset for any null values
        let nextDayOffset = 0;
        tasks = (templateTasks || []).map((t, index) => {
          // Use explicit day_offset if set, otherwise calculate based on position
          const offset = t.day_offset !== null && t.day_offset !== undefined
            ? t.day_offset
            : index; // Fallback: use index as day_offset if null

          // Track the max offset seen for sequential fallback
          if (t.day_offset !== null && t.day_offset !== undefined) {
            nextDayOffset = Math.max(nextDayOffset, t.day_offset + 1);
          }

          console.log(`[useAssignments] Task "${t.title}": db_offset=${t.day_offset}, used_offset=${offset}`);

          return {
            name: t.title,
            description: t.description,
            duration_minutes: t.duration_minutes,
            day_offset: offset,
          };
        });
      } else if (input.tasks) {
        // Custom tasks - preserve all fields including start_date, due_date, scheduled_time
        console.log("[useAssignments] Using custom tasks path - input.tasks:", input.tasks);
        tasks = input.tasks.map((t, index) => ({
          name: t.name,
          description: t.description,
          duration_minutes: t.duration_minutes,
          start_date: t.start_date,
          due_date: t.due_date,
          scheduled_time: t.scheduled_time,
          day_offset: 0,
        }));
        console.log("[useAssignments] Mapped custom tasks:", tasks);
      } else {
        console.log("[useAssignments] No template_id and no tasks provided!");
      }

      // Parse start_date properly to avoid timezone issues
      // Using parseISO ensures we get the date in local timezone
      // Format: "2026-01-20" -> Date object for Jan 20 in local timezone
      const [year, month, day] = input.start_date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day); // month is 0-indexed

      console.log("[useAssignments] Start date parsed:", input.start_date, "->", startDate.toISOString());

      // For templates, calculate end_date based on max day_offset
      let effectiveEndDate: Date;
      if (input.template_id && tasks.length > 0) {
        const maxOffset = Math.max(...tasks.map(t => t.day_offset));
        effectiveEndDate = addDays(startDate, maxOffset);
        console.log("[useAssignments] Template max offset:", maxOffset, "-> end date:", format(effectiveEndDate, "yyyy-MM-dd"));
      } else if (input.end_date) {
        const [ey, em, ed] = input.end_date.split('-').map(Number);
        effectiveEndDate = new Date(ey, em - 1, ed);
      } else {
        effectiveEndDate = addDays(startDate, 30);
      }

      // Create task instances for each assignee
      const taskInstances: Array<{
        assignment_id: string;
        assignee_id: string;
        name: string;
        description: string | null;
        duration_minutes: number | null;
        scheduled_date: string;
        scheduled_time: string | null;
        status: string;
      }> = [];

      // Check if any custom task has a specific due_date or start_date
      const hasCustomDates = tasks.some(t => t.due_date || t.start_date);

      if (hasCustomDates && !input.template_id) {
        // Custom tasks with specific dates: Each task uses its own dates
        // Priority: due_date > start_date > input.start_date
        console.log("[useAssignments] Using custom dates path");
        for (const assigneeId of assigneeIds) {
          for (const task of tasks) {
            const taskDate = task.due_date || task.start_date || input.start_date;
            taskInstances.push({
              assignment_id: assignment.id,
              assignee_id: assigneeId,
              name: task.name,
              description: task.description || null,
              duration_minutes: task.duration_minutes || null,
              scheduled_date: taskDate,
              scheduled_time: task.scheduled_time || null,
              status: "pending",
            });
          }
        }
      } else if (input.template_id) {
        // Template-based: ALWAYS use day_offset from each task
        // Each task gets scheduled on startDate + day_offset
        console.log("[useAssignments] Using template day_offset path for", tasks.length, "tasks");
        for (const assigneeId of assigneeIds) {
          for (const task of tasks) {
            const taskDate = addDays(startDate, task.day_offset);
            const scheduledDateStr = format(taskDate, "yyyy-MM-dd");

            console.log(`[useAssignments] Creating instance: "${task.name}" offset=${task.day_offset} -> ${scheduledDateStr}`);

            taskInstances.push({
              assignment_id: assignment.id,
              assignee_id: assigneeId,
              name: task.name,
              description: task.description || null,
              duration_minutes: task.duration_minutes || null,
              scheduled_date: scheduledDateStr,
              scheduled_time: task.scheduled_time || null,
              status: "pending",
            });
          }
        }
      } else if (input.schedule_type === "once") {
        // Single custom task(s) on start_date
        console.log("[useAssignments] Using 'once' schedule path");
        for (const assigneeId of assigneeIds) {
          for (const task of tasks) {
            taskInstances.push({
              assignment_id: assignment.id,
              assignee_id: assigneeId,
              name: task.name,
              description: task.description || null,
              duration_minutes: task.duration_minutes || null,
              scheduled_date: input.start_date,
              scheduled_time: task.scheduled_time || null,
              status: "pending",
            });
          }
        }
      } else {
        // Recurring schedule: Use schedule_type to determine dates
        console.log("[useAssignments] Using recurring schedule path:", input.schedule_type);
        const scheduledDates = getScheduledDates(
          startDate,
          effectiveEndDate,
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
                scheduled_time: task.scheduled_time || null,
                status: "pending",
              });
            }
          }
        }
      }

      console.log("[useAssignments] Total task instances to create:", taskInstances.length);
      console.log("[useAssignments] Task instances:", JSON.stringify(taskInstances, null, 2));

      if (taskInstances.length > 0) {
        console.log("[useAssignments] Inserting task instances...");
        const { data: insertedInstances, error: instancesError } = await supabase
          .from("task_instances")
          .insert(taskInstances)
          .select();

        console.log("[useAssignments] Task instances insert result - data:", insertedInstances, "error:", instancesError);

        if (instancesError) {
          // Rollback: Delete the orphaned assignment header if task creation fails
          console.log("[useAssignments] Task creation failed, rolling back assignment...");
          const { error: rollbackError } = await supabase
            .from("assignments")
            .delete()
            .eq("id", assignment.id);

          if (rollbackError) {
            console.error("[useAssignments] Rollback failed:", rollbackError);
          }

          throw instancesError;
        }
      } else {
        console.log("[useAssignments] No task instances to create - skipping insert");
      }

      toast({
        title: "Assignment Created",
        description: `Created ${taskInstances.length} task instances`,
      });

      return assignment;
    } catch (error) {
      handleError(error, { component: 'useAssignments', action: 'create assignment' });
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
      includeFullHistory?: boolean; // Set to true to fetch all history, otherwise defaults to 7 days
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
      } else if (filters.startDate) {
        query = query.gte("scheduled_date", filters.startDate);
      } else if (!filters.includeFullHistory) {
        // Default: Only fetch tasks from the past 7 days unless explicitly requesting full history
        const sevenDaysAgo = format(addDays(new Date(), -7), "yyyy-MM-dd");
        query = query.gte("scheduled_date", sevenDaysAgo);
      }

      if (filters.endDate) {
        query = query.lte("scheduled_date", filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleError(error, { component: 'useAssignments', action: 'fetch task instances', silent: true });
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
        return { completed: 0, total: 0, members: [], overdueCount: 0 };
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

      // Get task instances for the date (scheduled for today)
      const { data: todayInstances } = await supabase
        .from("task_instances")
        .select("*")
        .in("assignee_id", memberIds)
        .eq("scheduled_date", targetDate);

      // Also get overdue tasks (scheduled before today, still pending)
      // This captures "catch-up" work students do on old tasks
      const { data: overdueInstances } = await supabase
        .from("task_instances")
        .select("*")
        .in("assignee_id", memberIds)
        .lt("scheduled_date", targetDate)
        .eq("status", "pending");

      // Get tasks completed TODAY that were originally scheduled for earlier dates
      // (catch-up completions)
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: catchupInstances } = await supabase
        .from("task_instances")
        .select("*")
        .in("assignee_id", memberIds)
        .lt("scheduled_date", targetDate)
        .eq("status", "completed")
        .gte("completed_at", `${todayStr}T00:00:00`);

      // Combine today's instances with catch-up completions for a full picture
      const allRelevantInstances = [
        ...(todayInstances || []),
        ...(catchupInstances || []),
      ];

      // Calculate per-member stats
      const memberStats = memberIds.map((userId) => {
        const userTasks = allRelevantInstances.filter((t) => t.assignee_id === userId);
        const completed = userTasks.filter((t) => t.status === "completed").length;
        const total = userTasks.length;
        const userOverdue = (overdueInstances || []).filter((t) => t.assignee_id === userId).length;

        return {
          id: userId,
          name: profileMap[userId] || "Student",
          completedToday: completed,
          totalToday: total,
          overdueCount: userOverdue,
        };
      });

      const totalCompleted = memberStats.reduce((sum, m) => sum + m.completedToday, 0);
      const totalTasks = memberStats.reduce((sum, m) => sum + m.totalToday, 0);
      const totalOverdue = memberStats.reduce((sum, m) => sum + (m.overdueCount || 0), 0);

      return {
        completed: totalCompleted,
        total: totalTasks,
        members: memberStats,
        overdueCount: totalOverdue,
      };
    } catch (error) {
      handleError(error, { component: 'useAssignments', action: 'get group progress', silent: true });
      return { completed: 0, total: 0, members: [], overdueCount: 0 };
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
