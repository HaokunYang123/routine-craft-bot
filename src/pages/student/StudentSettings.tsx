import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    LogOut,
    User,
    Edit2,
    Check,
    X,
    HelpCircle,
    Loader2,
    Mail,
    Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error";
import { useTimezone } from "@/hooks/useTimezone";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

interface Profile {
    display_name: string | null;
    email: string | null;
    role: string | null;
    avatar_url: string | null;
    timezone: string | null;
}

export default function StudentSettings() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { timezone: currentTimezone, isTimezoneSet } = useTimezone();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingName, setEditingName] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState("");
    const [saving, setSaving] = useState(false);
    const [selectedTimezone, setSelectedTimezone] = useState("");
    const [savingTimezone, setSavingTimezone] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("display_name, email, role, avatar_url, timezone")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            setProfile(data);
            setNewDisplayName(data.display_name || "");
            setSelectedTimezone(data.timezone || currentTimezone);
        } catch (error) {
            handleError(error, { component: 'StudentSettings', action: 'fetch profile', silent: true });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveName = async () => {
        if (!user || !newDisplayName.trim()) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ display_name: newDisplayName.trim() })
                .eq("user_id", user.id);

            if (error) throw error;

            setProfile((prev) => prev ? { ...prev, display_name: newDisplayName.trim() } : null);
            setEditingName(false);
            toast({
                title: "Name Updated",
                description: "Your display name has been changed.",
            });
        } catch (error: unknown) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update name",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setNewDisplayName(profile?.display_name || "");
        setEditingName(false);
    };

    const handleSaveTimezone = async () => {
        if (!user) return;
        setSavingTimezone(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ timezone: selectedTimezone })
                .eq("user_id", user.id);

            if (error) throw error;
            setProfile((prev) => prev ? { ...prev, timezone: selectedTimezone } : null);
            toast({
                title: "Timezone Updated",
                description: "Your timezone has been saved.",
            });
        } catch (error: unknown) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update timezone",
                variant: "destructive",
            });
        } finally {
            setSavingTimezone(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate("/", { replace: true });
        } catch (error) {
            handleError(error, { component: 'StudentSettings', action: 'sign out', silent: true });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-cta-primary" />
            </div>
        );
    }

    const displayName = profile?.display_name || user?.email?.split("@")[0] || "Student";
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <div className="p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-6">
            <header className="pt-2">
                <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground">Manage your account</p>
            </header>

            {/* Profile Section */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-cta-primary" />
                        Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Avatar and Name */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-cta-primary/20 flex items-center justify-center text-3xl font-bold text-cta-primary border-2 border-cta-primary/30">
                            {initials}
                        </div>
                        <div className="flex-1">
                            {editingName ? (
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">Display Name</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="displayName"
                                            value={newDisplayName}
                                            onChange={(e) => setNewDisplayName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="flex-1"
                                            autoFocus
                                        />
                                        <Button
                                            size="icon"
                                            onClick={handleSaveName}
                                            disabled={saving || !newDisplayName.trim()}
                                            className="bg-cta-primary hover:bg-cta-hover text-white"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-foreground">
                                            {displayName}
                                        </h2>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingName(true)}
                                            className="h-8 w-8"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <Badge variant="secondary" className="mt-1">
                                        Student Account
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{user?.email}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Timezone */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-cta-primary" />
                        Timezone
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <TimezoneSelect
                        value={selectedTimezone}
                        onChange={setSelectedTimezone}
                    />
                    {!isTimezoneSet && (
                        <p className="text-xs text-muted-foreground">
                            Auto-detected from your browser
                        </p>
                    )}
                    {selectedTimezone !== (profile?.timezone || "") && (
                        <Button
                            onClick={handleSaveTimezone}
                            disabled={savingTimezone}
                            className="bg-cta-primary hover:bg-cta-hover text-white"
                        >
                            {savingTimezone ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Timezone"
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Support & Legal */}
            <Card>
                <CardContent className="p-0">
                    <button
                        onClick={() => navigate("/app/help")}
                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                    >
                        <HelpCircle className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Help & Support</span>
                    </button>
                </CardContent>
            </Card>

            <DeleteAccountSection />

            {/* Account Actions */}
            <div className="space-y-3">
                <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleSignOut}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground pt-4">
                Version 1.0.0
            </p>

        </div>
    );
}
