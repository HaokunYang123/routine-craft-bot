import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { addMonths, eachDayOfInterval, getDay, getDate, lastDayOfMonth, setDate } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generateTimeSlots } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";

type AssignMode = "group" | "individual";

type TemplateSummary = {
  id: string;
  name: string;
};

type TemplateTask = {
  title: string;
  description: string | null;
  day_offset: number;
  sort_order: number | null;
  start_time: string | null;
  end_time: string | null;
};

type TemplateMeta = {
  taskCount: number;
  dayCount: number;
};

type AssignTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AssignMode;
  groupId: string;
  groupName: string;
  studentId?: string | null;
  studentName?: string | null;
  onAssigned?: () => void;
};

const TIME_SLOTS = generateTimeSlots();

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function timeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\\d{1,2}):(\\d{2})\\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 1 || hours > 12) return null;
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function isTimeRangeValid(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return true;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return true;
  return endMinutes > startMinutes;
}

function getScheduledDates(
  startDate: Date,
  endDate: Date,
  scheduleType: string,
  scheduleDays: number[]
): Date[] {
  const dates: Date[] = [];

  if (scheduleType === "once") {
    return [startDate];
  }

  if (scheduleType === "monthly") {
    const dayOfMonth = scheduleDays[0] || 1;
    let current = new Date(startDate);

    while (current <= endDate) {
      let targetDate: Date;

      if (dayOfMonth === -1) {
        targetDate = lastDayOfMonth(current);
      } else {
        const lastDay = getDate(lastDayOfMonth(current));
        const actualDay = Math.min(dayOfMonth, lastDay);
        targetDate = setDate(current, actualDay);
      }

      if (targetDate >= startDate && targetDate <= endDate) {
        dates.push(new Date(targetDate));
      }

      current = addMonths(setDate(current, 1), 1);
    }

    return dates;
  }

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  for (const day of allDays) {
    const dayOfWeek = getDay(day);

    switch (scheduleType) {
      case "daily":
        dates.push(day);
        break;
      case "weekly":
        if (dayOfWeek === getDay(startDate)) {
          dates.push(day);
        }
        break;
      case "custom":
        if (scheduleDays.includes(dayOfWeek)) {
          dates.push(day);
        }
        break;
    }
  }

  return dates;
}

