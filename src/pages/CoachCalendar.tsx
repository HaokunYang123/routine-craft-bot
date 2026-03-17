/**
 * CoachCalendar - Coach's calendar view for scheduled tasks.
 *
 * Performance optimizations (Phase 14-03):
 * - Sub-components (DayCell, WeekView, DayView, TaskList) wrapped in React.memo
 * - Event handlers (handleDateClick, navigatePeriod, goToToday) use useCallback
 * - Derived data (tasksByDateMap) uses useMemo for O(1) date lookups
 * - getTasksForDate, getCompletionStats, getGroupColorsForDate, hasEvents use useCallback
 */
import React, { useState, useEffect, useMemo, useCallback, Profiler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onRenderCallback } from "@/lib/profiling";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useTimezone } from "@/hooks/useTimezone";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useVisibilityRefetch } from "@/hooks/useVisibilityRefetch";
import { REALTIME_CHANNELS } from "@/lib/realtime/channels";
import { queryKeys } from "@/lib/queries/keys";
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
  Pencil,
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
import { cn } from "@/lib/utils";
import { CalendarSkeleton } from "@/components/skeletons/CalendarSkeleton";
import { handleError } from "@/lib/error";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import {
  EditTaskInstanceModal,
} from "@/components/coach/EditTaskInstanceModal";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameDay,
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
  assignmentId: string | null;
  name: string;
  description: string | null;
  assigneeName: string;
  assigneeId: string;
  groupId: string | null;
  groupName: string | null;
  groupColor: string;
  scheduledDate: string;
  scheduledTime: string | null;
  startTime: string | null;
  endTime: string | null;
  status: "pending" | "completed" | "missed";
  durationMinutes: number | null;
}

interface GroupInfo {
  id: string;
  name: string;
  color: string;
}

type ViewMode = "month" | "week" | "day";

// Props interface for memoized DayCell component
interface DayCellProps {
  date: Date | null;
  isToday: boolean;
  isSelected: boolean;
  hasEvents: boolean;
  onDateClick: (date: Date) => void;
}

// DayCell Component - Memoized to prevent re-renders of individual cells
const DayCell = React.memo(function DayCell({
  date,
  isToday: isTodayProp,
  isSelected,
  hasEvents: hasEventsProp,
  onDateClick,
}: DayCellProps) {
  if (!date) {
    return <button disabled className="aspect-square p-1 rounded-lg text-sm font-medium invisible" />;
  }

  return (
    <button
      onClick={() => onDateClick(date)}
      className={cn(
        "aspect-square p-1 rounded-lg text-sm font-medium transition-all relative",
        "hover:bg-muted",
        isTodayProp && "bg-cta-primary/10 text-cta-primary",
        isSelected && "bg-cta-primary text-white",
        !isTodayProp && !isSelected && "text-foreground"
      )}
    >
      {date.getDate()}
      {hasEventsProp && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <span className="block w-1.5 h-1.5 rounded-full bg-green-500" />
        </div>
      )}
    </button>
  );
});

const STATUS_STYLES: Record<ScheduledTask["status"], string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-green-500/15 text-green-700 dark:text-green-300",
  missed: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const formatTaskTimeRange = (startTime: string | null, endTime: string | null) => {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  if (endTime) return endTime;
  return "Any time";
};

