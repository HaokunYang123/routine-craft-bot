import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  SketchCard,
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
    
    // Fetch today's tasks
    const { data: todayData } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user!.id)
      .eq("due_date", today)
      .order("scheduled_time", { ascending: true });

    // Fetch upcoming tasks (next 7 days)
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
        <div className="text-2xl font-hand-bold text-ink-light animate-float">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pb-28 max-w-2xl mx-auto space-y-6">
      {/* ============= HEADER ============= */}
      <header className="pt-2">
        <h1 className="text-3xl font-hand-bold text-ink">
          Wibble
        </h1>
        <p className="text-lg font-hand text-ink-light">{formattedDate}</p>
      </header>

      {/* ============= STATS ROW ============= */}
      <div className="grid grid-cols-3 gap-3">
        {/* Progress */}
        <div className="border-2 border-ink p-3 text-center" style={{ borderRadius: "2px" }}>
          <div className="text-2xl font-hand-bold text-ink">{progressPercent}%</div>
          <p className="text-xs font-hand text-ink-light">Today's Progress</p>
        </div>

        {/* Streak */}
        <div className="border-2 border-ink p-3 text-center" style={{ borderRadius: "2px" }}>
          <div className="flex items-center justify-center gap-1">
            <SketchFlame className="w-5 h-5 text-ink" />
            <span className="text-2xl font-hand-bold text-ink">{streak}</span>
          </div>
          <p className="text-xs font-hand text-ink-light">Day Streak</p>
        </div>

        {/* Stickers */}
        <div className="border-2 border-ink p-3 text-center" style={{ borderRadius: "2px" }}>
          <div className="flex items-center justify-center gap-1">
            <SketchStar filled className="w-5 h-5 text-ink" />
            <span className="text-2xl font-hand-bold text-ink">{totalStickers}</span>
          </div>
          <p className="text-xs font-hand text-ink-light">Stickers</p>
        </div>
      </div>

      {/* ============= TODAY'S TASKS ============= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-hand-bold text-ink uppercase tracking-widest">
            Today's Tasks
          </h2>
          <span className="text-sm font-hand text-ink-light">
            {completedCount}/{totalCount}
          </span>
        </div>

        <SketchProgress value={completedCount} max={totalCount || 1} showLabel={false} />

        <div className="space-y-2 mt-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-ink/30" style={{ borderRadius: "2px" }}>
              <SketchBook className="w-8 h-8 mx-auto text-ink-light mb-2" />
              <p className="font-hand text-lg text-ink-light">
                No tasks scheduled for today
              </p>
              <p className="font-hand text-sm text-ink-light mt-1">
                Tap + to add a task
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 border-2 border-ink/20 bg-card",
                  task.is_completed && "opacity-50"
                )}
                style={{ borderRadius: "2px" }}
              >
                <SketchCheckbox
                  checked={!!task.is_completed}
                  onChange={() => toggleTask(task)}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "font-hand text-lg text-ink block",
                      task.is_completed && "line-through text-ink-light"
                    )}
                  >
                    {task.title}
                  </span>
                  {task.scheduled_time && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <SketchClock className="w-3.5 h-3.5 text-ink-light" />
                      <span className="text-sm font-hand text-ink-light">
                        {task.scheduled_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>
                {task.duration_minutes && (
                  <span className="text-sm font-hand text-ink-light border border-ink/30 px-2 py-0.5 rounded-full">
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
        <h2 className="text-xl font-hand-bold text-ink uppercase tracking-widest mb-3">
          Upcoming Deadlines
        </h2>

        {upcomingTasks.length === 0 ? (
          <p className="font-hand text-ink-light text-center py-4">
            No upcoming tasks
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border border-ink/20"
                style={{ borderRadius: "2px" }}
              >
                <div className="flex-1">
                  <span className="font-hand text-ink">{task.title}</span>
                </div>
                <span className="text-sm font-hand-bold text-ink bg-soft-cream px-2 py-0.5 rounded-full">
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
          <h2 className="text-xl font-hand-bold text-ink uppercase tracking-widest">
            Coach Notes
          </h2>
          <SketchRibbon className="w-5 h-5 text-ink" />
        </div>

        <div className="border-2 border-ink/20 p-4" style={{ borderRadius: "2px" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 border-2 border-ink rounded-full flex items-center justify-center flex-shrink-0">
              <span className="font-hand-bold text-ink">MS</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-hand-bold text-ink">Ms. Smith</span>
                <span className="text-xs font-hand text-ink-light">2 hours ago</span>
              </div>
              <p className="font-hand text-ink mt-1">
                Great progress on your math assignments this week! Keep up the momentum. 
                Remember to review chapter 5 before Friday's quiz. ⭐
              </p>
            </div>
          </div>
        </div>

        <div className="border border-ink/10 p-3 mt-2 bg-soft-cream" style={{ borderRadius: "2px" }}>
          <p className="font-hand text-sm text-ink-light text-center">
            Your coach can leave feedback and award stickers here
          </p>
        </div>
      </section>

      <DashedDivider />

      {/* ============= RECENT STICKERS ============= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-hand-bold text-ink uppercase tracking-widest">
              Recent Stickers
            </h2>
            <SketchTrophy className="w-5 h-5 text-ink" />
          </div>
          <button className="text-sm font-hand text-ink underline">
            View All
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto py-2">
          <StickerDisplay type="star" label="5-Day Streak" />
          <StickerDisplay type="trophy" label="100% Day" />
          <StickerDisplay type="heart" label="Coach Award" />
          <StickerDisplay type="rocket" label="Early Bird" />
          <StickerDisplay type="rainbow" label="Week Done" />
        </div>

        <p className="text-center text-sm font-hand text-ink-light mt-2">
          Complete tasks and hit milestones to earn more stickers!
        </p>
      </section>
    </div>
  );
}