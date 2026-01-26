import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  MessageSquare,
  Flame,
  Star,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { safeFormatDate } from "@/lib/utils";
import { handleError } from "@/lib/error";

// Use task_instances table - these have the correctly calculated scheduled_date
interface TaskInstance {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_time: string | null;
  scheduled_date: string;
  status: string;
  coach_name?: string;
}

interface CoachNote {
  id: string;
  content: string;
  created_at: string;
  from_name?: string;
}

export default function AssigneeDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [streak, setStreak] = useState(0);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch today's task instances (not tasks!)
      const { data: instances, error } = await supabase
        .from("task_instances")
        .select(`
          id,
          name,
          description,
          duration_minutes,
          scheduled_time,
          scheduled_date,
          status,
          assignments!inner(assigned_by)
        `)
        .eq("assignee_id", user.id)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true });

      if (error) throw error;

      // Get coach names
      if (instances && instances.length > 0) {
        const coachIds = [...new Set(instances.map((i: any) => i.assignments?.assigned_by).filter(Boolean))];

        let coachProfiles: Record<string, string> = {};
        if (coachIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", coachIds);

          if (profiles) {
            profiles.forEach((p) => {
              coachProfiles[p.user_id] = p.display_name || "Coach";
            });
          }
        }

        const enrichedTasks: TaskInstance[] = instances.map((instance: any) => ({
          id: instance.id,
          name: instance.name,
          description: instance.description,
          duration_minutes: instance.duration_minutes,
          scheduled_time: instance.scheduled_time,
          scheduled_date: instance.scheduled_date,
          status: instance.status,
          coach_name: coachProfiles[instance.assignments?.assigned_by] || "Coach",
        }));

        setTasks(enrichedTasks);
      } else {
        setTasks([]);
      }

      // Get groups this student belongs to
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      const groupIds = memberships?.map((m) => m.group_id) || [];

      // Fetch coach notes - both targeted to this user AND broadcast to their groups
      let allNotes: any[] = [];

      // 1. Notes targeted directly to this student
      const { data: targetedNotes } = await supabase
        .from("notes")
        .select("id, content, created_at, from_user_id")
        .eq("to_user_id", user.id)
        .eq("visibility", "shared")
        .order("created_at", { ascending: false })
        .limit(5);

      if (targetedNotes) allNotes = [...targetedNotes];

      // 2. Broadcast notes to student's groups (to_user_id is null)
      if (groupIds.length > 0) {
        const { data: broadcastNotes } = await supabase
          .from("notes")
          .select("id, content, created_at, from_user_id")
          .in("group_id", groupIds)
          .is("to_user_id", null)
          .eq("visibility", "shared")
          .order("created_at", { ascending: false })
          .limit(5);

        if (broadcastNotes) allNotes = [...allNotes, ...broadcastNotes];
      }

      // Sort by date and take top 5
      allNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const topNotes = allNotes.slice(0, 5);

      // Get coach names for notes
      if (topNotes.length > 0) {
        const coachIds = [...new Set(topNotes.map((n) => n.from_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", coachIds);

        const profileMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          profileMap[p.user_id] = p.display_name || "Coach";
        });

        setNotes(
          topNotes.map((n) => ({
            id: n.id,
            content: n.content,
            created_at: n.created_at,
            from_name: profileMap[n.from_user_id] || "Coach",
          }))
        );
      }
    } catch (error) {
      handleError(error, { component: 'AssigneeDashboard', action: 'fetch dashboard data' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (task: TaskInstance) => {
    setCompletingTask(task.id);

    try {
      const isCompleted = task.status === "completed";
      const newStatus = isCompleted ? "pending" : "completed";

      // Update task_instances table (not tasks!)
      const { error } = await supabase
        .from("task_instances")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", task.id);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: newStatus } : t
        )
      );

      if (newStatus === "completed") {
        toast({
          title: "Task Completed!",
          description: `Great job completing "${task.name}"`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setCompletingTask(null);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {getGreeting()}, {profile?.display_name || "there"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full">
            <Flame className="w-5 h-5" />
            <span className="font-bold">{streak} day streak</span>
          </div>
        )}
      </div>

      {/* Today's Progress */}
      <Card className="border-border bg-gradient-to-br from-cta-primary/10 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Today's Progress</p>
              <p className="text-3xl font-bold text-foreground">
                {completedCount} / {tasks.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-cta-primary">{completionRate}%</p>
              <p className="text-sm text-muted-foreground">complete</p>
            </div>
          </div>
          <Progress value={completionRate} className="h-3" />
          {completionRate === 100 && tasks.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-success">
              <Star className="w-5 h-5" />
              <span className="font-medium">All tasks complete! Amazing work!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Tasks */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-cta-primary" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tasks scheduled for today</p>
              <p className="text-sm text-muted-foreground mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isCompleted = task.status === "completed";
                const isMissed = task.status === "missed";

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                      isCompleted
                        ? "border-success/30 bg-success/5"
                        : isMissed
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-card/50 hover:border-cta-primary/30"
                    }`}
                  >
                    <button
                      onClick={() => toggleTaskCompletion(task)}
                      disabled={completingTask === task.id}
                      className="mt-0.5 shrink-0"
                    >
                      {completingTask === task.id ? (
                        <Loader2 className="w-6 h-6 animate-spin text-cta-primary" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-success" />
                      ) : (
                        <Circle className="w-6 h-6 text-muted-foreground hover:text-cta-primary transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium ${
                          isCompleted
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.name}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {task.scheduled_time && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.scheduled_time.slice(0, 5)}
                          </span>
                        )}
                        {task.duration_minutes && (
                          <span className="text-xs text-muted-foreground">
                            {task.duration_minutes} min
                          </span>
                        )}
                        {isMissed && (
                          <Badge variant="destructive" className="text-xs">
                            Missed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coach Notes */}
      {notes.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-btn-secondary" />
              Notes from Coach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <p className="text-foreground">{note.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      From {note.from_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {safeFormatDate(note.created_at, "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/app/calendar">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-cta-primary" />
                  <div>
                    <p className="font-medium text-foreground">Calendar</p>
                    <p className="text-xs text-muted-foreground">View all tasks</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/stickers">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="font-medium text-foreground">Rewards</p>
                    <p className="text-xs text-muted-foreground">Your stickers</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
