import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Clock,
  ChevronRight,
  Loader2,
  Send,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface StudentStats {
  id: string;
  name: string;
  completedToday: number;
  totalToday: number;
  completionRate: number;
  streak: number;
  status: "on-track" | "behind" | "inactive";
  lastActive?: Date;
}

interface OverviewStats {
  totalStudents: number;
  tasksToday: number;
  completedToday: number;
  completionRate: number;
  onTrack: number;
  behind: number;
  inactive: number;
}

export default function AssignerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Fetch students connected to this coach
      const { data: connections } = await supabase
        .from("instructor_students")
        .select("student_id")
        .eq("instructor_id", user.id);

      if (!connections || connections.length === 0) {
        setStudents([]);
        setStats({
          totalStudents: 0,
          tasksToday: 0,
          completedToday: 0,
          completionRate: 0,
          onTrack: 0,
          behind: 0,
          inactive: 0,
        });
        setLoading(false);
        return;
      }

      const studentIds = connections.map((c) => c.student_id);

      // Fetch student profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", studentIds);

      // Fetch tasks for today
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .in("assigned_student_id", studentIds)
        .gte("scheduled_date", today.toISOString().split("T")[0])
        .lte("scheduled_date", today.toISOString().split("T")[0]);

      // Calculate stats per student
      const studentStatsMap: Record<string, StudentStats> = {};

      for (const profile of profiles || []) {
        const studentTasks = (tasks || []).filter(
          (t) => t.assigned_student_id === profile.user_id
        );
        const completed = studentTasks.filter((t) => t.is_completed).length;
        const total = studentTasks.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        let status: "on-track" | "behind" | "inactive" = "inactive";
        if (total > 0) {
          status = rate >= 50 ? "on-track" : "behind";
        }

        studentStatsMap[profile.user_id] = {
          id: profile.user_id,
          name: profile.display_name || "Student",
          completedToday: completed,
          totalToday: total,
          completionRate: rate,
          streak: 0, // Calculate separately if needed
          status,
        };
      }

      const studentStatsList = Object.values(studentStatsMap);

      // Calculate overview stats
      const totalTasks = (tasks || []).length;
      const completedTasks = (tasks || []).filter((t) => t.is_completed).length;

      setStats({
        totalStudents: studentStatsList.length,
        tasksToday: totalTasks,
        completedToday: completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        onTrack: studentStatsList.filter((s) => s.status === "on-track").length,
        behind: studentStatsList.filter((s) => s.status === "behind").length,
        inactive: studentStatsList.filter((s) => s.status === "inactive").length,
      });

      setStudents(studentStatsList);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNote = async () => {
    if (!selectedStudent || !noteContent.trim() || !user) return;
    setSendingNote(true);

    try {
      const { error } = await supabase.from("notes").insert({
        from_user_id: user.id,
        to_user_id: selectedStudent.id,
        content: noteContent.trim(),
        visibility: "shared",
      });

      if (error) throw error;

      toast({
        title: "Note Sent",
        description: `Your note has been sent to ${selectedStudent.name}`,
      });

      setNoteDialogOpen(false);
      setNoteContent("");
      setSelectedStudent(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send note",
        variant: "destructive",
      });
    } finally {
      setSendingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Assigner Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track progress and manage your students
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalStudents || 0}</p>
              </div>
              <Users className="w-10 h-10 text-cta-primary/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Progress</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.completedToday || 0}/{stats?.tasksToday || 0}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-success/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-3xl font-bold text-success">{stats?.onTrack || 0}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-success/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Attention</p>
                <p className="text-3xl font-bold text-destructive">{stats?.behind || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Your Students</CardTitle>
          <CardDescription>
            Today's progress overview for each student
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Students Yet</h3>
              <p className="text-muted-foreground mb-4">
                Students can join using your class code.
              </p>
              <Link to="/dashboard/people">
                <Button className="bg-cta-primary hover:bg-cta-hover text-white">
                  Manage Classes
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        student.status === "on-track"
                          ? "bg-success"
                          : student.status === "behind"
                          ? "bg-destructive"
                          : "bg-muted-foreground"
                      }`}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{student.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress
                          value={student.completionRate}
                          className="h-2 flex-1 max-w-32"
                        />
                        <span className="text-xs text-muted-foreground">
                          {student.completedToday}/{student.totalToday} tasks
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        student.status === "on-track"
                          ? "default"
                          : student.status === "behind"
                          ? "destructive"
                          : "secondary"
                      }
                      className={
                        student.status === "on-track"
                          ? "bg-success text-white"
                          : ""
                      }
                    >
                      {student.status === "on-track"
                        ? "On Track"
                        : student.status === "behind"
                        ? "Behind"
                        : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedStudent(student);
                        setNoteDialogOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dashboard/calendar">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-cta-primary" />
                  <div>
                    <p className="font-medium text-foreground">View Calendar</p>
                    <p className="text-sm text-muted-foreground">See all tasks</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard/templates">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-btn-secondary" />
                  <div>
                    <p className="font-medium text-foreground">Templates</p>
                    <p className="text-sm text-muted-foreground">Create routines</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard/recurring">
          <Card className="border-border hover:border-cta-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-success" />
                  <div>
                    <p className="font-medium text-foreground">Recurring</p>
                    <p className="text-sm text-muted-foreground">Manage schedules</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Send Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Note to {selectedStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write an encouraging message, feedback, or reminder..."
              rows={4}
              className="bg-card border-border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendNote}
              disabled={!noteContent.trim() || sendingNote}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendingNote ? "Sending..." : "Send Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
