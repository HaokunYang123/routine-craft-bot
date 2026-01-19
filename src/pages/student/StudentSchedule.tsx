import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, CheckCircle2, Clock, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { InstructorsList } from "@/components/student/InstructorsList";
import { JoinInstructor } from "@/components/student/JoinInstructor";

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
    const [searchParams, setSearchParams] = useSearchParams();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("schedule");

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

    const groupedTasks = {
        today: tasks.filter((t) => t.due_date && isToday(parseISO(t.due_date))),
        tomorrow: tasks.filter((t) => t.due_date && isTomorrow(parseISO(t.due_date))),
        upcoming: tasks.filter(
            (t) => t.due_date && !isToday(parseISO(t.due_date)) && !isTomorrow(parseISO(t.due_date))
        ),
        noDue: tasks.filter((t) => !t.due_date),
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
                    {/* Filter indicator */}
                    {selectedInstructorId && (
                        <Badge
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleSelectInstructor(null)}
                        >
                            Filtered by instructor - Click to show all
                        </Badge>
                    )}

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
                    ) : (
                        <>
                            {/* Today */}
                            {groupedTasks.today.length > 0 && (
                                <TaskSection title="Today" tasks={groupedTasks.today} />
                            )}

                            {/* Tomorrow */}
                            {groupedTasks.tomorrow.length > 0 && (
                                <TaskSection title="Tomorrow" tasks={groupedTasks.tomorrow} />
                            )}

                            {/* Upcoming */}
                            {groupedTasks.upcoming.length > 0 && (
                                <TaskSection title="Upcoming" tasks={groupedTasks.upcoming} />
                            )}

                            {/* No Due Date */}
                            {groupedTasks.noDue.length > 0 && (
                                <TaskSection title="No Due Date" tasks={groupedTasks.noDue} />
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

function TaskSection({ title, tasks }: { title: string; tasks: Task[] }) {
    return (
        <section>
            <h2 className="text-lg font-semibold mb-3">{title}</h2>
            <div className="space-y-2">
                {tasks.map((task) => (
                    <Card key={task.id} className={task.is_completed ? "opacity-60" : ""}>
                        <CardContent className="flex items-start gap-4 py-4">
                            <div className="mt-1">
                                {task.is_completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
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
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
