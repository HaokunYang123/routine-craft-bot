import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AlertCircle, BarChart3, Download, Loader2, RefreshCw, Users, UserX } from "lucide-react";
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
import { exportToCsv } from "@/lib/csvExport";

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
const ACTIVITY_BADGE_STYLES: Record<string, string> = {
  template_created: "bg-blue-500/20 text-blue-400",
  task_assigned: "bg-green-500/20 text-green-400",
  group_created: "bg-purple-500/20 text-purple-400",
  ai_feature_used: "bg-amber-500/20 text-amber-400",
  student_added: "bg-teal-500/20 text-teal-400",
  student_removed: "bg-red-500/20 text-red-400",
  task_completed: "bg-emerald-500/20 text-emerald-400",
  task_excused: "bg-gray-500/20 text-gray-400",
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

function formatExportDate(value: string | null) {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString(undefined, {
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

function formatEventTypeLabel(eventType: string) {
  if (!eventType) {
    return "Unknown";
  }

  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return formatTableDate(value);
  }

  const diffMs = timestamp.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const intervals = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
  ] as const;

  for (const interval of intervals) {
    if (Math.abs(diffSeconds) >= interval.seconds) {
      return formatter.format(
        Math.round(diffSeconds / interval.seconds),
        interval.unit,
      );
    }
  }

  return formatter.format(diffSeconds, "second");
}

function shortenId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.slice(0, 8);
}

function getMetadataValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getActivitySummary(activity: AdminAnalyticsData["recentActivity"][number]) {
  const metadata =
    activity.metadata && typeof activity.metadata === "object" && !Array.isArray(activity.metadata)
      ? activity.metadata
      : {};

  switch (activity.event_type) {
    case "template_created": {
      const source = getMetadataValue(metadata, "source");
      const templateId = shortenId(getMetadataValue(metadata, "template_id"));
      if (source && templateId) {
        return `Source: ${formatEventTypeLabel(source)} • Template ${templateId}`;
      }
      if (source) {
        return `Source: ${formatEventTypeLabel(source)}`;
      }
      if (templateId) {
        return `Template ${templateId}`;
      }
      return "Template created";
    }
    case "task_assigned": {
      const assignmentType = getMetadataValue(metadata, "assignment_type");
      const groupId = shortenId(getMetadataValue(metadata, "group_id"));
      const studentId = shortenId(getMetadataValue(metadata, "student_id"));
      const details = [
        assignmentType ? `${formatEventTypeLabel(assignmentType)} assignment` : "Task assigned",
        groupId ? `Group ${groupId}` : null,
        studentId ? `Student ${studentId}` : null,
      ].filter(Boolean);
      return details.join(" • ");
    }
    case "group_created": {
      const groupName = getMetadataValue(metadata, "group_name");
      const groupId = shortenId(getMetadataValue(metadata, "group_id"));
      if (groupName) {
        return `Created "${groupName}"`;
      }
      if (groupId) {
        return `Created group ${groupId}`;
      }
      return "Group created";
    }
    case "ai_feature_used": {
      const action = getMetadataValue(metadata, "action");
      return action ? `Action: ${formatEventTypeLabel(action)}` : "AI feature used";
    }
    case "student_added": {
      const context = getMetadataValue(metadata, "context");
      const studentId = shortenId(getMetadataValue(metadata, "student_id"));
      const details = [
        context ? `Context: ${formatEventTypeLabel(context)}` : "Student added",
        studentId ? `Student ${studentId}` : null,
      ].filter(Boolean);
      return details.join(" • ");
    }
    case "student_removed": {
      const studentId = shortenId(getMetadataValue(metadata, "student_id"));
      const groupId = shortenId(getMetadataValue(metadata, "group_id"));
      const details = [
        studentId ? `Student ${studentId}` : "Student removed",
        groupId ? `Group ${groupId}` : null,
      ].filter(Boolean);
      return details.join(" • ");
    }
    case "task_completed":
    case "task_excused": {
      const taskId = shortenId(getMetadataValue(metadata, "task_instance_id"));
      return taskId ? `Task ${taskId}` : formatEventTypeLabel(activity.event_type);
    }
    default:
      return formatEventTypeLabel(activity.event_type);
  }
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

function ExportButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      aria-label={`Export ${label} as CSV`}
      title={`Export ${label} as CSV`}
    >
      <Download className="h-4 w-4" />
      <span className="sr-only">Export {label} as CSV</span>
    </button>
  );
}

