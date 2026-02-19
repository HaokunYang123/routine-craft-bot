import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { format, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { queryKeys } from "@/lib/queries/keys";

const LINK_CODE_LENGTH = 6;
const INVALID_CODE_MESSAGE = "Invalid code. Please check with your child.";

type ParentTab = "schedule" | "notes";
type TaskStatus = "pending" | "completed" | "missed" | "excused";

interface ParentLinkRow {
  student_id: string;
}

interface ParentChildRow {
  id: string;
  child_id: string;
}

interface LinkedChild {
  linkId: string;
  childId: string;
  displayName: string;
}

interface ParentTask {
  id: string;
  name: string;
  description: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
}

interface ParentNote {
  id: string;
  title: string | null;
  content: string;
  from_user_id: string;
  to_user_id: string | null;
  group_id: string | null;
  created_at: string | null;
  sender_name?: string;
}

interface GroupedTasks {
  upcoming: Array<{ date: string; tasks: ParentTask[] }>;
  past: Array<{ date: string; tasks: ParentTask[] }>;
}

function sanitizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LINK_CODE_LENGTH);
}

function parseTaskDate(dateString: string) {
  const parsed = parseISO(dateString);
  return isValid(parsed) ? parsed : null;
}

function getDateLabel(dateString: string) {
  const parsed = parseTaskDate(dateString);
  return parsed ? format(parsed, "EEEE, MMM d, yyyy") : dateString;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Unknown time";
  const parsed = parseISO(timestamp);
  return isValid(parsed) ? format(parsed, "MMM d, yyyy h:mm a") : timestamp;
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime && !endTime) return "All day";

  const formatClock = (value: string) => {
    const [hourRaw = "0", minuteRaw = "0"] = value.split(":");
    const date = new Date();
    date.setHours(Number.parseInt(hourRaw, 10) || 0, Number.parseInt(minuteRaw, 10) || 0, 0, 0);
    return format(date, "h:mm a");
  };

  if (startTime && endTime) {
    return `${formatClock(startTime)} to ${formatClock(endTime)}`;
  }
  if (startTime) {
    return `${formatClock(startTime)} onward`;
  }
  return `Until ${formatClock(endTime as string)}`;
}

function toDateTime(task: ParentTask) {
  const date = parseTaskDate(task.scheduled_date) ?? new Date(0);
  const [hourRaw = "0", minuteRaw = "0"] = (task.start_time ?? "00:00:00").split(":");
  const withTime = new Date(date);
  withTime.setHours(Number.parseInt(hourRaw, 10) || 0, Number.parseInt(minuteRaw, 10) || 0, 0, 0);
  return withTime;
}

function getStatusMeta(status: string) {
  const normalized = status.toLowerCase() as TaskStatus;
  if (normalized === "completed") {
    return {
      label: "Completed",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    };
  }
  if (normalized === "missed") {
    return {
      label: "Missed",
      className: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    };
  }
  if (normalized === "excused") {
    return {
      label: "Excused",
      className: "border-slate-500/40 bg-slate-500/20 text-slate-200",
    };
  }
  return {
    label: "Pending",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  };
}

