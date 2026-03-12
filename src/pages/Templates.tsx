import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Library, Plus, Sparkles, Clock, Calendar, Trash2, Loader2, Edit, FileEdit, Edit2, Users, Wand2 } from "lucide-react";
import { TemplatesSkeleton } from "@/components/skeletons/TemplatesSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { AIPlanBuilder } from "@/components/ai/AIPlanBuilder";
import { PersonalizeDialog } from "@/components/ai/PersonalizeDialog";
import { ManualTemplateBuilder, ManualTask } from "@/components/templates/ManualTemplateBuilder";
import { GeneratedTask, useAIAssistant } from "@/hooks/useAIAssistant";
import { useTemplates, Template } from "@/hooks/useTemplates";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLogger";
import { minutesToTimeString } from "@/lib/utils";
import { queryKeys } from "@/lib/queries/keys";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

type PersonalizeTemplateTask = {
  title: string;
  description: string | null;
  day_offset: number;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
};

type PersonalizeTemplatePayload = {
  name: string;
  description: string | null;
  duration_weeks: number;
  frequency_per_week: number;
  tasks: PersonalizeTemplateTask[];
};

const EMPTY_PERSONALIZE_TEMPLATE: PersonalizeTemplatePayload = {
  name: "",
  description: null,
  duration_weeks: 1,
  frequency_per_week: 1,
  tasks: [],
};

