import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Clock, CalendarIcon } from "lucide-react";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TaskInstance {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: "pending" | "completed" | "missed";
}

export default function StudentCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user, currentMonth]);

  const fetchTasks = async () => {
    if (!user) return;

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      const { data, error } = await supabase
        .from("task_instances")
        .select("*")
        .eq("assignee_id", user.id)
        .gte("scheduled_date", monthStart)
        .lte("scheduled_date", monthEnd)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, completed: boolean) => {
    try {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: completed ? "completed" : "pending" }
            : t
        )
      );

      const { error } = await supabase
        .from("task_instances")
        .update({
          status: completed ? "completed" : "pending",
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      if (completed) {
        toast({
          title: "Task completed!",
          description: "Keep up the good work!",
        });
      }
    } catch (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: completed ? "pending" : "completed" }
            : t
        )
      );
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const tasksForDate = tasks.filter(
    (t) => isSameDay(parseISO(t.scheduled_date), selectedDate)
  );

  const datesWithTasks = tasks.map((t) => parseISO(t.scheduled_date));

  const hasTasksOnDate = (date: Date) => {
    return datesWithTasks.some((taskDate) => isSameDay(taskDate, date));
  };

  const getCompletionForDate = (date: Date) => {
    const dayTasks = tasks.filter((t) =>
      isSameDay(parseISO(t.scheduled_date), date)
    );
    const completed = dayTasks.filter((t) => t.status === "completed").length;
    return { completed, total: dayTasks.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground">View your schedule</p>
      </header>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            onMonthChange={setCurrentMonth}
            className="mx-auto"
            modifiers={{
              hasTasks: datesWithTasks,
            }}
            modifiersStyles={{
              hasTasks: {
                fontWeight: "bold",
              },
            }}
            components={{
              DayContent: ({ date }) => {
                const stats = getCompletionForDate(date);
                const hasTasks = stats.total > 0;
                const allComplete = hasTasks && stats.completed === stats.total;

                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {date.getDate()}
                    {hasTasks && (
                      <span
                        className={cn(
                          "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                          allComplete ? "bg-cta-primary" : "bg-yellow-500"
                        )}
                      />
                    )}
                  </div>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Selected Day Tasks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-cta-primary" />
              {format(selectedDate, "EEEE, MMMM d")}
            </div>
            {tasksForDate.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {tasksForDate.filter((t) => t.status === "completed").length}/
                {tasksForDate.length} done
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksForDate.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tasks on this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksForDate.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border transition-all",
                    task.status === "completed"
                      ? "bg-muted/30 border-border"
                      : "bg-card border-border"
                  )}
                >
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={(checked) =>
                      toggleTaskStatus(task.id, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium",
                        task.status === "completed"
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      )}
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
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {task.scheduled_time.slice(0, 5)}
                        </span>
                      )}
                      {task.duration_minutes && (
                        <Badge variant="secondary" className="text-xs">
                          {task.duration_minutes} min
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
