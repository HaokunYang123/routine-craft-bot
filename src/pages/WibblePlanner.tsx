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
  WavyUnderline,
  TimeWheel,
  MusicPlayer,
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
  SketchComputer,
  SketchTrain,
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
  const [hydration, setHydration] = useState(5);
  const [mood, setMood] = useState<"happy" | "neutral" | "sad">("happy");
  const [sleepHours, setSleepHours] = useState(6);

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
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  const today = new Date();
  const dayNumber = format(today, "dd");
  const monthNumber = format(today, "MM");
  const yearNumber = format(today, "yyyy");
  const dayOfWeek = format(today, "EEEE").toLowerCase();

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
    return null;
  };

  // Time wheel slices
  const timeSlices = [
    { label: "Nighty night", hours: 8 },
    { label: "Morning Routine", hours: 2 },
    { label: "Working time", hours: 4 },
    { label: "Lunch", hours: 1 },
    { label: "Work", hours: 4 },
    { label: "After Hours", hours: 2 },
    { label: "Leisure Time", hours: 2 },
    { label: "Before bed", hours: 1 },
  ];

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
    <div className="p-5 pb-28 space-y-4 max-w-lg mx-auto">
      {/* ============= HEADER ============= */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-4xl font-hand-bold text-ink tracking-wider">
            {dayNumber} {monthNumber} {yearNumber}
          </h1>
          <div className="flex items-center gap-1">
            <p className="text-xl font-hand text-ink">{dayOfWeek}</p>
            <WavyUnderline className="text-ink w-16" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-ink">
          <SketchCloud className="w-7 h-7" />
          <span className="font-hand text-lg">3° clear</span>
        </div>
      </div>

      {/* ============= DAILY JOURNEY STRIP ============= */}
      <div className="flex items-center justify-center gap-2 py-2">
        <SketchHome className="w-6 h-6 text-ink" />
        <SketchArrow className="w-4 h-4 text-ink" />
        <SketchComputer className="w-6 h-6 text-ink" />
        <SketchArrow className="w-4 h-4 text-ink" />
        <SketchShoppingCart className="w-6 h-6 text-ink" />
        <SketchArrow className="w-4 h-4 text-ink" />
        <SketchWrench className="w-6 h-6 text-ink" />
        <SketchArrow className="w-4 h-4 text-ink" />
        <SketchHome className="w-6 h-6 text-ink" />
      </div>

      <DashedDivider />

      {/* ============= MUSIC PLAYER ============= */}
      <MusicPlayer songTitle="HERE ALWAYS" artist="Stray Kids" progress={0.25} />

      <DashedDivider />

      {/* ============= TIME WHEEL + QUICK LIST ROW ============= */}
      <div className="grid grid-cols-2 gap-4">
        <TimeWheel slices={timeSlices} className="w-full h-32" />
        
        <div className="space-y-1.5 text-sm">
          <div className="flex items-start gap-2">
            <SketchBook className="w-4 h-4 text-ink flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-hand-bold text-ink">&lt;The Waves&gt;</p>
              <p className="font-hand text-ink-light">p 357</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <SketchWrench className="w-4 h-4 text-ink flex-shrink-0 mt-0.5" />
            <p className="font-hand text-ink">Repairing the water pipe</p>
          </div>
          <div className="flex items-start gap-2">
            <SketchComputer className="w-4 h-4 text-ink flex-shrink-0 mt-0.5" />
            <p className="font-hand text-ink">paper ~3</p>
          </div>
        </div>
      </div>

      <DashedDivider />

      {/* ============= CHECKLIST SECTION ============= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-hand-bold text-ink uppercase tracking-widest">
            Checklist
          </h2>
          <div className="flex items-center gap-3 text-xs font-hand text-ink">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-ink bg-sage-green" style={{ borderRadius: "1px" }} />
              done
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-ink" style={{ borderRadius: "1px" }} />
              not yet
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-ink bg-ink" style={{ borderRadius: "1px" }}>
                <div className="w-1.5 h-1.5 bg-card m-0.5" />
              </div>
              postponed
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 border border-ink px-2 py-0.5 rounded-sm">
            <span className="font-hand-bold text-lg text-ink">{progressPercent}%</span>
            {isAllDone && <span className="text-xs">☺</span>}
          </div>
          <span className="font-hand text-sm text-ink-light">satisfaction</span>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-ink/30">
              <p className="font-hand text-xl text-ink-light">
                No tasks for today!
              </p>
              <p className="font-hand text-sm text-ink-light mt-1">
                Tap + to add one
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 py-1",
                  task.is_completed && "opacity-60"
                )}
              >
                <SketchCheckbox
                  checked={!!task.is_completed}
                  onChange={() => toggleTask(task)}
                />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {getCategoryIcon(task.title)}
                  <span
                    className={cn(
                      "font-hand text-lg text-ink",
                      task.is_completed && "line-through text-ink-light"
                    )}
                  >
                    {task.title}
                  </span>
                  {task.scheduled_time && (
                    <span className="text-sm font-hand text-ink-light ml-1">
                      {task.scheduled_time.slice(0, 5)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DashedDivider />

      {/* ============= TIMETABLE SECTION ============= */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xl font-hand-bold text-ink uppercase tracking-widest">
            Timetable
          </h2>
          <SketchClock className="w-5 h-5 text-ink" />
        </div>

        <div className="border border-ink">
          <div className="grid grid-cols-2">
            {/* Left column */}
            <div className="border-r border-ink">
              <div className="border-b border-ink px-2 py-1 text-center">
                <span className="font-hand-bold text-sm text-ink">T</span>
                <span className="font-hand text-sm text-ink-light ml-2">works</span>
              </div>
              {[
                { time: "9:00", activity: "meal time + breakfast", icon: <SketchCoffee className="w-3.5 h-3.5" /> },
                { time: "10:00", activity: "Shower" },
                { time: "11:00", activity: "🚌", icon: null },
                { time: "12:30", activity: "Incheon", icon: <SketchTrain className="w-3.5 h-3.5" /> },
                { time: "13:30", activity: "Lunch together ☺" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 border-b border-ink last:border-b-0">
                  <span className="font-hand text-sm text-ink-light w-10">{item.time}</span>
                  {item.icon && <span className="text-ink">{item.icon}</span>}
                  <span className="font-hand text-sm text-ink">{item.activity}</span>
                </div>
              ))}
            </div>

            {/* Right column */}
            <div>
              <div className="border-b border-ink px-2 py-1 text-center">
                <span className="font-hand-bold text-sm text-ink">T</span>
                <span className="font-hand text-sm text-ink-light ml-2">works</span>
              </div>
              {[
                { time: "14:30", activity: "☺☺☺☺☺" },
                { time: "15:40", activity: "way back 🏠" },
                { time: "16:30", activity: "Bakery 🍞" },
                { time: "17:00", activity: "🏠" },
                { time: "18:00", activity: "movie 🎬" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 border-b border-ink last:border-b-0">
                  <span className="font-hand text-sm text-ink-light w-10">{item.time}</span>
                  <span className="font-hand text-sm text-ink">{item.activity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DashedDivider />

      {/* ============= TRACKERS ROW ============= */}
      <div className="grid grid-cols-3 gap-4">
        {/* Mood Tracker */}
        <div className="text-center">
          <p className="text-xs font-hand-bold text-ink uppercase mb-2">Mood</p>
          <div className="flex justify-center gap-1">
            <button onClick={() => setMood("happy")}>
              <MoodHappy className={cn("w-7 h-7", mood === "happy" ? "text-ink" : "text-ink-light/40")} />
            </button>
            <button onClick={() => setMood("neutral")}>
              <MoodNeutral className={cn("w-7 h-7", mood === "neutral" ? "text-ink" : "text-ink-light/40")} />
            </button>
            <button onClick={() => setMood("sad")}>
              <MoodSad className={cn("w-7 h-7", mood === "sad" ? "text-ink" : "text-ink-light/40")} />
            </button>
          </div>
        </div>

        {/* Hydration Tracker */}
        <div className="text-center">
          <p className="text-xs font-hand-bold text-ink uppercase mb-2">Hydration</p>
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button key={n} onClick={() => setHydration(n)}>
                <SketchDroplet
                  className={cn("w-3 h-3", n <= hydration ? "text-ink" : "text-ink-light/30")}
                  filled={n <= hydration}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Sleep Tracker */}
        <div className="text-center">
          <p className="text-xs font-hand-bold text-ink uppercase mb-2">Sleep</p>
          <div className="flex items-center justify-center gap-1">
            <span className="font-hand-bold text-lg text-ink">{sleepHours}</span>
            <span className="font-hand text-sm text-ink-light">hours</span>
          </div>
          <div className="flex justify-center gap-0.5 mt-1">
            {[1,2,3,4,5,6,7,8].map((n) => (
              <div 
                key={n}
                onClick={() => setSleepHours(n)}
                className={cn(
                  "w-2 h-3 border border-ink cursor-pointer",
                  n <= sleepHours ? "bg-ink" : "bg-transparent"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}