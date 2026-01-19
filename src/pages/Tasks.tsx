import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, ListTodo, Trash2, Loader2, Clock, Sparkles, Pencil, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  due_date: string | null;
  assigned_student_id: string | null;
  batch_id: string | null;
  people?: { name: string } | null;
}

interface StudentProfile {
  user_id: string;
  display_name: string;
  email: string;
}

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refineTask, loading: aiLoading } = useAIAssistant();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state (Create)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [assignedStudentId, setAssignedStudentId] = useState<string>("all");
  const [dueDate, setDueDate] = useState("");

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [updateMode, setUpdateMode] = useState<"single" | "all">("single");

  // Form state (Edit) - mirrors create state but for editing
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const handleMagicFix = async (isEdit = false) => {
    const textToRefine = isEdit ? editDescription : description;
    const setText = isEdit ? setEditDescription : setDescription;

    if (!textToRefine.trim()) {
      toast({ title: "Enter text first", description: "Type a task description to refine.", variant: "destructive" });
      return;
    }
    const result = await refineTask(textToRefine);
    if (result.success && result.data) {
      setText(result.data);
      toast({ title: "Magic Fix applied!", description: "Description refined for clarity." });
    } else {
      toast({ title: "Oops!", description: result.error || "Could not refine. Try again.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [tasksRes, studentsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("instructor_students" as any)
          .select("student_id")
          .eq("instructor_id", user!.id)
      ]);

      if (tasksRes.data) {
        setTasks(tasksRes.data as unknown as Task[]);
      }

      if (studentsRes.data && studentsRes.data.length > 0) {
        const studentIds = studentsRes.data.map((r: any) => r.student_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", studentIds);

        if (profiles) {
          setStudents(profiles as StudentProfile[]);
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setSaving(true);
    try {
      const commonData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        duration_minutes: duration ? parseInt(duration) : null,
        due_date: dueDate || null,
      };

      if (assignedStudentId === "all") {
        // BATCH CREATE: "The Stamper"
        const batchId = crypto.randomUUID();
        const tasksToInsert = students.map(student => ({
          ...commonData,
          assigned_student_id: student.user_id,
          batch_id: batchId, // Stamp the batch ID
        }));

        if (tasksToInsert.length === 0) {
          // Fallback if no students: create one unassigned task? 
          // Or just create one unassigned task without batch id (or with it)?
          // Let's create one unassigned task for now.
          await supabase.from("tasks").insert({
            ...commonData,
            assigned_student_id: null,
          });
        } else {
          await supabase.from("tasks").insert(tasksToInsert);
        }

      } else {
        // Single Assignment
        await supabase.from("tasks").insert({
          ...commonData,
          assigned_student_id: assignedStudentId,
        });
      }

      toast({ title: "Success", description: "Task(s) created." });
      setTitle("");
      setDescription("");
      setDuration("");
      setAssignedStudentId("all");
      setDueDate("");
      setCreateDialogOpen(false);
      fetchData();

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDuration(task.duration_minutes?.toString() || "");
    setEditDueDate(task.due_date || "");
    setUpdateMode("single"); // Default to single
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSaving(true);

    try {
      const updates = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        duration_minutes: editDuration ? parseInt(editDuration) : null,
        due_date: editDueDate || null,
      };

      // Call Edge Function for Batch Updates ("The Batch Updater")
      const { data, error } = await supabase.functions.invoke('update_task_batch', {
        body: {
          taskId: editingTask.id,
          updates: updates,
          mode: updateMode
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${data.count} task(s).`
      });
      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task: Task) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    // Note: Deleting is tricky with batches. For now, delete only single.
    // If user wants to delete batch, that's another feature request or we can add it later.
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track all your tasks.
          </p>
        </div>

        {/* CREATE TASK DIALOG */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMagicFix(false)}
                    disabled={aiLoading || !description.trim()}
                    className="h-7 text-xs gap-1 text-primary hover:text-primary"
                  >
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Magic Fix
                  </Button>
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="15"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={assignedStudentId} onValueChange={setAssignedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="font-bold">All Students (Batch)</span>
                    </SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.user_id} value={student.user_id}>
                        {student.display_name || student.email || "Student"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {students.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No students connected yet. Use the "People" tab to invite students.
                  </p>
                )}
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT TASK DIALOG */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-description">Description</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMagicFix(true)}
                    disabled={aiLoading || !editDescription.trim()}
                    className="h-7 text-xs gap-1 text-primary hover:text-primary"
                  >
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Magic Fix
                  </Button>
                </div>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duration (min)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* THE SAFETY SWITCH: BATCH UPDATE TOGGLE */}
              {editingTask?.batch_id && (
                <div className="p-4 bg-secondary/30 border border-border rounded-lg space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Batch Update
                  </Label>
                  <RadioGroup value={updateMode} onValueChange={(val: "single" | "all") => setUpdateMode(val)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="r1" />
                      <Label htmlFor="r1" className="font-normal cursor-pointer">
                        Update <span className="font-bold">only this student's</span> task
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="r2" />
                      <Label htmlFor="r2" className="font-normal cursor-pointer">
                        Update for <span className="font-bold">all assigned students</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    This task was assigned to a group. You can update everyone's task at once.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" variant="hero" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      {tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListTodo className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-1">No tasks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create tasks manually or use the AI assistant.
            </p>
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const assignedStudent = students.find(s => s.user_id === task.assigned_student_id);
            return (
              <Card
                key={task.id}
                className={`transition-all ${task.is_completed ? "opacity-60" : ""}`}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={() => toggleComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0" onClick={() => openEditDialog(task)} role="button">
                    <p
                      className={`font-medium ${task.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {/* Show assigned student badge */}
                      {task.assigned_student_id && assignedStudent ? (
                        <span className="inline-flex items-center text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          <User className="w-3 h-3 mr-1" />
                          {assignedStudent.display_name || "Student"}
                        </span>
                      ) : task.assigned_student_id ? (
                        <span className="inline-flex items-center text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                          Student Left
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                          Unassigned
                        </span>
                      )}

                      {task.batch_id && (
                        <span className="inline-flex items-center text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                          <Users className="w-3 h-3 mr-1" />
                          Group Task
                        </span>
                      )}

                      {task.duration_minutes && (
                        <span className="inline-flex items-center text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.duration_minutes} min
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary shrink-0"
                      onClick={() => openEditDialog(task)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

