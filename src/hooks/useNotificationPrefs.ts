import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface NotificationPrefs {
  notify_on_task_completion: boolean;
  notify_on_task_assignment: boolean;
}

const notificationPrefsQueryKey = ["notification-prefs"] as const;

const normalizePrefs = (value: unknown): NotificationPrefs => {
  const data = (value ?? {}) as Partial<NotificationPrefs>;
  return {
    notify_on_task_completion: Boolean(data.notify_on_task_completion),
    notify_on_task_assignment: Boolean(data.notify_on_task_assignment),
  };
};

export function useNotificationPrefs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: notificationPrefsQueryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fetch_notification_prefs");
      if (error) throw error;
      return normalizePrefs(data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPrefs>) => {
      const currentPrefs = normalizePrefs(queryClient.getQueryData(notificationPrefsQueryKey) ?? prefs);
      const nextPrefs = { ...currentPrefs, ...updates };
      const { data, error } = await supabase.rpc("upsert_notification_prefs", {
        p_completion_flag: nextPrefs.notify_on_task_completion,
        p_assignment_flag: nextPrefs.notify_on_task_assignment,
      });

      if (error) throw error;
      return normalizePrefs(data);
    },
    onSuccess: async (nextPrefs) => {
      queryClient.setQueryData(notificationPrefsQueryKey, nextPrefs);
      await queryClient.invalidateQueries({ queryKey: notificationPrefsQueryKey });
    },
  });

  return {
    prefs: prefs ?? null,
    isLoading,
    updatePrefs: (updates: Partial<NotificationPrefs>) => updateMutation.mutateAsync(updates),
  };
}
