import { useState } from "react";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { Button } from "@/components/ui/button";
import { School, GraduationCap, Loader2, AlertCircle } from "lucide-react";

type Role = 'coach' | 'student';

export function RoleSelection() {
  const { signInWithGoogle, loading, error, clearError } = useGoogleAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleRoleSelect = async (role: Role) => {
    setSelectedRole(role);
    clearError();
    await signInWithGoogle(role);
    // If we get here without redirect, OAuth popup was closed
    setSelectedRole(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">I am a...</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Coach Card */}
        <Button
          variant="outline"
          className="h-36 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 relative"
          onClick={() => handleRoleSelect('coach')}
          disabled={loading}
        >
          {selectedRole === 'coach' && loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <School className="w-7 h-7" />
            </div>
          )}
          <div className="text-center">
            <span className="font-medium text-lg text-foreground block">Coach</span>
            <span className="text-xs text-muted-foreground">Manage students & tasks</span>
          </div>
        </Button>

        {/* Student Card */}
        <Button
          variant="outline"
          className="h-36 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 relative"
          onClick={() => handleRoleSelect('student')}
          disabled={loading}
        >
          {selectedRole === 'student' && loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <GraduationCap className="w-7 h-7" />
            </div>
          )}
          <div className="text-center">
            <span className="font-medium text-lg text-foreground block">Student</span>
            <span className="text-xs text-muted-foreground">Complete assignments</span>
          </div>
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Troubleshooting link */}
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
