import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  SoftCard,
  PillBadge,
  DoodleFlower,
  DoodleStar,
  DoodleCheck,
} from "@/components/ui/doodle";

interface Task {
  id: string;
  title: string;
  duration_minutes: number | null;
  is_completed: boolean;
  due_date: string | null;
}

export default function StudentCalendar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, duration_minutes, is_completed, due_date")
      .eq("user_id", user!.id)
      .not("due_date", "is", null);

    if (data) setTasks(data);
    setLoading(false);
  };

  const tasksForDate = tasks.filter(
    (t) => t.due_date && isSameDay(parseISO(t.due_date), selectedDate)
  );

  const datesWithTasks = tasks
    .filter((t) => t.due_date)
    .map((t) => parseISO(t.due_date!));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pastelCycle: Array<"peach" | "mint" | "lavender" | "sky" | "lemon" | "rose"> = 
    ["mint", "peach", "lavender", "sky", "lemon", "rose"];

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <DoodleFlower className="w-6 h-6 text-primary" />
          <span className="text-sm text-muted-foreground">Plan ahead</span>
        </div>
        <h1 className="text-4xl font-hand text-foreground">Calendar</h1>
      </div>

      {/* Calendar Card */}
      <SoftCard className="p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          className="mx-auto"
          modifiers={{
            hasTasks: datesWithTasks,
          }}
          modifiersStyles={{
            hasTasks: {
              fontWeight: "bold",
              backgroundColor: "hsl(var(--pastel-peach))",
              borderRadius: "50%",
            },
          }}
        />
      </SoftCard>

      {/* Selected Date */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-hand text-foreground flex items-center gap-2">
            <DoodleStar className="w-5 h-5 text-primary" />
            {format(selectedDate, "EEEE")}
          </h2>
          <span className="text-sm text-muted-foreground">
            {format(selectedDate, "MMMM d, yyyy")}
          </span>
        </div>

        {tasksForDate.length === 0 ? (
          <SoftCard pastel="mint" className="text-center py-6">
            <p className="font-hand text-lg text-foreground/60">
              Nothing scheduled ✨
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              A free day!
            </p>
          </SoftCard>
        ) : (
          tasksForDate.map((task, index) => (
            <CalendarTaskCard 
              key={task.id} 
              task={task} 
              pastel={pastelCycle[index % pastelCycle.length]}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CalendarTaskCard({ 
  task, 
  pastel 
}: { 
  task: Task;
  pastel: "peach" | "mint" | "lavender" | "sky" | "lemon" | "rose";
}) {
  return (
    <SoftCard 
      pastel={task.is_completed ? "white" : pastel}
      className={cn(task.is_completed && "opacity-60")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {task.is_completed && (
            <DoodleCheck className="w-5 h-5 text-primary" />
          )}
          <p className={cn(
            "font-hand text-lg text-foreground",
            task.is_completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
        </div>
        {task.duration_minutes && (
          <PillBadge pastel="sky">
            {task.duration_minutes} min
          </PillBadge>
        )}
      </div>
    </SoftCard>
  );
}
