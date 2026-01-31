import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Storage key for tracking which excused task IDs have been shown to user.
 * This prevents showing the same notification multiple times.
 */
const SHOWN_EXCUSED_KEY = "excused-tasks-shown";

/**
 * Hook that shows toast notification when tasks have been excused by coach.
 *
 * Per CONTEXT.md:
 * - Student sees toast: "X tasks were excused by your coach"
 * - Toast dismisses automatically (1 day expiry - handled by tracking shown IDs)
 * - Combined if multiple tasks excused
 *
 * Implementation approach:
 * 1. On mount, query for excused tasks for this student
 * 2. Store shown task IDs in localStorage
 * 3. If any new excused tasks (not in localStorage): show toast, update localStorage
 */
export function useExcusedNotification(studentId: string) {
  const { toast } = useToast();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!studentId || hasShownRef.current) return;

    const checkExcusedTasks = async () => {
      try {
        // Query excused tasks for this student
        const { data: excusedTasks, error } = await supabase
          .from("task_instances")
          .select("id")
          .eq("assignee_id", studentId)
          .eq("status", "excused");

        if (error) {
          console.error("[useExcusedNotification] Error fetching excused tasks:", error);
          return;
        }

        if (!excusedTasks?.length) return;

        // Get previously shown IDs from localStorage
        let shownIds: string[] = [];
        try {
          const stored = localStorage.getItem(SHOWN_EXCUSED_KEY);
          if (stored) {
            shownIds = JSON.parse(stored);
          }
        } catch {
          // If parsing fails, start fresh
          shownIds = [];
        }

        // Find excused tasks that haven't been shown yet
        const newExcused = excusedTasks.filter((t) => !shownIds.includes(t.id));

        if (newExcused.length > 0) {
          // Mark as shown immediately to prevent duplicate toasts
          hasShownRef.current = true;

          // Show toast with count
          toast({
            title: "Tasks Excused",
            description: `${newExcused.length} task${newExcused.length > 1 ? "s were" : " was"} excused by your coach`,
          });

          // Update localStorage with all shown IDs
          const allShown = [...shownIds, ...newExcused.map((t) => t.id)];
          try {
            localStorage.setItem(SHOWN_EXCUSED_KEY, JSON.stringify(allShown));
          } catch {
            // Silently fail if localStorage is full
          }
        }
      } catch (err) {
        console.error("[useExcusedNotification] Unexpected error:", err);
      }
    };

    checkExcusedTasks();
  }, [studentId, toast]);
}
