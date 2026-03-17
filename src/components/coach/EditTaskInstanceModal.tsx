import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEditTaskInstance } from "@/hooks/useEditTaskInstance";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface EditableTaskInstance {
  instance_id: string;
  task_title: string;
  current_date: string;
  current_start_time: string | null;
  current_end_time: string | null;
  assignment_id: string | null;
  status?: string;
}

interface EditTaskInstanceModalProps {
  instanceToEdit: EditableTaskInstance | null;
  isOpen: boolean;
  onDismiss: () => void;
  onSaveComplete: () => void;
}

type RecurringAssignmentState = {
  isRecurring: boolean;
  scheduleId: string | null;
  scheduleType: string | null;
};

const todayDateString = () => new Date().toISOString().split("T")[0];

const normalizeTimeForInput = (value: string | null) => (value ? value.slice(0, 5) : "");

const getWeekday = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1).getDay();
};

export function EditTaskInstanceModal({
  instanceToEdit,
  isOpen,
  onDismiss,
  onSaveComplete,
}: EditTaskInstanceModalProps) {
  const { toast } = useToast();
  const { editSingleInstance, editRecurringPattern, isEditing } = useEditTaskInstance();

  const [editedDate, setEditedDate] = useState("");
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [modificationReason, setModificationReason] = useState("");
  const [applyToFuture, setApplyToFuture] = useState(true);
  const [recurringAssignment, setRecurringAssignment] = useState<RecurringAssignmentState>({
    isRecurring: false,
    scheduleId: null,
    scheduleType: null,
  });
  const [loadingRecurringState, setLoadingRecurringState] = useState(false);

  useEffect(() => {
    if (!instanceToEdit || !isOpen) {
      setRecurringAssignment({ isRecurring: false, scheduleId: null, scheduleType: null });
      setLoadingRecurringState(false);
      return;
    }

    setEditedDate(instanceToEdit.current_date);
    setEditedStartTime(normalizeTimeForInput(instanceToEdit.current_start_time));
    setEditedEndTime(normalizeTimeForInput(instanceToEdit.current_end_time));
    setModificationReason("");
    setApplyToFuture(true);

    if (!instanceToEdit.assignment_id) {
      setRecurringAssignment({ isRecurring: false, scheduleId: null, scheduleType: null });
      return;
    }

    let isCancelled = false;
    setLoadingRecurringState(true);

    supabase
      .from("assignments")
      .select("id, schedule_type")
      .eq("id", instanceToEdit.assignment_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (isCancelled) return;

        if (error || !data || data.schedule_type === "once") {
          setRecurringAssignment({ isRecurring: false, scheduleId: null, scheduleType: data?.schedule_type ?? null });
          return;
        }

        setRecurringAssignment({
          isRecurring: true,
          scheduleId: data.id,
          scheduleType: data.schedule_type,
        });
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingRecurringState(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [instanceToEdit, isOpen]);

  const recurringHelperText = useMemo(() => {
    if (!recurringAssignment.isRecurring) return null;
    return "Applying to all future occurrences updates the recurring weekday/time pattern for this assignment.";
  }, [recurringAssignment.isRecurring]);

  const handleSave = async () => {
    if (!instanceToEdit) return;

    try {
      if (recurringAssignment.isRecurring && applyToFuture && recurringAssignment.scheduleId) {
        await editRecurringPattern({
          scheduleId: recurringAssignment.scheduleId,
          revisedWeekday: getWeekday(editedDate),
          revisedPatternStart: editedStartTime || undefined,
          revisedPatternEnd: editedEndTime || undefined,
          cascadeToFuture: true,
        });
      } else {
        await editSingleInstance({
          instanceId: instanceToEdit.instance_id,
          revisedDate: editedDate,
          revisedStartTime: editedStartTime || undefined,
          revisedEndTime: editedEndTime || undefined,
          modificationReason: modificationReason.trim() || undefined,
        });
      }

      toast({
        title: "Task updated",
      });
      onSaveComplete();
      onDismiss();
    } catch (saveError) {
      const description =
        saveError instanceof Error
          ? saveError.message
          : "Something went wrong. Please try again.";

      toast({
        title: "Couldn't update task",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="coach-theme dark max-w-lg text-foreground">
        <DialogHeader>
          <DialogTitle>Edit Task Instance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">{instanceToEdit?.task_title || "Task"}</p>
            <p className="text-xs text-muted-foreground">
              Update the scheduled date and time for this task instance.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-date">Date</Label>
            <Input
              id="edit-task-date"
              type="date"
              min={todayDateString()}
              value={editedDate}
              onChange={(event) => setEditedDate(event.target.value)}
              disabled={isEditing || loadingRecurringState}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-start-time">Start time</Label>
              <Input
                id="edit-task-start-time"
                type="time"
                value={editedStartTime}
                onChange={(event) => setEditedStartTime(event.target.value)}
                disabled={isEditing || loadingRecurringState}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-end-time">End time</Label>
              <Input
                id="edit-task-end-time"
                type="time"
                value={editedEndTime}
                onChange={(event) => setEditedEndTime(event.target.value)}
                disabled={isEditing || loadingRecurringState}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-reason">Modification reason</Label>
            <Textarea
              id="edit-task-reason"
              value={modificationReason}
              onChange={(event) => setModificationReason(event.target.value.slice(0, 200))}
              placeholder="Reason for change (optional)"
              rows={3}
              disabled={isEditing || loadingRecurringState}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Up to 200 characters.
            </p>
          </div>

          {loadingRecurringState && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking recurring assignment settings...
            </div>
          )}

          {!loadingRecurringState && recurringAssignment.isRecurring && (
            <div className="space-y-2 rounded-md border border-border bg-card/60 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="apply-to-future"
                  checked={applyToFuture}
                  onCheckedChange={(checked) => setApplyToFuture(checked === true)}
                  disabled={isEditing}
                />
                <div className="space-y-1">
                  <Label htmlFor="apply-to-future" className="cursor-pointer">
                    Apply changes to all future occurrences
                  </Label>
                  {recurringHelperText && (
                    <p className="text-xs text-muted-foreground">{recurringHelperText}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onDismiss}
            disabled={isEditing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!instanceToEdit || !editedDate || isEditing || loadingRecurringState}
            className="bg-cta-primary hover:bg-cta-hover text-white"
          >
            {isEditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
