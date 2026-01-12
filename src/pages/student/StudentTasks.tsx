import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WobblyCard,
  WobblyProgress,
  WobblyBadge,
  DoodleCheck,
  DoodleCircle,
  DoodleStar,
  DoodleLeaf,
} from "@/components/ui/wobbly";

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-6 space-y-8 max-w-lg mx-auto">
      {/* Header with doodle accents */}
      <div className="relative">
        <DoodleStar className="absolute -top-2 -left-1 w-5 h-5 animate-wiggle" />
        <DoodleLeaf className="absolute top-0 right-4 w-4 h-4 animate-float-gentle" />
        <p className="text-muted-foreground font-sketch text-lg">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="text-4xl text-foreground mt-1">My Tasks</h1>
      </div>

      {/* Progress Card */}
      <WobblyCard pastel="mint" className="min-h-[100px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-sketch text-lg text-foreground">Today's Progress</span>
            <WobblyBadge pastel="yellow">
              {completedToday}/{todayTasks.length}
            </WobblyBadge>
          </div>
          <WobblyProgress value={completedToday} max={todayTasks.length || 1} />
        </div>
      </WobblyCard>

      {/* Today's Tasks */}
      <section className="space-y-4">
        <h2 className="font-sketch text-2xl text-foreground flex items-center gap-2">
          <DoodleStar className="w-5 h-5" />
          Today
        </h2>
        {todayTasks.length === 0 ? (
          <WobblyCard pastel="lavender" className="min-h-[120px]">
            <div className="flex flex-col items-center justify-center h-full text-center py-4">
              <DoodleLeaf className="w-10 h-10 mb-2 animate-float-gentle" />
              <p className="font-sketch text-xl text-foreground">All done for today!</p>
              <p className="text-muted-foreground text-sm mt-1">Time to relax~</p>
            </div>
          </WobblyCard>
        ) : (
          <div className="space-y-3">
            {todayTasks.map((task, i) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-sketch text-2xl text-foreground flex items-center gap-2">
            <DoodleLeaf className="w-5 h-5" />
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcomingTasks.slice(0, 5).map((task, i) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} showDate index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const pastelColors = ["pink", "yellow", "blue", "mint", "lavender", "peach"] as const;

function TaskCard({ 
  task, 
  onToggle, 
  showDate = false,
  index = 0 
}: { 
  task: Task; 
  onToggle: (t: Task) => void; 
  showDate?: boolean;
  index?: number;
}) {
  // Cycle through pastel colors based on index
  const pastel = pastelColors[index % pastelColors.length];
  
  return (
    <WobblyCard
      pastel={task.is_completed ? "none" : pastel}
      className={cn(
        "cursor-pointer transition-transform active:scale-[0.98]",
        task.is_completed && "opacity-60"
      )}
      onClick={() => onToggle(task)}
    >
      <div className="flex items-start gap-4">
        <div className="pt-0.5 shrink-0">
          {task.is_completed ? (
            <DoodleCheck className="w-7 h-7" />
          ) : (
            <DoodleCircle className="w-7 h-7" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-sketch text-xl text-foreground leading-tight",
            task.is_completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {task.duration_minutes && (
              <span className="font-sans text-sm text-muted-foreground">
                {task.duration_minutes} min
              </span>
            )}
            {showDate && task.due_date && (
              <span className="font-sans text-sm text-muted-foreground">
                {isTomorrow(parseISO(task.due_date)) ? "Tomorrow" : format(parseISO(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>
    </WobblyCard>
  );
}
