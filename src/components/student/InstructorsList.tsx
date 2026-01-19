import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";

interface Instructor {
    id: string;
    instructor_id: string;
    created_at: string;
    profile?: {
        display_name: string;
        avatar_url?: string;
    };
}

interface InstructorsListProps {
    onSelectInstructor?: (instructorId: string | null) => void;
    selectedInstructorId?: string | null;
}

export function InstructorsList({ onSelectInstructor, selectedInstructorId }: InstructorsListProps) {
    const { user } = useAuth();
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchInstructors();
    }, [user]);

    const fetchInstructors = async () => {
        const { data, error } = await supabase
            .from("instructor_students" as any)
            .select(`
        id,
        instructor_id,
        created_at
      `)
            .eq("student_id", user!.id);

        if (data) {
            // Fetch instructor profiles
            const instructorIds = data.map((d: any) => d.instructor_id);
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, display_name, avatar_url")
                .in("user_id", instructorIds);

            const enrichedData = data.map((d: any) => ({
                ...d,
                profile: profiles?.find((p) => p.user_id === d.instructor_id),
            }));

            setInstructors(enrichedData);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (instructors.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                    <User className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-center">
                        No instructors yet. Join a class to get started!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-2">
            {/* All Instructors option */}
            <button
                onClick={() => onSelectInstructor?.(null)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${selectedInstructorId === null
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
            >
                <span className="font-medium">All Instructors</span>
                <Badge variant="secondary" className="ml-2">
                    {instructors.length}
                </Badge>
            </button>

            {/* Individual instructors */}
            {instructors.map((instructor) => (
                <button
                    key={instructor.id}
                    onClick={() => onSelectInstructor?.(instructor.instructor_id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 ${selectedInstructorId === instructor.instructor_id
                            ? "bg-primary/10 border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                            {instructor.profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                    </div>
                    <span className="font-medium">
                        {instructor.profile?.display_name || "Instructor"}
                    </span>
                </button>
            ))}
        </div>
    );
}
