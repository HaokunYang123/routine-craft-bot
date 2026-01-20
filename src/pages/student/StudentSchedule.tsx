import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, CheckCircle2, Clock, User, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isToday, isTomorrow, parseISO, subDays, isAfter, isBefore, startOfDay } from "date-fns";
import { InstructorsList } from "@/components/student/InstructorsList";
import { JoinInstructor } from "@/components/student/JoinInstructor";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number | null;
    due_date: string | null;
    is_completed: boolean;
    user_id: string;
    instructor_name?: string;
}

export default function StudentSchedule() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("schedule");
    const [showHistory, setShowHistory] = useState(false);
    const [fadingTasks, setFadingTasks] = useState<Set<string>>(new Set());

    const selectedInstructorId = searchParams.get("instructorId");

    useEffect(() => {
        if (!user) return;
        fetchSchedule();
    }, [user, selectedInstructorId]);

    const fetchSchedule = async () => {
        setLoading(true);

        // First get all instructor IDs for this student
        const { data: relationships } = await supabase
            .from("instructor_students" as any)
            .select("instructor_id")
            .eq("student_id", user!.id);

        if (!relationships || relationships.length === 0) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const instructorIds = relationships.map((r: any) => r.instructor_id);

        // Filter by selected instructor if set
        const filterIds = selectedInstructorId
            ? [selectedInstructorId]
            : instructorIds;

        // Fetch tasks from connected instructors
        // We get ALL tasks from my instructors, then filter by assignment in memory 
        // OR we can add filters to the query if Supabase supports complex ORs easily here.
        // For simplicity with this library volume, fetching and filtering is fine for MVP.
        const { data: tasksData } = await supabase
            .from("tasks")
            .select("*")
            .in("user_id", filterIds)
            .order("due_date", { ascending: true });

        // Filter: Show task only if (assigned_to ME) OR (assigned_to NULL/ALL)
        const relevantTasks = (tasksData || []).filter((task: any) => {
            return !task.assigned_student_id || task.assigned_student_id === user!.id;
        });

        // Get instructor names
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", instructorIds);

        const enrichedTasks = relevantTasks.map((task) => ({
            ...task,
            instructor_name: profiles?.find((p) => p.user_id === task.user_id)?.display_name || "Instructor",
        }));

        setTasks(enrichedTasks);
        setLoading(false);
    };

    const handleSelectInstructor = (instructorId: string | null) => {
        if (instructorId) {
            setSearchParams({ instructorId });
        } else {
            setSearchParams({});
        }
    };

    const handleToggleComplete = async (taskId: string, completed: boolean) => {
        try {
            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, is_completed: completed } : t
            ));

            const { error } = await supabase
                .from("tasks")
                .update({ is_completed: completed })
                .eq("id", taskId);

            if (error) throw error;

            if (completed) {
                // Add fade-out effect before removing from view
                setFadingTasks(prev => new Set(prev).add(taskId));

                toast({
                    title: "Nice work!",
                    description: "Task marked as complete.",
                });

                // Remove from fading set after animation completes
                setTimeout(() => {
                    setFadingTasks(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(taskId);
                        return newSet;
                    });
                }, 1000);
            }
        } catch (error: any) {
            // Revert on error
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, is_completed: !completed } : t
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
    const sevenDaysAgo = subDays(today, 7);

    // Filter tasks based on view mode
    const activeTasks = tasks.filter(t => {
        // If task is currently fading out, still show it
        if (fadingTasks.has(t.id)) return true;
        // Active view: show incomplete tasks only
        return !t.is_completed;
    });

    const historyTasks = tasks.filter(t => {
        // History view: show completed tasks from past 7 days
        if (!t.is_completed) return false;
        if (!t.due_date) return true; // Show completed tasks without due date
        const dueDate = parseISO(t.due_date);
        return isAfter(dueDate, sevenDaysAgo);
    });

    const displayTasks = showHistory ? historyTasks : activeTasks;

    const groupedTasks = {
        today: displayTasks.filter((t) => t.due_date && isToday(parseISO(t.due_date))),
        tomorrow: displayTasks.filter((t) => t.due_date && isTomorrow(parseISO(t.due_date))),
        upcoming: displayTasks.filter(
            (t) => t.due_date && !isToday(parseISO(t.due_date)) && !isTomorrow(parseISO(t.due_date)) && isAfter(parseISO(t.due_date), today)
        ),
        past: displayTasks.filter(
            (t) => t.due_date && isBefore(parseISO(t.due_date), today) && !isToday(parseISO(t.due_date))
        ),
        noDue: displayTasks.filter((t) => !t.due_date),
    };

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl font-bold">My Schedule</h1>
                <p className="text-muted-foreground">
                    Assignments from your instructors
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
                            {selectedInstructorId && (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() => handleSelectInstructor(null)}
                                >
                                    Filtered by instructor - Click to show all
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
                                <h3 className="font-bold text-lg mb-2">Join a Group First!</h3>
                                <p className="text-muted-foreground text-center text-sm mb-4 max-w-xs">
                                    Ask your coach for their class code, then tap "Join Group" above to connect.
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

                            {/* Past (only in history view) */}
                            {showHistory && groupedTasks.past.length > 0 && (
                                <TaskSection title="Past" tasks={groupedTasks.past} onToggleComplete={handleToggleComplete} isHistory fadingTasks={fadingTasks} />
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

                            {/* No Due Date */}
                            {groupedTasks.noDue.length > 0 && (
                                <TaskSection title="No Due Date" tasks={groupedTasks.noDue} onToggleComplete={handleToggleComplete} isHistory={showHistory} fadingTasks={fadingTasks} />
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value="instructors" className="mt-4">
                    <InstructorsList
                        onSelectInstructor={handleSelectInstructor}
                        selectedInstructorId={selectedInstructorId}
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
    tasks: Task[];
    onToggleComplete?: (taskId: string, completed: boolean) => void;
    isHistory?: boolean;
    fadingTasks?: Set<string>;
}

function TaskSection({ title, tasks, onToggleComplete, isHistory = false, fadingTasks = new Set() }: TaskSectionProps) {
    return (
        <section>
            <h2 className="text-lg font-semibold mb-3">{title}</h2>
            <div className="space-y-2">
                {tasks.map((task) => {
                    const isFading = fadingTasks.has(task.id);

                    return (
                        <Card
                            key={task.id}
                            className={cn(
                                "transition-all duration-500",
                                task.is_completed && "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
                                isHistory && "opacity-50",
                                isFading && "opacity-0 scale-95 translate-x-4"
                            )}
                        >
                            <CardContent className="flex items-start gap-4 py-4">
                                <button
                                    onClick={() => onToggleComplete?.(task.id, !task.is_completed)}
                                    className="mt-1 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full"
                                    disabled={isFading}
                                >
                                    {task.is_completed ? (
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground hover:border-green-500 hover:bg-green-50 transition-colors" />
                                    )}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "font-medium",
                                        task.is_completed && "line-through text-muted-foreground"
                                    )}>
                                        {task.title}
                                    </p>
                                    {task.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {task.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                            {task.instructor_name}
                                        </Badge>
                                        {task.duration_minutes && (
                                            <Badge variant="secondary" className="text-xs gap-1">
                                                <Clock className="w-3 h-3" />
                                                {task.duration_minutes}m
                                            </Badge>
                                        )}
                                        {task.due_date && (
                                            <span className="text-xs text-muted-foreground">
                                                {format(parseISO(task.due_date), "MMM d")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!task.is_completed && !isHistory && (
                                    <Button
                                        size="sm"
                                        onClick={() => onToggleComplete?.(task.id, true)}
                                        className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                                        disabled={isFading}
                                    >
                                        Done
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
