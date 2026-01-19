import { useState, useRef } from "react";
import { Sparkles, Loader2, Send, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface InputWithMagicWandProps {
  placeholder?: string;
  onSubmit: (prompt: string) => Promise<void>;
  onExpand?: (text: string) => Promise<string>;
  isLoading?: boolean;
  className?: string;
  showExpandButton?: boolean;
  expandButtonLabel?: string;
}

export function InputWithMagicWand({
  placeholder = "Describe what you want to create...",
  onSubmit,
  onExpand,
  isLoading = false,
  className,
  showExpandButton = false,
  expandButtonLabel = "Expand",
}: InputWithMagicWandProps) {
  const [value, setValue] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!value.trim() || isLoading) return;
    await onSubmit(value.trim());
    setValue("");
  };

  const handleExpand = async () => {
    if (!value.trim() || !onExpand || isExpanding) return;
    setIsExpanding(true);
    try {
      const expanded = await onExpand(value.trim());
      setValue(expanded);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative rounded-lg border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-cta-primary/50 focus-within:border-cta-primary transition-all">
        {/* Sparkle decoration */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <Sparkles className="w-5 h-5 text-cta-primary/50" />
        </div>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "min-h-[100px] resize-none border-0 bg-transparent pl-10 pr-4 py-3",
            "text-foreground placeholder:text-muted-foreground",
            "focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-between p-2 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Enter
            </kbd>
            <span>to submit</span>
          </div>

          <div className="flex items-center gap-2">
            {showExpandButton && onExpand && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExpand}
                disabled={!value.trim() || isExpanding || isLoading}
                className="text-btn-secondary hover:text-btn-secondary hover:bg-btn-secondary/10"
              >
                {isExpanding ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-1" />
                )}
                {expandButtonLabel}
              </Button>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading}
              className="bg-cta-primary hover:bg-cta-hover text-white"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
