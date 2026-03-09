import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ANALYTICS_TABS = [
  {
    value: "platform-health",
    label: "Platform Health",
    description: "System-wide usage, reliability, and retention signals will land here.",
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
          Data coming soon
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
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <CardTitle className="text-xl">{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-6 py-10 text-sm text-muted-foreground">
                  Data coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
