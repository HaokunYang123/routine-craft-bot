import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ============= HAND-DRAWN DOODLE ICONS =============

export const SketchHome = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3L21 10.5" />
    <path d="M5 9.5V19.5C5 20 5.5 20.5 6 20.5H9V15C9 14.5 9.5 14 10 14H14C14.5 14 15 14.5 15 15V20.5H18C18.5 20.5 19 20 19 19.5V9.5" />
  </svg>
);

export const SketchCalendar = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9H21" />
    <path d="M8 3V6" />
    <path d="M16 3V6" />
    <circle cx="8" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
    <circle cx="16" cy="14" r="1" fill="currentColor" />
  </svg>
);

export const SketchPlus = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
    <path d="M12 8V16M8 12H16" />
  </svg>
);

export const SketchStats = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V14" />
    <path d="M9 20V10" />
    <path d="M14 20V6" />
    <path d="M19 20V3" />
  </svg>
);

export const SketchSettings = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22" />
    <path d="M4.9 4.9L7 7M17 17L19.1 19.1M4.9 19.1L7 17M17 7L19.1 4.9" />
  </svg>
);

export const SketchShoppingCart = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3H5L6 7M6 7L8 15H18L20 7H6Z" />
    <circle cx="9" cy="19" r="2" />
    <circle cx="17" cy="19" r="2" />
  </svg>
);

export const SketchClock = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6V12L16 14" />
  </svg>
);

export const SketchBook = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4.5C4 3.5 5 3 6 3H18C19 3 20 3.5 20 4.5V19.5C20 20.5 19 21 18 21H6C5 21 4 20.5 4 19.5V4.5Z" />
    <path d="M8 3V21" />
    <path d="M12 8H16" />
    <path d="M12 12H16" />
  </svg>
);

export const SketchCoffee = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8H17V16C17 18.2 15.2 20 13 20H9C6.8 20 5 18.2 5 16V8Z" />
    <path d="M17 10H18C19.1 10 20 10.9 20 12C20 13.1 19.1 14 18 14H17" />
    <path d="M8 3C8 3 8 5 10 5C12 5 12 3 12 3" />
  </svg>
);

export const SketchSun = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2V4M12 20V22M4 12H2M22 12H20M5.6 5.6L4.2 4.2M19.8 19.8L18.4 18.4M5.6 18.4L4.2 19.8M19.8 4.2L18.4 5.6" />
  </svg>
);

export const SketchCloud = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 17C3.8 17 2 15.2 2 13C2 11 3.5 9.3 5.5 9C5.8 6.2 8.1 4 11 4C13.5 4 15.6 5.6 16.3 8C16.5 8 16.8 8 17 8C19.8 8 22 10.2 22 13C22 15.8 19.8 18 17 18H6V17Z" />
  </svg>
);

export const SketchRain = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 13C3.8 13 2 11.2 2 9C2 7 3.5 5.3 5.5 5C5.8 2.2 8.1 0 11 0C13.5 0 15.6 1.6 16.3 4C16.5 4 16.8 4 17 4C19.8 4 22 6.2 22 9C22 11.8 19.8 14 17 14H6V13Z" />
    <path d="M8 18L7 21M12 18L11 21M16 18L15 21" />
  </svg>
);

export const SketchWrench = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3C14.3 5.9 13.7 5.9 13.3 6.3L4 15.6V20H8.4L17.7 10.7C18.1 10.3 18.1 9.7 17.7 9.3L14.7 6.3Z" />
    <path d="M12 8L16 12" />
  </svg>
);

export const SketchStar = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L14 9H20L15 13L17 20L12 16L7 20L9 13L4 9H10L12 3Z" />
  </svg>
);

export const SketchHeart = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20C12 20 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 20 12 20Z" />
  </svg>
);

export const SketchDroplet = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3C12 3 6 10 6 14C6 17.3 8.7 20 12 20C15.3 20 18 17.3 18 14C18 10 12 3 12 3Z" />
  </svg>
);

export const SketchArrow = ({ className }: { className?: string }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12H19M14 7L19 12L14 17" />
  </svg>
);

// ============= MOOD FACES =============

