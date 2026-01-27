import { useCallback } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from "@/lib/queries/keys";

interface Sticker {
    id: string;
    name: string;
    image_url: string;
    rarity: string | null;
    created_at: string;
}

interface UserSticker {
    id: string;
    sticker_id: string;
    earned_at: string;
    task_id: string | null;
    sticker: Sticker;
}

// 20% base chance to drop a sticker
const DROP_CHANCE = 0.2;

// Higher rarity = lower chance within the drop
const RARITY_WEIGHTS = {
    common: 60,
    rare: 25,
    epic: 12,
    legendary: 3,
};

/**
 * Calculate streak from completed tasks.
 * Pure function extracted from useEffect for testability and use in combine.
 */
export function calculateStreak(completedTasks: { completed_at: string | null }[]): number {
    const dates = completedTasks
        .filter(t => t.completed_at !== null)
        .map(t => new Date(t.completed_at!).toDateString());
    const uniqueDates = [...new Set(dates)];

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let currentStreak = 0;

    // Check if streak is active (completed today or yesterday)
    if (uniqueDates.includes(today)) {
        currentStreak = 1;
        let checkDate = new Date(Date.now() - 86400000);
        while (uniqueDates.includes(checkDate.toDateString())) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    } else if (uniqueDates.includes(yesterday)) {
        // Streak preserved but not incremented for today yet
        // Count backwards from yesterday
        let checkDate = new Date(Date.now() - 86400000);
        while (uniqueDates.includes(checkDate.toDateString())) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    }

    return currentStreak;
}

export function useStickers() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const results = useQueries({
        queries: [
            {
                queryKey: ['stickers', 'all'],
                queryFn: async (): Promise<Sticker[]> => {
                    const { data, error } = await supabase.from("stickers").select("*");
                    if (error) throw error;
                    return data || [];
                },
                enabled: !!user,
            },
            {
                queryKey: queryKeys.stickers.byUser(user?.id ?? ''),
                queryFn: async (): Promise<UserSticker[]> => {
                    const { data, error } = await supabase
                        .from("user_stickers")
                        .select("*, sticker:stickers(*)")
                        .eq("user_id", user!.id)
                        .order("earned_at", { ascending: false });
                    if (error) throw error;
                    return (data || []) as UserSticker[];
                },
                enabled: !!user,
            },
            {
                queryKey: ['tasks', 'completed', user?.id ?? ''],
                queryFn: async (): Promise<{ completed_at: string | null }[]> => {
                    const { data, error } = await supabase
                        .from("tasks")
                        .select("completed_at")
                        .eq("user_id", user!.id)
                        .eq("is_completed", true)
                        .order("completed_at", { ascending: false });
                    if (error) throw error;
                    return data || [];
                },
                enabled: !!user,
            },
        ],
        combine: (queryResults) => {
            const [stickersResult, userStickersResult, tasksResult] = queryResults;

            // Calculate streak from completed tasks (moved from useEffect)
            const streak = calculateStreak(tasksResult.data || []);

            return {
                stickers: stickersResult.data || [],
                userStickers: (userStickersResult.data || []) as UserSticker[],
                streak,
                isPending: queryResults.some(r => r.isPending),
                isFetching: queryResults.some(r => r.isFetching),
                isError: queryResults.some(r => r.isError),
                error: queryResults.find(r => r.error)?.error,
            };
        },
    });

    // Roll for a sticker drop when completing a task
    const rollForSticker = useCallback(async (taskId: string): Promise<Sticker | null> => {
        if (!user || results.stickers.length === 0) return null;

        // 20% chance to drop
        if (Math.random() > DROP_CHANCE) return null;

        // Weighted random selection by rarity
        const weightedStickers = results.stickers.flatMap((sticker) => {
            const weight = RARITY_WEIGHTS[sticker.rarity as keyof typeof RARITY_WEIGHTS] || 10;
            return Array(weight).fill(sticker);
        });

        const randomSticker = weightedStickers[Math.floor(Math.random() * weightedStickers.length)];

        // Award the sticker
        const { error } = await supabase.from("user_stickers").insert({
            user_id: user.id,
            sticker_id: randomSticker.id,
            task_id: taskId,
        });

        if (error) {
            handleError(error, { component: 'useStickers', action: 'award sticker', silent: true });
            return null;
        }

        // Show toast notification
        toast({
            title: `You found a ${randomSticker.rarity} sticker!`,
            description: `"${randomSticker.name}" added to your Sticker Book!`,
        });

        // Invalidate cache to refresh user stickers
        await queryClient.invalidateQueries({ queryKey: queryKeys.stickers.byUser(user.id) });

        return randomSticker;
    }, [user, results.stickers, toast, queryClient]);

    return {
        stickers: results.stickers,
        userStickers: results.userStickers,
        streak: results.streak,
        loading: results.isPending,      // Backward compatible
        isFetching: results.isFetching,  // NEW
        isError: results.isError,        // NEW
        error: results.error,            // NEW
        rollForSticker,
        refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.stickers.byUser(user?.id ?? '') }),
    };
}
