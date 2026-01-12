import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ============= HAND-DRAWN DOODLE ICONS =============
// Bold black outlines (2-3px stroke) matching Heytea/Sungwon style

export const SketchHome = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10L12 4L20 10" />
    <path d="M6 9V18C6 18.5 6.5 19 7 19H17C17.5 19 18 18.5 18 18V9" />
    <rect x="10" y="13" width="4" height="6" rx="0.5" />
  </svg>
);

export const SketchCalendar = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="5" width="16" height="15" rx="1" />
    <path d="M4 10H20" />
    <path d="M8 3V6" />
    <path d="M16 3V6" />
    <circle cx="8" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
    <circle cx="16" cy="14" r="1" fill="currentColor" />
  </svg>
);

export const SketchPlus = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 6V18M6 12H18" />
  </svg>
);

export const SketchStats = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 20V14" />
    <path d="M10 20V8" />
    <path d="M15 20V11" />
    <path d="M20 20V5" />
  </svg>
);

export const SketchSettings = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22" />
    <path d="M5.6 5.6L7.4 7.4M16.6 16.6L18.4 18.4M5.6 18.4L7.4 16.6M16.6 7.4L18.4 5.6" />
  </svg>
);

export const SketchClock = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7V12L15 14" />
  </svg>
);

export const SketchBook = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4C5 3.5 5.5 3 6 3H18C18.5 3 19 3.5 19 4V20C19 20.5 18.5 21 18 21H6C5.5 21 5 20.5 5 20V4Z" />
    <path d="M9 3V21" />
    <path d="M13 8H16" />
    <path d="M13 11H16" />
  </svg>
);

export const SketchStar = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L14 9H20L15 13L17 20L12 16L7 20L9 13L4 9H10L12 3Z" />
  </svg>
);

export const SketchHeart = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20C12 20 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 20 12 20Z" />
  </svg>
);

export const SketchFlame = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C16 22 19 18.5 19 14.5C19 10.5 16 8 14 6C14 8 13 10 11 11C11 9 10 6 7 3C7 7 5 10 5 14.5C5 18.5 8 22 12 22Z" />
    <path d="M12 22C10 22 8 20 8 17.5C8 15 10 14 12 12C14 14 16 15 16 17.5C16 20 14 22 12 22Z" />
  </svg>
);

export const SketchTrophy = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4H18V9C18 12 15.3 14 12 14C8.7 14 6 12 6 9V4Z" />
    <path d="M6 6H4C4 8 5 10 6 10" />
    <path d="M18 6H20C20 8 19 10 18 10" />
    <path d="M12 14V17" />
    <path d="M8 21H16" />
    <path d="M9 17H15V21H9V17Z" />
  </svg>
);

export const SketchRibbon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="5" />
    <path d="M8 13L6 21L12 18L18 21L16 13" />
    <path d="M12 6V8" />
    <path d="M10 9H14" />
  </svg>
);

export const SketchRocket = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3C12 3 8 8 8 14C8 17 9.5 19 12 20C14.5 19 16 17 16 14C16 8 12 3 12 3Z" />
    <path d="M5 15L8 14" />
    <path d="M19 15L16 14" />
    <circle cx="12" cy="12" r="2" />
    <path d="M10 20L9 23" />
    <path d="M14 20L15 23" />
  </svg>
);

export const SketchRainbow = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 18C4 13 7.6 9 12 9C16.4 9 20 13 20 18" />
    <path d="M7 18C7 14.7 9.2 12 12 12C14.8 12 17 14.7 17 18" />
    <path d="M10 18C10 16.3 10.9 15 12 15C13.1 15 14 16.3 14 18" />
  </svg>
);

export const SketchPeople = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <path d="M3 21V17C3 15 5 13 9 13C13 13 15 15 15 17V21" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M17 12C19.5 12 21 13.5 21 15V18" />
  </svg>
);

export const SketchCheck = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13L9 17L19 7" />
  </svg>
);

export const SketchAlert = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8V12" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export const SketchUser = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21C4 17 7.5 14 12 14C16.5 14 20 17 20 21" />
  </svg>
);

