import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, BookOpen, Loader2 } from "lucide-react";
import { OverviewWidgets } from "@/components/dashboard/OverviewWidgets";

interface ClassSession {
  id: string;
  name: string;
  join_code: string;
  qr_token: string;
  is_active: boolean;
}

interface GroupWithStats extends ClassSession {
  student_count: number;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
}

interface StudentStatus {
  id: string;
  name: string;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

export default function CoachDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Class State
  const [createOpen, setCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // 1. Fetch all class sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("class_sessions" as any)
        .select("*")
        .eq("coach_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Collect all student stats across all groups
      const allStudentStats: StudentStatus[] = [];

      // 2. For each session, get stats
      const groupsWithStats = await Promise.all(
        (sessionsData || []).map(async (session: any) => {
          // Get student connections with profile info
          const { data: connections } = await supabase
            .from("instructor_students" as any)
            .select("student_id, profiles:student_id(id, full_name, email)")
            .eq("class_session_id", session.id);

          let totalTasks = 0;
          let completedTasks = 0;

          if (connections && connections.length > 0) {
            // Get individual student stats
            for (const conn of connections) {
              const studentId = conn.student_id;
              const profile = conn.profiles as any;

              // Get tasks for this student
              const { count: studentTotal } = await supabase
                .from("tasks")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user!.id)
                .eq("assigned_student_id", studentId);

              const { count: studentCompleted } = await supabase
                .from("tasks")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user!.id)
                .eq("assigned_student_id", studentId)
                .eq("is_completed", true);

              const sTotal = studentTotal || 0;
              const sCompleted = studentCompleted || 0;

              totalTasks += sTotal;
              completedTasks += sCompleted;

              // Add to student stats if they have tasks
              if (sTotal > 0) {
                allStudentStats.push({
                  id: studentId,
                  name: profile?.full_name || profile?.email || "Unknown",
                  totalTasks: sTotal,
                  completedTasks: sCompleted,
                  completionRate: Math.round((sCompleted / sTotal) * 100),
                });
              }
            }
          }

          const completionRate =
            totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
            ...session,
            student_count: connections?.length || 0,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            completion_rate: completionRate,
          };
        })
      );

      setGroups(groupsWithStats);
      setStudents(allStudentStats);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load groups.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newClassName.trim()) return;
    setCreating(true);

    try {
      const { data: code } = await supabase.rpc('generate_join_code' as any);

      const { error } = await supabase.from("class_sessions" as any).insert({
        coach_id: user.id,
        name: newClassName.trim(),
        join_code: code,
        is_active: true
      });

      if (error) throw error;

      toast({ title: "Class Created!", description: `${newClassName} is ready.` });
      setNewClassName("");
      setCreateOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Calculate weighted overall stats
  const totalStudentsCount = groups.reduce((sum, g) => sum + g.student_count, 0);
  const totalTasksCount = groups.reduce((sum, g) => sum + g.total_tasks, 0);
  const totalCompletedCount = groups.reduce((sum, g) => sum + g.completed_tasks, 0);
  const overallCompletion =
    totalTasksCount > 0
      ? Math.round((totalCompletedCount / totalTasksCount) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Track your classes and student progress
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cta-primary hover:bg-cta-hover text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Class</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Class Name</Label>
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Period 1, Varsity Team"
                  required
                  className="bg-input border-border text-foreground"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-cta-primary hover:bg-cta-hover text-white"
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Class
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Widgets */}
      <OverviewWidgets
        students={students}
        totalClasses={groups.length}
        totalStudents={totalStudentsCount}
        totalTasks={totalTasksCount}
        completedTasks={totalCompletedCount}
        overallCompletion={overallCompletion}
      />

      {/* Classes Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Your Classes</h2>
        {groups.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-card/50">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2 text-foreground">No Classes Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first class to start tracking student progress.
            </p>
            <Button
              size="lg"
              onClick={() => setCreateOpen(true)}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Class
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:shadow-lg transition-all border-border hover:border-cta-primary/50 group bg-card"
                onClick={() => navigate(`/dashboard/group/${group.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-foreground group-hover:text-cta-primary transition-colors">
                        {group.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {group.student_count} student
                        {group.student_count !== 1 && "s"}
                      </CardDescription>
                    </div>
                    {group.student_count > 0 && group.total_tasks > 0 && (
                      <div
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          group.completion_rate >= 80
                            ? "bg-cta-primary/20 text-cta-primary"
                            : group.completion_rate >= 50
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-urgent/20 text-urgent"
                        }`}
                      >
                        {group.completion_rate >= 80
                          ? "On Track"
                          : group.completion_rate >= 50
                          ? "Moderate"
                          : "Behind"}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Completion Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-medium text-foreground">
                          {group.completion_rate}%
                        </span>
                      </div>
                      <Progress value={group.completion_rate} className="h-2" />
                    </div>

                    {/* Join Code */}
                    <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                      <span className="text-xs text-muted-foreground">Code:</span>
                      <span className="font-mono font-bold text-sm text-foreground">
                        {group.join_code}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
