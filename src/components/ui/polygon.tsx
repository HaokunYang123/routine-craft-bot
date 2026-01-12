import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Directional concave polygon clip-paths with uneven edges, inward notches, and tapered ends
const polygonClipPaths = {
  // Cards - larger shapes with subtle concave notches
  cardA: "polygon(0% 8%, 4% 0%, 92% 0%, 100% 6%, 100% 88%, 96% 100%, 12% 100%, 0% 94%)",
  cardB: "polygon(0% 4%, 8% 0%, 100% 0%, 100% 92%, 94% 100%, 6% 100%, 0% 96%, 0% 12%)",
  cardC: "polygon(2% 0%, 88% 0%, 100% 8%, 100% 100%, 92% 100%, 8% 100%, 0% 94%, 0% 6%)",
  cardNotch: "polygon(0% 6%, 6% 0%, 70% 0%, 75% 4%, 100% 4%, 100% 90%, 94% 100%, 10% 100%, 0% 92%)",
  
  // Buttons - tapered, directional shapes
  buttonRight: "polygon(0% 15%, 6% 0%, 88% 0%, 100% 50%, 88% 100%, 6% 100%, 0% 85%)",
  buttonLeft: "polygon(12% 0%, 94% 0%, 100% 15%, 100% 85%, 94% 100%, 12% 100%, 0% 50%)",
  buttonSharp: "polygon(0% 20%, 8% 0%, 92% 0%, 100% 0%, 100% 80%, 92% 100%, 8% 100%, 0% 100%)",
  buttonNotch: "polygon(0% 0%, 85% 0%, 92% 20%, 100% 20%, 100% 100%, 15% 100%, 8% 80%, 0% 80%)",
  
  // Badges - small, angular shapes
  badgeA: "polygon(0% 30%, 10% 0%, 90% 0%, 100% 30%, 100% 70%, 90% 100%, 10% 100%, 0% 70%)",
  badgeB: "polygon(8% 0%, 100% 0%, 100% 100%, 92% 100%, 0% 100%, 0% 20%)",
  badgeArrow: "polygon(0% 0%, 80% 0%, 100% 50%, 80% 100%, 0% 100%, 12% 50%)",
  badgeNotch: "polygon(0% 0%, 100% 0%, 100% 65%, 85% 100%, 0% 100%, 0% 35%, 10% 35%, 10% 0%)",
  
  // Containers - irregular with inward cuts
  containerA: "polygon(0% 3%, 3% 0%, 97% 0%, 100% 3%, 100% 97%, 97% 100%, 3% 100%, 0% 97%)",
  containerNotch: "polygon(0% 0%, 40% 0%, 45% 5%, 100% 5%, 100% 95%, 55% 95%, 50% 100%, 0% 100%)",
  containerStep: "polygon(0% 0%, 100% 0%, 100% 70%, 90% 70%, 90% 100%, 0% 100%)",
  
  // Progress/status - directional indicators
  progressChunk: "polygon(0% 25%, 8% 0%, 100% 0%, 92% 25%, 92% 75%, 100% 100%, 8% 100%, 0% 75%)",
  statusDot: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
  
  // Input fields - subtle angle variations
  inputA: "polygon(0% 10%, 2% 0%, 98% 0%, 100% 10%, 100% 90%, 98% 100%, 2% 100%, 0% 90%)",
  inputNotch: "polygon(0% 0%, 92% 0%, 100% 30%, 100% 100%, 8% 100%, 0% 70%)",
  
  // Tabs/nav - connected angular shapes
  tabActive: "polygon(0% 100%, 5% 0%, 95% 0%, 100% 100%)",
  tabInactive: "polygon(5% 100%, 10% 15%, 90% 15%, 95% 100%)",
  navItem: "polygon(0% 20%, 4% 0%, 96% 0%, 100% 20%, 100% 80%, 96% 100%, 4% 100%, 0% 80%)",
};

// =====================
// POLYGON CARD
// =====================
const polygonCardVariants = cva(
  "relative overflow-hidden transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        primary: "gradient-hero text-primary-foreground",
        accent: "gradient-accent text-accent-foreground",
        muted: "bg-muted text-muted-foreground",
        outline: "bg-transparent border-2 border-border text-foreground",
        glass: "bg-card/80 backdrop-blur-md text-card-foreground",
      },
      shape: {
        a: "",
        b: "",
        c: "",
        notch: "",
      },
      elevation: {
        none: "",
        soft: "shadow-soft",
        elevated: "shadow-elevated",
        glow: "shadow-glow",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "a",
      elevation: "soft",
    },
  }
);

