import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/error";

export interface CoachStudentTask {
  instance_id: string;
  assignment_id: string | null;
  parent_task_title: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  completion_status: "pending" | "missed" | "completed" | "excused";
  origin_group_id: string | null;
  origin_group_name: string | null;
}

type RpcCoachStudentTask = Omit<CoachStudentTask, "assignment_id">;

export function useCoachStudentTasks(
  targetStudentId: string | undefined,
  windowStart: string | null,
  windowEnd: string | null,
) {
  return useQuery({
    queryKey: ["coach-student-tasks", targetStudentId, windowStart, windowEnd],
    queryFn: async (): Promise<CoachStudentTask[]> => {
      const { data, error } = await supabase.rpc("coach_fetch_student_task_list", {
        p_target_student_id: targetStudentId!,
        p_window_start: windowStart,
        p_window_end: windowEnd,
      });

      if (error) {
        throw error;
      }

      const taskRows = (data ?? []) as RpcCoachStudentTask[];
      const instanceIds = taskRows.map((task) => task.instance_id);

      if (instanceIds.length === 0) {
        return [];
      }

      const { data: instanceRows, error: assignmentError } = await supabase
        .from("task_instances")
        .select("id, assignment_id")
        .in("id", instanceIds);

      if (assignmentError) {
        handleError(assignmentError, {
          component: "useCoachStudentTasks",
          action: "fetch assignment ids",
          silent: true,
        });

        return taskRows.map((task) => ({
          ...task,
          assignment_id: null,
        }));
      }

      const assignmentMap = new Map(
        (instanceRows ?? []).map((row) => [row.id, row.assignment_id ?? null]),
      );

      return taskRows.map((task) => ({
        ...task,
        assignment_id: assignmentMap.get(task.instance_id) ?? null,
      }));
    },
    enabled: Boolean(targetStudentId && windowStart && windowEnd),
  });
}
