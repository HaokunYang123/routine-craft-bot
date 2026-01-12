import { useState } from "react";
import { cn } from "@/lib/utils";

// Sparkle/AI icon
const AISparkleIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill="none">
    <path 
      d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" 
      fill="currentColor"
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="19" cy="5" r="2" fill="currentColor" opacity="0.5"/>
    <circle cx="5" cy="18" r="1.5" fill="currentColor" opacity="0.5"/>
  </svg>
);

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskBreakdownProps {
  taskTitle: string;
  onBreakdown?: (subtasks: SubTask[]) => void;
  className?: string;
}

// Mock AI breakdown logic - in production this would call an AI endpoint
const generateBreakdown = (taskTitle: string): SubTask[] => {
  const breakdowns: Record<string, string[]> = {
    "Science Project": ["1. Pick Topic", "2. Research", "3. Make Poster"],
    "Essay": ["1. Brainstorm ideas", "2. Write outline", "3. Write first draft", "4. Edit & revise"],
    "Math Homework": ["1. Review chapter notes", "2. Solve even problems", "3. Check answers"],
    "Book Report": ["1. Finish reading", "2. Write summary", "3. Add personal thoughts"],
    "Presentation": ["1. Research topic", "2. Create slides", "3. Practice speech"],
    "Study": ["1. Review notes", "2. Make flashcards", "3. Take practice quiz"],
  };

  // Find matching breakdown or generate generic one
  const lowerTitle = taskTitle.toLowerCase();
  for (const [key, steps] of Object.entries(breakdowns)) {
    if (lowerTitle.includes(key.toLowerCase())) {
      return steps.map((title, i) => ({ id: `${i}`, title, completed: false }));
    }
  }

  // Generic breakdown
  return [
    { id: "1", title: "1. Plan approach", completed: false },
    { id: "2", title: "2. Do the main work", completed: false },
    { id: "3", title: "3. Review & finish", completed: false },
  ];
};

export function TaskBreakdownButton({ taskTitle, onBreakdown, className }: TaskBreakdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);

  const handleBreakdown = async () => {
    setIsLoading(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result = generateBreakdown(taskTitle);
    setSubtasks(result);
    setIsLoading(false);
    setShowResult(true);
    onBreakdown?.(result);
  };

  if (showResult) {
    return (
      <div className={cn("space-y-2 mt-3 pl-4 border-l-2 border-accent/30", className)}>
        <div className="flex items-center gap-2 text-xs text-accent font-medium">
          <AISparkleIcon className="w-3 h-3" />
          <span>AI Breakdown</span>
        </div>
        {subtasks.map((subtask) => (
          <div 
            key={subtask.id}
            className="flex items-center gap-2 text-body-md text-foreground/80 bg-accent/5 px-3 py-2 rounded-lg"
          >
            <div className="w-4 h-4 border-2 border-foreground/30 rounded" />
            <span>{subtask.title}</span>
          </div>
        ))}
        <button 
          onClick={() => setShowResult(false)}
          className="text-caption text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Collapse
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleBreakdown}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1",
        "text-caption text-accent hover:text-accent/80",
        "bg-accent/10 hover:bg-accent/20 rounded-md",
        "transition-all duration-200",
        isLoading && "opacity-60 cursor-wait",
        className
      )}
    >
      <AISparkleIcon className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
      <span>{isLoading ? "Breaking down..." : "Break this down for me"}</span>
    </button>
  );
}

// Inline variant for task cards
export function TaskBreakdownInline({ taskTitle, className }: { taskTitle: string; className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    const result = generateBreakdown(taskTitle);
    setSubtasks(result);
    setIsLoading(false);
    setIsExpanded(true);
  };

  return (
    <div className={className}>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5",
          "text-[10px] font-medium text-accent/80 hover:text-accent",
          "bg-accent/5 hover:bg-accent/10 rounded",
          "transition-colors duration-150",
          isLoading && "animate-pulse"
        )}
      >
        <AISparkleIcon className="w-3 h-3" />
        <span>{isLoading ? "..." : isExpanded ? "Hide steps" : "Break down"}</span>
      </button>
      
      {isExpanded && subtasks.length > 0 && (
        <div className="mt-2 space-y-1 pl-3 border-l border-accent/20">
          {subtasks.map((subtask) => (
            <div 
              key={subtask.id}
              className="text-caption text-muted-foreground flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-accent/40" />
              {subtask.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
