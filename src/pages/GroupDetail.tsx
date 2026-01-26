import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    ArrowLeft,
    Users,
    Trash2,
    Copy,
    Send,
    MessageSquare,
    Loader2,
    ArrowUpDown,
    Globe,
    QrCode,
    Check,
    UserMinus
} from "lucide-react";
import { subDays, format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface GroupInfo {
    id: string;
    name: string;
    color: string;
    join_code: string;
    qr_token: string | null;
}

interface StudentWithProgress {
    id: string;
    student_id: string;
    display_name: string;
    email: string;
    total_tasks: number;
    completed_tasks: number;
    completionRate: number;
    status: "On Track" | "Behind" | "At Risk";
    last_active?: string;
}

interface Note {
    id: string;
    from_user_id: string;
    to_user_id: string | null;
    content: string;
    created_at: string | null;
    from_name?: string;
    to_user_name?: string | null;
    visibility: string | null;
    tags?: string[] | null;
    title?: string | null;
    group_id?: string | null;
    class_session_id?: string | null;
}

type SortField = "name" | "completion" | "status";
type SortOrder = "asc" | "desc";

export default function GroupDetail() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState<GroupInfo | null>(null);
    const [students, setStudents] = useState<StudentWithProgress[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);

    // Note State
    const [newNote, setNewNote] = useState("");
    const [newNoteTitle, setNewNoteTitle] = useState("");
    const [noteTargetStudent, setNoteTargetStudent] = useState<string>("all"); // "all" or student_id
    const [sendingNote, setSendingNote] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Filter & Sort State
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [copied, setCopied] = useState(false);
    const [showQRDialog, setShowQRDialog] = useState(false);

    // Remove Student State
    const [studentToRemove, setStudentToRemove] = useState<StudentWithProgress | null>(null);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        if (!user || !groupId) return;
        fetchData();
    }, [user, groupId]);

    const fetchData = async () => {
        if (!groupId) return;
        try {
            // 1. Fetch group info
            const { data: groupData, error: groupError } = await supabase
                .from("groups")
                .select("id, name, color, join_code, qr_token")
                .eq("id", groupId)
                .single();

            if (groupError) throw groupError;
            setGroup(groupData);

            // 2. Fetch members in this group
            const { data: members } = await supabase
                .from("group_members")
                .select("id, user_id")
                .eq("group_id", groupId);

            if (members && members.length > 0) {
                const memberIds = members.map((m: any) => m.user_id);

                // Get profiles
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("user_id, display_name, email, updated_at")
                    .in("user_id", memberIds);

                // Get task instances for all members in one query (past 7 days only for efficiency)
                const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
                const { data: allTaskInstances } = await supabase
                    .from("task_instances")
                    .select("id, assignee_id, status")
                    .in("assignee_id", memberIds)
                    .gte("scheduled_date", sevenDaysAgo);

                // Calculate progress for each member
                const studentsWithProgress: StudentWithProgress[] = members.map((member: any) => {
                    const profile = profiles?.find((p: any) => p.user_id === member.user_id);

                    // Get task instances for this member
                    const memberTasks = (allTaskInstances || []).filter(
                        (t: any) => t.assignee_id === member.user_id
                    );
                    const total = memberTasks.length;
                    const completed = memberTasks.filter((t: any) => t.status === "completed").length;
                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

                    let status: "On Track" | "Behind" | "At Risk" = "On Track";
                    if (total === 0) status = "On Track"; // No tasks assigned yet
                    else if (rate < 50) status = "At Risk";
                    else if (rate < 80) status = "Behind";

                    // Use display_name, fallback to email prefix, then "Student"
                    const emailPrefix = profile?.email ? profile.email.split("@")[0] : null;
                    const displayName = profile?.display_name || emailPrefix || "Student";

                    return {
                        id: member.id,
                        student_id: member.user_id,
                        display_name: displayName,
                        email: profile?.email || "",
                        total_tasks: total,
                        completed_tasks: completed,
                        completionRate: rate,
                        status,
                        last_active: profile?.updated_at
                    };
                });

                setStudents(studentsWithProgress);
            } else {
                setStudents([]);
            }

            // 3. Fetch notes for this group
            const { data: notesData } = await supabase
                .from("notes")
                .select("*")
                .eq("group_id", groupId)
                .order("created_at", { ascending: false });

            if (notesData) {
                // Get names for note authors and recipients
                const fromIds = [...new Set(notesData.map((n) => n.from_user_id))];
                const toIds = [...new Set(notesData.filter((n) => n.to_user_id).map((n) => n.to_user_id))] as string[];
                const allUserIds = [...new Set([...fromIds, ...toIds])];

                if (allUserIds.length > 0) {
                    const { data: noteProfiles } = await supabase
                        .from("profiles")
                        .select("user_id, display_name")
                        .in("user_id", allUserIds);

                    const enrichedNotes: Note[] = notesData.map((note) => ({
                        ...note,
                        from_name: noteProfiles?.find((p) => p.user_id === note.from_user_id)?.display_name || "Unknown",
                        to_user_name: note.to_user_id
                            ? noteProfiles?.find((p) => p.user_id === note.to_user_id)?.display_name || "Student"
                            : null
                    }));
                    setNotes(enrichedNotes);
                } else {
                    setNotes(notesData as Note[]);
                }
            } else {
                setNotes([]);
            }

        } catch (error) {
            handleError(error, { component: 'GroupDetail', action: 'fetch group' });
        } finally {
            setLoading(false);
        }
    };

    const handleSendNote = async () => {
        if (!newNote.trim() || !user || !groupId) return;
        setSendingNote(true);

        try {
            const targetStudentId = noteTargetStudent === "all" ? null : noteTargetStudent;
            const { error } = await supabase.from("notes").insert({
                group_id: groupId,
                from_user_id: user.id,
                to_user_id: targetStudentId,
                content: newNote.trim(),
                title: newNoteTitle.trim() || null,
                visibility: "shared" // Always shared, targeting handled by to_user_id
            });

            if (error) throw error;

            const targetName = targetStudentId
                ? students.find(s => s.student_id === targetStudentId)?.display_name || "student"
                : "all students";
            toast({ title: "Note Posted", description: `Your note has been sent to ${targetName}.` });
            setNewNote("");
            setNewNoteTitle("");
            setNoteTargetStudent("all");
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSendingNote(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!groupId) return;
        setDeleting(true);

        try {
            const { error } = await supabase
                .from("groups")
                .delete()
                .eq("id", groupId);

            if (error) throw error;

            toast({ title: "Group Deleted", description: "The group and all members have been removed." });
            navigate("/dashboard");
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    const handleRemoveStudent = async () => {
        if (!studentToRemove || !groupId) return;
        setRemoving(true);

        try {
            // First, delete pending task_instances for this student in this group
            // This prevents "zombie tasks" from remaining after student removal
            const today = format(new Date(), "yyyy-MM-dd");

            // Get assignments for this group to find related tasks
            const { data: groupAssignments } = await supabase
                .from("assignments")
                .select("id")
                .eq("group_id", groupId);

            if (groupAssignments && groupAssignments.length > 0) {
                const assignmentIds = groupAssignments.map(a => a.id);

                // Delete pending tasks for this student from group assignments
                const { error: deleteTasksError } = await supabase
                    .from("task_instances")
                    .delete()
                    .in("assignment_id", assignmentIds)
                    .eq("assignee_id", studentToRemove.student_id)
                    .eq("status", "pending")
                    .gte("scheduled_date", today);

                if (deleteTasksError) {
                    console.warn("Could not delete pending tasks for student:", deleteTasksError.message);
                    // Continue anyway - membership removal is more important
                }
            }

            // Remove from group_members table
            const { error } = await supabase
                .from("group_members")
                .delete()
                .eq("id", studentToRemove.id);

            if (error) throw error;

            // Update local state
            setStudents(prev => prev.filter(s => s.id !== studentToRemove.id));

            toast({
                title: "Student Removed",
                description: `${studentToRemove.display_name} has been removed from the group and their pending tasks have been cleared.`
            });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setRemoving(false);
            setStudentToRemove(null);
        }
    };

    const copyCode = () => {
        if (group) {
            navigator.clipboard.writeText(group.join_code);
            setCopied(true);
            toast({ title: "Copied!", description: "Join code copied to clipboard." });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Generate the QR code URL - this is the URL students will navigate to when scanning
    const getQRCodeUrl = () => {
        if (!group) return "";
        // Use the app's URL with the QR token for scanning
        const baseUrl = window.location.origin;
        return `${baseUrl}/join?token=${group.qr_token}`;
    };

    // Sorting Logic
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const filteredStudents = students.filter(s => {
        if (filterStatus === "all") return true;
        if (filterStatus === "behind") return s.status === "Behind" || s.status === "At Risk";
        if (filterStatus === "on_track") return s.status === "On Track";
        return true;
    });

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        let res = 0;
        if (sortField === "name") res = a.display_name.localeCompare(b.display_name);
        else if (sortField === "completion") res = a.completionRate - b.completionRate;
        else if (sortField === "status") res = a.status.localeCompare(b.status);

        return sortOrder === "asc" ? res : -res;
    });

    const completionRate = students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.completed_tasks, 0) / Math.max(students.reduce((sum, s) => sum + s.total_tasks, 0), 1) * 100)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            </div>
        );
    }

    if (!group) {
        return (
            <div className="p-6 text-center">
                <p>Group not found.</p>
                <Button onClick={() => navigate("/dashboard")} className="mt-4">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold font-display">{group.name}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {students.length} {students.length === 1 ? "student" : "students"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Group
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this group. All students will be disconnected.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteGroup} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Yes, Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Join Code & QR Code Card */}
            <Card className="border-cta-primary/30 bg-cta-primary/5">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 text-center sm:text-left">
                            <p className="text-sm text-muted-foreground mb-1">Share this code with students to join</p>
                            <div className="flex items-center justify-center sm:justify-start gap-3">
                                <span className="text-3xl font-bold font-mono tracking-[0.3em] text-foreground">
                                    {group.join_code}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyCode}
                                    className="shrink-0"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                    <span className="ml-2">{copied ? "Copied!" : "Copy"}</span>
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <QrCode className="w-4 h-4" />
                                        Show QR Code
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Scan to Join {group.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex flex-col items-center gap-6 py-6">
                                        <div className="bg-white p-4 rounded-xl">
                                            <QRCodeSVG
                                                value={getQRCodeUrl()}
                                                size={200}
                                                level="H"
                                                includeMargin={true}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                                            <p className="text-2xl font-bold font-mono tracking-[0.3em]">
                                                {group.join_code}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                copyCode();
                                            }}
                                        >
                                            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                            {copied ? "Copied!" : "Copy Code"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content: Roster Table */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle>Students</CardTitle>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Filter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Students</SelectItem>
                                        <SelectItem value="on_track">On Track</SelectItem>
                                        <SelectItem value="behind">Behind</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                                            Name {sortField === "name" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
                                        </TableHead>
                                        <TableHead>Tasks</TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort("completion")}>
                                            Progress {sortField === "completion" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                                            Status {sortField === "status" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
                                        </TableHead>
                                        <TableHead className="w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{student.display_name}</p>
                                                    {student.email && (
                                                        <p className="text-xs text-muted-foreground">{student.email}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">
                                                    {student.completed_tasks}/{student.total_tasks}
                                                </span>
                                            </TableCell>
                                            <TableCell className="w-[30%]">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={student.completionRate} className="h-2 flex-1" />
                                                    <span className="text-xs w-10 text-right">{student.completionRate}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={student.status === "On Track" ? "default" : student.status === "Behind" ? "secondary" : "destructive"}
                                                    className={student.status === "On Track" ? "bg-green-500/20 text-green-700 border-green-500/30" : ""}
                                                >
                                                    {student.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setStudentToRemove(student)}
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sortedStudents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                {students.length === 0
                                                    ? "No students have joined this group yet. Share the join code above!"
                                                    : "No students found matching filters."}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Notes & aggregated stats */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Group Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="text-center p-4 bg-secondary/30 rounded-lg">
                                <p className="text-3xl font-bold">{completionRate}%</p>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Completion Rate</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xl font-bold">{students.length}</p>
                                    <p className="text-xs text-muted-foreground">Students</p>
                                </div>
                                <div className="text-center p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xl font-bold">{notes.length}</p>
                                    <p className="text-xs text-muted-foreground">Notes</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-[500px] flex flex-col">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Notes
                            </CardTitle>
                        </CardHeader>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {notes.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-10">
                                    No notes yet. Post an announcement or reminder.
                                </p>
                            ) : (
                                notes.map((note) => (
                                    <div key={note.id} className="bg-secondary/40 p-3 rounded-lg space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs">{note.from_name}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {note.created_at ? new Date(note.created_at).toLocaleDateString() : ""}
                                            </span>
                                        </div>
                                        {note.title && <p className="font-semibold text-sm text-accent">{note.title}</p>}
                                        <p className="text-sm">{note.content}</p>
                                        {note.to_user_name && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                                                    <Users className="w-2 h-2" /> To: {note.to_user_name}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t bg-background">
                            <div className="space-y-3">
                                <Input
                                    placeholder="Title (optional)"
                                    value={newNoteTitle}
                                    onChange={(e) => setNewNoteTitle(e.target.value)}
                                    className="h-8 text-sm"
                                />
                                <Textarea
                                    placeholder="Write a note..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    className="min-h-[80px] text-sm resize-none"
                                />
                                <div className="flex items-center justify-between gap-2">
                                    <Select value={noteTargetStudent} onValueChange={setNoteTargetStudent}>
                                        <SelectTrigger className="flex-1 h-8 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3 h-3" />
                                                <SelectValue placeholder="Send to..." />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                <span className="flex items-center gap-2">
                                                    <Globe className="w-3 h-3" /> All Students
                                                </span>
                                            </SelectItem>
                                            {students.map((student) => (
                                                <SelectItem key={student.student_id} value={student.student_id}>
                                                    {student.display_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={handleSendNote} disabled={sendingNote || !newNote.trim()}>
                                        {sendingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                        <span className="ml-2">Post</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Remove Student Confirmation Dialog */}
            <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Student?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <span className="font-semibold">{studentToRemove?.display_name}</span> from this group?
                            They will no longer have access to group tasks and can rejoin using the join code.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveStudent}
                            disabled={removing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {removing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