export default function Templates() {
  const queryClient = useQueryClient();
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, fetchTemplates } = useTemplates();
  const { refineTask } = useAIAssistant();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("ai");
  const [hasUnsavedAITemplate, setHasUnsavedAITemplate] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<GeneratedTask[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTasks, setEditTasks] = useState<Array<{ title: string; description: string | null; duration_minutes: number | null; day_offset: number }>>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [polishingTaskIndex, setPolishingTaskIndex] = useState<number | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [personalizeTemplate, setPersonalizeTemplate] = useState<PersonalizeTemplatePayload | null>(null);
  const [personalizingTemplateId, setPersonalizingTemplateId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
  }, [queryClient]);

  const buildPersonalizeTemplate = (template: Template, tasks: PersonalizeTemplateTask[]): PersonalizeTemplatePayload => ({
    name: template.name,
    description: template.description ?? null,
    duration_weeks: Math.max(1, template.duration_weeks ?? 1),
    frequency_per_week: Math.max(1, template.frequency_per_week ?? 1),
    tasks,
  });

  const handleSavePlan = (tasks: GeneratedTask[]) => {
    setPendingTasks(tasks);
    setTemplateName(`Plan ${templates.length + 1}`);
    setTemplateDescription("");
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!templateName.trim()) return;

    setSaving(true);
    const result = await createTemplate(
      templateName.trim(),
      templateDescription.trim(),
      pendingTasks.map((t) => ({
        title: t.title,
        description: t.description,
        duration_minutes: t.duration_minutes,
        day_offset: t.day_offset,
      }))
    );

    setSaving(false);
    if (result) {
      setSaveDialogOpen(false);
      setPendingTasks([]);
      setActiveTab("library");
    }
  };

  const handleManualSave = async (name: string, description: string, tasks: ManualTask[]) => {
    setManualSaving(true);
    const result = await createTemplate(
      name,
      description,
      tasks.map((t, index) => ({
        title: t.title,
        description: t.description,
        duration_minutes: t.duration_minutes,
        day_offset: t.day_offset,
        sort_order: t.sort_order ?? index,
        start_time: t.start_time ?? null,
        end_time: t.end_time ?? null,
        // TODO: Persist task priority once template_tasks adds a priority column.
      }))
    );
    setManualSaving(false);
    if (result) {
      setActiveTab("library");
      logActivity("template_created", { template_id: result.id, source: "manual" });
    }
  };

  const handleOpenEdit = (template: Template) => {
    setEditTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description || "");
    setEditTasks(
      (template.tasks || []).map((t) => ({
        title: t.title,
        description: t.description,
        duration_minutes: t.duration_minutes,
        day_offset: t.day_offset,
      }))
    );
  };

  const handleSaveEdit = async () => {
    if (!editTemplate || !editName.trim()) return;

    setEditSaving(true);
    const result = await updateTemplate(
      editTemplate.id,
      editName.trim(),
      editDescription.trim(),
      editTasks.filter((t) => t.title.trim())
    );
    setEditSaving(false);

    if (result) {
      setEditTemplate(null);
    }
  };

  const handleEditTaskChange = (index: number, field: string, value: string | number) => {
    setEditTasks((prev) =>
      prev.map((task, i) => (i === index ? { ...task, [field]: value } : task))
    );
  };

  const handleAddEditTask = () => {
    setEditTasks((prev) => [
      ...prev,
      { title: "", description: "", duration_minutes: 15, day_offset: prev.length > 0 ? prev[prev.length - 1].day_offset : 0 },
    ]);
  };

  const handleRemoveEditTask = (index: number) => {
    if (editTasks.length > 1) {
      setEditTasks((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handlePolishEditTask = async (index: number) => {
    const task = editTasks[index];
    if (!task.description && !task.title) return;

    setPolishingTaskIndex(index);
    try {
      const textToPolish = task.description || task.title;
      const result = await refineTask(textToPolish);
      if (result.success && result.data) {
        handleEditTaskChange(index, "description", result.data);
      }
    } finally {
      setPolishingTaskIndex(null);
    }
  };

  const handleTabChange = (nextTab: string) => {
    if (nextTab === activeTab) return;

    const leavingAIBuilder = activeTab === "ai" && nextTab !== "ai";
    if (leavingAIBuilder && hasUnsavedAITemplate) {
      const confirmed = window.confirm(
        "You have an unsaved AI-generated template. Leave without saving?",
      );
      if (!confirmed) {
        return;
      }
      setHasUnsavedAITemplate(false);
    }

    setActiveTab(nextTab);
  };

  const handlePersonalizeOpenChange = (nextOpen: boolean) => {
    setPersonalizeOpen(nextOpen);
    if (!nextOpen) {
      setPersonalizeTemplate(null);
      setPersonalizingTemplateId(null);
      void fetchTemplates();
    }
  };

  const handleOpenPersonalize = async (template: Template) => {
    if (hasUnsavedAITemplate) {
      const confirmed = window.confirm(
        "You have an unsaved AI-generated template. Continue without saving it?",
      );
      if (!confirmed) return;
      setHasUnsavedAITemplate(false);
    }

    if (activeTab === "manual") {
      const confirmed = window.confirm(
        "You may have unsaved changes in Manual Builder. Continue to personalize a saved template?",
      );
      if (!confirmed) return;
    }

    setPersonalizingTemplateId(template.id);

    try {
      let tasks: PersonalizeTemplateTask[] = [];

      if (template.tasks && template.tasks.length > 0) {
        tasks = template.tasks.map((task) => ({
          title: task.title,
          description: task.description ?? null,
          day_offset: Math.max(0, task.day_offset ?? 0),
          duration_minutes: Math.max(1, task.duration_minutes ?? 15),
          start_time: task.start_time ?? null,
          end_time: task.end_time ?? null,
        }));
      } else {
        const { data, error } = await supabase
          .from("template_tasks")
          .select("title, description, day_offset, duration_minutes, start_time, end_time, sort_order")
          .eq("template_id", template.id)
          .order("day_offset", { ascending: true })
          .order("sort_order", { ascending: true });

        if (error) throw error;

        tasks = (data ?? []).map((task) => ({
          title: task.title,
          description: task.description ?? null,
          day_offset: Math.max(0, task.day_offset ?? 0),
          duration_minutes: Math.max(1, task.duration_minutes ?? 15),
          start_time: task.start_time ?? null,
          end_time: task.end_time ?? null,
        }));
      }

      setPersonalizeTemplate(buildPersonalizeTemplate(template, tasks));
      setPersonalizeOpen(true);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Could not load template tasks for personalization.";
      toast({
        title: "Unable to personalize template",
        description,
        variant: "destructive",
      });
    } finally {
      setPersonalizingTemplateId(null);
    }
  };

  if (loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <TemplatesSkeleton />
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Template Library</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage reusable plans with AI assistance
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full max-w-full justify-start overflow-x-auto bg-muted/30 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger
            value="ai"
            className="shrink-0 data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Builder
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="shrink-0 data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <FileEdit className="w-4 h-4 mr-2" />
            Manual Builder
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="shrink-0 data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <Library className="w-4 h-4 mr-2" />
            Library ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <AIPlanBuilder
            onSavePlan={handleSavePlan}
            onUnsavedTemplateChange={setHasUnsavedAITemplate}
          />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <ManualTemplateBuilder onSave={handleManualSave} isSaving={manualSaving} />
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <Card className="border-dashed border-2 border-border bg-card/50">
              <CardContent className="py-16 text-center">
                <Library className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">
                  No Templates Yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Use the AI Builder to create your first template, or create one
                  manually.
                </p>
                <Button
                  onClick={() => setActiveTab("ai")}
                  className="bg-cta-primary hover:bg-cta-hover text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create with AI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="border-border hover:border-cta-primary/50 transition-all"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-foreground">
                        {template.name}
                      </CardTitle>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{template.name}" and all its tasks.
                              This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTemplate(template.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Library className="w-4 h-4" />
                          {template.tasks?.length || 0} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {template.tasks?.reduce(
                            (sum, t) => sum + (t.duration_minutes || 0),
                            0
                          )}
                          m total
                        </span>
                      </div>
                      {template.tasks && template.tasks.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {Math.max(...template.tasks.map((t) => t.day_offset || 0)) + 1}{" "}
                          days
                        </div>
                      )}
                      <div className="pt-2 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-[110px] border-btn-secondary/30 text-btn-secondary hover:bg-btn-secondary/10"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPersonalize(template)}
                          disabled={personalizingTemplateId === template.id}
                          className="border-cta-primary/40 text-cta-primary hover:bg-cta-primary/10"
                        >
                          {personalizingTemplateId === template.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-1" />
                          )}
                          <span className="hidden sm:inline">Personalize with AI</span>
                          <span className="sm:hidden">Personalize</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(template)}
                          className="border-btn-secondary/30 text-btn-secondary hover:bg-btn-secondary/10"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Morning Warmup Routine"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template..."
                rows={3}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This template contains {pendingTasks.length} tasks.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={saving || !templateName.trim()}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="coach-theme dark max-w-2xl max-h-[80vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
              {previewTemplate && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenPersonalize(previewTemplate)}
                  disabled={personalizingTemplateId === previewTemplate.id}
                  className="border-cta-primary/40 text-cta-primary hover:bg-cta-primary/10"
                >
                  {personalizingTemplateId === previewTemplate.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  Personalize with AI
                </Button>
              )}
            </div>
            {previewTemplate?.description && (
              <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
            )}
          </DialogHeader>
          <div className="py-4 space-y-3">
            {previewTemplate?.tasks?.map((task, index) => (
              <div
                key={task.id || index}
                className="p-3 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    {/* Time scheduling display */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {task.due_time_offset_minutes !== null && task.due_time_offset_minutes !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs">
                          <Clock className="w-3 h-3" />
                          Due: {minutesToTimeString(task.due_time_offset_minutes)}
                        </span>
                      )}
                      {task.start_time && task.end_time && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs">
                          <Clock className="w-3 h-3" />
                          {task.start_time} - {task.end_time}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-4">
                    <span className="bg-secondary px-2 py-1 rounded">
                      Day {task.day_offset + 1}
                    </span>
                    <span className="bg-secondary px-2 py-1 rounded">
                      {task.duration_minutes}m
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="coach-theme dark max-w-2xl max-h-[85vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tasks</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddEditTask}
                  className="text-btn-secondary border-btn-secondary/30"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </div>

              {editTasks.map((task, index) => (
                <div key={index} className="p-3 border rounded-lg bg-secondary/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={task.title}
                      onChange={(e) => handleEditTaskChange(index, "title", e.target.value)}
                      placeholder="Task title"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEditTask(index)}
                      disabled={editTasks.length === 1}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={task.description ?? ""}
                      onChange={(e) => handleEditTaskChange(index, "description", e.target.value)}
                      placeholder="Description (optional)"
                      className="text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePolishEditTask(index)}
                      disabled={polishingTaskIndex === index || (!task.description && !task.title)}
                      className="shrink-0 border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                      title="Polish with AI - makes it clear and encouraging"
                    >
                      {polishingTaskIndex === index ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Day</Label>
                      <Input
                        type="number"
                        value={task.day_offset + 1}
                        onChange={(e) => handleEditTaskChange(index, "day_offset", Math.max(0, parseInt(e.target.value) - 1) || 0)}
                        className="w-16"
                        min={1}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Duration</Label>
                      <Input
                        type="number"
                        value={task.duration_minutes ?? ""}
                        onChange={(e) => handleEditTaskChange(index, "duration_minutes", parseInt(e.target.value) || 15)}
                        className="w-20"
                        min={1}
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editSaving || !editName.trim() || editTasks.filter(t => t.title.trim()).length === 0}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PersonalizeDialog
        open={personalizeOpen}
        onOpenChange={handlePersonalizeOpenChange}
        template={personalizeTemplate ?? EMPTY_PERSONALIZE_TEMPLATE}
      />
    </div>
    </PullToRefresh>
  );
}
