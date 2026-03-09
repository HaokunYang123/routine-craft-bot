import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SignupCurvePoint = {
  period: string;
  signup_count: number;
};

export type ActiveUsers = {
  dau: number;
  wau: number;
  mau: number;
};

export type RoleDistributionPoint = {
  role: string;
  user_count: number;
};

export type ChurnCandidate = {
  user_id: string;
  email: string;
  last_sign_in: string | null;
  days_inactive: number;
};

export type AiUsageTrendPoint = {
  period: string;
  action: string;
  usage_count: number;
};

export type AiUsageByActionPoint = {
  action: string;
  usage_count: number;
};

export type TemplateCreationTrendPoint = {
  period: string;
  template_count: number;
};

export type AverageGroupsPerCoach = {
  avg_groups: number;
};

export type MostActiveCoach = {
  user_id: string;
  email: string;
  templates_created: number;
  groups_created: number;
  ai_calls: number;
  total_activity: number;
};

export type PlatformCompletionRate = {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
};

export type CompletionByGroup = {
  group_id: string;
  group_name: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
};

export type TopGroup = {
  group_id: string;
  group_name: string;
  completion_rate: number;
  total_tasks: number;
};

export type AtRiskStudent = {
  user_id: string;
  email: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
};

export type CompletionTrendPoint = {
  period: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
};

type RpcRowsResult<T> = PromiseSettledResult<{
  data: T[] | null;
  error: { message: string } | null;
}>;

type AdminAnalyticsState = {
  signupCurve: SignupCurvePoint[];
  activeUsers: ActiveUsers | null;
  roleDistribution: RoleDistributionPoint[];
  churnCandidates: ChurnCandidate[];
  aiUsageTrend: AiUsageTrendPoint[];
  aiUsageByAction: AiUsageByActionPoint[];
  templateCreationTrend: TemplateCreationTrendPoint[];
  avgGroupsPerCoach: AverageGroupsPerCoach | null;
  mostActiveCoaches: MostActiveCoach[];
  platformCompletionRate: PlatformCompletionRate | null;
  completionByGroup: CompletionByGroup[];
  topGroups: TopGroup[];
  atRiskStudents: AtRiskStudent[];
  completionTrend: CompletionTrendPoint[];
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: AdminAnalyticsState = {
  signupCurve: [],
  activeUsers: null,
  roleDistribution: [],
  churnCandidates: [],
  aiUsageTrend: [],
  aiUsageByAction: [],
  templateCreationTrend: [],
  avgGroupsPerCoach: null,
  mostActiveCoaches: [],
  platformCompletionRate: null,
  completionByGroup: [],
  topGroups: [],
  atRiskStudents: [],
  completionTrend: [],
  loading: true,
  error: null,
};

function getRpcRows<T>(result: RpcRowsResult<T>, fallbackMessage: string, errors: string[]) {
  if (result.status !== "fulfilled") {
    errors.push(result.reason instanceof Error ? result.reason.message : fallbackMessage);
    return [] as T[];
  }

  if (result.value.error) {
    errors.push(result.value.error.message);
  }

  return result.value.data ?? [];
}

export function useAdminAnalytics() {
  const [state, setState] = useState<AdminAnalyticsState>(INITIAL_STATE);

  useEffect(() => {
    let isActive = true;

    async function fetchAnalytics() {
      setState((current) => ({ ...current, loading: true, error: null }));

      const [
        signupCurveResult,
        activeUsersResult,
        roleDistributionResult,
        churnCandidatesResult,
        aiUsageTrendResult,
        aiUsageByActionResult,
        templateCreationTrendResult,
        avgGroupsPerCoachResult,
        mostActiveCoachesResult,
        platformCompletionRateResult,
        completionByGroupResult,
        topGroupsResult,
        atRiskStudentsResult,
        completionTrendResult,
      ] = await Promise.allSettled([
        supabase.rpc("admin_signup_curve", { p_interval: "week" }),
        supabase.rpc("admin_active_users"),
        supabase.rpc("admin_role_distribution"),
        supabase.rpc("admin_churn_candidates"),
        supabase.rpc("admin_ai_usage_trend"),
        supabase.rpc("admin_ai_usage_by_action"),
        supabase.rpc("admin_template_creation_trend"),
        supabase.rpc("admin_avg_groups_per_coach"),
        supabase.rpc("admin_most_active_coaches"),
        supabase.rpc("admin_platform_completion_rate"),
        supabase.rpc("admin_completion_by_group"),
        supabase.rpc("admin_top_groups"),
        supabase.rpc("admin_at_risk_students"),
        supabase.rpc("admin_completion_trend"),
      ]);

      if (!isActive) {
        return;
      }

      const errors: string[] = [];

      const signupCurve = getRpcRows(
        signupCurveResult,
        "Failed to load signup curve",
        errors,
      );
      const activeUsersRows = getRpcRows(
        activeUsersResult,
        "Failed to load active users",
        errors,
      );
      const roleDistribution = getRpcRows(
        roleDistributionResult,
        "Failed to load role distribution",
        errors,
      );
      const churnCandidates = getRpcRows(
        churnCandidatesResult,
        "Failed to load churn candidates",
        errors,
      );
      const aiUsageTrend = getRpcRows(
        aiUsageTrendResult,
        "Failed to load AI usage trend",
        errors,
      );
      const aiUsageByAction = getRpcRows(
        aiUsageByActionResult,
        "Failed to load AI usage by action",
        errors,
      );
      const templateCreationTrend = getRpcRows(
        templateCreationTrendResult,
        "Failed to load template creation trend",
        errors,
      );
      const avgGroupsPerCoachRows = getRpcRows(
        avgGroupsPerCoachResult,
        "Failed to load average groups per coach",
        errors,
      );
      const mostActiveCoaches = getRpcRows(
        mostActiveCoachesResult,
        "Failed to load most active coaches",
        errors,
      );
      const platformCompletionRateRows = getRpcRows(
        platformCompletionRateResult,
        "Failed to load platform completion rate",
        errors,
      );
      const completionByGroup = getRpcRows(
        completionByGroupResult,
        "Failed to load completion by group",
        errors,
      );
      const topGroups = getRpcRows(
        topGroupsResult,
        "Failed to load top groups",
        errors,
      );
      const atRiskStudents = getRpcRows(
        atRiskStudentsResult,
        "Failed to load at-risk students",
        errors,
      );
      const completionTrend = getRpcRows(
        completionTrendResult,
        "Failed to load completion trend",
        errors,
      );

      setState({
        signupCurve,
        activeUsers: activeUsersRows[0] ?? null,
        roleDistribution,
        churnCandidates,
        aiUsageTrend,
        aiUsageByAction,
        templateCreationTrend,
        avgGroupsPerCoach: avgGroupsPerCoachRows[0] ?? null,
        mostActiveCoaches,
        platformCompletionRate: platformCompletionRateRows[0] ?? null,
        completionByGroup,
        topGroups,
        atRiskStudents,
        completionTrend,
        loading: false,
        error: errors.length > 0 ? errors.join(" ") : null,
      });
    }

    void fetchAnalytics();

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
