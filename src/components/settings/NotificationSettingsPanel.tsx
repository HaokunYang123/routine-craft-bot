import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { type NotificationPrefs, useNotificationPrefs } from "@/hooks/useNotificationPrefs";

const defaultPrefs: NotificationPrefs = {
  notify_on_task_completion: false,
  notify_on_task_assignment: false,
};

export function NotificationSettingsPanel() {
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const { prefs, isLoading, updatePrefs } = useNotificationPrefs();
  const [localPrefs, setLocalPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!prefs) return;
    if (timeoutRef.current || savingRef.current) return;
    setLocalPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (profile?.role !== "coach" && profile?.role !== "student" && !profileLoading) {
    return null;
  }

  const queueUpdate = (updates: Partial<NotificationPrefs>) => {
    setLocalPrefs((prev) => {
      const nextPrefs = { ...prev, ...updates };

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        timeoutRef.current = null;
        savingRef.current = true;
        setIsSaving(true);

        try {
          await updatePrefs(nextPrefs);
          toast({
            title: "Notifications Updated",
            description: "Your email preferences have been saved.",
          });
        } catch (error) {
          setLocalPrefs(prefs ?? defaultPrefs);
          toast({
            title: "Update failed",
            description: error instanceof Error ? error.message : "Could not save notification preferences.",
            variant: "destructive",
          });
        } finally {
          savingRef.current = false;
          setIsSaving(false);
        }
      }, 500);

      return nextPrefs;
    });
  };

  const role = profile?.role;
  const email = profile?.email || "your email";
  const loadingState = isLoading || profileLoading;

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-btn-secondary/20 p-2">
            <Bell className="h-5 w-5 text-btn-secondary" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">Email Notifications</CardTitle>
            <CardDescription>Notifications will be sent to {email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {role === "coach" && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-1">
              <Label htmlFor="notify-on-task-completion" className="text-sm font-medium text-foreground">
                Notify me when a student completes a task
              </Label>
              <p className="text-sm text-muted-foreground">Get an email when student work is marked complete.</p>
            </div>
            {loadingState ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                id="notify-on-task-completion"
                checked={localPrefs.notify_on_task_completion}
                disabled={isSaving}
                onCheckedChange={(checked) => queueUpdate({ notify_on_task_completion: checked })}
              />
            )}
          </div>
        )}

        {role === "student" && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-1">
              <Label htmlFor="notify-on-task-assignment" className="text-sm font-medium text-foreground">
                Notify me when a new task is assigned
              </Label>
              <p className="text-sm text-muted-foreground">Get an email when your coach assigns a new task.</p>
            </div>
            {loadingState ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                id="notify-on-task-assignment"
                checked={localPrefs.notify_on_task_assignment}
                disabled={isSaving}
                onCheckedChange={(checked) => queueUpdate({ notify_on_task_assignment: checked })}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
