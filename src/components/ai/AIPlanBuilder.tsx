import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishButton } from "@/components/ui/PolishButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimitCooldown } from "@/hooks/useRateLimitCooldown";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLogger";
import { RateLimitError, callGemini } from "@/lib/gemini";
import { queryKeys } from "@/lib/queries/keys";

interface LegacyGeneratedTask {
  title: string;
  description: string;
  duration_minutes: number;
  day_offset: number;
}

interface AIPlanBuilderProps {
  onSavePlan?: (tasks: LegacyGeneratedTask[]) => void;
  context?: string;
  onUnsavedTemplateChange?: (hasUnsavedTemplate: boolean) => void;
}

type BuilderState = "input" | "generating" | "preview" | "saving";

interface TemplateTaskDraft {
  id: string;
  title: string;
  description: string;
  day_offset: number;
  duration_minutes: number;
  start_time: string;
  end_time: string;
}

interface TemplateDraft {
  name: string;
  description: string;
  duration_weeks: number;
  frequency_per_week: number;
  tasks: TemplateTaskDraft[];
}

interface TemplateModelResponse {
  name?: unknown;
  description?: unknown;
  duration_weeks?: unknown;
  frequency_per_week?: unknown;
  tasks?: unknown;
}

interface GroupedWeek {
  weekNumber: number;
  days: Array<{
    dayNumber: number;
    tasks: TemplateTaskDraft[];
  }>;
}

interface PersistedTask {
  title: string;
  description: string | null;
  day_offset: number;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_AGE_GROUP = "Middle School";
const DEFAULT_SKILL_LEVEL = "Beginner";
const DEFAULT_DURATION = "4";
const AGE_GROUP_OPTIONS = ["Elementary", "Middle School", "High School", "Adult"] as const;
const SKILL_LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"] as const;
let generatedTaskCounter = 0;

const createTaskId = (): string => {
  generatedTaskCounter += 1;
  return `ai-task-${Date.now()}-${generatedTaskCounter}`;
};

const parseNonNegativeInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

const parseString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeDraftTime = (value: unknown): string => {
  const parsed = parseString(value);
  if (!parsed) return "";
  return TIME_PATTERN.test(parsed) ? parsed : "";
};

const normalizeSaveTime = (value: string): string | null => {
  const parsed = value.trim();
  if (!parsed) return null;
  return TIME_PATTERN.test(parsed) ? parsed : null;
};

const estimateFrequency = (tasks: Array<{ day_offset: number }>, durationWeeks: number): number => {
  if (tasks.length === 0) return 1;
  const uniqueOffsets = new Set(tasks.map((task) => task.day_offset));
  const estimated = Math.round(uniqueOffsets.size / Math.max(durationWeeks, 1));
  return Math.max(1, estimated);
};

const normalizeTemplateResponse = (data: TemplateModelResponse): TemplateDraft | null => {
  const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];

  const tasks = rawTasks
    .map((task, index) => {
      if (typeof task !== "object" || task === null) return null;
      const parsed = task as Record<string, unknown>;
      const title = parseString(parsed.title);
      if (!title) return null;

      return {
        id: createTaskId(),
        title,
        description: parseString(parsed.description),
        day_offset: parseNonNegativeInt(parsed.day_offset, index),
        duration_minutes: parsePositiveInt(parsed.duration_minutes, 30),
        start_time: normalizeDraftTime(parsed.start_time),
        end_time: normalizeDraftTime(parsed.end_time),
      } as TemplateTaskDraft;
    })
    .filter((task): task is TemplateTaskDraft => task !== null)
    .sort((a, b) => a.day_offset - b.day_offset);

  if (tasks.length === 0) return null;

  const maxOffset = Math.max(...tasks.map((task) => task.day_offset), 0);
  const derivedWeeks = Math.max(1, Math.ceil((maxOffset + 1) / 7));

  return {
    name: parseString(data.name) || "AI Generated Plan",
    description: parseString(data.description) || "Plan generated with AI.",
    duration_weeks: parsePositiveInt(data.duration_weeks, derivedWeeks),
    frequency_per_week: parsePositiveInt(
      data.frequency_per_week,
      estimateFrequency(tasks, derivedWeeks),
    ),
    tasks,
  };
};

