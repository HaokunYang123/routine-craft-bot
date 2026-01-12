import React from "react";
import { cn } from "@/lib/utils";

// Simple line doodle icons - Korean minimalist style
// Soft, rounded strokes with gentle curves

export const DoodleStar = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
    <path 
      d="M12 3L14 9.5H20.5L15.5 13.5L17.5 20L12 16L6.5 20L8.5 13.5L3.5 9.5H10L12 3Z" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const DoodleHeart = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
    <path 
      d="M12 20C12 20 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 20 12 20Z" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const DoodleCheck = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
    <path 
      d="M5 13L9 17L19 7" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const DoodleCircle = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
    <circle 
      cx="12" 
      cy="12" 
      r="9" 
      stroke="currentColor" 
      strokeWidth="1.5"
      fill={filled ? "currentColor" : "none"}
      fillOpacity={filled ? 0.2 : 0}
    />
  </svg>
);

export const DoodleFlower = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="12" cy="5" rx="2.5" ry="3" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="12" cy="19" rx="2.5" ry="3" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="5" cy="12" rx="3" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="19" cy="12" rx="3" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const DoodleCloud = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
    <path 
      d="M6 16C3.8 16 2 14.2 2 12C2 10 3.5 8.3 5.5 8C5.8 5.2 8.1 3 11 3C13.5 3 15.6 4.6 16.3 7C16.5 7 16.8 7 17 7C19.8 7 22 9.2 22 12C22 14.8 19.8 17 17 17H6V16Z" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const DoodleSun = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.9 4.9L6.3 6.3M17.7 17.7L19.1 19.1M4.9 19.1L6.3 17.7M17.7 6.3L19.1 4.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Soft card component with rounded corners and gentle shadow
interface SoftCardProps {
  children: React.ReactNode;
  className?: string;
  pastel?: "peach" | "mint" | "lavender" | "sky" | "lemon" | "rose" | "white";
}

export const SoftCard = ({ children, className, pastel = "white" }: SoftCardProps) => {
  const bgColors = {
    peach: "bg-pastel-peach",
    mint: "bg-pastel-mint",
    lavender: "bg-pastel-lavender",
    sky: "bg-pastel-sky",
    lemon: "bg-pastel-lemon",
    rose: "bg-pastel-rose",
    white: "bg-card",
  };

  return (
    <div className={cn(
      "rounded-2xl p-4 shadow-card transition-all duration-200",
      bgColors[pastel],
      className
    )}>
      {children}
    </div>
  );
};

// Pill badge with soft colors
interface PillBadgeProps {
  children: React.ReactNode;
  className?: string;
  pastel?: "peach" | "mint" | "lavender" | "sky" | "lemon" | "rose";
}

export const PillBadge = ({ children, className, pastel = "mint" }: PillBadgeProps) => {
  const bgColors = {
    peach: "bg-pastel-peach",
    mint: "bg-pastel-mint",
    lavender: "bg-pastel-lavender",
    sky: "bg-pastel-sky",
    lemon: "bg-pastel-lemon",
    rose: "bg-pastel-rose",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-sm font-hand font-bold text-foreground/80",
      bgColors[pastel],
      className
    )}>
      {children}
    </span>
  );
};

// Soft progress bar
interface SoftProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: "primary" | "mint" | "peach" | "lavender";
}

export const SoftProgress = ({ value, max = 100, className, color = "primary" }: SoftProgressProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const fillColors = {
    primary: "bg-primary",
    mint: "bg-pastel-mint",
    peach: "bg-pastel-peach",
    lavender: "bg-pastel-lavender",
  };

  return (
    <div className={cn("h-3 bg-muted rounded-full overflow-hidden", className)}>
      <div 
        className={cn("h-full rounded-full transition-all duration-500 ease-out", fillColors[color])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// Rounded checkbox
interface SoftCheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

export const SoftCheckbox = ({ checked, onChange, className }: SoftCheckboxProps) => (
  <button
    onClick={onChange}
    className={cn(
      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
      checked 
        ? "bg-primary border-primary text-primary-foreground" 
        : "border-muted-foreground/30 hover:border-primary/50",
      className
    )}
  >
    {checked && <DoodleCheck className="w-3.5 h-3.5" />}
  </button>
);

// Floating button
interface FloatingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const FloatingButton = ({ children, onClick, className }: FloatingButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-card flex items-center justify-center",
      "transition-all duration-200 hover:scale-105 active:scale-95",
      className
    )}
  >
    {children}
  </button>
);
