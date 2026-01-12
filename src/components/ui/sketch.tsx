import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ============= BOLD VECTOR ICONS (Monoline, Uniform Thickness) =============

export const SketchHome = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10L12 3L21 10" />
    <path d="M5 9V19C5 19.5 5.5 20 6 20H18C18.5 20 19 19.5 19 19V9" />
    <rect x="9" y="13" width="6" height="7" rx="1" />
  </svg>
);

export const SketchCalendar = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9H21" />
    <path d="M8 2V5" />
    <path d="M16 2V5" />
    <circle cx="8" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const SketchPlus = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M12 5V19M5 12H19" />
  </svg>
);

export const SketchStats = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V12" />
    <path d="M9 20V8" />
    <path d="M14 20V4" />
    <path d="M19 20V14" />
  </svg>
);

export const SketchSettings = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22" />
    <path d="M5.6 5.6L7.8 7.8M16.2 16.2L18.4 18.4M5.6 18.4L7.8 16.2M16.2 7.8L18.4 5.6" />
  </svg>
);

export const SketchClock = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7V12L15 14" />
  </svg>
);

export const SketchBook = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4C4 3 5 2 6 2H18C19 2 20 3 20 4V20C20 21 19 22 18 22H6C5 22 4 21 4 20V4Z" />
    <path d="M8 2V22" />
    <path d="M12 8H16" />
    <path d="M12 12H16" />
  </svg>
);

export const SketchStar = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L14.5 9H22L16 13.5L18 21L12 16.5L6 21L8 13.5L2 9H9.5L12 2Z" />
  </svg>
);

export const SketchHeart = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21C12 21 3 14 3 8C3 5 5.5 2 9 2C10.5 2 12 3 12 3C12 3 13.5 2 15 2C18.5 2 21 5 21 8C21 14 12 21 12 21Z" />
  </svg>
);

export const SketchFlame = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C16 22 19 18 19 14C19 10 16 7 14 5C14 7 13 9 11 10C11 8 10 5 7 2C7 6 5 9 5 14C5 18 8 22 12 22Z" />
  </svg>
);

export const SketchTrophy = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3H18V10C18 14 15 16 12 16C9 16 6 14 6 10V3Z" />
    <path d="M6 6H4C4 9 5 11 6 11" />
    <path d="M18 6H20C20 9 19 11 18 11" />
    <path d="M12 16V19" />
    <path d="M8 22H16" />
    <path d="M8 19H16V22H8V19Z" />
  </svg>
);

export const SketchRibbon = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="6" />
    <path d="M7 14L5 22L12 19L19 22L17 14" />
  </svg>
);

export const SketchRocket = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C12 2 8 8 8 15C8 18 9.5 20 12 21C14.5 20 16 18 16 15C16 8 12 2 12 2Z" />
    <path d="M5 16L8 15" />
    <path d="M19 16L16 15" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const SketchRainbow = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M3 18C3 12 7.5 7 13 7C18.5 7 21 12 21 18" />
    <path d="M6 18C6 13.5 9 10 13 10C17 10 18 13.5 18 18" />
    <path d="M9 18C9 15.5 10.5 13 13 13C15.5 13 15 15.5 15 18" />
  </svg>
);

export const SketchPeople = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <path d="M3 21V17C3 15 5 13 9 13C13 13 15 15 15 17V21" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M17 12C19.5 12 21 13.5 21 15V18" />
  </svg>
);

export const SketchCheck = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13L9 17L19 7" />
  </svg>
);

export const SketchAlert = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8V12" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export const SketchUser = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21C4 17 7.5 14 12 14C16.5 14 20 17 20 21" />
  </svg>
);

export const SketchSend = ({ className }: { className?: string }) => (
  <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);

// ============= QUIRKY CHARACTER ILLUSTRATIONS (HeyTea Style) =============
// Abstract objects with faces, bold monoline outlines