export interface PolygonCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof polygonCardVariants> {}

const PolygonCard = React.forwardRef<HTMLDivElement, PolygonCardProps>(
  ({ className, variant, shape, elevation, style, ...props }, ref) => {
    const clipPath = shape === "b" ? polygonClipPaths.cardB 
      : shape === "c" ? polygonClipPaths.cardC 
      : shape === "notch" ? polygonClipPaths.cardNotch 
      : polygonClipPaths.cardA;
    
    return (
      <div
        ref={ref}
        className={cn(polygonCardVariants({ variant, shape, elevation }), className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    );
  }
);
PolygonCard.displayName = "PolygonCard";

// =====================
// POLYGON BUTTON
// =====================
const polygonButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110",
        accent: "gradient-accent text-accent-foreground hover:brightness-110",
        hero: "gradient-hero text-primary-foreground hover:brightness-110 shadow-glow",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        outline: "border-2 border-primary text-primary hover:bg-primary/10",
        ghost: "text-foreground hover:bg-muted",
      },
      shape: {
        right: "",
        left: "",
        sharp: "",
        notch: "",
      },
      size: {
        sm: "h-8 px-4 text-sm",
        default: "h-10 px-6 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "right",
      size: "default",
    },
  }
);

export interface PolygonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof polygonButtonVariants> {}

const PolygonButton = React.forwardRef<HTMLButtonElement, PolygonButtonProps>(
  ({ className, variant, shape, size, style, ...props }, ref) => {
    const clipPath = shape === "left" ? polygonClipPaths.buttonLeft
      : shape === "sharp" ? polygonClipPaths.buttonSharp
      : shape === "notch" ? polygonClipPaths.buttonNotch
      : polygonClipPaths.buttonRight;
    
    return (
      <button
        ref={ref}
        className={cn(polygonButtonVariants({ variant, shape, size }), className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    );
  }
);
PolygonButton.displayName = "PolygonButton";

// =====================
// POLYGON BADGE
// =====================
const polygonBadgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        accent: "bg-accent text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        muted: "bg-muted text-muted-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-border text-foreground bg-transparent",
        success: "bg-primary/20 text-primary",
      },
      shape: {
        a: "",
        b: "",
        arrow: "",
        notch: "",
      },
      size: {
        sm: "h-5 px-2 text-xs",
        default: "h-6 px-3 text-xs",
        lg: "h-7 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "a",
      size: "default",
    },
  }
);

export interface PolygonBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof polygonBadgeVariants> {}

const PolygonBadge = React.forwardRef<HTMLSpanElement, PolygonBadgeProps>(
  ({ className, variant, shape, size, style, ...props }, ref) => {
    const clipPath = shape === "b" ? polygonClipPaths.badgeB
      : shape === "arrow" ? polygonClipPaths.badgeArrow
      : shape === "notch" ? polygonClipPaths.badgeNotch
      : polygonClipPaths.badgeA;
    
    return (
      <span
        ref={ref}
        className={cn(polygonBadgeVariants({ variant, shape, size }), className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    );
  }
);
PolygonBadge.displayName = "PolygonBadge";

// =====================
// POLYGON CONTAINER
// =====================
const polygonContainerVariants = cva(
  "relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-background",
        card: "gradient-card",
        muted: "bg-muted",
        subtle: "gradient-subtle",
      },
      shape: {
        a: "",
        notch: "",
        step: "",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "a",
    },
  }
);

export interface PolygonContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof polygonContainerVariants> {}

const PolygonContainer = React.forwardRef<HTMLDivElement, PolygonContainerProps>(
  ({ className, variant, shape, style, ...props }, ref) => {
    const clipPath = shape === "notch" ? polygonClipPaths.containerNotch
      : shape === "step" ? polygonClipPaths.containerStep
      : polygonClipPaths.containerA;
    
    return (
      <div
        ref={ref}
        className={cn(polygonContainerVariants({ variant, shape }), className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    );
  }
);
PolygonContainer.displayName = "PolygonContainer";

// =====================
// POLYGON INPUT
// =====================
const polygonInputVariants = cva(
  "flex w-full bg-background text-foreground transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      shape: {
        a: "",
        notch: "",
      },
      inputSize: {
        sm: "h-8 px-3 text-sm",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      shape: "a",
      inputSize: "default",
    },
  }
);

