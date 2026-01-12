import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WobblyCard,
  WobblyPanel,
  DoodleCheck,
  DoodleCircle,
  DoodleHeart,
  DoodleStar,
} from "@/components/ui/wobbly";

interface Task {
  id: string;
  title: string;
  duration_minutes: number | null;
  is_completed: boolean;
  due_date: string | null;
}

export default function StudentCalendar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, duration_minutes, is_completed, due_date")
      .eq("user_id", user!.id)
      .not("due_date", "is", null);

    if (data) setTasks(data);
    setLoading(false);
  };

  const tasksForDate = tasks.filter(
    (t) => t.due_date && isSameDay(parseISO(t.due_date), selectedDate)
  );

  const datesWithTasks = tasks
    .filter((t) => t.due_date)
    .map((t) => parseISO(t.due_date!));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-6 space-y-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="relative">
        <DoodleHeart className="absolute -top-1 -left-1 w-5 h-5 animate-bounce-soft" />
        <h1 className="text-4xl text-foreground">Calendar</h1>
        <p className="text-muted-foreground font-sketch text-lg mt-1">View your scheduled tasks</p>
      </div>

      {/* Calendar in wobbly panel */}
      <WobblyPanel variant="card2" className="min-h-[320px]">
        <div className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            modifiers={{
              hasTasks: datesWithTasks,
            }}
            modifiersStyles={{
              hasTasks: {
                fontWeight: "bold",
                backgroundColor: "hsl(var(--pastel-mint))",
              },
            }}
            className="w-full font-sketch"
            classNames={{
              day: "font-sketch text-lg h-10 w-10",
              head_cell: "font-sketch text-muted-foreground",
              caption: "font-sketch text-xl",
            }}
          />
        </div>
      </WobblyPanel>

      {/* Tasks for selected date */}
      <section className="space-y-4">
        <h2 className="font-sketch text-2xl text-foreground flex items-center gap-2">
          <DoodleStar className="w-5 h-5" />
          {format(selectedDate, "EEEE, MMMM d")}
        </h2>
        {tasksForDate.length === 0 ? (
          <WobblyCard pastel="peach" className="min-h-[100px]">
            <div className="flex flex-col items-center justify-center h-full text-center py-4">
              <p className="font-sketch text-xl text-foreground">No tasks scheduled</p>
              <p className="text-muted-foreground text-sm mt-1">A free day!</p>
            </div>
          </WobblyCard>
        ) : (
          <div className="space-y-3">
            {tasksForDate.map((task, i) => (
              <CalendarTaskCard key={task.id} task={task} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const pastelColors = ["blue", "pink", "yellow", "mint", "lavender", "peach"] as const;

function CalendarTaskCard({ task, index }: { task: Task; index: number }) {
  const pastel = pastelColors[index % pastelColors.length];

  return (
    <WobblyCard
      pastel={task.is_completed ? "none" : pastel}
      className={cn(task.is_completed && "opacity-60")}
    >
      <div className="flex items-start gap-4">
        <div className="pt-0.5 shrink-0">
          {task.is_completed ? (
            <DoodleCheck className="w-7 h-7" />
          ) : (
            <DoodleCircle className="w-7 h-7" />
          )}
        </div>
        <div className="flex-1">
          <p className={cn(
            "font-sketch text-xl text-foreground leading-tight",
            task.is_completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          {task.duration_minutes && (
            <span className="font-sans text-sm text-muted-foreground mt-1 block">
              {task.duration_minutes} min
            </span>
          )}
        </div>
      </div>
    </WobblyCard>
  );
}
