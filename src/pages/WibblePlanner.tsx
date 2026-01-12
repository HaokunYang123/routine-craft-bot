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
  SketchClock,
  SketchFlame,
  SketchRibbon,
  StickerDisplay,
  StatCard,
  SketchAvatar,
  SketchCard,
} from "@/components/ui/sketch";
import SparkyNudge from "@/components/SparkyNudge";
import MagicScheduleButton from "@/components/MagicScheduleButton";
import { TaskBreakdownInline } from "@/components/TaskBreakdown";

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

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return "today";
    if (isTomorrow(date)) return "tomorrow";
    const days = differenceInDays(date, today);
    if (days <= 7) return `in ${days} days`;
    return format(date, "MMM d");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-display-sm text-muted-foreground animate-pulse-subtle">
          loading...
        </div>
      </div>
    );
  }

  const dayNumber = format(today, "dd");
  const monthName = format(today, "MMM").toLowerCase();
  const dayName = format(today, "EEEE").toLowerCase();

  return (
    <div className="p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-4">
      {/* ============= HEADER ============= */}
      <header className="pt-2 pb-2">
        <div className="flex items-start justify-between">
          {/* Date display - clean modern style */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-foreground">{dayNumber}</span>
              <span className="text-2xl font-bold text-muted-foreground">{monthName}</span>
            </div>
            <p className="text-body-lg text-muted-foreground mt-1">{dayName}</p>
          </div>
          
          {/* User info */}
          <div className="flex items-center gap-2">
            <span className="text-caption font-semibold text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border-2 border-foreground">
              student
            </span>
            <SketchAvatar initials="JS" size="sm" />
          </div>
        </div>
      </header>

      {/* ============= AI SMART NUDGE ============= */}
      <SparkyNudge />

      {/* ============= STATS CARDS ============= */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          value={`${progressPercent}%`}
          label="progress"
        />
        <StatCard
          value={streak}
          label="day streak"
          icon={<SketchFlame className="w-5 h-5 text-accent-yellow" />}
        />
        <StatCard
          value={totalStickers}
          label="stickers"
          icon={<SketchStar filled className="w-5 h-5 text-accent" />}
        />
      </div>

      {/* ============= TODAY'S TASKS ============= */}
      <SketchCard variant="sticker">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-display-sm text-foreground">
            Today's Tasks
          </h2>
          <span className="text-body-md font-bold text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>

        <SketchProgress value={completedCount} max={totalCount || 1} showLabel={false} size="lg" />

        {/* Magic Schedule Button */}
        <MagicScheduleButton 
          isEmpty={false}
          onMagicPlan={() => console.log("Magic plan triggered!")} 
          className="mt-3"
        />

        <div className="space-y-2 mt-4">
          {tasks.length === 0 ? (
            <MagicScheduleButton 
              isEmpty={true}
              onMagicPlan={() => console.log("Magic plan triggered from empty state!")} 
            />
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-4 bg-secondary rounded-xl border-2 border-foreground/10 transition-all",
                  task.is_completed && "opacity-50"
                )}
              >
                <SketchCheckbox
                  checked={!!task.is_completed}
                  onChange={() => toggleTask(task)}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-body-lg text-foreground block font-semibold",
                      task.is_completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                  {task.scheduled_time && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <SketchClock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-body-md text-muted-foreground font-medium">
                        {task.scheduled_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                  {/* Task Breakdown Button */}
                  {!task.is_completed && (
                    <TaskBreakdownInline taskTitle={task.title} className="mt-2" />
                  )}
                </div>
                {task.duration_minutes && (
                  <span className="text-caption font-bold text-muted-foreground bg-card px-2 py-1 rounded-lg border-2 border-foreground/20">
                    {task.duration_minutes}m
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </SketchCard>

      <DashedDivider />

      {/* ============= UPCOMING DEADLINES ============= */}
      <SketchCard variant="sticker">
        <h2 className="text-display-sm text-foreground mb-3">
          Upcoming Deadlines
        </h2>

        {upcomingTasks.length === 0 ? (
          <p className="text-body-md text-muted-foreground text-center py-4">
            no upcoming tasks
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-secondary rounded-xl border-2 border-foreground/10"
              >
                <span className="text-body-md text-foreground font-semibold">{task.title}</span>
                <span className="text-caption font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full border-2 border-accent/30">
                  {formatDueDate(task.due_date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SketchCard>

      <DashedDivider />

      {/* ============= COACH FEEDBACK ============= */}
      <SketchCard variant="sticker">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-display-sm text-foreground">
            Coach Notes
          </h2>
          <SketchRibbon className="w-5 h-5 text-accent-purple" />
        </div>

        <div className="bg-secondary rounded-xl p-4 border-2 border-foreground/10">
          <div className="flex items-start gap-3">
            <SketchAvatar initials="MS" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-body-md font-bold text-foreground">ms. smith</span>
                <span className="text-caption text-muted-foreground font-medium">2 hours ago</span>
              </div>
              <p className="text-body-md text-foreground leading-relaxed">
                great progress on your math assignments this week! keep up the momentum. 
                remember to review chapter 5 before friday's quiz. ⭐
              </p>
            </div>
          </div>
        </div>

        <div className="bg-accent/5 rounded-xl p-3 mt-3 border-2 border-accent/20">
          <p className="text-caption text-accent text-center font-semibold">
            your coach can leave feedback and award stickers here
          </p>
        </div>
      </SketchCard>

      <DashedDivider />

      {/* ============= RECENT STICKERS ============= */}
      <SketchCard variant="sticker">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-display-sm text-foreground">
            Recent Stickers
          </h2>
          <button className="text-body-md font-bold text-accent hover:underline">
            view all
          </button>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto py-2 -mx-1 px-1">
          <StickerDisplay type="teapot" label="5-day streak" />
          <StickerDisplay type="mochi" label="100% day" />
          <StickerDisplay type="boba" label="coach award" />
          <StickerDisplay type="leaf" label="early bird" />
          <StickerDisplay type="cloud" label="week done" />
        </div>

        <p className="text-center text-caption text-muted-foreground mt-3 font-medium">
          complete tasks and hit milestones to earn more stickers!
        </p>
      </SketchCard>
    </div>
  );
}
