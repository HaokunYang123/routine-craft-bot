import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, School, GraduationCap, LogIn } from "lucide-react";

type AuthIntent = "signup" | "login";
type Role = "coach" | "student";

export function AuthTabs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null); // Track which button is loading

  const handleSignUp = async (role: Role) => {
    setLoading(`signup-${role}`);

    try {
      // Store role in localStorage as backup (URL params can be lost in OAuth redirect)
      localStorage.setItem('pendingAuthRole', role);
      localStorage.setItem('pendingAuthIntent', 'signup');

      const redirectTo = `${window.location.origin}/auth/callback?intent=signup&role=coach`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      console.log("oauth error:", error);
      console.log("oauth url:", data?.url);
      console.log(
        "storage keys after signIn:",
        Object.keys(localStorage).filter(
          (k) => k.includes("sb-") || k.includes("verifier") || k.includes("pkce")
        )
      );

      if (data?.url) window.location.assign(data.url);
      if (error) throw error;
    } catch (err: unknown) {
      // Clear stored auth data on error
      localStorage.removeItem('pendingAuthRole');
      localStorage.removeItem('pendingAuthIntent');
      toast({
        title: "Sign Up Failed",
        description: err instanceof Error ? err.message : "Could not start sign up. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const handleLogin = async () => {
    setLoading("login");

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // No role - just intent to login
          data: {
            intent: "login" as AuthIntent,
          },
          scopes: "profile email",
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account", // Let them pick account without forcing consent
          },
        },
      });

      if (error) throw error;
      // OAuth redirects - won't reach here on success
    } catch (err: unknown) {
      toast({
        title: "Login Failed",
        description: err instanceof Error ? err.message : "Could not start login. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <Tabs defaultValue="signup" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signup" className="text-base">Sign Up</TabsTrigger>
        <TabsTrigger value="login" className="text-base">Log In</TabsTrigger>
      </TabsList>

      {/* Sign Up Tab */}
      <TabsContent value="signup" className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose your role to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sign Up as Coach */}
          <Button
            variant="outline"
            className="h-36 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            onClick={() => handleSignUp("coach")}
            disabled={loading !== null}
          >
            {loading === "signup-coach" ? (
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <School className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <span className="font-medium text-base text-foreground block">Coach</span>
                  <span className="text-xs text-muted-foreground">Manage students & tasks</span>
                </div>
              </>
            )}
          </Button>

          {/* Sign Up as Student */}
          <Button
            variant="outline"
            className="h-36 flex flex-col items-center justify-center gap-3 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
            onClick={() => handleSignUp("student")}
            disabled={loading !== null}
          >
            {loading === "signup-student" ? (
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <span className="font-medium text-base text-foreground block">Student</span>
                  <span className="text-xs text-muted-foreground">Complete assignments</span>
                </div>
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Already have an account? Switch to the <span className="font-medium">Log In</span> tab.
        </p>
      </TabsContent>

      {/* Log In Tab */}
      <TabsContent value="login" className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your existing account</p>
        </div>

        <Button
          variant="outline"
          className="w-full h-14 gap-3 text-base"
          onClick={handleLogin}
          disabled={loading !== null}
        >
          {loading === "login" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
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
              <LogIn className="w-4 h-4" />
              Log in with Google
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Don't have an account? Switch to the <span className="font-medium">Sign Up</span> tab.
        </p>
      </TabsContent>
    </Tabs>
  );
}
