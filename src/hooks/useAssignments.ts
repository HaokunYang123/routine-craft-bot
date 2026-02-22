import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from "@/lib/queries/keys";
import { addDays, format, eachDayOfInterval, getDay, addMonths, setDate, getDate, lastDayOfMonth } from "date-fns";

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
    scheduled_date?: string;
    scheduled_time?: string;
    day_offset: number;
  }>;
}

interface UpdateTaskStatusInput {
  taskId: string;
  status: "pending" | "completed" | "missed";
  note?: string;
  // Context for cache update (used for optimistic updates)
  assigneeId?: string;
  date?: string;
}

interface AssignGroupTaskInput {
  groupId: string;
  title: string;
  description?: string;
  assignDate: string;   // When student sees task
  dueDate: string;      // When task is due
  startTime?: string;
  endTime?: string;
  scheduleType?: "once" | "daily" | "weekly" | "monthly" | "custom";
  scheduleDays?: number[];  // For custom: day of week (0-6), for monthly: day of month (1-31 or -1)
}

interface ExcuseTaskInput {
  taskId: string;
  studentId: string;
}

const debugLog = (..._args: unknown[]) => {};

export function useAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track task instance count for success toast (set during mutation)
  let lastTaskInstanceCount = 0;

  const createAssignmentMutation = useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      debugLog("[useAssignments] createAssignment called with input:", JSON.stringify(input, null, 2));
      debugLog("[useAssignments] user:", user?.id);

      if (!user) {
        debugLog("[useAssignments] No user, throwing error");
        throw new Error("No authenticated user");
      }

      debugLog("[useAssignments] Starting assignment creation...");
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
      debugLog("[useAssignments] Inserting assignment:", insertData);

      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert(insertData)
        .select()
        .single();

      debugLog("[useAssignments] Assignment insert result - data:", assignment, "error:", assignmentError);

      if (assignmentError) throw assignmentError;

      // Get assignees (either from group or individual)
      let assigneeIds: string[] = [];
      debugLog("[useAssignments] Getting assignees - group_id:", input.group_id, "assignee_id:", input.assignee_id);

      if (input.group_id) {
        const { data: members, error: membersError } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", input.group_id);
        debugLog("[useAssignments] Group members result - data:", members, "error:", membersError);
        assigneeIds = (members || []).map((m) => m.user_id);
      } else if (input.assignee_id) {
        assigneeIds = [input.assignee_id];
      }

      debugLog("[useAssignments] assigneeIds:", assigneeIds);

      if (assigneeIds.length === 0) {
        debugLog("[useAssignments] No assignees found, returning early");
        // Show warning but still return assignment (not a hard error)
        toast({
          title: "Warning",
          description: "No assignees found for this assignment",
          variant: "destructive",
        });
        lastTaskInstanceCount = 0;
        return assignment;
      }

      // Get tasks from template or use provided tasks
      let tasks: Array<{ name: string; description?: string | null; duration_minutes?: number | null; day_offset: number; scheduled_date?: string; scheduled_time?: string }> = [];

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

        debugLog("[useAssignments] Template tasks fetched:", templateTasks?.length, "tasks");

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

          debugLog(`[useAssignments] Task "${t.title}": db_offset=${t.day_offset}, used_offset=${offset}`);

          return {
            name: t.title,
            description: t.description,
            duration_minutes: t.duration_minutes,
            day_offset: offset,
          };
        });
      } else if (input.tasks) {
        // Custom tasks - preserve all fields including scheduled_date, scheduled_time
        debugLog("[useAssignments] Using custom tasks path - input.tasks:", input.tasks);
        tasks = input.tasks.map((t) => ({
          name: t.name,
          description: t.description,
          duration_minutes: t.duration_minutes,
          scheduled_date: t.scheduled_date,
          scheduled_time: t.scheduled_time,
          day_offset: 0,
        }));
        debugLog("[useAssignments] Mapped custom tasks:", tasks);
      } else {
        debugLog("[useAssignments] No template_id and no tasks provided!");
      }

      // Parse start_date properly to avoid timezone issues
      // Using parseISO ensures we get the date in local timezone
      // Format: "2026-01-20" -> Date object for Jan 20 in local timezone
      const [year, month, day] = input.start_date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day); // month is 0-indexed

      debugLog("[useAssignments] Start date parsed:", input.start_date, "->", startDate.toISOString());

      // For templates, calculate end_date based on max day_offset
      let effectiveEndDate: Date;
      if (input.template_id && tasks.length > 0) {
        const maxOffset = Math.max(...tasks.map(t => t.day_offset));
        effectiveEndDate = addDays(startDate, maxOffset);
        debugLog("[useAssignments] Template max offset:", maxOffset, "-> end date:", format(effectiveEndDate, "yyyy-MM-dd"));
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

      // Check if any custom task has a specific scheduled_date
      const hasCustomDates = tasks.some(t => t.scheduled_date);

      if (hasCustomDates && !input.template_id) {
        // Custom tasks with specific dates: Each task uses its own scheduled_date
        debugLog("[useAssignments] Using custom dates path");
        for (const assigneeId of assigneeIds) {
          for (const task of tasks) {
            const taskDate = task.scheduled_date || input.start_date;
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
        debugLog("[useAssignments] Using template day_offset path for", tasks.length, "tasks");
        for (const assigneeId of assigneeIds) {
          for (const task of tasks) {
            const taskDate = addDays(startDate, task.day_offset);
            const scheduledDateStr = format(taskDate, "yyyy-MM-dd");

            debugLog(`[useAssignments] Creating instance: "${task.name}" offset=${task.day_offset} -> ${scheduledDateStr}`);

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
        debugLog("[useAssignments] Using 'once' schedule path");
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
        debugLog("[useAssignments] Using recurring schedule path:", input.schedule_type);
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

      debugLog("[useAssignments] Total task instances to create:", taskInstances.length);
      debugLog("[useAssignments] Task instances:", JSON.stringify(taskInstances, null, 2));

      if (taskInstances.length > 0) {
        debugLog("[useAssignments] Inserting task instances...");
        const { data: insertedInstances, error: instancesError } = await supabase
          .from("task_instances")
          .insert(taskInstances)
          .select();

        debugLog("[useAssignments] Task instances insert result - data:", insertedInstances, "error:", instancesError);

        if (instancesError) {
          // Rollback: Delete the orphaned assignment header if task creation fails
          debugLog("[useAssignments] Task creation failed, rolling back assignment...");
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
        debugLog("[useAssignments] No task instances to create - skipping insert");
      }

      // Store for success toast
      lastTaskInstanceCount = taskInstances.length;

      return assignment;
    },
    onSuccess: () => {
      toast({
        title: "Assignment Created",
        description: `Created ${lastTaskInstanceCount} task instances`,
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
    onError: (error) => {
      handleError(error, { component: 'useAssignments', action: 'create assignment' });
    },
  });

  // Backward-compatible wrapper: catches errors and returns null
  const createAssignment = useCallback(async (input: CreateAssignmentInput) => {
    if (!user) {
      debugLog("[useAssignments] No user, returning null");
      return null;
    }
    try {
      return await createAssignmentMutation.mutateAsync(input);
    } catch {
      // Error already handled by onError
      return null;
    }
  }, [user, createAssignmentMutation]);

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
      return await queryClient.fetchQuery({
        queryKey: queryKeys.assignments.instances({
          assigneeId: filters.assigneeId,
          date: filters.date,
          startDate: filters.startDate,
        }),
        queryFn: async () => {
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
        },
        staleTime: 30 * 1000, // 30 seconds - task instances change frequently
      });
    } catch (error) {
      handleError(error, { component: 'useAssignments', action: 'fetch task instances', silent: true });
      return [];
    }
  }, [queryClient]);

  // Optimistic update mutation for task status
  // Key feature: checkbox updates instantly, rollback on error
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, note }: UpdateTaskStatusInput) => {
      const updates: Record<string, unknown> = {
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
      return { taskId, status };
    },

    onMutate: async ({ taskId, status, assigneeId, date }) => {
      // 1. Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.assignments.all });

      // 2. Build the specific query key for this user's tasks
      const instancesKey = queryKeys.assignments.instances({
        assigneeId,
        date,
      });

      // 3. Snapshot current cache for rollback
      const previousTasks = queryClient.getQueryData<TaskInstance[]>(instancesKey);

      // 4. Optimistically update the cache
      if (previousTasks) {
        queryClient.setQueryData<TaskInstance[]>(instancesKey, (old) =>
          old?.map((t) =>
            t.id === taskId
              ? { ...t, status, completed_at: status === "completed" ? new Date().toISOString() : null }
              : t
          )
        );
      }

      // 5. Return context for rollback
      return { previousTasks, instancesKey };
    },

    onError: (_err, _variables, context) => {
      // Rollback to previous state
      if (context?.previousTasks) {
        queryClient.setQueryData(context.instancesKey, context.previousTasks);
      }
      // Show error toast (per CONTEXT.md - user-friendly message)
      toast({
        title: "Error",
        description: "Couldn't save changes. Please try again.",
        variant: "destructive",
      });
    },

    onSettled: () => {
      // Always refetch to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },

    // Note: NO onSuccess toast per CONTEXT.md - task completion is frequent, toasts add noise
  });

  // Backward-compatible wrapper: returns boolean for success/failure
  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: "pending" | "completed" | "missed",
    note?: string,
    assigneeId?: string,
    date?: string
  ) => {
    try {
      await updateTaskStatusMutation.mutateAsync({ taskId, status, note, assigneeId, date });
      return true;
    } catch {
      // Error already handled by onError
      return false;
    }
  }, [updateTaskStatusMutation]);

  // Assign task to all members of a group
  // For one-time tasks: uses RPC for atomicity
  // For recurring tasks: creates instances directly (RPC doesn't support recurring)
  const assignGroupTaskMutation = useMutation({
    mutationFn: async (input: AssignGroupTaskInput) => {
      if (!user) {
        throw new Error("No authenticated user");
      }

      debugLog("[useAssignments] assignGroupTask called with input:", JSON.stringify(input, null, 2));

      const scheduleType = input.scheduleType || "once";

      // For one-time tasks, use the RPC (simpler, atomic)
      if (scheduleType === "once") {
        const { data, error } = await supabase.rpc("assign_task_to_group", {
          p_group_id: input.groupId,
          p_title: input.title,
          p_description: input.description || null,
          p_assign_date: input.assignDate,  // When student sees the task
          p_due_date: input.dueDate,         // When task is due
          p_start_time: input.startTime || null,
          p_end_time: input.endTime || null,
        });

        if (error) {
          console.error("[useAssignments] assignGroupTask RPC error:", error);
          throw error;
        }

        debugLog("[useAssignments] assignGroupTask success, created", data, "task instances");
        return data as number;
      }

      // For recurring tasks, handle directly since RPC only supports one-time
      debugLog("[useAssignments] Using recurring schedule path for group task:", scheduleType);

      // Get group members
      const { data: members, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", input.groupId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) {
        debugLog("[useAssignments] No members in group, returning 0");
        return 0;
      }

      const assigneeIds = members.map((m) => m.user_id);
      debugLog("[useAssignments] Found", assigneeIds.length, "group members");

      // Parse dates
      const [ay, am, ad] = input.assignDate.split('-').map(Number);
      const startDate = new Date(ay, am - 1, ad);

      const [dy, dm, dd] = input.dueDate.split('-').map(Number);
      const endDate = new Date(dy, dm - 1, dd);

      // Calculate scheduled dates based on schedule type
      const scheduledDates = getScheduledDates(
        startDate,
        endDate,
        scheduleType,
        input.scheduleDays || []
      );

      debugLog("[useAssignments] Calculated", scheduledDates.length, "scheduled dates for recurring task");

      // Create assignment record
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          assigned_by: user.id,
          group_id: input.groupId,
          schedule_type: scheduleType,
          schedule_days: input.scheduleDays || [],
          start_date: input.assignDate,
          end_date: input.dueDate,
          is_active: true,
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Create task instances for each date × each assignee
      const taskInstances: Array<{
        assignment_id: string;
        assignee_id: string;
        name: string;
        description: string | null;
        assign_date: string;
        scheduled_date: string;
        start_time: string | null;
        scheduled_time: string | null;
        end_time: string | null;
        status: string;
        coach_id: string;
      }> = [];

      for (const date of scheduledDates) {
        const dateStr = format(date, "yyyy-MM-dd");
        for (const assigneeId of assigneeIds) {
          taskInstances.push({
            assignment_id: assignment.id,
            assignee_id: assigneeId,
            name: input.title,
            description: input.description || null,
            assign_date: dateStr,
            scheduled_date: dateStr,
            start_time: input.startTime || null,
            scheduled_time: input.startTime || null,
            end_time: input.endTime || null,
            status: "pending",
            coach_id: user.id,
          });
        }
      }

      debugLog("[useAssignments] Creating", taskInstances.length, "task instances for recurring group task");

      if (taskInstances.length > 0) {
        const { error: instancesError } = await supabase
          .from("task_instances")
          .insert(taskInstances);

        if (instancesError) {
          // Rollback: delete orphaned assignment
          await supabase.from("assignments").delete().eq("id", assignment.id);
          throw instancesError;
        }
      }

      return taskInstances.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Tasks Assigned",
        description: `Created ${count} task instance${count !== 1 ? "s" : ""} for group members`,
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
    onError: (error) => {
      handleError(error, { component: "useAssignments", action: "assign group task" });
    },
  });

  // Backward-compatible wrapper for assignGroupTask
  const assignGroupTask = useCallback(async (input: AssignGroupTaskInput) => {
    if (!user) {
      debugLog("[useAssignments] No user, returning null");
      return null;
    }
    try {
      return await assignGroupTaskMutation.mutateAsync(input);
    } catch {
      // Error already handled by onError
      return null;
    }
  }, [user, assignGroupTaskMutation]);

  // Mutation for excusing overdue tasks (coach-only action)
  // Sets task status to 'excused' to keep audit trail per CONTEXT.md
  const excuseTaskMutation = useMutation({
    mutationFn: async ({ taskId }: ExcuseTaskInput) => {
      const { error } = await supabase
        .from("task_instances")
        .update({
          status: "excused",
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", taskId);

      if (error) throw error;
      return { taskId };
    },

    onSuccess: () => {
      toast({
        title: "Task Excused",
        description: "The task has been excused and removed from the student's overdue list.",
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },

    onError: (error) => {
      handleError(error, { component: "useAssignments", action: "excuse task" });
    },
  });

  // Backward-compatible wrapper: returns boolean for success/failure
  const excuseTask = useCallback(async (input: ExcuseTaskInput) => {
    if (!user) {
      debugLog("[useAssignments] No user, returning false");
      return false;
    }
    try {
      await excuseTaskMutation.mutateAsync(input);
      return true;
    } catch {
      // Error already handled by onError
      return false;
    }
  }, [user, excuseTaskMutation]);

  const getGroupProgress = useCallback(async (groupId: string, date?: string) => {
    // Note: For timezone-aware "today", callers should pass todayDateString from useTimezone
    // Default uses server/browser date which may differ from user's local date (TIME-03)
    const targetDate = date || format(new Date(), "yyyy-MM-dd");

    try {
      return await queryClient.fetchQuery({
        queryKey: queryKeys.assignments.progress(groupId, targetDate),
        queryFn: async () => {
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
        },
        staleTime: 60 * 1000, // 1 minute - progress updates matter
      });
    } catch (error) {
      handleError(error, { component: 'useAssignments', action: 'get group progress', silent: true });
      return { completed: 0, total: 0, members: [], overdueCount: 0 };
    }
  }, [queryClient]);

  return {
    loading: false, // Utility hook is always "ready" - no auto-fetch on mount
    createAssignment,
    isCreating: createAssignmentMutation.isPending,
    getTaskInstances,
    updateTaskStatus,
    isUpdatingTask: updateTaskStatusMutation.isPending,
    getGroupProgress,
    assignGroupTask,
    isAssigningGroupTask: assignGroupTaskMutation.isPending,
    excuseTask,
    isExcusingTask: excuseTaskMutation.isPending,
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

  if (scheduleType === "monthly") {
    // scheduleDays[0] is the day of month (1-31 or -1 for last)
    const dayOfMonth = scheduleDays[0] || 1;
    let current = new Date(startDate);

    while (current <= endDate) {
      let targetDate: Date;

      if (dayOfMonth === -1) {
        // "Last day of month" option
        targetDate = lastDayOfMonth(current);
      } else {
        // Specific day of month - handle months with fewer days
        const lastDay = getDate(lastDayOfMonth(current));
        const actualDay = Math.min(dayOfMonth, lastDay);
        targetDate = setDate(current, actualDay);
      }

      // Only include if within range and on or after start
      if (targetDate >= startDate && targetDate <= endDate) {
        dates.push(new Date(targetDate));
      }

      // Move to next month (from the 1st to avoid edge cases)
      current = addMonths(setDate(current, 1), 1);
    }

    return dates;
  }

  // Existing logic for daily, weekly, custom
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
