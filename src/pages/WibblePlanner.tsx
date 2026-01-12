import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  SketchCard,
  SketchCheckbox,
  SketchProgress,
  SketchBadge,
  DashedDivider,
  TimeWheel,
  SketchSun,
  SketchCloud,
  SketchHome,
  SketchCoffee,
  SketchBook,
  SketchShoppingCart,
  SketchArrow,
  SketchStar,
  SketchDroplet,
  MoodHappy,
  MoodNeutral,
  MoodSad,
  SketchClock,
  SketchWrench,
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
  const [loading, setLoading] = useState(true);
  const [hydration, setHydration] = useState(4);
  const [mood, setMood] = useState<"happy" | "neutral" | "sad">("neutral");
  const [sleepHours, setSleepHours] = useState(7);

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user!.id)
      .eq("due_date", today)
      .order("scheduled_time", { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  const toggleTask = async (task: Task) => {
    await supabase
      .from("tasks")
      .update({
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    fetchTasks();
  };

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;
  const progressValue = totalCount > 0 ? completedCount : 0;
  const progressMax = totalCount > 0 ? totalCount : 1;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  const today = new Date();
  const dayNumber = format(today, "dd");
  const monthNumber = format(today, "MM");
  const yearNumber = format(today, "yyyy");
  const dayOfWeek = format(today, "EEEE");

  // Time wheel data
  const timeSlices = [
    { label: "Sleep", hours: 8, color: "hsl(270, 25%, 85%)", icon: null },
    { label: "Work", hours: 8, color: "hsl(200, 25%, 80%)", icon: null },
    { label: "Meals", hours: 2, color: "hsl(30, 25%, 75%)", icon: null },
    { label: "Leisure", hours: 4, color: "hsl(140, 30%, 80%)", icon: null },
    { label: "Other", hours: 2, color: "hsl(45, 40%, 92%)", icon: null },
  ];

  // Category icons for tasks
  const getCategoryIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("shop") || lower.includes("buy") || lower.includes("groceries")) {
      return <SketchShoppingCart className="w-4 h-4" />;
    }
    if (lower.includes("fix") || lower.includes("repair")) {
      return <SketchWrench className="w-4 h-4" />;
    }
    if (lower.includes("read") || lower.includes("study") || lower.includes("book")) {
      return <SketchBook className="w-4 h-4" />;
    }
    if (lower.includes("coffee") || lower.includes("breakfast") || lower.includes("lunch") || lower.includes("dinner")) {
      return <SketchCoffee className="w-4 h-4" />;
    }
    return <SketchClock className="w-4 h-4" />;
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
    <div className="p-4 pb-28 space-y-5 max-w-lg mx-auto">
      {/* ============= HEADER ============= */}
      <div className="flex items-start justify-between pt-4">
        <div>
          <h1 className="text-5xl font-hand-bold text-ink leading-none">
            {dayNumber} {monthNumber} {yearNumber}
          </h1>
          <p className="text-xl font-hand text-ink-light mt-1">{dayOfWeek}</p>
        </div>
        <div className="flex items-center gap-1 text-ink-light">
          <SketchSun className="w-6 h-6" />
          <span className="font-hand-bold text-lg">22°</span>
        </div>
      </div>

      <DashedDivider />

      {/* ============= DAILY TIMELINE STRIP ============= */}
      <SketchCard variant="soft-cream" className="overflow-x-auto">
        <p className="text-sm font-hand-bold text-ink-light uppercase mb-3 tracking-wider">
          Today's Journey
        </p>
        <div className="flex items-center gap-2 min-w-max">
          <div className="flex flex-col items-center">
            <SketchHome className="w-6 h-6 text-ink" />
            <span className="text-xs font-hand text-ink-light">6am</span>
          </div>
          <SketchArrow className="text-ink-light" />
          <div className="flex flex-col items-center">
            <SketchBook className="w-6 h-6 text-ink" />
            <span className="text-xs font-hand text-ink-light">9am</span>
          </div>
          <SketchArrow className="text-ink-light" />
          <div className="flex flex-col items-center">
            <SketchCoffee className="w-6 h-6 text-ink" />
            <span className="text-xs font-hand text-ink-light">12pm</span>
          </div>
          <SketchArrow className="text-ink-light" />
          <div className="flex flex-col items-center">
            <SketchShoppingCart className="w-6 h-6 text-ink" />
            <span className="text-xs font-hand text-ink-light">3pm</span>
          </div>
          <SketchArrow className="text-ink-light" />
          <div className="flex flex-col items-center">
            <SketchHome className="w-6 h-6 text-ink" />
            <span className="text-xs font-hand text-ink-light">6pm</span>
          </div>
        </div>
      </SketchCard>

      {/* ============= PROGRESS + TIME WHEEL ROW ============= */}
      <div className="grid grid-cols-2 gap-4">
        {/* Progress Widget */}
        <SketchCard variant="dusty-pink">
          <p className="text-sm font-hand-bold text-ink-light uppercase mb-2 tracking-wider">
            Progress
          </p>
          <SketchProgress value={progressValue} max={progressMax} />
          {isAllDone && (
            <div className="flex items-center gap-1 mt-2 text-sm font-hand text-ink">
              <SketchStar filled className="w-4 h-4 text-primary" />
              All done!
            </div>
          )}
        </SketchCard>

        {/* Time Wheel */}
        <SketchCard variant="light-lavender" className="flex flex-col items-center">
          <p className="text-sm font-hand-bold text-ink-light uppercase mb-2 tracking-wider">
            Day Plan
          </p>
          <TimeWheel slices={timeSlices} className="w-24 h-24" />
        </SketchCard>
      </div>

      <DashedDivider />

      {/* ============= CHECKLIST SECTION ============= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-hand-bold text-ink uppercase tracking-wide">
            Checklist
          </h2>
          <div className="flex items-center gap-3 text-xs font-hand text-ink-light">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-ink bg-sage-green" style={{ borderRadius: "2px" }} />
              done
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-ink" style={{ borderRadius: "2px" }} />
              todo
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-ink bg-warm-brown" style={{ borderRadius: "2px" }} />
              later
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <SketchCard variant="soft-cream" className="text-center py-6">
              <p className="font-hand text-xl text-ink-light">
                No tasks for today!
              </p>
              <p className="font-hand text-sm text-ink-light mt-1">
                Tap + to add one
              </p>
            </SketchCard>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-3 border-2 border-ink/15 bg-card",
                  task.is_completed && "opacity-60"
                )}
                style={{ borderRadius: "6px 10px 8px 12px" }}
              >
                <SketchCheckbox
                  checked={!!task.is_completed}
                  onChange={() => toggleTask(task)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(task.title)}
                    <span
                      className={cn(
                        "font-hand text-lg text-ink",
                        task.is_completed && "line-through text-ink-light"
                      )}
                    >
                      {task.title}
                    </span>
                  </div>
                  {task.scheduled_time && (
                    <span className="text-sm font-hand text-ink-light">
                      {task.scheduled_time.slice(0, 5)}
                    </span>
                  )}
                </div>
                {task.duration_minutes && (
                  <SketchBadge variant="muted-blue">
                    {task.duration_minutes}m
                  </SketchBadge>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <DashedDivider />

      {/* ============= TIMETABLE SECTION ============= */}
      <div>
        <h2 className="text-2xl font-hand-bold text-ink uppercase tracking-wide mb-3">
          Timetable
        </h2>
        <SketchCard variant="soft-cream">
          <div className="space-y-2">
            {[
              { time: "06:00", activity: "Wake up & stretch", icon: <SketchSun className="w-4 h-4" /> },
              { time: "07:00", activity: "Breakfast", icon: <SketchCoffee className="w-4 h-4" /> },
              { time: "09:00", activity: "Work / Study", icon: <SketchBook className="w-4 h-4" /> },
              { time: "12:00", activity: "Lunch break", icon: <SketchCoffee className="w-4 h-4" /> },
              { time: "14:00", activity: "Deep work", icon: <SketchBook className="w-4 h-4" /> },
              { time: "17:00", activity: "Errands", icon: <SketchShoppingCart className="w-4 h-4" /> },
              { time: "19:00", activity: "Dinner & relax", icon: <SketchHome className="w-4 h-4" /> },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="font-hand-bold text-ink-light w-12">{item.time}</span>
                <span className="text-ink-light">{item.icon}</span>
                <span className="font-hand text-ink">{item.activity}</span>
              </div>
            ))}
          </div>
        </SketchCard>
      </div>

      <DashedDivider />

      {/* ============= TRACKERS ROW ============= */}
      <div>
        <h2 className="text-2xl font-hand-bold text-ink uppercase tracking-wide mb-3">
          Trackers
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Mood Tracker */}
          <SketchCard variant="dusty-pink" className="text-center">
            <p className="text-xs font-hand-bold text-ink-light uppercase mb-2">Mood</p>
            <div className="flex justify-center gap-1">
              <button
                onClick={() => setMood("happy")}
                className={cn(
                  "p-1 rounded-full transition-transform",
                  mood === "happy" && "scale-110 bg-card"
                )}
              >
                <MoodHappy className={cn("w-6 h-6", mood === "happy" ? "text-accent" : "text-ink-light")} />
              </button>
              <button
                onClick={() => setMood("neutral")}
                className={cn(
                  "p-1 rounded-full transition-transform",
                  mood === "neutral" && "scale-110 bg-card"
                )}
              >
                <MoodNeutral className={cn("w-6 h-6", mood === "neutral" ? "text-accent" : "text-ink-light")} />
              </button>
              <button
                onClick={() => setMood("sad")}
                className={cn(
                  "p-1 rounded-full transition-transform",
                  mood === "sad" && "scale-110 bg-card"
                )}
              >
                <MoodSad className={cn("w-6 h-6", mood === "sad" ? "text-accent" : "text-ink-light")} />
              </button>
            </div>
          </SketchCard>

          {/* Hydration Tracker */}
          <SketchCard variant="muted-blue" className="text-center">
            <p className="text-xs font-hand-bold text-ink-light uppercase mb-2">Water</p>
            <div className="flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button key={n} onClick={() => setHydration(n)}>
                  <SketchDroplet
                    className={cn("w-3.5 h-3.5", n <= hydration ? "text-accent" : "text-ink-light/30")}
                    filled={n <= hydration}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-hand text-ink-light mt-1">{hydration}/8</p>
          </SketchCard>

          {/* Sleep Tracker */}
          <SketchCard variant="light-lavender" className="text-center">
            <p className="text-xs font-hand-bold text-ink-light uppercase mb-2">Sleep</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setSleepHours(Math.max(0, sleepHours - 1))}
                className="w-6 h-6 border border-ink rounded-full text-ink font-hand-bold"
              >
                -
              </button>
              <span className="font-hand-bold text-lg text-ink w-6">{sleepHours}</span>
              <button
                onClick={() => setSleepHours(Math.min(12, sleepHours + 1))}
                className="w-6 h-6 border border-ink rounded-full text-ink font-hand-bold"
              >
                +
              </button>
            </div>
            <p className="text-xs font-hand text-ink-light mt-1">hours</p>
          </SketchCard>
        </div>
      </div>
    </div>
  );
}
