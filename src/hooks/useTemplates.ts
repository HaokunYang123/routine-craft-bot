import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface TemplateTask {
  id?: string;
  title: string;
  description: string;
  duration_minutes: number;
  day_offset: number;
  sort_order?: number;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  coach_id: string;
  created_at: string;
  tasks?: TemplateTask[];
}

export function useTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from("templates" as any)
        .select("*")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch tasks for each template
      const templatesWithTasks = await Promise.all(
        (templatesData || []).map(async (template: any) => {
          const { data: tasksData } = await supabase
            .from("template_tasks" as any)
            .select("*")
            .eq("template_id", template.id)
            .order("day_offset", { ascending: true })
            .order("sort_order", { ascending: true });

          return {
            ...template,
            tasks: tasksData || [],
          };
        })
      );

      setTemplates(templatesWithTasks);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (
    name: string,
    description: string,
    tasks: TemplateTask[]
  ): Promise<Template | null> => {
    if (!user) return null;

    try {
      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from("templates" as any)
        .insert({
          coach_id: user.id,
          name,
          description,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template tasks
      if (tasks.length > 0) {
        const taskInserts = tasks.map((task, index) => ({
          template_id: templateData.id,
          title: task.title,
          description: task.description,
          duration_minutes: task.duration_minutes,
          day_offset: task.day_offset,
          sort_order: index,
        }));

        const { error: tasksError } = await supabase
          .from("template_tasks" as any)
          .insert(taskInserts);

        if (tasksError) throw tasksError;
      }

      const newTemplate: Template = {
        ...templateData,
        tasks,
      };

      setTemplates((prev) => [newTemplate, ...prev]);

      toast({
        title: "Template Created",
        description: `"${name}" has been saved with ${tasks.length} tasks.`,
      });

      return newTemplate;
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create template.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("templates" as any)
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== templateId));

      toast({
        title: "Template Deleted",
        description: "Template has been removed.",
      });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
  };
}