const buildWeeksPayload = (tasks: PersistedTask[]) => {
  const weekMap = new Map<number, Map<number, PersistedTask[]>>();

  tasks.forEach((task) => {
    const weekNumber = Math.floor(task.day_offset / 7) + 1;
    const dayNumber = (task.day_offset % 7) + 1;

    const dayMap = weekMap.get(weekNumber) ?? new Map<number, PersistedTask[]>();
    const dayTasks = dayMap.get(dayNumber) ?? [];
    dayTasks.push(task);
    dayMap.set(dayNumber, dayTasks);
    weekMap.set(weekNumber, dayMap);
  });

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, dayMap]) => ({
      week: weekNumber,
      days: Array.from(dayMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([dayNumber, dayTasks]) => ({
          day: dayNumber,
          tasks: dayTasks,
        })),
    }));
};

export function AIPlanBuilder(props: AIPlanBuilderProps) {
  const { onUnsavedTemplateChange } = props;

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [builderState, setBuilderState] = useState<BuilderState>("input");
  const [subject, setSubject] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>(DEFAULT_AGE_GROUP);
  const [skillLevel, setSkillLevel] = useState<string>(DEFAULT_SKILL_LEVEL);
  const [duration, setDuration] = useState<string>(DEFAULT_DURATION);
  const [focusAreaInput, setFocusAreaInput] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedTemplate, setHasUnsavedTemplate] = useState(false);
  const { isCoolingDown, startCooldown, cooldownLabel } = useRateLimitCooldown();

  const isGenerating = builderState === "generating";
  const isSaving = builderState === "saving";
  const isPreviewVisible = builderState === "preview" || builderState === "saving";

  useEffect(() => {
    onUnsavedTemplateChange?.(hasUnsavedTemplate);
  }, [hasUnsavedTemplate, onUnsavedTemplateChange]);

  useEffect(() => {
    return () => {
      onUnsavedTemplateChange?.(false);
    };
  }, [onUnsavedTemplateChange]);

  useEffect(() => {
    if (!hasUnsavedTemplate) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedTemplate]);

  const groupedWeeks = useMemo<GroupedWeek[]>(() => {
    if (!templateDraft) return [];

    const weekMap = new Map<number, Map<number, TemplateTaskDraft[]>>();
    templateDraft.tasks
      .slice()
      .sort((a, b) => a.day_offset - b.day_offset)
      .forEach((task) => {
        const weekNumber = Math.floor(task.day_offset / 7) + 1;
        const dayNumber = (task.day_offset % 7) + 1;
        const dayMap = weekMap.get(weekNumber) ?? new Map<number, TemplateTaskDraft[]>();
        const tasksForDay = dayMap.get(dayNumber) ?? [];
        tasksForDay.push(task);
        dayMap.set(dayNumber, tasksForDay);
        weekMap.set(weekNumber, dayMap);
      });

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNumber, dayMap]) => ({
        weekNumber,
        days: Array.from(dayMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([dayNumber, tasks]) => ({
            dayNumber,
            tasks,
          })),
      }));
  }, [templateDraft]);

  const resetToInput = () => {
    setBuilderState("input");
    setSubject("");
    setAgeGroup(DEFAULT_AGE_GROUP);
    setSkillLevel(DEFAULT_SKILL_LEVEL);
    setDuration(DEFAULT_DURATION);
    setFocusAreaInput("");
    setFocusAreas([]);
    setTemplateDraft(null);
    setGenerationError(null);
    setSaveError(null);
    setHasUnsavedTemplate(false);
  };

  const handleTryAgain = () => {
    setBuilderState("input");
    setGenerationError(null);
    setSaveError(null);
  };

  const commitFocusAreaTokens = (rawValue: string) => {
    const tokens = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (tokens.length === 0) {
      return;
    }

    setFocusAreas((prev) => {
      const next = [...prev];
      const existing = new Set(prev.map((item) => item.toLowerCase()));
      tokens.forEach((token) => {
        if (existing.has(token.toLowerCase()) || next.length >= 12) return;
        next.push(token);
        existing.add(token.toLowerCase());
      });
      return next;
    });
  };

  const handleFocusAreaKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (!focusAreaInput.trim()) return;
      commitFocusAreaTokens(focusAreaInput);
      setFocusAreaInput("");
      return;
    }

    if (event.key === "Backspace" && !focusAreaInput.trim()) {
      setFocusAreas((prev) => prev.slice(0, -1));
    }
  };

  const handleFocusAreaBlur = () => {
    if (!focusAreaInput.trim()) return;
    commitFocusAreaTokens(focusAreaInput);
    setFocusAreaInput("");
  };

  const removeFocusArea = (value: string) => {
    setFocusAreas((prev) => prev.filter((item) => item !== value));
  };

  const handleGeneratePlan = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setGenerationError("Subject/Topic is required.");
      return;
    }

    setBuilderState("generating");
    setGenerationError(null);
    setSaveError(null);

    try {
      const result = await callGemini<TemplateModelResponse>({
        action: "generate_plan",
        payload: {
          subject: trimmedSubject,
          ageGroup,
          skillLevel,
          focusAreas,
          duration: Number.parseInt(duration, 10) || Number.parseInt(DEFAULT_DURATION, 10),
        },
      });

      if (!result.success || !result.data) {
        setGenerationError(result.error || "Failed to generate a plan.");
        setBuilderState("input");
        return;
      }

      const normalizedTemplate = normalizeTemplateResponse(result.data);
      if (!normalizedTemplate) {
        setGenerationError("AI response was missing required plan fields.");
        setBuilderState("input");
        return;
      }

      setTemplateDraft(normalizedTemplate);
      setHasUnsavedTemplate(true);
      setBuilderState("preview");
    } catch (error) {
      if (error instanceof RateLimitError) {
        startCooldown(error.retryAfterSeconds);
        setBuilderState("input");
        return;
      }

      setGenerationError(error instanceof Error ? error.message : "Failed to generate a plan.");
      setBuilderState("input");
    }
  };

  const handleTemplateFieldChange = (field: "name" | "description", value: string) => {
    setTemplateDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleTaskTextChange = (
    taskId: string,
    field: "title" | "description" | "start_time" | "end_time",
    value: string,
  ) => {
    setTemplateDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId ? { ...task, [field]: value } : task,
        ),
      };
    });
  };

  const handleTaskDescriptionChange = (taskId: string, value: string) => {
    handleTaskTextChange(taskId, "description", value);
  };

  const handleTaskDayChange = (taskId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const dayOffset = Number.isNaN(parsed) ? 0 : Math.max(0, parsed - 1);
    setTemplateDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId ? { ...task, day_offset: dayOffset } : task,
        ),
      };
    });
  };

  const handleTaskDurationChange = (taskId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const duration = Number.isNaN(parsed) ? 30 : Math.max(1, parsed);
    setTemplateDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId ? { ...task, duration_minutes: duration } : task,
        ),
      };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTemplateDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter((task) => task.id !== taskId),
      };
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateDraft) return;

    if (!user) {
      setSaveError("You must be logged in to save templates.");
      return;
    }

    const templateName = templateDraft.name.trim();
    if (!templateName) {
      setSaveError("Template name is required.");
      return;
    }

    const persistedTasks = templateDraft.tasks
      .map((task, index) => ({
        title: task.title.trim(),
        description: task.description.trim() || null,
        day_offset: Math.max(0, Math.floor(task.day_offset)),
        duration_minutes: Math.max(1, Math.floor(task.duration_minutes)),
        start_time: normalizeSaveTime(task.start_time),
        end_time: normalizeSaveTime(task.end_time),
        sort_index: index,
      }))
      .filter((task) => task.title.length > 0)
      .sort((a, b) => a.day_offset - b.day_offset || a.sort_index - b.sort_index);

    if (persistedTasks.length === 0) {
      setSaveError("At least one task with a title is required.");
      return;
    }

    const maxOffset = Math.max(...persistedTasks.map((task) => task.day_offset), 0);
    const durationWeeks = Math.max(
      1,
      parsePositiveInt(templateDraft.duration_weeks, Math.ceil((maxOffset + 1) / 7)),
    );
    const frequencyPerWeek = Math.max(
      1,
      parsePositiveInt(
        templateDraft.frequency_per_week,
        estimateFrequency(persistedTasks, durationWeeks),
      ),
    );

    setBuilderState("saving");
    setSaveError(null);

    let createdTemplateId: string | null = null;
    let tasksInserted = false;

    try {
      const { data: insertedTemplate, error: templateError } = await supabase
        .from("templates")
        .insert({
          coach_id: user.id,
          name: templateName,
          description: templateDraft.description.trim() || null,
          duration_weeks: durationWeeks,
          frequency_per_week: frequencyPerWeek,
          is_ai_generated: true,
          weeks: buildWeeksPayload(
            persistedTasks.map((task) => ({
              title: task.title,
              description: task.description,
              day_offset: task.day_offset,
              duration_minutes: task.duration_minutes,
              start_time: task.start_time,
              end_time: task.end_time,
            })),
          ),
        })
        .select("id")
        .single();

      if (templateError || !insertedTemplate) {
        throw new Error(templateError?.message || "Failed to create template.");
      }

      createdTemplateId = insertedTemplate.id;

      const { error: tasksError } = await supabase.from("template_tasks").insert(
        persistedTasks.map((task, index) => ({
          template_id: insertedTemplate.id,
          title: task.title,
          description: task.description,
          day_offset: task.day_offset,
          duration_minutes: task.duration_minutes,
          start_time: task.start_time,
          end_time: task.end_time,
          sort_order: index,
        })),
      );

      if (tasksError) {
        throw new Error(tasksError.message || "Failed to create template tasks.");
      }

      tasksInserted = true;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.templates.list(user.id),
      });

      toast({
        title: "Template saved!",
      });
      logActivity("template_created", { template_id: insertedTemplate.id, source: "ai_plan" });

      resetToInput();
    } catch (error) {
      if (createdTemplateId && !tasksInserted) {
        await supabase.from("templates").delete().eq("id", createdTemplateId);
      }

      if (error instanceof Error) {
        setSaveError(error.message);
      } else {
        setSaveError("Failed to save template.");
      }

      setBuilderState("preview");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-cta-primary/30 bg-cta-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Sparkles className="h-5 w-5 text-cta-primary" />
            AI Plan Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-plan-subject">Subject/Topic</Label>
            <Input
              id="ai-plan-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={isGenerating || isCoolingDown}
              placeholder="e.g. Basketball fundamentals"
              className="min-h-[44px] bg-card border-border"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ai-plan-age-group">Age Group</Label>
              <Select value={ageGroup} onValueChange={setAgeGroup} disabled={isGenerating || isCoolingDown}>
                <SelectTrigger id="ai-plan-age-group" className="min-h-[44px] bg-card border-border">
                  <SelectValue placeholder="Select age group" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUP_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className="min-h-[44px]">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-plan-skill-level">Skill Level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel} disabled={isGenerating || isCoolingDown}>
                <SelectTrigger id="ai-plan-skill-level" className="min-h-[44px] bg-card border-border">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className="min-h-[44px]">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-plan-duration">Duration (weeks)</Label>
              <Select value={duration} onValueChange={setDuration} disabled={isGenerating || isCoolingDown}>
                <SelectTrigger id="ai-plan-duration" className="min-h-[44px] bg-card border-border">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, index) => {
                    const value = String(index + 1);
                    return (
                      <SelectItem key={value} value={value} className="min-h-[44px]">
                        {value}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-plan-focus-areas">Focus Areas (optional)</Label>
            <Input
              id="ai-plan-focus-areas"
              value={focusAreaInput}
              onChange={(event) => setFocusAreaInput(event.target.value)}
              onKeyDown={handleFocusAreaKeyDown}
              onBlur={handleFocusAreaBlur}
              disabled={isGenerating || isCoolingDown}
              placeholder="Type a focus area, then press Enter or comma"
              className="min-h-[44px] bg-card border-border"
            />
            {focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((focus) => (
                  <Badge key={focus} variant="secondary" className="flex items-center gap-1">
                    <span>{focus}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${focus}`}
                      onClick={() => removeFocusArea(focus)}
                      disabled={isGenerating || isCoolingDown}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 hover:bg-black/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleGeneratePlan}
            disabled={!subject.trim() || isGenerating || isCoolingDown}
            className="min-h-[44px] bg-cta-primary hover:bg-cta-hover text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : isCoolingDown ? (
              "Cooldown active"
            ) : (
              "Generate Plan"
            )}
          </Button>

          {isCoolingDown && (
            <p className="text-sm text-muted-foreground">
              Limit reached. Try again in {cooldownLabel}.
            </p>
          )}

          {generationError && builderState === "input" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{generationError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTryAgain}
                className="mt-3 min-h-[44px] border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {templateDraft && isPreviewVisible && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">Template Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ai-template-name">Template Name</Label>
                <Input
                  id="ai-template-name"
                  value={templateDraft.name}
                  onChange={(event) =>
                    handleTemplateFieldChange("name", event.target.value)
                  }
                  disabled={isSaving}
                  className="min-h-[44px] bg-card border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-template-description">Description</Label>
                <Textarea
                  id="ai-template-description"
                  value={templateDraft.description}
                  onChange={(event) =>
                    handleTemplateFieldChange("description", event.target.value)
                  }
                  disabled={isSaving}
                  className="min-h-[90px] bg-card border-border"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {templateDraft.duration_weeks} week plan • {templateDraft.frequency_per_week} days per week
              </p>
            </div>

            <div className="space-y-4">
              {groupedWeeks.map((week) => (
                <div key={week.weekNumber} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Week {week.weekNumber}
                  </h3>
                  {week.days.map((day) => (
                    <div key={`${week.weekNumber}-${day.dayNumber}`} className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Day {day.dayNumber}
                      </p>
                      <div className="space-y-3">
                        {day.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-lg border border-border bg-card p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">Task</p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={isSaving}
                                className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
                                aria-label="Delete task"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`task-title-${task.id}`}>Title</Label>
                              <Input
                                id={`task-title-${task.id}`}
                                value={task.title}
                                onChange={(event) =>
                                  handleTaskTextChange(task.id, "title", event.target.value)
                                }
                                disabled={isSaving}
                                className="min-h-[44px] bg-card border-border"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`task-description-${task.id}`}>Description</Label>
                              <Textarea
                                id={`task-description-${task.id}`}
                                value={task.description}
                                onChange={(event) =>
                                  handleTaskDescriptionChange(task.id, event.target.value)
                                }
                                disabled={isSaving}
                                className="min-h-[80px] bg-card border-border"
                              />
                              <PolishButton
                                value={task.description}
                                onChange={(value) => handleTaskDescriptionChange(task.id, value)}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                              <div className="space-y-2">
                                <Label htmlFor={`task-day-${task.id}`}>Day #</Label>
                                <Input
                                  id={`task-day-${task.id}`}
                                  type="number"
                                  min={1}
                                  value={task.day_offset + 1}
                                  onChange={(event) =>
                                    handleTaskDayChange(task.id, event.target.value)
                                  }
                                  disabled={isSaving}
                                  className="min-h-[44px] bg-card border-border"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`task-duration-${task.id}`}>Duration (min)</Label>
                                <Input
                                  id={`task-duration-${task.id}`}
                                  type="number"
                                  min={1}
                                  value={task.duration_minutes}
                                  onChange={(event) =>
                                    handleTaskDurationChange(task.id, event.target.value)
                                  }
                                  disabled={isSaving}
                                  className="min-h-[44px] bg-card border-border"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`task-start-${task.id}`}>Start Time</Label>
                                <Input
                                  id={`task-start-${task.id}`}
                                  value={task.start_time}
                                  onChange={(event) =>
                                    handleTaskTextChange(
                                      task.id,
                                      "start_time",
                                      event.target.value,
                                    )
                                  }
                                  disabled={isSaving}
                                  placeholder="HH:MM"
                                  className="min-h-[44px] bg-card border-border"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`task-end-${task.id}`}>End Time</Label>
                                <Input
                                  id={`task-end-${task.id}`}
                                  value={task.end_time}
                                  onChange={(event) =>
                                    handleTaskTextChange(task.id, "end_time", event.target.value)
                                  }
                                  disabled={isSaving}
                                  placeholder="HH:MM"
                                  className="min-h-[44px] bg-card border-border"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {saveError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{saveError}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSaving || !templateDraft.name.trim()}
                className="min-h-[44px] bg-cta-primary hover:bg-cta-hover text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Template"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetToInput}
                disabled={isSaving}
                className="min-h-[44px]"
              >
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