export function AssignTaskModal({
  open,
  onOpenChange,
  mode,
  groupId,
  groupName,
  studentId,
  studentName,
  onAssigned,
}: AssignTaskModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { assignGroupTask, isAssigningGroupTask } = useAssignments();

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("none");
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [assignDate, setAssignDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [scheduleType, setScheduleType] = useState<"once" | "daily" | "weekly" | "monthly" | "custom">("once");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [isMultiDayOpen, setIsMultiDayOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAssigningIndividual, setIsAssigningIndividual] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const activeTemplateId = selectedTemplateId === "none" ? null : selectedTemplateId;

  useEffect(() => {
    if (scheduleType !== "once") {
      setIsMultiDayOpen(false);
    }
    if (scheduleType !== "custom") {
      setScheduleDays([]);
    }
    if (scheduleType !== "monthly") {
      setMonthlyDay(1);
    }
  }, [scheduleType]);

  useEffect(() => {
    if (!startTime || !endTime) {
      setTimeError(null);
      return;
    }
    setTimeError(isTimeRangeValid(startTime, endTime) ? null : "End time must be after start time");
  }, [startTime, endTime]);

  useEffect(() => {
    if (!open || !user || templatesLoaded || templatesLoading) return;

    const loadTemplates = async () => {
      setTemplatesLoading(true);
      const { data, error } = await supabase
        .from("templates")
        .select("id, name")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("not find")) {
          setTemplates([]);
        } else {
          toast({
            title: "Templates unavailable",
            description: "We couldn't load templates right now.",
            variant: "destructive",
          });
        }
      } else {
        setTemplates(data ?? []);
      }

      setTemplatesLoaded(true);
      setTemplatesLoading(false);
    };

    void loadTemplates();
  }, [open, user, templatesLoaded, templatesLoading, toast]);

  const resetFormFields = (options?: { keepDates?: boolean }) => {
    setTaskTitle("");
    setTaskDescription("");
    if (options?.keepDates) {
      setAssignDate(format(new Date(), "yyyy-MM-dd"));
      setDueDate(format(new Date(), "yyyy-MM-dd"));
    } else {
      setAssignDate("");
      setDueDate("");
    }
    setScheduleType("once");
    setScheduleDays([]);
    setMonthlyDay(1);
    setIsMultiDayOpen(false);
    setStartTime("");
    setEndTime("");
  };

  useEffect(() => {
    if (!activeTemplateId) {
      setTemplateMeta(null);
      resetFormFields({ keepDates: true });
      return;
    }

    const loadTemplateTasks = async () => {
      const { data, error } = await supabase
        .from("template_tasks")
        .select("title, description, day_offset, sort_order, start_time, end_time")
        .eq("template_id", activeTemplateId)
        .order("day_offset", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) {
        toast({
          title: "Template error",
          description: "Unable to load template tasks.",
          variant: "destructive",
        });
        return;
      }

      const tasks = (data ?? []) as TemplateTask[];
      if (tasks.length === 0) {
        setTemplateMeta({ taskCount: 0, dayCount: 0 });
        return;
      }

      const sortedTasks = [...tasks].sort((a, b) => {
        if (a.day_offset !== b.day_offset) {
          return a.day_offset - b.day_offset;
        }
        const aSort = a.sort_order ?? 0;
        const bSort = b.sort_order ?? 0;
        return aSort - bSort;
      });

      const firstTask = sortedTasks[0];
      const dayOffsets = tasks.map((task) => task.day_offset ?? 0);
      const minDay = Math.min(...dayOffsets);
      const maxDay = Math.max(...dayOffsets);

      setTemplateMeta({
        taskCount: tasks.length,
        dayCount: maxDay - minDay + 1,
      });
      setTaskTitle(firstTask.title ?? "");
      setTaskDescription(firstTask.description ?? "");
      setStartTime(firstTask.start_time ?? "");
      setEndTime(firstTask.end_time ?? "");
    };

    void loadTemplateTasks();
  }, [activeTemplateId, toast]);

  const templateSummaryText = useMemo(() => {
    if (!templateMeta || templateMeta.taskCount === 0) return null;
    return `This template has ${templateMeta.taskCount} task${templateMeta.taskCount === 1 ? "" : "s"} across ${templateMeta.dayCount} day${templateMeta.dayCount === 1 ? "" : "s"}.`;
  }, [templateMeta]);

  const toggleDayOfWeek = (day: number) => {
    setScheduleDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
  };

  const updateTemplateAssignment = async (assignmentId: string, templateId: string) => {
    await supabase
      .from("assignments")
      .update({ template_id: templateId })
      .eq("id", assignmentId);
  };

  const updateLatestAssignmentTemplate = async (templateId: string) => {
    if (!user) return;
    let query = supabase
      .from("assignments")
      .select("id")
      .eq("assigned_by", user.id)
      .eq("schedule_type", scheduleType)
      .order("created_at", { ascending: false })
      .limit(1);

    if (mode === "group") {
      query = query.eq("group_id", groupId);
    } else if (studentId) {
      query = query.eq("assignee_id", studentId).eq("group_id", groupId);
    }

    if (assignDate) {
      query = query.eq("start_date", assignDate);
    }

    if (dueDate) {
      query = query.eq("end_date", dueDate);
    }

    const { data } = await query;
    const latest = data?.[0];
    if (!latest) return;
    await updateTemplateAssignment(latest.id, templateId);
  };

  const handleAssignTask = async () => {
    if (!taskTitle.trim()) return;
    if (!assignDate || !dueDate) {
      toast({
        title: "Missing Dates",
        description: "Please select assign and due dates.",
        variant: "destructive",
      });
      return;
    }

    if (timeError) {
      toast({
        title: "Invalid Time Range",
        description: timeError,
        variant: "destructive",
      });
      return;
    }

    if (scheduleType === "custom" && scheduleDays.length === 0) {
      toast({
        title: "No Days Selected",
        description: "Please select at least one day for custom schedule",
        variant: "destructive",
      });
      return;
    }

    if (mode === "group") {
      const result = await assignGroupTask({
        groupId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        assignDate,
        dueDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        scheduleType,
        scheduleDays: scheduleType === "custom" ? scheduleDays : scheduleType === "monthly" ? [monthlyDay] : [],
      });

      if (result !== null) {
        if (activeTemplateId) {
          await updateLatestAssignmentTemplate(activeTemplateId);
        }
        onOpenChange(false);
        onAssigned?.();
      }
      return;
    }

    if (!studentId || !user) {
      toast({
        title: "Student not found",
        description: "Please select a student to assign a task.",
        variant: "destructive",
      });
      return;
    }

    setIsAssigningIndividual(true);
    try {
      if (scheduleType === "once") {
        const { error } = await supabase.rpc("assign_task_to_student", {
          p_student_id: studentId,
          p_group_id: groupId,
          p_title: taskTitle.trim(),
          p_description: taskDescription.trim() || null,
          p_assign_date: assignDate,
          p_due_date: dueDate,
          p_start_time: startTime || null,
          p_end_time: endTime || null,
        });

        if (error) throw error;

        if (activeTemplateId) {
          await updateLatestAssignmentTemplate(activeTemplateId);
        }
      } else {
        const [ay, am, ad] = assignDate.split("-").map(Number);
        const startDate = new Date(ay, am - 1, ad);
        const [dy, dm, dd] = dueDate.split("-").map(Number);
        const endDate = new Date(dy, dm - 1, dd);
        const scheduleDaysForAssignment =
          scheduleType === "custom"
            ? scheduleDays
            : scheduleType === "monthly"
            ? [monthlyDay]
            : [];

        const scheduledDates = getScheduledDates(
          startDate,
          endDate,
          scheduleType,
          scheduleDaysForAssignment
        );

        const { data: assignment, error: assignmentError } = await supabase
          .from("assignments")
          .insert({
            assigned_by: user.id,
            group_id: groupId,
            assignee_id: studentId,
            schedule_type: scheduleType,
            schedule_days: scheduleDaysForAssignment,
            start_date: assignDate,
            end_date: dueDate,
            is_active: true,
            template_id: activeTemplateId,
          })
          .select()
          .single();

        if (assignmentError) throw assignmentError;

        const taskInstances = scheduledDates.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          return {
            assignment_id: assignment.id,
            assignee_id: studentId,
            name: taskTitle.trim(),
            description: taskDescription.trim() || null,
            assign_date: dateStr,
            scheduled_date: dateStr,
            start_time: startTime || null,
            scheduled_time: startTime || null,
            end_time: endTime || null,
            status: "pending",
            coach_id: user.id,
          };
        });

        if (taskInstances.length > 0) {
          const { error: instancesError } = await supabase
            .from("task_instances")
            .insert(taskInstances);
          if (instancesError) {
            await supabase.from("assignments").delete().eq("id", assignment.id);
            throw instancesError;
          }
        }
      }

      toast({
        title: "Task Assigned",
        description: `Assigned to ${studentName || "student"}.`,
      });
      onOpenChange(false);
      onAssigned?.();
    } catch (err: unknown) {
      toast({
        title: "Assignment Failed",
        description: err instanceof Error ? err.message : "Could not assign task.",
        variant: "destructive",
      });
    } finally {
      setIsAssigningIndividual(false);
    }
  };

  const isSubmitting = isAssigningGroupTask || isAssigningIndividual;
  const modalTitle =
    mode === "individual"
      ? `Assign Task to ${studentName || "student"}`
      : `Assign Task to ${groupName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {(templatesLoaded || templatesLoading) && (
            <div className="space-y-2">
              <Label>Use Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateChange}
                disabled={templatesLoading || templates.length === 0}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue
                    placeholder={
                      templatesLoading
                        ? "Loading templates..."
                        : templates.length === 0
                        ? "No templates available"
                        : "None"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {templates.length > 0 &&
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {templateSummaryText && (
                <p className="text-xs text-muted-foreground">{templateSummaryText}</p>
              )}
            </div>
          )}

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Enter task title"
              className="bg-card border-border"
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description (optional)</Label>
            <Textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Enter task description"
              rows={2}
              className="bg-card border-border"
            />
          </div>

          {/* Assign Date and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assign-date">Assign Date</Label>
              <Input
                id="assign-date"
                type="date"
                value={assignDate}
                onChange={(e) => {
                  setAssignDate(e.target.value);
                  if (dueDate && dueDate < e.target.value) {
                    setDueDate(e.target.value);
                  }
                }}
                min={format(new Date(), "yyyy-MM-dd")}
                className="bg-card border-border"
              />
              <p className="text-xs text-muted-foreground">When students will see this task</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={assignDate}
                className="bg-card border-border"
              />
              <p className="text-xs text-muted-foreground">When this task is due</p>
            </div>
          </div>

          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>Schedule</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "once", label: "One-time" },
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "custom", label: "Custom days" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={scheduleType === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScheduleType(opt.value as typeof scheduleType)}
                  className={scheduleType === opt.value ? "bg-cta-primary hover:bg-cta-hover" : ""}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            {scheduleType !== "once" && (
              <p className="text-xs text-muted-foreground">
                {scheduleType === "monthly"
                  ? "Task will repeat on the selected day each month"
                  : "Tasks will repeat starting from the Assign Date"}
              </p>
            )}
          </div>

          {/* Monthly day picker */}
          {scheduleType === "monthly" && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Select value={String(monthlyDay)} onValueChange={(v) => setMonthlyDay(Number(v))}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
                    </SelectItem>
                  ))}
                  <SelectItem value="-1">Last day of month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day-of-week selector (only for custom schedule) */}
          {scheduleType === "custom" && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={scheduleDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDayOfWeek(day.value)}
                    className={scheduleDays.includes(day.value) ? "bg-cta-primary hover:bg-cta-hover" : ""}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-day task (only for one-time schedule) */}
          {scheduleType === "once" && (
            <Collapsible open={isMultiDayOpen} onOpenChange={setIsMultiDayOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                >
                  <span>Multi-day task</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isMultiDayOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Use assign date and due date above to define the task span.
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time (optional)</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.label} value={slot.label}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time (optional)</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.label} value={slot.label}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time validation warning */}
          {timeError && <p className="text-sm text-destructive">{timeError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignTask}
            disabled={
              !taskTitle.trim() ||
              !assignDate ||
              !dueDate ||
              isSubmitting ||
              !!timeError ||
              (scheduleType === "custom" && scheduleDays.length === 0)
            }
            className="bg-cta-primary hover:bg-cta-hover text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
