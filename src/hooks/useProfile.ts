import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from "@/lib/queries/keys";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches or creates a profile for the given user.
 * If profile doesn't exist (PGRST116), auto-creates one as fallback.
 *
 * Note: The database trigger normally creates profiles on auth.users insert.
 * This fallback handles backwards compatibility for existing users without profiles.
 */
async function fetchOrCreateProfile(
  userId: string,
  email: string | undefined,
  userMetadata: Record<string, unknown> | undefined
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If profile doesn't exist, create one (backwards compatibility fallback)
    if (error.code === "PGRST116") {
      const newProfile = {
        user_id: userId,
        display_name: (userMetadata?.full_name as string) || email?.split("@")[0] || null,
        email: email,
        role: (userMetadata?.role as string) || null, // Use role from metadata, not hardcoded
      };

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (createError) throw createError;
      return createdProfile;
    }
    throw error;
  }

  return data;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile.current(user?.id ?? ''),
    queryFn: () => fetchOrCreateProfile(user!.id, user!.email, user!.user_metadata),
    enabled: !!user,
    // Retry logic for profile not found (trigger timing edge case)
    // Handles the rare case where React Query fires before database trigger completes
    retry: (failureCount, error: unknown) => {
      const pgError = error as { code?: string; message?: string };
      // Retry up to 3 times if profile not found (PGRST116)
      if (pgError?.code === 'PGRST116' && failureCount < 3) {
        return true;
      }
      // Also retry on network errors
      if (pgError?.message?.includes('network') && failureCount < 2) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(100 * 2 ** attemptIndex, 1000), // 100ms, 200ms, 400ms
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user!.id);

      if (error) throw error;
      return updates;
    },
    onSuccess: async () => {
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
      });
      return queryClient.invalidateQueries({ queryKey: queryKeys.profile.current(user!.id) });
    },
    onError: (error) => {
      handleError(error, { component: 'useProfile', action: 'update profile' });
    },
  });

  // Backward-compatible wrapper maintaining boolean return
  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
    if (!user) return false;
    try {
      await updateProfileMutation.mutateAsync(updates);
      return true;
    } catch {
      return false;
    }
  };

  // Helper to get display name with fallback
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Coach";

  // Helper to get initials
  const initials = displayName.substring(0, 2).toUpperCase();

  // Helper to get avatar emoji (if set)
  const avatarEmoji = profile?.avatar_url?.startsWith("emoji:")
    ? profile.avatar_url.replace("emoji:", "")
    : null;

  // Helper to get avatar display (emoji or initials)
  const avatarDisplay = avatarEmoji || initials;

  return {
    profile: profile ?? null,     // Coerce undefined to null for backward compatibility
    loading: isPending,           // Keep "loading" name for backward compatibility
    isFetching,                   // NEW: for background refresh indicator
    isError,                      // NEW: for error UI
    error,                        // NEW: for error details
    displayName,
    initials,
    avatarEmoji,
    avatarDisplay,
    fetchProfile: refetch,        // Manual retry
    updateProfile,
    // NEW: Mutation loading state
    isUpdating: updateProfileMutation.isPending,
  };
}
