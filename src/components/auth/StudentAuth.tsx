import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRScanner } from "./QRScanner";
import { ClassCodeForm } from "./ClassCodeForm";
import { QrCode, Keyboard, Mail, ArrowLeft, Eye, EyeOff } from "lucide-react";

export function StudentAuth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [view, setView] = useState<"options" | "email" | "qr" | "code">("options");
    const [isProcessingQR, setIsProcessingQR] = useState(false);

    const navigate = useNavigate();
    const { toast } = useToast();

    const handleQRScan = async (qrData: string) => {
        setIsProcessingQR(true);
        try {
            const { data, error } = await supabase.rpc("validate_qr_token", { token: qrData }) as { data: any[], error: any };

            if (error || !data || (Array.isArray(data) && data.length === 0)) {
                toast({ title: "Invalid QR Code", description: "This QR code is invalid or has expired.", variant: "destructive" });
                setView("options");
                return;
            }

            // Handle the case where data might be an array or object depending on RPC definition
            const session = Array.isArray(data) ? data[0] : data;

            toast({ title: "Joined Class!", description: `Welcome to ${session?.session_name || 'Class'}` });
            navigate("/app");
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to process QR code.", variant: "destructive" });
        } finally {
            setIsProcessingQR(false);
            setView("options");
        }
    };

    const handleClassCodeSuccess = (sessionName: string) => {
        toast({ title: "Joined Class!", description: `Welcome to ${sessionName}` });
        navigate("/app");
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                // Strict Role Check
                if (data.session) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("role")
                        .eq("user_id", data.session.user.id)
                        .single();

                    if (profile?.role === "coach") {
                        // WRONG DOOR
                        await supabase.auth.signOut();
                        toast({
                            title: "Access Denied",
                            description: "This account is a Teacher account. Please log in from the Teacher page.",
                            variant: "destructive",
                        });
                        navigate("/login/coach");
                        return;
                    }
                    navigate("/app");
                }
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            display_name: displayName || email.split("@")[0],
                            role: "student", // STRICTLY FORCE STUDENT
                        },
                    },
                });
                if (error) throw error;

                if (data.session) {
                    toast({ title: "Account created!", description: "Welcome! Redirecting to app..." });
                    navigate("/app");
                } else {
                    toast({ title: "Check your email", description: "Confirmation link sent." });
                }
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (view === "qr") {
        return <QRScanner onScan={handleQRScan} onCancel={() => setView("options")} isProcessing={isProcessingQR} />;
    }

    if (view === "code") {
        return <ClassCodeForm onSuccess={handleClassCodeSuccess} onCancel={() => setView("options")} />;
    }

    if (view === "options") {
        return (
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={() => navigate("/login")}>
                    <ArrowLeft className="w-4 h-4" /> Back to Selection
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
                    <Button variant="outline" className="w-full h-14 justify-start gap-4 text-left" onClick={() => setView("code")}>
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

    return (
        <form onSubmit={handleEmailAuth} className="space-y-4">
            <Button type="button" variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={() => setView("options")}>
                <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <h2 className="text-xl font-semibold text-center">
                {isLogin ? "Student Sign In" : "Create Student Account"}
            </h2>

            {!isLogin && (
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="student@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
