import { useState } from "react";
import { Library, Plus, Sparkles, Clock, Calendar, Trash2, Loader2, Edit, FileEdit, Edit2, Users } from "lucide-react";
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
import { ManualTemplateBuilder, ManualTask } from "@/components/templates/ManualTemplateBuilder";
import { GeneratedTask } from "@/hooks/useAIAssistant";
import { useTemplates, Template } from "@/hooks/useTemplates";
import { useToast } from "@/hooks/use-toast";

export default function Templates() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("ai");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<GeneratedTask[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTasks, setEditTasks] = useState<Array<{ title: string; description: string; duration_minutes: number; day_offset: number }>>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);

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
      tasks.map((t) => ({
        title: t.title,
        description: t.description,
        duration_minutes: t.duration_minutes,
        day_offset: t.day_offset,
      }))
    );
    setManualSaving(false);
    if (result) {
      setActiveTab("library");
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

  const handleEditTaskChange = (index: number, field: string, value: any) => {
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

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Template Library</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage reusable plans with AI assistance
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger
            value="ai"
            className="data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Builder
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <FileEdit className="w-4 h-4 mr-2" />
            Manual Builder
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="data-[state=active]:bg-cta-primary data-[state=active]:text-white"
          >
            <Library className="w-4 h-4 mr-2" />
            Library ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <AIPlanBuilder onSavePlan={handleSavePlan} />
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
                  onClick={() => setActiveTab("create")}
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
                      <div className="pt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-btn-secondary/30 text-btn-secondary hover:bg-btn-secondary/10"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          Preview
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
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
    </div>
  );
}
