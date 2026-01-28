import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAssignments } from "@/hooks/useAssignments";
import { format, isToday, isTomorrow, differenceInDays, parseISO, isValid, isBefore, startOfDay } from "date-fns";
import { cn, safeParseISO } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, Clock, CheckCircle2, UserPlus, Users, ChevronDown, ChevronUp, User, AlertTriangle, MessageSquare } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error";

interface TaskInstance {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: "pending" | "completed" | "missed";
  student_note: string | null;
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

      const groupIds = memberships.map((m: any) => m.group_id);

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
      const coachIds = [...new Set(groups.map((g: any) => g.coach_id))];
      const { data: coaches } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", coachIds);

      const coachMap: Record<string, string> = {};
      coaches?.forEach((c: any) => {
        coachMap[c.user_id] = c.display_name || "Coach";
      });

      const connectedGroups: ConnectedGroup[] = groups.map((group: any) => ({
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

  const fetchCoachNotes = async () => {
    if (!user) return;

    try {
      // Get the student's group memberships first
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      const groupIds = memberships?.map((m: any) => m.group_id) || [];

      let allNotes: any[] = [];

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

      let coachMap: Record<string, string> = {};
      let groupMap: Record<string, string> = {};

      if (coachIds.length > 0) {
        const { data: coaches } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", coachIds);
        coaches?.forEach((c: any) => {
          coachMap[c.user_id] = c.display_name || "Coach";
        });
      }

      if (noteGroupIds.length > 0) {
        const { data: groups } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", noteGroupIds);
        groups?.forEach((g: any) => {
          groupMap[g.id] = g.name;
        });
      }

      // Consider notes from last 24 hours as "new"
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const enrichedNotes: CoachNote[] = allNotes.map(note => ({
        id: note.id,
        content: note.content,
        title: note.title,
        created_at: note.created_at,
        coach_name: coachMap[note.from_user_id] || "Coach",
        group_name: note.group_id ? groupMap[note.group_id] || null : null,
        is_new: new Date(note.created_at) > oneDayAgo,
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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoiningGroup(false);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const nextWeek = format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");

    try {
      // Fetch today's tasks AND overdue pending tasks (scheduled_date <= today with status pending)
      // This ensures students see tasks they missed from previous days
      const { data: todayData, error: todayError } = await supabase
        .from("task_instances")
        .select(`
          *,
          assignments!inner(assigned_by, group_id)
        `)
        .eq("assignee_id", user.id)
        .lte("scheduled_date", today)  // Include today and earlier
        .in("status", ["pending", "completed"]) // Show pending (including overdue) and today's completed
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
      const coachIds = [...new Set(allTasks.map((t: any) => t.assignments?.assigned_by).filter(Boolean))];
      const groupIds = [...new Set(allTasks.map((t: any) => t.assignments?.group_id).filter(Boolean))];

      // Fetch coach profiles
      let coachProfiles: Record<string, string> = {};
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
      let groupInfo: Record<string, { name: string; color: string }> = {};
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
      const enrichTask = (task: any): TaskInstance => {
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
      format(new Date(), "yyyy-MM-dd") // date for cache key
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
    const date = safeParseISO(dateStr);
    if (!date) return "No date";
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    const days = differenceInDays(date, new Date());
    if (days <= 7) return `In ${days} days`;
    return format(date, "MMM d");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const today = new Date();
  const dayNumber = format(today, "d");
  const monthName = format(today, "MMMM");
  const dayName = format(today, "EEEE");

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
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

      {/* Join Group / My Connections */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-cta-primary" />
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
        <CardContent className="space-y-3">
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

      {/* Coach's Notes */}
      {coachNotes.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                Coach's Notes
                {coachNotes.some(n => n.is_new) && (
                  <Badge className="bg-amber-500 text-white text-xs">New</Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="text-muted-foreground"
              >
                {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          {showNotes && (
            <CardContent className="space-y-3">
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
                        <span>{format(new Date(note.created_at), "MMM d, h:mm a")}</span>
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
            </CardContent>
          )}
        </Card>
      )}

      {/* Today's Tasks (and Overdue) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Tasks to Do</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalCount > 0 && (
            <Progress value={progressPercent} className="mb-4 h-2" />
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tasks for today</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later for new assignments
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isExpanded = expandedTasks.has(task.id);
                const hasDescription = !!task.description;
                // Check if task is overdue (scheduled before today and still pending)
                const taskDate = safeParseISO(task.scheduled_date);
                const isOverdue = taskDate && task.status === "pending" && isBefore(taskDate, startOfDay(new Date()));

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      task.status === "completed"
                        ? "bg-muted/30 border-border"
                        : isOverdue
                        ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800"
                        : "bg-card border-border hover:border-cta-primary/30"
                    )}
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: isOverdue ? "#ef4444" : (task.group_color || "#6366f1"),
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
                        {/* Task Title */}
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

                        {/* Assigned by - right under title */}
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned by {task.coach_name || "Coach"}
                          {task.group_name && (
                            <span className="ml-1">
                              • <span style={{ color: task.group_color || "#6366f1" }}>{task.group_name}</span>
                            </span>
                          )}
                        </p>

                        {/* Meta info */}
                        <div className="flex items-center gap-2 mt-2">
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Overdue
                            </Badge>
                          )}
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

                        {/* Expandable description */}
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
        </CardContent>
      </Card>

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

      {/* Empty State */}
      {tasks.length === 0 && upcomingTasks.length === 0 && (
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
