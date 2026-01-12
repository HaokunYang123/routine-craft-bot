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
        <h1 className="text-4xl text-foreground">
          welcome{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          here's your overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-foreground bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              people
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-sketch">{stats.peopleCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              athletes, students & kids
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-foreground bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              total tasks
            </CardTitle>
            <ListTodo className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-sketch">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              across all routines
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-foreground bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              completed
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-accent-sage" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-sketch">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              tasks done
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-foreground bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              completion rate
            </CardTitle>
            <span className="text-sm font-sketch text-accent-sage">{completionRate}%</span>
          </CardHeader>
          <CardContent>
            <div className="w-full h-2 bg-muted border border-foreground overflow-hidden">
              <div 
                className="h-full bg-accent-sage transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              overall progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-foreground bg-card hover:bg-muted/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 border-2 border-foreground flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-sketch text-xl text-foreground mb-1">AI assistant</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  generate plans, personalize routines, get suggestions
                </p>
                <Button variant="default" size="sm" asChild className="border-2 border-foreground">
                  <Link to="/dashboard/assistant">
                    open chat <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-foreground bg-card hover:bg-muted/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 border-2 border-foreground flex items-center justify-center bg-accent-coral/20">
                <Plus className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-sketch text-xl text-foreground mb-1">add a person</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  start by adding people to create routines for
                </p>
                <Button variant="outline" size="sm" asChild className="border-2 border-foreground">
                  <Link to="/dashboard/people">
                    add person <ArrowRight className="w-4 h-4 ml-1" />
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
