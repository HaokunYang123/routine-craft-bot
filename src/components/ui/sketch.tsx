import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ============= HAND-DRAWN DOODLE ICONS =============
// Based on bullet journal aesthetic - simple, cute line drawings

export const SketchHome = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10L12 4L20 10" />
    <path d="M6 9V18C6 18.5 6.5 19 7 19H17C17.5 19 18 18.5 18 18V9" />
    <rect x="10" y="13" width="4" height="6" rx="0.5" />
  </svg>
);

export const SketchCalendar = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="5" width="16" height="15" rx="1" />
    <path d="M4 10H20" />
    <path d="M8 3V6" />
    <path d="M16 3V6" />
    <circle cx="8" cy="14" r="0.5" fill="currentColor" />
    <circle cx="12" cy="14" r="0.5" fill="currentColor" />
    <circle cx="16" cy="14" r="0.5" fill="currentColor" />
    <circle cx="8" cy="17" r="0.5" fill="currentColor" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
);

export const SketchPlus = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8V16M8 12H16" strokeWidth="2" />
  </svg>
);

export const SketchStats = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 20V14" />
    <path d="M10 20V8" />
    <path d="M15 20V11" />
    <path d="M20 20V5" />
  </svg>
);

export const SketchSettings = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22" />
    <path d="M5.6 5.6L7.4 7.4M16.6 16.6L18.4 18.4M5.6 18.4L7.4 16.6M16.6 7.4L18.4 5.6" />
  </svg>
);

export const SketchShoppingCart = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4H6L8 16H18L20 6H7" />
    <circle cx="10" cy="20" r="1.5" />
    <circle cx="17" cy="20" r="1.5" />
  </svg>
);

export const SketchClock = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7V12L15 14" />
  </svg>
);

export const SketchBook = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4C5 3.5 5.5 3 6 3H18C18.5 3 19 3.5 19 4V20C19 20.5 18.5 21 18 21H6C5.5 21 5 20.5 5 20V4Z" />
    <path d="M9 3V21" />
    <path d="M13 8H16" />
    <path d="M13 11H16" />
  </svg>
);

export const SketchCoffee = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8H16V17C16 18.7 14.7 20 13 20H9C7.3 20 6 18.7 6 17V8Z" />
    <path d="M16 10H17.5C18.9 10 20 11.1 20 12.5C20 13.9 18.9 15 17.5 15H16" />
    <path d="M9 4C9 4 9 6 10 6C11 6 11 4 11 4" />
    <path d="M12 4C12 4 12 5.5 13 5.5C14 5.5 14 4 14 4" />
  </svg>
);

export const SketchSun = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3V5M12 19V21M3 12H5M19 12H21M5.6 5.6L7 7M17 17L18.4 18.4M5.6 18.4L7 17M17 7L18.4 5.6" />
  </svg>
);

export const SketchCloud = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 18C4 18 2 16 2 13.5C2 11.2 3.7 9.3 6 9C6.4 6.2 8.8 4 12 4C14.8 4 17.1 5.8 17.8 8.3C20.2 8.7 22 10.6 22 13C22 15.8 19.8 18 17 18H6.5Z" />
  </svg>
);

export const SketchRain = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 14C4 14 2 12 2 9.5C2 7.2 3.7 5.3 6 5C6.4 2.2 8.8 0 12 0C14.8 0 17.1 1.8 17.8 4.3C20.2 4.7 22 6.6 22 9C22 11.8 19.8 14 17 14H6.5Z" />
    <path d="M8 17L7 21M12 17L11 21M16 17L15 21" />
  </svg>
);

export const SketchWrench = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3C14.3 5.9 13.7 5.9 13.3 6.3L5 14.6V19H9.4L17.7 10.7C18.1 10.3 18.1 9.7 17.7 9.3L14.7 6.3Z" />
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
    <path d="M12 4C12 4 7 10 7 14C7 17 9.2 19 12 19C14.8 19 17 17 17 14C17 10 12 4 12 4Z" />
  </svg>
);

export const SketchArrow = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12H19M14 7L19 12L14 17" />
  </svg>
);

// Music player icons
export const SketchPlay = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 5V19L19 12L8 5Z" />
  </svg>
);

export const SketchPause = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const SketchSkipBack = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5L9 12L19 19V5Z" />
    <rect x="5" y="5" width="2" height="14" />
  </svg>
);

export const SketchSkipForward = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5L15 12L5 19V5Z" />
    <rect x="17" y="5" width="2" height="14" />
  </svg>
);

// Computer/work icon
export const SketchComputer = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="1" />
    <path d="M7 20H17" />
    <path d="M12 16V20" />
    <path d="M7 8H10" />
    <path d="M7 11H8" />
  </svg>
);

// Train icon
export const SketchTrain = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="4" width="14" height="14" rx="2" />
    <path d="M5 12H19" />
    <path d="M9 18L7 21M15 18L17 21" />
    <circle cx="8.5" cy="8" r="1" fill="currentColor" />
    <circle cx="15.5" cy="8" r="1" fill="currentColor" />
    <circle cx="8.5" cy="15" r="1" fill="currentColor" />
    <circle cx="15.5" cy="15" r="1" fill="currentColor" />
  </svg>
);

// ============= MOOD FACES =============