// Zen Teapot Character - The wise AI friend
export const TeapotCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Teapot body */}
    <ellipse cx="32" cy="38" rx="18" ry="14" fill="hsl(150 45% 45%)" stroke="currentColor" strokeWidth="2.5"/>
    {/* Lid */}
    <ellipse cx="32" cy="24" rx="10" ry="4" fill="hsl(150 45% 55%)" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="32" cy="20" r="3" fill="hsl(150 45% 65%)" stroke="currentColor" strokeWidth="2"/>
    {/* Spout */}
    <path d="M50 36C54 34 58 32 58 28C58 24 54 24 52 26" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    {/* Handle */}
    <path d="M14 30C10 30 8 34 8 38C8 42 10 46 14 46" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    {/* Face */}
    <circle cx="26" cy="36" r="2.5" fill="currentColor"/>
    <circle cx="38" cy="36" r="2.5" fill="currentColor"/>
    <path d="M28 42C28 42 30 45 32 45C34 45 36 42 36 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Steam wisps */}
    <path d="M28 14C28 10 30 8 30 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <path d="M32 12C32 8 34 6 34 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    <path d="M36 14C36 10 38 8 38 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

// Walking Clock Character
export const WalkingClockCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Clock body */}
    <circle cx="32" cy="28" r="18" fill="hsl(45 90% 60%)" stroke="currentColor" strokeWidth="2.5"/>
    {/* Clock face */}
    <circle cx="32" cy="28" r="14" fill="white" stroke="currentColor" strokeWidth="2"/>
    {/* Clock hands */}
    <path d="M32 28V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 28L38 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="32" cy="28" r="2" fill="currentColor"/>
    {/* Face */}
    <circle cx="27" cy="26" r="2" fill="currentColor"/>
    <circle cx="37" cy="26" r="2" fill="currentColor"/>
    <path d="M29 32C29 32 31 34 32 34C33 34 35 32 35 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {/* Legs */}
    <path d="M26 46L24 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M38 46L40 56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Feet */}
    <ellipse cx="22" cy="58" rx="4" ry="2" fill="currentColor"/>
    <ellipse cx="42" cy="58" rx="4" ry="2" fill="currentColor"/>
    {/* Arms */}
    <path d="M14 32L8 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M50 32L56 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// Sleepy Cloud Character
export const SleepyCloudCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Cloud body */}
    <ellipse cx="32" cy="36" rx="22" ry="12" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="18" cy="32" r="10" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="46" cy="32" r="10" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="32" cy="28" r="12" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    {/* White fill to cover internal lines */}
    <ellipse cx="32" cy="34" rx="20" ry="10" fill="white"/>
    {/* Sleepy face */}
    <path d="M24 34C24 34 26 32 28 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M36 34C36 34 38 32 40 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="32" cy="40" rx="3" ry="2" fill="currentColor"/>
    {/* ZZZ */}
    <text x="48" y="18" fill="currentColor" fontSize="8" fontWeight="bold" fontFamily="Nunito">z</text>
    <text x="52" y="12" fill="currentColor" fontSize="10" fontWeight="bold" fontFamily="Nunito">z</text>
    <text x="56" y="6" fill="currentColor" fontSize="12" fontWeight="bold" fontFamily="Nunito">z</text>
    {/* Blush */}
    <circle cx="20" cy="38" r="3" fill="hsl(10 70% 80%)" opacity="0.6"/>
    <circle cx="44" cy="38" r="3" fill="hsl(10 70% 80%)" opacity="0.6"/>
  </svg>
);

// Happy Boba Cup Character  
export const BobaCupCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Cup body */}
    <path d="M18 20H46L42 56H22L18 20Z" fill="hsl(280 35% 60%)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Lid */}
    <ellipse cx="32" cy="18" rx="16" ry="4" fill="hsl(280 35% 70%)" stroke="currentColor" strokeWidth="2.5"/>
    {/* Dome lid */}
    <path d="M20 18C20 12 26 8 32 8C38 8 44 12 44 18" fill="hsl(280 35% 75%)" stroke="currentColor" strokeWidth="2.5"/>
    {/* Straw */}
    <rect x="30" y="2" width="4" height="20" rx="2" fill="hsl(150 45% 45%)" stroke="currentColor" strokeWidth="1.5"/>
    {/* Face */}
    <circle cx="26" cy="34" r="2.5" fill="currentColor"/>
    <circle cx="38" cy="34" r="2.5" fill="currentColor"/>
    <path d="M28 42C28 42 30 46 32 46C34 46 36 42 36 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Boba pearls at bottom */}
    <circle cx="26" cy="50" r="3" fill="currentColor" opacity="0.3"/>
    <circle cx="32" cy="52" r="3" fill="currentColor" opacity="0.3"/>
    <circle cx="38" cy="50" r="3" fill="currentColor" opacity="0.3"/>
    {/* Blush */}
    <circle cx="22" cy="38" r="2.5" fill="hsl(10 70% 80%)" opacity="0.6"/>
    <circle cx="42" cy="38" r="2.5" fill="hsl(10 70% 80%)" opacity="0.6"/>
  </svg>
);

