import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, Eye, EyeOff } from "lucide-react";

// Google icon SVG
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

export function CoachAuth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [view, setView] = useState<"options" | "email">("options");

    const navigate = useNavigate();
    const { toast } = useToast();
    const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

    const handleGoogleSignIn = async () => {
        // Determine strict role logic for generic OAuth if possible, 
        // but for now we rely on the user having signed up as a coach or being a new user.
        // If they are new, they will default to 'student' by DB trigger unless we have metadata.
        // Since we can't reliably pass metadata in this flow without PKCE/Redirect config changes,
        // we will rely on Post-Login Strict Check.
        localStorage.setItem("intended_role", "coach");
        await signInWithGoogle();
        if (googleError) {
            toast({
                title: "Google Sign-in Failed",
                description: googleError,
                variant: "destructive",
            });
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Strict Role Check immediately after login
                if (data.session) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("role")
                        .eq("user_id", data.session.user.id)
                        .single();

                    if (profile?.role === "student") {
                        // WRONG DOOR
                        await supabase.auth.signOut();
                        toast({
                            title: "Access Denied",
                            description: "This account is a Student account. Please log in from the Student page.",
                            variant: "destructive",
                        });
                        navigate("/login/student");
                        return;
                    }

                    // If we are here, role is coach (or null/new, which shouldn't happen for existing).
                    navigate("/dashboard");
                }

            } else {
                // Sign Up
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            display_name: displayName || email.split("@")[0],
                            role: "coach", // STRICTLY FORCE COACH
                        },
                    },
                });
                if (error) throw error;

                if (data.session) {
                    toast({
                        title: "Account created!",
                        description: "Welcome, Coach! Redirecting to dashboard...",
                    });
                    navigate("/dashboard");
                } else {
                    toast({
                        title: "Check your email",
                        description: "We sent you a confirmation link.",
                    });
                }
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (view === "options") {
        return (
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={() => navigate("/login")}>
                    <ArrowLeft className="w-4 h-4" /> Back to Selection
                </Button>
                <h2 className="text-xl font-semibold text-center mb-6">Teacher Login</h2>

                <div className="space-y-3">
                    <Button variant="outline" className="w-full h-12 gap-3" onClick={handleGoogleSignIn} disabled={googleLoading}>
                        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                        Continue with Google
                    </Button>
                    <Button variant="outline" className="w-full h-12 gap-3" onClick={() => setView("email")}>
                        <Mail className="w-5 h-5" /> Continue with Email
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleEmailAuth} className="space-y-4">
            <Button type="button" variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={() => setView("options")}>
                <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <h2 className="text-xl font-semibold text-center">
                {isLogin ? "Teacher Sign In" : "Create Teacher Account"}
            </h2>

            {!isLogin && (
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" placeholder="Mr. Smith" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="teacher@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <LoadingButton type="submit" className="w-full" isLoading={isLoading}>
                {isLogin ? "Sign In" : "Create Account"}
            </LoadingButton>

            <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
        </form>
    );
}
