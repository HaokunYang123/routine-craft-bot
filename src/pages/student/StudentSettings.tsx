import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SketchCard, SketchAvatar, SketchButton, DashedDivider, SketchPeople } from "@/components/ui/sketch";
import { LogOut, Sun, Moon, Bell, Shield, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function StudentSettings() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-4">
            <header className="pt-2 pb-2">
                <h1 className="text-display-md text-foreground">Settings</h1>
            </header>

            {/* Profile Section */}
            <SketchCard variant="sticker">
                <div className="flex items-center gap-4">
                    <SketchAvatar initials={(user?.email?.[0] || "S").toUpperCase()} size="lg" />
                    <div>
                        <h2 className="text-body-lg font-bold text-foreground">
                            {user?.email?.split('@')[0] || "Student"}
                        </h2>
                        <p className="text-caption text-muted-foreground">
                            {user?.email}
                        </p>
                        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-semibold bg-accent-yellow/20 text-foreground border border-accent-yellow">
                            Student Account
                        </div>
                    </div>
                </div>
            </SketchCard>

            <DashedDivider />

            {/* App Settings */}
            <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-card border-[2.5px] border-foreground rounded-xl shadow-sticker hover:bg-secondary transition-colors text-left group">
                    <div className="flex items-center gap-3">
                        <Sun className="w-5 h-5 text-foreground group-hover:text-accent-yellow" />
                        <span className="text-body-md font-bold text-foreground">Appearance</span>
                    </div>
                    <span className="text-caption text-muted-foreground">Light</span>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-card border-[2.5px] border-foreground rounded-xl shadow-sticker hover:bg-secondary transition-colors text-left group">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-foreground group-hover:text-accent" />
                        <span className="text-body-md font-bold text-foreground">Notifications</span>
                    </div>
                    <span className="text-caption text-muted-foreground">On</span>
                </button>
            </div>

            <DashedDivider />

            {/* Support & Legal */}
            <div className="space-y-3">
                <button
                    onClick={() => navigate("/app/help")}
                    className="w-full flex items-center justify-between p-4 bg-card border-[2.5px] border-foreground rounded-xl text-left hover:bg-secondary transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-muted-foreground" />
                        <span className="text-body-md font-medium text-foreground">Help & Support</span>
                    </div>
                </button>
                <button
                    onClick={() => navigate("/app/privacy")}
                    className="w-full flex items-center justify-between p-4 bg-card border-[2.5px] border-foreground rounded-xl text-left hover:bg-secondary transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <span className="text-body-md font-medium text-foreground">Privacy Policy</span>
                    </div>
                </button>
            </div>

            <DashedDivider />

            {/* Sign Out & Delete */}
            <div className="space-y-4 pt-4">
                <SketchButton
                    variant="outline"
                    className="w-full text-foreground border-foreground hover:bg-secondary"
                    onClick={handleSignOut}
                >
                    <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </div>
                </SketchButton>

                <SketchButton
                    variant="ghost"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={async () => {
                        if (confirm("ARE YOU SURE? This will permanently delete your account and cannot be undone.")) {
                            try {
                                const { error } = await supabase.functions.invoke('delete-account');
                                if (error) throw error;
                                await signOut();
                                navigate("/", { replace: true });
                            } catch (e) {
                                console.error(e);
                                alert("Failed to delete account. Please try again.");
                            }
                        }
                    }}
                >
                    Delete Account (Testing Only)
                </SketchButton>
            </div>

            <p className="text-center text-caption text-muted-foreground pt-4">
                Version 1.0.0
            </p>
        </div>
    );
}
