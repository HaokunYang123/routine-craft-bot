import { Button } from "@/components/ui/button";
import { GraduationCap, School } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function RoleSelection() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center">I am a...</h2>
            <div className="grid grid-cols-2 gap-4">
                <Button
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5"
                    onClick={() => navigate("/login/coach")}
                >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <School className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-lg text-foreground">Teacher</span>
                </Button>
                <Button
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5"
                    onClick={() => navigate("/login/student")}
                >
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-lg text-foreground">Student</span>
                </Button>
            </div>
        </div>
    );
}
