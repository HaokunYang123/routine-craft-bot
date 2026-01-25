import { useState } from "react";
import { useRecurringSchedules, CreateRecurringScheduleInput } from "@/hooks/useRecurringSchedules";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Loader2,
  RepeatIcon,
  Calendar,
  Users,
  Library,
  Trash2,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function RecurringSchedules() {
  const { user } = useAuth();
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule, generateTasks } = useRecurringSchedules();
  const { templates } = useTemplates();

  // For class/student selection
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateRecurringScheduleInput>({
    name: "",
    description: "",
    recurrence_type: "weekly",
    days_of_week: [1, 3, 5], // Mon, Wed, Fri default
    custom_interval_days: 7,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    template_id: "",
    assigned_student_id: "",
    class_session_id: "",
  });

  useEffect(() => {
    if (user) {
      fetchClassesAndStudents();
    }
  }, [user]);

  const fetchClassesAndStudents = async () => {
    if (!user) return;

    // Fetch classes
    const { data: classData } = await supabase
      .from("class_sessions")
      .select("id, name")
      .eq("coach_id", user.id)
      .eq("is_active", true);
    setClasses(classData || []);

    // Fetch students
    const { data: connections } = await supabase
      .from("instructor_students")
      .select("student_id")
      .eq("instructor_id", user.id);

    if (connections && connections.length > 0) {
      const studentIds = connections.map((c: any) => c.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", studentIds);

      setStudents(
        (profiles || []).map((p: any) => ({
          id: p.user_id,
          name: p.display_name || "Student",
        }))
      );
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setCreating(true);
    const result = await createSchedule({
      ...formData,
      template_id: formData.template_id || undefined,
      assigned_student_id: formData.assigned_student_id || undefined,
      class_session_id: formData.class_session_id || undefined,
      end_date: formData.end_date || undefined,
    });

    if (result) {
      setCreateOpen(false);
      resetForm();
    }
    setCreating(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      recurrence_type: "weekly",
      days_of_week: [1, 3, 5],
      custom_interval_days: 7,
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      template_id: "",
      assigned_student_id: "",
      class_session_id: "",
    });
  };

  const toggleDayOfWeek = (day: number) => {
    const current = formData.days_of_week || [];
    const newDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setFormData({ ...formData, days_of_week: newDays });
  };

  const handleToggleActive = async (scheduleId: string, isActive: boolean) => {
    await updateSchedule(scheduleId, { is_active: isActive });
  };

  const handleGenerateTasks = async (scheduleId: string) => {
    await generateTasks(scheduleId);
  };

  const getRecurrenceLabel = (schedule: typeof schedules[0]) => {
    if (schedule.recurrence_type === "daily") {
      return "Daily";
    } else if (schedule.recurrence_type === "weekly") {
      const days = (schedule.days_of_week || [])
        .map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label)
        .filter(Boolean)
        .join(", ");
      return `Weekly (${days})`;
    } else {
      return `Every ${schedule.custom_interval_days} days`;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Routines</h1>
          <p className="text-muted-foreground mt-1">
            Set up recurring tasks that repeat on a schedule
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cta-primary hover:bg-cta-hover text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Recurring Schedule</DialogTitle>
              <DialogDescription>
                Set up a routine that automatically creates tasks on a repeating basis.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label>Schedule Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Warmup Routine"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              {/* Recurrence Type */}
              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(v: "daily" | "weekly" | "custom") =>
                    setFormData({ ...formData, recurrence_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly (select days)</SelectItem>
                    <SelectItem value="custom">Custom interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Weekly Days Selection */}
              {formData.recurrence_type === "weekly" && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={(formData.days_of_week || []).includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className={(formData.days_of_week || []).includes(day.value)
                          ? "bg-cta-primary hover:bg-cta-hover"
                          : ""}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Interval */}
              {formData.recurrence_type === "custom" && (
                <div className="space-y-2">
                  <Label>Repeat every N days</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.custom_interval_days}
                    onChange={(e) =>
                      setFormData({ ...formData, custom_interval_days: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Library className="w-4 h-4" />
                  Use Template (optional)
                </Label>
                <Select
                  value={formData.template_id}
                  onValueChange={(v) => setFormData({ ...formData, template_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No template (manual tasks)</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.tasks?.length || 0} tasks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tasks from this template will be created on each scheduled day.
                </p>
              </div>

              {/* Assignment */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assign To
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={formData.class_session_id}
                    onValueChange={(v) => setFormData({ ...formData, class_session_id: v, assigned_student_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.assigned_student_id}
                    onValueChange={(v) => setFormData({ ...formData, assigned_student_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All students</SelectItem>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={creating || !formData.name.trim()}
                  className="w-full bg-cta-primary hover:bg-cta-hover"
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RepeatIcon className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Recurring Schedules</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create a recurring schedule to automatically generate tasks on a repeating basis.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className={!schedule.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {schedule.name}
                      {!schedule.is_active && (
                        <Badge variant="secondary" className="text-xs">Paused</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <RepeatIcon className="w-3 h-3" />
                      {getRecurrenceLabel(schedule)}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={schedule.is_active ?? false}
                    onCheckedChange={(checked) => handleToggleActive(schedule.id, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {schedule.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {schedule.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(schedule.start_date), "MMM d, yyyy")}
                    {schedule.end_date && ` - ${format(new Date(schedule.end_date), "MMM d")}`}
                  </Badge>

                  {schedule.template_name && (
                    <Badge variant="secondary" className="gap-1">
                      <Library className="w-3 h-3" />
                      {schedule.template_name}
                    </Badge>
                  )}

                  {schedule.student_name && (
                    <Badge variant="secondary" className="gap-1">
                      <Users className="w-3 h-3" />
                      {schedule.student_name}
                    </Badge>
                  )}

                  {schedule.class_name && (
                    <Badge variant="secondary" className="gap-1">
                      <Users className="w-3 h-3" />
                      {schedule.class_name}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateTasks(schedule.id)}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Generate Tasks
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the recurring schedule "{schedule.name}".
                          Existing tasks will not be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSchedule(schedule.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
