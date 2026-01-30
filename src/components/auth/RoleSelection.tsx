import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { School, GraduationCap } from "lucide-react";

type Role = 'coach' | 'student';

export function RoleSelection() {
  const navigate = useNavigate();

  const handleRoleSelect = (role: Role) => {
    // Navigate to role-specific login page
    navigate(`/login/${role}`);
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
        >
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <School className="w-7 h-7" />
          </div>
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
        >
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="text-center">
            <span className="font-medium text-lg text-foreground block">Student</span>
            <span className="text-xs text-muted-foreground">Complete assignments</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
