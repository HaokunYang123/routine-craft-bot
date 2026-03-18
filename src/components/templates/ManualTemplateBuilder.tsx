import { useState } from "react";
import { Plus, Trash2, Clock, Calendar, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishButton } from "@/components/ui/PolishButton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTimeSlots } from "@/lib/utils";

const TIME_SLOTS = generateTimeSlots();
const NO_TIME_VALUE = "none";

type Priority = "low" | "medium" | "high";

export interface ManualTask {
  title: string;
  description: string;
  duration_minutes: number;
  day_offset: number;
  priority?: Priority;
  // TODO: Persist priority once template_tasks gains a priority column.
  start_time?: string;
  end_time?: string;
  sort_order?: number;
}

interface ManualTaskForm extends Omit<ManualTask, "start_time" | "end_time"> {
  start_time: string;
  end_time: string;
}

interface ManualTemplateBuilderProps {
  onSave: (name: string, description: string, tasks: ManualTask[]) => void;
  isSaving?: boolean;
}

const createEmptyTask = (dayOffset = 0): ManualTaskForm => ({
  title: "",
  description: "",
  duration_minutes: 15,
  day_offset: dayOffset,
  priority: "medium",
  start_time: NO_TIME_VALUE,
  end_time: NO_TIME_VALUE,
});

export function ManualTemplateBuilder({ onSave, isSaving }: ManualTemplateBuilderProps) {
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [tasks, setTasks] = useState<ManualTaskForm[]>([createEmptyTask(0)]);

  const addTask = () => {
    setTasks([
      ...tasks,
      createEmptyTask(tasks.length > 0 ? tasks[tasks.length - 1].day_offset : 0),
    ]);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (
    index: number,
    field: keyof ManualTaskForm,
    value: ManualTaskForm[keyof ManualTaskForm]
  ) => {
    setTasks((prevTasks) =>
      prevTasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    );
  };

  const updateTaskDescription = (index: number, value: string) => {
    updateTask(index, "description", value);
  };

  const getTimeSlotValue = (label: string): number | null => {
    const slot = TIME_SLOTS.find((timeSlot) => timeSlot.label === label);
    return slot?.value ?? null;
  };

  const handleStartTimeChange = (index: number, value: string) => {
    const selectedStart = value;
    setTasks((prev) =>
      prev.map((task, i) => {
        if (i !== index) return task;

        const nextTask = { ...task, start_time: selectedStart };
        if (selectedStart === NO_TIME_VALUE) {
          nextTask.end_time = NO_TIME_VALUE;
          return nextTask;
        }

        const selectedStartValue = getTimeSlotValue(selectedStart);
        const currentEndValue = getTimeSlotValue(task.end_time);
        if (
          task.end_time !== NO_TIME_VALUE &&
          selectedStartValue !== null &&
          currentEndValue !== null &&
          currentEndValue <= selectedStartValue
        ) {
          nextTask.end_time = NO_TIME_VALUE;
        }

        return nextTask;
      })
    );
  };

  const handleSave = () => {
    const validTasks = tasks.filter((task) => task.title.trim());
    if (!templateName.trim() || validTasks.length === 0) return;

    const normalizedTasks: ManualTask[] = validTasks.map((task, index) => ({
      title: task.title.trim(),
      description: task.description.trim(),
      duration_minutes: task.duration_minutes,
      day_offset: task.day_offset,
      priority: task.priority ?? "medium",
      start_time: task.start_time === NO_TIME_VALUE ? undefined : task.start_time,
      end_time: task.end_time === NO_TIME_VALUE ? undefined : task.end_time,
      sort_order: index,
    }));

    onSave(templateName.trim(), templateDescription.trim(), normalizedTasks);
  };

  const isValid = templateName.trim() && tasks.some((task) => task.title.trim());

  const tasksByDay = tasks.reduce((acc, task, index) => {
    const day = task.day_offset;
    if (!acc[day]) acc[day] = [];
    acc[day].push({ ...task, index });
    return acc;
  }, {} as Record<number, (ManualTaskForm & { index: number })[]>);

  return (
    <div className="space-y-6">
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
              className="min-h-[44px] bg-card border-border"
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

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">
            Tasks ({tasks.filter((task) => task.title.trim()).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Task {index + 1}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTask(index)}
                  disabled={tasks.length === 1}
                  className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Task Title *</Label>
                <Input
                  value={task.title}
                  onChange={(e) => updateTask(index, "title", e.target.value)}
                  placeholder="Task name"
                  className="min-h-[44px] bg-card border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea
                  value={task.description}
                  onChange={(e) => updateTaskDescription(index, e.target.value)}
                  placeholder="Describe this task..."
                  rows={2}
                  className="bg-card border-border text-sm"
                />
                <PolishButton
                  value={task.description}
                  onChange={(value) => updateTaskDescription(index, value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">Day</Label>
                  <Select
                    value={String(task.day_offset)}
                    onValueChange={(value) => updateTask(index, "day_offset", parseInt(value, 10))}
                  >
                    <SelectTrigger className="min-h-[44px] bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <SelectItem key={day} value={String(day)} className="min-h-[44px]">
                          Day {day + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={task.priority || "medium"}
                    onValueChange={(value) =>
                      updateTask(index, "priority", value as Priority)
                    }
                  >
                    <SelectTrigger className="min-h-[44px] bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="min-h-[44px]">Low</SelectItem>
                      <SelectItem value="medium" className="min-h-[44px]">Medium</SelectItem>
                      <SelectItem value="high" className="min-h-[44px]">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={task.duration_minutes}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      updateTask(
                        index,
                        "duration_minutes",
                        Number.isNaN(parsed) ? 15 : Math.max(parsed, 1)
                      );
                    }}
                    className="min-h-[44px] bg-card border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Start Time (optional)</Label>
                  <Select value={task.start_time} onValueChange={(value) => handleStartTimeChange(index, value)}>
                    <SelectTrigger className="min-h-[44px] bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TIME_VALUE} className="min-h-[44px]">None</SelectItem>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot.label} value={slot.label} className="min-h-[44px]">
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">End Time (optional)</Label>
                  <Select
                    value={task.end_time}
                    onValueChange={(value) => updateTask(index, "end_time", value)}
                    disabled={task.start_time === NO_TIME_VALUE}
                  >
                    <SelectTrigger className="min-h-[44px] bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TIME_VALUE} className="min-h-[44px]">None</SelectItem>
                      {TIME_SLOTS.filter((slot) => {
                        if (task.start_time === NO_TIME_VALUE) return true;
                        const startValue = getTimeSlotValue(task.start_time);
                        return startValue === null ? true : slot.value > startValue;
                      }).map((slot) => (
                        <SelectItem key={slot.label} value={slot.label} className="min-h-[44px]">
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addTask}
            className="min-h-[44px] w-full border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </CardContent>
      </Card>

      {tasks.some((task) => task.title.trim()) && (
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
                {tasks.reduce((sum, task) => sum + (task.duration_minutes || 0), 0)} min total
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                {tasks.filter((task) => task.title.trim()).length} tasks
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSave}
        disabled={!isValid || isSaving}
        className="min-h-[44px] w-full bg-cta-primary hover:bg-cta-hover text-white"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save Template"}
      </Button>
    </div>
  );
}
