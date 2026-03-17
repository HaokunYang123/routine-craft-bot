import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ChevronLeft, Loader2, Pencil, Plus } from "lucide-react";
import { AssignTaskModal } from "@/components/assignments/AssignTaskModal";
import {
  EditTaskInstanceModal,
  type EditableTaskInstance,
} from "@/components/coach/EditTaskInstanceModal";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignments } from "@/hooks/useAssignments";
import { useCoachStudentSummary } from "@/hooks/useCoachStudentSummary";
import { useCoachStudentTasks, type CoachStudentTask } from "@/hooks/useCoachStudentTasks";
import { supabase } from "@/integrations/supabase/client";

type DatePreset = "default" | "7" | "30" | "90" | "all";

const DATE_PRESETS: Array<{ key: Exclude<DatePreset, "default">; label: string }> = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All time" },
];

const STATUS_STYLES: Record<CoachStudentTask["completion_status"], string> = {
  pending: "border-border bg-secondary/50 text-foreground",
  completed: "border-green-500/30 bg-green-500/15 text-green-300",
  missed: "border-red-500/30 bg-red-500/15 text-red-300",
  excused: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
};

function getDateWindow(preset: DatePreset) {
  const today = new Date();

  if (preset === "all") {
    return {
      windowStart: "2020-01-01",
      windowEnd: "2030-01-01",
    };
  }

  const pastDays = preset === "default" ? 7 : Number(preset);
  const futureDays = preset === "default" ? 30 : Number(preset);

  return {
    windowStart: format(addDays(today, -pastDays), "yyyy-MM-dd"),
    windowEnd: format(addDays(today, futureDays), "yyyy-MM-dd"),
  };
}

