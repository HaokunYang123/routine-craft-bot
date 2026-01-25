import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGroups } from "@/hooks/useGroups";
import { useAssignments } from "@/hooks/useAssignments";
import { GroupReviewCard, GroupData } from "@/components/groups/GroupReviewCard";
import { StudentDetailSheet } from "@/components/dashboard/StudentDetailSheet";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Loader2, Sparkles, FileText } from "lucide-react";
import { format } from "date-fns";

const GROUP_COLORS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Orange" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#06B6D4", label: "Cyan" },
];

export default function CoachDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { groups, loading: groupsLoading, createGroup, fetchGroups } = useGroups();
  const { getGroupProgress } = useAssignments();

  const [groupsWithStats, setGroupsWithStats] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Group State
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3B82F6");
  const [creating, setCreating] = useState(false);

  // Weekly Summary State
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState("");

  // Student Detail Sheet State
  const [studentSheetOpen, setStudentSheetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!groupsLoading && groups.length > 0) {
      loadGroupStats();
    } else if (!groupsLoading) {
      setLoading(false);
    }
  }, [groups, groupsLoading]);

  const loadGroupStats = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      const statsPromises = groups.map(async (group) => {
        const progress = await getGroupProgress(group.id, today);

        return {
          id: group.id,
          name: group.name,
          color: group.color,
          icon: group.icon,
          memberCount: group.member_count || 0,
          completedToday: progress.completed,
          totalToday: progress.total,
          members: progress.members.map((m) => ({
            id: m.id,
            name: m.name,
            completedToday: m.completedToday,
            totalToday: m.totalToday,
          })),
          flaggedMembers: progress.members.filter(
            (m) => m.totalToday > 0 && (m.completedToday / m.totalToday) < 0.5
          ).length,
        };
      });

      const stats = await Promise.all(statsPromises);
      setGroupsWithStats(stats);
    } catch (error) {
      console.error("Error loading group stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);

    const result = await createGroup(newGroupName.trim(), newGroupColor);
    if (result) {
      setNewGroupName("");
      setNewGroupColor("#3B82F6");
      setCreateOpen(false);
    }
    setCreating(false);
  };

  const handleGenerateWeeklySummary = async () => {
    setGeneratingSummary(true);
    setWeeklySummary("");

    try {
      // Collect completion data for all groups
      const completionData = groupsWithStats.map((g) => ({
        group: g.name,
        members: g.members?.map((m) => ({
          name: m.name,
          completed: m.completedToday,
          total: m.totalToday,
          rate: m.totalToday > 0 ? Math.round((m.completedToday / m.totalToday) * 100) : 0,
        })) || [],
        overallRate: g.totalToday > 0
          ? Math.round((g.completedToday / g.totalToday) * 100)
          : 0,
      }));

      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          action: "weekly_summary",
          payload: { completionData },
        },
      });

      if (error) throw error;

      setWeeklySummary(data.result || "Unable to generate summary. Please try again.");
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate weekly summary",
        variant: "destructive",
      });
      setWeeklySummary("Unable to generate summary. Please try again later.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleMemberClick = (memberId: string) => {
    // Find the member name from groupsWithStats
    let memberName = "Student";
    for (const group of groupsWithStats) {
      const member = group.members?.find((m) => m.id === memberId);
      if (member) {
        memberName = member.name;
        break;
      }
    }
    setSelectedStudent({ id: memberId, name: memberName });
    setStudentSheetOpen(true);
  };

  if (loading || groupsLoading) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-40 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  const totalMembers = groupsWithStats.reduce((sum, g) => sum + g.memberCount, 0);
  const totalCompleted = groupsWithStats.reduce((sum, g) => sum + g.completedToday, 0);
  const totalTasks = groupsWithStats.reduce((sum, g) => sum + g.totalToday, 0);
  const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-btn-secondary/30 text-btn-secondary">
                <FileText className="w-4 h-4 mr-2" />
                Weekly Summary
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cta-primary" />
                  AI Weekly Summary
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {weeklySummary ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-muted/30 p-4 rounded-lg whitespace-pre-wrap">
                      {weeklySummary}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">
                      Generate an AI summary of your team's weekly performance
                    </p>
                    <Button
                      onClick={handleGenerateWeeklySummary}
                      disabled={generatingSummary}
                      className="bg-cta-primary hover:bg-cta-hover text-white"
                    >
                      {generatingSummary ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Summary
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {weeklySummary && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWeeklySummary("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleGenerateWeeklySummary}
                    disabled={generatingSummary}
                    className="bg-cta-primary hover:bg-cta-hover text-white"
                  >
                    {generatingSummary ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cta-primary hover:bg-cta-hover text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Baseball Team, Period 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: newGroupColor }}
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-cta-primary hover:bg-cta-hover text-white"
                  >
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Group
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{groups.length}</p>
              <p className="text-sm text-muted-foreground">Groups</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{totalMembers}</p>
              <p className="text-sm text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {totalCompleted}/{totalTasks}
              </p>
              <p className="text-sm text-muted-foreground">Tasks Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className={`text-3xl font-bold ${
                overallRate >= 80 ? "text-success" :
                overallRate >= 50 ? "text-yellow-500" :
                "text-destructive"
              }`}>
                {overallRate}%
              </p>
              <p className="text-sm text-muted-foreground">Completion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Your Groups</h2>
        {groupsWithStats.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No Groups Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create groups to organize your students (e.g., "Baseball Team", "Period 1")
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-cta-primary hover:bg-cta-hover text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groupsWithStats.map((group) => (
              <GroupReviewCard
                key={group.id}
                group={group}
                onMemberClick={handleMemberClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Student Detail Sheet */}
      <StudentDetailSheet
        open={studentSheetOpen}
        onOpenChange={setStudentSheetOpen}
        studentId={selectedStudent?.id || null}
        studentName={selectedStudent?.name || "Student"}
      />
    </div>
  );
}
