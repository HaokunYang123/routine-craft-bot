import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from '@/lib/queries/keys';

export interface TemplateTask {
  id?: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  day_offset: number;
  sort_order?: number | null;
  created_at?: string | null;
  template_id?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  coach_id: string;
  created_at: string | null;
  updated_at?: string | null;
  category?: string | null;
  duration_weeks?: number | null;
  frequency_per_week?: number | null;
  is_ai_generated?: boolean | null;
  tags?: string[] | null;
  weeks?: unknown;
  tasks?: TemplateTask[];
}

/**
 * Fetch templates with their nested tasks for a user
 */
async function fetchTemplatesWithTasks(userId: string): Promise<Template[]> {
  const { data: templatesData, error: templatesError } = await supabase
    .from("templates")
    .select("*")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false });

  // Table doesn't exist yet - return empty (not an error)
  if (templatesError) {
    if (templatesError.code === "PGRST205" || templatesError.message?.includes("not find")) {
      console.log("Templates table not yet created - run the SQL migration");
      return [];
    }
    throw templatesError;
  }

  // Fetch tasks for each template
  const templatesWithTasks = await Promise.all(
    (templatesData || []).map(async (template) => {
      const { data: tasksData } = await supabase
        .from("template_tasks")
        .select("*")
        .eq("template_id", template.id)
        .order("day_offset", { ascending: true })
        .order("sort_order", { ascending: true });
      return { ...template, tasks: tasksData || [] };
    })
  );

  return templatesWithTasks;
}

export function useTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: templates,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.templates.list(user?.id ?? ''),
    queryFn: () => fetchTemplatesWithTasks(user!.id),
    enabled: !!user,
  });

  const createTemplate = async (
    name: string,
    description: string,
    tasks: TemplateTask[]
  ): Promise<Template | null> => {
    if (!user) return null;

    try {
      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
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
          .from("template_tasks")
          .insert(taskInserts);

        if (tasksError) throw tasksError;
      }

      const newTemplate: Template = {
        ...templateData,
        tasks,
      };

      toast({
        title: "Template Created",
        description: `"${name}" has been saved with ${tasks.length} tasks.`,
      });

      // Invalidate cache to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(user.id) });

      return newTemplate;
    } catch (error) {
      handleError(error, { component: 'useTemplates', action: 'create template' });
      return null;
    }
  };

  const updateTemplate = async (
    templateId: string,
    name: string,
    description: string,
    tasks: TemplateTask[]
  ): Promise<Template | null> => {
    if (!user) return null;

    try {
      // Update template
      const { error: templateError } = await supabase
        .from("templates")
        .update({
          name,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      if (templateError) throw templateError;

      // Delete existing tasks
      const { error: deleteError } = await supabase
        .from("template_tasks")
        .delete()
        .eq("template_id", templateId);

      if (deleteError) throw deleteError;

      // Insert new tasks
      if (tasks.length > 0) {
        const taskInserts = tasks.map((task, index) => ({
          template_id: templateId,
          title: task.title,
          description: task.description,
          duration_minutes: task.duration_minutes,
          day_offset: task.day_offset,
          sort_order: index,
        }));

        const { error: tasksError } = await supabase
          .from("template_tasks")
          .insert(taskInserts);

        if (tasksError) throw tasksError;
      }

      const updatedTemplate: Template = {
        id: templateId,
        name,
        description,
        coach_id: user.id,
        created_at: templates?.find((t) => t.id === templateId)?.created_at || new Date().toISOString(),
        tasks,
      };

      toast({
        title: "Template Updated",
        description: `"${name}" has been saved.`,
      });

      // Invalidate cache to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(user.id) });

      return updatedTemplate;
    } catch (error) {
      handleError(error, { component: 'useTemplates', action: 'update template' });
      return null;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: "Template has been removed.",
      });

      // Invalidate cache to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(user.id) });

      return true;
    } catch (error) {
      handleError(error, { component: 'useTemplates', action: 'delete template' });
      return false;
    }
  };

  return {
    templates: templates ?? [],     // Coerce undefined to empty array
    loading: isPending,             // Keep "loading" name for backward compatibility
    isFetching,                     // NEW: for background refresh indicator
    isError,                        // NEW: for error UI
    error,                          // NEW: for error details
    fetchTemplates: refetch,        // Manual retry
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