// Dancing Leaf Character
export const DancingLeafCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Leaf body */}
    <path d="M32 8C16 16 12 36 20 48C24 54 32 58 32 58C32 58 40 54 44 48C52 36 48 16 32 8Z" fill="hsl(150 45% 50%)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Leaf vein */}
    <path d="M32 16V50" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
    <path d="M32 24L24 32" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
    <path d="M32 32L40 40" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
    {/* Face */}
    <circle cx="26" cy="32" r="2.5" fill="currentColor"/>
    <circle cx="38" cy="32" r="2.5" fill="currentColor"/>
    <path d="M28 40C28 40 30 44 32 44C34 44 36 40 36 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Arms/stems */}
    <path d="M12 36L20 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M52 36L44 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Little feet */}
    <ellipse cx="28" cy="58" rx="4" ry="2" fill="currentColor"/>
    <ellipse cx="36" cy="58" rx="4" ry="2" fill="currentColor"/>
  </svg>
);

// Happy Mochi Character
export const MochiCharacter = ({ className }: { className?: string }) => (
  <svg className={cn("w-full h-full", className)} viewBox="0 0 64 64" fill="none">
    {/* Mochi body - soft rounded shape */}
    <ellipse cx="32" cy="36" rx="22" ry="18" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    {/* Face */}
    <circle cx="24" cy="34" r="2.5" fill="currentColor"/>
    <circle cx="40" cy="34" r="2.5" fill="currentColor"/>
    <path d="M28 42C28 42 31 46 32 46C33 46 36 42 36 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Blush */}
    <circle cx="18" cy="40" r="4" fill="hsl(10 70% 80%)" opacity="0.5"/>
    <circle cx="46" cy="40" r="4" fill="hsl(10 70% 80%)" opacity="0.5"/>
    {/* Little arms */}
    <ellipse cx="12" cy="38" rx="4" ry="3" fill="white" stroke="currentColor" strokeWidth="2"/>
    <ellipse cx="52" cy="38" rx="4" ry="3" fill="white" stroke="currentColor" strokeWidth="2"/>
    {/* Sparkle */}
    <circle cx="50" cy="20" r="2" fill="hsl(45 90% 60%)"/>
    <circle cx="14" cy="24" r="1.5" fill="hsl(45 90% 60%)"/>
  </svg>
);

// ============= EMPTY STATE ILLUSTRATIONS =============

export const IllustrationNoTasks = ({ className }: { className?: string }) => (
  <svg className={cn("w-32 h-32", className)} viewBox="0 0 128 128" fill="none">
    {/* Sleepy cloud resting */}
    <ellipse cx="64" cy="90" rx="40" ry="10" fill="hsl(0 0% 90%)"/>
    <ellipse cx="64" cy="60" rx="32" ry="18" fill="white" stroke="currentColor" strokeWidth="3"/>
    <circle cx="42" cy="54" r="14" fill="white" stroke="currentColor" strokeWidth="3"/>
    <circle cx="86" cy="54" r="14" fill="white" stroke="currentColor" strokeWidth="3"/>
    <circle cx="64" cy="48" r="16" fill="white" stroke="currentColor" strokeWidth="3"/>
    <ellipse cx="64" cy="58" rx="28" ry="14" fill="white"/>
    {/* Sleepy face */}
    <path d="M50 58C50 58 54 55 58 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M70 58C70 58 74 55 78 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="64" cy="68" rx="4" ry="3" fill="currentColor"/>
    {/* ZZZ */}
    <text x="88" y="36" fill="currentColor" fontSize="12" fontWeight="bold" fontFamily="Nunito">z</text>
    <text x="96" y="26" fill="currentColor" fontSize="16" fontWeight="bold" fontFamily="Nunito">z</text>
    <text x="106" y="14" fill="currentColor" fontSize="20" fontWeight="bold" fontFamily="Nunito">z</text>
    {/* Blush */}
    <circle cx="44" cy="64" r="4" fill="hsl(10 70% 80%)" opacity="0.5"/>
    <circle cx="84" cy="64" r="4" fill="hsl(10 70% 80%)" opacity="0.5"/>
  </svg>
);

