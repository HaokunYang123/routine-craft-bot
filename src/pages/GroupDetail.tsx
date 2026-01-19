import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
    Lock,
    Globe
} from "lucide-react";

interface ClassSession {
    id: string;
    name: string;
    join_code: string;
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
    created_at: string;
    from_name?: string;
    visibility: "private" | "shared";
    tags?: string[];
    title?: string;
}

type SortField = "name" | "completion" | "status";
type SortOrder = "asc" | "desc";

export default function GroupDetail() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<ClassSession | null>(null);
    const [students, setStudents] = useState<StudentWithProgress[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);

    // Note State
    const [newNote, setNewNote] = useState("");
    const [newNoteTitle, setNewNoteTitle] = useState("");
    const [noteVisibility, setNoteVisibility] = useState<"private" | "shared">("shared");
    const [sendingNote, setSendingNote] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Filter & Sort State
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    useEffect(() => {
        if (!user || !groupId) return;
        fetchData();
    }, [user, groupId]);

    const fetchData = async () => {
        try {
            // 1. Fetch class session
            const { data: sessionData, error: sessionError } = await supabase
                .from("class_sessions" as any)
                .select("id, name, join_code")
                .eq("id", groupId)
                .single();

            if (sessionError) throw sessionError;
            setSession(sessionData);

            // 2. Fetch students in this group
            const { data: connections } = await supabase
                .from("instructor_students" as any)
                .select("id, student_id")
                .eq("class_session_id", groupId);

            if (connections && connections.length > 0) {
                const studentIds = connections.map((c: any) => c.student_id);

                // Get profiles
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("user_id, display_name, email, updated_at")
                    .in("user_id", studentIds);

                // Get tasks for each student
                const studentsWithProgress: StudentWithProgress[] = await Promise.all(
                    connections.map(async (conn: any) => {
                        const profile = profiles?.find((p: any) => p.user_id === conn.student_id);

                        // Count tasks assigned to this student from this coach
                        const { count: totalCount } = await supabase
                            .from("tasks")
                            .select("id", { count: "exact", head: true })
                            .eq("user_id", user!.id)
                            .eq("assigned_student_id", conn.student_id);

                        const { count: completedCount } = await supabase
                            .from("tasks")
                            .select("id", { count: "exact", head: true })
                            .eq("user_id", user!.id)
                            .eq("assigned_student_id", conn.student_id)
                            .eq("is_completed", true);

                        const total = totalCount || 0;
                        const completed = completedCount || 0;
                        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

                        let status: "On Track" | "Behind" | "At Risk" = "On Track";
                        if (rate < 50) status = "At Risk";
                        else if (rate < 80) status = "Behind";

                        return {
                            id: conn.id,
                            student_id: conn.student_id,
                            display_name: profile?.display_name || "Student",
                            email: profile?.email || "",
                            total_tasks: total,
                            completed_tasks: completed,
                            completionRate: rate,
                            status,
                            last_active: profile?.updated_at
                        };
                    })
                );

                setStudents(studentsWithProgress);
            } else {
                setStudents([]);
            }

            // 3. Fetch notes for this group
            const { data: notesData } = await supabase
                .from("notes" as any)
                .select("*")
                .eq("class_session_id", groupId)
                .order("created_at", { ascending: false });

            if (notesData) {
                // Get names for note authors
                const fromIds = [...new Set(notesData.map((n: any) => n.from_user_id))];
                const { data: noteProfiles } = await supabase
                    .from("profiles")
                    .select("user_id, display_name")
                    .in("user_id", fromIds);

                const enrichedNotes = notesData.map((note: any) => ({
                    ...note,
                    from_name: noteProfiles?.find((p: any) => p.user_id === note.from_user_id)?.display_name || "Unknown"
                }));
                setNotes(enrichedNotes);
            } else {
                setNotes([]);
            }

        } catch (error: any) {
            console.error("Error fetching group:", error);
            toast({ title: "Error", description: "Failed to load group.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSendNote = async () => {
        if (!newNote.trim() || !user || !groupId) return;
        setSendingNote(true);

        try {
            const { error } = await supabase.from("notes" as any).insert({
                class_session_id: groupId,
                from_user_id: user.id,
                to_user_id: null, // Broadcast to group for now (tab logic can expand this)
                content: newNote.trim(),
                title: newNoteTitle.trim() || null,
                visibility: noteVisibility
            });

            if (error) throw error;

            toast({ title: "Note Posted", description: "Your note has been added." });
            setNewNote("");
            setNewNoteTitle("");
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
                .from("class_sessions" as any)
                .delete()
                .eq("id", groupId);

            if (error) throw error;

            toast({ title: "Group Deleted", description: "The group and all connections have been removed." });
            navigate("/dashboard");
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    const copyCode = () => {
        if (session) {
            navigator.clipboard.writeText(session.join_code);
            toast({ title: "Copied!", description: "Join code copied." });
        }
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

    if (!session) {
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
                        <h1 className="text-3xl font-bold font-display">{session.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>Code: <strong className="font-mono text-foreground">{session.join_code}</strong></span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyCode}>
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
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
                                <AlertDialogTitle>Delete "{session.name}"?</AlertDialogTitle>
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
                                        <TableHead className="cursor-pointer" onClick={() => handleSort("completion")}>
                                            Progress {sortField === "completion" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                                            Status {sortField === "status" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.display_name}</TableCell>
                                            <TableCell className="w-[40%]">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={student.completionRate} className="h-2 flex-1" />
                                                    <span className="text-xs w-8">{student.completionRate}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={student.status === "On Track" ? "default" : "destructive"}>
                                                    {student.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sortedStudents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                No students found matching filters.
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
                                                {new Date(note.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {note.title && <p className="font-semibold text-sm text-accent">{note.title}</p>}
                                        <p className="text-sm">{note.content}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {note.visibility === 'private' && (
                                                <Badge variant="outline" className="text-[10px] h-5 px-1 gap-1">
                                                    <Lock className="w-2 h-2" /> Private
                                                </Badge>
                                            )}
                                        </div>
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
                                <div className="flex items-center justify-between">
                                    <Select value={noteVisibility} onValueChange={(v: any) => setNoteVisibility(v)}>
                                        <SelectTrigger className="w-[110px] h-8 text-xs">
                                            <div className="flex items-center gap-2">
                                                {noteVisibility === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="shared">Shared</SelectItem>
                                            <SelectItem value="private">Private</SelectItem>
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
        </div>
    );
}