const GroupedTasksByName = React.memo(function GroupedTasksByName({ tasks }: { tasks: ScheduledTask[] }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No tasks scheduled</h3>
        <p className="text-muted-foreground">
          No tasks are scheduled for this day.
        </p>
      </div>
    );
  }

  const tasksByName = tasks.reduce((acc, task) => {
    const taskName = task.name || "Untitled Task";
    if (!acc[taskName]) {
      acc[taskName] = [];
    }
    acc[taskName].push(task);
    return acc;
  }, {} as Record<string, ScheduledTask[]>);

  return (
    <div className="space-y-4">
      {Object.entries(tasksByName).map(([taskName, groupedTasks]) => (
        <div key={taskName} className="rounded-lg border border-border p-3">
          <h3 className="font-semibold text-foreground">
            {taskName}
          </h3>
          <div className="mt-3 space-y-2">
            {groupedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{task.assigneeName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {formatTaskTimeRange(task.startTime, task.endTime)}
                  </span>
                  <Badge className={STATUS_STYLES[task.status]}>
                    {task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default function CoachCalendar() {
  const { user } = useAuth();
  const { groups, fetchGroups } = useGroups();
  const { formatDate } = useTimezone();
  const queryClient = useQueryClient();

  // Realtime subscription for task completions (REAL-01: coach sees updates)
  // Filter by coach_id for efficient realtime delivery (GAP-01 closure)
  const assignmentQueryKeys = [queryKeys.assignments.all] as const;
  useRealtimeSubscription({
    channelName: REALTIME_CHANNELS.COACH_TASK_UPDATES(user?.id || ''),
    table: 'task_instances',
    filter: `coach_id=eq.${user?.id}`,
    event: '*',
    queryKeysToInvalidate: assignmentQueryKeys,
    enabled: !!user,
  });

  // Refetch on tab visibility change
  useVisibilityRefetch(assignmentQueryKeys);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
      queryClient.invalidateQueries({ queryKey: ["task_instances"] }),
    ]);
  }, [queryClient]);

  const groupMap = useMemo(() => {
    // Build group map synchronously from groups to avoid stale fetch/mapping
    const map: Record<string, GroupInfo> = {};
    groups.forEach((g) => {
      map[g.id] = { id: g.id, name: g.name, color: g.color };
    });
    return map;
  }, [groups]);

  // Refetch groups when window gains focus (handles deletions from other tabs/pages)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchGroups();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user, fetchGroups]);

  useEffect(() => {
    if (selectedGroupId === "all") return;
    const groupStillExists = groups.some((group) => group.id === selectedGroupId);
    if (!groupStillExists) {
      setSelectedGroupId("all");
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      if (!event.matches) {
        setSheetOpen(false);
      }
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!user || groups.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // Always fetch for the currently visible month range.
      const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

      // Resolve groups to load: selected group or all coach groups.
      const groupIds = selectedGroupId === "all"
        ? groups.map((group) => group.id)
        : [selectedGroupId];

      if (groupIds.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Get student user IDs from group membership for selected group scope.
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, group_id")
        .in("group_id", groupIds);

      if (!members || members.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const memberUserIds = [...new Set(members.map((member) => member.user_id))];
      const memberGroupMap: Record<string, string> = {};
      members.forEach((m) => {
        if (!memberGroupMap[m.user_id]) {
          memberGroupMap[m.user_id] = m.group_id;
        }
      });

      // Fetch task instances for coach + selected group's students in month range.
      const { data: taskInstances, error } = await supabase
        .from("task_instances")
        .select("id, assignment_id, name, scheduled_date, start_time, end_time, status, assignee_id")
        .eq("coach_id", user.id)
        .in("assignee_id", memberUserIds)
        .gte("scheduled_date", monthStart)
        .lte("scheduled_date", monthEnd)
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Get profiles for display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", memberUserIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        const emailPrefix = p.email ? p.email.split("@")[0] : null;
        profileMap[p.user_id] = p.display_name || emailPrefix || "Student";
      });

      // Map task instances for calendar rendering.
      const mappedTasks: ScheduledTask[] = (taskInstances || [])
        .map((task) => {
          const groupId = memberGroupMap[task.assignee_id];
          const group = groupId ? groupMap[groupId] : null;

          return {
            id: task.id,
            assignmentId: task.assignment_id,
            name: task.name,
            description: null,
            assigneeName: profileMap[task.assignee_id] || "Student",
            assigneeId: task.assignee_id,
            groupId: groupId || null,
            groupName: group?.name || null,
            groupColor: group?.color || "#6B7280",
            scheduledDate: task.scheduled_date,
            scheduledTime: task.start_time,
            startTime: task.start_time,
            endTime: task.end_time,
            status: task.status === "completed" || task.status === "missed" ? task.status : "pending",
            durationMinutes: null,
          };
        })
        .filter((task): task is ScheduledTask => Boolean(task.scheduledDate));

      setTasks(mappedTasks);
    } catch (error) {
      handleError(error, { component: 'CoachCalendar', action: 'fetch tasks', silent: true });
    } finally {
      setLoading(false);
    }
  }, [currentDate, groupMap, groups, selectedGroupId, user]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, fetchTasks]);

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

  // Memoize tasksByDateMap for efficient lookups
  const tasksByDateMap = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>();
    tasks.forEach(task => {
      const key = task.scheduledDate;
      const existing = map.get(key) || [];
      map.set(key, [...existing, task]);
    });
    return map;
  }, [tasks]);

  // Memoized getTasksForDate using the map
  const getTasksForDate = useCallback((date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return tasksByDateMap.get(dateKey) || [];
  }, [tasksByDateMap]);

  const navigatePeriod = useCallback((direction: number) => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    } else if (viewMode === "week") {
      setCurrentDate(direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, direction));
    }
  }, [viewMode, currentDate]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    if (isMobile) {
      setSheetOpen(true);
    } else {
      setSheetOpen(false);
    }
  }, [isMobile]);

  const hasEvents = useCallback((date: Date) => {
    return getTasksForDate(date).length > 0;
  }, [getTasksForDate]);

  const days = viewMode === "month" ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
  const selectedTasks = getTasksForDate(selectedDate);

  const renderPeriodTitle = () => {
    if (viewMode === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      // Use timezone-aware formatting for display (TIME-02)
      return `${formatDate(start, "MMM d")} - ${formatDate(end, "MMM d, yyyy")}`;
    } else {
      return formatDate(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  if (loading && tasks.length === 0) {
    return <CalendarSkeleton />;
  }

  // Profiler wrapper for performance measurement - see PROFILING-REPORT.md
  return (
    <Profiler id="CoachCalendar" onRender={onRenderCallback}>
    <PullToRefresh onRefresh={handleRefresh}>
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

      {/* Group Filter Chips */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedGroupId === "all" ? "default" : "outline"}
            onClick={() => setSelectedGroupId("all")}
          >
            All groups
          </Button>
          {groups.map((group) => (
            <Button
              key={group.id}
              size="sm"
              variant={selectedGroupId === group.id ? "default" : "outline"}
              onClick={() => setSelectedGroupId(group.id)}
              className="flex items-center gap-1.5"
              style={{ borderColor: group.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className={cn("border-border", viewMode === "day" ? "md:col-span-3" : "md:col-span-2")}>
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
                    const todayCheck = date ? isToday(date) : false;
                    const selectedCheck = date ? isSameDay(date, selectedDate) : false;
                    const hasEventsCheck = date ? hasEvents(date) : false;

                    return (
                      <DayCell
                        key={i}
                        date={date}
                        isToday={todayCheck}
                        isSelected={selectedCheck}
                        hasEvents={hasEventsCheck}
                        onDateClick={handleDateClick}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Tasks - Only show in month/week view */}
        {viewMode !== "day" && (
          <Card className="border-border hidden md:block">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-cta-primary" />
                {formatDate(selectedDate, "EEEE, MMM d")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GroupedTasksByName tasks={selectedTasks} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Day Sheet - Slides out when clicking a date */}
      {isMobile && (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <CalendarIcon className="w-5 h-5 text-cta-primary" />
              {formatDate(selectedDate, "EEEE, MMMM d, yyyy")}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <GroupedTasksByName tasks={selectedTasks} />
          </div>
        </SheetContent>
      </Sheet>
      )}
    </div>
    </PullToRefresh>
    </Profiler>
  );
}

// Week View Component - Memoized to prevent re-renders when other state changes
const WeekView = React.memo(function WeekView({
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
});

// Day View Component - Memoized to prevent re-renders when other state changes
const DayView = React.memo(function DayView({
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
              <TaskList tasks={groupTasks} onRefresh={onRefresh} />
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
});

// Maximum tasks to show in sidebar before collapse
const MAX_SIDEBAR_TASKS = 5;

// Shared Task List Component - Memoized to prevent re-renders when other state changes
const TaskList = React.memo(function TaskList({
  tasks,
  onRefresh,
}: {
  tasks: ScheduledTask[];
  onRefresh: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

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
      handleError(error, { component: 'TaskSidebar', action: 'toggle task complete', silent: true });
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
    <>
      <div className="space-y-3">
        {visibleTasks.map((task) => {
          const isTaskExpanded = expandedTasks.has(task.id);
          const hasDescription = task.description && task.description.trim().length > 0;
          const isEditable = task.status === "pending" || task.status === "missed";

          return (
            <div
              key={task.id}
              className={cn(
                "rounded-lg border-l-4 transition-all overflow-hidden",
                task.status === "completed"
                  ? "border-border bg-muted/30"
                  : "border-border bg-card hover:bg-muted/20"
              )}
              style={{ borderLeftColor: task.groupColor }}
            >
              {/* Main row: always visible */}
              <div
                className={cn(
                  "p-3 flex items-center gap-3",
                  hasDescription && "cursor-pointer"
                )}
                onClick={() => hasDescription && toggleTaskExpanded(task.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(
                      task.id,
                      task.status === "completed" ? "pending" : "completed"
                    );
                  }}
                  className="focus:outline-none focus:ring-2 focus:ring-cta-primary rounded-full shrink-0"
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-cta-primary" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground hover:text-cta-primary transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <p
                    className={cn(
                      "font-medium truncate",
                      task.status === "completed"
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {task.name}
                  </p>

                  {/* Source info: Group + Student - always visible */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {task.groupName && (
                      <Badge
                        variant="outline"
                        className="text-xs h-5 px-1.5"
                        style={{ borderColor: task.groupColor, color: task.groupColor }}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {task.groupName}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {task.assigneeName}
                    </span>
                    {task.durationMinutes && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {task.durationMinutes}m
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingTask(task);
                      }}
                      title="Edit task"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                  {hasDescription && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isTaskExpanded && "rotate-180"
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Expanded description */}
              {hasDescription && isTaskExpanded && (
                <div className="px-3 pb-3 pt-0 ml-8 mr-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}

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

      <EditTaskInstanceModal
        instanceToEdit={editingTask ? {
          instance_id: editingTask.id,
          task_title: editingTask.name,
          current_date: editingTask.scheduledDate,
          current_start_time: editingTask.startTime,
          current_end_time: editingTask.endTime,
          assignment_id: editingTask.assignmentId,
          status: editingTask.status,
        } : null}
        isOpen={!!editingTask}
        onDismiss={() => setEditingTask(null)}
        onSaveComplete={onRefresh}
      />
    </>
  );
});
