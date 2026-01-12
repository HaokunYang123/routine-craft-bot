import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Sparky mascot SVG - quirky hand-drawn style
const SparkyMascot = ({ className }: { className?: string }) => (
  <svg className={cn("w-14 h-14", className)} viewBox="0 0 64 64" fill="none">
    {/* Lightbulb body */}
    <ellipse cx="32" cy="28" rx="18" ry="20" fill="#FFE066" stroke="currentColor" strokeWidth="2.5"/>
    {/* Base */}
    <rect x="24" y="46" width="16" height="6" rx="2" fill="#E0E0E0" stroke="currentColor" strokeWidth="2"/>
    <rect x="26" y="52" width="12" height="4" rx="1" fill="#E0E0E0" stroke="currentColor" strokeWidth="2"/>
    {/* Face */}
    <circle cx="26" cy="26" r="2.5" fill="currentColor"/>
    <circle cx="38" cy="26" r="2.5" fill="currentColor"/>
    <path d="M28 34C28 34 30 38 32 38C34 38 36 34 36 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Sparkle eyes */}
    <circle cx="27" cy="25" r="1" fill="white"/>
    <circle cx="39" cy="25" r="1" fill="white"/>
    {/* Glow rays */}
    <path d="M32 4L32 10" stroke="#FFE066" strokeWidth="2" strokeLinecap="round"/>
    <path d="M48 12L44 16" stroke="#FFE066" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12L20 16" stroke="#FFE066" strokeWidth="2" strokeLinecap="round"/>
    <path d="M54 28L48 28" stroke="#FFE066" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 28L16 28" stroke="#FFE066" strokeWidth="2" strokeLinecap="round"/>
    {/* Blush */}
    <circle cx="20" cy="30" r="3" fill="#FFB5B5" opacity="0.5"/>
    <circle cx="44" cy="30" r="3" fill="#FFB5B5" opacity="0.5"/>
  </svg>
);

// Contextual tips based on time and activities
const getContextualTip = () => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  const tips = [
    { emoji: "🎾", text: "Tennis at 4 PM? Pro Tip: Drink 2L of water today so you're fast on the court!" },
    { emoji: "📚", text: "Big test tomorrow? Start with the hardest topic first while your brain is fresh!" },
    { emoji: "🌅", text: "Morning routine done early = more free time later. Let's go!" },
    { emoji: "🧠", text: "Studies show: 25 min focus + 5 min break = superpower combo!" },
    { emoji: "🎯", text: "You're 2 tasks away from a streak! Push through!" },
    { emoji: "💪", text: "Completed 3 days in a row! Keep that momentum going!" },
    { emoji: "⏰", text: "Afternoon slump? Stand up, stretch, then tackle one small task!" },
    { emoji: "🌟", text: "Your coach noticed your progress this week. Nice work!" },
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
        "relative bg-gradient-to-br from-[#FFF9E6] to-[#FFF4CC] rounded-2xl p-4 border-2 border-foreground/20",
        "shadow-[0_4px_20px_rgba(255,224,102,0.3)]",
        className
      )}
      style={{
        // Sticky note tilted effect
        transform: "rotate(-0.5deg)",
        clipPath: "polygon(0% 2%, 99% 0%, 100% 97%, 2% 100%)",
      }}
    >
      {/* Glow effect behind card */}
      <div 
        className="absolute inset-0 -z-10 rounded-2xl blur-xl opacity-40"
        style={{ background: "linear-gradient(135deg, #FFE066 0%, #FFCC00 100%)" }}
      />
      
      {/* Pin decoration */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-destructive border-2 border-foreground shadow-sm" />
      
      <div className="flex items-start gap-3">
        {/* Mascot */}
        <div className="flex-shrink-0 animate-float">
          <SparkyMascot className="text-foreground" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-lg font-bold text-foreground">Sparky's Tip</span>
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">AI</span>
          </div>
          <p className="text-body-md text-foreground leading-relaxed">
            <span className="text-xl mr-1.5">{tip.emoji}</span>
            {tip.text}
          </p>
        </div>

        {/* Dismiss button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sparkle decorations */}
      <svg className="absolute top-3 right-12 w-4 h-4 text-accent-orange animate-pulse" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3L13 9H19L14 13L16 19L12 15L8 19L10 13L5 9H11L12 3Z" />
      </svg>
      <svg className="absolute bottom-3 right-6 w-3 h-3 text-accent animate-pulse" style={{ animationDelay: "0.5s" }} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3L13 9H19L14 13L16 19L12 15L8 19L10 13L5 9H11L12 3Z" />
      </svg>
    </div>
  );
}
