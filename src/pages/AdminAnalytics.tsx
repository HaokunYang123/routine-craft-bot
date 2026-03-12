import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertCircle, BarChart3, Loader2, Users, UserX } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProfile } from "@/hooks/useProfile";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ANALYTICS_TABS = [
  {
    value: "platform-health",
    label: "Platform Health",
    description: "System-wide usage, reliability, and retention signals across the product.",
  },
  {
    value: "coach-behavior",
    label: "Coach Behavior",
    description: "AI usage, template creation, and coach activity across the platform.",
  },
  {
    value: "student-outcomes",
    label: "Student Outcomes",
    description: "Completion trends, top groups, and students needing attention.",
  },
] as const;

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const ANALYTICS_COLORS = {
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  teal: "#14b8a6",
  indigo: "#6366f1",
  rose: "#f43f5e",
  slate: "#64748b",
} as const;
const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "hsl(var(--background))",
  borderColor: "hsl(var(--border))",
};

type AdminAnalyticsData = ReturnType<typeof useAdminAnalytics>;

function getDashboardPathForRole(role: string | null | undefined) {
  if (role === "student") {
    return "/app";
  }

  if (role === "parent") {
    return "/parent";
  }

  if (role === "coach") {
    return "/dashboard";
  }

  return "/onboarding";
}

function formatChartDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTableDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRoleLabel(role: string) {
  if (!role) {
    return "Unknown";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

type RetentionHeatmapCell = AdminAnalyticsData["retentionCohorts"][number];

type RetentionHeatmapRow = {
  cohortWeek: string;
  cohortSize: number;
  weeks: Map<number, RetentionHeatmapCell>;
};

function buildRetentionHeatmap(points: AdminAnalyticsData["retentionCohorts"]) {
  const cohorts = new Map<string, RetentionHeatmapRow>();
  let maxWeekOffset = 0;

  points.forEach((point) => {
    const existing = cohorts.get(point.cohort_week) ?? {
      cohortWeek: point.cohort_week,
      cohortSize: point.cohort_size,
      weeks: new Map<number, RetentionHeatmapCell>(),
    };

    existing.cohortSize = point.cohort_size;
    existing.weeks.set(point.week_offset, point);
    cohorts.set(point.cohort_week, existing);
    maxWeekOffset = Math.max(maxWeekOffset, point.week_offset);
  });

  return {
    rows: Array.from(cohorts.values()).sort((left, right) => {
      return new Date(right.cohortWeek).getTime() - new Date(left.cohortWeek).getTime();
    }),
    weekOffsets: Array.from({ length: maxWeekOffset + 1 }, (_, index) => index),
  };
}

function getRetentionCellStyle(retentionPct: number) {
  const normalized = Math.max(0, Math.min(retentionPct, 100)) / 100;
  const alpha = 0.08 + normalized * 0.72;

  return {
    backgroundColor: `rgba(16, 185, 129, ${alpha.toFixed(2)})`,
    color: normalized >= 0.55 ? "#ecfdf5" : "#d1fae5",
    borderColor: `rgba(16, 185, 129, ${(0.18 + normalized * 0.4).toFixed(2)})`,
  };
}

function buildAiUsageChartData(points: AdminAnalyticsData["aiUsageTrend"]) {
  const rows = new Map<string, Record<string, number | string>>();

  points.forEach((point) => {
    const existing = rows.get(point.period) ?? {
      period: point.period,
      periodLabel: formatChartDate(point.period),
    };

    existing[point.action] = point.usage_count;
    rows.set(point.period, existing);
  });

  return Array.from(rows.values()).sort((left, right) => {
    return new Date(String(left.period)).getTime() - new Date(String(right.period)).getTime();
  });
}

function addPeriodLabel<T extends { period: string }>(points: T[]) {
  return points.map((point) => ({
    ...point,
    periodLabel: formatChartDate(point.period),
  }));
}

function AnalyticsEmptyState({
  title = "No data available",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}

function AnalyticsErrorBanner({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p>{error}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof BarChart3;
  color: string;
}) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-4xl font-semibold tracking-tight">{value}</CardTitle>
        </div>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function AnalyticsLoading({
  statCards = 3,
  charts = 2,
}: {
  statCards?: number;
  charts?: number;
}) {
  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${statCards > 1 ? "md:grid-cols-3" : ""}`}>
        {Array.from({ length: statCards }).map((_, index) => (
          <Card key={index} className="border-border/80 bg-card/80">
            <CardHeader className="space-y-3 pb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-24" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {Array.from({ length: charts }).map((_, index) => (
        <Card key={index} className="border-border/80 bg-card/80">
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RetentionHeatmap({ points }: { points: AdminAnalyticsData["retentionCohorts"] }) {
  const { rows, weekOffsets } = buildRetentionHeatmap(points);
  const hasEnoughData = rows.length >= 2;
  const gridTemplateColumns = `120px 88px repeat(${weekOffsets.length}, minmax(72px, 1fr))`;

  if (!hasEnoughData) {
    return (
      <AnalyticsEmptyState description="Not enough data for retention analysis. Cohorts appear after users have been active for at least 2 weeks." />
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div
          className="grid gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns }}
        >
          <div className="px-3 py-2">Cohort</div>
          <div className="px-3 py-2 text-right">Size</div>
          {weekOffsets.map((weekOffset) => (
            <div key={weekOffset} className="px-3 py-2 text-center">
              Week {weekOffset}
            </div>
          ))}
        </div>

        <div className="mt-2 space-y-2">
          {rows.map((row) => (
            <div key={row.cohortWeek} className="grid gap-2" style={{ gridTemplateColumns }}>
              <div className="flex items-center rounded-lg border border-border/60 bg-background/40 px-3 py-3 text-sm font-medium text-foreground">
                {formatChartDate(row.cohortWeek)}
              </div>
              <div className="flex items-center justify-end rounded-lg border border-border/60 bg-background/40 px-3 py-3 text-sm font-medium text-foreground">
                {row.cohortSize}
              </div>
              {weekOffsets.map((weekOffset) => {
                const cell = row.weeks.get(weekOffset);

                if (!cell) {
                  return (
                    <div
                      key={`${row.cohortWeek}-${weekOffset}`}
                      className="flex min-h-14 items-center justify-center rounded-lg border border-border/50 bg-background/20 px-2 text-sm text-muted-foreground"
                    >
                      —
                    </div>
                  );
                }

                const cellStyle = getRetentionCellStyle(cell.retention_pct);

                return (
                  <div
                    key={`${row.cohortWeek}-${weekOffset}`}
                    className="flex min-h-14 items-center justify-center rounded-lg border px-2 text-sm font-semibold"
                    style={cellStyle}
                    title={`${formatChartDate(row.cohortWeek)} cohort, week ${weekOffset}: ${formatPercent(cell.retention_pct)} (${cell.active_users}/${row.cohortSize})`}
                  >
                    {formatPercent(cell.retention_pct)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlatformHealthPanel({ analytics }: { analytics: AdminAnalyticsData }) {
  const {
    signupCurve,
    activeUsers,
    roleDistribution,
    churnCandidates,
    aiUsageTrend,
    retentionCohorts,
    loading,
    error,
  } =
    analytics;

  const hasAnyData =
    activeUsers !== null ||
    signupCurve.length > 0 ||
    roleDistribution.length > 0 ||
    churnCandidates.length > 0 ||
    aiUsageTrend.length > 0 ||
    retentionCohorts.length > 0;

  const roleChartData = roleDistribution.map((item) => ({
    ...item,
    label: formatRoleLabel(item.role),
  }));

  const aiUsageActions = Array.from(new Set(aiUsageTrend.map((item) => item.action))).sort();
  const aiUsageChartData = buildAiUsageChartData(aiUsageTrend);

  if (loading) {
    return <AnalyticsLoading statCards={3} charts={3} />;
  }

  if (!hasAnyData && !error) {
    return (
      <Card className="border-border/80 bg-card/80">
        <CardContent className="flex min-h-[240px] items-center justify-center">
          <div className="text-center">
            <p className="text-base font-medium text-foreground">No data available</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Platform Health metrics are empty for this account or environment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && <AnalyticsErrorBanner error={error} />}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "DAU",
            value: (activeUsers?.dau ?? 0).toLocaleString(),
            description: "Signed in within 1 day",
            icon: BarChart3,
            color: "text-blue-400",
          },
          {
            title: "WAU",
            value: (activeUsers?.wau ?? 0).toLocaleString(),
            description: "Signed in within 7 days",
            icon: Users,
            color: "text-emerald-400",
          },
          {
            title: "MAU",
            value: (activeUsers?.mau ?? 0).toLocaleString(),
            description: "Signed in within 30 days",
            icon: UserX,
            color: "text-amber-400",
          },
        ].map((item) => (
          <MetricCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
            icon={item.icon}
            color={item.color}
          />
        ))}
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Signup Curve</CardTitle>
          <CardDescription>Weekly signup volume based on profile creation date.</CardDescription>
        </CardHeader>
        <CardContent>
          {signupCurve.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={signupCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="period" tickFormatter={formatChartDate} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} stroke="#94a3b8" />
                  <Tooltip
                    labelFormatter={(value) => formatChartDate(String(value))}
                    formatter={(value) => [value, "Signups"]}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="signup_count"
                    name="Signups"
                    stroke={ANALYTICS_COLORS.blue}
                    strokeWidth={3}
                    dot={{ r: 4, fill: ANALYTICS_COLORS.blue }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState description="Platform signup data has not been recorded yet." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl">Role Distribution</CardTitle>
            <CardDescription>Current account mix across coach, student, and parent roles.</CardDescription>
          </CardHeader>
          <CardContent>
            {roleChartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleChartData}
                      dataKey="user_count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={96}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {roleChartData.map((entry, index) => (
                        <Cell
                          key={`${entry.role}-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Users"]} contentStyle={TOOLTIP_CONTENT_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <AnalyticsEmptyState description="Role distribution will appear once profile data is available." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl">AI Usage Trend</CardTitle>
            <CardDescription>Weekly AI feature usage grouped by action.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiUsageChartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={aiUsageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="periodLabel" stroke="#94a3b8" />
                    <YAxis allowDecimals={false} stroke="#94a3b8" />
                    <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} />
                    <Legend />
                    {aiUsageActions.map((action, index) => (
                      <Bar
                        key={action}
                        dataKey={action}
                        stackId="usage"
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        radius={index === aiUsageActions.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <AnalyticsEmptyState description="AI usage events have not been logged yet." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Churn Risk</CardTitle>
          <CardDescription>Coaches flagged by the current inactivity window, including never-signed-in accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          {churnCandidates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Days Inactive</TableHead>
                  <TableHead>Last Sign-In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churnCandidates.map((candidate) => (
                  <TableRow key={candidate.user_id}>
                    <TableCell className="font-medium text-foreground">{candidate.email}</TableCell>
                    <TableCell>{candidate.days_inactive}</TableCell>
                    <TableCell>{formatTableDate(candidate.last_sign_in)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <AnalyticsEmptyState description="No churn candidates were found for the current filter." />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Retention Cohorts</CardTitle>
          <CardDescription>
            Weekly signup cohorts versus later weekly activity. Week 0 is the signup week; later weeks use sign-in and activity telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RetentionHeatmap points={retentionCohorts} />
        </CardContent>
      </Card>
    </div>
  );
}

function CoachBehaviorPanel({ analytics }: { analytics: AdminAnalyticsData }) {
  const {
    aiUsageByAction,
    templateCreationTrend,
    avgGroupsPerCoach,
    mostActiveCoaches,
    loading,
    error,
  } = analytics;

  const templateCreationTrendData = addPeriodLabel(templateCreationTrend);
  const hasAnyData =
    aiUsageByAction.length > 0 ||
    templateCreationTrend.length > 0 ||
    avgGroupsPerCoach !== null ||
    mostActiveCoaches.length > 0;

  if (loading) {
    return <AnalyticsLoading statCards={1} charts={3} />;
  }

  if (!hasAnyData && !error) {
    return (
      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Coach Behavior</CardTitle>
          <CardDescription>Coach workflow metrics will appear here once activity is recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsEmptyState description="No coach behavior data is available in this environment yet." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && <AnalyticsErrorBanner error={error} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl">AI Usage by Action</CardTitle>
            <CardDescription>Total AI usage volume split by coach action type.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiUsageByAction.length > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={aiUsageByAction} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis type="number" allowDecimals={false} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="action"
                      width={120}
                      stroke="#94a3b8"
                    />
                    <Tooltip formatter={(value) => [value, "Calls"]} contentStyle={TOOLTIP_CONTENT_STYLE} />
                    <Bar
                      dataKey="usage_count"
                      name="Calls"
                      fill={ANALYTICS_COLORS.teal}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <AnalyticsEmptyState description="No AI usage actions have been recorded yet." />
            )}
          </CardContent>
        </Card>

        <MetricCard
          title="Average Groups per Coach"
          value={(avgGroupsPerCoach?.avg_groups ?? 0).toFixed(1)}
          description="Total groups divided by the number of coach accounts."
          icon={Users}
          color="text-indigo-400"
        />
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Template Creation Trend</CardTitle>
          <CardDescription>Weekly template creation volume across all coaches.</CardDescription>
        </CardHeader>
        <CardContent>
          {templateCreationTrendData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={templateCreationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="periodLabel" stroke="#94a3b8" />
                  <YAxis allowDecimals={false} stroke="#94a3b8" />
                  <Tooltip
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as { period?: string } | undefined;
                      return point?.period ? formatChartDate(point.period) : "";
                    }}
                    formatter={(value) => [value, "Templates"]}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                  />
                  <Line
                    type="monotone"
                    dataKey="template_count"
                    name="Templates"
                    stroke={ANALYTICS_COLORS.indigo}
                    strokeWidth={3}
                    dot={{ r: 4, fill: ANALYTICS_COLORS.indigo }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState description="Template creation history will appear once templates exist." />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Most Active Coaches</CardTitle>
          <CardDescription>Top coaches ranked by templates, groups, and AI usage combined.</CardDescription>
        </CardHeader>
        <CardContent>
          {mostActiveCoaches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Templates</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>AI Calls</TableHead>
                  <TableHead>Total Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mostActiveCoaches.map((coach) => (
                  <TableRow key={coach.user_id}>
                    <TableCell className="font-medium text-foreground">{coach.email}</TableCell>
                    <TableCell>{coach.templates_created}</TableCell>
                    <TableCell>{coach.groups_created}</TableCell>
                    <TableCell>{coach.ai_calls}</TableCell>
                    <TableCell>{coach.total_activity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <AnalyticsEmptyState description="No coach activity records were found for the leaderboard." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentOutcomesPanel({ analytics }: { analytics: AdminAnalyticsData }) {
  const {
    platformCompletionRate,
    completionTrend,
    completionByGroup,
    topGroups,
    atRiskStudents,
    loading,
    error,
  } = analytics;

  const completionTrendData = addPeriodLabel(completionTrend);
  const hasAnyData =
    platformCompletionRate !== null ||
    completionTrend.length > 0 ||
    completionByGroup.length > 0 ||
    topGroups.length > 0 ||
    atRiskStudents.length > 0;

  if (loading) {
    return <AnalyticsLoading statCards={3} charts={4} />;
  }

  if (!hasAnyData && !error) {
    return (
      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Student Outcomes</CardTitle>
          <CardDescription>Completion metrics will appear here once task data is available.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsEmptyState description="No student outcome data is available in this environment yet." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && <AnalyticsErrorBanner error={error} />}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Tasks"
          value={(platformCompletionRate?.total_tasks ?? 0).toLocaleString()}
          description="All task instances on the platform."
          icon={BarChart3}
          color="text-slate-400"
        />
        <MetricCard
          title="Completed Tasks"
          value={(platformCompletionRate?.completed_tasks ?? 0).toLocaleString()}
          description="Task instances marked completed."
          icon={Users}
          color="text-emerald-400"
        />
        <MetricCard
          title="Completion Rate"
          value={formatPercent(platformCompletionRate?.completion_rate)}
          description="Platform-wide completion percentage."
          icon={UserX}
          color="text-rose-400"
        />
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Completion Trend</CardTitle>
          <CardDescription>Weekly completion rate across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {completionTrendData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={completionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="periodLabel" stroke="#94a3b8" />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as { period?: string } | undefined;
                      return point?.period ? formatChartDate(point.period) : "";
                    }}
                    formatter={(value) => [formatPercent(Number(value)), "Completion Rate"]}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                  />
                  <Line
                    type="monotone"
                    dataKey="completion_rate"
                    name="Completion Rate"
                    stroke={ANALYTICS_COLORS.rose}
                    strokeWidth={3}
                    dot={{ r: 4, fill: ANALYTICS_COLORS.rose }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState description="Weekly completion history will appear once tasks are created." />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Completion by Group</CardTitle>
          <CardDescription>Completion rate for each group with assigned tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          {completionByGroup.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={completionByGroup}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="group_name" stroke="#94a3b8" />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    formatter={(value) => [formatPercent(Number(value)), "Completion Rate"]}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                  />
                  <Bar
                    dataKey="completion_rate"
                    name="Completion Rate"
                    fill={ANALYTICS_COLORS.teal}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AnalyticsEmptyState description="Group completion metrics will appear once group assignments exist." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl">Top Groups</CardTitle>
            <CardDescription>Best completion rates among groups with at least 5 tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            {topGroups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Total Tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topGroups.map((group) => (
                    <TableRow key={group.group_id}>
                      <TableCell className="font-medium text-foreground">{group.group_name}</TableCell>
                      <TableCell>{formatPercent(group.completion_rate)}</TableCell>
                      <TableCell>{group.total_tasks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <AnalyticsEmptyState description="No groups currently meet the 5-task minimum." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl">At-Risk Students</CardTitle>
            <CardDescription>Students below 50% completion in the current reporting window.</CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Tasks</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskStudents.map((student) => {
                    const isCritical = student.completion_rate < 25;

                    return (
                      <TableRow
                        key={student.user_id}
                        className={isCritical ? "bg-rose-500/10 text-rose-100" : undefined}
                      >
                        <TableCell className="font-medium">{student.email}</TableCell>
                        <TableCell>{student.total_tasks}</TableCell>
                        <TableCell>{student.completed_tasks}</TableCell>
                        <TableCell className={isCritical ? "text-rose-200" : undefined}>
                          {formatPercent(student.completion_rate)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <AnalyticsEmptyState description="No at-risk students were found for the current filter." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { profile, loading } = useProfile();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const analytics = useAdminAnalytics(startDate, endDate);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return <Navigate to={getDashboardPathForRole(profile?.role)} replace />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Live product health for the admin dashboard, including coach behavior and student outcomes.
        </p>
      </div>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onChange={(nextStartDate, nextEndDate) => {
          setStartDate(nextStartDate);
          setEndDate(nextEndDate);
        }}
      />

      <Tabs defaultValue={ANALYTICS_TABS[0].value} className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-card/80 p-2">
          {ANALYTICS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg border border-transparent px-4 py-2 data-[state=active]:border-border data-[state=active]:bg-background"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="platform-health">
          <PlatformHealthPanel analytics={analytics} />
        </TabsContent>

        <TabsContent value="coach-behavior">
          <CoachBehaviorPanel analytics={analytics} />
        </TabsContent>

        <TabsContent value="student-outcomes">
          <StudentOutcomesPanel analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
