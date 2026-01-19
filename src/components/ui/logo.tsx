import { Dumbbell, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizeClasses = {
    sm: {
      icon: "h-5 w-5",
      text: "text-lg",
      sparkle: "h-3 w-3",
    },
    md: {
      icon: "h-6 w-6",
      text: "text-xl",
      sparkle: "h-4 w-4",
    },
    lg: {
      icon: "h-8 w-8",
      text: "text-2xl",
      sparkle: "h-5 w-5",
    },
  };

  const { icon, text, sparkle } = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <Dumbbell className={cn(icon, "text-cta-primary")} />
        <Sparkles
          className={cn(
            sparkle,
            "absolute -top-1 -right-1 text-urgent"
          )}
        />
      </div>
      {showText && (
        <span className={cn(text, "font-bold text-foreground")}>
          RoutineCraft
        </span>
      )}
    </div>
  );
}

export default Logo;
