import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Clock,
  CalendarIcon,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import {
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { cn, safeParseISO } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error";
import { Button } from "@/components/ui/button";

interface TaskInstance {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
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
      handleError(error, { component: 'StudentCalendar', action: 'fetch tasks', silent: true });
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

  const tasksForDate = tasks.filter((t) => {
    const parsed = safeParseISO(t.scheduled_date);
    return parsed && isSameDay(parsed, selectedDate);
  });

  const datesWithTasks = tasks
    .map((t) => safeParseISO(t.scheduled_date))
    .filter((d): d is Date => d !== null);

  const getCompletionForDate = (date: Date) => {
    const dayTasks = tasks.filter((t) => {
      const parsed = safeParseISO(t.scheduled_date);
      return parsed && isSameDay(parsed, date);
    });
    const completed = dayTasks.filter((t) => t.status === "completed").length;
    return { completed, total: dayTasks.length };
  };

  // Monthly stats
  const monthlyStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
  };
  const monthlyProgress =
    monthlyStats.total > 0
      ? Math.round((monthlyStats.completed / monthlyStats.total) * 100)
      : 0;

  // Selected day stats
  const dayStats = {
    total: tasksForDate.length,
    completed: tasksForDate.filter((t) => t.status === "completed").length,
  };
  const dayProgress =
    dayStats.total > 0
      ? Math.round((dayStats.completed / dayStats.total) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground">View and manage your schedule</p>
      </header>

      {/* Monthly Progress Card */}
      <Card className="bg-gradient-to-br from-cta-primary/10 to-cta-primary/5 border-cta-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cta-primary" />
              <span className="font-semibold text-foreground">
                {format(currentMonth, "MMMM")} Progress
              </span>
            </div>
            <span className="text-2xl font-bold text-cta-primary">
              {monthlyProgress}%
            </span>
          </div>
          <Progress value={monthlyProgress} className="h-2 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{monthlyStats.completed} completed</span>
            <span>{monthlyStats.pending} remaining</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Card */}
        <Card className="lg:row-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setCurrentMonth(new Date());
                    setSelectedDate(new Date());
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="mx-auto"
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "hidden",
                caption_label: "hidden",
                nav: "hidden",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell:
                  "text-muted-foreground rounded-md w-full font-medium text-[0.8rem] py-2",
                row: "flex w-full mt-1",
                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full aspect-square",
                day: cn(
                  "h-full w-full p-0 font-normal rounded-lg transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground focus:outline-none"
                ),
                day_selected:
                  "bg-cta-primary text-white hover:bg-cta-primary hover:text-white focus:bg-cta-primary focus:text-white",
                day_today: "bg-accent text-accent-foreground font-bold",
                day_outside: "text-muted-foreground/40",
                day_disabled: "text-muted-foreground/40",
              }}
              components={{
                DayContent: ({ date }) => {
                  const stats = getCompletionForDate(date);
                  const hasTasks = stats.total > 0;
                  const allComplete = hasTasks && stats.completed === stats.total;
                  const someComplete = hasTasks && stats.completed > 0 && !allComplete;

                  return (
                    <div className="relative flex flex-col items-center justify-center h-full w-full py-1">
                      <span className={cn(isToday(date) && "font-bold")}>
                        {date.getDate()}
                      </span>
                      {hasTasks && (
                        <div className="flex gap-0.5 mt-0.5">
                          {allComplete ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          ) : someComplete ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Complete</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>In progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span>Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
                </p>
                <CardTitle className="text-xl">
                  {format(selectedDate, "MMMM d")}
                </CardTitle>
              </div>
              {dayStats.total > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-cta-primary">
                    {dayProgress}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayStats.completed}/{dayStats.total} tasks
                  </p>
                </div>
              )}
            </div>
            {dayStats.total > 0 && (
              <Progress value={dayProgress} className="h-1.5 mt-3" />
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {tasksForDate.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No tasks scheduled</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Enjoy your free time!
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {tasksForDate.map((task, index) => (
                    <div
                      key={task.id}
                      className={cn(
                        "group relative flex items-start gap-3 p-3 rounded-xl border transition-all",
                        task.status === "completed"
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-card border-border hover:border-cta-primary/30 hover:shadow-sm"
                      )}
                    >
                      {/* Task number indicator */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                          task.status === "completed"
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground group-hover:bg-cta-primary/20 group-hover:text-cta-primary"
                        )}
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "font-medium leading-tight",
                              task.status === "completed"
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            )}
                          >
                            {task.name}
                          </p>
                          <Checkbox
                            checked={task.status === "completed"}
                            onCheckedChange={(checked) =>
                              toggleTaskStatus(task.id, checked as boolean)
                            }
                            className="mt-0.5 flex-shrink-0"
                          />
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {task.scheduled_time && (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0 h-5"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {task.scheduled_time.slice(0, 5)}
                            </Badge>
                          )}
                          {task.duration_minutes && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-2 py-0 h-5"
                            >
                              {task.duration_minutes} min
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">
                  {monthlyStats.total}
                </div>
                <div className="text-xs text-muted-foreground">Total Tasks</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-600">
                  {monthlyStats.completed}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                <div className="text-2xl font-bold text-yellow-600">
                  {monthlyStats.pending}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