function formatStatus(status: CoachStudentTask["completion_status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatTimeValue(value: string | null) {
  if (!value) return null;

  const normalized = value.length === 5 ? `${value}:00` : value;
  const date = new Date(`1970-01-01T${normalized}`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  const startLabel = formatTimeValue(startTime);
  const endLabel = formatTimeValue(endTime);

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel || endLabel || "-";
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    if (error.message.includes("student_not_linked")) {
      return "You do not have access to this student profile.";
    }
    if (error.message.includes("not_a_coach")) {
      return "Only coaches can view this page.";
    }

    return error.message;
  }

  return "Unable to load this student profile.";
}

export default function CoachStudentProfile() {
  const { targetStudentId } = useParams<{ targetStudentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const fromGroup = searchParams.get("from") === "group";
  const groupId = searchParams.get("groupId");

  const [activePreset, setActivePreset] = useState<DatePreset>("default");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [editingTask, setEditingTask] = useState<EditableTaskInstance | null>(null);
  const [excusingTaskId, setExcusingTaskId] = useState<string | null>(null);

  const { excuseTask, isExcusingTask } = useAssignments();
  const { windowStart, windowEnd } = useMemo(() => getDateWindow(activePreset), [activePreset]);
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useCoachStudentSummary(targetStudentId);
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useCoachStudentTasks(targetStudentId, windowStart, windowEnd);

  const { data: breadcrumbGroup } = useQuery({
    queryKey: ["coach-student-breadcrumb-group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("id", groupId!)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: fromGroup && Boolean(groupId),
  });

  useEffect(() => {
    if (!summary) return;

    const availableGroupIds = new Set(summary.enrolled_groups.map((group) => group.group_id));

    if (!selectedGroupId && groupId && availableGroupIds.has(groupId)) {
      setSelectedGroupId(groupId);
      return;
    }

    if (selectedGroupId && availableGroupIds.has(selectedGroupId)) {
      return;
    }

    setSelectedGroupId(summary.enrolled_groups[0]?.group_id ?? "");
  }, [groupId, selectedGroupId, summary]);

  const selectedGroup = useMemo(
    () => summary?.enrolled_groups.find((group) => group.group_id === selectedGroupId) ?? null,
    [selectedGroupId, summary],
  );

  const handleTaskMutationComplete = async () => {
    await queryClient.invalidateQueries({ queryKey: ["coach-student-tasks"] });
    await refetchTasks();
  };

  const handleExcuseTask = async (task: CoachStudentTask) => {
    if (!targetStudentId) return;

    setExcusingTaskId(task.instance_id);

    try {
      const success = await excuseTask({
        taskId: task.instance_id,
        studentId: targetStudentId,
      });

      if (success) {
        await queryClient.invalidateQueries({ queryKey: ["coach-student-tasks"] });
      }
    } finally {
      setExcusingTaskId(null);
    }
  };

  const openEditModal = (task: CoachStudentTask) => {
    setEditingTask({
      instance_id: task.instance_id,
      assignment_id: task.assignment_id,
      task_title: task.parent_task_title,
      current_date: task.scheduled_date,
      current_start_time: task.start_time,
      current_end_time: task.end_time,
      status: task.completion_status,
    });
  };

  if (summaryLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6 pb-20">
        <div className="space-y-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summaryError || !summary) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6 pb-20">
        <Card className="border-red-500/30">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-400" />
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-foreground">Student profile unavailable</h1>
                <p className="text-sm text-muted-foreground">{getErrorMessage(summaryError)}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-fit">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pageError = summaryError ?? tasksError;
  const completionPct = Math.max(0, Math.min(100, Number(summary.overall_completion_pct || 0)));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6 pb-20">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="w-fit px-0" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {fromGroup && groupId && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/groups/${groupId}`}>{breadcrumbGroup?.name || "Group"}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{summary.student_display_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div>
                <CardTitle className="text-3xl font-display text-foreground">
                  {summary.student_display_name}
                </CardTitle>
                {summary.student_email && (
                  <CardDescription className="mt-1 text-sm">
                    {summary.student_email}
                  </CardDescription>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.enrolled_groups.map((group) => (
                  <Badge key={group.group_id} variant="secondary" className="bg-secondary/60">
                    <Link to={`/groups/${group.group_id}`}>{group.group_name}</Link>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="min-w-[220px] space-y-2 rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-semibold text-foreground">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {summary.total_completed_count} of {summary.total_assigned_count} tasks completed
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {summary.enrolled_groups.length > 1 && (
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {summary.enrolled_groups.map((group) => (
                  <SelectItem key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={() => setAssignDialogOpen(true)}
            disabled={!selectedGroup}
            className="bg-cta-primary hover:bg-cta-hover text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign Task
          </Button>

          {!selectedGroup && (
            <p className="text-sm text-muted-foreground">
              This student is not enrolled in a coach-owned group.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              size="sm"
              variant={activePreset === preset.key ? "default" : "outline"}
              onClick={() => setActivePreset(preset.key)}
              className={activePreset === preset.key ? "bg-cta-primary hover:bg-cta-hover text-white" : ""}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task History</CardTitle>
          <CardDescription>
            Showing tasks from {windowStart} to {windowEnd}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pageError && !tasksLoading && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {getErrorMessage(pageError)}
            </div>
          )}

          {tasksLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              No tasks in this date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const isActionable =
                      task.completion_status === "pending" || task.completion_status === "missed";

                    return (
                      <TableRow key={task.instance_id}>
                        <TableCell>{formatDateLabel(task.scheduled_date)}</TableCell>
                        <TableCell className="font-medium">{task.parent_task_title}</TableCell>
                        <TableCell>{formatTimeRange(task.start_time, task.end_time)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLES[task.completion_status]}>
                            {formatStatus(task.completion_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.origin_group_id && task.origin_group_name ? (
                            <Link
                              to={`/groups/${task.origin_group_id}`}
                              className="text-sky-300 hover:underline"
                            >
                              {task.origin_group_name}
                            </Link>
                          ) : (
                            "Individual"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isActionable ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(task)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  void handleExcuseTask(task);
                                }}
                                disabled={isExcusingTask && excusingTaskId === task.instance_id}
                              >
                                {isExcusingTask && excusingTaskId === task.instance_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Excuse"
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGroup && (
        <AssignTaskModal
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          mode="individual"
          groupId={selectedGroup.group_id}
          groupName={selectedGroup.group_name}
          studentId={targetStudentId}
          studentName={summary.student_display_name}
          onAssigned={() => {
            void handleTaskMutationComplete();
          }}
        />
      )}

      <EditTaskInstanceModal
        instanceToEdit={editingTask}
        isOpen={Boolean(editingTask)}
        onDismiss={() => setEditingTask(null)}
        onSaveComplete={() => {
          void handleTaskMutationComplete();
        }}
      />
    </div>
  );
}
