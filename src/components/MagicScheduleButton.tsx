import { useState } from "react";
import { cn } from "@/lib/utils";

// Sparkle icon
const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L13.5 8.5H20L15 12.5L17 19L12 15L7 19L9 12.5L4 8.5H10.5L12 2Z" />
  </svg>
);

// Wand icon for AI magic
const WandIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M12.2 11.8l-1.4 1.4M17.8 6.2l1.4-1.4M12.2 6.2l-1.4-1.4" />
    <path d="M3 21l9-9" />
    <path d="M12.2 6.2L17.8 11.8" />
  </svg>
);

interface MagicScheduleButtonProps {
  onMagicPlan?: () => void;
  isEmpty?: boolean;
  className?: string;
}

export default function MagicScheduleButton({ onMagicPlan, isEmpty = false, className }: MagicScheduleButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = () => {
    setIsAnimating(true);
    
    // Create sparkle particles
    const newSparkles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setSparkles(newSparkles);
    
    // Clear animation after delay
    setTimeout(() => {
      setIsAnimating(false);
      setSparkles([]);
      onMagicPlan?.();
    }, 800);
  };

  if (isEmpty) {
    // Empty state variant - more prominent
    return (
      <div className={cn("relative text-center py-8 px-6", className)}>
        {/* Character illustration */}
        <svg className="w-24 h-24 mx-auto mb-4 text-foreground" viewBox="0 0 96 96" fill="none">
          {/* Thinking character */}
          <ellipse cx="48" cy="80" rx="20" ry="5" fill="#E0E0E0"/>
          <circle cx="48" cy="50" r="28" fill="white" stroke="currentColor" strokeWidth="2.5"/>
          {/* Thinking face */}
          <circle cx="38" cy="46" r="3" fill="currentColor"/>
          <circle cx="58" cy="46" r="3" fill="currentColor"/>
          <path d="M42 58C42 58 45 54 48 54C51 54 54 58 54 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Thinking bubbles */}
          <circle cx="78" cy="30" r="4" fill="#E0E0E0" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="86" cy="20" r="3" fill="#E0E0E0" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="90" cy="12" r="2" fill="#E0E0E0" stroke="currentColor" strokeWidth="1.5"/>
          {/* Question mark */}
          <path d="M72 38C72 34 76 32 80 34C84 36 84 42 80 44C78 45 78 48 78 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="78" cy="54" r="1.5" fill="currentColor"/>
        </svg>

        <h3 className="font-display text-xl text-foreground mb-2">Not sure what to do?</h3>
        <p className="text-body-md text-muted-foreground mb-6">Let's build a schedule together!</p>
        
        <button
          onClick={handleClick}
          disabled={isAnimating}
          className={cn(
            "relative inline-flex items-center gap-2 px-6 py-3",
            "bg-gradient-to-r from-accent via-accent to-[hsl(var(--accent-orange))] text-white",
            "font-semibold rounded-xl shadow-lg",
            "hover:shadow-xl hover:scale-105 active:scale-100",
            "transition-all duration-200",
            isAnimating && "scale-105"
          )}
          style={{
            clipPath: "polygon(2% 0%, 100% 3%, 98% 100%, 0% 97%)",
          }}
        >
          {/* Sparkle particles */}
          {sparkles.map((sparkle) => (
            <span
              key={sparkle.id}
              className="absolute w-2 h-2 bg-white rounded-full animate-ping"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                animationDuration: "0.6s",
              }}
            />
          ))}
          
          <SparkleIcon className={cn("w-5 h-5", isAnimating && "animate-spin")} />
          <span>✨ Magic Plan My Day</span>
          <WandIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Regular button variant
  return (
    <button
      onClick={handleClick}
      disabled={isAnimating}
      className={cn(
        "relative w-full flex items-center justify-center gap-2 px-4 py-3",
        "bg-gradient-to-r from-accent/10 via-accent/5 to-[hsl(var(--accent-orange))]/10",
        "border-2 border-dashed border-accent/40 hover:border-accent",
        "text-accent font-semibold rounded-xl",
        "hover:bg-accent/10 active:scale-[0.98]",
        "transition-all duration-200",
        isAnimating && "bg-accent/20 border-accent",
        className
      )}
      style={{
        clipPath: "polygon(1% 5%, 99% 0%, 100% 95%, 0% 100%)",
      }}
    >
      {/* Sparkle particles */}
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="absolute w-2 h-2 bg-accent rounded-full animate-ping"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDuration: "0.6s",
          }}
        />
      ))}
      
      <SparkleIcon className={cn("w-5 h-5", isAnimating && "animate-spin")} />
      <span>✨ Magic Plan My Afternoon</span>
      <WandIcon className="w-5 h-5" />
    </button>
  );
}
