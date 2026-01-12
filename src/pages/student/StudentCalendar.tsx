import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SketchCalendar } from "@/components/ui/sketch-calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  SketchCard,
  SketchCheckbox,
  SketchClock,
  DashedDivider,
  EmptyState,
} from "@/components/ui/sketch";

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
        <div className="font-display text-lg text-muted-foreground animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pb-28 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-3xl font-display font-bold text-foreground">Calendar</h1>
        <p className="text-body-md text-muted-foreground">
          View your schedule
        </p>
      </header>

      {/* Calendar Card */}
      <div className="bg-card p-2 rounded-xl shadow-card">
        <SketchCalendar
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
              backgroundColor: "hsl(var(--accent) / 0.15)",
            },
          }}
        />
      </div>

      <DashedDivider />

      {/* Selected Date Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-display-sm font-display text-foreground">
            {format(selectedDate, "EEEE")}
          </h2>
          <span className="text-body-md text-muted-foreground">
            {format(selectedDate, "MMMM d, yyyy")}
          </span>
        </div>

        {tasksForDate.length === 0 ? (
          <EmptyState
            illustration="no-tasks"
            title="Nothing scheduled"
            description="A free day! ✨"
          />
        ) : (
          <div className="space-y-2">
            {tasksForDate.map((task) => (
              <CalendarTaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CalendarTaskCard({ task }: { task: Task }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-card border-2 border-foreground/20 rounded-xl",
        task.is_completed && "opacity-60",
      )}
      style={{
        clipPath: "polygon(1% 2%, 99% 0%, 100% 98%, 2% 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <SketchCheckbox 
          checked={task.is_completed} 
          disabled 
        />
        <span
          className={cn(
            "font-display text-lg text-foreground",
            task.is_completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </span>
      </div>
      {task.duration_minutes && (
        <span className="text-caption text-muted-foreground bg-accent/10 px-2 py-1 rounded-full">
          {task.duration_minutes} min
        </span>
      )}
    </div>
  );
}
