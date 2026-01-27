import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; tasks: TemplateTask[] }) => {
      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
        .insert({
          coach_id: user!.id,
          name: data.name,
          description: data.description,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template tasks
      if (data.tasks.length > 0) {
        const taskInserts = data.tasks.map((task, index) => ({
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

      return {
        ...templateData,
        tasks: data.tasks,
      } as Template;
    },
    onSuccess: async (data) => {
      toast({
        title: "Template Created",
        description: `"${data.name}" has been saved with ${data.tasks?.length || 0} tasks.`,
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(user!.id) });
    },
    onError: (error) => {
      handleError(error, { component: 'useTemplates', action: 'create template' });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { templateId: string; name: string; description: string; tasks: TemplateTask[] }) => {
      // Update template
      const { error: templateError } = await supabase
        .from("templates")
        .update({
          name: data.name,
          description: data.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.templateId);

      if (templateError) throw templateError;

      // Delete existing tasks
      const { error: deleteError } = await supabase
        .from("template_tasks")
        .delete()
        .eq("template_id", data.templateId);

      if (deleteError) throw deleteError;

      // Insert new tasks
      if (data.tasks.length > 0) {
        const taskInserts = data.tasks.map((task, index) => ({
          template_id: data.templateId,
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

      return {
        id: data.templateId,
        name: data.name,
        description: data.description,
        coach_id: user!.id,
        created_at: templates?.find((t) => t.id === data.templateId)?.created_at || new Date().toISOString(),
        tasks: data.tasks,
      } as Template;
    },
    onSuccess: async (data) => {
      toast({
        title: "Template Updated",
        description: `"${data.name}" has been saved.`,
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(user!.id) });
    },
    onError: (error) => {
      handleError(error, { component: 'useTemplates', action: 'update template' });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (data: { templateId: string }) => {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", data.templateId);

      if (error) throw error;
      return data.templateId;
    },
    onSuccess: async () => {
      toast({
        title: "Template Deleted",
        description: "Template has been removed.",
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(user!.id) });
    },
    onError: (error) => {
      handleError(error, { component: 'useTemplates', action: 'delete template' });
    },
  });

  // Backward-compatible wrapper functions
  const createTemplate = async (
    name: string,
    description: string,
    tasks: TemplateTask[]
  ): Promise<Template | null> => {
    if (!user) return null;
    try {
      return await createTemplateMutation.mutateAsync({ name, description, tasks });
    } catch {
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
      return await updateTemplateMutation.mutateAsync({ templateId, name, description, tasks });
    } catch {
      return null;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await deleteTemplateMutation.mutateAsync({ templateId });
      return true;
    } catch {
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
    // NEW: Mutation loading states
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
  };
}