function AnalyticsCardHeader({
  title,
  description,
  exportAction,
}: {
  title: string;
  description: string;
  exportAction?: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
      <div className="space-y-1.5">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {exportAction}
    </CardHeader>
  );
}

function AnalyticsSectionHeader({
  title,
  description,
  exportAction,
}: {
  title: string;
  description: string;
  exportAction?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {exportAction}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  action,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof BarChart3;
  color: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-4xl font-semibold tracking-tight">{value}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
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
    recentActivity,
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
    retentionCohorts.length > 0 ||
    recentActivity.length > 0;

  const roleChartData = roleDistribution.map((item) => ({
    ...item,
    label: formatRoleLabel(item.role),
  }));
  const aiUsageActions = Array.from(new Set(aiUsageTrend.map((item) => item.action))).sort();
  const aiUsageChartData = buildAiUsageChartData(aiUsageTrend);
  const activeUsersExportRows = activeUsers
    ? [
        { metric: "DAU", value: activeUsers.dau },
        { metric: "WAU", value: activeUsers.wau },
        { metric: "MAU", value: activeUsers.mau },
      ]
    : [];

  if (loading) {
    return <AnalyticsLoading statCards={3} charts={4} />;
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

      <div className="space-y-4">
        <AnalyticsSectionHeader
          title="Active Users"
          description="Grouped DAU, WAU, and MAU account activity metrics."
          exportAction={
            activeUsersExportRows.length > 0 ? (
              <ExportButton
                label="active users"
                onClick={() =>
                  exportToCsv(
                    activeUsersExportRows,
                    "active_users.csv",
                    [
                      { key: "metric", label: "Metric" },
                      { key: "value", label: "Value" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
      </div>

      <Card className="border-border/80 bg-card/80">
        <AnalyticsCardHeader
          title="Signup Curve"
          description="Weekly signup volume based on profile creation date."
          exportAction={
            signupCurve.length > 0 ? (
              <ExportButton
                label="signup curve"
                onClick={() =>
                  exportToCsv(
                    signupCurve.map((point) => ({
                      period: formatExportDate(point.period),
                      signup_count: point.signup_count,
                    })),
                    "signup_curve.csv",
                    [
                      { key: "period", label: "Period" },
                      { key: "signup_count", label: "Signups" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
          <AnalyticsCardHeader
            title="Role Distribution"
            description="Current account mix across coach, student, and parent roles."
            exportAction={
              roleDistribution.length > 0 ? (
                <ExportButton
                  label="role distribution"
                  onClick={() =>
                    exportToCsv(
                      roleDistribution.map((item) => ({
                        role: formatRoleLabel(item.role),
                        user_count: item.user_count,
                      })),
                      "role_distribution.csv",
                      [
                        { key: "role", label: "Role" },
                        { key: "user_count", label: "Count" },
                      ],
                    )
                  }
                />
              ) : undefined
            }
          />
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
          <AnalyticsCardHeader
            title="AI Usage Trend"
            description="Weekly AI feature usage grouped by action."
            exportAction={
              aiUsageChartData.length > 0 ? (
                <ExportButton
                  label="AI usage trend"
                  onClick={() =>
                    exportToCsv(
                      aiUsageChartData.map((row) => {
                        const exportRow: Record<string, unknown> = {
                          period: formatExportDate(String(row.period)),
                        };

                        aiUsageActions.forEach((action) => {
                          exportRow[action] = row[action] ?? 0;
                        });

                        return exportRow;
                      }),
                      "ai_usage_trend.csv",
                      [
                        { key: "period", label: "Period" },
                        ...aiUsageActions.map((action) => ({
                          key: action,
                          label: formatRoleLabel(action.replace(/_/g, " ")),
                        })),
                      ],
                    )
                  }
                />
              ) : undefined
            }
          />
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
        <AnalyticsCardHeader
          title="Churn Risk"
          description="Coaches flagged by the current inactivity window, including never-signed-in accounts."
          exportAction={
            churnCandidates.length > 0 ? (
              <ExportButton
                label="churn risk"
                onClick={() =>
                  exportToCsv(
                    churnCandidates.map((candidate) => ({
                      email: candidate.email,
                      last_sign_in: formatTableDate(candidate.last_sign_in),
                      days_inactive: candidate.days_inactive,
                    })),
                    "churn_candidates.csv",
                    [
                      { key: "email", label: "Email" },
                      { key: "last_sign_in", label: "Last Active" },
                      { key: "days_inactive", label: "Days Inactive" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
        <AnalyticsCardHeader
          title="Retention Cohorts"
          description="Weekly signup cohorts versus later weekly activity. Week 0 is the signup week; later weeks use sign-in and activity telemetry."
          exportAction={
            retentionCohorts.length > 0 ? (
              <ExportButton
                label="retention cohorts"
                onClick={() =>
                  exportToCsv(
                    retentionCohorts.map((point) => ({
                      cohort_week: formatExportDate(point.cohort_week),
                      cohort_size: point.cohort_size,
                      week_offset: point.week_offset,
                      active_users: point.active_users,
                      retention_pct: point.retention_pct,
                    })),
                    "retention_cohorts.csv",
                    [
                      { key: "cohort_week", label: "Cohort Week" },
                      { key: "cohort_size", label: "Cohort Size" },
                      { key: "week_offset", label: "Week Offset" },
                      { key: "active_users", label: "Active Users" },
                      { key: "retention_pct", label: "Retention %" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
        <CardContent>
          <RetentionHeatmap points={retentionCohorts} />
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/80">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">Recent Activity</CardTitle>
              <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {recentActivity.length} shown
              </span>
            </div>
            <CardDescription>Most recent tracked analytics events in reverse chronological order.</CardDescription>
          </div>
          {recentActivity.length > 0 ? (
            <ExportButton
              label="recent activity"
              onClick={() =>
                exportToCsv(
                  recentActivity.map((activity) => ({
                    timestamp: formatExportDate(activity.created_at),
                    relative_time: formatRelativeTime(activity.created_at),
                    event_type: formatEventTypeLabel(activity.event_type),
                    user_email: activity.user_email ?? "Unknown",
                    user_role: activity.user_role ?? "Unknown",
                    summary: getActivitySummary(activity),
                    metadata: JSON.stringify(activity.metadata),
                  })),
                  "recent_activity.csv",
                  [
                    { key: "timestamp", label: "Timestamp" },
                    { key: "relative_time", label: "Relative Time" },
                    { key: "event_type", label: "Event Type" },
                    { key: "user_email", label: "User Email" },
                    { key: "user_role", label: "User Role" },
                    { key: "summary", label: "Summary" },
                    { key: "metadata", label: "Metadata" },
                  ],
                )
              }
            />
          ) : undefined}
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-xl border border-border/60 bg-background/40 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {formatRelativeTime(activity.created_at)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${ACTIVITY_BADGE_STYLES[activity.event_type] ?? "bg-gray-500/20 text-gray-400"}`}
                        >
                          {formatEventTypeLabel(activity.event_type)}
                        </span>
                        {activity.user_role ? (
                          <span className="rounded-full border border-border/60 px-2 py-1 text-xs text-muted-foreground">
                            {formatRoleLabel(activity.user_role)}
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {activity.user_email ?? "Unknown user"}
                        </p>
                        <p className="text-sm text-muted-foreground">{getActivitySummary(activity)}</p>
                      </div>
                    </div>
                    <p
                      className="shrink-0 text-xs text-muted-foreground"
                      title={formatTableDate(activity.created_at)}
                    >
                      {formatTableDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AnalyticsEmptyState description="No activity recorded yet." />
          )}
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
  const avgGroupsExportRows = avgGroupsPerCoach
    ? [{ metric: "Average Groups per Coach", value: avgGroupsPerCoach.avg_groups.toFixed(1) }]
    : [];

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
          <AnalyticsCardHeader
            title="AI Usage by Action"
            description="Total AI usage volume split by coach action type."
            exportAction={
              aiUsageByAction.length > 0 ? (
                <ExportButton
                  label="AI usage by action"
                  onClick={() =>
                    exportToCsv(
                      aiUsageByAction.map((item) => ({
                        action: item.action,
                        usage_count: item.usage_count,
                      })),
                      "ai_usage_by_action.csv",
                      [
                        { key: "action", label: "Action" },
                        { key: "usage_count", label: "Count" },
                      ],
                    )
                  }
                />
              ) : undefined
            }
          />
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
          action={
            avgGroupsExportRows.length > 0 ? (
              <ExportButton
                label="average groups per coach"
                onClick={() =>
                  exportToCsv(
                    avgGroupsExportRows,
                    "avg_groups_per_coach.csv",
                    [
                      { key: "metric", label: "Metric" },
                      { key: "value", label: "Value" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
      </div>

      <Card className="border-border/80 bg-card/80">
        <AnalyticsCardHeader
          title="Template Creation Trend"
          description="Weekly template creation volume across all coaches."
          exportAction={
            templateCreationTrendData.length > 0 ? (
              <ExportButton
                label="template creation trend"
                onClick={() =>
                  exportToCsv(
                    templateCreationTrend.map((point) => ({
                      period: formatExportDate(point.period),
                      template_count: point.template_count,
                    })),
                    "template_creation_trend.csv",
                    [
                      { key: "period", label: "Period" },
                      { key: "template_count", label: "Templates" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
        <AnalyticsCardHeader
          title="Most Active Coaches"
          description="Top coaches ranked by templates, groups, and AI usage combined."
          exportAction={
            mostActiveCoaches.length > 0 ? (
              <ExportButton
                label="most active coaches"
                onClick={() =>
                  exportToCsv(
                    mostActiveCoaches.map((coach) => ({
                      email: coach.email,
                      templates_created: coach.templates_created,
                      groups_created: coach.groups_created,
                      ai_calls: coach.ai_calls,
                      total_activity: coach.total_activity,
                    })),
                    "most_active_coaches.csv",
                    [
                      { key: "email", label: "Email" },
                      { key: "templates_created", label: "Templates" },
                      { key: "groups_created", label: "Groups" },
                      { key: "ai_calls", label: "AI Calls" },
                      { key: "total_activity", label: "Total" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
  const platformCompletionExportRows = platformCompletionRate
    ? [
        { metric: "Total Tasks", value: platformCompletionRate.total_tasks },
        { metric: "Completed Tasks", value: platformCompletionRate.completed_tasks },
        {
          metric: "Completion Rate",
          value: platformCompletionRate.completion_rate.toFixed(1),
        },
      ]
    : [];

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

      <div className="space-y-4">
        <AnalyticsSectionHeader
          title="Platform Completion"
          description="Grouped task volume and completion metrics for the reporting window."
          exportAction={
            platformCompletionExportRows.length > 0 ? (
              <ExportButton
                label="completion rate"
                onClick={() =>
                  exportToCsv(
                    platformCompletionExportRows,
                    "completion_rate.csv",
                    [
                      { key: "metric", label: "Metric" },
                      { key: "value", label: "Value" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
      </div>

      <Card className="border-border/80 bg-card/80">
        <AnalyticsCardHeader
          title="Completion Trend"
          description="Weekly completion rate across the platform."
          exportAction={
            completionTrendData.length > 0 ? (
              <ExportButton
                label="completion trend"
                onClick={() =>
                  exportToCsv(
                    completionTrend.map((point) => ({
                      period: formatExportDate(point.period),
                      total_tasks: point.total_tasks,
                      completed_tasks: point.completed_tasks,
                      completion_rate: point.completion_rate.toFixed(1),
                    })),
                    "completion_trend.csv",
                    [
                      { key: "period", label: "Period" },
                      { key: "total_tasks", label: "Total" },
                      { key: "completed_tasks", label: "Completed" },
                      { key: "completion_rate", label: "Rate" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
        <AnalyticsCardHeader
          title="Completion by Group"
          description="Completion rate for each group with assigned tasks."
          exportAction={
            completionByGroup.length > 0 ? (
              <ExportButton
                label="completion by group"
                onClick={() =>
                  exportToCsv(
                    completionByGroup.map((group) => ({
                      group_name: group.group_name,
                      total_tasks: group.total_tasks,
                      completed_tasks: group.completed_tasks,
                      completion_rate: group.completion_rate.toFixed(1),
                    })),
                    "completion_by_group.csv",
                    [
                      { key: "group_name", label: "Group" },
                      { key: "total_tasks", label: "Total" },
                      { key: "completed_tasks", label: "Completed" },
                      { key: "completion_rate", label: "Rate" },
                    ],
                  )
                }
              />
            ) : undefined
          }
        />
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
          <AnalyticsCardHeader
            title="Top Groups"
            description="Best completion rates among groups with at least 5 tasks."
            exportAction={
              topGroups.length > 0 ? (
                <ExportButton
                  label="top groups"
                  onClick={() =>
                    exportToCsv(
                      topGroups.map((group) => ({
                        group_name: group.group_name,
                        completion_rate: group.completion_rate.toFixed(1),
                        total_tasks: group.total_tasks,
                      })),
                      "top_groups.csv",
                      [
                        { key: "group_name", label: "Group" },
                        { key: "completion_rate", label: "Rate" },
                        { key: "total_tasks", label: "Total Tasks" },
                      ],
                    )
                  }
                />
              ) : undefined
            }
          />
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
          <AnalyticsCardHeader
            title="At-Risk Students"
            description="Students below 50% completion in the current reporting window."
            exportAction={
              atRiskStudents.length > 0 ? (
                <ExportButton
                  label="at-risk students"
                  onClick={() =>
                    exportToCsv(
                      atRiskStudents.map((student) => ({
                        email: student.email,
                        total_tasks: student.total_tasks,
                        completed_tasks: student.completed_tasks,
                        completion_rate: student.completion_rate.toFixed(1),
                      })),
                      "at_risk_students.csv",
                      [
                        { key: "email", label: "Email" },
                        { key: "total_tasks", label: "Total" },
                        { key: "completed_tasks", label: "Completed" },
                        { key: "completion_rate", label: "Rate" },
                      ],
                    )
                  }
                />
              ) : undefined
            }
          />
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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshCycle, setAutoRefreshCycle] = useState(0);
  const analytics = useAdminAnalytics(startDate, endDate);
  const { isRefreshing, loading: analyticsLoading, refetch } = analytics;

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refetch();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefresh, autoRefreshCycle, endDate, refetch, startDate]);

  const handleRefresh = async () => {
    if (analyticsLoading || isRefreshing) {
      return;
    }

    if (autoRefresh) {
      setAutoRefreshCycle((current) => current + 1);
    }

    await refetch();
  };

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

      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:justify-between">
        <div className="min-w-0 flex-1">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={(nextStartDate, nextEndDate) => {
              setStartDate(nextStartDate);
              setEndDate(nextEndDate);
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2 xl:self-start">
          <button
            type="button"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={analyticsLoading || isRefreshing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh analytics"
            title="Refresh analytics"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setAutoRefresh((current) => !current);
              setAutoRefreshCycle((current) => current + 1);
            }}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              autoRefresh
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-border/60 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
            }`}
            aria-pressed={autoRefresh}
            title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
          >
            <span
              className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-400" : "bg-muted-foreground/60"}`}
            />
            <span>Auto-refresh</span>
          </button>
        </div>
      </div>

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
