import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "coach" | "student";
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === "PGRST116") {
          const newProfile = {
            user_id: user.id,
            display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || null,
            email: user.email,
            role: "coach" as const,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from("profiles")
            .insert(newProfile)
            .select()
            .single();

          if (createError) throw createError;
          setProfile(createdProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setProfile((prev) => prev ? { ...prev, ...updates } : null);

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
      });

      return true;
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  // Helper to get display name with fallback
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Coach";

  // Helper to get initials
  const initials = displayName.substring(0, 2).toUpperCase();

  return {
    profile,
    loading,
    displayName,
    initials,
    fetchProfile,
    updateProfile,
  };
}