export const MoodHappy = ({ className }: { className?: string }) => (
  <svg className={cn("w-8 h-8", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="8" cy="10" r="1" fill="currentColor" />
    <circle cx="16" cy="10" r="1" fill="currentColor" />
    <path d="M8 15C8 15 10 17 12 17C14 17 16 15 16 15" />
  </svg>
);

export const MoodNeutral = ({ className }: { className?: string }) => (
  <svg className={cn("w-8 h-8", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="8" cy="10" r="1" fill="currentColor" />
    <circle cx="16" cy="10" r="1" fill="currentColor" />
    <path d="M8 15H16" />
  </svg>
);

export const MoodSad = ({ className }: { className?: string }) => (
  <svg className={cn("w-8 h-8", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="8" cy="10" r="1" fill="currentColor" />
    <circle cx="16" cy="10" r="1" fill="currentColor" />
    <path d="M8 17C8 17 10 15 12 15C14 15 16 17 16 17" />
  </svg>
);

// ============= HAND-DRAWN CHECKBOX =============

interface SketchCheckboxProps {
  checked: boolean;
  onChange?: () => void;
  postponed?: boolean;
  className?: string;
}

export const SketchCheckbox = ({ checked, onChange, postponed, className }: SketchCheckboxProps) => {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (onChange) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
      onChange();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-6 h-6 border-2 border-ink rounded-sm flex items-center justify-center transition-colors",
        checked && "bg-sage-green border-accent",
        postponed && "bg-warm-brown border-completed",
        className
      )}
      style={{
        borderRadius: "4px 6px 5px 7px", // Slightly uneven for hand-drawn look
      }}
    >
      {checked && (
        <svg
          className={cn("w-4 h-4 text-ink", animating && "animate-wobbly-check")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12L9 17L20 6" />
        </svg>
      )}
      {postponed && !checked && (
        <div className="w-3 h-0.5 bg-ink" />
      )}
    </button>
  );
};

// ============= SKETCHY PROGRESS BAR =============

interface SketchProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export const SketchProgress = ({ value, max = 100, className, showLabel = true }: SketchProgressProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="h-5 bg-soft-cream border-2 border-ink rounded-md overflow-hidden relative"
        style={{ borderRadius: "4px 6px 5px 7px" }}
      >
        <div
          className="h-full bg-dusty-pink transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            borderRadius: "2px 4px 3px 2px",
          }}
        />
        {/* Sketchy lines overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
          <line x1="0" y1="2" x2="100%" y2="3" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="8" x2="100%" y2="9" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      {showLabel && (
        <div className="flex justify-between text-sm text-ink-light">
          <span>{value}/{max} done</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

// ============= SKETCHY CARD =============

interface SketchCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "dusty-pink" | "sage-green" | "warm-brown" | "soft-cream" | "muted-blue" | "light-lavender";
}

export const SketchCard = ({ children, className, variant = "default" }: SketchCardProps) => {
  const bgColors = {
    default: "bg-card",
    "dusty-pink": "bg-dusty-pink",
    "sage-green": "bg-sage-green",
    "warm-brown": "bg-warm-brown",
    "soft-cream": "bg-soft-cream",
    "muted-blue": "bg-muted-blue",
    "light-lavender": "bg-light-lavender",
  };

  return (
    <div
      className={cn(
        "p-4 border-2 border-ink/20 shadow-card",
        bgColors[variant],
        className
      )}
      style={{
        borderRadius: "8px 12px 10px 14px", // Hand-drawn uneven corners
      }}
    >
      {children}
    </div>
  );
};

// ============= DASHED DIVIDER =============

export const DashedDivider = ({ className }: { className?: string }) => (
  <div className={cn("py-2", className)}>
    <div className="border-t-2 border-dashed border-ink/30" />
  </div>
);

// ============= PILL BADGE =============

interface SketchBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "dusty-pink" | "sage-green" | "warm-brown" | "muted-blue";
  className?: string;
}

export const SketchBadge = ({ children, variant = "default", className }: SketchBadgeProps) => {
  const colors = {
    default: "bg-soft-cream text-ink",
    "dusty-pink": "bg-dusty-pink text-ink",
    "sage-green": "bg-sage-green text-ink",
    "warm-brown": "bg-warm-brown text-ink",
    "muted-blue": "bg-muted-blue text-ink",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-sm font-hand-bold",
        colors[variant],
        className
      )}
      style={{ borderRadius: "10px 12px 11px 13px" }}
    >
      {children}
    </span>
  );
};

// ============= TIME WHEEL / PIE CHART =============

interface TimeSlice {
  label: string;
  hours: number;
  color: string;
  icon?: React.ReactNode;
}

interface TimeWheelProps {
  slices: TimeSlice[];
  className?: string;
}

export const TimeWheel = ({ slices, className }: TimeWheelProps) => {
  const total = slices.reduce((sum, s) => sum + s.hours, 0);
  let currentAngle = -90; // Start from top

  return (
    <div className={cn("relative w-40 h-40", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {slices.map((slice, index) => {
          const angle = (slice.hours / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = 50 + 40 * Math.cos(startRad);
          const y1 = 50 + 40 * Math.sin(startRad);
          const x2 = 50 + 40 * Math.cos(endRad);
          const y2 = 50 + 40 * Math.sin(endRad);

          const largeArc = angle > 180 ? 1 : 0;

          const pathD = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

          return (
            <path
              key={index}
              d={pathD}
              fill={slice.color}
              stroke="hsl(var(--ink))"
              strokeWidth="0.5"
            />
          );
        })}
        {/* Center circle */}
        <circle cx="50" cy="50" r="15" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1" />
      </svg>
    </div>
  );
};
