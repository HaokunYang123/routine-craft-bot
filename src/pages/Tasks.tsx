import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ListTodo, Trash2, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  due_date: string | null;
  person_id: string | null;
  people?: { name: string } | null;
}

interface Person {
  id: string;
  name: string;
}

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [personId, setPersonId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [tasksRes, peopleRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, people(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("people")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name"),
    ]);

    if (tasksRes.data) setTasks(tasksRes.data);
    if (peopleRes.data) setPeople(peopleRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: duration ? parseInt(duration) : null,
      person_id: personId || null,
      due_date: dueDate || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Task created." });
      setTitle("");
      setDescription("");
      setDuration("");
      setPersonId("");
      setDueDate("");
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={2}
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
              {people.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={personId} onValueChange={setPersonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" variant="hero" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Task
              </Button>
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
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
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
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      task.is_completed ? "line-through text-muted-foreground" : "text-foreground"
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
                    {task.people?.name && (
                      <span className="inline-flex items-center text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {task.people.name}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
