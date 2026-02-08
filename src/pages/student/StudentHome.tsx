import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAssignments } from "@/hooks/useAssignments";
import { useTimezone } from "@/hooks/useTimezone";
import { differenceInDays } from "date-fns";
import { cn, safeParseISO } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, Clock, CheckCircle2, UserPlus, Users, ChevronDown, ChevronUp, AlertTriangle, MessageSquare, X, Copy, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useTaskRollover } from "@/hooks/useTaskRollover";
import { useSessionDismissal } from "@/hooks/useSessionDismissal";
import { useExcusedNotification } from "@/hooks/useExcusedNotification";
import { handleError } from "@/lib/error";
import { REALTIME_CHANNELS } from "@/lib/realtime/channels";

interface TaskInstance {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: "pending" | "completed" | "missed";
  student_note: string | null;
  created_at: string | null;
  coach_name?: string;
  group_name?: string;
  group_color?: string;
}

interface ConnectedGroup {
  id: string;
  group_name: string;
  coach_name: string;
  color: string;
}

interface JoinResult {
  success: boolean;
  message?: string;
  error?: string;
  group_name?: string;
}

interface CoachNote {
  id: string;
  content: string;
  title: string | null;
  created_at: string;
  coach_name: string;
  group_name: string | null;
  is_new: boolean;
}

