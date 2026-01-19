import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Sticker {
    id: string;
    name: string;
    image_url: string;
    rarity: string;
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

export function useStickers() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [userStickers, setUserStickers] = useState<UserSticker[]>([]);
    const [loading, setLoading] = useState(true);

    const [streak, setStreak] = useState(0);

    // Fetch all available stickers, user's earned stickers, and calculate streak
    const fetchStickers = useCallback(async () => {
        if (!user) return;

        const [allStickers, earnedStickers, completedTasks] = await Promise.all([
            supabase.from("stickers").select("*"),
            supabase
                .from("user_stickers")
                .select("*, sticker:stickers(*)")
                .eq("user_id", user.id)
                .order("earned_at", { ascending: false }),
            supabase
                .from("tasks")
                .select("completed_at")
                .eq("user_id", user.id)
                .eq("is_completed", true)
                .order("completed_at", { ascending: false })
        ]);

        if (allStickers.data) setStickers(allStickers.data);
        if (earnedStickers.data) {
            setUserStickers(earnedStickers.data as unknown as UserSticker[]);
        }

        // Calculate Streak
        if (completedTasks.data) {
            const dates = completedTasks.data.map(t => new Date(t.completed_at).toDateString());
            const uniqueDates = [...new Set(dates)];
            let currentStreak = 0;
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            // Check if streak is active (completed today or yesterday)
            if (uniqueDates.includes(today)) {
                currentStreak = 1;
                let checkDate = new Date(Date.now() - 86400000);
                while (uniqueDates.includes(checkDate.toDateString())) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
            } else if (uniqueDates.includes(yesterday)) {
                currentStreak = 0; // Streak preserved but not incremented for today yet? 
                // Usually streak means consecutive days including today or ending yesterday.
                // If they haven't done today's task, streak is X (from yesterday).
                // Let's count backwards from yesterday.
                let checkDate = new Date(Date.now() - 86400000);
                while (uniqueDates.includes(checkDate.toDateString())) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
            } else {
                currentStreak = 0;
            }
            setStreak(currentStreak);
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchStickers();
    }, [fetchStickers]);

    // Roll for a sticker drop when completing a task
    const rollForSticker = useCallback(async (taskId: string): Promise<Sticker | null> => {
        if (!user || stickers.length === 0) return null;

        // 20% chance to drop
        if (Math.random() > DROP_CHANCE) return null;

        // Weighted random selection by rarity
        const weightedStickers = stickers.flatMap((sticker) => {
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
            console.error("Failed to award sticker:", error);
            return null;
        }

        // Show toast notification
        toast({
            title: `You found a ${randomSticker.rarity} sticker!`,
            description: `"${randomSticker.name}" added to your Sticker Book!`,
        });

        // Refresh user stickers
        fetchStickers();

        return randomSticker;
    }, [user, stickers, toast, fetchStickers]);

    return {
        stickers,
        userStickers,
        streak,
        loading,
        rollForSticker,
        refetch: fetchStickers,
    };
}