export const MoodHappy = ({ className }: { className?: string }) => (
  <svg className={cn("w-8 h-8", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="8.5" cy="10" r="1" fill="currentColor" />
    <circle cx="15.5" cy="10" r="1" fill="currentColor" />
    <path d="M8 14.5C8.5 16 10 17 12 17C14 17 15.5 16 16 14.5" />
  </svg>
);

export const MoodNeutral = ({ className }: { className?: string }) => (
  <svg className={cn("w-8 h-8", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="8.5" cy="10" r="1" fill="currentColor" />
    <circle cx="15.5" cy="10" r="1" fill="currentColor" />
    <path d="M8 15H16" />
  </svg>
);

export const MoodSad = ({ className }: { className?: string }) => (
  <svg className={cn("w-8 h-8", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="8.5" cy="10" r="1" fill="currentColor" />
    <circle cx="15.5" cy="10" r="1" fill="currentColor" />
    <path d="M8 16.5C8.5 15 10 14 12 14C14 14 15.5 15 16 16.5" />
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
        "w-5 h-5 border-2 border-ink flex items-center justify-center transition-colors flex-shrink-0",
        checked && "bg-sage-green",
        postponed && "bg-ink",
        className
      )}
      style={{
        borderRadius: "2px",
      }}
    >
      {checked && (
        <svg
          className={cn("w-3.5 h-3.5 text-ink", animating && "animate-wobbly-check")}
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
        <div className="w-2.5 h-2.5 bg-card" />
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
        className="h-4 border-2 border-ink rounded-sm overflow-hidden relative bg-card"
      >
        <div
          className="h-full bg-ink/20 transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
          }}
        />
        {/* Sketchy fill marks */}
        {Array.from({ length: Math.floor(percentage / 10) }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-px bg-ink/30"
            style={{ left: `${(i + 1) * 10}%` }}
          />
        ))}
      </div>
      {showLabel && (
        <div className="flex justify-between text-sm font-hand text-ink">
          <span>{value}/{max}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

// ============= SKETCHY CARD (no background color variants - pure paper look) =============

interface SketchCardProps {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export const SketchCard = ({ children, className, bordered = true }: SketchCardProps) => {
  return (
    <div
      className={cn(
        "p-4",
        bordered && "border-2 border-ink/80",
        className
      )}
      style={{
        borderRadius: "2px",
      }}
    >
      {children}
    </div>
  );
};

// ============= DASHED DIVIDER =============

export const DashedDivider = ({ className }: { className?: string }) => (
  <div className={cn("py-3", className)}>
    <div className="border-t-2 border-dashed border-ink/40" />
  </div>
);

// ============= WAVY UNDERLINE =============

export const WavyUnderline = ({ className }: { className?: string }) => (
  <svg className={cn("w-20 h-2", className)} viewBox="0 0 80 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 4C8 2 14 6 20 4C26 2 32 6 38 4C44 2 50 6 56 4C62 2 68 6 74 4" />
  </svg>
);

// ============= PILL BADGE =============

interface SketchBadgeProps {
  children: React.ReactNode;
  filled?: boolean;
  className?: string;
}

export const SketchBadge = ({ children, filled, className }: SketchBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-sm font-hand border border-ink rounded-full",
        filled && "bg-ink text-card",
        className
      )}
    >
      {children}
    </span>
  );
};

// ============= TIME WHEEL / PIE CHART =============

interface TimeSlice {
  label: string;
  hours: number;
  icon?: React.ReactNode;
}

interface TimeWheelProps {
  slices: TimeSlice[];
  className?: string;
}

export const TimeWheel = ({ slices, className }: TimeWheelProps) => {
  const total = slices.reduce((sum, s) => sum + s.hours, 0);
  let currentAngle = -90; // Start from top

  // Clock numbers
  const clockNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Clock hour markers */}
        {clockNumbers.map((num, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 50 + 42 * Math.cos(angle);
          const y = 50 + 42 * Math.sin(angle);
          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[6px] font-hand fill-ink"
            >
              {num}
            </text>
          );
        })}

        {/* Pie slices */}
        {slices.map((slice, index) => {
          const angle = (slice.hours / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = 50 + 35 * Math.cos(startRad);
          const y1 = 50 + 35 * Math.sin(startRad);
          const x2 = 50 + 35 * Math.cos(endRad);
          const y2 = 50 + 35 * Math.sin(endRad);

          const largeArc = angle > 180 ? 1 : 0;
          const pathD = `M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`;

          return (
            <path
              key={index}
              d={pathD}
              fill="none"
              stroke="hsl(var(--ink))"
              strokeWidth="1"
            />
          );
        })}

        {/* Center circle */}
        <circle cx="50" cy="50" r="12" fill="hsl(var(--card))" stroke="hsl(var(--ink))" strokeWidth="1" />
      </svg>
    </div>
  );
};

// ============= MUSIC PLAYER WIDGET =============

interface MusicPlayerProps {
  songTitle?: string;
  artist?: string;
  progress?: number;
  className?: string;
}

export const MusicPlayer = ({ songTitle = "HERE ALWAYS", artist = "Stray Kids", progress = 0.3, className }: MusicPlayerProps) => {
  return (
    <div className={cn("text-center space-y-2", className)}>
      {/* Album art placeholder */}
      <div className="w-10 h-10 mx-auto border border-ink rounded-sm flex items-center justify-center">
        <div className="w-6 h-6 border border-ink rounded-full" />
      </div>
      
      <div>
        <p className="font-hand-bold text-ink text-sm uppercase">{songTitle}</p>
        <p className="font-hand text-ink-light text-xs">{artist}</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 text-[10px] text-ink-light">
        <span>0:52</span>
        <div className="flex-1 h-px bg-ink relative">
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-ink rounded-full"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        <span>3:21</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <SketchSkipBack className="w-4 h-4 text-ink" />
        <SketchPause className="w-5 h-5 text-ink" />
        <SketchSkipForward className="w-4 h-4 text-ink" />
      </div>
    </div>
  );
};