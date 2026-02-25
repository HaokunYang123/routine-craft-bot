import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimitCooldown } from "@/hooks/useRateLimitCooldown";
import { supabase } from "@/integrations/supabase/client";
import { RateLimitError, callGemini } from "@/lib/gemini";

type ViewState = "default" | "generating" | "result" | "fallback" | "error" | "empty";

type GroupOption = {
  id: string;
  name: string;
};

type StudentResult = {
  studentName: string;
  totalTasks: number;
  completed: number;
  missed: number;
  excused: number;
  pending: number;
};

type DateRange = {
  start: string;
  end: string;
};

type SummaryTone = "encouraging" | "direct" | "detailed";

type RawStats = {
  totalTasks: number;
  completionRate: number;
  topPerformer: string;
  studentBreakdown: StudentResult[];
};

type AggregatedSummary = {
  studentResults: StudentResult[];
  dateRange: DateRange;
  rawStats: RawStats;
};

type SummaryModelResponse = {
  summary?: unknown;
  highlights?: unknown;
  concerns?: unknown;
  stats?: {
    totalTasks?: unknown;
    completionRate?: unknown;
    topPerformer?: unknown;
  };
};

type SummaryResult = {
  summary: string;
  highlights: string[];
  concerns: string[];
  stats: {
    totalTasks: number;
    completionRate: number;
    topPerformer: string;
  };
};

const NO_GROUP_SELECTED = "none";
const MAX_RANGE_DAYS = 90;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TONE_OPTIONS: Array<{ label: string; value: SummaryTone }> = [
  { label: "Encouraging", value: "encouraging" },
  { label: "Direct", value: "direct" },
  { label: "Detailed", value: "detailed" },
];

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSevenDayRange = (): DateRange => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  return {
    start: formatLocalDate(sevenDaysAgo),
    end: formatLocalDate(today),
  };
};

const parseDateInput = (value: string): Date | null => {
  if (!DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const parseString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => parseString(item))
    .filter((item) => item.length > 0)
    .slice(0, 3);
};

const parseNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
};

const normalizeSummaryResponse = (
  response: SummaryModelResponse,
  fallbackStats: RawStats,
): SummaryResult => {
  const summary = parseString(response.summary) ||
    "Here is your weekly snapshot based on recorded task activity.";

  return {
    summary,
    highlights: parseStringArray(response.highlights),
    concerns: parseStringArray(response.concerns),
    stats: {
      totalTasks: Math.max(0, parseNumber(response.stats?.totalTasks, fallbackStats.totalTasks)),
      completionRate: Math.max(0, parseNumber(response.stats?.completionRate, fallbackStats.completionRate)),
      topPerformer: parseString(response.stats?.topPerformer) || fallbackStats.topPerformer,
    },
  };
};