export interface PolygonInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof polygonInputVariants> {}

const PolygonInput = React.forwardRef<HTMLInputElement, PolygonInputProps>(
  ({ className, shape, inputSize, style, type, ...props }, ref) => {
    const clipPath = shape === "notch" ? polygonClipPaths.inputNotch : polygonClipPaths.inputA;
    
    return (
      <input
        type={type}
        ref={ref}
        className={cn(polygonInputVariants({ shape, inputSize }), className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    );
  }
);
PolygonInput.displayName = "PolygonInput";

// =====================
// POLYGON TAB
// =====================
const polygonTabVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer",
  {
    variants: {
      variant: {
        active: "bg-primary text-primary-foreground",
        inactive: "bg-muted text-muted-foreground hover:bg-muted/80",
      },
      size: {
        sm: "h-8 px-4 text-sm",
        default: "h-10 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "inactive",
      size: "default",
    },
  }
);

export interface PolygonTabProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof polygonTabVariants> {
  active?: boolean;
}

const PolygonTab = React.forwardRef<HTMLDivElement, PolygonTabProps>(
  ({ className, variant, size, active, style, ...props }, ref) => {
    const clipPath = active ? polygonClipPaths.tabActive : polygonClipPaths.tabInactive;
    const computedVariant = active ? "active" : variant;
    
    return (
      <div
        ref={ref}
        className={cn(polygonTabVariants({ variant: computedVariant, size }), className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    );
  }
);
PolygonTab.displayName = "PolygonTab";

// =====================
// POLYGON PROGRESS
// =====================
interface PolygonProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showLabel?: boolean;
}

const PolygonProgress = React.forwardRef<HTMLDivElement, PolygonProgressProps>(
  ({ className, value = 0, max = 100, showLabel = false, style, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    return (
      <div
        ref={ref}
        className={cn("relative h-8 w-full bg-muted overflow-hidden", className)}
        style={{ clipPath: polygonClipPaths.progressChunk, ...style }}
        {...props}
      >
        <div
          className="h-full gradient-hero transition-all duration-500 ease-out"
          style={{ 
            width: `${percentage}%`,
            clipPath: polygonClipPaths.progressChunk,
          }}
        />
        {showLabel && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);
PolygonProgress.displayName = "PolygonProgress";

// =====================
// POLYGON STATUS
// =====================
const polygonStatusVariants = cva(
  "inline-flex items-center justify-center",
  {
    variants: {
      variant: {
        success: "bg-primary text-primary-foreground",
        warning: "bg-accent text-accent-foreground",
        error: "bg-destructive text-destructive-foreground",
        info: "bg-secondary text-secondary-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "w-4 h-4",
        default: "w-6 h-6",
        lg: "w-8 h-8",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
);

export interface PolygonStatusProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof polygonStatusVariants> {}

const PolygonStatus = React.forwardRef<HTMLDivElement, PolygonStatusProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(polygonStatusVariants({ variant, size }), className)}
        style={{ clipPath: polygonClipPaths.statusDot, ...style }}
        {...props}
      />
    );
  }
);
PolygonStatus.displayName = "PolygonStatus";

// =====================
// POLYGON NAV ITEM
// =====================
const polygonNavVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-transparent text-foreground hover:bg-muted",
        active: "bg-primary text-primary-foreground",
        muted: "bg-muted text-muted-foreground hover:bg-muted/80",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        default: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface PolygonNavItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof polygonNavVariants> {
  active?: boolean;
}

const PolygonNavItem = React.forwardRef<HTMLDivElement, PolygonNavItemProps>(
  ({ className, variant, size, active, style, ...props }, ref) => {
    const computedVariant = active ? "active" : variant;
    
    return (
      <div
        ref={ref}
        className={cn(polygonNavVariants({ variant: computedVariant, size }), className)}
        style={{ clipPath: polygonClipPaths.navItem, ...style }}
        {...props}
      />
    );
  }
);
PolygonNavItem.displayName = "PolygonNavItem";

// Export all clip paths for custom usage
export { polygonClipPaths };

export {
  PolygonCard,
  PolygonButton,
  PolygonBadge,
  PolygonContainer,
  PolygonInput,
  PolygonTab,
  PolygonProgress,
  PolygonStatus,
  PolygonNavItem,
};
