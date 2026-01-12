import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TeapotCharacter } from "@/components/ui/sketch";

// Contextual tips based on time and activities
const getContextualTip = () => {
  const hour = new Date().getHours();
  
  const tips = [
    { emoji: "🎾", text: "tennis at 4 pm? pro tip: drink 2L of water today so you're fast on the court!" },
    { emoji: "📚", text: "big test tomorrow? start with the hardest topic first while your brain is fresh!" },
    { emoji: "🌅", text: "morning routine done early = more free time later. let's go!" },
    { emoji: "🧠", text: "studies show: 25 min focus + 5 min break = superpower combo!" },
    { emoji: "🎯", text: "you're 2 tasks away from a streak! push through!" },
    { emoji: "💪", text: "completed 3 days in a row! keep that momentum going!" },
    { emoji: "⏰", text: "afternoon slump? stand up, stretch, then tackle one small task!" },
    { emoji: "🌟", text: "your coach noticed your progress this week. nice work!" },
  ];

  // Morning tips
  if (hour < 12) {
    return tips[2]; // Morning routine tip
  }
  // Afternoon tips
  if (hour < 17) {
    return hour === 15 ? tips[0] : tips[6]; // Tennis or afternoon slump
  }
  // Evening tips
  return tips[1]; // Study tip
};

interface SparkyNudgeProps {
  className?: string;
}

export default function SparkyNudge({ className }: SparkyNudgeProps) {
  const [tip, setTip] = useState(getContextualTip());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Rotate tips every 30 seconds for demo
    const interval = setInterval(() => {
      setTip(getContextualTip());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "relative bg-card rounded-2xl p-4 border-[2.5px] border-foreground shadow-sticker",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Zen Teapot Mascot */}
        <div className="flex-shrink-0 w-16 h-16 animate-float">
          <TeapotCharacter className="text-foreground" />
        </div>
        
        {/* Speech bubble content */}
        <div className="flex-1 min-w-0">
          {/* Speech bubble pointer */}
          <div className="relative">
            {/* Bubble */}
            <div className="bg-accent/10 border-2 border-foreground rounded-2xl p-3 relative">
              {/* Pointer */}
              <div className="absolute -left-3 top-4 w-3 h-3 bg-accent/10 border-l-2 border-b-2 border-foreground transform rotate-45" />
              
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-foreground">Zen Tip</span>
                <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full font-bold">ai</span>
              </div>
              <p className="text-body-md text-foreground leading-relaxed">
                <span className="text-xl mr-1.5">{tip.emoji}</span>
                {tip.text}
              </p>
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground/70 hover:bg-secondary rounded-full transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
