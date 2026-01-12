import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  SketchStar,
  SketchTrophy,
  SketchHeart,
  SketchRocket,
  SketchRainbow,
  SketchFlame,
  DashedDivider,
  StickerDisplay,
} from "@/components/ui/sketch";

interface Sticker {
  id: string;
  type: "star" | "trophy" | "heart" | "rocket" | "rainbow" | "flame";
  label: string;
  earnedAt: string;
  awardedBy?: string;
}

const mockStickers: Sticker[] = [
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
];

export default function StickerBook() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "earned" | "coach">("all");

  const filteredStickers = mockStickers.filter((sticker) => {
    if (filter === "all") return true;
    if (filter === "coach") return !!sticker.awardedBy;
    return !sticker.awardedBy;
  });

  const earnedCount = mockStickers.filter((s) => !s.awardedBy).length;
  const coachCount = mockStickers.filter((s) => !!s.awardedBy).length;

  return (
    <div className="p-5 pb-28 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-3xl font-hand-bold text-ink">Sticker Book</h1>
        <p className="text-lg font-hand text-ink-light">
          {mockStickers.length} stickers collected
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-2 border-ink p-3 text-center" style={{ borderRadius: "2px" }}>
          <div className="text-2xl font-hand-bold text-ink">{mockStickers.length}</div>
          <p className="text-xs font-hand text-ink-light">Total</p>
        </div>
        <div className="border-2 border-ink p-3 text-center" style={{ borderRadius: "2px" }}>
          <div className="text-2xl font-hand-bold text-ink">{earnedCount}</div>
          <p className="text-xs font-hand text-ink-light">Earned</p>
        </div>
        <div className="border-2 border-ink p-3 text-center" style={{ borderRadius: "2px" }}>
          <div className="text-2xl font-hand-bold text-ink">{coachCount}</div>
          <p className="text-xs font-hand text-ink-light">Coach Awards</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-ink/20 pb-2">
        {[
          { key: "all", label: "All" },
          { key: "earned", label: "Earned" },
          { key: "coach", label: "Coach Awards" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={cn(
              "px-3 py-1 font-hand text-sm transition-colors",
              filter === tab.key
                ? "text-ink border-b-2 border-ink -mb-[2px]"
                : "text-ink-light hover:text-ink"
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
          <div key={sticker.id} className="flex flex-col items-center">
            <StickerDisplay type={sticker.type} size="md" />
            <span className="text-xs font-hand text-ink text-center mt-1 max-w-[70px]">
              {sticker.label}
            </span>
            {sticker.awardedBy && (
              <span className="text-[10px] font-hand text-ink-light">
                by {sticker.awardedBy}
              </span>
            )}
          </div>
        ))}
      </div>

      {filteredStickers.length === 0 && (
        <div className="text-center py-12">
          <SketchStar className="w-12 h-12 mx-auto text-ink-light mb-3" />
          <p className="font-hand text-lg text-ink-light">No stickers yet</p>
          <p className="font-hand text-sm text-ink-light mt-1">
            Complete tasks to earn stickers!
          </p>
        </div>
      )}

      <DashedDivider />

      {/* Export Section */}
      <section className="text-center">
        <h2 className="text-xl font-hand-bold text-ink mb-3">Export Stickers</h2>
        <p className="font-hand text-sm text-ink-light mb-4">
          Turn your collection into iOS stickers or share with friends!
        </p>
        <div className="flex justify-center gap-3">
          <button className="px-4 py-2 border-2 border-ink font-hand-bold text-ink hover:bg-soft-cream transition-colors" style={{ borderRadius: "2px" }}>
            Export as Pack
          </button>
          <button className="px-4 py-2 border-2 border-ink font-hand-bold text-ink hover:bg-soft-cream transition-colors" style={{ borderRadius: "2px" }}>
            Share Collection
          </button>
        </div>
      </section>
    </div>
  );
}