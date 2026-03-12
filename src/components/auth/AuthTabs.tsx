import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, School, GraduationCap, LogIn } from "lucide-react";

type AuthIntent = "signup" | "login";
type Role = "coach" | "student" | "parent";
type AuthView = "tabs" | "forgot_password" | "reset_password";
type AuthTabsProps = {
  forceResetMode?: boolean;
  emailConfirmedMessage?: string | null;
};
const OAUTH_LOADING_TIMEOUT_MS = 20000;
const LOGIN_LOCKOUT_MS = 60000;
const MAX_LOGIN_FAILURES = 5;
const MIN_PASSWORD_LENGTH = 8;
const PENDING_JOIN_CODE_KEY = "pending_join_code";
const PENDING_JOIN_TOKEN_KEY = "pending_join_token";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeRole(value: string | null | undefined): Role | null {
  if (value === "coach" || value === "student" || value === "parent") {
    return value;
  }
  return null;
}

function mapSignupError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("user already")) {
    return "Email already registered";
  }
  if (lower.includes("password")) {
    return "Password too short";
  }
  return "Could not sign up. Please try again.";
}

function mapLoginError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid login credentials";
  }
  if (lower.includes("email not confirmed")) {
    return "Email not confirmed";
  }
  return "Could not log in. Please try again.";
}

function mapPasswordResetError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("password")) {
    return "Password must be at least 8 characters.";
  }
  if (lower.includes("session") || lower.includes("token")) {
    return "Your reset link is invalid or expired. Please request a new one.";
  }
  return "Could not update your password. Please try again.";
}

