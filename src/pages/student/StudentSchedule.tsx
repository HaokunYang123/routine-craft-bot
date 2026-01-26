import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, CheckCircle2, Clock, User, Plus, History, ChevronDown, ChevronUp, Users, AlertTriangle, MessageSquare } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { format, isToday, isTomorrow, parseISO, subDays, isAfter, isBefore, startOfDay, addDays, isValid } from "date-fns";
import { InstructorsList } from "@/components/student/InstructorsList";
import { JoinInstructor } from "@/components/student/JoinInstructor";
import { useToast } from "@/hooks/use-toast";
import { cn, safeParseISO, safeFormatDate } from "@/lib/utils";
import { handleError } from "@/lib/error";

// Safe date check helpers
const safeDateCheck = (dateStr: string | null | undefined, checkFn: (d: Date) => boolean): boolean => {
    if (!dateStr) return false;
    try {
        const parsed = parseISO(dateStr);
        return isValid(parsed) && checkFn(parsed);
    } catch {
        return false;
    }
};

// Use task_instances table - these have the correctly calculated scheduled_date
interface TaskInstance {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number | null;
    scheduled_date: string;
    status: "pending" | "completed" | "missed";
    assignee_id: string;
    assignment_id: string;
    coach_name?: string;
    coach_id?: string;
    group_name?: string;
    group_color?: string;
    coach_note?: string | null;
    updated_at?: string | null;
}

