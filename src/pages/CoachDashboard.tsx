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
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  BookOpen,
  Loader2,
  TrendingUp,
  CheckCircle2
} from "lucide-react";

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

export default function CoachDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
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

      // 2. For each session, get stats
      const groupsWithStats = await Promise.all(
        (sessionsData || []).map(async (session: any) => {
          // Count students
          const { count: studentCount } = await supabase
            .from("instructor_students" as any)
            .select("id", { count: "exact", head: true })
            .eq("class_session_id", session.id);

          // Get student IDs for this group
          const { data: connections } = await supabase
            .from("instructor_students" as any)
            .select("student_id")
            .eq("class_session_id", session.id);

          let totalTasks = 0;
          let completedTasks = 0;

          if (connections && connections.length > 0) {
            const studentIds = connections.map((c: any) => c.student_id);

            // Count all tasks assigned to students in this group
            const { count: totalCount } = await supabase
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user!.id)
              .in("assigned_student_id", studentIds);

            const { count: completedCount } = await supabase
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user!.id)
              .in("assigned_student_id", studentIds)
              .eq("is_completed", true);

            totalTasks = totalCount || 0;
            completedTasks = completedCount || 0;
          }

          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
            ...session,
            student_count: studentCount || 0,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            completion_rate: completionRate
          };
        })
      );

      setGroups(groupsWithStats);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load groups.", variant: "destructive" });
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

  // Calculate weighted overall stats: (Total Completed across ALL groups / Total Assigned across ALL groups)
  const totalStudents = groups.reduce((sum, g) => sum + g.student_count, 0);
  const totalTasks = groups.reduce((sum, g) => sum + g.total_tasks, 0);
  const totalCompleted = groups.reduce((sum, g) => sum + g.completed_tasks, 0);
  const overallCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your classes and progress.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Period 1, Varsity Team"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Class
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{groups.length}</p>
                <p className="text-xs text-muted-foreground">Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCompleted}/{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallCompletion}%</p>
                <p className="text-xs text-muted-foreground">Overall Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Classes</h2>
        {groups.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-secondary/20">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No Classes Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first class to start tracking student progress.
            </p>
            <Button size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Class
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-accent/50 group"
                onClick={() => navigate(`/dashboard/group/${group.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg group-hover:text-accent transition-colors">{group.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group.student_count} student{group.student_count !== 1 && "s"}
                      </CardDescription>
                    </div>
                    {group.student_count > 0 && group.total_tasks > 0 && (
                      <div className={`px-2 py-1 rounded text-xs font-bold ${group.completion_rate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        group.completion_rate >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {group.completion_rate >= 80 ? 'On Track' :
                          group.completion_rate >= 50 ? 'Moderate' : 'Behind'}
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
                        <span className="font-medium">{group.completion_rate}%</span>
                      </div>
                      <Progress value={group.completion_rate} className="h-2" />
                    </div>

                    {/* Join Code */}
                    <div className="flex items-center justify-between bg-secondary/50 p-2 rounded-md">
                      <span className="text-xs text-muted-foreground">Code:</span>
                      <span className="font-mono font-bold text-sm">{group.join_code}</span>
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