export default function ParentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ParentTab>("schedule");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [unlinkingChildId, setUnlinkingChildId] = useState<string | null>(null);

  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ParentTask[]>([]);
  const [notes, setNotes] = useState<ParentNote[]>([]);

  const db = supabase as unknown as {
    from: (table: string) => {
      select: (...args: unknown[]) => {
        eq: (...params: unknown[]) => {
          maybeSingle: () => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
          order: (...orderArgs: unknown[]) => Promise<{ data: unknown; error: { message?: string } | null }>;
        };
        insert: (...insertArgs: unknown[]) => Promise<{ error: { code?: string; message?: string } | null }>;
        delete: () => {
          eq: (...eqArgs: unknown[]) => {
            eq: (...nestedEqArgs: unknown[]) => Promise<{ error: { message?: string } | null }>;
          };
        };
      };
    };
  };

  const selectedChild = useMemo(
    () => children.find((child) => child.childId === selectedChildId) ?? null,
    [children, selectedChildId]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all }),
      queryClient.invalidateQueries({ queryKey: ["task_instances"] }),
      queryClient.invalidateQueries({ queryKey: ["notes"] }),
      queryClient.invalidateQueries({ queryKey: ["parent_children"] }),
    ]);
  }, [queryClient]);

  const loadChildren = useCallback(
    async (preferredChildId?: string) => {
      if (!user) {
        setChildren([]);
        setSelectedChildId(null);
        setLoadingChildren(false);
        return;
      }

      setLoadingChildren(true);
      setContentError(null);

      const { data: parentChildrenData, error: parentChildrenError } = await db
        .from("parent_children")
        .select("id, child_id")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: true });

      if (parentChildrenError) {
        setChildren([]);
        setSelectedChildId(null);
        setContentError("Could not load linked children.");
        setLoadingChildren(false);
        return;
      }

      const parentChildren = (parentChildrenData ?? []) as ParentChildRow[];
      const childIds = parentChildren.map((row) => row.child_id);

      if (childIds.length === 0) {
        setChildren([]);
        setSelectedChildId(null);
        setTasks([]);
        setNotes([]);
        setLoadingChildren(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", childIds);

      if (profileError) {
        setContentError("Could not load child profiles.");
      }

      const displayNameById = new Map<string, string>();
      for (const profile of profileData ?? []) {
        displayNameById.set(profile.user_id, profile.display_name?.trim() || "Child");
      }

      const nextChildren: LinkedChild[] = parentChildren.map((row) => ({
        linkId: row.id,
        childId: row.child_id,
        displayName: displayNameById.get(row.child_id) || "Child",
      }));

      setChildren(nextChildren);
      setSelectedChildId((previous) => {
        if (preferredChildId && nextChildren.some((child) => child.childId === preferredChildId)) {
          return preferredChildId;
        }
        if (previous && nextChildren.some((child) => child.childId === previous)) {
          return previous;
        }
        return nextChildren[0]?.childId ?? null;
      });
      setLoadingChildren(false);
    },
    [db, user]
  );

  const loadSelectedChildContent = useCallback(async (childId: string) => {
    setLoadingContent(true);
    setContentError(null);

    const tasksPromise = supabase
      .from("task_instances")
      .select("id, name, description, scheduled_date, start_time, end_time, status")
      .eq("assignee_id", childId)
      .order("scheduled_date", { ascending: false })
      .order("start_time", { ascending: true });

    const directNotesPromise = supabase
      .from("notes")
      .select("id, title, content, from_user_id, to_user_id, group_id, created_at")
      .eq("to_user_id", childId)
      .order("created_at", { ascending: false });

    const childGroupsPromise = supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", childId);

    const [tasksResult, directNotesResult, childGroupsResult] = await Promise.all([
      tasksPromise,
      directNotesPromise,
      childGroupsPromise,
    ]);

    const nextTasks = (tasksResult.data ?? []) as ParentTask[];
    setTasks(nextTasks);

    const groupIds = (childGroupsResult.data ?? []).map((group) => group.group_id);

    let groupNotes: ParentNote[] = [];
    if (groupIds.length > 0) {
      const { data: groupNotesData, error: groupNotesError } = await supabase
        .from("notes")
        .select("id, title, content, from_user_id, to_user_id, group_id, created_at")
        .in("group_id", groupIds)
        .is("to_user_id", null)
        .order("created_at", { ascending: false });

      if (groupNotesError) {
        setContentError("Could not load notes.");
      } else {
        groupNotes = (groupNotesData ?? []) as ParentNote[];
      }
    }

    const mergedNotes = new Map<string, ParentNote>();
    for (const note of (directNotesResult.data ?? []) as ParentNote[]) {
      mergedNotes.set(note.id, note);
    }
    for (const note of groupNotes) {
      mergedNotes.set(note.id, note);
    }

    const mergedNotesList = Array.from(mergedNotes.values()).sort((a, b) => {
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      return bTime - aTime;
    });

    const senderIds = [...new Set(mergedNotesList.map((note) => note.from_user_id))];
    let senderNames = new Map<string, string>();
    if (senderIds.length > 0) {
      const { data: senderProfiles, error: senderProfilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", senderIds);

      if (senderProfilesError) {
        setContentError("Could not load note authors.");
      } else {
        senderNames = new Map(
          (senderProfiles ?? []).map((profile) => [profile.user_id, profile.display_name?.trim() || "Unknown"])
        );
      }
    }

    setNotes(
      mergedNotesList.map((note) => ({
        ...note,
        sender_name: senderNames.get(note.from_user_id) || "Unknown",
      }))
    );

    if (tasksResult.error || directNotesResult.error || childGroupsResult.error) {
      setContentError("Could not load all child data.");
    }

    setLoadingContent(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void loadChildren();
  }, [authLoading, loadChildren]);

  useEffect(() => {
    if (!selectedChildId) return;
    void loadSelectedChildContent(selectedChildId);
  }, [selectedChildId, loadSelectedChildContent]);

  const groupedTasks = useMemo<GroupedTasks>(() => {
    if (tasks.length === 0) {
      return { upcoming: [], past: [] };
    }

    const today = startOfDay(new Date());
    const upcomingTasks = tasks
      .filter((task) => {
        const taskDate = parseTaskDate(task.scheduled_date);
        if (!taskDate) return false;
        return !isBefore(taskDate, today);
      })
      .sort((a, b) => toDateTime(a).getTime() - toDateTime(b).getTime());

    const pastTasks = tasks
      .filter((task) => {
        const taskDate = parseTaskDate(task.scheduled_date);
        if (!taskDate) return false;
        return isBefore(taskDate, today);
      })
      .sort((a, b) => toDateTime(b).getTime() - toDateTime(a).getTime());

    const groupByDate = (list: ParentTask[]) => {
      const grouped = new Map<string, ParentTask[]>();
      for (const task of list) {
        const bucket = grouped.get(task.scheduled_date) ?? [];
        bucket.push(task);
        grouped.set(task.scheduled_date, bucket);
      }
      return Array.from(grouped.entries()).map(([date, dateTasks]) => ({
        date,
        tasks: dateTasks,
      }));
    };

    return {
      upcoming: groupByDate(upcomingTasks),
      past: groupByDate(pastTasks),
    };
  }, [tasks]);

  const handleLinkSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const code = sanitizeCode(linkCode);
    setLinkCode(code);
    setLinkError(null);
    setLinkSuccess(null);

    if (code.length !== LINK_CODE_LENGTH) {
      setLinkError(INVALID_CODE_MESSAGE);
      return;
    }

    setLinking(true);

    const { data: linkRow, error: lookupError } = await db
      .from("parent_links")
      .select("student_id")
      .eq("link_code", code)
      .maybeSingle();

    if (lookupError || !linkRow) {
      setLinkError(INVALID_CODE_MESSAGE);
      setLinking(false);
      return;
    }

    const studentId = (linkRow as ParentLinkRow).student_id;

    const { error: insertError } = await db
      .from("parent_children")
      .insert({ parent_id: user.id, child_id: studentId });

    if (insertError) {
      if (insertError.code === "23505") {
        setLinkError("This child is already linked to your account.");
      } else {
        setLinkError(insertError.message ?? "Could not link this child. Please try again.");
      }
      setLinking(false);
      return;
    }

    const { data: childProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", studentId)
      .maybeSingle();

    const childName = childProfile?.display_name?.trim() || "your child";
    setLinkSuccess(`Successfully linked ${childName}.`);
    setLinkCode("");
    setShowLinkForm(false);
    await loadChildren(studentId);
    setLinking(false);
  };

  const handleUnlink = async (child: LinkedChild) => {
    if (!user) return;
    setUnlinkingChildId(child.childId);
    setContentError(null);
    setLinkSuccess(null);

    const { error } = await db
      .from("parent_children")
      .delete()
      .eq("parent_id", user.id)
      .eq("child_id", child.childId);

    if (error) {
      setContentError(error.message ?? "Could not unlink child.");
      setUnlinkingChildId(null);
      return;
    }

    await loadChildren();
    setUnlinkingChildId(null);
  };

  const renderLinkCard = (compact = false) => (
    <Card className={compact ? "border-border bg-card/80" : "w-full max-w-lg border-border bg-card/80"}>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold text-foreground">Link Your Child's Account</CardTitle>
        <CardDescription>Enter your child's 6-character code to connect their account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleLinkSubmit}>
          <Input
            value={linkCode}
            onChange={(event) => {
              setLinkCode(sanitizeCode(event.target.value));
              setLinkError(null);
            }}
            placeholder="ABC123"
            maxLength={LINK_CODE_LENGTH}
            autoComplete="off"
            className="h-12 rounded-xl text-center font-mono text-lg tracking-[0.35em] uppercase"
          />
          {linkError && <p className="text-sm text-destructive">{linkError}</p>}
          {linkSuccess && <p className="text-sm text-emerald-300">{linkSuccess}</p>}
          <Button
            type="submit"
            className="h-11 w-full bg-cta-primary text-white hover:bg-cta-hover"
            disabled={linking}
          >
            {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  if (authLoading || loadingChildren) {
    return (
      <ProtectedRoute requiredRole="parent">
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="coach-theme min-h-screen bg-background p-6">
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        </PullToRefresh>
      </ProtectedRoute>
    );
  }

  if (children.length === 0) {
    return (
      <ProtectedRoute requiredRole="parent">
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="coach-theme min-h-screen bg-background p-4 md:p-6">
          <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
            {renderLinkCard()}
          </div>
        </div>
        </PullToRefresh>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="parent">
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="coach-theme min-h-screen bg-background p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6 pb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Parent Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Viewing {selectedChild?.displayName ?? "your child"}'s schedule and notes.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkForm((current) => !current);
                setLinkError(null);
              }}
              className="w-full sm:w-auto"
            >
              {showLinkForm ? "Hide Link Form" : "Link Another Child"}
            </Button>
          </div>

          {linkSuccess && !showLinkForm && (
            <Card className="border-emerald-500/35 bg-emerald-500/10">
              <CardContent className="p-4">
                <p className="text-sm text-emerald-300">{linkSuccess}</p>
              </CardContent>
            </Card>
          )}

          {showLinkForm && renderLinkCard(true)}

          {children.length > 1 ? (
            <Card className="border-border bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Children</CardTitle>
                <CardDescription>Select a child to switch views.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {children.map((child) => {
                    const isSelected = selectedChildId === child.childId;
                    return (
                      <div
                        key={child.linkId}
                        className={`shrink-0 rounded-full border pr-1 ${
                          isSelected ? "border-primary/60 bg-primary/10" : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedChildId(child.childId)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {child.displayName}
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-2 text-xs text-muted-foreground hover:text-destructive"
                                disabled={unlinkingChildId === child.childId}
                              >
                                Unlink
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Unlink {child.displayName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the child from your parent dashboard. You can link again later with
                                  a new code.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => {
                                    void handleUnlink(child);
                                  }}
                                  disabled={unlinkingChildId === child.childId}
                                >
                                  {unlinkingChildId === child.childId && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  Unlink
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : selectedChild ? (
            <Card className="border-border bg-card/80">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Linked child</p>
                  <p className="text-lg font-medium text-foreground">{selectedChild.displayName}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={unlinkingChildId === selectedChild.childId}
                    >
                      Unlink
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unlink {selectedChild.displayName}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the child from your parent dashboard. You can link again later with a new code.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          void handleUnlink(selectedChild);
                        }}
                        disabled={unlinkingChildId === selectedChild.childId}
                      >
                        {unlinkingChildId === selectedChild.childId && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Unlink
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ) : null}

          {contentError && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="p-4">
                <p className="text-sm text-destructive">{contentError}</p>
              </CardContent>
            </Card>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ParentTab)}
            className="space-y-5"
          >
            <TabsList className="grid w-full grid-cols-2 sm:w-[320px]">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-5">
              {loadingContent ? (
                <Card>
                  <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading schedule...
                  </CardContent>
                </Card>
              ) : tasks.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">No tasks assigned yet.</CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {groupedTasks.upcoming.length > 0 && (
                    <section className="space-y-4">
                      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Upcoming</h2>
                      {groupedTasks.upcoming.map((group) => (
                        <Card key={`upcoming-${group.date}`} className="border-border bg-card/80">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{getDateLabel(group.date)}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {group.tasks.map((task) => {
                              const statusMeta = getStatusMeta(task.status);
                              return (
                                <div
                                  key={task.id}
                                  className="rounded-xl border border-border/70 bg-muted/20 p-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{task.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {formatTimeRange(task.start_time, task.end_time)}
                                      </p>
                                    </div>
                                    <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      ))}
                    </section>
                  )}

                  {groupedTasks.past.length > 0 && (
                    <section className="space-y-4">
                      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Past</h2>
                      {groupedTasks.past.map((group) => (
                        <Card key={`past-${group.date}`} className="border-border bg-card/80">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{getDateLabel(group.date)}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {group.tasks.map((task) => {
                              const statusMeta = getStatusMeta(task.status);
                              return (
                                <div
                                  key={task.id}
                                  className="rounded-xl border border-border/70 bg-muted/20 p-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{task.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {formatTimeRange(task.start_time, task.end_time)}
                                      </p>
                                    </div>
                                    <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      ))}
                    </section>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              {loadingContent ? (
                <Card>
                  <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading notes...
                  </CardContent>
                </Card>
              ) : notes.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">No notes yet.</CardContent>
                </Card>
              ) : (
                notes.map((note) => (
                  <Card key={note.id} className="border-border bg-card/80">
                    <CardContent className="space-y-3 p-5">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{note.title?.trim() || "Note"}</p>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">{note.content}</p>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>From: {note.sender_name || "Unknown"}</span>
                        <span>{formatTimestamp(note.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </PullToRefresh>
    </ProtectedRoute>
  );
}
