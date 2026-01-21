import { useState, useEffect } from "react";
import { User, Shield, LogOut, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

// Coach emoji options
const COACH_EMOJIS = [
  "🏀", "⚽", "🎾", "🏈", "⚾", "🏐", "🎯", "🏋️",
  "🧘", "🏃", "🚴", "🏊", "⛳", "🎿", "🏆", "🥇",
  "📋", "📚", "✏️", "🎓", "💪", "🌟", "🔥", "💯",
];

export default function CoachSettings() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [nameInput, setNameInput] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize inputs when profile loads
  useEffect(() => {
    if (profile) {
      setNameInput(profile.display_name || "");
      // Extract emoji from avatar_url if it's an emoji
      if (profile.avatar_url?.startsWith("emoji:")) {
        setSelectedEmoji(profile.avatar_url.replace("emoji:", ""));
      }
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) return;

    setSaving(true);
    await updateProfile({
      display_name: nameInput.trim(),
      avatar_url: selectedEmoji ? `emoji:${selectedEmoji}` : null,
    });
    setSaving(false);
  };

  const currentEmoji = profile?.avatar_url?.startsWith("emoji:")
    ? profile.avatar_url.replace("emoji:", "")
    : null;

  const hasChanges =
    nameInput.trim() !== (profile?.display_name || "") ||
    selectedEmoji !== currentEmoji;

  return (
    <div className="space-y-6 pb-20 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-btn-secondary/20">
              <User className="w-5 h-5 text-btn-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              {/* Avatar Emoji Selection */}
              <div className="space-y-3">
                <Label className="text-foreground">Choose Your Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-cta-primary/20 flex items-center justify-center text-3xl border-2 border-cta-primary/30">
                    {selectedEmoji || (nameInput ? nameInput.charAt(0).toUpperCase() : "C")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Select an emoji to represent you
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                  {COACH_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji === selectedEmoji ? null : emoji)}
                      className={cn(
                        "w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all hover:bg-cta-primary/20",
                        selectedEmoji === emoji
                          ? "bg-cta-primary/30 ring-2 ring-cta-primary"
                          : "bg-card hover:scale-110"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name" className="text-foreground">Display Name</Label>
                  <Input
                    id="display-name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name (e.g., Coach Josh)"
                    className="bg-input border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be shown throughout the app
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-muted border-border text-muted-foreground"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={saving || !hasChanges || !nameInput.trim()}
                className="bg-cta-primary hover:bg-cta-hover text-white disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Privacy Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-btn-secondary/20">
              <Shield className="w-5 h-5 text-btn-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">
                Privacy & Security
              </CardTitle>
              <CardDescription>Manage your security settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start border-border text-foreground hover:bg-muted"
          >
            Change Password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-border text-foreground hover:bg-muted"
          >
            Two-Factor Authentication
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-border text-foreground hover:bg-muted"
          >
            Download My Data
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-urgent/30">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full border-urgent/50 text-urgent hover:bg-urgent/10 hover:text-urgent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
