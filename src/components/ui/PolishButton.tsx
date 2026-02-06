import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callGemini } from "@/lib/gemini";
import { buildPolishPrompt } from "@/lib/polishPrompt";

interface PolishButtonProps {
  value: string;
  onChange: (newValue: string) => void;
}

interface PolishResponse {
  polished?: unknown;
}

const UNDO_TIMEOUT_MS = 10000;

export function PolishButton({ value, onChange }: PolishButtonProps) {
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalValue, setOriginalValue] = useState<string | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  const clearUndoTimeout = () => {
    if (undoTimeoutRef.current !== null) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current !== null) {
        window.clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handlePolish = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const trimmedValue = value.trim();
    if (!trimmedValue || isPolishing) return;

    setError(null);
    setIsPolishing(true);

    const currentValue = value;

    try {
      const result = await callGemini<PolishResponse>(buildPolishPrompt(trimmedValue));
      const polishedValue = typeof result.data?.polished === "string" ? result.data.polished.trim() : "";

      if (!result.success || !polishedValue) {
        setError("Could not polish text, try again");
        return;
      }

      onChange(polishedValue);
      setOriginalValue(currentValue);
      clearUndoTimeout();
      undoTimeoutRef.current = window.setTimeout(() => {
        setOriginalValue(null);
        undoTimeoutRef.current = null;
      }, UNDO_TIMEOUT_MS);
    } catch {
      setError("Could not polish text, try again");
    } finally {
      setIsPolishing(false);
    }
  };

  const handleUndo = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (originalValue === null) return;

    onChange(originalValue);
    setOriginalValue(null);
    setError(null);
    clearUndoTimeout();
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePolish}
          disabled={!value.trim() || isPolishing}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {isPolishing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-cta-primary" />
          )}
          Polish with AI
        </Button>

        {originalValue !== null && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleUndo}
            className="h-auto p-0 text-xs text-cta-primary"
          >
            Undo
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