export const SketchSend = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);

// ============= HEYTEA-STYLE STICKER ILLUSTRATIONS =============
// Quirky characters with bold outlines, minimal detail

export const StickerStarCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Star body */}
    <path d="M32 8L38 24H54L42 34L46 50L32 40L18 50L22 34L10 24H26L32 8Z" fill="#FFE066" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Face */}
    <circle cx="26" cy="28" r="2" fill="currentColor"/>
    <circle cx="38" cy="28" r="2" fill="currentColor"/>
    <path d="M28 34C28 34 30 37 32 37C34 37 36 34 36 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Blush */}
    <circle cx="22" cy="32" r="2.5" fill="#FFB5B5" opacity="0.6"/>
    <circle cx="42" cy="32" r="2.5" fill="#FFB5B5" opacity="0.6"/>
  </svg>
);

export const StickerTrophyCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Trophy cup */}
    <path d="M18 12H46V28C46 38 40 44 32 44C24 44 18 38 18 28V12Z" fill="#4A90A4" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Handles */}
    <path d="M18 16H12C12 22 14 28 18 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M46 16H52C52 22 50 28 46 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Base */}
    <path d="M26 44V50H38V44" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M22 50H42V56H22V50Z" fill="currentColor" stroke="currentColor" strokeWidth="2"/>
    {/* Face */}
    <circle cx="27" cy="26" r="2" fill="white"/>
    <circle cx="37" cy="26" r="2" fill="white"/>
    <path d="M29 32C29 32 31 35 32 35C33 35 35 32 35 32" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    {/* Sparkle */}
    <path d="M50 8L52 12L56 10L54 14L58 16L54 18L56 22L52 20L50 24L48 20L44 22L46 18L42 16L46 14L44 10L48 12L50 8Z" fill="#FFE066" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const StickerHeartCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Heart body */}
    <path d="M32 56C32 56 8 40 8 22C8 14 14 8 22 8C27 8 32 12 32 12C32 12 37 8 42 8C50 8 56 14 56 22C56 40 32 56 32 56Z" fill="#E07A3A" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Face */}
    <circle cx="24" cy="26" r="2.5" fill="white"/>
    <circle cx="40" cy="26" r="2.5" fill="white"/>
    <path d="M28 34C28 34 31 38 32 38C33 38 36 34 36 34" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Arms */}
    <path d="M12 32L6 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M52 32L58 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Legs */}
    <path d="M26 52L24 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M38 52L40 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export const StickerRocketCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Rocket body */}
    <path d="M32 6C32 6 20 18 20 38C20 46 24 52 32 56C40 52 44 46 44 38C44 18 32 6 32 6Z" fill="white" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Window */}
    <circle cx="32" cy="28" r="8" fill="#4A90A4" stroke="currentColor" strokeWidth="2"/>
    {/* Face in window */}
    <circle cx="29" cy="27" r="1.5" fill="white"/>
    <circle cx="35" cy="27" r="1.5" fill="white"/>
    <path d="M30 31C30 31 31 33 32 33C33 33 34 31 34 31" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Fins */}
    <path d="M20 44L10 52L14 44" fill="#E07A3A" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M44 44L54 52L50 44" fill="#E07A3A" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    {/* Flames */}
    <path d="M28 56C28 56 26 62 28 62C30 62 30 58 32 58C34 58 34 62 36 62C38 62 36 56 36 56" fill="#FFE066" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const StickerRainbowCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Cloud base */}
    <ellipse cx="32" cy="48" rx="20" ry="10" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="20" cy="44" r="8" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="44" cy="44" r="8" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="32" cy="42" r="10" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    {/* White cover for internal lines */}
    <ellipse cx="32" cy="46" rx="18" ry="8" fill="white"/>
    {/* Rainbow arcs */}
    <path d="M14 40C14 28 22 18 32 18C42 18 50 28 50 40" stroke="#E07A3A" strokeWidth="3" strokeLinecap="round"/>
    <path d="M18 40C18 30 24 22 32 22C40 22 46 30 46 40" stroke="#FFE066" strokeWidth="3" strokeLinecap="round"/>
    <path d="M22 40C22 32 26 26 32 26C38 26 42 32 42 40" stroke="#5BA865" strokeWidth="3" strokeLinecap="round"/>
    <path d="M26 40C26 34 28 30 32 30C36 30 38 34 38 40" stroke="#4A90A4" strokeWidth="3" strokeLinecap="round"/>
    {/* Face on cloud */}
    <circle cx="26" cy="48" r="2" fill="currentColor"/>
    <circle cx="38" cy="48" r="2" fill="currentColor"/>
    <path d="M30 52C30 52 31 54 32 54C33 54 34 52 34 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const StickerFlameCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Outer flame */}
    <path d="M32 4C32 4 48 16 48 34C48 48 40 58 32 58C24 58 16 48 16 34C16 16 32 4 32 4Z" fill="#E07A3A" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Inner flame */}
    <path d="M32 20C32 20 40 28 40 40C40 48 36 54 32 54C28 54 24 48 24 40C24 28 32 20 32 20Z" fill="#FFE066" stroke="currentColor" strokeWidth="2"/>
    {/* Face */}
    <circle cx="28" cy="38" r="2" fill="currentColor"/>
    <circle cx="36" cy="38" r="2" fill="currentColor"/>
    <path d="M30 44C30 44 31 46 32 46C33 46 34 44 34 44" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Sparkles */}
    <circle cx="12" cy="20" r="2" fill="#FFE066" stroke="currentColor" strokeWidth="1"/>
    <circle cx="52" cy="24" r="2" fill="#FFE066" stroke="currentColor" strokeWidth="1"/>
    <circle cx="8" cy="36" r="1.5" fill="#FFE066" stroke="currentColor" strokeWidth="1"/>
  </svg>
);

