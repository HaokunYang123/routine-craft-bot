import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Users, ListTodo, CheckCircle2, MessageSquare, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  peopleCount: number;
  totalTasks: number;
  completedTasks: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ peopleCount: 0, totalTasks: 0, completedTasks: 0 });
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }

        const [peopleRes, tasksRes, completedRes] = await Promise.all([
          supabase.from("people").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_completed", true),
        ]);

        setStats({
          peopleCount: peopleRes.count || 0,
          totalTasks: tasksRes.count || 0,
          completedTasks: completedRes.count || 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-hand text-foreground">
          Welcome back{displayName ? `, ${displayName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your routines and progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card shadow-card border-0 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              People
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-pastel-peach flex items-center justify-center">
              <Users className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-hand">{stats.peopleCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Athletes, students & kids
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-card border-0 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-pastel-mint flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-hand">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all routines
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-card border-0 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-pastel-lavender flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-hand">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks done
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-card border-0 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
            <span className="text-sm font-hand text-primary">{completionRate}%</span>
          </CardHeader>
          <CardContent>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Overall progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card shadow-card border-0 rounded-2xl hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pastel-sky flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-hand text-xl text-foreground mb-1">AI Assistant</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate plans, personalize routines, and get smart suggestions
                </p>
                <Button size="sm" className="rounded-full" asChild>
                  <Link to="/dashboard/assistant">
                    Open Chat <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-card border-0 rounded-2xl hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pastel-lemon flex items-center justify-center">
                <Plus className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-hand text-xl text-foreground mb-1">Add a Person</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding people you want to create routines for
                </p>
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link to="/dashboard/people">
                    Add Person <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
