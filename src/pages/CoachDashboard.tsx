import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  SketchProgress,
  DashedDivider,
  SketchPeople,
  SketchCheck,
  SketchAlert,
  SketchPlus,
  SketchBook,
  StatCard,
  SketchAvatar,
  SketchButton,
  SketchInput,
  EmptyState,
  SketchBadge,
  SketchSend,
} from "@/components/ui/sketch";

// Mock data for demonstration
const mockAssignees = [
  { id: "1", name: "Alex Chen", initials: "AC", progress: 85, tasksToday: 5, completed: 4, streak: 12, status: "on-track" },
  { id: "2", name: "Jordan Smith", initials: "JS", progress: 45, tasksToday: 6, completed: 2, streak: 3, status: "behind" },
  { id: "3", name: "Sam Wilson", initials: "SW", progress: 100, tasksToday: 4, completed: 4, streak: 21, status: "on-track" },
  { id: "4", name: "Taylor Brown", initials: "TB", progress: 20, tasksToday: 5, completed: 1, streak: 0, status: "behind" },
  { id: "5", name: "Riley Davis", initials: "RD", progress: 70, tasksToday: 3, completed: 2, streak: 7, status: "on-track" },
];

const mockTemplates = [
  { id: "1", name: "Morning Workout", tasksCount: 5 },
  { id: "2", name: "Math Practice", tasksCount: 3 },
  { id: "3", name: "Reading Log", tasksCount: 2 },
];

export default function CoachDashboard() {
  const [aiInput, setAiInput] = useState("");
  const today = new Date();
  const dayNumber = format(today, "dd");
  const monthNumber = format(today, "MM");
  const year = format(today, "yyyy");
  const dayName = format(today, "EEEE").toLowerCase();

  const totalAssignees = mockAssignees.length;
  const onTrack = mockAssignees.filter(a => a.status === "on-track").length;
  const behind = mockAssignees.filter(a => a.status === "behind").length;
  const avgCompletion = Math.round(mockAssignees.reduce((sum, a) => sum + a.progress, 0) / totalAssignees);

  const behindAssignees = mockAssignees.filter(a => a.status === "behind");

  return (
    <div className="p-4 md:p-6 pb-28 max-w-3xl mx-auto space-y-6">
      {/* ============= HEADER ============= */}
      <header className="pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-3 font-display text-foreground">
              <span className="text-4xl font-bold tracking-wide">{dayNumber}</span>
              <span className="text-4xl font-bold tracking-wide">{monthNumber}</span>
              <span className="text-4xl font-bold tracking-wide">{year}</span>
            </div>
            <div className="mt-1">
              <span className="text-xl font-display text-foreground">{dayName}</span>
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
          
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted-foreground bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
              Coach
            </span>
            <SketchAvatar initials="MS" size="sm" />
          </div>
        </div>
      </header>

      {/* ============= PRIMARY ACTIONS ============= */}
      <div className="flex gap-3">
        <SketchButton variant="primary" className="flex-1 gap-2">
          <SketchPlus className="w-5 h-5" />
          Create Task
        </SketchButton>
        <SketchButton variant="outline" className="flex-1 gap-2">
          <SketchBook className="w-5 h-5" />
          Create Template
        </SketchButton>
      </div>

      {/* ============= OVERVIEW STATS ============= */}
      <section>
        <h2 className="text-display-sm font-display text-foreground mb-3">
          Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            value={totalAssignees}
            label="Students"
            icon={<SketchPeople className="w-5 h-5 text-accent" />}
          />
          <StatCard
            value={`${avgCompletion}%`}
            label="Avg Progress"
          />
          <StatCard
            value={onTrack}
            label="On Track"
            icon={<SketchCheck className="w-5 h-5 text-success" />}
          />
          <StatCard
            value={behind}
            label="Behind"
            icon={<SketchAlert className="w-5 h-5 text-destructive" />}
          />
        </div>
      </section>

      <DashedDivider />

      {/* ============= WHO'S BEHIND ============= */}
      {behindAssignees.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-display-sm font-display text-foreground">
              Needs Attention
            </h2>
            <SketchBadge variant="error">{behind}</SketchBadge>
          </div>

          <div className="space-y-2">
            {behindAssignees.map((assignee) => (
              <div
                key={assignee.id}
                className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
              >
                <SketchAvatar initials={assignee.initials} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-body-md font-medium text-foreground block">
                    {assignee.name}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {assignee.completed}/{assignee.tasksToday} tasks completed
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-display-sm font-display text-destructive">
                    {assignee.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <DashedDivider />
        </section>
      )}

      {/* ============= ALL ASSIGNEES ============= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-display-sm font-display text-foreground">
            All Students
          </h2>
          <span className="text-body-md text-muted-foreground">
            {totalAssignees} total
          </span>
        </div>

        <div className="space-y-2">
          {mockAssignees.map((assignee) => (
            <div
              key={assignee.id}
              className={cn(
                "flex items-center gap-3 p-3 bg-card border rounded-lg transition-colors hover:border-accent",
                assignee.status === "on-track" ? "border-border" : "border-destructive/30"
              )}
            >
              <SketchAvatar initials={assignee.initials} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body-md font-medium text-foreground">
                    {assignee.name}
                  </span>
                  {assignee.status === "on-track" ? (
                    <SketchCheck className="w-4 h-4 text-success" />
                  ) : (
                    <SketchAlert className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-caption text-muted-foreground">
                    {assignee.completed}/{assignee.tasksToday} tasks
                  </span>
                  <span className="text-caption text-muted-foreground">
                    🔥 {assignee.streak} days
                  </span>
                </div>
              </div>
              <div className="w-20">
                <SketchProgress value={assignee.progress} max={100} showLabel={false} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <DashedDivider />

      {/* ============= TEMPLATES ============= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-display-sm font-display text-foreground">
            Templates
          </h2>
          <button className="text-body-md font-medium text-accent hover:underline">
            View All
          </button>
        </div>

        {mockTemplates.length === 0 ? (
          <EmptyState
            illustration="no-tasks"
            title="No templates yet"
            description="Create reusable routines to quickly assign to students."
            action={
              <SketchButton variant="outline" size="sm">
                Create Template
              </SketchButton>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {mockTemplates.map((template) => (
              <div
                key={template.id}
                className="p-3 bg-card border border-border rounded-lg hover:border-accent transition-colors cursor-pointer"
              >
                <span className="text-body-md font-medium text-foreground block">
                  {template.name}
                </span>
                <span className="text-caption text-muted-foreground">
                  {template.tasksCount} tasks
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <DashedDivider />

      {/* ============= AI ASSISTANT ============= */}
      <section>
        <h2 className="text-display-sm font-display text-foreground mb-3">
          AI Assistant
        </h2>

        <div className="bg-secondary/50 border border-border rounded-lg p-4">
          <div className="flex gap-2">
            <SketchInput
              placeholder="Ask AI to help... (e.g., 'Build me a 4-week training plan')"
              value={aiInput}
              onChange={setAiInput}
              className="flex-1"
            />
            <SketchButton variant="primary" className="px-3">
              <SketchSend className="w-5 h-5" />
            </SketchButton>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="text-caption text-muted-foreground bg-card border border-border px-2 py-1 rounded-full hover:border-accent transition-colors">
              Generate weekly plan
            </button>
            <button className="text-caption text-muted-foreground bg-card border border-border px-2 py-1 rounded-full hover:border-accent transition-colors">
              Summarize progress
            </button>
            <button className="text-caption text-muted-foreground bg-card border border-border px-2 py-1 rounded-full hover:border-accent transition-colors">
              Suggest improvements
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
