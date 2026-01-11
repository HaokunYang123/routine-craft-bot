import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, CheckCircle2, Clock, Users } from "lucide-react";

interface ProgressData {
  totalTasks: number;
  completedTasks: number;
  peopleStats: { name: string; completed: number; total: number }[];
}

export default function Progress() {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    // Fetch all tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, is_completed, person_id, people(name)")
      .eq("user_id", user!.id);

    if (tasks) {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.is_completed).length;

      // Group by person
      const personMap: Record<string, { name: string; completed: number; total: number }> = {};
      tasks.forEach((task) => {
        if (task.person_id && task.people) {
          const name = task.people.name;
          if (!personMap[task.person_id]) {
            personMap[task.person_id] = { name, completed: 0, total: 0 };
          }
          personMap[task.person_id].total++;
          if (task.is_completed) {
            personMap[task.person_id].completed++;
          }
        }
      });

      setData({
        totalTasks,
        completedTasks,
        peopleStats: Object.values(personMap).sort((a, b) => b.total - a.total),
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const completionRate = data && data.totalTasks > 0
    ? Math.round((data.completedTasks / data.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-muted-foreground">
          Track completion rates and performance.
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Completion
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-hero bg-clip-text text-transparent">
              {completionRate}%
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
              <div
                className="h-full gradient-hero rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks Completed
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {data?.completedTasks || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              of {data?.totalTasks || 0} total tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Tasks
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {(data?.totalTasks || 0) - (data?.completedTasks || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              still to complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-person stats */}
      {data?.peopleStats && data.peopleStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Progress by Person
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.peopleStats.map((person) => {
                const rate = person.total > 0
                  ? Math.round((person.completed / person.total) * 100)
                  : 0;
                return (
                  <div key={person.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{person.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {person.completed}/{person.total} tasks • {rate}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-hero rounded-full transition-all duration-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(!data?.peopleStats || data.peopleStats.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-1">No progress data yet</h3>
            <p className="text-sm text-muted-foreground">
              Assign tasks to people and mark them complete to see progress.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
