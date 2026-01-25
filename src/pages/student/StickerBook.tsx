import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  DashedDivider,
  StickerDisplay,
  EmptyState,
} from "@/components/ui/sketch";

interface Sticker {
  id: string;
  type: "star" | "trophy" | "heart" | "rocket" | "rainbow" | "flame";
  label: string;
  earnedAt: string | null; // null means not earned yet (locked)
  awardedBy?: string;
}

// All available stickers - some earned, some locked
const allStickers: Sticker[] = [
  { id: "1", type: "star", label: "5-Day Streak", earnedAt: "2026-01-10" },
  { id: "2", type: "trophy", label: "100% Day", earnedAt: "2026-01-09" },
  { id: "3", type: "heart", label: "Coach Award", earnedAt: "2026-01-08", awardedBy: "Ms. Smith" },
  { id: "4", type: "rocket", label: "Early Bird", earnedAt: "2026-01-07" },
  { id: "5", type: "rainbow", label: "Week Complete", earnedAt: "2026-01-05" },
  { id: "6", type: "flame", label: "On Fire!", earnedAt: "2026-01-04" },
  { id: "7", type: "star", label: "First Task", earnedAt: "2026-01-03" },
  { id: "8", type: "trophy", label: "Quiz Champ", earnedAt: "2026-01-02", awardedBy: "Mr. Johnson" },
  { id: "9", type: "heart", label: "Helpful", earnedAt: "2026-01-01", awardedBy: "Ms. Smith" },
  { id: "10", type: "rocket", label: "Quick Start", earnedAt: "2025-12-30" },
  { id: "11", type: "rainbow", label: "Goal Met", earnedAt: "2025-12-28" },
  { id: "12", type: "flame", label: "3-Day Streak", earnedAt: "2025-12-25" },
  // Locked stickers
  { id: "13", type: "star", label: "10-Day Streak", earnedAt: null },
  { id: "14", type: "trophy", label: "Perfect Week", earnedAt: null },
  { id: "15", type: "heart", label: "Team Player", earnedAt: null },
  { id: "16", type: "rocket", label: "Speed Demon", earnedAt: null },
  { id: "17", type: "rainbow", label: "Month Master", earnedAt: null },
  { id: "18", type: "flame", label: "30-Day Streak", earnedAt: null },
];