export const IllustrationNoPeople = ({ className }: { className?: string }) => (
  <svg className={cn("w-32 h-32", className)} viewBox="0 0 128 128" fill="none">
    {/* Shadow */}
    <ellipse cx="64" cy="110" rx="35" ry="8" fill="hsl(0 0% 90%)"/>
    {/* Mochi looking around */}
    <ellipse cx="64" cy="70" rx="30" ry="24" fill="white" stroke="currentColor" strokeWidth="3"/>
    {/* Looking eyes */}
    <circle cx="52" cy="66" r="4" fill="currentColor"/>
    <circle cx="76" cy="66" r="4" fill="currentColor"/>
    <circle cx="54" cy="64" r="1.5" fill="white"/>
    <circle cx="78" cy="64" r="1.5" fill="white"/>
    {/* Curious expression */}
    <ellipse cx="64" cy="80" rx="4" ry="3" fill="currentColor"/>
    {/* Arms up questioning */}
    <ellipse cx="30" cy="70" rx="6" ry="4" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <ellipse cx="98" cy="70" rx="6" ry="4" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    {/* Question marks */}
    <path d="M44 30C44 24 50 20 56 22C62 24 62 32 56 36C54 38 54 42 54 44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="54" cy="50" r="2" fill="currentColor"/>
    <path d="M84 26C84 20 90 16 96 18C102 20 102 28 96 32C94 34 94 38 94 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="94" cy="46" r="1.5" fill="currentColor"/>
    {/* Blush */}
    <circle cx="42" cy="76" r="5" fill="hsl(10 70% 80%)" opacity="0.5"/>
    <circle cx="86" cy="76" r="5" fill="hsl(10 70% 80%)" opacity="0.5"/>
  </svg>
);

export const IllustrationNoStickers = ({ className }: { className?: string }) => (
  <svg className={cn("w-32 h-32", className)} viewBox="0 0 128 128" fill="none">
    {/* Shadow */}
    <ellipse cx="64" cy="108" rx="30" ry="6" fill="hsl(0 0% 90%)"/>
    {/* Open book/album */}
    <path d="M20 85L64 95L108 85V45L64 35L20 45V85Z" fill="white" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M64 35V95" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    {/* Empty sticker spots */}
    <circle cx="42" cy="60" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    <circle cx="86" cy="60" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    <rect x="32" y="72" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    <rect x="76" y="72" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
    {/* Floating star wanting to be collected */}
    <path d="M64 15L68 25H78L70 31L74 41L64 35L54 41L58 31L50 25H60L64 15Z" fill="hsl(45 90% 60%)" stroke="currentColor" strokeWidth="2"/>
    {/* Star face */}
    <circle cx="61" cy="26" r="1.5" fill="currentColor"/>
    <circle cx="67" cy="26" r="1.5" fill="currentColor"/>
    <path d="M63 30C63 30 64 32 64 32C64 32 65 30 65 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Motion lines */}
    <path d="M46 18L50 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M78 16L82 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ============= UI COMPONENTS =============

// Checkbox with bold monoline style
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
        "w-7 h-7 border-[2.5px] border-foreground rounded-lg flex items-center justify-center transition-all flex-shrink-0",
        checked && "bg-accent",
        postponed && "bg-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:bg-accent/10 active:scale-95",
        className
      )}
    >
      {checked && (
        <svg
          className={cn("w-4 h-4 text-white", animating && "animate-pop")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12L10 17L19 7" />
        </svg>
      )}
      {postponed && !checked && (
        <div className="w-3 h-3 bg-white rounded-sm" />
      )}
    </button>
  );
};

// Progress Bar - thick with solid borders
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
    <div className={cn("space-y-2", className)}>
      <div 
        className={cn(
          "relative border-[2.5px] border-foreground rounded-full overflow-hidden bg-secondary",
          heightClasses[size]
        )}
      >
        <div
          className="h-full bg-accent transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-caption text-muted-foreground font-semibold">
          <span>{value}/{max}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

// Stat Card - Wii Channel style with sticker shadow
interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard = ({ value, label, icon, className }: StatCardProps) => (
  <div 
    className={cn(
      "bg-card p-4 text-center border-[2.5px] border-foreground rounded-2xl shadow-sticker",
      className
    )}
  >
    <div className="flex items-center justify-center gap-1.5 mb-1">
      {icon}
      <span className="text-display-md text-foreground">{value}</span>
    </div>
    <p className="text-caption text-muted-foreground font-semibold lowercase">{label}</p>
  </div>
);

// Card component - Grid system style
interface SketchCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outlined" | "sticker";
}

