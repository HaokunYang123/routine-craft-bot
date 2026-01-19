import { UsersRound, Sparkles } from "lucide-react";
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
      container: "w-7 h-7",
    },
    md: {
      icon: "h-6 w-6",
      text: "text-xl",
      container: "w-8 h-8",
    },
    lg: {
      icon: "h-8 w-8",
      text: "text-2xl",
      container: "w-10 h-10",
    },
  };

  const { icon, text, container } = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(container, "flex items-center justify-center rounded-lg bg-cta-primary")}>
        <UsersRound className={cn(icon, "text-white")} />
      </div>
      {showText && (
        <span className={cn(text, "font-bold text-foreground")}>
          TeachCoachConnect
        </span>
      )}
    </div>
  );
}

export default Logo;