// Lock icon overlay
const LockIcon = ({ className }: { className?: string }) => (
  <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export default function StickerBook() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "earned" | "locked" | "coach">("all");
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  const filteredStickers = allStickers.filter((sticker) => {
    if (filter === "all") return true;
    if (filter === "locked") return !sticker.earnedAt;
    if (filter === "earned") return sticker.earnedAt && !sticker.awardedBy;
    if (filter === "coach") return !!sticker.awardedBy;
    return true;
  });

  const earnedCount = allStickers.filter((s) => s.earnedAt && !s.awardedBy).length;
  const coachCount = allStickers.filter((s) => !!s.awardedBy).length;
  const lockedCount = allStickers.filter((s) => !s.earnedAt).length;
  const totalEarned = allStickers.filter((s) => s.earnedAt).length;

  return (
    <div className="p-5 pb-28 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-3xl font-display font-bold text-foreground">Sticker Book</h1>
        <p className="text-lg font-display text-muted-foreground">
          {totalEarned} of {allStickers.length} collected
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div 
          className="border-2 border-foreground/80 p-3 text-center bg-card"
          style={{ clipPath: "polygon(2% 0%, 100% 2%, 98% 100%, 0% 98%)" }}
        >
          <div className="text-xl font-display font-bold text-foreground">{totalEarned}</div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Total</p>
        </div>
        <div 
          className="border-2 border-foreground/80 p-3 text-center bg-card"
          style={{ clipPath: "polygon(2% 0%, 100% 2%, 98% 100%, 0% 98%)" }}
        >
          <div className="text-xl font-display font-bold text-foreground">{earnedCount}</div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Earned</p>
        </div>
        <div 
          className="border-2 border-foreground/80 p-3 text-center bg-card"
          style={{ clipPath: "polygon(2% 0%, 100% 2%, 98% 100%, 0% 98%)" }}
        >
          <div className="text-xl font-display font-bold text-foreground">{coachCount}</div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Coach</p>
        </div>
        <div 
          className="border-2 border-foreground/80 p-3 text-center bg-card"
          style={{ clipPath: "polygon(2% 0%, 100% 2%, 98% 100%, 0% 98%)" }}
        >
          <div className="text-xl font-display font-bold text-foreground">{lockedCount}</div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Locked</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-border pb-2">
        {[
          { key: "all", label: "All" },
          { key: "earned", label: "Earned" },
          { key: "coach", label: "Coach Awards" },
          { key: "locked", label: "Locked" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={cn(
              "px-3 py-1 font-display text-sm transition-colors",
              filter === tab.key
                ? "text-foreground border-b-2 border-foreground -mb-[2px]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DashedDivider className="py-2" />

      {/* Sticker Grid */}
      <div className="grid grid-cols-4 gap-4">
        {filteredStickers.map((sticker) => (
          <StickerCard 
            key={sticker.id} 
            sticker={sticker}
            onClick={() => setSelectedSticker(sticker)}
          />
        ))}
      </div>

      {filteredStickers.length === 0 && (
        <EmptyState
          illustration="no-stickers"
          title="No stickers yet"
          description="Complete tasks to earn stickers!"
        />
      )}

      <DashedDivider />

      {/* Export Section */}
      <section className="text-center">
        <h2 className="text-xl font-display font-bold text-foreground mb-3">Export Stickers</h2>
        <p className="text-body-md text-muted-foreground mb-4">
          Turn your collection into iOS stickers or share with friends!
        </p>
        <div className="flex justify-center gap-3">
          <button 
            className="px-4 py-2 border-2 border-foreground font-semibold text-foreground hover:bg-secondary transition-colors"
            style={{ clipPath: "polygon(2% 0%, 100% 3%, 98% 100%, 0% 97%)" }}
          >
            Export as Pack
          </button>
          <button 
            className="px-4 py-2 border-2 border-foreground font-semibold text-foreground hover:bg-secondary transition-colors"
            style={{ clipPath: "polygon(2% 0%, 100% 3%, 98% 100%, 0% 97%)" }}
          >
            Share Collection
          </button>
        </div>
      </section>

      {/* Sticker Detail Modal */}
      {selectedSticker && (
        <StickerModal 
          sticker={selectedSticker} 
          onClose={() => setSelectedSticker(null)} 
        />
      )}
    </div>
  );
}

interface StickerCardProps {
  sticker: Sticker;
  onClick?: () => void;
}

function StickerCard({ sticker, onClick }: StickerCardProps) {
  const isLocked = !sticker.earnedAt;
  const [showPop, setShowPop] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Pop animation when earned sticker comes into view
  const handleClick = () => {
    if (!isLocked) {
      setShowPop(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setShowPop(false), 300);
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center relative group transition-transform",
        !isLocked && "hover:scale-105 active:scale-100",
        showPop && "animate-bounce"
      )}
    >
      {/* Sticker with conditional styling */}
      <div 
        className={cn(
          "relative transition-all duration-300",
          isLocked && "grayscale opacity-40"
        )}
      >
        <StickerDisplay type={sticker.type} size="md" />
        
        {/* Lock overlay for locked stickers */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-foreground/80 p-1.5 rounded-full">
              <LockIcon className="w-4 h-4 text-background" />
            </div>
          </div>
        )}
        
        {/* Glow effect for earned stickers on hover */}
        {!isLocked && (
          <div className="absolute inset-0 rounded-full bg-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10" />
        )}
      </div>
      
      {/* Label */}
      <span className={cn(
        "text-xs font-display text-center mt-1 max-w-[70px]",
        isLocked ? "text-muted-foreground" : "text-foreground"
      )}>
        {sticker.label}
      </span>
      
      {/* Coach badge */}
      {sticker.awardedBy && (
        <span className="text-[10px] font-medium text-accent">
          by {sticker.awardedBy}
        </span>
      )}
    </button>
  );
}

interface StickerModalProps {
  sticker: Sticker;
  onClose: () => void;
}

function StickerModal({ sticker, onClose }: StickerModalProps) {
  const isLocked = !sticker.earnedAt;

  return (
    <div 
      className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-foreground/20"
        onClick={(e) => e.stopPropagation()}
        style={{ clipPath: "polygon(1% 2%, 99% 0%, 100% 98%, 2% 100%)" }}
      >
        {/* Sticker Display */}
        <div className={cn(
          "flex justify-center mb-4",
          isLocked && "grayscale opacity-50"
        )}>
          <StickerDisplay type={sticker.type} size="lg" />
        </div>
        
        {/* Info */}
        <h3 className="text-display-md font-display text-foreground text-center mb-2">
          {sticker.label}
        </h3>
        
        {isLocked ? (
          <p className="text-body-md text-muted-foreground text-center mb-4">
            Complete more tasks to unlock this sticker!
          </p>
        ) : (
          <>
            <p className="text-body-md text-muted-foreground text-center mb-2">
              Earned on {sticker.earnedAt}
            </p>
            {sticker.awardedBy && (
              <p className="text-body-md text-accent text-center mb-4">
                Awarded by {sticker.awardedBy} ⭐
              </p>
            )}
          </>
        )}
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2 border-2 border-foreground font-semibold text-foreground hover:bg-secondary transition-colors rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}
