import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Loader2,
  List,
  CalendarDays,
  CheckCircle2,
  Circle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameDay,
  parseISO,
  addDays,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
} from "date-fns";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  assigneeName: string;
  assigneeId: string;
  groupId: string | null;
  groupName: string | null;
  groupColor: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: "pending" | "completed" | "missed";
  durationMinutes: number | null;
}

interface GroupInfo {
  id: string;
  name: string;
  color: string;
}

type ViewMode = "month" | "week" | "day";

export default function CoachCalendar() {
  const { user } = useAuth();
  const { groups } = useGroups();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMap, setGroupMap] = useState<Record<string, GroupInfo>>({});
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    // Build group map for quick lookup
    const map: Record<string, GroupInfo> = {};
    groups.forEach((g) => {
      map[g.id] = { id: g.id, name: g.name, color: g.color };
    });
    setGroupMap(map);
  }, [groups]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, currentDate, viewMode, groups]);

  const fetchTasks = async () => {
    if (!user || groups.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // Calculate date range based on view mode
      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (viewMode === "week") {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = currentDate;
        endDate = currentDate;
      }

      // Get all group member user IDs for the coach's groups
      const groupIds = groups.map((g) => g.id);
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, group_id")
        .in("group_id", groupIds);

      if (!members || members.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const memberUserIds = members.map((m) => m.user_id);
      const memberGroupMap: Record<string, string> = {};
      members.forEach((m) => {
        memberGroupMap[m.user_id] = m.group_id;
      });

      // Fetch task instances for these members in the date range
      const { data: taskInstances, error } = await supabase
        .from("task_instances")
        .select("*")
        .in("assignee_id", memberUserIds)
        .gte("scheduled_date", format(startDate, "yyyy-MM-dd"))
        .lte("scheduled_date", format(endDate, "yyyy-MM-dd"))
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (error) throw error;

      // Get profiles for display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", memberUserIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = p.display_name || "Student";
      });

      // Map task instances with group colors
      const mappedTasks: ScheduledTask[] = (taskInstances || []).map((task: any) => {
        const groupId = memberGroupMap[task.assignee_id];
        const group = groupId ? groupMap[groupId] : null;

        return {
          id: task.id,
          name: task.name,
          description: task.description,
          assigneeName: profileMap[task.assignee_id] || "Student",
          assigneeId: task.assignee_id,
          groupId: groupId || null,
          groupName: group?.name || null,
          groupColor: group?.color || "#6B7280",
          scheduledDate: task.scheduled_date,
          scheduledTime: task.scheduled_time,
          status: task.status,
          durationMinutes: task.duration_minutes,
        };
      });

      setTasks(mappedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = parseISO(task.scheduledDate);
      return isSameDay(taskDate, date);
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    return eachDayOfInterval({
      start: startOfWeek(date),
      end: endOfWeek(date),
    });
  };

  const navigatePeriod = (direction: number) => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    } else if (viewMode === "week") {
      setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, direction));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSheetOpen(true);
  };

  const hasEvents = (date: Date) => {
    return getTasksForDate(date).length > 0;
  };

  const getCompletionStats = (date: Date) => {
    const dateTasks = getTasksForDate(date);
    const completed = dateTasks.filter((t) => t.status === "completed").length;
    const total = dateTasks.length;
    return { completed, total };
  };

  const getGroupColorsForDate = (date: Date) => {
    const dateTasks = getTasksForDate(date);
    const uniqueColors = [...new Set(dateTasks.map((t) => t.groupColor))];
    return uniqueColors.slice(0, 3); // Show max 3 colors
  };

  const days = viewMode === "month" ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
  const selectedTasks = getTasksForDate(selectedDate);

  const renderPeriodTitle = () => {
    if (viewMode === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View tasks across all groups
          </p>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="month" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Month</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Week</span>
            </TabsTrigger>
            <TabsTrigger value="day" className="gap-2">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Day</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Group Legend */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Badge
              key={group.id}
              variant="outline"
              className="flex items-center gap-1.5"
              style={{ borderColor: group.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className={cn("border-border", viewMode === "day" ? "lg:col-span-3" : "lg:col-span-2")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-foreground">
                {renderPeriodTitle()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigatePeriod(-1)}
                  className="h-8 w-8 border-border"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="border-border"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigatePeriod(1)}
                  className="h-8 w-8 border-border"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "day" ? (
              <DayView
                date={currentDate}
                tasks={getTasksForDate(currentDate)}
                onRefresh={fetchTasks}
              />
            ) : viewMode === "week" ? (
              <WeekView
                days={days as Date[]}
                selectedDate={selectedDate}
                onSelectDate={handleDateClick}
                getTasksForDate={getTasksForDate}
              />
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(days as (Date | null)[]).map((date, i) => {
                    const stats = date ? getCompletionStats(date) : { completed: 0, total: 0 };
                    const groupColors = date ? getGroupColorsForDate(date) : [];

                    return (
                      <button
                        key={i}
                        disabled={!date}
                        onClick={() => date && handleDateClick(date)}
                        className={cn(
                          "aspect-square p-1 rounded-lg text-sm font-medium transition-all relative",
                          !date && "invisible",
                          date && "hover:bg-muted",
                          date && isToday(date) && "bg-cta-primary/10 text-cta-primary",
                          date && isSameDay(date, selectedDate) && "bg-cta-primary text-white",
                          date && !isToday(date) && !isSameDay(date, selectedDate) && "text-foreground"
                        )}
                      >
                        {date?.getDate()}
                        {date && hasEvents(date) && !isSameDay(date, selectedDate) && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {groupColors.map((color, idx) => (
                              <span
                                key={idx}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Tasks - Only show in month/week view */}
        {viewMode !== "day" && (
          <Card className="border-border hidden lg:block">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-cta-primary" />
                {format(selectedDate, "EEEE, MMM d")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList tasks={selectedTasks} onRefresh={fetchTasks} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Day Sheet - Slides out when clicking a date */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <CalendarIcon className="w-5 h-5 text-cta-primary" />
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </SheetTitle>
            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Progress
                  value={Math.round((selectedTasks.filter(t => t.status === "completed").length / selectedTasks.length) * 100)}
                  className="h-2 flex-1"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedTasks.filter(t => t.status === "completed").length}/{selectedTasks.length}
                </span>
              </div>
            )}
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {selectedTasks.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No tasks scheduled</h3>
                <p className="text-muted-foreground">
                  No tasks are scheduled for this day.
                </p>
              </div>
            ) : (
              <DaySheetContent
                tasks={selectedTasks}
                groups={groups}
                groupMap={groupMap}
                onRefresh={() => {
                  fetchTasks();
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Maximum tasks to show before collapse
const MAX_VISIBLE_TASKS = 3;

// Day Sheet Content Component - Shows groups with members and their tasks
function DaySheetContent({
  tasks,
  groups,
  groupMap,
  onRefresh,
}: {
  tasks: ScheduledTask[];
  groups: { id: string; name: string; color: string }[];
  groupMap: Record<string, GroupInfo>;
  onRefresh: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groups.map(g => g.id)));
  // Track which members have expanded task lists (key: memberId)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleMemberTasks = (memberId: string) => {
    setExpandedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // Group tasks by group, then by member
  const tasksByGroup = tasks.reduce((acc, task) => {
    const groupId = task.groupId || "unassigned";
    const groupName = task.groupName || "Unassigned";
    const groupColor = task.groupColor || "#6B7280";

    if (!acc[groupId]) {
      acc[groupId] = {
        name: groupName,
        color: groupColor,
        members: {},
      };
    }

    const memberId = task.assigneeId;
    const memberName = task.assigneeName;

    if (!acc[groupId].members[memberId]) {
      acc[groupId].members[memberId] = {
        name: memberName,
        tasks: [],
      };
    }

    acc[groupId].members[memberId].tasks.push(task);
    return acc;
  }, {} as Record<string, { name: string; color: string; members: Record<string, { name: string; tasks: ScheduledTask[] }> }>);

  const handleToggleComplete = async (taskId: string, newStatus: "pending" | "completed") => {
    try {
      const { error } = await supabase
        .from("task_instances")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(tasksByGroup).map(([groupId, group]) => {
        const isExpanded = expandedGroups.has(groupId);
        const allTasks = Object.values(group.members).flatMap(m => m.tasks);
        const completedCount = allTasks.filter(t => t.status === "completed").length;
        const totalCount = allTasks.length;
        const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
          <Collapsible
            key={groupId}
            open={isExpanded}
            onOpenChange={() => toggleGroup(groupId)}
          >
            <CollapsibleTrigger asChild>
              <div
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                style={{ borderLeftWidth: "4px", borderLeftColor: group.color }}
                role="button"
                aria-expanded={isExpanded}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleGroup(groupId);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5" style={{ color: group.color }} />
                  <div>
                    <h3 className="font-semibold text-foreground">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(group.members).length} members • {completedCount}/{totalCount} tasks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={completionRate === 100 ? "default" : "secondary"}
                    className={completionRate === 100 ? "bg-green-500/20 text-green-700" : ""}
                  >
                    {completionRate}%
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 space-y-3 pl-4">
              {Object.entries(group.members).map(([memberId, member]) => {
                const memberCompleted = member.tasks.filter(t => t.status === "completed").length;
                const memberTotal = member.tasks.length;
                const memberRate = memberTotal > 0 ? Math.round((memberCompleted / memberTotal) * 100) : 0;
                const isMemberExpanded = expandedMembers.has(memberId);
                const hasMoreTasks = member.tasks.length > MAX_VISIBLE_TASKS;
                const visibleTasks = isMemberExpanded
                  ? member.tasks
                  : member.tasks.slice(0, MAX_VISIBLE_TASKS);
                const hiddenCount = member.tasks.length - MAX_VISIBLE_TASKS;

                return (
                  <div key={memberId} className="border rounded-lg p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          memberRate === 100 ? "bg-green-500 text-white" :
                          memberRate < 50 ? "bg-destructive text-white" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {memberCompleted}/{memberTotal} complete
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        memberRate === 100 && "text-green-600",
                        memberRate < 50 && "text-destructive"
                      )}>
                        {memberRate}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      {visibleTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md text-sm",
                            task.status === "completed" ? "bg-muted/50" : "bg-background"
                          )}
                        >
                          <button
                            onClick={() => handleToggleComplete(
                              task.id,
                              task.status === "completed" ? "pending" : "completed"
                            )}
                            className="focus:outline-none focus:ring-2 focus:ring-cta-primary rounded"
                            aria-label={task.status === "completed" ? "Mark as incomplete" : "Mark as complete"}
                          >
                            {task.status === "completed" ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground hover:text-cta-primary" />
                            )}
                          </button>
                          <span className={cn(
                            "flex-1 truncate",
                            task.status === "completed" && "line-through text-muted-foreground"
                          )}>
                            {task.name}
                          </span>
                          {task.durationMinutes && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {task.durationMinutes}m
                            </Badge>
                          )}
                        </div>
                      ))}

                      {/* Show more/less button */}
                      {hasMoreTasks && (
                        <button
                          onClick={() => toggleMemberTasks(memberId)}
                          className="w-full text-center py-2 text-xs font-medium text-cta-primary hover:text-cta-hover hover:bg-muted/50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cta-primary"
                          aria-expanded={isMemberExpanded}
                          aria-label={isMemberExpanded ? "Show less tasks" : `Show ${hiddenCount} more tasks`}
                        >
                          {isMemberExpanded ? (
                            <span className="flex items-center justify-center gap-1">
                              <ChevronUp className="w-3 h-3" />
                              Show less
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1">
                              <ChevronDown className="w-3 h-3" />
                              Show {hiddenCount} more task{hiddenCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

// Week View Component
function WeekView({
  days,
  selectedDate,
  onSelectDate,
  getTasksForDate,
}: {
  days: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getTasksForDate: (date: Date) => ScheduledTask[];
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((date) => {
        const dateTasks = getTasksForDate(date);
        const completed = dateTasks.filter((t) => t.status === "completed").length;
        const total = dateTasks.length;

        return (
          <div
            key={date.toISOString()}
            onClick={() => onSelectDate(date)}
            className={cn(
              "min-h-[120px] p-2 rounded-lg border cursor-pointer transition-all",
              isToday(date) && "border-cta-primary bg-cta-primary/5",
              isSameDay(date, selectedDate) && "ring-2 ring-cta-primary",
              !isToday(date) && !isSameDay(date, selectedDate) && "border-border hover:border-cta-primary/50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-sm font-medium",
                isToday(date) ? "text-cta-primary" : "text-foreground"
              )}>
                {format(date, "EEE")}
              </span>
              <span className={cn(
                "text-lg font-bold",
                isToday(date) ? "text-cta-primary" : "text-foreground"
              )}>
                {format(date, "d")}
              </span>
            </div>

            {total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={completed === total ? "text-cta-primary" : "text-urgent"}>
                    {completed}/{total}
                  </span>
                  <span>tasks</span>
                </div>
                {dateTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "text-xs truncate px-1 py-0.5 rounded border-l-2",
                      task.status === "completed"
                        ? "bg-muted/50 text-muted-foreground line-through"
                        : "bg-muted text-foreground"
                    )}
                    style={{ borderLeftColor: task.groupColor }}
                  >
                    {task.name}
                  </div>
                ))}
                {dateTasks.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{dateTasks.length - 2} more
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Day View Component
function DayView({
  date,
  tasks,
  onRefresh,
}: {
  date: Date;
  tasks: ScheduledTask[];
  onRefresh: () => void;
}) {
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  // Group tasks by group
  const tasksByGroup = tasks.reduce((acc, task) => {
    const groupName = task.groupName || "Unassigned";
    if (!acc[groupName]) {
      acc[groupName] = {
        color: task.groupColor,
        tasks: [],
      };
    }
    acc[groupName].tasks.push(task);
    return acc;
  }, {} as Record<string, { color: string; tasks: ScheduledTask[] }>);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div>
          <h3 className="font-medium text-foreground">
            {format(date, "EEEE, MMMM d, yyyy")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tasks scheduled
          </p>
        </div>
        {tasks.length > 0 && (
          <Badge variant={completedCount === tasks.length ? "default" : "secondary"}>
            {completedCount}/{tasks.length} Complete
          </Badge>
        )}
      </div>

      {/* Tasks grouped by group */}
      {Object.keys(tasksByGroup).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(tasksByGroup).map(([groupName, { color, tasks: groupTasks }]) => (
            <div key={groupName}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <h4 className="font-medium text-foreground">{groupName}</h4>
                <span className="text-sm text-muted-foreground">
                  ({groupTasks.filter((t) => t.status === "completed").length}/{groupTasks.length})
                </span>
              </div>
              <TaskList tasks={groupTasks} onRefresh={onRefresh} showDetails />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tasks scheduled</p>
        </div>
      )}
    </div>
  );
}

// Maximum tasks to show in sidebar before collapse
const MAX_SIDEBAR_TASKS = 5;

// Shared Task List Component
function TaskList({
  tasks,
  onRefresh,
  showDetails = false,
}: {
  tasks: ScheduledTask[];
  onRefresh: () => void;
  showDetails?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleComplete = async (taskId: string, newStatus: "pending" | "completed") => {
    try {
      const { error } = await supabase
        .from("task_instances")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No tasks scheduled</p>
      </div>
    );
  }

  const hasMoreTasks = tasks.length > MAX_SIDEBAR_TASKS;
  const visibleTasks = isExpanded ? tasks : tasks.slice(0, MAX_SIDEBAR_TASKS);
  const hiddenCount = tasks.length - MAX_SIDEBAR_TASKS;

  return (
    <div className="space-y-3">
      {visibleTasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "p-3 rounded-lg border-l-4 transition-all",
            task.status === "completed"
              ? "border-border bg-muted/30"
              : "border-border bg-card hover:bg-muted/20"
          )}
          style={{ borderLeftColor: task.groupColor }}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleToggleComplete(
                task.id,
                task.status === "completed" ? "pending" : "completed"
              )}
              className="mt-0.5 focus:outline-none focus:ring-2 focus:ring-cta-primary rounded-full"
            >
              {task.status === "completed" ? (
                <CheckCircle2 className="w-5 h-5 text-cta-primary" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground hover:text-cta-primary transition-colors" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-medium",
                  task.status === "completed"
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                )}
              >
                {task.name}
              </p>

              {showDetails && task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {task.assigneeName}
                </span>
                {task.durationMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.durationMinutes}m
                  </span>
                )}
                {task.groupName && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: task.groupColor, color: task.groupColor }}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {task.groupName}
                  </Badge>
                )}
              </div>
            </div>

            {task.status !== "completed" && (
              <Button
                size="sm"
                onClick={() => handleToggleComplete(task.id, "completed")}
                className="bg-cta-primary hover:bg-cta-hover text-white shrink-0"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Show more/less button for sidebar task list */}
      {hasMoreTasks && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-center py-2 text-sm font-medium text-cta-primary hover:text-cta-hover hover:bg-muted/50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cta-primary"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Show less tasks" : `Show ${hiddenCount} more tasks`}
        >
          {isExpanded ? (
            <span className="flex items-center justify-center gap-1">
              <ChevronUp className="w-4 h-4" />
              Show less
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <ChevronDown className="w-4 h-4" />
              Show {hiddenCount} more task{hiddenCount > 1 ? "s" : ""}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
