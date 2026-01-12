import * as React from "react";
import { cn } from "@/lib/utils";

// SVG filter for hand-drawn wobbly effect
export function WobblyFilter() {
  return (
    <svg className="absolute w-0 h-0" aria-hidden="true">
      <defs>
        <filter id="wobbly">
          <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
        <filter id="wobbly-strong">
          <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
        </filter>
      </defs>
    </svg>
  );
}

// Irregular polygon paths - each uniquely wobbly and hand-drawn feeling
const polygonPaths = {
  // Soft asymmetric blob shapes with concave sections
  card1: "M 3,8 L 8,2 L 45,3 L 92,5 L 97,15 L 95,45 L 98,85 L 93,95 L 50,98 L 8,96 L 2,88 L 5,50 Z",
  card2: "M 5,5 L 40,2 L 88,4 L 96,12 L 94,50 L 97,90 L 90,97 L 55,95 L 10,98 L 3,92 L 4,55 L 2,15 Z",
  card3: "M 8,3 L 50,5 L 95,2 L 98,20 L 93,55 L 96,92 L 85,98 L 40,95 L 5,97 L 2,85 L 6,45 L 3,12 Z",
  
  // Button shapes - more compact with character
  button1: "M 4,15 L 15,4 L 50,3 L 88,5 L 96,18 L 95,82 L 88,96 L 50,98 L 12,95 L 3,85 L 5,50 Z",
  button2: "M 6,8 L 45,3 L 92,6 L 98,25 L 95,75 L 97,92 L 55,98 L 8,95 L 2,80 L 4,20 Z",
  
  // Badge shapes - small and cute
  badge1: "M 5,20 L 25,5 L 75,8 L 95,25 L 92,75 L 80,95 L 25,92 L 8,78 Z",
  badge2: "M 8,15 L 50,3 L 92,18 L 95,80 L 60,97 L 10,92 L 3,55 Z",
  
  // Progress container - horizontal emphasis
  progress: "M 2,25 L 8,8 L 92,5 L 98,22 L 97,78 L 90,95 L 10,92 L 3,75 Z",
  
  // Chat bubble shapes
  chatUser: "M 5,10 L 50,3 L 92,8 L 97,45 L 95,85 L 88,95 L 20,98 L 8,88 L 3,50 Z",
  chatAssistant: "M 8,5 L 88,8 L 95,15 L 97,50 L 92,88 L 55,97 L 12,95 L 3,85 L 5,45 L 2,15 Z",
  
  // Navigation item
  navItem: "M 5,18 L 20,5 L 80,8 L 95,22 L 93,78 L 85,95 L 18,92 L 4,75 Z",
  
  // Input field
  input: "M 3,20 L 12,5 L 88,8 L 97,22 L 98,78 L 88,95 L 12,92 L 2,78 Z",
};

interface WobblyPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof polygonPaths;
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export function WobblyPanel({
  variant = "card1",
  fill = "hsl(var(--card))",
  strokeColor = "hsl(var(--foreground))",
  strokeWidth = 2.5,
  children,
  className,
  ...props
}: WobblyPanelProps) {
  const path = polygonPaths[variant];
  
  return (
    <div className={cn("relative", className)} {...props}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "url(#wobbly)" }}
      >
        <path
          d={path}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

interface WobblyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  pastel?: "pink" | "yellow" | "blue" | "mint" | "lavender" | "peach" | "none";
  children?: React.ReactNode;
}

export function WobblyCard({
  pastel = "none",
  children,
  className,
  ...props
}: WobblyCardProps) {
  const fills: Record<string, string> = {
    none: "hsl(var(--card))",
    pink: "hsl(var(--pastel-pink))",
    yellow: "hsl(var(--pastel-yellow))",
    blue: "hsl(var(--pastel-blue))",
    mint: "hsl(var(--pastel-mint))",
    lavender: "hsl(var(--pastel-lavender))",
    peach: "hsl(var(--pastel-peach))",
  };

  // Randomly pick a card variant based on content hash or index
  const variants: Array<keyof typeof polygonPaths> = ["card1", "card2", "card3"];
  const variant = variants[Math.floor(Math.random() * variants.length)] as keyof typeof polygonPaths;

  return (
    <WobblyPanel
      variant={variant}
      fill={fills[pastel]}
      className={cn("min-h-[80px]", className)}
      {...props}
    >
      <div className="p-5 h-full">{children}</div>
    </WobblyPanel>
  );
}

interface WobblyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export function WobblyButton({
  variant = "primary",
  size = "md",
  children,
  className,
  ...props
}: WobblyButtonProps) {
  const fills = {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    ghost: "transparent",
  };

  const textColors = {
    primary: "text-primary-foreground",
    secondary: "text-secondary-foreground",
    ghost: "text-foreground",
  };

  const sizes = {
    sm: "h-9 text-sm px-4",
    md: "h-11 text-base px-5",
    lg: "h-14 text-lg px-6",
  };

  return (
    <button
      className={cn(
        "relative font-sketch transition-transform active:scale-95",
        sizes[size],
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "url(#wobbly)" }}
      >
        <path
          d={polygonPaths.button1}
          fill={fills[variant]}
          stroke={variant === "ghost" ? "hsl(var(--border))" : "hsl(var(--foreground))"}
          strokeWidth={variant === "ghost" ? 1.5 : 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={cn("relative z-10 flex items-center justify-center gap-2", textColors[variant])}>
        {children}
      </span>
    </button>
  );
}

interface WobblyBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  pastel?: "pink" | "yellow" | "blue" | "mint" | "lavender" | "peach";
  children?: React.ReactNode;
}