export function WeeklySummary() {
  const { user } = useAuth();
  const defaultDateRange = useMemo(getSevenDayRange, []);

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(NO_GROUP_SELECTED);
  const [startDate, setStartDate] = useState<string>(defaultDateRange.start);
  const [endDate, setEndDate] = useState<string>(defaultDateRange.end);
  const [tone, setTone] = useState<SummaryTone>("encouraging");

  const [viewState, setViewState] = useState<ViewState>("default");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiUnavailableNote, setAiUnavailableNote] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [rawStats, setRawStats] = useState<RawStats | null>(null);
  const [studentBreakdown, setStudentBreakdown] = useState<StudentResult[]>([]);
  const { isCoolingDown, startCooldown, cooldownLabel } = useRateLimitCooldown();

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    const loadGroups = async () => {
      setGroupsLoading(true);
      setGroupsError(null);

      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("coach_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        setGroupsError("Could not load groups");
        setGroups([]);
      } else {
        setGroups((data ?? []).map((group) => ({ id: group.id, name: group.name })));
      }

      setGroupsLoading(false);
    };

    void loadGroups();
  }, [user]);

  const selectedGroupName = useMemo(() => {
    return groups.find((group) => group.id === selectedGroupId)?.name ?? "Group";
  }, [groups, selectedGroupId]);

  const resetViewState = (clearSelection: boolean) => {
    setViewState("default");
    setErrorMessage(null);
    setAiUnavailableNote(null);
    setSummaryResult(null);
    setRawStats(null);
    setStudentBreakdown([]);
    if (clearSelection) {
      setSelectedGroupId(NO_GROUP_SELECTED);
    }
  };

  const dateRangeError = useMemo(() => {
    if (!startDate || !endDate) return "Start date and end date are required.";
    const parsedStart = parseDateInput(startDate);
    const parsedEnd = parseDateInput(endDate);
    if (!parsedStart || !parsedEnd) return "Dates must use YYYY-MM-DD format.";
    if (parsedStart > parsedEnd) return "Start date must be before or equal to end date.";
    const diffDays = Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 86_400_000) + 1;
    if (diffDays > MAX_RANGE_DAYS) return "Date range cannot exceed 90 days.";
    return null;
  }, [startDate, endDate]);

  const fetchAndAggregate = async (groupId: string, dateRange: DateRange): Promise<AggregatedSummary> => {

    const { data: memberRows, error: membersError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (membersError) {
      throw new Error("Could not load group members");
    }

    const memberIds = Array.from(
      new Set((memberRows ?? []).map((row) => row.user_id).filter((id): id is string => Boolean(id))),
    );

    if (memberIds.length === 0) {
      return {
        studentResults: [],
        dateRange,
        rawStats: {
          totalTasks: 0,
          completionRate: 0,
          topPerformer: "N/A",
          studentBreakdown: [],
        },
      };
    }

    const [taskResponse, profileResponse] = await Promise.all([
      supabase
        .from("task_instances")
        .select("assignee_id, status")
        .in("assignee_id", memberIds)
        .gte("scheduled_date", dateRange.start)
        .lte("scheduled_date", dateRange.end),
      supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", memberIds),
    ]);

    if (taskResponse.error || profileResponse.error) {
      throw new Error("Could not load task data");
    }

    const tasks = taskResponse.data ?? [];
    const profiles = profileResponse.data ?? [];

    const nameByUserId = new Map<string, string>();
    profiles.forEach((profile, index) => {
      const fallbackName = `Student ${index + 1}`;
      nameByUserId.set(
        profile.user_id,
        profile.display_name?.trim() || profile.email?.trim() || fallbackName,
      );
    });

    const breakdownByUserId = new Map<string, StudentResult>();
    memberIds.forEach((memberId, index) => {
      breakdownByUserId.set(memberId, {
        studentName: nameByUserId.get(memberId) || `Student ${index + 1}`,
        totalTasks: 0,
        completed: 0,
        missed: 0,
        excused: 0,
        pending: 0,
      });
    });

    tasks.forEach((task) => {
      const row = breakdownByUserId.get(task.assignee_id);
      if (!row) return;

      const normalizedStatus = (task.status || "pending").toLowerCase();
      if (normalizedStatus === "completed") {
        row.completed += 1;
      } else if (normalizedStatus === "missed") {
        row.missed += 1;
      } else if (normalizedStatus === "excused") {
        row.excused += 1;
      } else {
        row.pending += 1;
      }
      row.totalTasks += 1;
    });

    const studentResults = Array.from(breakdownByUserId.values())
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
    const totalTasks = studentResults.reduce((sum, row) => sum + row.totalTasks, 0);
    const totalCompleted = studentResults.reduce((sum, row) => sum + row.completed, 0);
    const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    let topPerformer = "N/A";
    if (totalCompleted > 0) {
      const ranked = studentResults
        .filter((row) => row.totalTasks > 0)
        .slice()
        .sort((a, b) => {
          const aRate = a.totalTasks > 0 ? a.completed / a.totalTasks : 0;
          const bRate = b.totalTasks > 0 ? b.completed / b.totalTasks : 0;
          if (bRate !== aRate) return bRate - aRate;
          if (b.completed !== a.completed) return b.completed - a.completed;
          return a.studentName.localeCompare(b.studentName);
        });
      topPerformer = ranked[0]?.studentName || "N/A";
    }

    return {
      studentResults,
      dateRange,
      rawStats: {
        totalTasks,
        completionRate,
        topPerformer,
        studentBreakdown: studentResults,
      },
    };
  };

  const handleGenerate = async () => {
    if (!selectedGroupId || selectedGroupId === NO_GROUP_SELECTED || dateRangeError) return;

    setViewState("generating");
    setErrorMessage(null);
    setAiUnavailableNote(null);
    setSummaryResult(null);

    let aggregatedData: AggregatedSummary;
    try {
      aggregatedData = await fetchAndAggregate(selectedGroupId, { start: startDate, end: endDate });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load summary data";
      setErrorMessage(message);
      setViewState("error");
      return;
    }

    setRawStats(aggregatedData.rawStats);
    setStudentBreakdown(aggregatedData.studentResults);

    if (aggregatedData.rawStats.totalTasks === 0) {
      setViewState("empty");
      return;
    }

    try {
      const result = await callGemini<SummaryModelResponse>({
        action: "weekly_summary",
        payload: {
          groupName: selectedGroupName,
          start_date: startDate,
          end_date: endDate,
          tone,
          summaryData: {
            studentResults: aggregatedData.studentResults,
            dateRange: aggregatedData.dateRange,
          },
        },
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "AI summary unavailable");
      }

      setSummaryResult(normalizeSummaryResponse(result.data, aggregatedData.rawStats));
      setViewState("result");
    } catch (error) {
      if (error instanceof RateLimitError) {
        startCooldown(error.retryAfterSeconds);
        setViewState("default");
        return;
      }

      setAiUnavailableNote("AI summary unavailable, showing raw stats");
      setViewState("fallback");
    }
  };

  const isGenerateDisabled =
    groupsLoading ||
    selectedGroupId === NO_GROUP_SELECTED ||
    groups.length === 0 ||
    isCoolingDown ||
    Boolean(dateRangeError);

  const displayedStats = summaryResult?.stats ?? rawStats;

  return (
    <Card className="coach-theme dark border-border bg-card/80 text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cta-primary" />
          Weekly Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewState === "default" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="weekly-summary-group">Select Group</Label>
              <Select
                value={selectedGroupId === NO_GROUP_SELECTED ? undefined : selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger id="weekly-summary-group" className="bg-card border-border">
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {groupsError && (
                <p className="text-sm text-destructive">{groupsError}</p>
              )}
              {!groupsLoading && !groupsError && groups.length === 0 && (
                <p className="text-sm text-muted-foreground">No groups available yet.</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weekly-summary-start-date">Start Date</Label>
                <input
                  id="weekly-summary-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekly-summary-end-date">End Date</Label>
                <input
                  id="weekly-summary-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                />
              </div>
            </div>

            {dateRangeError && (
              <p className="text-sm text-destructive">{dateRangeError}</p>
            )}

            <div className="space-y-2">
              <Label>Tone</Label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((option) => {
                  const isSelected = tone === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      onClick={() => setTone(option.value)}
                      className={isSelected
                        ? "border-cta-primary/60 bg-cta-primary/15 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              className="bg-cta-primary hover:bg-cta-hover text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isCoolingDown ? "Cooldown active" : "Generate Summary"}
            </Button>

            {isCoolingDown && (
              <p className="text-sm text-muted-foreground">
                Limit reached. Try again in {cooldownLabel}.
              </p>
            )}
          </>
        )}

        {viewState === "generating" && (
          <div className="rounded-lg border border-border bg-muted/20 p-6 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Generating weekly summary...</p>
          </div>
        )}

        {viewState === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={() => resetViewState(false)}>
              Try Again
            </Button>
          </div>
        )}

        {viewState === "empty" && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              No activity recorded from {startDate} to {endDate} for this group.
            </p>
            <Button variant="outline" onClick={() => resetViewState(true)}>
              Generate Another
            </Button>
          </div>
        )}

        {(viewState === "result" || viewState === "fallback") && displayedStats && (
          <div className="space-y-4">
            {viewState === "result" && summaryResult && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm text-foreground leading-relaxed">{summaryResult.summary}</p>

                {summaryResult.highlights.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Highlights</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {summaryResult.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summaryResult.concerns.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Concerns</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {summaryResult.concerns.map((concern) => (
                        <li key={concern}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {viewState === "fallback" && aiUnavailableNote && (
              <p className="text-sm text-muted-foreground">{aiUnavailableNote}</p>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card className="border-border bg-card/70">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-semibold text-foreground">{displayedStats.totalTasks}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card/70">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-semibold text-foreground">{displayedStats.completionRate}%</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card/70">
                <CardContent className="pt-6 text-center">
                  <p className="text-xs text-muted-foreground">Top Performer</p>
                  <p className="text-base font-semibold text-foreground">{displayedStats.topPerformer}</p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Per-Student Breakdown</p>
              </div>
              <div className="space-y-2">
                {studentBreakdown.map((student, index) => (
                  <div
                    key={`${student.studentName}-${index}`}
                    className="rounded-md border border-border bg-card/60 p-3 text-sm"
                  >
                    <p className="font-medium text-foreground">{student.studentName}</p>
                    <p className="text-muted-foreground">
                      Total: {student.totalTasks} | Completed: {student.completed} | Missed: {student.missed} | Excused: {student.excused} | Pending: {student.pending}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" onClick={() => resetViewState(true)}>
              Generate Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
