import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoachStudentGroupSummary {
  group_id: string;
  group_name: string;
}

export interface CoachStudentSummary {
  student_display_name: string;
  student_email: string | null;
  enrolled_groups: CoachStudentGroupSummary[];
  total_assigned_count: number;
  total_completed_count: number;
  overall_completion_pct: number;
}

function normalizeSummary(data: unknown): CoachStudentSummary {
  const record =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const enrolledGroups = Array.isArray(record.enrolled_groups)
    ? record.enrolled_groups
        .filter(
          (value): value is Record<string, unknown> =>
            typeof value === "object" && value !== null,
        )
        .map((group) => ({
          group_id: typeof group.group_id === "string" ? group.group_id : "",
          group_name: typeof group.group_name === "string" ? group.group_name : "Group",
        }))
        .filter((group) => Boolean(group.group_id))
    : [];

  return {
    student_display_name:
      typeof record.student_display_name === "string" && record.student_display_name.trim()
        ? record.student_display_name
        : "Student",
    student_email: typeof record.student_email === "string" ? record.student_email : null,
    enrolled_groups: enrolledGroups,
    total_assigned_count:
      typeof record.total_assigned_count === "number" ? record.total_assigned_count : 0,
    total_completed_count:
      typeof record.total_completed_count === "number" ? record.total_completed_count : 0,
    overall_completion_pct:
      typeof record.overall_completion_pct === "number" ? record.overall_completion_pct : 0,
  };
}

export function useCoachStudentSummary(targetStudentId: string | undefined) {
  return useQuery({
    queryKey: ["coach-student-summary", targetStudentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_fetch_student_profile_summary", {
        p_target_student_id: targetStudentId!,
      });

      if (error) {
        throw error;
      }

      return normalizeSummary(data);
    },
    enabled: Boolean(targetStudentId),
  });
}
