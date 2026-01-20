import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  History,
} from "lucide-react";
import { format, parseISO, subDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TaskInstance {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_date: string;
  status: "pending" | "completed" | "missed";
  completed_at: string | null;
}

interface StudentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName: string;
  groupId?: string;
}

export function StudentDetailSheet({
  open,
  onOpenChange,
  studentId,
  studentName,
  groupId,
}: StudentDetailSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  useEffect(() => {
    if (open && studentId) {
      fetchStudentTasks();
      setAiSummary("");
      setActiveTab("active");
    }
  }, [open, studentId]);

  const fetchStudentTasks = async () => {
    if (!studentId) return;
    setLoading(true);

    try {
      // Get tasks from the past 7 days + future tasks
      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("task_instances")
        .select("*")
        .eq("assignee_id", studentId)
        .gte("scheduled_date", sevenDaysAgo)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching student tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    setGeneratingSummary(true);
    setAiSummary("");

    try {
      const pastTasks = tasks.filter((t) => t.status === "completed" || t.status === "missed");
      const completed = pastTasks.filter((t) => t.status === "completed").length;
      const missed = pastTasks.filter((t) => t.status === "missed").length;
      const total = pastTasks.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          action: "student_recap",
          payload: {
            studentName,
            completedCount: completed,
            missedCount: missed,
            totalCount: total,
            completionRate: rate,
            recentTasks: pastTasks.slice(0, 10).map((t) => ({
              name: t.name,
              status: t.status,
              date: t.scheduled_date,
            })),
          },
        },
      });

      if (error) throw error;
      setAiSummary(data.result || "Unable to generate summary.");
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Filter tasks by tab
  const activeTasks = tasks.filter((t) => t.status === "pending");
  const pastTasks = tasks.filter((t) => t.status === "completed" || t.status === "missed");

  // Stats
  const activeStats = {
    total: activeTasks.length,
    today: activeTasks.filter((t) => t.scheduled_date === format(new Date(), "yyyy-MM-dd")).length,
  };

  const pastStats = {
    completed: pastTasks.filter((t) => t.status === "completed").length,
    missed: pastTasks.filter((t) => t.status === "missed").length,
    total: pastTasks.length,
  };

  const completionRate =
    pastStats.total > 0 ? Math.round((pastStats.completed / pastStats.total) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {studentName.charAt(0).toUpperCase()}
            </div>
            {studentName}
          </SheetTitle>
          <SheetDescription>View task assignments and history</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold">{activeStats.total}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{pastStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10">
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{pastStats.missed}</p>
                  <p className="text-xs text-muted-foreground">Missed</p>
                </CardContent>
              </Card>
            </div>

            {/* Completion Rate */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">7-Day Completion Rate</span>
                <span
                  className={cn(
                    "font-bold",
                    completionRate >= 80
                      ? "text-green-600"
                      : completionRate >= 50
                      ? "text-yellow-600"
                      : "text-destructive"
                  )}
                >
                  {completionRate}%
                </span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "past")}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="active">
                  <Circle className="w-4 h-4 mr-2" />
                  Active ({activeTasks.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  <History className="w-4 h-4 mr-2" />
                  Past Work ({pastTasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {activeTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="past" className="mt-4">
                {/* AI Summary Button */}
                <div className="mb-4">
                  {aiSummary ? (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">AI Recap</p>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {aiSummary}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setAiSummary("")}
                        >
                          Clear
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={generateAISummary}
                      disabled={generatingSummary || pastTasks.length === 0}
                    >
                      {generatingSummary ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Show AI Recap of {studentName}'s Week
                    </Button>
                  )}
                </div>

                <ScrollArea className="h-[350px] pr-4">
                  {pastTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No past work in the last 7 days</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pastTasks.map((task) => (
                        <TaskCard key={task.id} task={task} isHistory />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface TaskCardProps {
  task: TaskInstance;
  isHistory?: boolean;
}

function TaskCard({ task, isHistory = false }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const isMissed = task.status === "missed";

  return (
    <Card
      className={cn(
        "transition-all",
        isHistory && "opacity-60",
        isCompleted && "bg-green-50/50 dark:bg-green-900/10 border-green-200/50",
        isMissed && "bg-destructive/5 border-destructive/20"
      )}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : isMissed ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-medium text-sm",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.name}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge
                variant={isCompleted ? "default" : isMissed ? "destructive" : "secondary"}
                className={cn(
                  "text-xs h-5",
                  isCompleted && "bg-green-500/20 text-green-700 border-green-500/30"
                )}
              >
                {isCompleted ? "Done" : isMissed ? "Missed" : "Pending"}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due: {format(parseISO(task.scheduled_date), "MMM d")}
              </span>
              {task.duration_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.duration_minutes}m
                </span>
              )}
            </div>
            {/* Completion timestamp - helps catch cheaters */}
            {isHistory && task.completed_at && (
              <div className="mt-1.5 text-xs text-muted-foreground">
                ✓ Completed: {format(parseISO(task.completed_at), "MMM d 'at' h:mm a")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
