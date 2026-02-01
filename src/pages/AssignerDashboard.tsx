import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAssignments } from "@/hooks/useAssignments";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  Loader2,
  Send,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { handleError } from "@/lib/error";
import { generateTimeSlots } from "@/lib/utils";

interface StudentStats {
  id: string;
  name: string;
  completedToday: number;
  totalToday: number;
  completionRate: number;
  streak: number;
  status: "on-track" | "behind" | "inactive";
  lastActive?: Date;
}

interface OverviewStats {
  totalStudents: number;
  tasksToday: number;
  completedToday: number;
  completionRate: number;
  onTrack: number;
  behind: number;
  inactive: number;
}

interface Group {
  id: string;
  name: string;
}

// Pre-generate time slots for performance
const TIME_SLOTS = generateTimeSlots();

// Days of week for custom schedule selection
const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function AssignerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { assignGroupTask, isAssigningGroupTask } = useAssignments();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  // Assign task dialog state
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [assignDate, setAssignDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [scheduleType, setScheduleType] = useState<"once" | "daily" | "weekly" | "monthly" | "custom">("once");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [isMultiDayOpen, setIsMultiDayOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchGroups();
    }
  }, [user]);

  // Reset derived state when schedule type changes
  useEffect(() => {
    if (scheduleType !== "once") {
      setIsMultiDayOpen(false);
      setEndDate(""); // Clear end date when recurring
    }
    if (scheduleType !== "custom") {
      setScheduleDays([]);
    }
    if (scheduleType !== "monthly") {
      setMonthlyDay(1);
    }
  }, [scheduleType]);

  // Helper to convert "HH:MM AM/PM" to 24-hour minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    const match = timeStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return -1;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Validate that end time is after start time
  const isTimeRangeValid = (): boolean => {
    if (!startTime || !endTime) return true; // No validation if times not set
    return timeToMinutes(endTime) > timeToMinutes(startTime);
  };

  // Toggle day of week selection for custom schedule
  const toggleDayOfWeek = (day: number) => {
    setScheduleDays(current =>
      current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  };

  const fetchGroups = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("created_by", user.id)
        .order("name");

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      handleError(error, { component: "AssignerDashboard", action: "fetch groups", silent: true });
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date();

      // Fetch students connected to this coach
      const { data: connections } = await supabase
        .from("instructor_students")
        .select("student_id")
        .eq("instructor_id", user.id);

      if (!connections || connections.length === 0) {
        setStudents([]);
        setStats({
          totalStudents: 0,
          tasksToday: 0,
          completedToday: 0,
          completionRate: 0,
          onTrack: 0,
          behind: 0,
          inactive: 0,
        });
        setLoading(false);
        return;
      }

      const studentIds = connections.map((c) => c.student_id);

      // Fetch student profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", studentIds);

      // Fetch task instances for today (use task_instances, not tasks!)
      const todayStr = format(today, "yyyy-MM-dd");
      const { data: taskInstances } = await supabase
        .from("task_instances")
        .select("id, assignee_id, status")
        .in("assignee_id", studentIds)
        .eq("scheduled_date", todayStr);

      // Calculate stats per student
      const studentStatsMap: Record<string, StudentStats> = {};

      for (const profile of profiles || []) {
        const studentTasks = (taskInstances || []).filter(
          (t) => t.assignee_id === profile.user_id
        );
        const completed = studentTasks.filter((t) => t.status === "completed").length;
        const total = studentTasks.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        let status: "on-track" | "behind" | "inactive" = "inactive";
        if (total > 0) {
          status = rate >= 50 ? "on-track" : "behind";
        }

        studentStatsMap[profile.user_id] = {
          id: profile.user_id,
          name: profile.display_name || "Student",
          completedToday: completed,
          totalToday: total,
          completionRate: rate,
          streak: 0, // Calculate separately if needed
          status,
        };
      }

      const studentStatsList = Object.values(studentStatsMap);

      // Calculate overview stats
      const totalTasks = (taskInstances || []).length;
      const completedTasks = (taskInstances || []).filter((t) => t.status === "completed").length;

      setStats({
        totalStudents: studentStatsList.length,
        tasksToday: totalTasks,
        completedToday: completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        onTrack: studentStatsList.filter((s) => s.status === "on-track").length,
        behind: studentStatsList.filter((s) => s.status === "behind").length,
        inactive: studentStatsList.filter((s) => s.status === "inactive").length,
      });

      setStudents(studentStatsList);
    } catch (error) {
      handleError(error, { component: 'AssignerDashboard', action: 'fetch dashboard data' });
    } finally {
      setLoading(false);
    }
  };

  // Reset form to initial state
  const resetAssignForm = () => {
    setSelectedGroupId("");
    setTaskTitle("");
    setTaskDescription("");
    setAssignDate(format(new Date(), "yyyy-MM-dd"));
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate("");
    setScheduleType("once");
    setScheduleDays([]);
    setMonthlyDay(1);
    setIsMultiDayOpen(false);
    setStartTime("");
    setEndTime("");
  };

  const handleAssignTask = async () => {
    if (!selectedGroupId || !taskTitle.trim()) return;

    // Validate time range
    if (!isTimeRangeValid()) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    // For recurring tasks with custom days, need at least one day selected
    if (scheduleType === "custom" && scheduleDays.length === 0) {
      toast({
        title: "No Days Selected",
        description: "Please select at least one day for custom schedule",
        variant: "destructive",
      });
      return;
    }

    const result = await assignGroupTask({
      groupId: selectedGroupId,
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      assignDate: assignDate,  // When student sees task
      dueDate: dueDate,        // When task is due
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      scheduleType: scheduleType,
      scheduleDays: scheduleType === "custom" ? scheduleDays :
                    scheduleType === "monthly" ? [monthlyDay] : [],
    });

    if (result !== null) {
      // Success - close dialog and reset form
      setAssignDialogOpen(false);
      resetAssignForm();
      // Refresh dashboard data
      fetchDashboardData();
    }
  };

  const sendNote = async () => {
    if (!selectedStudent || !noteContent.trim() || !user) return;
    setSendingNote(true);

    try {
      const { error } = await supabase.from("notes").insert({
        from_user_id: user.id,
        to_user_id: selectedStudent.id,
        content: noteContent.trim(),
        visibility: "shared",
      });

      if (error) throw error;

      toast({
        title: "Note Sent",
        description: `Your note has been sent to ${selectedStudent.name}`,
      });

      setNoteDialogOpen(false);
      setNoteContent("");
      setSelectedStudent(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send note",
        variant: "destructive",
      });
    } finally {
      setSendingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Assigner Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track progress and manage your students
          </p>
        </div>
        <Button
          onClick={() => setAssignDialogOpen(true)}
          className="bg-cta-primary hover:bg-cta-hover text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Task
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalStudents || 0}</p>
              </div>
              <Users className="w-10 h-10 text-cta-primary/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Progress</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.completedToday || 0}/{stats?.tasksToday || 0}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-success/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-3xl font-bold text-success">{stats?.onTrack || 0}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-success/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Attention</p>
                <p className="text-3xl font-bold text-destructive">{stats?.behind || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Your Students</CardTitle>
          <CardDescription>
            Today's progress overview for each student
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Students Yet</h3>
              <p className="text-muted-foreground mb-4">
                Students can join using your class code.
              </p>
              <Link to="/dashboard/people">
                <Button className="bg-cta-primary hover:bg-cta-hover text-white">
                  Manage Classes
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        student.status === "on-track"
                          ? "bg-success"
                          : student.status === "behind"
                          ? "bg-destructive"
                          : "bg-muted-foreground"
                      }`}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{student.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress
                          value={student.completionRate}
                          className="h-2 flex-1 max-w-32"
                        />
                        <span className="text-xs text-muted-foreground">
                          {student.completedToday}/{student.totalToday} tasks
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        student.status === "on-track"
                          ? "default"
                          : student.status === "behind"
                          ? "destructive"
                          : "secondary"
                      }
                      className={
                        student.status === "on-track"
                          ? "bg-success text-white"
                          : ""
                      }
                    >
                      {student.status === "on-track"
                        ? "On Track"
                        : student.status === "behind"
                        ? "Behind"
                        : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedStudent(student);
                        setNoteDialogOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dashboard/calendar">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-cta-primary" />
                  <div>
                    <p className="font-medium text-foreground">View Calendar</p>
                    <p className="text-sm text-muted-foreground">See all tasks</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard/templates">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-btn-secondary" />
                  <div>
                    <p className="font-medium text-foreground">Templates</p>
                    <p className="text-sm text-muted-foreground">Create routines</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard/recurring">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-success" />
                  <div>
                    <p className="font-medium text-foreground">Recurring</p>
                    <p className="text-sm text-muted-foreground">Manage schedules</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Send Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Note to {selectedStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write an encouraging message, feedback, or reminder..."
              rows={4}
              className="bg-card border-border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendNote}
              disabled={!noteContent.trim() || sendingNote}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendingNote ? "Sending..." : "Send Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Task to Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Group Selection */}
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No groups available
                    </SelectItem>
                  ) : (
                    groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Task Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title"
                className="bg-card border-border"
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
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
                <Label htmlFor="assignDate">Assign Date</Label>
                <Input
                  id="assignDate"
                  type="date"
                  value={assignDate}
                  onChange={(e) => {
                    setAssignDate(e.target.value);
                    // Auto-adjust due date if now before assign date
                    if (dueDate < e.target.value) {
                      setDueDate(e.target.value);
                    }
                  }}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="bg-card border-border"
                />
                <p className="text-xs text-muted-foreground">
                  When students will see this task
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={assignDate}
                  className="bg-card border-border"
                />
                <p className="text-xs text-muted-foreground">
                  When this task is due
                </p>
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
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={dueDate}
                      className="bg-card border-border"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time (optional)</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time (optional)</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time validation warning */}
            {startTime && endTime && !isTimeRangeValid() && (
              <p className="text-sm text-destructive">
                End time must be after start time
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignTask}
              disabled={
                !selectedGroupId ||
                !taskTitle.trim() ||
                isAssigningGroupTask ||
                (startTime && endTime && !isTimeRangeValid()) ||
                (scheduleType === "custom" && scheduleDays.length === 0)
              }
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              {isAssigningGroupTask ? (
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
    </div>
  );
}
