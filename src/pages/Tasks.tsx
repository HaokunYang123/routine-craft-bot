import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroups, Group, GroupMember } from "@/hooks/useGroups";
import { useAssignments } from "@/hooks/useAssignments";
import { useToast } from "@/hooks/use-toast";
import { TaskListSkeleton } from "@/components/skeletons/TaskListSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  UserMinus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { handleError } from "@/lib/error";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

interface TemplateTask {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  day_offset: number;
}

interface GroupWithMembers extends Group {
  members: GroupMember[];
  completedToday: number;
  totalToday: number;
}

const SCHEDULE_TYPES = [
  { value: "once", label: "One Time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom Days" },
];

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { groups, loading: groupsLoading, getGroupMembers } = useGroups();
  const { createAssignment, getGroupProgress } = useAssignments();

  const [groupsWithMembers, setGroupsWithMembers] = useState<GroupWithMembers[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Dialog State
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [assignmentType, setAssignmentType] = useState<"template" | "custom">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);

  // Custom Task State
  const [customTasks, setCustomTasks] = useState<Array<{
    name: string;
    description: string;
    duration_minutes: number | null;
    start_date: string | null;
    due_date: string | null;
    scheduled_time: string | null;
  }>>([{ name: "", description: "", duration_minutes: null, start_date: null, due_date: null, scheduled_time: null }]);

  // Generate time slots in 30-minute intervals with AM/PM
  const TIME_SLOTS = (() => {
    const slots: { value: string; label: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? "AM" : "PM";
        const timeValue = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        const timeLabel = `${hour12}:${min.toString().padStart(2, "0")} ${ampm}`;
        slots.push({ value: timeValue, label: timeLabel });
      }
    }
    return slots;
  })();

  // Schedule State
  const [scheduleType, setScheduleType] = useState<"once" | "daily" | "weekly" | "custom">("once");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));

  // AI Enhancement State
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);

  // Remove Member State
  const [memberToRemove, setMemberToRemove] = useState<{ member: GroupMember; groupId: string; groupName: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!groupsLoading && groups.length > 0) {
      loadGroupsWithMembers();
    } else if (!groupsLoading) {
      setLoading(false);
    }
    fetchTemplates();
  }, [groups, groupsLoading]);

  const fetchTemplates = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, description, category")
        .eq("coach_id", user.id)
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      handleError(error, { component: 'Tasks', action: 'fetch templates', silent: true });
    }
  };

  const loadGroupsWithMembers = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      const groupsData = await Promise.all(
        groups.map(async (group) => {
          const members = await getGroupMembers(group.id);
          const progress = await getGroupProgress(group.id, today);

          return {
            ...group,
            members,
            completedToday: progress.completed,
            totalToday: progress.total,
          };
        })
      );

      setGroupsWithMembers(groupsData);
    } catch (error) {
      handleError(error, { component: 'Tasks', action: 'load groups', silent: true });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const openAssignDialog = (group: Group, member?: GroupMember) => {
    setSelectedGroup(group);
    setSelectedMember(member || null);
    setAssignmentType("template");
    setSelectedTemplateId("");
    setTemplateTasks([]);
    setCustomTasks([{ name: "", description: "", duration_minutes: null, start_date: null, due_date: null, scheduled_time: null }]);
    setScheduleType("once");
    setScheduleDays([]);
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(addDays(new Date(), 30), "yyyy-MM-dd"));
    setAssignDialogOpen(true);
  };

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setTemplateTasks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("template_tasks")
        .select("id, title, description, duration_minutes, day_offset")
        .eq("template_id", templateId)
        .order("order_index");

      if (error) throw error;
      setTemplateTasks(data || []);
    } catch (error) {
      handleError(error, { component: 'Tasks', action: 'fetch template tasks', silent: true });
    }
  };

  // Calculate template duration in days based on max day_offset
  const templateDurationDays = templateTasks.length > 0
    ? Math.max(...templateTasks.map(t => t.day_offset || 0)) + 1
    : 0;

  // Calculate the end date for template based on start date and duration
  const getTemplateEndDate = () => {
    if (templateDurationDays === 0) return null;
    const [year, month, day] = startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const end = addDays(start, templateDurationDays - 1);
    return format(end, "MMM d, yyyy");
  };

  const addCustomTask = () => {
    setCustomTasks([...customTasks, { name: "", description: "", duration_minutes: null, start_date: null, due_date: null, scheduled_time: null }]);
  };

  const removeCustomTask = (index: number) => {
    if (customTasks.length > 1) {
      setCustomTasks(customTasks.filter((_, i) => i !== index));
    }
  };

  const updateCustomTask = (index: number, field: string, value: any) => {
    const updated = [...customTasks];
    updated[index] = { ...updated[index], [field]: value };
    setCustomTasks(updated);
  };

  const enhanceWithAI = async (index: number) => {
    const task = customTasks[index];
    if (!task.name.trim()) {
      toast({
        title: "Enter task name first",
        description: "Please enter a task name before enhancing.",
        variant: "destructive",
      });
      return;
    }

    setEnhancingIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          action: "enhance_task",
          payload: {
            taskName: task.name.trim(),
            taskDescription: task.description?.trim() || "",
          },
        },
      });

      // Handle function invocation error
      if (error) {
        throw new Error(error.message || "Failed to connect to AI service");
      }

      // Handle error in response body
      if (data?.error) {
        throw new Error(data.error);
      }

      // Validate result exists and is a string
      if (!data?.result || typeof data.result !== "string") {
        throw new Error("AI returned an unexpected response format");
      }

      // Clean the result (remove quotes if AI added them)
      const cleanedResult = data.result.replace(/^["']|["']$/g, "").trim();

      if (cleanedResult.length === 0) {
        throw new Error("AI returned an empty description");
      }

      updateCustomTask(index, "description", cleanedResult);
      toast({
        title: "Task Enhanced!",
        description: "AI created a kid-friendly description.",
      });
    } catch (error) {
      handleError(error, { component: 'Tasks', action: 'enhance task with AI' });
    } finally {
      setEnhancingIndex(null);
    }
  };

  const toggleScheduleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAssign = async () => {
    console.log("[Tasks] handleAssign called");
    console.log("[Tasks] selectedGroup:", selectedGroup);
    console.log("[Tasks] selectedMember:", selectedMember);
    console.log("[Tasks] assignmentType:", assignmentType);

    if (!selectedGroup) {
      console.log("[Tasks] No selectedGroup, returning early");
      return;
    }

    // For templates, validate that a template is selected
    // The actual tasks will be fetched from template_tasks in createAssignment
    if (assignmentType === "template") {
      if (!selectedTemplateId) {
        toast({
          title: "No Template Selected",
          description: "Please select a template.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // For custom tasks, validate that at least one task has a name
      const validTasks = customTasks.filter((t) => t.name && t.name.trim());
      console.log("[Tasks] Custom tasks validation - validTasks:", validTasks.length);
      if (validTasks.length === 0) {
        toast({
          title: "No Tasks",
          description: "Please add at least one task with a name.",
          variant: "destructive",
        });
        return;
      }
    }

    const customTasksToSend = customTasks
      .filter((t) => t.name && t.name.trim())
      .map((t) => ({
        name: t.name.trim(),
        description: (t.description || "").trim() || undefined,
        duration_minutes: t.duration_minutes || undefined,
        start_date: t.start_date || undefined,
        due_date: t.due_date || undefined,
        scheduled_time: t.scheduled_time || undefined,
        day_offset: 0,
      }));

    console.log("[Tasks] customTasksToSend:", customTasksToSend);

    setSaving(true);
    try {
      // Templates use their built-in day_offset for scheduling
      // Custom tasks use the schedule type selected by user
      const isTemplate = assignmentType === "template";
      const effectiveScheduleType = isTemplate ? "once" : scheduleType;

      const assignmentInput = {
        template_id: isTemplate ? selectedTemplateId : undefined,
        group_id: !selectedMember ? selectedGroup.id : undefined,
        assignee_id: selectedMember?.user_id,
        schedule_type: effectiveScheduleType,
        schedule_days: effectiveScheduleType === "custom" ? scheduleDays : undefined,
        // Templates: use startDate (day_offset handles task scheduling)
        // Custom "once": use dueDate as the scheduled date
        // Custom recurring: use startDate
        start_date: isTemplate ? startDate : (scheduleType === "once" ? dueDate : startDate),
        end_date: !isTemplate && scheduleType !== "once" ? endDate : undefined,
        tasks: !isTemplate ? customTasksToSend : undefined,
      };

      console.log("[Tasks] Calling createAssignment with:", assignmentInput);

      const result = await createAssignment(assignmentInput);

      console.log("[Tasks] createAssignment result:", result);

      if (result) {
        setAssignDialogOpen(false);
        loadGroupsWithMembers();
      }
    } catch (error) {
      handleError(error, { component: 'Tasks', action: 'assign tasks' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemoving(true);

    try {
      // Remove from group_members table using the member's id (which is the group_members row id)
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberToRemove.member.id);

      if (error) throw error;

      // Update local state
      setGroupsWithMembers(prev =>
        prev.map(group => {
          if (group.id === memberToRemove.groupId) {
            return {
              ...group,
              members: group.members.filter(m => m.id !== memberToRemove.member.id),
            };
          }
          return group;
        })
      );

      toast({
        title: "Member Removed",
        description: `${memberToRemove.member.display_name || "Student"} has been removed from ${memberToRemove.groupName}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
      setMemberToRemove(null);
    }
  };

  if (loading || groupsLoading) {
    return (
      <div className="space-y-8 pb-20">
        <div>
          <div className="h-8 w-56 bg-muted animate-pulse rounded" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="space-y-4">
          <TaskListSkeleton />
          <TaskListSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks & Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Assign tasks to groups or individual members
          </p>
        </div>
      </div>

      {/* Groups List */}
      {groupsWithMembers.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No Groups Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create groups from the Dashboard to start assigning tasks
            </p>
            <Button
              onClick={() => window.location.href = "/dashboard"}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupsWithMembers.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const completionRate = group.totalToday > 0
              ? Math.round((group.completedToday / group.totalToday) * 100)
              : 0;

            return (
              <Card
                key={group.id}
                className={cn(
                  "border-l-4 transition-all",
                  isExpanded && "ring-2 ring-primary/20"
                )}
                style={{ borderLeftColor: group.color }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => toggleGroupExpand(group.id)}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${group.color}20` }}
                      >
                        <Users className="w-5 h-5" style={{ color: group.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {group.members.length} members
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openAssignDialog(group)}
                        className="bg-cta-primary hover:bg-cta-hover text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Assign to Group
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleGroupExpand(group.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Progress Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Today's Progress</span>
                      <span className="font-medium">
                        {group.completedToday} / {group.totalToday} tasks
                      </span>
                    </div>
                    <Progress
                      value={completionRate}
                      className="h-2"
                      style={{
                        // @ts-ignore
                        "--progress-foreground": group.color,
                      } as React.CSSProperties}
                    />
                    <div className="text-right text-xs text-muted-foreground">
                      {completionRate}% complete
                    </div>
                  </div>

                  {/* Expanded Member List */}
                  {isExpanded && group.members.length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Members
                      </h4>
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {(member.display_name || "S").charAt(0).toUpperCase()}
                            </div>
                            <p className="font-medium text-sm">
                              {member.display_name || "Student"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignDialog(group, member)}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Assign
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setMemberToRemove({
                                member,
                                groupId: group.id,
                                groupName: group.name
                              })}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && group.members.length === 0 && (
                    <div className="mt-4 pt-4 border-t text-center py-6">
                      <p className="text-muted-foreground text-sm">
                        No members in this group yet
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-cta-primary" />
              Assign Tasks to{" "}
              {selectedMember
                ? selectedMember.display_name || "Member"
                : selectedGroup?.name || "Group"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Assignment Type */}
            <div className="space-y-3">
              <Label>Task Source</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={assignmentType === "template" ? "default" : "outline"}
                  className={cn(
                    "justify-start",
                    assignmentType === "template" &&
                      "bg-cta-primary hover:bg-cta-hover text-white"
                  )}
                  onClick={() => setAssignmentType("template")}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
                <Button
                  type="button"
                  variant={assignmentType === "custom" ? "default" : "outline"}
                  className={cn(
                    "justify-start",
                    assignmentType === "custom" &&
                      "bg-cta-primary hover:bg-cta-hover text-white"
                  )}
                  onClick={() => setAssignmentType("custom")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Custom Tasks
                </Button>
              </div>
            </div>

            {/* Template Selection */}
            {assignmentType === "template" && (
              <div className="space-y-3">
                <Label>Select Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {templateTasks.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Tasks in this template:
                    </p>
                    {templateTasks.map((task, index) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="shrink-0">
                          {index + 1}
                        </Badge>
                        <span>{task.title}</span>
                        {task.duration_minutes && (
                          <span className="text-muted-foreground">
                            ({task.duration_minutes} min)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No templates available. Create templates from the Templates tab.
                  </p>
                )}
              </div>
            )}

            {/* Custom Tasks */}
            {assignmentType === "custom" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Tasks</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomTask}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Task
                  </Button>
                </div>

                {customTasks.map((task, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Task {index + 1}</Label>
                        {customTasks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomTask(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <Input
                        placeholder="Task name"
                        value={task.name}
                        onChange={(e) => updateCustomTask(index, "name", e.target.value)}
                      />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            Description (optional)
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => enhanceWithAI(index)}
                            disabled={enhancingIndex === index || !task.name.trim()}
                            className="h-7 text-xs gap-1 text-cta-primary hover:text-cta-hover"
                          >
                            {enhancingIndex === index ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            Enhance with AI
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Add more details..."
                          value={task.description}
                          onChange={(e) =>
                            updateCustomTask(index, "description", e.target.value)
                          }
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Duration (min)
                          </Label>
                          <Input
                            type="number"
                            placeholder="Duration"
                            value={task.duration_minutes || ""}
                            onChange={(e) =>
                              updateCustomTask(
                                index,
                                "duration_minutes",
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            min="1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Start Date
                          </Label>
                          <Input
                            type="date"
                            value={task.start_date || ""}
                            onChange={(e) =>
                              updateCustomTask(index, "start_date", e.target.value || null)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Due Date
                          </Label>
                          <Input
                            type="date"
                            value={task.due_date || ""}
                            onChange={(e) =>
                              updateCustomTask(index, "due_date", e.target.value || null)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Time
                          </Label>
                          <Select
                            value={task.scheduled_time || ""}
                            onValueChange={(v) => updateCustomTask(index, "scheduled_time", v || null)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {TIME_SLOTS.map((slot) => (
                                <SelectItem key={slot.value} value={slot.value}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Schedule Type - Only show for custom tasks */}
            {assignmentType === "custom" && (
              <div className="space-y-3">
                <Label>Schedule</Label>
                <Select
                  value={scheduleType}
                  onValueChange={(v) => setScheduleType(v as "once" | "daily" | "weekly" | "custom")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Custom Days Selection */}
                {scheduleType === "custom" && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {WEEKDAYS.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={scheduleDays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleScheduleDay(day.value)}
                        className={cn(
                          scheduleDays.includes(day.value) &&
                            "bg-cta-primary hover:bg-cta-hover text-white"
                        )}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Date Range */}
            {assignmentType === "template" ? (
              /* Template: Start Date only + calculated End Date display */
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                {templateDurationDays > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        This {templateDurationDays}-day template will run until{" "}
                        <span className="font-medium text-foreground">{getTemplateEndDate()}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Custom Tasks: Start/Due Date or Start/End Date based on schedule */
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{scheduleType === "once" ? "Due Date" : "End Date"}</Label>
                  <Input
                    type="date"
                    value={scheduleType === "once" ? dueDate : endDate}
                    onChange={(e) => scheduleType === "once"
                      ? setDueDate(e.target.value)
                      : setEndDate(e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={saving}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{memberToRemove?.member.display_name || "this student"}</span> from <span className="font-semibold">{memberToRemove?.groupName}</span>?
              They will no longer have access to group tasks and can rejoin using the join code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
