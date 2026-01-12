import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ============= AUTHENTIC HAND-DRAWN DOODLE ICONS =============
// Based on the bullet journal reference images - simple black line drawings

export const DoodleHome = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10L12 4L20 10" />
    <path d="M6 9V18H10V14H14V18H18V9" />
  </svg>
);

export const DoodleCalendar = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="5" width="16" height="16" rx="1" />
    <path d="M4 10H20" />
    <path d="M8 3V6" />
    <path d="M16 3V6" />
  </svg>
);

export const DoodlePlus = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
    <path d="M12 8V16M8 12H16" />
  </svg>
);

export const DoodleStats = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V12" />
    <path d="M9 20V8" />
    <path d="M14 20V14" />
    <path d="M19 20V4" />
  </svg>
);

export const DoodleUser = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20" />
  </svg>
);

export const DoodleCart = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4H6L8 16H18L20 6H7" />
    <circle cx="10" cy="20" r="1.5" fill="currentColor" />
    <circle cx="17" cy="20" r="1.5" fill="currentColor" />
  </svg>
);

export const DoodleClock = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6V12L15 15" />
  </svg>
);

export const DoodleBook = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4H18C19 4 20 5 20 6V18C20 19 19 20 18 20H4V4Z" />
    <path d="M8 4V20" />
    <path d="M12 8H16" />
    <path d="M12 12H16" />
  </svg>
);

export const DoodleCoffee = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8H16V17C16 19 14 20 12 20H9C7 20 5 19 5 17V8Z" />
    <path d="M16 10H18C19 10 20 11 20 12C20 13 19 14 18 14H16" />
    <path d="M8 4C8 4 8 6 10 6C12 6 12 4 12 4" />
  </svg>
);

export const DoodleSun = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3V5M12 19V21M3 12H5M19 12H21" />
    <path d="M5.6 5.6L7 7M17 17L18.4 18.4M5.6 18.4L7 17M17 7L18.4 5.6" />
  </svg>
);

export const DoodleCloud = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 16C4 16 2 14.5 2 12C2 10 3.5 8 6 8C6.5 5 9 3 12 3C15 3 17 5 17.5 7.5C20 8 22 10 22 13C22 15.5 20 17 17 17H6V16Z" />
  </svg>
);

export const DoodleWrench = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4L10 8L4 14L6 20L10 16L14 12L20 6L14 4Z" />
  </svg>
);

export const DoodleTrain = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="14" rx="2" />
    <path d="M4 12H20" />
    <path d="M8 21L6 18" />
    <path d="M16 21L18 18" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
    <circle cx="16" cy="8" r="1" fill="currentColor" />
  </svg>
);

export const DoodleMedicine = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="12" height="16" rx="2" />
    <path d="M6 10H18" />
    <path d="M10 6V10" />
    <path d="M14 6V10" />
  </svg>
);

export const DoodleArrow = ({ className }: { className?: string }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12H19" />
    <path d="M14 7L19 12L14 17" />
  </svg>
);

export const DoodleStar = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L14 9H20L15 13L17 20L12 16L7 20L9 13L4 9H10L12 3Z" />
  </svg>
);

export const DoodleSparkle = ({ className }: { className?: string }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 3V6M12 18V21M3 12H6M18 12H21" />
    <path d="M5.6 5.6L7.8 7.8M16.2 16.2L18.4 18.4M5.6 18.4L7.8 16.2M16.2 7.8L18.4 5.6" />
  </svg>
);

export const DoodleDroplet = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3C12 3 6 10 6 14C6 17.5 8.5 20 12 20C15.5 20 18 17.5 18 14C18 10 12 3 12 3Z" />
  </svg>
);

export const DoodleMoon = ({ className }: { className?: string }) => (
  <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M20 14C19 17 16 20 12 20C7 20 4 16 4 12C4 8 7 4 12 4C12 8 14 11 20 14Z" />
  </svg>
);

// ============= MOOD FACES =============

export const MoodHappy = ({ className }: { className?: string }) => (
  <svg className={cn("w-8 h-8", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="8" cy="10" r="1" fill="currentColor" />
    <circle cx="16" cy="10" r="1" fill="currentColor" />
    <path d="M8 15C10 17 14 17 16 15" />
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
    <path d="M8 17C10 15 14 15 16 17" />
  </svg>
);

// ============= MUSIC PLAYER ICONS =============

export const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M8 5V19L19 12L8 5Z" />
  </svg>
);

export const PauseIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="5" width="4" height="14" />
    <rect x="14" y="5" width="4" height="14" />
  </svg>
);

export const SkipBack = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M19 5V19L9 12L19 5Z" />
    <rect x="5" y="5" width="3" height="14" />
  </svg>
);

export const SkipForward = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M5 5V19L15 12L5 5Z" />
    <rect x="16" y="5" width="3" height="14" />
  </svg>
);

// ============= HAND-DRAWN CHECKBOX =============

interface DoodleCheckboxProps {
  checked: boolean;
  onChange?: () => void;
  postponed?: boolean;
  className?: string;
}

export const DoodleCheckbox = ({ checked, onChange, postponed, className }: DoodleCheckboxProps) => {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-5 h-5 border-2 border-ink flex items-center justify-center transition-all",
        checked && "bg-ink",
        className
      )}
      style={{ borderRadius: "1px 2px 2px 1px" }}
    >
      {checked && (
        <svg className="w-3 h-3 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12L9 17L20 6" className="animate-check" />
        </svg>
      )}
      {postponed && !checked && (
        <div className="w-2.5 h-0.5 bg-ink" />
      )}
    </button>
  );
};

// ============= PROGRESS BAR (Sketchy style) =============

interface DoodleProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export const DoodleProgress = ({ value, max = 100, className }: DoodleProgressProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("relative", className)}>
      {/* Track */}
      <div className="h-4 border-2 border-ink bg-background relative overflow-hidden" style={{ borderRadius: "2px 3px 2px 3px" }}>
        {/* Fill */}
        <div
          className="h-full bg-ink transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        {/* Marker circle at current position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-ink rounded-full transition-all duration-300"
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>
    </div>
  );
};

// ============= DASHED DIVIDER =============

export const DashedDivider = ({ className }: { className?: string }) => (
  <div className={cn("py-3", className)}>
    <div className="dashed-line opacity-40" />
  </div>
);

export const DottedDivider = ({ className }: { className?: string }) => (
  <div className={cn("py-3", className)}>
    <div className="dotted-line opacity-40" />
  </div>
);

// ============= WAVY UNDERLINE TEXT =============

export const WavyText = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("relative inline-block", className)}>
    {children}
    <svg className="absolute -bottom-1 left-0 w-full h-2" viewBox="0 0 100 8" preserveAspectRatio="none">
      <path
        d="M0 4 Q 10 0, 20 4 T 40 4 T 60 4 T 80 4 T 100 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  </span>
);
