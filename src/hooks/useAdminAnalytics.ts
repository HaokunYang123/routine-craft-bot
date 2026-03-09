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

type AdminAnalyticsState = {
  signupCurve: SignupCurvePoint[];
  activeUsers: ActiveUsers | null;
  roleDistribution: RoleDistributionPoint[];
  churnCandidates: ChurnCandidate[];
  aiUsageTrend: AiUsageTrendPoint[];
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: AdminAnalyticsState = {
  signupCurve: [],
  activeUsers: null,
  roleDistribution: [],
  churnCandidates: [],
  aiUsageTrend: [],
  loading: true,
  error: null,
};

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
      ] = await Promise.allSettled([
        supabase.rpc("admin_signup_curve", { p_interval: "week" }),
        supabase.rpc("admin_active_users"),
        supabase.rpc("admin_role_distribution"),
        supabase.rpc("admin_churn_candidates"),
        supabase.rpc("admin_ai_usage_trend"),
      ]);

      if (!isActive) {
        return;
      }

      const errors: string[] = [];

      const signupCurve =
        signupCurveResult.status === "fulfilled"
          ? (signupCurveResult.value.data ?? [])
          : (errors.push(signupCurveResult.reason instanceof Error ? signupCurveResult.reason.message : "Failed to load signup curve"), []);

      if (signupCurveResult.status === "fulfilled" && signupCurveResult.value.error) {
        errors.push(signupCurveResult.value.error.message);
      }

      const activeUsersRows =
        activeUsersResult.status === "fulfilled"
          ? (activeUsersResult.value.data ?? [])
          : (errors.push(activeUsersResult.reason instanceof Error ? activeUsersResult.reason.message : "Failed to load active users"), []);

      if (activeUsersResult.status === "fulfilled" && activeUsersResult.value.error) {
        errors.push(activeUsersResult.value.error.message);
      }

      const roleDistribution =
        roleDistributionResult.status === "fulfilled"
          ? (roleDistributionResult.value.data ?? [])
          : (errors.push(roleDistributionResult.reason instanceof Error ? roleDistributionResult.reason.message : "Failed to load role distribution"), []);

      if (roleDistributionResult.status === "fulfilled" && roleDistributionResult.value.error) {
        errors.push(roleDistributionResult.value.error.message);
      }

      const churnCandidates =
        churnCandidatesResult.status === "fulfilled"
          ? (churnCandidatesResult.value.data ?? [])
          : (errors.push(churnCandidatesResult.reason instanceof Error ? churnCandidatesResult.reason.message : "Failed to load churn candidates"), []);

      if (churnCandidatesResult.status === "fulfilled" && churnCandidatesResult.value.error) {
        errors.push(churnCandidatesResult.value.error.message);
      }

      const aiUsageTrend =
        aiUsageTrendResult.status === "fulfilled"
          ? (aiUsageTrendResult.value.data ?? [])
          : (errors.push(aiUsageTrendResult.reason instanceof Error ? aiUsageTrendResult.reason.message : "Failed to load AI usage trend"), []);

      if (aiUsageTrendResult.status === "fulfilled" && aiUsageTrendResult.value.error) {
        errors.push(aiUsageTrendResult.value.error.message);
      }

      setState({
        signupCurve,
        activeUsers: activeUsersRows[0] ?? null,
        roleDistribution,
        churnCandidates,
        aiUsageTrend,
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