export function AuthTabs({ forceResetMode = false, emailConfirmedMessage = null }: AuthTabsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const defaultTab: "signup" | "login" =
    searchParams.get("signup") === "true"
      ? "signup"
      : location.pathname === "/auth"
        ? "login"
        : "signup";
  const [activeTab, setActiveTab] = useState<"signup" | "login">(defaultTab);
  const [authView, setAuthView] = useState<AuthView>(forceResetMode ? "reset_password" : "tabs");
  const [loading, setLoading] = useState<string | null>(null); // Track which button is loading
  const loadingTimeoutRef = useRef<number | null>(null);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupRole, setSignupRole] = useState<Role | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [loginLockoutUntil, setLoginLockoutUntil] = useState<number | null>(null);
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const isLoginLocked = loginLockoutUntil !== null && Date.now() < loginLockoutUntil;

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const startLoadingTimeout = () => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = window.setTimeout(() => {
      setLoading(null);
      toast({
        title: "Sign-in timed out",
        description: "If you closed the Google sign-in window, please try again.",
        variant: "destructive",
      });
    }, OAUTH_LOADING_TIMEOUT_MS);
  };

  useEffect(() => {
    setLoading(null);
    clearLoadingTimeout();

    const handlePageShow = () => {
      setLoading(null);
      clearLoadingTimeout();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      clearLoadingTimeout();
      setLoading(null);
    };
  }, []);

  useEffect(() => {
    if (!loginLockoutUntil) {
      setLockoutSecondsRemaining(0);
      return;
    }

    const tick = () => {
      const remainingMs = loginLockoutUntil - Date.now();
      if (remainingMs <= 0) {
        setLoginLockoutUntil(null);
        setLockoutSecondsRemaining(0);
        return;
      }
      setLockoutSecondsRemaining(Math.ceil(remainingMs / 1000));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [loginLockoutUntil]);

  useEffect(() => {
    if (!forceResetMode) {
      return;
    }
    setActiveTab("login");
    setAuthView("reset_password");
    setForgotError(null);
    setForgotSuccess(null);
    setLoginError(null);
  }, [forceResetMode]);

  useEffect(() => {
    if (!emailConfirmedMessage) {
      return;
    }
    setAuthView("tabs");
    setActiveTab("login");
  }, [emailConfirmedMessage]);

  useEffect(() => {
    if (forceResetMode || authView !== "tabs") {
      return;
    }

    setActiveTab(defaultTab);
  }, [authView, defaultTab, forceResetMode]);

  const handleSignUpWithGoogle = async (role: Role) => {
    setLoading(`signup-${role}`);
    startLoadingTimeout();

    try {
      // Store role in localStorage as backup (URL params can be lost in OAuth redirect)
      localStorage.setItem('pendingAuthRole', role);
      localStorage.setItem('pendingAuthIntent', 'signup');

      const redirectTo = `${window.location.origin}/auth/callback?intent=signup&role=${role}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (data?.url) window.location.assign(data.url);
      if (error) throw error;
    } catch (err: unknown) {
      clearLoadingTimeout();
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

  const handleLoginWithGoogle = async () => {
    setLoading("login-google");
    startLoadingTimeout();

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
      clearLoadingTimeout();
      toast({
        title: "Login Failed",
        description: err instanceof Error ? err.message : "Could not start login. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const handleEmailSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading !== null) return;

    if (!signupRole) {
      setSignupSuccess(null);
      setSignupError("Please select Coach, Student, or Parent");
      return;
    }

    const email = signupEmail.trim();
    if (!isValidEmail(email)) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (signupPassword.length < MIN_PASSWORD_LENGTH) {
      setSignupError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setSignupError(null);
    setSignupSuccess(null);
    setLoading("signup-email");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { role: signupRole },
        },
      });

      if (error) {
        setSignupError(mapSignupError(error.message));
        return;
      }

      if (data.user?.identities?.length === 0) {
        setSignupError("An account with this email already exists. Try signing in with Google.");
        return;
      }

      setSignupSuccess("Check your email to confirm your account. Please check your spam folder too.");
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : "Could not sign up. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading !== null || isLoginLocked) return;

    const email = loginEmail.trim();
    if (!isValidEmail(email)) {
      setLoginError("Please enter a valid email address.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Please enter your password.");
      return;
    }

    setLoginError(null);
    setLoading("login-email");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error || !data.user) {
        const message = mapLoginError(error?.message || "Could not log in.");
        const nextAttemptCount = failedLoginAttempts + 1;

        if (nextAttemptCount >= MAX_LOGIN_FAILURES) {
          setFailedLoginAttempts(0);
          setLoginLockoutUntil(Date.now() + LOGIN_LOCKOUT_MS);
          setLoginError(null);
        } else {
          setFailedLoginAttempts(nextAttemptCount);
          setLoginError(message);
        }
        return;
      }

      setFailedLoginAttempts(0);
      setLoginLockoutUntil(null);
      setLoginError(null);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      const role = normalizeRole(profileData?.role);

      if (profileError || !role) {
        navigate("/auth/callback?intent=login", { replace: true });
        return;
      }

      const pendingJoinCode = sessionStorage.getItem(PENDING_JOIN_CODE_KEY);
      if (pendingJoinCode) {
        sessionStorage.removeItem(PENDING_JOIN_CODE_KEY);
        navigate(`/join?code=${encodeURIComponent(pendingJoinCode)}`, { replace: true });
        return;
      }

      const pendingJoinToken = sessionStorage.getItem(PENDING_JOIN_TOKEN_KEY);
      if (pendingJoinToken) {
        sessionStorage.removeItem(PENDING_JOIN_TOKEN_KEY);
        navigate(`/join?token=${encodeURIComponent(pendingJoinToken)}`, { replace: true });
        return;
      }

      if (role === "coach") {
        navigate("/dashboard", { replace: true });
      } else if (role === "student") {
        navigate("/app", { replace: true });
      } else {
        navigate("/parent", { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? mapLoginError(err.message) : "Could not log in. Please try again.";
      const nextAttemptCount = failedLoginAttempts + 1;
      if (nextAttemptCount >= MAX_LOGIN_FAILURES) {
        setFailedLoginAttempts(0);
        setLoginLockoutUntil(Date.now() + LOGIN_LOCKOUT_MS);
        setLoginError(null);
      } else {
        setFailedLoginAttempts(nextAttemptCount);
        setLoginError(message);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRequestPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading !== null) return;

    const email = forgotEmail.trim();
    if (!isValidEmail(email)) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    setForgotError(null);
    setForgotSuccess(null);
    setLoading("forgot-password");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        setForgotError(error.message || "Could not send reset email. Please try again.");
        return;
      }

      setForgotSuccess("Check your email for a reset link. Please check your spam folder too.");
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Could not send reset email. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading !== null) return;

    if (resetPassword.length < MIN_PASSWORD_LENGTH) {
      setResetError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetError(null);
    setResetSuccess(null);
    setLoading("reset-password");

    try {
      const { error } = await supabase.auth.updateUser({ password: resetPassword });
      if (error) {
        setResetError(mapPasswordResetError(error.message));
        return;
      }

      await supabase.auth.signOut();
      setResetSuccess("Password updated. Please log in with your new password.");
      toast({
        title: "Password updated",
        description: "Please log in with your new password.",
      });
      setResetPassword("");
      setResetConfirmPassword("");
      navigate("/login", { replace: true });
      setAuthView("tabs");
      setActiveTab("login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update your password. Please try again.";
      setResetError(mapPasswordResetError(message));
    } finally {
      setLoading(null);
    }
  };

  const handleOpenForgotPassword = () => {
    setForgotEmail(loginEmail.trim());
    setForgotError(null);
    setForgotSuccess(null);
    setResetError(null);
    setResetSuccess(null);
    setAuthView("forgot_password");
  };

  const handleBackToLogin = async () => {
    setForgotError(null);
    setForgotSuccess(null);
    setResetError(null);
    setResetSuccess(null);
    setResetPassword("");
    setResetConfirmPassword("");
    setAuthView("tabs");
    setActiveTab("login");

    if (forceResetMode) {
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    }
  };

  const googleSignupDisabled = loading !== null;
  const googleLoginDisabled = loading !== null;
  const emailSignupDisabled = loading !== null;
  const emailLoginDisabled = loading !== null || isLoginLocked;
  const forgotPasswordDisabled = loading !== null;
  const resetPasswordDisabled = loading !== null;

  if (authView === "forgot_password") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">Reset your password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we will send you a reset link.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleRequestPasswordReset}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full"
              disabled={forgotPasswordDisabled}
            />
          </div>

          {forgotError && <p className="text-sm text-destructive">{forgotError}</p>}
          {forgotSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{forgotSuccess}</p>}

          <Button type="submit" className="w-full" disabled={forgotPasswordDisabled}>
            {loading === "forgot-password" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <Button variant="ghost" className="w-full" onClick={() => void handleBackToLogin()} disabled={forgotPasswordDisabled}>
          Back to login
        </Button>
      </div>
    );
  }

  if (authView === "reset_password") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">Set a new password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter and confirm your new password to finish reset.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleUpdatePassword}>
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              placeholder="Enter a new password"
              autoComplete="new-password"
              className="w-full"
              disabled={resetPasswordDisabled}
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Confirm Password</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              value={resetConfirmPassword}
              onChange={(event) => setResetConfirmPassword(event.target.value)}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              className="w-full"
              disabled={resetPasswordDisabled}
            />
          </div>

          {resetError && <p className="text-sm text-destructive">{resetError}</p>}
          {resetSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{resetSuccess}</p>}

          <Button type="submit" className="w-full" disabled={resetPasswordDisabled}>
            {loading === "reset-password" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating password...
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>

        <Button variant="ghost" className="w-full" onClick={() => void handleBackToLogin()} disabled={resetPasswordDisabled}>
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signup" | "login")} className="w-full">
      <TabsList className="mb-6 grid h-10 w-full grid-cols-2 overflow-hidden rounded-md p-0">
        <TabsTrigger
          value="signup"
          className="h-full w-full rounded-none text-base first:rounded-l-md last:rounded-r-md"
        >
          Sign Up
        </TabsTrigger>
        <TabsTrigger
          value="login"
          className="h-full w-full rounded-none text-base first:rounded-l-md last:rounded-r-md"
        >
          Log In
        </TabsTrigger>
      </TabsList>
      {emailConfirmedMessage && (
        <p className="mb-4 text-center text-sm text-emerald-600 dark:text-emerald-400">
          {emailConfirmedMessage}
        </p>
      )}

      {/* Sign Up Tab */}
      <TabsContent value="signup" className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign up with email and password</p>
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignUp}>
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setSignupRole("coach");
                  setSignupError(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  signupRole === "coach"
                    ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                disabled={emailSignupDisabled}
              >
                Coach
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupRole("student");
                  setSignupError(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  signupRole === "student"
                    ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                disabled={emailSignupDisabled}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupRole("parent");
                  setSignupError(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  signupRole === "parent"
                    ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                disabled={emailSignupDisabled}
              >
                Parent
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full"
              disabled={emailSignupDisabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              className="w-full"
              disabled={emailSignupDisabled}
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-confirm-password">Confirm Password</Label>
            <Input
              id="signup-confirm-password"
              type="password"
              value={signupConfirmPassword}
              onChange={(event) => setSignupConfirmPassword(event.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className="w-full"
              disabled={emailSignupDisabled}
            />
          </div>

          {signupError && <p className="text-sm text-destructive">{signupError}</p>}
          {signupSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{signupSuccess}</p>}

          <Button type="submit" className="w-full" disabled={emailSignupDisabled}>
            {loading === "signup-email" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing Up...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Continue with Google</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Sign Up as Coach */}
          <Button
            variant="outline"
            className="h-36 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            onClick={() => handleSignUpWithGoogle("coach")}
            disabled={googleSignupDisabled}
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
            onClick={() => handleSignUpWithGoogle("student")}
            disabled={googleSignupDisabled}
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
          <p className="text-sm text-muted-foreground mt-1">Log in with email and password</p>
        </div>

        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full"
              disabled={emailLoginDisabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full"
              disabled={emailLoginDisabled}
            />
            <button
              type="button"
              onClick={handleOpenForgotPassword}
              className="text-xs text-primary hover:underline"
              disabled={loading !== null}
            >
              Forgot password?
            </button>
          </div>

          {loginError && <p className="text-sm text-destructive">{loginError}</p>}
          {isLoginLocked && (
            <p className="text-sm text-destructive">
              Too many failed attempts. Please wait a few minutes.
              {lockoutSecondsRemaining > 0 ? ` (${lockoutSecondsRemaining}s)` : ""}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={emailLoginDisabled}>
            {loading === "login-email" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging In...
              </>
            ) : (
              "Log In"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-14 gap-3 text-base"
          onClick={handleLoginWithGoogle}
          disabled={googleLoginDisabled}
        >
          {loading === "login-google" ? (
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
