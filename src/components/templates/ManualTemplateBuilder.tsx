import { useState } from "react";
import {
  Plus,
  Trash2,
  Clock,
  Calendar,
  Save,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ManualTask {
  title: string;
  description: string;
  duration_minutes: number;
  day_offset: number;
  time?: string;
  priority?: "low" | "medium" | "high";
}

interface ManualTemplateBuilderProps {
  onSave: (name: string, description: string, tasks: ManualTask[]) => void;
  isSaving?: boolean;
}

export function ManualTemplateBuilder({ onSave, isSaving }: ManualTemplateBuilderProps) {
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [tasks, setTasks] = useState<ManualTask[]>([
    { title: "", description: "", duration_minutes: 15, day_offset: 0, priority: "medium" },
  ]);

  const addTask = () => {
    setTasks([
      ...tasks,
      {
        title: "",
        description: "",
        duration_minutes: 15,
        day_offset: tasks.length > 0 ? tasks[tasks.length - 1].day_offset : 0,
        priority: "medium",
      },
    ]);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index: number, field: keyof ManualTask, value: any) => {
    setTasks(
      tasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    );
  };

  const handleSave = () => {
    const validTasks = tasks.filter((t) => t.title.trim());
    if (!templateName.trim() || validTasks.length === 0) return;
    onSave(templateName.trim(), templateDescription.trim(), validTasks);
  };

  const isValid = templateName.trim() && tasks.some((t) => t.title.trim());

  // Group tasks by day for display
  const tasksByDay = tasks.reduce((acc, task, index) => {
    const day = task.day_offset;
    if (!acc[day]) acc[day] = [];
    acc[day].push({ ...task, index });
    return acc;
  }, {} as Record<number, (ManualTask & { index: number })[]>);

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Morning Workout Routine"
              className="bg-card border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={2}
              className="bg-card border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-foreground">
              Tasks ({tasks.filter((t) => t.title.trim()).length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={addTask}
              className="text-btn-secondary border-btn-secondary/30 hover:bg-btn-secondary/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-border bg-card/50 space-y-3"
            >
              <div className="flex items-start gap-3">
                <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab" />
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Task Title *</Label>
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(index, "title", e.target.value)}
                        placeholder="Task name"
                        className="bg-card border-border"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Day</Label>
                        <Select
                          value={String(task.day_offset)}
                          onValueChange={(v) => updateTask(index, "day_offset", parseInt(v))}
                        >
                          <SelectTrigger className="bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                              <SelectItem key={d} value={String(d)}>
                                Day {d + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={task.duration_minutes}
                            onChange={(e) =>
                              updateTask(index, "duration_minutes", parseInt(e.target.value) || 15)
                            }
                            min={1}
                            className="bg-card border-border"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Priority</Label>
                        <Select
                          value={task.priority || "medium"}
                          onValueChange={(v) => updateTask(index, "priority", v)}
                        >
                          <SelectTrigger className="bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description (optional)</Label>
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTask(index, "description", e.target.value)}
                      placeholder="Describe this task..."
                      rows={2}
                      className="bg-card border-border text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTask(index)}
                  disabled={tasks.length === 1}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addTask}
            className="w-full border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Task
          </Button>
        </CardContent>
      </Card>

      {/* Preview Summary */}
      {tasks.some((t) => t.title.trim()) && (
        <Card className="border-border bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {Object.keys(tasksByDay).length} day(s)
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {tasks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0)} min total
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                {tasks.filter((t) => t.title.trim()).length} tasks
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={!isValid || isSaving}
        className="w-full bg-cta-primary hover:bg-cta-hover text-white"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save Template"}
      </Button>
    </div>
  );
}