// ============= EMPTY STATE ILLUSTRATIONS =============

export const IllustrationNoTasks = ({ className }: { className?: string }) => (
  <svg className={cn("w-32 h-32", className)} viewBox="0 0 128 128" fill="none">
    {/* Character body */}
    <ellipse cx="64" cy="100" rx="30" ry="8" fill="#E0E0E0"/>
    <circle cx="64" cy="60" r="35" fill="white" stroke="currentColor" strokeWidth="3"/>
    {/* Face */}
    <circle cx="52" cy="55" r="4" fill="currentColor"/>
    <circle cx="76" cy="55" r="4" fill="currentColor"/>
    <path d="M54 72C54 72 59 78 64 78C69 78 74 72 74 72" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    {/* Arms up celebrating */}
    <path d="M30 50L20 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <path d="M98 50L108 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    {/* Stars around */}
    <path d="M16 45L18 50L23 48L21 53L26 55L21 57L23 62L18 60L16 65L14 60L9 62L11 57L6 55L11 53L9 48L14 50L16 45Z" fill="#FFE066" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M112 50L114 54L118 52L116 56L120 58L116 60L118 64L114 62L112 66L110 62L106 64L108 60L104 58L108 56L106 52L110 54L112 50Z" fill="#FFE066" stroke="currentColor" strokeWidth="1.5"/>
    {/* Checkmark thought */}
    <path d="M90 20L92 18L96 22L104 14" stroke="#5BA865" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IllustrationNoPeople = ({ className }: { className?: string }) => (
  <svg className={cn("w-32 h-32", className)} viewBox="0 0 128 128" fill="none">
    {/* Shadow */}
    <ellipse cx="64" cy="110" rx="35" ry="8" fill="#E0E0E0"/>
    {/* Main character with magnifying glass */}
    <circle cx="55" cy="60" r="28" fill="white" stroke="currentColor" strokeWidth="3"/>
    {/* Face looking curious */}
    <circle cx="47" cy="55" r="3" fill="currentColor"/>
    <circle cx="63" cy="55" r="3" fill="currentColor"/>
    <ellipse cx="55" cy="68" rx="4" ry="3" fill="currentColor"/>
    {/* Magnifying glass */}
    <circle cx="95" cy="45" r="18" fill="#4A90A4" fillOpacity="0.2" stroke="currentColor" strokeWidth="3"/>
    <path d="M108 58L120 70" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    {/* Arm holding magnifying glass */}
    <path d="M75 55C75 55 82 48 88 45" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    {/* Little person silhouette in magnifying glass */}
    <circle cx="95" cy="40" r="5" stroke="currentColor" strokeWidth="2"/>
    <path d="M95 45V52" stroke="currentColor" strokeWidth="2"/>
    {/* Question marks */}
    <path d="M30 30C30 25 35 22 40 24C45 26 45 32 40 34C38 35 38 38 38 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="38" cy="45" r="1.5" fill="currentColor"/>
  </svg>
);

export const IllustrationNoStickers = ({ className }: { className?: string }) => (
  <svg className={cn("w-32 h-32", className)} viewBox="0 0 128 128" fill="none">
    {/* Shadow */}
    <ellipse cx="64" cy="108" rx="30" ry="6" fill="#E0E0E0"/>
    {/* Open sticker book */}
    <path d="M20 85L64 95L108 85L108 45L64 35L20 45L20 85Z" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M64 35V95" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    {/* Empty sticker spots */}
    <circle cx="42" cy="60" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    <circle cx="86" cy="60" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    <rect x="32" y="72" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    <rect x="76" y="72" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    {/* Floating star waiting to be collected */}
    <path d="M64 15L68 25H78L70 31L74 41L64 35L54 41L58 31L50 25H60L64 15Z" fill="#FFE066" stroke="currentColor" strokeWidth="2"/>
    {/* Motion lines */}
    <path d="M46 20L50 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M78 18L82 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M64 8L64 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Little face on star */}
    <circle cx="61" cy="26" r="1" fill="currentColor"/>
    <circle cx="67" cy="26" r="1" fill="currentColor"/>
    <path d="M63 29C63 29 64 30 64 30C64 30 65 29 65 29" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

// ============= HAND-DRAWN CHECKBOX =============

interface SketchCheckboxProps {
  checked: boolean;
  onChange?: () => void;
  postponed?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SketchCheckbox = ({ checked, onChange, postponed, disabled, className }: SketchCheckboxProps) => {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (onChange && !disabled) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
      onChange();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-6 h-6 border-2 border-ink rounded flex items-center justify-center transition-all flex-shrink-0",
        checked && "bg-success",
        postponed && "bg-ink",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:border-accent",
        className
      )}
    >
      {checked && (
        <svg
          className={cn("w-4 h-4 text-white", animating && "animate-wobbly-check")}
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
        <div className="w-3 h-3 bg-white rounded-sm" />
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
  size?: "sm" | "md" | "lg";
}

export const SketchProgress = ({ value, max = 100, className, showLabel = true, size = "md" }: SketchProgressProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div 
        className={cn(
          "relative border-2 border-ink rounded-full overflow-hidden bg-secondary",
          heightClasses[size]
        )}
      >
        <div
          className="h-full bg-success transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-caption text-muted-foreground">
          <span className="font-display">{value}/{max}</span>
          <span className="font-display">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

// ============= SKETCHY STAT CARD =============

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard = ({ value, label, icon, className }: StatCardProps) => (
  <div 
    className={cn("bg-card p-4 text-center border-2 border-ink rounded-lg", className)}
  >
    <div className="flex items-center justify-center gap-1.5 mb-1">
      {icon}
      <span className="text-display-md font-display text-foreground">{value}</span>
    </div>
    <p className="text-caption text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
  </div>
);

// ============= CARD =============

interface SketchCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outlined" | "sketchy";
}

export const SketchCard = ({ children, className, variant = "default" }: SketchCardProps) => {
  const baseStyles = "p-4 rounded-lg";
  
  return (
    <div
      className={cn(
        baseStyles,
        variant === "default" && "bg-card shadow-card border border-border",
        variant === "outlined" && "border-2 border-ink bg-card",
        variant === "sketchy" && "border-2 border-ink bg-card",
        className
      )}
    >
      {children}
    </div>
  );
};

// ============= DASHED DIVIDER =============

export const DashedDivider = ({ className }: { className?: string }) => (
  <div className={cn("py-4", className)}>
    <svg className="w-full h-2" viewBox="0 0 200 8" preserveAspectRatio="none">
      <path 
        d="M0 4C10 2 20 6 30 4C40 2 50 6 60 4C70 2 80 6 90 4C100 2 110 6 120 4C130 2 140 6 150 4C160 2 170 6 180 4C190 2 200 4 200 4" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeDasharray="8 6"
        fill="none"
        className="text-border"
      />
    </svg>
  </div>
);

// ============= STICKER DISPLAY WITH CHARACTERS =============

interface StickerDisplayProps {
  type: "star" | "trophy" | "heart" | "rocket" | "rainbow" | "flame";
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StickerDisplay = ({ type, label, size = "md", className }: StickerDisplayProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const characters = {
    star: <StickerStarCharacter />,
    trophy: <StickerTrophyCharacter />,
    heart: <StickerHeartCharacter />,
    rocket: <StickerRocketCharacter />,
    rainbow: <StickerRainbowCharacter />,
    flame: <StickerFlameCharacter />,
  };

  return (
    <div className={cn("flex flex-col items-center gap-1.5 flex-shrink-0", className)}>
      <div className={cn(sizeClasses[size], "text-foreground")}>
        {characters[type]}
      </div>
      {label && (
        <span className="text-caption text-muted-foreground text-center max-w-[70px] font-medium">
          {label}
        </span>
      )}
    </div>
  );
};

// ============= BADGE =============

interface SketchBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}

export const SketchBadge = ({ children, variant = "default", className }: SketchBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-caption font-medium rounded-full",
        variant === "default" && "bg-secondary text-foreground border border-border",
        variant === "success" && "bg-success/10 text-success border border-success/20",
        variant === "warning" && "bg-accent-orange/10 text-accent-orange border border-accent-orange/20",
        variant === "error" && "bg-destructive/10 text-destructive border border-destructive/20",
        className
      )}
    >
      {children}
    </span>
  );
};

