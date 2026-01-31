import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Storage key for tracking which excused task IDs have been shown to user.
 * This prevents showing the same notification multiple times.
 */
const SHOWN_EXCUSED_KEY = "excused-tasks-shown";

/** Expiry time for shown task entries (24 hours in milliseconds) */
const EXPIRY_MS = 24 * 60 * 60 * 1000;

interface ShownEntry {
  id: string;
  timestamp: number;
}

/**
 * Hook that shows toast notification when tasks have been excused by coach.
 *
 * Per CONTEXT.md:
 * - Student sees toast: "X tasks were excused by your coach"
 * - Toast expires after 1 day (entries older than 24 hours are cleaned up)
 * - Combined if multiple tasks excused
 *
 * Implementation approach:
 * 1. On mount, query for excused tasks for this student
 * 2. Store shown task IDs with timestamps in localStorage
 * 3. Clean up entries older than 24 hours to prevent unbounded growth
 * 4. If any new excused tasks (not in localStorage): show toast, update localStorage
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

        // Get previously shown entries from localStorage
        let shownEntries: ShownEntry[] = [];
        try {
          const stored = localStorage.getItem(SHOWN_EXCUSED_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Handle legacy format (array of strings) by migrating to new format
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
              shownEntries = parsed.map((id: string) => ({ id, timestamp: Date.now() }));
            } else {
              shownEntries = parsed;
            }
          }
        } catch {
          // If parsing fails, start fresh
          shownEntries = [];
        }

        // Clean up entries older than 24 hours to prevent unbounded localStorage growth
        const now = Date.now();
        shownEntries = shownEntries.filter((entry) => now - entry.timestamp < EXPIRY_MS);

        // Find excused tasks that haven't been shown yet
        const shownIds = new Set(shownEntries.map((e) => e.id));
        const newExcused = excusedTasks.filter((t) => !shownIds.has(t.id));

        if (newExcused.length > 0) {
          // Mark as shown immediately to prevent duplicate toasts
          hasShownRef.current = true;

          // Show toast with count
          toast({
            title: "Tasks Excused",
            description: `${newExcused.length} task${newExcused.length > 1 ? "s were" : " was"} excused by your coach`,
          });

          // Update localStorage with new entries (include timestamp for expiry)
          const newEntries: ShownEntry[] = newExcused.map((t) => ({ id: t.id, timestamp: now }));
          const allEntries = [...shownEntries, ...newEntries];
          try {
            localStorage.setItem(SHOWN_EXCUSED_KEY, JSON.stringify(allEntries));
          } catch {
            // Silently fail if localStorage is full
          }
        } else if (shownEntries.length > 0) {
          // Even if no new tasks, save cleaned-up entries to localStorage
          try {
            localStorage.setItem(SHOWN_EXCUSED_KEY, JSON.stringify(shownEntries));
          } catch {
            // Silently fail
          }
        }
      } catch (err) {
        console.error("[useExcusedNotification] Unexpected error:", err);
      }
    };

    checkExcusedTasks();
  }, [studentId, toast]);
}
