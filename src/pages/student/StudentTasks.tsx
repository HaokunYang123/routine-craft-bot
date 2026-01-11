import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Loader2, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  due_date: string | null;
  scheduled_time: string | null;
}

export default function StudentTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user!.id)
      .order("due_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  const toggleTask = async (task: Task) => {
    await supabase
      .from("tasks")
      .update({
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    fetchTasks();
  };

  const todayTasks = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));
  const upcomingTasks = tasks.filter(t => t.due_date && !isToday(parseISO(t.due_date)) && !t.is_completed);
  const completedToday = todayTasks.filter(t => t.is_completed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="text-2xl font-bold text-foreground mt-1">My Tasks</h1>
      </div>

      {/* Progress Card */}
      <div className="bg-primary/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Today's Progress</span>
          <span className="text-sm text-primary font-semibold">
            {completedToday}/{todayTasks.length}
          </span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${todayTasks.length ? (completedToday / todayTasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Today's Tasks */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Today
        </h2>
        {todayTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks for today!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Upcoming
          </h2>
          <div className="space-y-2">
            {upcomingTasks.slice(0, 5).map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} showDate />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskCard({ task, onToggle, showDate = false }: { task: Task; onToggle: (t: Task) => void; showDate?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl bg-card border border-border transition-all active:scale-[0.98]",
        task.is_completed && "opacity-60"
      )}
      onClick={() => onToggle(task)}
    >
      <Checkbox
        checked={task.is_completed}
        className="h-6 w-6 rounded-full"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-foreground",
          task.is_completed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.duration_minutes && (
            <span className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {task.duration_minutes}m
            </span>
          )}
          {showDate && task.due_date && (
            <span className="text-xs text-muted-foreground">
              {isTomorrow(parseISO(task.due_date)) ? "Tomorrow" : format(parseISO(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}