// ============= AVATAR =============

interface SketchAvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SketchAvatar = ({ initials, size = "md", className }: SketchAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  return (
    <div
      className={cn(
        "border-2 border-ink rounded-full flex items-center justify-center bg-secondary font-display font-bold text-foreground",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
};

// ============= BUTTON =============

interface SketchButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export const SketchButton = ({ 
  children, 
  variant = "primary", 
  size = "md",
  onClick, 
  disabled, 
  className,
  type = "button"
}: SketchButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all";
  
  const variantClasses = {
    primary: "bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground",
    secondary: "bg-accent text-accent-foreground hover:bg-accent/90 border-2 border-accent",
    outline: "bg-transparent text-foreground hover:bg-secondary border-2 border-ink",
    ghost: "bg-transparent text-foreground hover:bg-secondary",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-caption",
    md: "px-4 py-2 text-body-md",
    lg: "px-6 py-3 text-body-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        "rounded-lg",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
};

// ============= INPUT =============

interface SketchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: "text" | "email" | "password";
  className?: string;
  disabled?: boolean;
}

export const SketchInput = ({ 
  placeholder, 
  value, 
  onChange, 
  type = "text",
  className,
  disabled
}: SketchInputProps) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-2.5 bg-input border-2 border-border text-body-md rounded-lg",
        "placeholder:text-hint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
        "transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  );
};

// ============= EMPTY STATE =============

interface EmptyStateProps {
  icon?: React.ReactNode;
  illustration?: "no-tasks" | "no-people" | "no-stickers";
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, illustration, title, description, action, className }: EmptyStateProps) => {
  const illustrations = {
    "no-tasks": <IllustrationNoTasks />,
    "no-people": <IllustrationNoPeople />,
    "no-stickers": <IllustrationNoStickers />,
  };

  return (
    <div className={cn("text-center py-10 px-4", className)}>
      {illustration ? (
        <div className="flex justify-center mb-4 text-foreground">
          {illustrations[illustration]}
        </div>
      ) : icon ? (
        <div className="flex justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-display-sm font-display text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-body-md text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
};
