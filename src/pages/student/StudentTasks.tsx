import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isTomorrow, parseISO, isValid } from "date-fns";
import { cn, safeParseISO } from "@/lib/utils";
import {
  SoftCard,
  SoftProgress,
  SoftCheckbox,
  PillBadge,
  DoodleStar,
  DoodleSun,
} from "@/components/ui/doodle";

interface Task {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  is_completed: boolean | null;
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

  const todayTasks = tasks.filter(t => {
    const parsed = safeParseISO(t.due_date);
    return parsed && isToday(parsed);
  });
  const upcomingTasks = tasks.filter(t => {
    const parsed = safeParseISO(t.due_date);
    return parsed && !isToday(parsed) && !t.is_completed;
  });
  const completedToday = todayTasks.filter(t => t.is_completed).length;
  const progressValue = todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pastelCycle: Array<"peach" | "mint" | "lavender" | "sky" | "lemon" | "rose"> = 
    ["peach", "mint", "lavender", "sky", "lemon", "rose"];

  return (
    <div className="p-5 space-y-6">
      {/* Header with greeting */}
      <div className="pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <DoodleSun className="w-6 h-6 text-primary animate-wiggle" />
          <span className="text-sm text-muted-foreground">Good day!</span>
        </div>
        <h1 className="text-4xl font-hand text-foreground">Today's Tasks</h1>
        <p className="text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      {/* Progress Card */}
      {todayTasks.length > 0 && (
        <SoftCard className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-hand text-lg text-foreground">Progress</span>
            <div className="flex items-center gap-1">
              <DoodleStar className="w-4 h-4 text-primary" />
              <span className="font-hand font-bold text-primary">
                {completedToday}/{todayTasks.length}
              </span>
            </div>
          </div>
          <SoftProgress value={progressValue} color="primary" />
          {progressValue === 100 && (
            <p className="text-sm text-center font-hand text-primary">
              Amazing! All done! 🎉
            </p>
          )}
        </SoftCard>
      )}

      {/* Today's Tasks */}
      <div className="space-y-3">
        {todayTasks.length === 0 ? (
          <SoftCard pastel="lemon" className="text-center py-8">
            <DoodleStar className="w-8 h-8 mx-auto mb-2 text-foreground/40" />
            <p className="font-hand text-lg text-foreground/60">
              No tasks for today!
            </p>
            <p className="text-sm text-muted-foreground">
              Enjoy your free time ✨
            </p>
          </SoftCard>
        ) : (
          todayTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              pastel={pastelCycle[index % pastelCycle.length]}
              onToggle={() => toggleTask(task)}
            />
          ))
        )}
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-2xl font-hand text-foreground flex items-center gap-2">
            Coming Up
            <span className="text-sm font-sans text-muted-foreground">
              ({upcomingTasks.length})
            </span>
          </h2>
          {upcomingTasks.slice(0, 5).map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              pastel={pastelCycle[(index + 2) % pastelCycle.length]}
              onToggle={() => toggleTask(task)}
              showDate
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Task Card Component
function TaskCard({ 
  task, 
  pastel,
  onToggle, 
  showDate = false 
}: { 
  task: Task; 
  pastel: "peach" | "mint" | "lavender" | "sky" | "lemon" | "rose";
  onToggle: () => void;
  showDate?: boolean;
}) {
  const formatDueDate = (date: string) => {
    const parsed = safeParseISO(date);
    if (!parsed) return "No date";
    if (isToday(parsed)) return "Today";
    if (isTomorrow(parsed)) return "Tomorrow";
    return format(parsed, "EEE, MMM d");
  };

  return (
    <SoftCard 
      pastel={task.is_completed ? "white" : pastel} 
      className={cn(
        "transition-all duration-200",
        task.is_completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="pt-0.5">
          <SoftCheckbox checked={!!task.is_completed} onChange={onToggle} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={onToggle}>
          <p className={cn(
            "font-hand text-xl text-foreground leading-tight cursor-pointer",
            task.is_completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.duration_minutes && (
              <PillBadge pastel="sky">
                {task.duration_minutes} min
              </PillBadge>
            )}
            {showDate && task.due_date && (
              <PillBadge pastel="lavender">
                {formatDueDate(task.due_date)}
              </PillBadge>
            )}
          </div>
        </div>
      </div>
    </SoftCard>
  );
}
