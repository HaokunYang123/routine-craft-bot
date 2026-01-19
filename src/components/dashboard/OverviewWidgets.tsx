import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Users,
  BookOpen,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StudentStatus {
  id: string;
  name: string;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

interface OverviewWidgetsProps {
  students: StudentStatus[];
  totalClasses: number;
  totalStudents: number;
  totalTasks: number;
  completedTasks: number;
  overallCompletion: number;
}

export function OverviewWidgets({
  students,
  totalClasses,
  totalStudents,
  totalTasks,
  completedTasks,
  overallCompletion,
}: OverviewWidgetsProps) {
  // Filter students by status
  const { needsAttention, onTrack, moderate } = useMemo(() => {
    const needsAttention = students.filter((s) => s.completionRate < 50);
    const onTrack = students.filter((s) => s.completionRate >= 80);
    const moderate = students.filter(
      (s) => s.completionRate >= 50 && s.completionRate < 80
    );
    return { needsAttention, onTrack, moderate };
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          value={totalClasses}
          label="Classes"
          iconColor="text-btn-secondary"
          iconBg="bg-btn-secondary/20"
        />
        <StatCard
          icon={Users}
          value={totalStudents}
          label="Students"
          iconColor="text-btn-secondary"
          iconBg="bg-btn-secondary/20"
        />
        <StatCard
          icon={Target}
          value={`${completedTasks}/${totalTasks}`}
          label="Tasks Done"
          iconColor="text-cta-primary"
          iconBg="bg-cta-primary/20"
        />
        <StatCard
          icon={TrendingUp}
          value={`${overallCompletion}%`}
          label="Completion"
          iconColor="text-cta-primary"
          iconBg="bg-cta-primary/20"
          highlighted
        />
      </div>

      {/* Quick Status Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Needs Attention */}
        <Card className="border-urgent/30 bg-urgent/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-urgent/20">
                <AlertTriangle className="w-5 h-5 text-urgent" />
              </div>
              <span className="text-foreground">Needs Attention</span>
              <span className="ml-auto text-2xl font-bold text-urgent">
                {needsAttention.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                All students are on track!
              </p>
            ) : (
              <div className="space-y-3">
                {needsAttention.slice(0, 3).map((student) => (
                  <StudentStatusRow
                    key={student.id}
                    student={student}
                    variant="urgent"
                  />
                ))}
                {needsAttention.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{needsAttention.length - 3} more students behind
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* On Track */}
        <Card className="border-cta-primary/30 bg-cta-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-cta-primary/20">
                <CheckCircle2 className="w-5 h-5 text-cta-primary" />
              </div>
              <span className="text-foreground">On Track</span>
              <span className="ml-auto text-2xl font-bold text-cta-primary">
                {onTrack.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onTrack.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No students at 80%+ yet
              </p>
            ) : (
              <div className="space-y-3">
                {onTrack.slice(0, 3).map((student) => (
                  <StudentStatusRow
                    key={student.id}
                    student={student}
                    variant="success"
                  />
                ))}
                {onTrack.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{onTrack.length - 3} more students excelling
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Highlights - AI Summary Placeholder */}
      <Card className="border-btn-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-btn-secondary/20">
              <Sparkles className="w-5 h-5 text-btn-secondary" />
            </div>
            <span className="text-foreground">Weekly Highlights</span>
            <span className="ml-auto text-xs bg-btn-secondary/20 text-btn-secondary px-2 py-1 rounded-full">
              AI Summary
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {totalStudents === 0 ? (
                "Add students to your classes to see AI-generated weekly summaries of their progress."
              ) : totalTasks === 0 ? (
                "Assign tasks to your students to generate weekly progress summaries."
              ) : (
                <>
                  <span className="text-foreground font-medium">This week: </span>
                  {overallCompletion >= 80 ? (
                    `Great progress! ${onTrack.length} students are exceeding expectations with ${overallCompletion}% overall completion.`
                  ) : overallCompletion >= 50 ? (
                    `Moderate progress with ${overallCompletion}% completion. ${needsAttention.length} students may need extra support.`
                  ) : (
                    `${needsAttention.length} students need attention. Consider reaching out to those below 50% completion.`
                  )}
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  iconColor: string;
  iconBg: string;
  highlighted?: boolean;
}

function StatCard({
  icon: Icon,
  value,
  label,
  iconColor,
  iconBg,
  highlighted,
}: StatCardProps) {
  return (
    <Card className={cn(highlighted && "border-cta-primary/30 bg-cta-primary/5")}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StudentStatusRowProps {
  student: StudentStatus;
  variant: "urgent" | "success" | "moderate";
}

function StudentStatusRow({ student, variant }: StudentStatusRowProps) {
  const colorClasses = {
    urgent: "bg-urgent",
    success: "bg-cta-primary",
    moderate: "bg-yellow-500",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {student.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Progress
            value={student.completionRate}
            className="h-1.5 flex-1"
          />
          <span
            className={cn(
              "text-xs font-medium",
              variant === "urgent" && "text-urgent",
              variant === "success" && "text-cta-primary",
              variant === "moderate" && "text-yellow-500"
            )}
          >
            {student.completionRate}%
          </span>
        </div>
      </div>
    </div>
  );
}
