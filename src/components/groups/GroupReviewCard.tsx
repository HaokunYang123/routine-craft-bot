import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GroupMember {
  id: string;
  name: string;
  completedToday: number;
  totalToday: number;
  hasNote?: boolean;
}

export interface GroupData {
  id: string;
  name: string;
  color: string;
  icon?: string;
  memberCount: number;
  completedToday: number;
  totalToday: number;
  members?: GroupMember[];
  flaggedMembers?: number;
}

interface GroupReviewCardProps {
  group: GroupData;
  onExpand?: (groupId: string) => void;
  onMemberClick?: (memberId: string) => void;
  expanded?: boolean;
}

export function GroupReviewCard({
  group,
  onExpand,
  onMemberClick,
  expanded = false,
}: GroupReviewCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(expanded);
  const completionRate = group.totalToday > 0
    ? Math.round((group.completedToday / group.totalToday) * 100)
    : 0;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onExpand?.(group.id);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/group/${group.id}`);
  };

  return (
    <Card
      className={cn(
        "border-l-4 transition-all hover:shadow-md cursor-pointer",
        isExpanded && "ring-2 ring-primary/20"
      )}
      style={{ borderLeftColor: group.color }}
    >
      <CardHeader className="pb-2" onClick={handleToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${group.color}20` }}
            >
              <Users className="w-5 h-5" style={{ color: group.color }} />
            </div>
            <div>
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {group.memberCount} members
                </span>
                {group.flaggedMembers && group.flaggedMembers > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {group.flaggedMembers} need attention
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewDetails}
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Details
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's Progress</span>
            <span className="font-medium">
              {group.completedToday} / {group.totalToday} tasks
            </span>
          </div>
          <Progress
            value={completionRate}
            className="h-2"
            style={{
              // @ts-ignore - custom CSS variable
              "--progress-foreground": group.color
            } as React.CSSProperties}
          />
          <div className="text-right text-xs text-muted-foreground">
            {completionRate}% complete
          </div>
        </div>

        {/* Expanded Member List */}
        {isExpanded && group.members && group.members.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Member Progress
            </h4>
            {group.members.map((member) => {
              const memberRate = member.totalToday > 0
                ? Math.round((member.completedToday / member.totalToday) * 100)
                : 0;
              const isComplete = memberRate === 100 && member.totalToday > 0;
              const isBehind = memberRate < 50 && member.totalToday > 0;

              return (
                <div
                  key={member.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMemberClick?.(member.id);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50 cursor-pointer",
                    isBehind && "bg-destructive/5",
                    isComplete && "bg-success/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      isComplete ? "bg-success text-white" :
                      isBehind ? "bg-destructive text-white" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.completedToday}/{member.totalToday} tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.hasNote && (
                      <Badge variant="outline" className="text-xs">
                        Note
                      </Badge>
                    )}
                    {isComplete && (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    )}
                    {isBehind && (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      isComplete && "text-success",
                      isBehind && "text-destructive"
                    )}>
                      {memberRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
