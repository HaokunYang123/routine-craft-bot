import { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Simple calendar implementation - can be replaced with react-big-calendar later
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface ScheduledTask {
  id: string;
  title: string;
  studentName: string;
  time?: string;
  completed: boolean;
}

export default function CoachCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Mock data - replace with actual data from Supabase
  const scheduledTasks: Record<string, ScheduledTask[]> = {
    [new Date().toDateString()]: [
      {
        id: "1",
        title: "Morning Warmup",
        studentName: "Sarah J.",
        time: "8:00 AM",
        completed: true,
      },
      {
        id: "2",
        title: "Core Exercises",
        studentName: "Mike T.",
        time: "9:30 AM",
        completed: false,
      },
      {
        id: "3",
        title: "Study Session",
        studentName: "Emma W.",
        completed: false,
      },
    ],
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1)
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const hasEvents = (date: Date) => {
    return scheduledTasks[date.toDateString()]?.length > 0;
  };

  const days = getDaysInMonth(currentDate);
  const selectedTasks = selectedDate
    ? scheduledTasks[selectedDate.toDateString()] || []
    : [];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          View and manage scheduled tasks
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-foreground">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  className="h-8 w-8 border-border"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentDate(new Date());
                    setSelectedDate(new Date());
                  }}
                  className="border-border"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(1)}
                  className="h-8 w-8 border-border"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
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

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, i) => (
                <button
                  key={i}
                  disabled={!date}
                  onClick={() => date && setSelectedDate(date)}
                  className={cn(
                    "aspect-square p-1 rounded-lg text-sm font-medium transition-all relative",
                    !date && "invisible",
                    date && "hover:bg-muted",
                    date && isToday(date) && "bg-cta-primary/10 text-cta-primary",
                    date && isSelected(date) && "bg-cta-primary text-white",
                    date &&
                      !isToday(date) &&
                      !isSelected(date) &&
                      "text-foreground"
                  )}
                >
                  {date?.getDate()}
                  {date && hasEvents(date) && !isSelected(date) && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-urgent" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Tasks */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-cta-primary" />
              {selectedDate
                ? selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })
                : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTasks.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No tasks scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      task.completed
                        ? "border-cta-primary/30 bg-cta-primary/5"
                        : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium",
                            task.completed
                              ? "text-cta-primary line-through"
                              : "text-foreground"
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.studentName}
                          </span>
                          {task.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.time}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.completed && (
                        <span className="text-xs bg-cta-primary/20 text-cta-primary px-2 py-1 rounded">
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