export default function StudentSchedule() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tasks, setTasks] = useState<TaskInstance[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("schedule");
    const [showHistory, setShowHistory] = useState(false);
    const [fadingTasks, setFadingTasks] = useState<Set<string>>(new Set());
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const selectedCoachId = searchParams.get("coachId");

    useEffect(() => {
        if (!user) return;
        fetchSchedule();
    }, [user, selectedCoachId]);

    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
            timeoutsRef.current.clear();
        };
    }, []);

    const fetchSchedule = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Fetch task_instances directly assigned to this user
            // Include assignment data to get the coach info
            const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

            const { data: instances, error } = await supabase
                .from("task_instances")
                .select(`
                    id,
                    name,
                    description,
                    duration_minutes,
                    scheduled_date,
                    status,
                    assignee_id,
                    assignment_id,
                    coach_note,
                    updated_at,
                    assignments!inner(assigned_by, group_id)
                `)
                .eq("assignee_id", user.id)
                .gte("scheduled_date", sevenDaysAgo)
                .order("scheduled_date", { ascending: true });

            if (error) throw error;

            if (!instances || instances.length === 0) {
                setTasks([]);
                setLoading(false);
                return;
            }

            // Get unique coach IDs and group IDs from assignments
            const coachIds = [...new Set(instances.map((i: any) => i.assignments?.assigned_by).filter(Boolean))];
            const groupIds = [...new Set(instances.map((i: any) => i.assignments?.group_id).filter(Boolean))];

            // Fetch coach profiles for display names
            let coachProfiles: Record<string, string> = {};
            if (coachIds.length > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("user_id, display_name")
                    .in("user_id", coachIds);

                if (profiles) {
                    profiles.forEach((p) => {
                        coachProfiles[p.user_id] = p.display_name || "Coach";
                    });
                }
            }

            // Fetch group info for names and colors
            let groupInfo: Record<string, { name: string; color: string }> = {};
            if (groupIds.length > 0) {
                const { data: groups } = await supabase
                    .from("groups")
                    .select("id, name, color")
                    .in("id", groupIds);

                if (groups) {
                    groups.forEach((g) => {
                        groupInfo[g.id] = { name: g.name, color: g.color || "#6366f1" };
                    });
                }
            }

            // Enrich tasks with coach and group info
            const enrichedTasks: TaskInstance[] = instances.map((instance: any) => {
                const coachId = instance.assignments?.assigned_by;
                const groupId = instance.assignments?.group_id;
                const group = groupId ? groupInfo[groupId] : null;

                return {
                    id: instance.id,
                    name: instance.name,
                    description: instance.description,
                    duration_minutes: instance.duration_minutes,
                    scheduled_date: instance.scheduled_date,
                    status: instance.status,
                    assignee_id: instance.assignee_id,
                    assignment_id: instance.assignment_id,
                    coach_id: coachId,
                    coach_name: coachProfiles[coachId] || "Coach",
                    group_name: group?.name,
                    group_color: group?.color || "#6366f1",
                    coach_note: instance.coach_note,
                    updated_at: instance.updated_at,
                };
            });

            // Filter by selected coach if set
            const filteredTasks = selectedCoachId
                ? enrichedTasks.filter((t) => t.coach_id === selectedCoachId)
                : enrichedTasks;

            setTasks(filteredTasks);
        } catch (error) {
            handleError(error, { component: 'StudentSchedule', action: 'fetch schedule' });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCoach = (coachId: string | null) => {
        if (coachId) {
            setSearchParams({ coachId });
        } else {
            setSearchParams({});
        }
    };

    const handleToggleComplete = async (taskId: string, completed: boolean) => {
        try {
            const newStatus = completed ? "completed" : "pending";

            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: newStatus } : t
            ));

            // Update task_instances table (not tasks!)
            const { error } = await supabase
                .from("task_instances")
                .update({
                    status: newStatus,
                    completed_at: completed ? new Date().toISOString() : null,
                })
                .eq("id", taskId);

            if (error) throw error;

            if (completed) {
                // Add fade-out effect before removing from view
                setFadingTasks(prev => new Set(prev).add(taskId));

                toast({
                    title: "Nice work!",
                    description: "Task marked as complete.",
                });

                // Clear any existing timeout for this task
                const existing = timeoutsRef.current.get(taskId);
                if (existing) clearTimeout(existing);

                // Remove from fading set after animation completes
                const timeout = setTimeout(() => {
                    setFadingTasks(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(taskId);
                        return newSet;
                    });
                    timeoutsRef.current.delete(taskId);
                }, 1000);

                timeoutsRef.current.set(taskId, timeout);
            }
        } catch (error: any) {
            // Revert on error
            const revertStatus = completed ? "pending" : "completed";
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: revertStatus } : t
            ));
            setFadingTasks(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
            toast({
                title: "Error",
                description: "Failed to update task.",
                variant: "destructive",
            });
        }
    };

    // Calculate date boundaries
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const sevenDaysAgo = subDays(today, 7);

    // Filter tasks based on view mode
    const activeTasks = tasks.filter(t => {
        // If task is currently fading out, still show it
        if (fadingTasks.has(t.id)) return true;
        // Active view: show pending tasks only
        return t.status === "pending";
    });

    const historyTasks = tasks.filter(t => {
        // History view: show completed/missed tasks from past 7 days
        if (t.status === "pending") return false;
        return safeDateCheck(t.scheduled_date, (d) => isAfter(d, sevenDaysAgo));
    });

    const displayTasks = showHistory ? historyTasks : activeTasks;

    // Separate overdue tasks (past date + still pending) from completed history
    const overdueTasks = tasks.filter(t => {
        return safeDateCheck(t.scheduled_date, (d) => isBefore(d, today) && !isToday(d)) && t.status === "pending";
    });

    const groupedTasks = {
        overdue: overdueTasks, // Always visible if there are overdue tasks
        today: displayTasks.filter((t) => safeDateCheck(t.scheduled_date, isToday)),
        tomorrow: displayTasks.filter((t) => safeDateCheck(t.scheduled_date, isTomorrow)),
        upcoming: displayTasks.filter((t) => {
            return safeDateCheck(t.scheduled_date, (d) => isAfter(d, tomorrow) && !isToday(d) && !isTomorrow(d));
        }),
        pastCompleted: displayTasks.filter((t) => {
            return safeDateCheck(t.scheduled_date, (d) => isBefore(d, today) && !isToday(d)) && t.status !== "pending";
        }),
    };

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl font-bold">My Schedule</h1>
                <p className="text-muted-foreground">
                    Your assigned tasks and routines
                </p>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="schedule">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule
                    </TabsTrigger>
                    <TabsTrigger value="instructors">
                        <User className="w-4 h-4 mr-2" />
                        Coaches
                    </TabsTrigger>
                    <TabsTrigger value="join" className="bg-accent/10 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold">
                        <Plus className="w-4 h-4 mr-1" />
                        Join Group
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="space-y-6 mt-4">
                    {/* History Toggle & Filter indicator */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {selectedCoachId && (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => handleSelectCoach(null)}
                                >
                                    Filtered by coach - Click to show all
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <History className={cn("w-4 h-4", showHistory ? "text-primary" : "text-muted-foreground")} />
                            <Label htmlFor="show-history" className="text-sm text-muted-foreground cursor-pointer">
                                Show Completed
                            </Label>
                            <Switch
                                id="show-history"
                                checked={showHistory}
                                onCheckedChange={setShowHistory}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <Card className="border-2 border-dashed border-accent/50 bg-accent/5">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                                    <Plus className="w-8 h-8 text-accent" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">No Tasks Yet!</h3>
                                <p className="text-muted-foreground text-center text-sm mb-4 max-w-xs">
                                    Join a group and wait for your coach to assign tasks.
                                </p>
                                <Button onClick={() => setActiveTab("join")} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Join a Group Now
                                </Button>
                            </CardContent>
                        </Card>
                    ) : displayTasks.length === 0 && !showHistory ? (
                        // Inbox Zero State
                        <Card className="border-2 border-dashed border-green-500/50 bg-green-50/50 dark:bg-green-900/10">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-green-700 dark:text-green-400">All caught up!</h3>
                                <p className="text-muted-foreground text-center text-sm max-w-xs">
                                    You've completed all your tasks. Great job!
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setShowHistory(true)}
                                >
                                    <History className="w-4 h-4 mr-2" />
                                    View Completed Tasks
                                </Button>
                            </CardContent>
                        </Card>
                    ) : displayTasks.length === 0 && showHistory ? (
                        // No history
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <History className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="font-medium text-lg mb-2">No completed tasks</h3>
                                <p className="text-muted-foreground text-center text-sm">
                                    Tasks you complete will appear here for 7 days.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* History Header */}
                            {showHistory && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <History className="w-4 h-4" />
                                    <span>Showing completed tasks from the past 7 days</span>
                                </div>
                            )}

                            {/* OVERDUE - Shows first with warning styling (only in active view) */}
                            {!showHistory && groupedTasks.overdue.length > 0 && (
                                <section className="mb-4">
                                    <div className="flex items-center gap-2 mb-3 text-destructive">
                                        <AlertTriangle className="w-5 h-5" />
                                        <h2 className="text-lg font-semibold">Overdue ({groupedTasks.overdue.length})</h2>
                                    </div>
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-3">
                                        <p className="text-sm text-destructive">
                                            These tasks were due on previous days. Complete them or they'll stay here!
                                        </p>
                                    </div>
                                    <TaskSection title="" tasks={groupedTasks.overdue} onToggleComplete={handleToggleComplete} isOverdue fadingTasks={fadingTasks} />
                                </section>
                            )}

                            {/* Past completed (only in history view) */}
                            {showHistory && groupedTasks.pastCompleted.length > 0 && (
                                <TaskSection title="Past" tasks={groupedTasks.pastCompleted} onToggleComplete={handleToggleComplete} isHistory fadingTasks={fadingTasks} />
                            )}

                            {/* Today */}
                            {groupedTasks.today.length > 0 && (
                                <TaskSection title="Today" tasks={groupedTasks.today} onToggleComplete={handleToggleComplete} isHistory={showHistory} fadingTasks={fadingTasks} />
                            )}

                            {/* Tomorrow */}
                            {groupedTasks.tomorrow.length > 0 && (
                                <TaskSection title="Tomorrow" tasks={groupedTasks.tomorrow} onToggleComplete={handleToggleComplete} isHistory={showHistory} fadingTasks={fadingTasks} />
                            )}

                            {/* Upcoming */}
                            {groupedTasks.upcoming.length > 0 && (
                                <TaskSection title="Upcoming" tasks={groupedTasks.upcoming} onToggleComplete={handleToggleComplete} isHistory={showHistory} fadingTasks={fadingTasks} />
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value="instructors" className="mt-4">
                    <InstructorsList
                        onSelectInstructor={handleSelectCoach}
                        selectedInstructorId={selectedCoachId}
                    />
                </TabsContent>

                <TabsContent value="join" className="mt-4">
                    <JoinInstructor onSuccess={fetchSchedule} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

interface TaskSectionProps {
    title: string;
    tasks: TaskInstance[];
    onToggleComplete?: (taskId: string, completed: boolean) => void;
    isHistory?: boolean;
    isOverdue?: boolean;
    fadingTasks?: Set<string>;
}

function TaskSection({ title, tasks, onToggleComplete, isHistory = false, isOverdue = false, fadingTasks = new Set() }: TaskSectionProps) {
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    const toggleExpanded = (taskId: string) => {
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

    return (
        <section>
            {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
            <div className="space-y-3">
                {tasks.map((task) => {
                    const isFading = fadingTasks.has(task.id);
                    const isCompleted = task.status === "completed";
                    const isMissed = task.status === "missed";
                    const isExpanded = expandedTasks.has(task.id);
                    const hasDescription = !!task.description;

                    return (
                        <Card
                            key={task.id}
                            className={cn(
                                "transition-all duration-500 overflow-hidden",
                                isCompleted && "bg-green-50 dark:bg-green-900/10",
                                isMissed && "bg-red-50 dark:bg-red-900/10",
                                isOverdue && "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900",
                                isHistory && "opacity-60",
                                isFading && "opacity-0 scale-95 translate-x-4"
                            )}
                            style={{
                                borderLeftWidth: "4px",
                                borderLeftColor: isOverdue ? "#ef4444" : (task.group_color || "#6366f1"),
                            }}
                        >
                            <CardContent className="py-4 px-4">
                                {/* Coach Note - shown when coach updated the task */}
                                {task.coach_note && (
                                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-0.5">
                                                    Note from {task.coach_name || "Coach"}:
                                                </p>
                                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                                    {task.coach_note}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Main content */}
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={() => onToggleComplete?.(task.id, !isCompleted)}
                                        className="mt-0.5 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full shrink-0"
                                        disabled={isFading}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-muted-foreground hover:border-green-500 hover:bg-green-50 transition-colors" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        {/* Title */}
                                        <p className={cn(
                                            "font-semibold text-base",
                                            isCompleted && "line-through text-muted-foreground"
                                        )}>
                                            {task.name}
                                        </p>

                                        {/* Assigned by - shown right under title */}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Assigned by {task.coach_name || "Coach"}
                                            {task.group_name && (
                                                <span className="ml-1">
                                                    • <span style={{ color: task.group_color || "#6366f1" }}>{task.group_name}</span>
                                                </span>
                                            )}
                                        </p>

                                        {/* Meta info - always visible */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            {task.duration_minutes && (
                                                <Badge variant="secondary" className="text-xs gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {task.duration_minutes} min
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Due: {safeFormatDate(task.scheduled_date, "MMM d")}
                                            </Badge>
                                            {task.updated_at && (
                                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    <MessageSquare className="w-3 h-3 mr-1" />
                                                    Updated
                                                </Badge>
                                            )}
                                            {isMissed && (
                                                <Badge variant="destructive" className="text-xs">
                                                    Missed
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Expandable description - collapsed by default */}
                                        {hasDescription && (
                                            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(task.id)}>
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

                                    {/* Done button */}
                                    {!isCompleted && !isHistory && !isMissed && (
                                        <Button
                                            size="sm"
                                            onClick={() => onToggleComplete?.(task.id, true)}
                                            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                                            disabled={isFading}
                                        >
                                            Done
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
