import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      }

      // Fetch stats
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
    };

    fetchData();
  }, [user]);

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{displayName ? `, ${displayName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your routines and progress.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              People
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.peopleCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Athletes, students & kids
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
            <ListTodo className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all routines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
            <div className="text-xs font-medium text-primary">{completionRate}%</div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full gradient-hero rounded-full transition-all duration-500"
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
        <Card className="gradient-card hover:shadow-elevated transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">AI Assistant</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate plans, personalize routines, and get smart suggestions.
                </p>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/dashboard/assistant">
                    Open Chat <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card hover:shadow-elevated transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Add a Person</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding people you want to create routines for.
                </p>
                <Button variant="outline" size="sm" asChild>
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
