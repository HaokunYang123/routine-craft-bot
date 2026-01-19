import { useState } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InputWithMagicWand } from "./InputWithMagicWand";
import { useAIAssistant, GeneratedTask } from "@/hooks/useAIAssistant";
import { cn } from "@/lib/utils";

interface AIPlanBuilderProps {
  onSavePlan?: (tasks: GeneratedTask[]) => void;
  context?: string;
}

export function AIPlanBuilder({ onSavePlan, context }: AIPlanBuilderProps) {
  const { generatePlan, modifyPlan, loading, error } = useAIAssistant();
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [modificationPrompt, setModificationPrompt] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleGeneratePlan = async (prompt: string) => {
    const result = await generatePlan(prompt, context);
    if (result.success && result.data) {
      setGeneratedTasks(result.data);
    }
  };

  const handleModifyPlan = async () => {
    if (!modificationPrompt.trim() || generatedTasks.length === 0) return;
    setIsModifying(true);
    try {
      const result = await modifyPlan(generatedTasks, modificationPrompt.trim());
      if (result.success && result.data) {
        setGeneratedTasks(result.data);
        setModificationPrompt("");
      }
    } finally {
      setIsModifying(false);
    }
  };

  const handleDeleteTask = (index: number) => {
    setGeneratedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTask = (index: number, field: keyof GeneratedTask, value: any) => {
    setGeneratedTasks((prev) =>
      prev.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    );
  };

  const handleAddTask = () => {
    setGeneratedTasks((prev) => [
      ...prev,
      {
        title: "New Task",
        description: "",
        duration_minutes: 15,
        day_offset: prev.length > 0 ? prev[prev.length - 1].day_offset : 0,
      },
    ]);
    setEditingIndex(generatedTasks.length);
  };

  const handleSave = () => {
    if (onSavePlan && generatedTasks.length > 0) {
      onSavePlan(generatedTasks);
    }
  };

  // Group tasks by day
  const tasksByDay = generatedTasks.reduce((acc, task, index) => {
    const day = task.day_offset;
    if (!acc[day]) acc[day] = [];
    acc[day].push({ ...task, originalIndex: index });
    return acc;
  }, {} as Record<number, (GeneratedTask & { originalIndex: number })[]>);

  return (
    <div className="space-y-6">
      {/* AI Input */}
      <Card className="border-cta-primary/30 bg-cta-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Sparkles className="w-5 h-5 text-cta-primary" />
            AI Plan Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InputWithMagicWand
            placeholder="e.g., 'Create a 5-week beginner plan, 3x per week' or 'Build a 2-week study schedule for math exam'"
            onSubmit={handleGeneratePlan}
            isLoading={loading}
          />
          {error && (
            <p className="mt-2 text-sm text-urgent">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Generated Plan */}
      {generatedTasks.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">
                Generated Plan ({generatedTasks.length} tasks)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTask}
                  className="text-btn-secondary border-btn-secondary/30 hover:bg-btn-secondary/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-cta-primary hover:bg-cta-hover text-white"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Plan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Modification Input */}
            <div className="flex gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <Input
                value={modificationPrompt}
                onChange={(e) => setModificationPrompt(e.target.value)}
                placeholder="Modify: 'Make it easier' or 'Add more rest days' or 'Adjust for knee injury'"
                className="bg-card border-border"
                onKeyDown={(e) => e.key === "Enter" && handleModifyPlan()}
              />
              <Button
                onClick={handleModifyPlan}
                disabled={!modificationPrompt.trim() || isModifying}
                variant="secondary"
                className="shrink-0 bg-btn-secondary hover:bg-btn-secondary-hover text-white"
              >
                {isModifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Tasks by Day */}
            <div className="space-y-4">
              {Object.entries(tasksByDay)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, tasks]) => (
                  <div key={day} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Day {Number(day) + 1}
                      </span>
                    </div>
                    <div className="space-y-2 pl-6">
                      {tasks.map((task) => (
                        <TaskCard
                          key={task.originalIndex}
                          task={task}
                          isEditing={editingIndex === task.originalIndex}
                          onEdit={() =>
                            setEditingIndex(
                              editingIndex === task.originalIndex
                                ? null
                                : task.originalIndex
                            )
                          }
                          onDelete={() => handleDeleteTask(task.originalIndex)}
                          onChange={(field, value) =>
                            handleEditTask(task.originalIndex, field, value)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: GeneratedTask;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onChange: (field: keyof GeneratedTask, value: any) => void;
}

function TaskCard({ task, isEditing, onEdit, onDelete, onChange }: TaskCardProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        isEditing
          ? "border-cta-primary bg-cta-primary/5"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      {isEditing ? (
        <div className="space-y-3">
          <Input
            value={task.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Task title"
            className="font-medium bg-card border-border"
          />
          <Input
            value={task.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Description"
            className="text-sm bg-card border-border"
          />
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={task.duration_minutes}
                onChange={(e) =>
                  onChange("duration_minutes", parseInt(e.target.value) || 0)
                }
                className="w-20 bg-card border-border"
                min={1}
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            <Button size="sm" onClick={onEdit} className="bg-cta-primary hover:bg-cta-hover text-white">
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{task.title}</p>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {task.duration_minutes}m
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-muted-foreground hover:text-urgent"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
