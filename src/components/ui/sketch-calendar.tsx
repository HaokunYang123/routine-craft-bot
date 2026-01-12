import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type SketchCalendarProps = React.ComponentProps<typeof DayPicker>;

function SketchCalendar({ 
  className, 
  classNames, 
  showOutsideDays = true, 
  ...props 
}: SketchCalendarProps) {
  return (
    <div className="relative">
      {/* Hand-drawn border container */}
      <div 
        className="absolute inset-0 border-2 border-foreground/80 rounded-xl pointer-events-none"
        style={{
          clipPath: "polygon(1% 2%, 99% 0%, 100% 98%, 2% 100%)",
        }}
      />
      
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-4", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center font-display text-lg",
          caption_label: "text-lg font-display font-bold text-foreground",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            "h-8 w-8 bg-transparent p-0 opacity-60 hover:opacity-100 transition-opacity",
            "border-2 border-foreground/60 rounded-lg hover:bg-secondary"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex",
          head_cell: cn(
            "text-muted-foreground w-10 font-display font-bold text-sm",
            "text-center pb-2"
          ),
          row: "flex w-full mt-1",
          cell: cn(
            "h-10 w-10 text-center text-sm p-0 relative",
            "[&:has([aria-selected].day-range-end)]:rounded-r-md",
            "[&:has([aria-selected].day-outside)]:bg-accent/50",
            "focus-within:relative focus-within:z-20"
          ),
          day: cn(
            "h-10 w-10 p-0 font-display font-bold text-base",
            "hover:bg-secondary rounded-lg transition-colors",
            "aria-selected:opacity-100",
            "relative flex items-center justify-center"
          ),
          day_range_end: "day-range-end",
          day_selected: cn(
            "!bg-transparent text-foreground relative",
            // The scribble circle effect is applied via CSS below
            "after:content-[''] after:absolute after:inset-0",
            "after:border-[2.5px] after:border-foreground after:rounded-full",
            "after:scale-[1.1]",
            // Slightly imperfect/wobbly circle
            "after:[clip-path:polygon(5%_0%,_95%_3%,_100%_50%,_97%_95%,_50%_100%,_3%_97%,_0%_50%,_2%_5%)]"
          ),
          day_today: cn(
            "bg-accent/10 text-accent font-bold"
          ),
          day_outside: "day-outside text-muted-foreground opacity-40",
          day_disabled: "text-muted-foreground opacity-30",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ..._props }) => (
            <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
          ),
          IconRight: ({ ..._props }) => (
            <ChevronRight className="h-4 w-4 stroke-[2.5]" />
          ),
        }}
        {...props}
      />

      {/* Corner decorations for hand-drawn feel */}
      <svg className="absolute top-2 left-2 w-4 h-4 text-foreground/30" viewBox="0 0 16 16" fill="none">
        <path d="M0 16L4 12M0 12L8 4M0 8L12 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
      <svg className="absolute top-2 right-2 w-4 h-4 text-foreground/30" viewBox="0 0 16 16" fill="none">
        <path d="M16 16L12 12M16 12L8 4M16 8L4 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

SketchCalendar.displayName = "SketchCalendar";

export { SketchCalendar };