export default function StudentHome() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateTaskStatus } = useAssignments();
  const { todayDateString, yesterdayDateString, formatDate } = useTimezone();
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedGroups, setConnectedGroups] = useState<ConnectedGroup[]>([]);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [showNotes, setShowNotes] = useState(true);
  const [overdueExpanded, setOverdueExpanded] = useState(false);
  const [yesterdayExpanded, setYesterdayExpanded] = useState(false);
  const [parentAccessCode, setParentAccessCode] = useState<string | null>(null);
  const [parentCodeLoaded, setParentCodeLoaded] = useState(false);
  const [parentCodeCopied, setParentCodeCopied] = useState(false);

  // Task rollover categorization (TASK-01, TASK-02)
  // Casts local TaskInstance to match hook's expected type (local type extends hook type with UI fields)
  const { today, overdue, yesterdayCompleted } = useTaskRollover(tasks as unknown as import("@/hooks/useAssignments").TaskInstance[]);

  // Session-scoped dismissal for yesterday's completed section
  const { isDismissed: isYesterdayDismissed, dismiss: dismissYesterday, reset: resetYesterdayDismissal } = useSessionDismissal();

  // Show toast notification for tasks excused by coach (TASK-01, TASK-02)
  useExcusedNotification(user?.id || "");

  // Reset yesterday dismissal when day changes
  useEffect(() => {
    // When todayDateString changes (day boundary crossed), reset yesterday dismissal
    // so the new "yesterday's completed" section can appear
    resetYesterdayDismissal();
  }, [todayDateString, resetYesterdayDismissal]);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!user) return;
    fetchTasks();
    fetchConnectedGroups();
    fetchCoachNotes();
    fetchParentAccessCode();
  }, [user]);

  const markNotesSeen = useCallback(() => {
    if (!user || typeof window === "undefined") return;
    const now = new Date();
    window.localStorage.setItem(`notes-last-seen-${user.id}`, now.toISOString());
    setCoachNotes((prev) => prev.map((note) => ({ ...note, is_new: false })));
  }, [user]);

  useEffect(() => {
    if (!user || !showNotes) return;
    if (!coachNotes.some((note) => note.is_new)) return;
    markNotesSeen();
  }, [coachNotes, showNotes, user, markNotesSeen]);

  // Realtime subscription - refetch on any task_instances changes for this user (REAL-02, REAL-06)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(REALTIME_CHANNELS.STUDENT_ASSIGNMENTS(user.id))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_instances',
          filter: `assignee_id=eq.${user.id}`,
        },
        () => {
          fetchTasks(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Refetch on tab visibility change (handles backgrounded tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchTasks();
        fetchConnectedGroups();
        fetchCoachNotes();
        fetchParentAccessCode();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const fetchConnectedGroups = async () => {
    if (!user) return;

    try {
      // Fetch groups the student is a member of
      const { data: memberships, error } = await supabase
        .from("group_members")
        .select("id, group_id")
        .eq("user_id", user.id);

      if (error) throw error;

      if (!memberships || memberships.length === 0) {
        setConnectedGroups([]);
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);

      // Fetch group details
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, color, coach_id")
        .in("id", groupIds);

      if (!groups) {
        setConnectedGroups([]);
        return;
      }

      // Fetch coach names
      const coachIds = [...new Set(groups.map((g) => g.coach_id))] as string[];
      const { data: coaches } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", coachIds);

      const coachMap: Record<string, string> = {};
      coaches?.forEach((c) => {
        coachMap[c.user_id] = c.display_name || "Coach";
      });

      const connectedGroups: ConnectedGroup[] = groups.map((group) => ({
        id: group.id,
        group_name: group.name,
        coach_name: coachMap[group.coach_id] || "Your Coach",
        color: group.color || "#6366f1",
      }));

      setConnectedGroups(connectedGroups);
    } catch (error) {
      handleError(error, { component: 'StudentHome', action: 'fetch connected groups', silent: true });
    }
  };

  const fetchParentAccessCode = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("parent_links")
        .select("link_code")
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setParentAccessCode(data?.link_code ?? null);
    } catch (error) {
      handleError(error, { component: 'StudentHome', action: 'fetch parent access code', silent: true });
      setParentAccessCode(null);
    } finally {
      setParentCodeLoaded(true);
    }
  };

  const copyParentAccessCode = async () => {
    if (!parentAccessCode) return;

    try {
      await navigator.clipboard.writeText(parentAccessCode);
      setParentCodeCopied(true);
      toast({
        title: "Copied!",
        description: "Parent access code copied to clipboard.",
      });
      setTimeout(() => setParentCodeCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy the code. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const fetchCoachNotes = async () => {
    if (!user) return;

    try {
      // Get the student's group memberships first
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      const groupIds = memberships?.map((m) => m.group_id) || [];

      type NoteRecord = { id: string; content: string | null; title: string | null; created_at: string; from_user_id: string; group_id: string | null };
      let allNotes: NoteRecord[] = [];

      // 1. Notes targeted directly to this student
      const { data: targetedNotes } = await supabase
        .from("notes")
        .select("id, content, title, created_at, from_user_id, group_id")
        .eq("to_user_id", user.id)
        .eq("visibility", "shared")
        .order("created_at", { ascending: false })
        .limit(5);

      if (targetedNotes) allNotes = [...targetedNotes];

      // 2. Broadcast notes to student's groups (to_user_id is null)
      if (groupIds.length > 0) {
        const { data: broadcastNotes } = await supabase
          .from("notes")
          .select("id, content, title, created_at, from_user_id, group_id")
          .in("group_id", groupIds)
          .is("to_user_id", null)
          .eq("visibility", "shared")
          .order("created_at", { ascending: false })
          .limit(5);

        if (broadcastNotes) {
          // Merge and deduplicate
          const existingIds = new Set(allNotes.map(n => n.id));
          broadcastNotes.forEach(note => {
            if (!existingIds.has(note.id)) {
              allNotes.push(note);
            }
          });
        }
      }

      if (allNotes.length === 0) {
        setCoachNotes([]);
        return;
      }

      // Sort by created_at descending and limit to 5
      allNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      allNotes = allNotes.slice(0, 5);

      // Get coach names
      const coachIds = [...new Set(allNotes.map(n => n.from_user_id).filter(Boolean))];
      const noteGroupIds = [...new Set(allNotes.map(n => n.group_id).filter(Boolean))];

      const coachMap: Record<string, string> = {};
      const groupMap: Record<string, string> = {};

      if (coachIds.length > 0) {
        const { data: coaches } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", coachIds);
        coaches?.forEach((c) => {
          coachMap[c.user_id] = c.display_name || "Coach";
        });
      }

      if (noteGroupIds.length > 0) {
        const { data: groups } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", noteGroupIds);
        groups?.forEach((g) => {
          groupMap[g.id] = g.name;
        });
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lastSeenRaw =
        typeof window === "undefined" || !user
          ? null
          : window.localStorage.getItem(`notes-last-seen-${user.id}`);
      const lastSeenParsed = lastSeenRaw ? new Date(lastSeenRaw) : null;
      const lastSeen =
        lastSeenParsed && !Number.isNaN(lastSeenParsed.getTime()) ? lastSeenParsed : oneDayAgo;

      const enrichedNotes: CoachNote[] = allNotes.map(note => ({
        id: note.id,
        content: note.content,
        title: note.title,
        created_at: note.created_at,
        coach_name: coachMap[note.from_user_id] || "Coach",
        group_name: note.group_id ? groupMap[note.group_id] || null : null,
        is_new: new Date(note.created_at) > lastSeen,
      }));

      setCoachNotes(enrichedNotes);
    } catch (error) {
      handleError(error, { component: 'StudentHome', action: 'fetch coach notes', silent: true });
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoiningGroup(true);
    try {
      const { data, error } = await supabase.rpc("join_group_by_code", {
        p_join_code: joinCode.toUpperCase().trim(),
      });

      const result = data as unknown as JoinResult;

      if (error) {
        throw new Error(error.message);
      }

      if (result?.success) {
        toast({
          title: "Joined Successfully!",
          description: result.message || `You've joined ${result.group_name}`,
        });
        setJoinCode("");
        setShowJoinForm(false);
        fetchConnectedGroups();
        fetchTasks(); // Refresh tasks in case there are new ones
      } else {
        toast({
          title: "Could not join",
          description: result?.error || "Invalid join code. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoiningGroup(false);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;

    // Use user's local date, not UTC date (TIME-03)
    const today = todayDateString;
    const yesterday = yesterdayDateString;
    const nextWeek = formatDate(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");

    try {
      // Fetch tasks for rollover display:
      // - All tasks for today (any status)
      // - All pending tasks from before today (overdue)
      // - All completed tasks from yesterday (for yesterday section)
      // Per CONTEXT.md: Section order is Today -> Overdue -> Yesterday
      const { data: todayData, error: todayError } = await supabase
        .from("task_instances")
        .select(`
          *,
          assignments!inner(assigned_by, group_id)
        `)
        .eq("assignee_id", user.id)
        .or(`scheduled_date.eq.${today},scheduled_date.eq.${yesterday},and(scheduled_date.lt.${today},status.eq.pending)`)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (todayError) throw todayError;

      // Fetch upcoming tasks (tomorrow to next week)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("task_instances")
        .select(`
          *,
          assignments!inner(assigned_by, group_id)
        `)
        .eq("assignee_id", user.id)
        .gt("scheduled_date", today)
        .lte("scheduled_date", nextWeek)
        .order("scheduled_date", { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      // Get coach and group info
      const allTasks = [...(todayData || []), ...(upcomingData || [])];
      const coachIds = [...new Set(allTasks.map((t) => t.assignments?.assigned_by).filter(Boolean))] as string[];
      const groupIds = [...new Set(allTasks.map((t) => t.assignments?.group_id).filter(Boolean))] as string[];

      // Fetch coach profiles
      const coachProfiles: Record<string, string> = {};
      if (coachIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", coachIds);
        profiles?.forEach((p) => {
          coachProfiles[p.user_id] = p.display_name || "Coach";
        });
      }

      // Fetch group info
      const groupInfo: Record<string, { name: string; color: string }> = {};
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from("groups")
          .select("id, name, color")
          .in("id", groupIds);
        groups?.forEach((g) => {
          groupInfo[g.id] = { name: g.name, color: g.color || "#6366f1" };
        });
      }

      // Enrich tasks with coach and group info
      const enrichTask = (task: NonNullable<typeof todayData>[number]): TaskInstance => {
        const coachId = task.assignments?.assigned_by;
        const groupId = task.assignments?.group_id;
        const group = groupId ? groupInfo[groupId] : null;
        return {
          ...task,
          coach_name: coachProfiles[coachId] || "Coach",
          group_name: group?.name,
          group_color: group?.color,
        };
      };

      // Store all fetched tasks - let useTaskRollover handle categorization
      // No client-side filtering needed here anymore
      setTasks((todayData || []).map(enrichTask));
      setUpcomingTasks((upcomingData || []).map(enrichTask));
    } catch (error) {
      handleError(error, { component: 'StudentHome', action: 'fetch tasks' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, completed: boolean) => {
    // Update local state immediately for instant UI feedback
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: completed ? "completed" : "pending" }
          : t
      )
    );

    // Use hook mutation - handles optimistic cache update, rollback, and error toast
    const success = await updateTaskStatus(
      taskId,
      completed ? "completed" : "pending",
      undefined, // note
      user?.id, // assigneeId for cache key
      todayDateString // date for cache key (user's local date)
    );

    // Revert local state if mutation failed
    if (!success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: completed ? "pending" : "completed" }
            : t
        )
      );
    }
  };

  const formatDueDate = (dateStr: string) => {
    // Timezone-aware date comparison (TIME-03)
    if (dateStr === todayDateString) return "Today";
    // Calculate tomorrow in user's timezone
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = formatDate(tomorrowDate, "yyyy-MM-dd");
    if (dateStr === tomorrowStr) return "Tomorrow";

    const date = safeParseISO(dateStr);
    if (!date) return "No date";
    const days = differenceInDays(date, new Date());
    if (days <= 7 && days > 0) return `In ${days} days`;
    return formatDate(dateStr, "MMM d");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  // Progress is calculated from TODAY's tasks only (not overdue or yesterday)
  // Per CONTEXT.md: Today's tasks show progress, overdue is separate
  const completedCount = today.filter((t) => t.status === "completed").length;
  const totalCount = today.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Display today in user's timezone (TIME-02)
  const dayNumber = formatDate(new Date(), "d");
  const monthName = formatDate(new Date(), "MMMM");
  const dayName = formatDate(new Date(), "EEEE");

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8">
      {/* Header */}
      <header className="pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {dayName}
            </h1>
            <p className="text-muted-foreground">
              {monthName} {dayNumber}
            </p>
          </div>
          {totalCount > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{progressPercent}%</p>
              <p className="text-sm text-muted-foreground">complete</p>
            </div>
          )}
        </div>
      </header>

      <Card className="border-l-4 border-l-amber-500 bg-card shadow-md rounded-lg border border-border">
        <CardHeader className="p-5 pb-2 md:p-6 md:pb-3">
          <CardTitle className="font-bold text-base">Parent Access Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5 pt-0 md:p-6 md:pt-0">
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "text-3xl font-bold font-mono tracking-[0.3em]",
                parentAccessCode ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {parentCodeLoaded ? (parentAccessCode ?? "Code unavailable") : "..."}
            </span>
            {parentAccessCode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyParentAccessCode()}
                className="shrink-0"
              >
                {parentCodeCopied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="ml-2">{parentCodeCopied ? "Copied!" : "Copy"}</span>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Share this code with your parent so they can monitor your progress.
          </p>
        </CardContent>
      </Card>

      {/* Desktop: top row My Groups + Today's Tasks, second row Coach's Notes full width */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* My Groups Card */}
        <Card className="order-1 min-h-[300px] border-l-4 border-l-blue-500 bg-card shadow-md rounded-lg border border-border lg:col-span-1">
          <CardHeader className="p-5 pb-2 md:p-6 md:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-bold text-base">
              My Groups
              {connectedGroups.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {connectedGroups.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJoinForm(!showJoinForm)}
              className="text-cta-primary border-cta-primary/30 hover:bg-cta-primary/10"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Join Group
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0 md:p-6 md:pt-0">
          {/* Join Form */}
          {showJoinForm && (
            <form onSubmit={handleJoinGroup} className="p-3 bg-muted/30 rounded-lg border border-border space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the group code from your coach to join.
              </p>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g., ABC123)"
                  maxLength={8}
                  className="text-center text-lg tracking-widest font-mono uppercase flex-1"
                  disabled={joiningGroup}
                />
                <Button
                  type="submit"
                  disabled={joiningGroup || !joinCode.trim()}
                  className="bg-cta-primary hover:bg-cta-hover text-white"
                >
                  {joiningGroup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Join"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Connected Groups */}
          {connectedGroups.length > 0 ? (
            <div>
              <button
                onClick={() => setShowConnections(!showConnections)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showConnections ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showConnections ? "Hide" : "Show"} connected groups
              </button>
              {showConnections && (
                <div className="mt-2 space-y-2">
                  {connectedGroups.map((grp) => (
                    <div
                      key={grp.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${grp.color}20` }}
                      >
                        <Users className="w-4 h-4" style={{ color: grp.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {grp.group_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {grp.coach_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            !showJoinForm && (
              <p className="text-sm text-muted-foreground text-center py-2">
                You haven't joined any groups yet. Click "Join Group" to get started!
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Coach's Notes - Always visible */}
      <Card className="order-3 min-h-[300px] border-l-4 border-l-amber-500 bg-card shadow-md rounded-lg border border-border lg:col-span-3">
        <CardHeader className="p-5 pb-2 md:p-6 md:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-bold text-base">
              Coach's Notes
              {coachNotes.some(n => n.is_new) && (
                <Badge className="bg-amber-500 text-white text-xs">New</Badge>
              )}
            </CardTitle>
            {coachNotes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="text-muted-foreground"
              >
                {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0 md:p-6 md:pt-0">
          {coachNotes.length === 0 ? (
            <div className="text-center py-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Notes from your coach will appear here
              </p>
            </div>
          ) : showNotes ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coachNotes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    note.is_new
                      ? "bg-amber-100 border-amber-300"
                      : "bg-muted/30 border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {note.title && (
                        <p className={cn("font-medium", note.is_new ? "text-amber-900" : "text-foreground")}>{note.title}</p>
                      )}
                      <p className={cn(
                        "text-sm whitespace-pre-wrap",
                        note.is_new
                          ? "text-amber-800"
                          : note.title ? "text-muted-foreground mt-1" : "text-foreground"
                      )}>
                        {note.content}
                      </p>
                      <div className={cn("flex items-center gap-2 mt-2 text-xs", note.is_new ? "text-amber-700" : "text-muted-foreground")}>
                        <span>{note.coach_name}</span>
                        {note.group_name && (
                          <>
                            <span>•</span>
                            <span>{note.group_name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDate(note.created_at, "MMM d, h:mm a")}</span>
                      </div>
                    </div>
                    {note.is_new && (
                      <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-300 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              {coachNotes.length} note{coachNotes.length !== 1 ? 's' : ''} hidden
            </p>
          )}
        </CardContent>
      </Card>

      {/* Today's Tasks (uses useTaskRollover for categorization) */}
      <Card className="order-2 min-h-[320px] border-l-4 border-l-emerald-500 bg-card shadow-md rounded-lg border border-border lg:col-span-2">
        <CardHeader className="p-5 pb-2 md:p-6 md:pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="font-bold text-base">
              Today's Tasks
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0 md:p-6 md:pt-0">
          {totalCount > 0 && (
            <Progress value={progressPercent} className="h-2" />
          )}

          {/* Empty state for today's tasks - only show if no today and no overdue */}
          {today.length === 0 && overdue.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-foreground font-medium">All done!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No tasks for today. Enjoy your day!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Today's Tasks Section */}
              {today.length > 0 && (
                <div className="space-y-3">
                  {today.map((task) => {
                    const isExpanded = expandedTasks.has(task.id);
                    const hasDescription = !!task.description;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          task.status === "completed"
                            ? "bg-muted/30 border-border"
                            : "bg-card border-border hover:border-cta-primary/30"
                        )}
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: task.group_color || "#6366f1",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={task.status === "completed"}
                            onCheckedChange={(checked) =>
                              toggleTaskStatus(task.id, checked as boolean)
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "font-medium",
                                task.status === "completed"
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              )}
                            >
                              {task.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Assigned by {task.coach_name || "Coach"}
                              {task.group_name && (
                                <span className="ml-1">
                                  • <span style={{ color: task.group_color || "#6366f1" }}>{task.group_name}</span>
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {task.scheduled_time && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.scheduled_time.slice(0, 5)}
                                </Badge>
                              )}
                              {task.duration_minutes && (
                                <Badge variant="secondary" className="text-xs">
                                  {task.duration_minutes} min
                                </Badge>
                              )}
                            </div>
                            {hasDescription && (
                              <Collapsible open={isExpanded} onOpenChange={() => toggleTaskExpanded(task.id)}>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-7 px-2 text-xs text-primary hover:text-primary"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3 mr-1" />
                                        Hide details
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3 mr-1" />
                                        Show details
                                      </>
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted/30 rounded-lg whitespace-pre-wrap">
                                    {task.description}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Overdue Section - Per CONTEXT.md: Section order is Today -> Overdue -> Yesterday */}
              {overdue.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <div className="overflow-hidden rounded-lg border border-red-200 bg-red-50/80 p-4 dark:border-red-800 dark:bg-red-950/40 lg:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-300" />
                    <h3 className="font-semibold text-sm text-red-700 dark:text-red-200">Overdue</h3>
                    <Badge className="text-xs bg-red-600 text-white border-red-600">
                      {overdue.length}
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    {/* Show first 5 overdue tasks */}
                    {overdue.slice(0, 5).map((task) => {
                      const isExpanded = expandedTasks.has(task.id);
                      const hasDescription = !!task.description;

                      return (
                        <div
                          key={task.id}
                          className="p-4 rounded-lg border bg-white/70 dark:bg-red-950/30 border-red-200 dark:border-red-800 shadow-sm"
                          style={{
                            borderLeftWidth: "4px",
                            borderLeftColor: "#ef4444",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={(checked) =>
                                toggleTaskStatus(task.id, checked as boolean)
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-red-900 dark:text-red-100">{task.name}</p>
                              <p className="text-xs text-red-800/70 dark:text-red-200/80 mt-1">
                                Assigned by {task.coach_name || "Coach"}
                                {task.group_name && (
                                  <span className="ml-1">
                                    • <span style={{ color: task.group_color || "#6366f1" }}>{task.group_name}</span>
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {/* Show original due date per CONTEXT.md */}
                                <Badge variant="outline" className="text-xs bg-red-600 text-white border-red-600">
                                  Due: {formatDate(task.scheduled_date, "MMM d")}
                                </Badge>
                                {task.duration_minutes && (
                                  <Badge variant="secondary" className="text-xs">
                                    {task.duration_minutes} min
                                  </Badge>
                                )}
                              </div>
                              {hasDescription && (
                                <Collapsible open={isExpanded} onOpenChange={() => toggleTaskExpanded(task.id)}>
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-2 h-7 px-2 text-xs text-red-700 dark:text-red-200 hover:text-red-800 dark:hover:text-red-100"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="w-3 h-3 mr-1" />
                                          Hide details
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3 h-3 mr-1" />
                                          Show details
                                        </>
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="text-sm text-red-900/80 dark:text-red-100/80 mt-2 p-3 bg-white/60 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/60 rounded-lg whitespace-pre-wrap">
                                      {task.description}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Collapsible for additional overdue tasks (more than 5) */}
                    {overdue.length > 5 && (
                      <Collapsible open={overdueExpanded} onOpenChange={setOverdueExpanded}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:text-red-100 dark:hover:bg-red-950/40"
                          >
                            <ChevronDown className={cn("w-4 h-4 mr-1 transition-transform", overdueExpanded && "rotate-180")} />
                            {overdueExpanded ? "Show less" : `and ${overdue.length - 5} more overdue...`}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 mt-3">
                          {overdue.slice(5).map((task) => {
                            const isExpanded = expandedTasks.has(task.id);
                            const hasDescription = !!task.description;

                            return (
                              <div
                                key={task.id}
                                className="p-4 rounded-lg border bg-white/70 dark:bg-red-950/30 border-red-200 dark:border-red-800 shadow-sm"
                                style={{
                                  borderLeftWidth: "4px",
                                  borderLeftColor: "#ef4444",
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={task.status === "completed"}
                                    onCheckedChange={(checked) =>
                                      toggleTaskStatus(task.id, checked as boolean)
                                    }
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-red-900 dark:text-red-100">{task.name}</p>
                                    <p className="text-xs text-red-800/70 dark:text-red-200/80 mt-1">
                                      Assigned by {task.coach_name || "Coach"}
                                      {task.group_name && (
                                        <span className="ml-1">
                                          • <span style={{ color: task.group_color || "#6366f1" }}>{task.group_name}</span>
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs bg-red-600 text-white border-red-600">
                                        Due: {formatDate(task.scheduled_date, "MMM d")}
                                      </Badge>
                                      {task.duration_minutes && (
                                        <Badge variant="secondary" className="text-xs">
                                          {task.duration_minutes} min
                                        </Badge>
                                      )}
                                    </div>
                                    {hasDescription && (
                                    <Collapsible open={isExpanded} onOpenChange={() => toggleTaskExpanded(task.id)}>
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="mt-2 h-7 px-2 text-xs text-red-700 dark:text-red-200 hover:text-red-800 dark:hover:text-red-100"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <ChevronUp className="w-3 h-3 mr-1" />
                                              Hide details
                                            </>
                                          ) : (
                                              <>
                                                <ChevronDown className="w-3 h-3 mr-1" />
                                                Show details
                                              </>
                                          )}
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="text-sm text-red-900/80 dark:text-red-100/80 mt-2 p-3 bg-white/60 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/60 rounded-lg whitespace-pre-wrap">
                                          {task.description}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                  </div>
                </div>
              )}

              {/* Yesterday's Completed Section - Per CONTEXT.md: Collapsed by default, dismissible */}
              {yesterdayCompleted.length > 0 && !isYesterdayDismissed && (
                <div className="border-t pt-4 mt-4">
                  <Collapsible open={yesterdayExpanded} onOpenChange={setYesterdayExpanded}>
                    <div className="flex items-center justify-between mb-3">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <ChevronDown className={cn("w-4 h-4 transition-transform", yesterdayExpanded && "rotate-180")} />
                          <span className="font-medium">
                            {yesterdayCompleted.length} task{yesterdayCompleted.length !== 1 ? "s" : ""} completed yesterday
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissYesterday();
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Dismiss yesterday's completed tasks"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <CollapsibleContent className="space-y-3">
                      {yesterdayCompleted.map((task) => (
                        <div
                          key={task.id}
                          className="p-4 rounded-lg border bg-muted/20 border-border opacity-75"
                          style={{
                            borderLeftWidth: "4px",
                            borderLeftColor: task.group_color || "#9ca3af",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/*
                              IMPORTANT: Yesterday's completed section is READ-ONLY (TASK-01).
                              Do NOT add Checkbox here - students cannot uncheck yesterday's tasks.
                              Using static CheckCircle2 icon intentionally.
                            */}
                            <CheckCircle2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium line-through text-muted-foreground">
                                {task.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Completed • {task.coach_name || "Coach"}
                                {task.group_name && (
                                  <span className="ml-1">
                                    • {task.group_name}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cta-primary" />
              Coming Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {task.name}
                    </p>
                    {task.duration_minutes && (
                      <p className="text-xs text-muted-foreground">
                        {task.duration_minutes} min
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 ml-2">
                    {formatDueDate(task.scheduled_date)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State - Only shown when no tasks at all */}
      {today.length === 0 && overdue.length === 0 && yesterdayCompleted.length === 0 && upcomingTasks.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {connectedGroups.length === 0
                ? "Join a group using your coach's code to start receiving tasks!"
                : "Your coach will assign tasks that will appear here. Check back soon!"}
            </p>
            {connectedGroups.length === 0 && !showJoinForm && (
              <Button
                onClick={() => setShowJoinForm(true)}
                className="mt-4 bg-cta-primary hover:bg-cta-hover text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join a Group
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
