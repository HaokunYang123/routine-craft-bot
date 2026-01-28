import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useToast } from "@/hooks/use-toast";
import { QRScanner } from "./QRScanner";
import { ClassCodeForm } from "./ClassCodeForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    QrCode,
    Keyboard,
    Loader2,
    Mail,
    ArrowLeft,
    Eye,
    EyeOff,
    GraduationCap,
    School,
} from "lucide-react";

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

type AuthView = "role-selection" | "student-options" | "teacher-options" | "qr" | "classCode" | "email";
type Role = "student" | "coach";

interface MultiAuthLoginProps {
    onEmailAuth?: () => void; // Switch to email/password mode if needed
}

export function MultiAuthLogin({ onEmailAuth }: MultiAuthLoginProps) {
    const [view, setView] = useState<AuthView>("role-selection");
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isProcessingQR, setIsProcessingQR] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const { toast } = useToast();
    const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

    // Reset state when going back
    const handleBack = () => {
        if (view === "email" || view === "qr" || view === "classCode") {
            setView(selectedRole === "student" ? "student-options" : "teacher-options");
        } else {
            setView("role-selection");
            setSelectedRole(null);
        }
    };

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        setView(role === "student" ? "student-options" : "teacher-options");
    };

    // Handle QR code scan
    const handleQRScan = async (qrData: string) => {
        setIsProcessingQR(true);

        try {
            // QR data should be a UUID token
            const { data, error } = await supabase.rpc("validate_qr_token", {
                token: qrData
            });

            if (error || !data || data.length === 0) {
                toast({
                    title: "Invalid QR Code",
                    description: "This QR code is invalid or has expired.",
                    variant: "destructive",
                });
                setView("student-options");
                return;
            }

            const session = data[0];
            toast({
                title: "Joined Class!",
                description: `Welcome to ${session.session_name}`,
            });
            navigate("/app");
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to process QR code. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsProcessingQR(false);
            setView("student-options");
        }
    };

    // Handle class code join success
    const handleClassCodeSuccess = (sessionName: string) => {
        toast({
            title: "Joined Class!",
            description: `Welcome to ${sessionName}`,
        });
        navigate("/app");
    };

    // Handle Google sign in
    const handleGoogleSignIn = async () => {
        // Role is now passed through OAuth redirectTo URL parameter
        // The callback page will extract and set the role in the database
        if (!selectedRole) {
            toast({
                title: "Role Required",
                description: "Please select a role before signing in.",
                variant: "destructive",
            });
            return;
        }
        await signInWithGoogle(selectedRole);
        if (googleError) {
            toast({
                title: "Google Sign-in Failed",
                description: googleError,
                variant: "destructive",
            });
        }
    };

    // Handle email/password auth
    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate(selectedRole === "coach" ? "/dashboard" : "/app"); // Optimistic redirect
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            display_name: displayName || email.split("@")[0],
                            role: selectedRole, // Pass the selected role
                        },
                    },
                });
                if (error) throw error;

                // Check if user was created and session exists (email confirmation disabled)
                if (data.session) {
                    toast({
                        title: "Account created!",
                        description: "Welcome to TeachCoachConnect!",
                    });
                    navigate(selectedRole === "coach" ? "/dashboard" : "/app");
                } else {
                    // Email confirmation required
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
            setEmailLoading(false);
        }
    };

    // Render Role Selection
    if (view === "role-selection") {
        return (
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-center">I am a...</h2>
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        className="h-32 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5"
                        onClick={() => handleRoleSelect("coach")}
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <School className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-lg">Teacher</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-32 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5"
                        onClick={() => handleRoleSelect("student")}
                    >
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-lg">Student</span>
                    </Button>
                </div>
            </div>
        );
    }

    // Render Student Options
    if (view === "student-options") {
        return (
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <h2 className="text-xl font-semibold text-center mb-6">Student Login</h2>

                <div className="space-y-3">
                    <Button variant="outline" className="w-full h-14 justify-start gap-4 text-left" onClick={() => setView("qr")}>
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-medium">Scan QR Code</div>
                            <div className="text-xs text-muted-foreground">Use your camera</div>
                        </div>
                    </Button>
                    <Button variant="outline" className="w-full h-14 justify-start gap-4 text-left" onClick={() => setView("classCode")}>
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Keyboard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-medium">Enter Class Code</div>
                            <div className="text-xs text-muted-foreground">Type the 6-character code</div>
                        </div>
                    </Button>
                </div>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                </div>

                <Button variant="outline" className="w-full h-12 gap-3" onClick={() => setView("email")}>
                    <Mail className="w-5 h-5" /> Continue with Email
                </Button>
            </div>
        );
    }

    // Render Teacher Options
    if (view === "teacher-options") {
        return (
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4" /> Back
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

    // Render based on current view
    if (view === "qr") {
        return (
            <QRScanner
                onScan={handleQRScan}
                onCancel={() => setView("student-options")}
                isProcessing={isProcessingQR}
            />
        );
    }

    if (view === "classCode") {
        return (
            <ClassCodeForm
                onSuccess={handleClassCodeSuccess}
                onCancel={() => setView("student-options")}
            />
        );
    }

    if (view === "email") {
        return (
            <form onSubmit={handleEmailAuth} className="space-y-4">
                <Button type="button" variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <h2 className="text-xl font-semibold text-center">
                    {isLogin ? "Sign In" : "Create Account"}
                    <span className="block text-sm font-normal text-muted-foreground mt-1">as {selectedRole === "coach" ? "Teacher" : "Student"}</span>
                </h2>

                {!isLogin && (
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input id="displayName" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
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

                <Button type="submit" className="w-full" disabled={emailLoading}>
                    {emailLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isLogin ? "Sign In" : "Create Account"}
                </Button>

                <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
            </form>
        );
    }

    return null;
}
