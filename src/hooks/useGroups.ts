import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from "@/lib/queries/keys";

export interface Group {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  coach_id: string;
  created_at: string | null;
  join_code: string;
  qr_token: string | null;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  display_name?: string;
}

async function fetchGroupsWithCounts(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Get member counts for each group
  const groupsWithCounts = await Promise.all(
    (data || []).map(async (group) => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id);

      return {
        ...group,
        member_count: count || 0,
      };
    })
  );

  return groupsWithCounts;
}

export function useGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: groups,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.groups.list(user?.id ?? ''),
    queryFn: () => fetchGroupsWithCounts(user!.id),
    enabled: !!user,
  });

  const createGroup = async (name: string, color: string, icon: string = "users") => {
    if (!user) return null;

    try {
      // Generate a unique join code
      const { data: joinCode, error: codeError } = await supabase.rpc("generate_group_join_code");
      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from("groups")
        .insert({
          name,
          color,
          icon,
          coach_id: user.id,
          join_code: joinCode,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Group Created",
        description: `"${name}" has been created`,
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user.id) });
      return data;
    } catch (error) {
      handleError(error, { component: 'useGroups', action: 'create group' });
      return null;
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<Group>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", groupId);

      if (error) throw error;

      toast({
        title: "Group Updated",
        description: "Group has been updated",
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user.id) });
      return true;
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : "Failed to update group";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;

      toast({
        title: "Group Deleted",
        description: "Group has been removed",
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user.id) });
      return true;
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : "Failed to delete group";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const addMember = async (groupId: string, userId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
          role: "member",
        });

      if (error) throw error;

      toast({
        title: "Member Added",
        description: "Member has been added to the group",
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user.id) });
      return true;
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : "Failed to add member";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const removeMember = async (groupId: string, userId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Member Removed",
        description: "Member has been removed from the group",
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user.id) });
      return true;
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : "Failed to remove member";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data: members, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);

      if (error) throw error;

      // Get display names and emails
      const userIds = (members || []).map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        // Use display_name, fallback to email prefix, then "Student"
        const emailPrefix = p.email ? p.email.split("@")[0] : null;
        profileMap[p.user_id] = p.display_name || emailPrefix || "Student";
      });

      return (members || []).map((m) => ({
        ...m,
        display_name: profileMap[m.user_id] || "Student",
      }));
    } catch (error) {
      handleError(error, { component: 'useGroups', action: 'fetch group members', silent: true });
      return [];
    }
  };

  return {
    groups: groups ?? [],          // Coerce undefined to empty array
    loading: isPending,            // Keep "loading" name for backward compatibility
    isFetching,                    // NEW: for background refresh indicator
    isError,                       // NEW: for error UI
    error,                         // NEW: for error details
    fetchGroups: refetch,          // Manual retry
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
    getGroupMembers,
  };
}
