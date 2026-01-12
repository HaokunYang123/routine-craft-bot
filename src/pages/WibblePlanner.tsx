import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DoodleHome,
  DoodleCart,
  DoodleClock,
  DoodleBook,
  DoodleCoffee,
  DoodleSun,
  DoodleCloud,
  DoodleWrench,
  DoodleTrain,
  DoodleArrow,
  DoodleStar,
  DoodleSparkle,
  DoodleDroplet,
  DoodleMoon,
  DoodleCheckbox,
  DoodleProgress,
  DashedDivider,
  WavyText,
  MoodHappy,
  MoodNeutral,
  MoodSad,
  PauseIcon,
  SkipBack,
  SkipForward,
} from "@/components/ui/doodles";

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

  const today = new Date();
  const dateStr = format(today, "dd MM yyyy");
  const dayOfWeek = format(today, "EEEE").toLowerCase();

  // Category icons
  const getCategoryIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("shop") || lower.includes("grocery")) return <DoodleCart className="w-4 h-4" />;
    if (lower.includes("fix") || lower.includes("repair")) return <DoodleWrench className="w-4 h-4" />;
    if (lower.includes("read") || lower.includes("book") || lower.includes("study")) return <DoodleBook className="w-4 h-4" />;
    if (lower.includes("coffee") || lower.includes("breakfast") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("meal")) return <DoodleCoffee className="w-4 h-4" />;
    if (lower.includes("train") || lower.includes("travel")) return <DoodleTrain className="w-4 h-4" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-2xl text-ink-light">loading...</p>
      </div>
    );
  }

  return (
    <div className="p-5 pb-28 max-w-md mx-auto">
      {/* ============= HEADER ============= */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-wide">{dateStr}</h1>
          <div className="flex items-center gap-1">
            <WavyText className="text-xl text-ink">{dayOfWeek}</WavyText>
          </div>
        </div>
        <div className="flex items-center gap-1 text-ink">
          <DoodleCloud className="w-6 h-6" />
          <span className="text-lg">3° clear</span>
        </div>
      </div>

      {/* ============= DAILY JOURNEY STRIP ============= */}
      <div className="flex items-center justify-center gap-1 py-4 flex-wrap">
        <DoodleHome className="w-7 h-7 text-ink" />
        <DoodleArrow className="text-ink" />
        <DoodleBook className="w-6 h-6 text-ink" />
        <DoodleArrow className="text-ink" />
        <DoodleCart className="w-6 h-6 text-ink" />
        <DoodleArrow className="text-ink" />
        <DoodleCoffee className="w-6 h-6 text-ink" />
        <DoodleArrow className="text-ink" />
        <DoodleWrench className="w-6 h-6 text-ink" />
        <DoodleArrow className="text-ink" />
        <DoodleHome className="w-7 h-7 text-ink" />
      </div>

      <DashedDivider />

      {/* ============= MUSIC PLAYER WIDGET ============= */}
      <div className="text-center py-3">
        <p className="text-3xl font-bold text-ink">21</p>
        <p className="text-lg text-ink">Mitch James</p>
        <div className="mt-3 px-4">
          <DoodleProgress value={52} max={321} className="mb-2" />
          <div className="flex items-center justify-between text-sm text-ink-light px-1">
            <span>0:52</span>
            <span>3:21</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <button className="p-2 text-ink hover:scale-110 transition-transform">
            <SkipBack className="w-6 h-6" />
          </button>
          <button className="p-2 text-ink hover:scale-110 transition-transform">
            <PauseIcon className="w-8 h-8" />
          </button>
          <button className="p-2 text-ink hover:scale-110 transition-transform">
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>

      <DashedDivider />

      {/* ============= TIME WHEEL + QUICK TASKS ============= */}
      <div className="flex gap-4 py-3">
        {/* Time Wheel */}
        <div className="flex-shrink-0">
          <svg className="w-32 h-32" viewBox="0 0 100 100">
            {/* Clock face */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink" />
            {/* Pie segments */}
            <path d="M50 50 L50 5 A45 45 0 0 1 95 50 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink" />
            <path d="M50 50 L95 50 A45 45 0 0 1 50 95 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink" />
            <path d="M50 50 L50 95 A45 45 0 0 1 5 50 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink" />
            <path d="M50 50 L5 50 A45 45 0 0 1 50 5 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink" />
            {/* Clock numbers */}
            <text x="50" y="12" textAnchor="middle" className="text-[8px] fill-ink">12</text>
            <text x="88" y="53" textAnchor="middle" className="text-[8px] fill-ink">3</text>
            <text x="50" y="94" textAnchor="middle" className="text-[8px] fill-ink">6</text>
            <text x="12" y="53" textAnchor="middle" className="text-[8px] fill-ink">9</text>
            {/* Doodles in segments */}
            <text x="70" y="30" textAnchor="middle" className="text-[6px] fill-ink">Book</text>
            <text x="75" y="70" textAnchor="middle" className="text-[6px] fill-ink">Nap</text>
            <text x="30" y="75" textAnchor="middle" className="text-[6px] fill-ink">Work</text>
            <text x="25" y="35" textAnchor="middle" className="text-[6px] fill-ink">Fresh!</text>
          </svg>
        </div>

        {/* Quick Tasks */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <DoodleBook className="w-4 h-4 text-ink" />
            <span className="text-ink">&lt;The Waves&gt;</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-light text-sm">P 357</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <DoodleWrench className="w-4 h-4 text-ink" />
            <span className="text-ink">Repairing the water pipe</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <DoodleBook className="w-4 h-4 text-ink" />
            <span className="text-ink">paper ~3</span>
          </div>
        </div>
      </div>

      <DashedDivider />

      {/* ============= CHECKLIST ============= */}
      <div className="py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-ink tracking-widest uppercase">Checklist</h2>
          <div className="flex flex-col text-xs text-ink-light text-right">
            <span className="flex items-center gap-1 justify-end">
              <span className="w-3 h-3 bg-ink inline-block" style={{ borderRadius: "1px" }} /> Done
            </span>
            <span className="flex items-center gap-1 justify-end">
              <span className="w-3 h-3 border border-ink inline-block" style={{ borderRadius: "1px" }}>
                <span className="block w-2 h-0.5 bg-ink mt-1 mx-auto" />
              </span> Not yet
            </span>
            <span className="flex items-center gap-1 justify-end">
              <span className="w-3 h-3 bg-ink-light inline-block" style={{ borderRadius: "1px" }} /> postponed
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        {totalCount > 0 && (
          <div className="flex items-center gap-3 mb-4 p-2 border border-ink" style={{ borderRadius: "2px 4px 3px 5px" }}>
            <div className="text-center">
              <div className="text-2xl font-bold text-ink">{progressPercent}%</div>
              <div className="text-xs text-ink-light">😊</div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-ink-light mb-1">satis-faction</div>
              <DoodleProgress value={completedCount} max={totalCount || 1} />
              <div className="text-xs text-ink-light mt-1">Done?</div>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-ink-light text-center py-4">No tasks for today!</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 py-1">
                <DoodleCheckbox
                  checked={!!task.is_completed}
                  onChange={() => toggleTask(task)}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getCategoryIcon(task.title)}
                  <span className={cn(
                    "text-ink text-lg",
                    task.is_completed && "task-done text-ink-light"
                  )}>
                    {task.title}
                  </span>
                  {task.scheduled_time && (
                    <span className="text-sm text-ink-light ml-auto">
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

      {/* ============= TIMETABLE ============= */}
      <div className="py-3">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xl font-bold text-ink tracking-widest uppercase">Timetable</h2>
          <DoodleClock className="w-5 h-5 text-ink" />
        </div>

        <div className="border border-ink" style={{ borderRadius: "2px 4px 3px 5px" }}>
          <div className="grid grid-cols-2 divide-x divide-ink">
            {/* Left column */}
            <div className="divide-y divide-ink">
              <div className="flex items-center gap-2 p-2 text-xs font-bold text-ink bg-muted">
                <span className="w-10">T</span>
                <span>works</span>
              </div>
              {[
                { time: "9:00", task: "🍳 meal time + breakfast" },
                { time: "10:00", task: "Shower" },
                { time: "11:00", task: "🚃" },
                { time: "12:30", task: "🏠 Incheon" },
                { time: "13:30", task: "Lunch together ☺" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 text-sm">
                  <span className="w-10 text-ink-light">{item.time}</span>
                  <span className="text-ink">{item.task}</span>
                </div>
              ))}
            </div>
            {/* Right column */}
            <div className="divide-y divide-ink">
              <div className="flex items-center gap-2 p-2 text-xs font-bold text-ink bg-muted">
                <span className="w-10">T</span>
                <span>works</span>
              </div>
              {[
                { time: "14:30", task: "😊😊😊😊" },
                { time: "15:40", task: "way back 🏠" },
                { time: "16:30", task: "Bakery" },
                { time: "17:00", task: "🏠" },
                { time: "18:00", task: "movie 🎬" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 text-sm">
                  <span className="w-10 text-ink-light">{item.time}</span>
                  <span className="text-ink">{item.task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DashedDivider />

      {/* ============= TRACKERS ============= */}
      <div className="py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg text-ink">Mood</span>
          <span className="text-lg text-ink">Hydration</span>
          <span className="text-lg text-ink">Sleep</span>
        </div>

        <div className="flex items-center justify-between">
          {/* Mood */}
          <div className="flex gap-1">
            <button onClick={() => setMood("happy")} className={cn("transition-transform", mood === "happy" && "scale-125")}>
              <MoodHappy className={cn("w-7 h-7", mood === "happy" ? "text-ink" : "text-ink-light")} />
            </button>
            <button onClick={() => setMood("neutral")} className={cn("transition-transform", mood === "neutral" && "scale-125")}>
              <MoodNeutral className={cn("w-7 h-7", mood === "neutral" ? "text-ink" : "text-ink-light")} />
            </button>
            <button onClick={() => setMood("sad")} className={cn("transition-transform", mood === "sad" && "scale-125")}>
              <MoodSad className={cn("w-7 h-7", mood === "sad" ? "text-ink" : "text-ink-light")} />
            </button>
          </div>

          {/* Hydration */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button key={n} onClick={() => setHydration(n)}>
                <DoodleDroplet
                  className={cn("w-4 h-4", n <= hydration ? "text-ink" : "text-ink-light opacity-40")}
                  filled={n <= hydration}
                />
              </button>
            ))}
          </div>

          {/* Sleep */}
          <div className="flex items-center gap-1">
            <DoodleMoon className="w-4 h-4 text-ink" />
            <span className="text-lg font-bold text-ink">{sleepHours}hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
