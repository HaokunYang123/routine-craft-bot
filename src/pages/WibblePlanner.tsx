import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  SketchCheckbox,
  SketchProgress,
  DashedDivider,
  SketchStar,
  SketchBook,
  SketchClock,
  SketchTrophy,
  SketchFlame,
  SketchRibbon,
  StickerDisplay,
  StatCard,
  SketchAvatar,
  EmptyState,
} from "@/components/ui/sketch";

interface Task {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  due_date: string | null;
  scheduled_time: string | null;
}

export default function WibblePlanner() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(7);
  const [totalStickers, setTotalStickers] = useState(12);

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data: todayData } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user!.id)
      .eq("due_date", today)
      .order("scheduled_time", { ascending: true });

    const { data: upcomingData } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user!.id)
      .gt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(5);

    if (todayData) setTasks(todayData);
    if (upcomingData) setUpcomingTasks(upcomingData);
    setLoading(false);
  };

  const toggleTask = async (task: Task) => {
    const newCompleted = !task.is_completed;
    await supabase
      .from("tasks")
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    fetchTasks();
  };

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const today = new Date();
  const formattedDate = format(today, "EEEE, MMMM d");

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    const days = differenceInDays(date, today);
    if (days <= 7) return `In ${days} days`;
    return format(date, "MMM d");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-display-sm font-display text-muted-foreground animate-pulse-subtle">
          Loading...
        </div>
      </div>
    );
  }

  const dayNumber = format(today, "dd");
  const monthNumber = format(today, "MM");
  const year = format(today, "yyyy");
  const dayName = format(today, "EEEE").toLowerCase();

  return (
    <div className="p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-6">
      {/* ============= HEADER ============= */}
      <header className="pt-4 pb-2">
        <div className="flex items-start justify-between">
          {/* Date display */}
          <div>
            <div className="flex items-baseline gap-3 font-display text-foreground">
              <span className="text-4xl font-bold tracking-wide">{dayNumber}</span>
              <span className="text-4xl font-bold tracking-wide">{monthNumber}</span>
              <span className="text-4xl font-bold tracking-wide">{year}</span>
            </div>
            <div className="mt-1">
              <span className="text-xl font-display text-foreground">{dayName}</span>
              {/* Wavy underline */}
              <svg className="w-20 h-2 mt-0.5" viewBox="0 0 80 8" fill="none">
                <path 
                  d="M2 4C8 2 14 6 20 4C26 2 32 6 38 4C44 2 50 6 56 4C62 2 68 6 74 4" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                  className="text-foreground"
                />
              </svg>
            </div>
          </div>
          
          {/* User info */}
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              Student
            </span>
            <SketchAvatar initials="JS" size="sm" />
          </div>
        </div>
      </header>

      {/* ============= STATS ROW ============= */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          value={`${progressPercent}%`}
          label="Progress"
        />
        <StatCard
          value={streak}
          label="Day Streak"
          icon={<SketchFlame className="w-5 h-5 text-accent-orange" />}
        />
        <StatCard
          value={totalStickers}
          label="Stickers"
          icon={<SketchStar filled className="w-5 h-5 text-accent-orange" />}
        />
      </div>

      {/* ============= TODAY'S TASKS ============= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-display-sm font-display text-foreground">
            Today's Tasks
          </h2>
          <span className="text-body-md font-medium text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>

        <SketchProgress value={completedCount} max={totalCount || 1} showLabel={false} />

        <div className="space-y-2 mt-4">
          {tasks.length === 0 ? (
            <EmptyState
              icon={<SketchBook className="w-10 h-10" />}
              title="No tasks today"
              description="You're all caught up! Check back later for new assignments."
            />
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-4 bg-card border border-border rounded-lg shadow-card transition-all",
                  task.is_completed && "opacity-60"
                )}
              >
                <SketchCheckbox
                  checked={!!task.is_completed}
                  onChange={() => toggleTask(task)}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-body-lg text-foreground block",
                      task.is_completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                  {task.scheduled_time && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <SketchClock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-body-md text-muted-foreground">
                        {task.scheduled_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>
                {task.duration_minutes && (
                  <span className="text-caption text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                    {task.duration_minutes}m
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <DashedDivider />

      {/* ============= UPCOMING DEADLINES ============= */}
      <section>
        <h2 className="text-display-sm font-display text-foreground mb-3">
          Upcoming Deadlines
        </h2>

        {upcomingTasks.length === 0 ? (
          <p className="text-body-md text-muted-foreground text-center py-4">
            No upcoming tasks
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
              >
                <span className="text-body-md text-foreground">{task.title}</span>
                <span className="text-caption font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                  {formatDueDate(task.due_date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <DashedDivider />

      {/* ============= COACH FEEDBACK ============= */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-display-sm font-display text-foreground">
            Coach Notes
          </h2>
          <SketchRibbon className="w-5 h-5 text-accent" />
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-card">
          <div className="flex items-start gap-3">
            <SketchAvatar initials="MS" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-body-md font-semibold text-foreground">Ms. Smith</span>
                <span className="text-caption text-muted-foreground">2 hours ago</span>
              </div>
              <p className="text-body-md text-foreground leading-relaxed">
                Great progress on your math assignments this week! Keep up the momentum. 
                Remember to review chapter 5 before Friday's quiz. ⭐
              </p>
            </div>
          </div>
        </div>

        <div className="bg-secondary rounded-lg p-3 mt-2">
          <p className="text-caption text-muted-foreground text-center">
            Your coach can leave feedback and award stickers here
          </p>
        </div>
      </section>

      <DashedDivider />

      {/* ============= RECENT STICKERS ============= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-display-sm font-display text-foreground">
              Recent Stickers
            </h2>
            <SketchTrophy className="w-5 h-5 text-accent" />
          </div>
          <button className="text-body-md font-medium text-accent hover:underline">
            View All
          </button>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto py-2 -mx-1 px-1">
          <StickerDisplay type="star" label="5-Day Streak" />
          <StickerDisplay type="trophy" label="100% Day" />
          <StickerDisplay type="heart" label="Coach Award" />
          <StickerDisplay type="rocket" label="Early Bird" />
          <StickerDisplay type="rainbow" label="Week Done" />
        </div>

        <p className="text-center text-caption text-muted-foreground mt-3">
          Complete tasks and hit milestones to earn more stickers!
        </p>
      </section>
    </div>
  );
}
