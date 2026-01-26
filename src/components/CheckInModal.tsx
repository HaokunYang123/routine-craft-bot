import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error";
import { Smile, Meh, Frown, Heart } from "lucide-react";

type Sentiment = "great" | "okay" | "tired" | "sore";

interface CheckInModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCheckInComplete?: (sentiment: Sentiment) => void;
}

const sentimentOptions: { value: Sentiment; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "great", label: "Great!", icon: <Smile className="w-8 h-8" />, color: "text-green-500 hover:bg-green-500/10" },
    { value: "okay", label: "Okay", icon: <Meh className="w-8 h-8" />, color: "text-yellow-500 hover:bg-yellow-500/10" },
    { value: "tired", label: "Tired", icon: <Frown className="w-8 h-8" />, color: "text-orange-500 hover:bg-orange-500/10" },
    { value: "sore", label: "Sore", icon: <Heart className="w-8 h-8" />, color: "text-red-500 hover:bg-red-500/10" },
];

export function CheckInModal({ open, onOpenChange, onCheckInComplete }: CheckInModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(null);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

    useEffect(() => {
        if (user && open) {
            checkTodayLog();
        }
    }, [user, open]);

    const checkTodayLog = async () => {
        if (!user) return;

        const today = new Date().toISOString().split("T")[0];
        const storageKey = `check_in_${user.id}`;
        const lastCheckIn = localStorage.getItem(storageKey);

        // Check local storage first to avoid unnecessary API calls and potential JWT errors
        if (lastCheckIn === today) {
            setHasCheckedInToday(true);
            onOpenChange(false);
            return;
        }

        // If not in local storage, check DB (in case they logged in from another device)
        const { data, error } = await supabase
            .from("student_logs")
            .select("id, sentiment")
            .eq("user_id", user.id)
            .eq("log_date", today)
            .maybeSingle();

        if (data) {
            setHasCheckedInToday(true);
            localStorage.setItem(storageKey, today); // Sync local storage
            onOpenChange(false);
        } else if (error) {
            // If API fails (e.g. JWT error), we just let them try to log again or ignore
            handleError(error, { component: 'CheckInModal', action: 'check today log', silent: true });
        }
    };

    const handleSubmit = async () => {
        if (!user || !selectedSentiment) return;

        setSaving(true);
        const today = new Date().toISOString().split("T")[0];
        const storageKey = `check_in_${user.id}`;

        const { error } = await supabase.from("student_logs").upsert({
            user_id: user.id,
            log_date: today,
            sentiment: selectedSentiment,
            notes: notes.trim() || null,
        }, {
            onConflict: "user_id,log_date",
        });

        if (error) {
            handleError(error, { component: 'CheckInModal', action: 'submit check-in' });
        } else {
            // Success
            localStorage.setItem(storageKey, today);
            const isFatigued = selectedSentiment === "tired" || selectedSentiment === "sore";
            toast({
                title: isFatigued ? "Take it easy today! 💪" : "Logged! Let's go! 🚀",
                description: isFatigued
                    ? "Your coach has been notified. We'll adjust your tasks."
                    : "Your check-in has been recorded.",
            });
            onCheckInComplete?.(selectedSentiment);
            onOpenChange(false);
        }

        setSaving(false);
    };

    if (hasCheckedInToday) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">How are you feeling today?</DialogTitle>
                    <DialogDescription className="text-center">
                        Let us know so we can adjust your routine if needed.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-4 gap-2 py-4">
                    {sentimentOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setSelectedSentiment(option.value)}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${selectedSentiment === option.value
                                ? "border-primary bg-primary/10"
                                : "border-transparent hover:border-muted"
                                } ${option.color}`}
                        >
                            {option.icon}
                            <span className="text-xs mt-1 text-foreground">{option.label}</span>
                        </button>
                    ))}
                </div>

                {(selectedSentiment === "tired" || selectedSentiment === "sore") && (
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">
                            Want to share more? (optional)
                        </label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., Didn't sleep well, or my leg hurts..."
                            rows={2}
                        />
                    </div>
                )}

                <Button
                    onClick={handleSubmit}
                    disabled={!selectedSentiment || saving}
                    className="w-full mt-2"
                    variant="hero"
                >
                    {saving ? "Saving..." : "Log Check-in"}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
