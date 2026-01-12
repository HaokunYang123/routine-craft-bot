import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ============= HAND-DRAWN DOODLE ICONS =============

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

export const SketchFlame = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C16 22 19 18.5 19 14.5C19 10.5 16 8 14 6C14 8 13 10 11 11C11 9 10 6 7 3C7 7 5 10 5 14.5C5 18.5 8 22 12 22Z" />
    <path d="M12 22C10 22 8 20 8 17.5C8 15 10 14 12 12C14 14 16 15 16 17.5C16 20 14 22 12 22Z" />
  </svg>
);

export const SketchTrophy = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4H18V9C18 12 15.3 14 12 14C8.7 14 6 12 6 9V4Z" />
    <path d="M6 6H4C4 8 5 10 6 10" />
    <path d="M18 6H20C20 8 19 10 18 10" />
    <path d="M12 14V17" />
    <path d="M8 21H16" />
    <path d="M9 17H15V21H9V17Z" />
  </svg>
);

export const SketchRibbon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="5" />
    <path d="M8 13L6 21L12 18L18 21L16 13" />
    <path d="M12 6V8" />
    <path d="M10 9H14" />
  </svg>
);

export const SketchRocket = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3C12 3 8 8 8 14C8 17 9.5 19 12 20C14.5 19 16 17 16 14C16 8 12 3 12 3Z" />
    <path d="M5 15L8 14" />
    <path d="M19 15L16 14" />
    <circle cx="12" cy="12" r="2" />
    <path d="M10 20L9 23" />
    <path d="M14 20L15 23" />
  </svg>
);

export const SketchRainbow = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 18C4 13 7.6 9 12 9C16.4 9 20 13 20 18" />
    <path d="M7 18C7 14.7 9.2 12 12 12C14.8 12 17 14.7 17 18" />
    <path d="M10 18C10 16.3 10.9 15 12 15C13.1 15 14 16.3 14 18" />
  </svg>
);

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

export const SketchComputer = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="1" />
    <path d="M7 20H17" />
    <path d="M12 16V20" />
    <path d="M7 8H10" />
    <path d="M7 11H8" />
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
        className="h-3 border-2 border-ink overflow-hidden relative bg-card"
        style={{ borderRadius: "2px" }}
      >
        <div
          className="h-full bg-sage-green transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
          }}
        />
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

// ============= SKETCHY CARD =============

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
  <div className={cn("py-4", className)}>
    <div className="border-t-2 border-dashed border-ink/30" />
  </div>
);

// ============= STICKER DISPLAY =============

interface StickerDisplayProps {
  type: "star" | "trophy" | "heart" | "rocket" | "rainbow" | "flame";
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StickerDisplay = ({ type, label, size = "md", className }: StickerDisplayProps) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };

  const iconClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };

  const icons = {
    star: <SketchStar filled className={cn(iconClasses[size], "text-ink")} />,
    trophy: <SketchTrophy className={cn(iconClasses[size], "text-ink")} />,
    heart: <SketchHeart filled className={cn(iconClasses[size], "text-ink")} />,
    rocket: <SketchRocket className={cn(iconClasses[size], "text-ink")} />,
    rainbow: <SketchRainbow className={cn(iconClasses[size], "text-ink")} />,
    flame: <SketchFlame className={cn(iconClasses[size], "text-ink")} />,
  };

  return (
    <div className={cn("flex flex-col items-center gap-1 flex-shrink-0", className)}>
      <div
        className={cn(
          sizeClasses[size],
          "border-2 border-ink bg-soft-cream flex items-center justify-center"
        )}
        style={{ borderRadius: "50%" }}
      >
        {icons[type]}
      </div>
      {label && (
        <span className="text-xs font-hand text-ink-light text-center max-w-[60px]">
          {label}
        </span>
      )}
    </div>
  );
};

// ============= BADGE =============

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