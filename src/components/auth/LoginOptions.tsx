import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, AlertCircle } from "lucide-react";

interface LoginOptionsProps {
  role: "coach" | "student";
}

export function LoginOptions({ role }: LoginOptionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"options" | "email">("options");

  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const roleLabel = role === "coach" ? "Coach" : "Student";
  const roleColor = role === "coach" ? "blue" : "green";

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // CRITICAL: Pass role in data so database trigger can read it
          data: {
            role: role,
          },
          scopes: "profile email",
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }
      // OAuth redirects - won't reach here on success
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign up with role in metadata
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // CRITICAL: Pass role in data so database trigger can read it
            data: {
              role: role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`,
          },
        });

        if (signUpError) throw signUpError;

        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to complete sign up.",
        });
      } else {
        // Sign in - role should already be set from previous sign up
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Redirect based on role
        navigate(role === "coach" ? "/dashboard" : "/app", { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (view === "email") {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent"
          onClick={() => setView("options")}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {isSignUp ? "Create" : "Sign in to"} {roleLabel} Account
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Enter your details to get started" : "Welcome back!"}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
          </span>{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-primary hover:underline font-medium"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to role selection
      </Button>

      <div className="text-center">
        <div
          className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            roleColor === "blue"
              ? "bg-blue-100 text-blue-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          <span className="text-2xl font-bold">{roleLabel.charAt(0)}</span>
        </div>
        <h2 className="text-xl font-semibold">Continue as {roleLabel}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you'd like to sign in
        </p>
      </div>

      {/* Google Sign In */}
      <Button
        variant="outline"
        className="w-full h-12 gap-3"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
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
        )}
        Continue with Google
      </Button>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
          or
        </span>
      </div>

      {/* Email Sign In */}
      <Button
        variant="outline"
        className="w-full h-12 gap-3"
        onClick={() => setView("email")}
        disabled={loading}
      >
        <Mail className="w-5 h-5" />
        Continue with Email
      </Button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Troubleshooting */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            alert(
              "Trouble signing in?\n\n" +
                "1. Make sure popups are enabled for this site\n" +
                "2. Try using Chrome or Firefox\n" +
                "3. Clear your browser cache\n" +
                "4. If using an ad blocker, try disabling it"
            );
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Trouble signing in?
        </button>
      </div>
    </div>
  );
}
