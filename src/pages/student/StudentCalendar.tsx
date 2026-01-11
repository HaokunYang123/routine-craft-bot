import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground text-sm">View your scheduled tasks</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          modifiers={{
            hasTasks: datesWithTasks,
          }}
          modifiersStyles={{
            hasTasks: {
              fontWeight: "bold",
              textDecoration: "underline",
              textDecorationColor: "hsl(var(--primary))",
            },
          }}
          className="w-full"
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          {format(selectedDate, "EEEE, MMMM d")}
        </h2>
        {tasksForDate.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks scheduled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasksForDate.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl bg-card border border-border",
                  task.is_completed && "opacity-60"
                )}
              >
                {task.is_completed ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    "font-medium",
                    task.is_completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  {task.duration_minutes && (
                    <span className="flex items-center text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {task.duration_minutes} min
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
