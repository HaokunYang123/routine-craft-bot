import { useCallback, useEffect, useRef, useState } from "react";
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

export type RetentionCohortPoint = {
  cohort_week: string;
  cohort_size: number;
  week_offset: number;
  active_users: number;
  retention_pct: number;
};

export type RecentActivityEvent = {
  id: string;
  user_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user_email: string | null;
  user_role: string | null;
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
  retentionCohorts: RetentionCohortPoint[];
  recentActivity: RecentActivityEvent[];
  loading: boolean;
  isRefreshing: boolean;
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
  retentionCohorts: [],
  recentActivity: [],
  loading: true,
  isRefreshing: false,
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

export function useAdminAnalytics(
  startDate: string | null,
  endDate: string | null,
  enabled = true,
) {
  const [state, setState] = useState<AdminAnalyticsState>(INITIAL_STATE);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchAnalytics = useCallback(async (mode: "load" | "refresh" = "load") => {
    if (!enabled) {
      if (isMountedRef.current) {
        setState((current) => ({
          ...INITIAL_STATE,
          loading: false,
          isRefreshing: false,
        }));
      }
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((current) => ({
      ...current,
      loading: mode === "load",
      isRefreshing: mode === "refresh",
      error: null,
    }));

    const dateRangeArgs = {
      p_start_date: startDate ?? undefined,
      p_end_date: endDate ?? undefined,
    };

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
      retentionCohortsResult,
      recentActivityResult,
    ] = await Promise.allSettled([
      supabase.rpc("admin_signup_curve", {
        p_interval: "week",
        ...dateRangeArgs,
      }),
      supabase.rpc("admin_active_users", dateRangeArgs),
      supabase.rpc("admin_role_distribution", dateRangeArgs),
      supabase.rpc("admin_churn_candidates", dateRangeArgs),
      supabase.rpc("admin_ai_usage_trend", dateRangeArgs),
      supabase.rpc("admin_ai_usage_by_action", dateRangeArgs),
      supabase.rpc("admin_template_creation_trend", dateRangeArgs),
      supabase.rpc("admin_avg_groups_per_coach", dateRangeArgs),
      supabase.rpc("admin_most_active_coaches", dateRangeArgs),
      supabase.rpc("admin_platform_completion_rate", dateRangeArgs),
      supabase.rpc("admin_completion_by_group", dateRangeArgs),
      supabase.rpc("admin_top_groups", dateRangeArgs),
      supabase.rpc("admin_at_risk_students", dateRangeArgs),
      supabase.rpc("admin_completion_trend", dateRangeArgs),
      supabase.rpc("admin_retention_cohorts"),
      supabase.rpc("admin_recent_activity", {
        p_limit: 50,
        ...dateRangeArgs,
      }),
    ]);

    if (!isMountedRef.current || requestId !== requestIdRef.current) {
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
    const retentionCohorts = getRpcRows(
      retentionCohortsResult,
      "Failed to load retention cohorts",
      errors,
    );
    const recentActivity = getRpcRows(
      recentActivityResult,
      "Failed to load recent activity",
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
      retentionCohorts,
      recentActivity,
      loading: false,
      isRefreshing: false,
      error: errors.length > 0 ? errors.join(" ") : null,
    });
  }, [enabled, endDate, startDate]);

  useEffect(() => {
    if (!enabled) {
      setState((current) => ({
        ...INITIAL_STATE,
        loading: false,
        isRefreshing: false,
      }));
      return;
    }

    void fetchAnalytics();

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, fetchAnalytics]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    if (!enabled) {
      return Promise.resolve();
    }

    return fetchAnalytics("refresh");
  }, [enabled, fetchAnalytics]);

  return {
    ...state,
    refetch,
  };
}