export const SketchCard = ({ children, className, variant = "default" }: SketchCardProps) => {
  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-card",
        variant === "default" && "border-[2.5px] border-foreground shadow-sticker",
        variant === "outlined" && "border-[2px] border-foreground",
        variant === "sticker" && "border-[2.5px] border-foreground shadow-sticker",
        className
      )}
    >
      {children}
    </div>
  );
};

// Dashed Divider - clean dots pattern
export const DashedDivider = ({ className }: { className?: string }) => (
  <div className={cn("py-4 flex items-center justify-center gap-2", className)}>
    {[...Array(7)].map((_, i) => (
      <div key={i} className="w-1.5 h-1.5 rounded-full bg-border-dark" />
    ))}
  </div>
);

// Sticker Display with characters
interface StickerDisplayProps {
  type: "star" | "trophy" | "heart" | "rocket" | "rainbow" | "flame" | "teapot" | "clock" | "cloud" | "boba" | "leaf" | "mochi";
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StickerDisplay = React.forwardRef<HTMLDivElement, StickerDisplayProps>(
  ({ type, label, size = "md", className }, ref) => {
    const sizeClasses = {
      sm: "w-12 h-12",
      md: "w-16 h-16",
      lg: "w-24 h-24",
    };

    const characters: Record<string, React.ReactNode> = {
      teapot: <TeapotCharacter />,
      clock: <WalkingClockCharacter />,
      cloud: <SleepyCloudCharacter />,
      boba: <BobaCupCharacter />,
      leaf: <DancingLeafCharacter />,
      mochi: <MochiCharacter />,
      star: <MochiCharacter />,
      trophy: <TeapotCharacter />,
      heart: <BobaCupCharacter />,
      rocket: <DancingLeafCharacter />,
      rainbow: <SleepyCloudCharacter />,
      flame: <WalkingClockCharacter />,
    };

    return (
      <div ref={ref} className={cn("flex flex-col items-center gap-1.5 flex-shrink-0", className)}>
        <div className={cn(sizeClasses[size], "text-foreground")}>
          {characters[type]}
        </div>
        {label && (
          <span className="text-caption text-muted-foreground text-center max-w-[80px] font-semibold lowercase">
            {label}
          </span>
        )}
      </div>
    );
  }
);
StickerDisplay.displayName = "StickerDisplay";

// Badge
interface SketchBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "matcha" | "taro" | "mango";
  className?: string;
}

export const SketchBadge = ({ children, variant = "default", className }: SketchBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-caption font-semibold rounded-full border-2",
        variant === "default" && "bg-secondary text-foreground border-foreground",
        variant === "success" && "bg-accent/10 text-accent border-accent",
        variant === "matcha" && "bg-accent/10 text-accent border-accent",
        variant === "taro" && "bg-accent-purple/10 text-accent-purple border-accent-purple",
        variant === "mango" && "bg-accent-yellow/20 text-foreground border-accent-yellow",
        variant === "warning" && "bg-accent-yellow/20 text-foreground border-accent-yellow",
        variant === "error" && "bg-destructive/10 text-destructive border-destructive",
        className
      )}
    >
      {children}
    </span>
  );
};

// Avatar
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
        "border-[2.5px] border-foreground rounded-full flex items-center justify-center bg-accent-yellow font-bold text-foreground",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
};

// Button
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
  const baseClasses = "inline-flex items-center justify-center font-bold transition-all active:translate-y-0.5 active:shadow-none";
  
  const variantClasses = {
    primary: "bg-foreground text-background border-[2.5px] border-foreground shadow-sticker hover:bg-foreground/90",
    secondary: "bg-accent text-white border-[2.5px] border-foreground shadow-sticker hover:bg-accent/90",
    outline: "bg-card text-foreground border-[2.5px] border-foreground shadow-sticker hover:bg-secondary",
    ghost: "bg-transparent text-foreground hover:bg-secondary",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-caption rounded-lg",
    md: "px-4 py-2 text-body-md rounded-xl",
    lg: "px-6 py-3 text-body-lg rounded-2xl",
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
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
};

// Input
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
        "w-full px-4 py-3 bg-card border-[2.5px] border-foreground text-body-md rounded-xl",
        "placeholder:text-hint focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
        "transition-all",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  );
};

// Empty State
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
      <h3 className="text-display-sm text-foreground mb-2 lowercase">{title}</h3>
      {description && (
        <p className="text-body-md text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
};