export function WobblyBadge({
  pastel = "mint",
  children,
  className,
  ...props
}: WobblyBadgeProps) {
  const fills: Record<string, string> = {
    pink: "hsl(var(--pastel-pink))",
    yellow: "hsl(var(--pastel-yellow))",
    blue: "hsl(var(--pastel-blue))",
    mint: "hsl(var(--pastel-mint))",
    lavender: "hsl(var(--pastel-lavender))",
    peach: "hsl(var(--pastel-peach))",
  };

  return (
    <span className={cn("relative inline-flex items-center h-7 px-3 font-sketch text-sm", className)} {...props}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "url(#wobbly)" }}
      >
        <path
          d={polygonPaths.badge1}
          fill={fills[pastel]}
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative z-10 text-foreground">{children}</span>
    </span>
  );
}

interface WobblyChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "user" | "assistant";
  children?: React.ReactNode;
}

export function WobblyChatBubble({
  role,
  children,
  className,
  ...props
}: WobblyChatBubbleProps) {
  const isUser = role === "user";
  
  return (
    <div
      className={cn(
        "relative",
        isUser ? "ml-8" : "mr-8",
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "url(#wobbly)" }}
      >
        <path
          d={isUser ? polygonPaths.chatUser : polygonPaths.chatAssistant}
          fill={isUser ? "hsl(var(--pastel-blue))" : "hsl(var(--card))"}
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-10 p-4 text-foreground font-sans text-sm">
        {children}
      </div>
    </div>
  );
}

interface WobblyProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

export function WobblyProgress({
  value,
  max = 100,
  className,
  ...props
}: WobblyProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("relative h-10", className)} {...props}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "url(#wobbly)" }}
      >
        <path
          d={polygonPaths.progress}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--foreground))"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="absolute inset-y-2 left-2 bg-pastel-mint transition-all duration-300"
        style={{ 
          width: `calc(${percentage}% - 16px)`,
          clipPath: "polygon(2% 15%, 98% 8%, 97% 88%, 3% 92%)",
        }}
      />
      <div className="relative z-10 flex items-center justify-center h-full font-sketch text-foreground">
        {value}/{max}
      </div>
    </div>
  );
}

interface WobblyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function WobblyInput({ className, ...props }: WobblyInputProps) {
  return (
    <div className={cn("relative h-12", className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ filter: "url(#wobbly)" }}
      >
        <path
          d={polygonPaths.input}
          fill="hsl(var(--card))"
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <input
        className={cn(
          "relative z-10 w-full h-full px-4 bg-transparent font-sans text-foreground placeholder:text-muted-foreground focus:outline-none"
        )}
        {...props}
      />
    </div>
  );
}

// Doodle decorations for empty states and accents
export function DoodleStar({ className, color = "hsl(var(--pastel-yellow))" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("w-6 h-6", className)} fill={color} stroke="hsl(var(--foreground))" strokeWidth="2">
      <path d="M20 2 L23 15 L38 15 L26 24 L30 38 L20 30 L10 38 L14 24 L2 15 L17 15 Z" strokeLinejoin="round" />
    </svg>
  );
}

export function DoodleHeart({ className, color = "hsl(var(--pastel-pink))" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("w-6 h-6", className)} fill={color} stroke="hsl(var(--foreground))" strokeWidth="2">
      <path d="M20 35 C8 25 2 18 2 12 C2 6 8 2 14 2 C17 2 20 4 20 8 C20 4 23 2 26 2 C32 2 38 6 38 12 C38 18 32 25 20 35 Z" strokeLinejoin="round" />
    </svg>
  );
}

export function DoodleLeaf({ className, color = "hsl(var(--pastel-mint))" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("w-6 h-6", className)} fill={color} stroke="hsl(var(--foreground))" strokeWidth="2">
      <path d="M8 32 Q20 28 25 15 Q28 5 35 3 Q30 10 28 20 Q25 32 15 35 Q10 36 8 32 Z" strokeLinejoin="round" />
      <path d="M8 32 Q18 24 28 12" fill="none" />
    </svg>
  );
}

export function DoodleCheck({ className, color = "hsl(var(--primary))" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("w-6 h-6", className)} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 22 L16 30 L32 10" />
    </svg>
  );
}

export function DoodleCircle({ className, color = "hsl(var(--foreground))" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("w-6 h-6", className)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 3 Q35 5 37 20 Q35 35 20 37 Q5 35 3 20 Q5 5 20 3" />
    </svg>
  );
}
