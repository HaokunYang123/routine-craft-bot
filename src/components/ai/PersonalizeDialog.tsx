import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishButton } from "@/components/ui/PolishButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimitCooldown } from "@/hooks/useRateLimitCooldown";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RateLimitError, callGemini } from "@/lib/gemini";
import { queryKeys } from "@/lib/queries/keys";

type BuilderState = "input" | "generating" | "preview" | "saving";

interface PersonalizeTaskInput {
  title: string;
  description: string | null;
  day_offset: number;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
}

interface PersonalizeTemplateInput {
  name: string;
  description: string | null;
  duration_weeks: number;
  frequency_per_week: number;
  tasks: PersonalizeTaskInput[];
}

interface PersonalizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PersonalizeTemplateInput;
}

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

interface PersonalizeModelResponse {
  name?: unknown;
  description?: unknown;
  duration_weeks?: unknown;
  frequency_per_week?: unknown;
  tasks?: unknown;
  ai_note?: unknown;
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
const DIFFICULTY_OPTIONS = ["Simplify", "Keep Same", "Make Harder"] as const;
const PACING_OPTIONS = ["Slower", "Standard", "Accelerated"] as const;
const LEARNING_STYLE_OPTIONS = ["Visual", "Hands-on", "Reading/Writing", "Auditory"] as const;
const DEFAULT_DIFFICULTY = "Keep Same";
const DEFAULT_PACING = "Standard";
let generatedTaskCounter = 0;

const createTaskId = (): string => {
  generatedTaskCounter += 1;
  return `personalize-task-${Date.now()}-${generatedTaskCounter}`;
};

const parseString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const parseNullableString = (value: unknown): string | null => {
  const parsed = parseString(value);
  return parsed ? parsed : null;
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

const toPromptTemplate = (template: PersonalizeTemplateInput): PersonalizeTemplateInput => ({
  name: parseString(template.name) || "Template",
  description: parseNullableString(template.description),
  duration_weeks: parsePositiveInt(template.duration_weeks, 1),
  frequency_per_week: parsePositiveInt(template.frequency_per_week, 1),
  tasks: (template.tasks ?? []).map((task, index) => ({
    title: parseString(task.title) || `Task ${index + 1}`,
    description: parseNullableString(task.description),
    day_offset: parseNonNegativeInt(task.day_offset, index),
    duration_minutes: parsePositiveInt(task.duration_minutes, 30),
    start_time: parseNullableString(task.start_time),
    end_time: parseNullableString(task.end_time),
  })),
});

const toTemplateDraft = (template: PersonalizeTemplateInput): TemplateDraft => {
  const tasks = (template.tasks ?? [])
    .map((task, index) => ({
      id: createTaskId(),
      title: parseString(task.title),
      description: parseString(task.description),
      day_offset: parseNonNegativeInt(task.day_offset, index),
      duration_minutes: parsePositiveInt(task.duration_minutes, 30),
      start_time: normalizeDraftTime(task.start_time),
      end_time: normalizeDraftTime(task.end_time),
    }))
    .filter((task) => task.title.length > 0)
    .sort((a, b) => a.day_offset - b.day_offset);

  const fallbackTasks = tasks.length > 0 ? tasks : [
    {
      id: createTaskId(),
      title: "Task 1",
      description: "",
      day_offset: 0,
      duration_minutes: 30,
      start_time: "",
      end_time: "",
    },
  ];

  const maxOffset = Math.max(...fallbackTasks.map((task) => task.day_offset), 0);
  const derivedWeeks = Math.max(1, Math.ceil((maxOffset + 1) / 7));

  return {
    name: parseString(template.name) || "Personalized Plan",
    description: parseString(template.description),
    duration_weeks: parsePositiveInt(template.duration_weeks, derivedWeeks),
    frequency_per_week: parsePositiveInt(
      template.frequency_per_week,
      estimateFrequency(fallbackTasks, derivedWeeks),
    ),
    tasks: fallbackTasks,
  };
};

const normalizePersonalizeResponse = (
  data: PersonalizeModelResponse,
  fallbackTemplate: PersonalizeTemplateInput,
): { template: TemplateDraft; aiNote: string | null } => {
  const fallbackDraft = toTemplateDraft(fallbackTemplate);
  const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];

  const parsedTasks = rawTasks
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

  const tasks = parsedTasks.length > 0 ? parsedTasks : fallbackDraft.tasks;
  const maxOffset = Math.max(...tasks.map((task) => task.day_offset), 0);
  const derivedWeeks = Math.max(1, Math.ceil((maxOffset + 1) / 7));
  const aiNoteValue = parseString(data.ai_note);

  return {
    template: {
      name: parseString(data.name) || fallbackDraft.name,
      description: parseString(data.description) || fallbackDraft.description,
      duration_weeks: parsePositiveInt(data.duration_weeks, Math.max(derivedWeeks, fallbackDraft.duration_weeks)),
      frequency_per_week: parsePositiveInt(
        data.frequency_per_week,
        estimateFrequency(tasks, Math.max(derivedWeeks, fallbackDraft.duration_weeks)),
      ),
      tasks,
    },
    aiNote: aiNoteValue || null,
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

export function PersonalizeDialog({ open, onOpenChange, template }: PersonalizeDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [builderState, setBuilderState] = useState<BuilderState>("input");
  const [difficulty, setDifficulty] = useState<string>(DEFAULT_DIFFICULTY);
  const [pacing, setPacing] = useState<string>(DEFAULT_PACING);
  const [learningStyle, setLearningStyle] = useState<string[]>([]);
  const [accommodations, setAccommodations] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { isCoolingDown, startCooldown, cooldownLabel } = useRateLimitCooldown();

  const isGenerating = builderState === "generating";
  const isSaving = builderState === "saving";
  const isPreviewVisible = builderState === "preview" || builderState === "saving";

  useEffect(() => {
    if (!open) {
      setBuilderState("input");
      setDifficulty(DEFAULT_DIFFICULTY);
      setPacing(DEFAULT_PACING);
      setLearningStyle([]);
      setAccommodations("");
      setAdditionalNotes("");
      setTemplateDraft(null);
      setAiNote(null);
      setGenerationError(null);
      setSaveError(null);
    }
  }, [open]);

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

  const handleGeneratePersonalization = async () => {
    setBuilderState("generating");
    setGenerationError(null);
    setSaveError(null);
    setAiNote(null);

    const promptTemplate = toPromptTemplate(template);
    try {
      const result = await callGemini<PersonalizeModelResponse>({
        action: "personalize",
        payload: {
          template: promptTemplate,
          difficulty,
          pacing,
          learningStyle,
          accommodations: accommodations.trim() || null,
          additionalNotes: additionalNotes.trim() || null,
        },
      });

      if (!result.success || !result.data) {
        setGenerationError(result.error || "Failed to personalize this plan.");
        setBuilderState("input");
        return;
      }

      const normalized = normalizePersonalizeResponse(result.data, promptTemplate);
      setTemplateDraft(normalized.template);
      setAiNote(normalized.aiNote);
      setBuilderState("preview");
    } catch (error) {
      if (error instanceof RateLimitError) {
        startCooldown(error.retryAfterSeconds);
        setBuilderState("input");
        return;
      }

      setGenerationError(error instanceof Error ? error.message : "Failed to personalize this plan.");
      setBuilderState("input");
    }
  };

  const handleTemplateTextChange = (field: "name" | "description", value: string) => {
    setTemplateDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleTemplateNumberChange = (
    field: "duration_weeks" | "frequency_per_week",
    value: string,
  ) => {
    const parsed = Number.parseInt(value, 10);
    const normalizedValue = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
    setTemplateDraft((prev) => (prev ? { ...prev, [field]: normalizedValue } : prev));
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

  const handleResetPreview = () => {
    setBuilderState("input");
    setDifficulty(DEFAULT_DIFFICULTY);
    setPacing(DEFAULT_PACING);
    setLearningStyle([]);
    setAccommodations("");
    setAdditionalNotes("");
    setTemplateDraft(null);
    setAiNote(null);
    setSaveError(null);
  };

  const toggleLearningStyle = (style: string) => {
    setLearningStyle((prev) => (
      prev.includes(style)
        ? prev.filter((item) => item !== style)
        : [...prev, style]
    ));
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
        title: "Personalized template saved!",
      });

      onOpenChange(false);
      handleResetPreview();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="coach-theme dark max-w-4xl max-h-[90vh] overflow-y-auto text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cta-primary" />
            Personalize Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Card className="border-cta-primary/30 bg-cta-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">Personalization Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personalize-template-name">Template Name</Label>
                <Input
                  id="personalize-template-name"
                  value={parseString(template.name) || "Template"}
                  disabled
                  className="bg-card border-border"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="personalize-difficulty">Difficulty Adjustment</Label>
                  <Select
                    value={difficulty}
                    onValueChange={setDifficulty}
                    disabled={isGenerating || isSaving || isCoolingDown}
                  >
                    <SelectTrigger id="personalize-difficulty" className="bg-card border-border">
                      <SelectValue placeholder="Select difficulty adjustment" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalize-pacing">Pacing</Label>
                  <Select
                    value={pacing}
                    onValueChange={setPacing}
                    disabled={isGenerating || isSaving || isCoolingDown}
                  >
                    <SelectTrigger id="personalize-pacing" className="bg-card border-border">
                      <SelectValue placeholder="Select pacing" />
                    </SelectTrigger>
                    <SelectContent>
                      {PACING_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Learning Style</Label>
                <div className="flex flex-wrap gap-2">
                  {LEARNING_STYLE_OPTIONS.map((style) => {
                    const isSelected = learningStyle.includes(style);
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => toggleLearningStyle(style)}
                        disabled={isGenerating || isSaving || isCoolingDown}
                        className={isSelected
                          ? "rounded-md border border-cta-primary/60 bg-cta-primary/15 px-3 py-1.5 text-sm text-foreground"
                          : "rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                        }
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
                {learningStyle.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {learningStyle.map((style) => (
                      <Badge key={style} variant="secondary" className="flex items-center gap-1">
                        <span>{style}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${style}`}
                          onClick={() => toggleLearningStyle(style)}
                          disabled={isGenerating || isSaving || isCoolingDown}
                          className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-black/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalize-accommodations">Accommodations (optional)</Label>
                <Input
                  id="personalize-accommodations"
                  value={accommodations}
                  onChange={(event) => setAccommodations(event.target.value)}
                  disabled={isGenerating || isSaving || isCoolingDown}
                  placeholder="e.g. extra time, simplified language"
                  className="bg-card border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalize-additional-notes">Additional Notes (optional)</Label>
                <Textarea
                  id="personalize-additional-notes"
                  value={additionalNotes}
                  onChange={(event) => setAdditionalNotes(event.target.value)}
                  disabled={isGenerating || isSaving || isCoolingDown}
                  placeholder="Any other guidance for this personalization"
                  className="min-h-[90px] bg-card border-border"
                />
              </div>

              <Button
                type="button"
                onClick={handleGeneratePersonalization}
                disabled={isGenerating || isSaving || isCoolingDown}
                className="bg-cta-primary hover:bg-cta-hover text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : isCoolingDown ? (
                  "Cooldown active"
                ) : (
                  "Generate"
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
                {aiNote && (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">{aiNote}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="personalized-template-name">Template Name</Label>
                    <Input
                      id="personalized-template-name"
                      value={templateDraft.name}
                      onChange={(event) =>
                        handleTemplateTextChange("name", event.target.value)
                      }
                      disabled={isSaving}
                      className="bg-card border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalized-template-description">Description</Label>
                    <Textarea
                      id="personalized-template-description"
                      value={templateDraft.description}
                      onChange={(event) =>
                        handleTemplateTextChange("description", event.target.value)
                      }
                      disabled={isSaving}
                      className="min-h-[90px] bg-card border-border"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="personalized-duration-weeks">Duration (weeks)</Label>
                      <Input
                        id="personalized-duration-weeks"
                        type="number"
                        min={1}
                        value={templateDraft.duration_weeks}
                        onChange={(event) =>
                          handleTemplateNumberChange("duration_weeks", event.target.value)
                        }
                        disabled={isSaving}
                        className="bg-card border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="personalized-frequency">Frequency (days per week)</Label>
                      <Input
                        id="personalized-frequency"
                        type="number"
                        min={1}
                        value={templateDraft.frequency_per_week}
                        onChange={(event) =>
                          handleTemplateNumberChange("frequency_per_week", event.target.value)
                        }
                        disabled={isSaving}
                        className="bg-card border-border"
                      />
                    </div>
                  </div>
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
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    aria-label="Delete task"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`personalized-task-title-${task.id}`}>Title</Label>
                                  <Input
                                    id={`personalized-task-title-${task.id}`}
                                    value={task.title}
                                    onChange={(event) =>
                                      handleTaskTextChange(task.id, "title", event.target.value)
                                    }
                                    disabled={isSaving}
                                    className="bg-card border-border"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`personalized-task-description-${task.id}`}>Description</Label>
                                  <Textarea
                                    id={`personalized-task-description-${task.id}`}
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
                                    <Label htmlFor={`personalized-task-day-${task.id}`}>Day #</Label>
                                    <Input
                                      id={`personalized-task-day-${task.id}`}
                                      type="number"
                                      min={1}
                                      value={task.day_offset + 1}
                                      onChange={(event) =>
                                        handleTaskDayChange(task.id, event.target.value)
                                      }
                                      disabled={isSaving}
                                      className="bg-card border-border"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`personalized-task-duration-${task.id}`}>Duration (min)</Label>
                                    <Input
                                      id={`personalized-task-duration-${task.id}`}
                                      type="number"
                                      min={1}
                                      value={task.duration_minutes}
                                      onChange={(event) =>
                                        handleTaskDurationChange(task.id, event.target.value)
                                      }
                                      disabled={isSaving}
                                      className="bg-card border-border"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`personalized-task-start-${task.id}`}>Start Time</Label>
                                    <Input
                                      id={`personalized-task-start-${task.id}`}
                                      value={task.start_time}
                                      onChange={(event) =>
                                        handleTaskTextChange(task.id, "start_time", event.target.value)
                                      }
                                      disabled={isSaving}
                                      placeholder="HH:MM"
                                      className="bg-card border-border"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`personalized-task-end-${task.id}`}>End Time</Label>
                                    <Input
                                      id={`personalized-task-end-${task.id}`}
                                      value={task.end_time}
                                      onChange={(event) =>
                                        handleTaskTextChange(task.id, "end_time", event.target.value)
                                      }
                                      disabled={isSaving}
                                      placeholder="HH:MM"
                                      className="bg-card border-border"
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
                    className="bg-cta-primary hover:bg-cta-hover text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save as New Template"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPreview}
                    disabled={isSaving}
                  >
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
