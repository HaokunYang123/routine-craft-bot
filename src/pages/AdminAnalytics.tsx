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
    description: "Coach workflows and assignment patterns will land here.",
  },
  {
    value: "student-outcomes",
    label: "Student Outcomes",
    description: "Completion and progress trends will land here.",
  },
] as const;

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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

function buildAiUsageChartData(
  points: ReturnType<typeof useAdminAnalytics>["aiUsageTrend"],
) {
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

function AnalyticsPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-sm text-muted-foreground">
          Data coming soon
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformHealthLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="border-border/80 bg-card/80">
            <CardHeader className="space-y-3 pb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {[0, 1, 2].map((index) => (
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

function PlatformHealthPanel() {
  const { signupCurve, activeUsers, roleDistribution, churnCandidates, aiUsageTrend, loading, error } =
    useAdminAnalytics();

  const hasAnyData =
    activeUsers !== null ||
    signupCurve.length > 0 ||
    roleDistribution.length > 0 ||
    churnCandidates.length > 0 ||
    aiUsageTrend.length > 0;

  const roleChartData = roleDistribution.map((item) => ({
    ...item,
    label: formatRoleLabel(item.role),
  }));

  const aiUsageActions = Array.from(new Set(aiUsageTrend.map((item) => item.action))).sort();
  const aiUsageChartData = buildAiUsageChartData(aiUsageTrend);

  if (loading) {
    return <PlatformHealthLoading />;
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
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "DAU",
            value: activeUsers?.dau ?? 0,
            description: "Signed in within 1 day",
            icon: BarChart3,
            color: "text-blue-400",
          },
          {
            title: "WAU",
            value: activeUsers?.wau ?? 0,
            description: "Signed in within 7 days",
            icon: Users,
            color: "text-emerald-400",
          },
          {
            title: "MAU",
            value: activeUsers?.mau ?? 0,
            description: "Signed in within 30 days",
            icon: UserX,
            color: "text-amber-400",
          },
        ].map((item) => (
          <Card key={item.title} className="border-border/80 bg-card/80">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardDescription>{item.title}</CardDescription>
                <CardTitle className="mt-2 text-4xl font-semibold tracking-tight">
                  {item.value.toLocaleString()}
                </CardTitle>
              </div>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Signup Curve</CardTitle>
          <CardDescription>Weekly signup volume based on account creation date.</CardDescription>
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
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="signup_count"
                    name="Signups"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#3b82f6" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-sm text-muted-foreground">
              No data available
            </div>
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
                    <Tooltip
                      formatter={(value) => [value, "Users"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-sm text-muted-foreground">
                No data available
              </div>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
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
              <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-xl">Churn Risk</CardTitle>
          <CardDescription>Coaches inactive for 14 or more days, including never-signed-in accounts.</CardDescription>
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
            <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-sm text-muted-foreground">
              No churn candidates found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAnalytics() {
  const { profile, loading } = useProfile();

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
          Live product health for the admin dashboard, with coach and student drill-downs to follow.
        </p>
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

        {ANALYTICS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.value === "platform-health" ? (
              <PlatformHealthPanel />
            ) : (
              <AnalyticsPlaceholder title={tab.label} description={tab.description} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
