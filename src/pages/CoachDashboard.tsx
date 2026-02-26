import { useEffect, useState, Profiler, useCallback } from "react";
import { onRenderCallback } from "@/lib/profiling";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useAssignments } from "@/hooks/useAssignments";
import { useTimezone } from "@/hooks/useTimezone";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useVisibilityRefetch } from "@/hooks/useVisibilityRefetch";
import { REALTIME_CHANNELS } from "@/lib/realtime/channels";
import { queryKeys } from "@/lib/queries/keys";
import { GroupReviewCard, GroupData } from "@/components/groups/GroupReviewCard";
import { StudentDetailSheet } from "@/components/dashboard/StudentDetailSheet";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { WeeklySummary } from "@/components/ai/WeeklySummary";
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
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Loader2, FileText } from "lucide-react";
import { handleError } from "@/lib/error";

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
  const location = useLocation();
  const queryClient = useQueryClient();
  const { groups, loading: groupsLoading, createGroup } = useGroups();
  const { getGroupProgress } = useAssignments();
  const { todayDateString, formatDate } = useTimezone();

  // Realtime subscription for task completions (REAL-01)
  // Filter by coach_id for efficient realtime delivery (GAP-01 closure)
  const assignmentQueryKeys = [queryKeys.assignments.all] as const;
  useRealtimeSubscription({
    channelName: REALTIME_CHANNELS.COACH_TASK_UPDATES(user?.id || ''),
    table: 'task_instances',
    filter: `coach_id=eq.${user?.id}`,
    event: '*',
    queryKeysToInvalidate: assignmentQueryKeys,
    enabled: !!user && groups.length > 0 && location.pathname === '/dashboard',
  });

  // Refetch on tab visibility change (handles backgrounded tabs)
  useVisibilityRefetch(assignmentQueryKeys);

  const [groupsWithStats, setGroupsWithStats] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Group State
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3B82F6");
  const [creating, setCreating] = useState(false);

  // Weekly Summary State
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Student Detail Sheet State
  const [studentSheetOpen, setStudentSheetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  // Live date/time state (updates every minute)
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadGroupStats = useCallback(async () => {
    setLoading(true);
    // Use user's local date for "today" queries (TIME-03)
    const today = todayDateString;

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
            overdueCount: (m as unknown as { overdueCount?: number }).overdueCount || 0,
          })),
          // Flag members who have overdue tasks (not just low completion today)
          // This prevents "morning panic" where everyone is flagged at 8AM
          flaggedMembers: progress.members.filter(
            (m) => ((m as unknown as { overdueCount?: number }).overdueCount || 0) > 0
          ).length,
        };
      });

      const stats = await Promise.all(statsPromises);
      setGroupsWithStats(stats);
    } catch (error) {
      handleError(error, { component: 'CoachDashboard', action: 'load group stats', silent: true });
    } finally {
      setLoading(false);
    }
  }, [getGroupProgress, groups, todayDateString]);

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
      ]);
      await loadGroupStats();
    } catch (error) {
      handleError(error, { component: "CoachDashboard", action: "pull to refresh", silent: true });
    }
  }, [loadGroupStats, queryClient]);

  useEffect(() => {
    if (!groupsLoading && groups.length > 0) {
      void loadGroupStats();
    } else if (!groupsLoading) {
      setGroupsWithStats([]);
      setLoading(false);
    }
  }, [groups.length, groupsLoading, loadGroupStats]);

  // Update date header every minute (prevents frozen date display)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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

  // Profiler wrapper for performance measurement - see PROFILING-REPORT.md
  return (
    <Profiler id="CoachDashboard" onRender={onRenderCallback}>
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {formatDate(currentDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSummaryOpen((prev) => !prev)}
            className="border-btn-secondary/30 text-btn-secondary"
          >
            <FileText className="w-4 h-4 mr-2" />
            Weekly Summary
          </Button>

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
                      <SelectValue placeholder="Select a color">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: newGroupColor }}
                          />
                          {GROUP_COLORS.find(c => c.value === newGroupColor)?.label}
                        </div>
                      </SelectValue>
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

      {summaryOpen && <WeeklySummary />}

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
              <p className="text-muted-foreground max-w-md mx-auto">
                Click "New Group" above to create your first group and start organizing your students.
              </p>
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
    </PullToRefresh>
    </Profiler>
  );
}
