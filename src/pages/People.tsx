import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Users, Plus, Loader2, ChevronDown, ChevronRight, Trash2, User, Mail, UserMinus, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTemplates } from "@/hooks/useTemplates";

interface ClassSession {
  id: string;
  name: string;
  join_code: string;
  is_active: boolean;
  default_template_id: string | null;
}

interface Student {
  id: string;
  student_id: string;
  display_name: string;
  email: string;
}

interface GroupWithStudents extends ClassSession {
  students: Student[];
}

export default function People() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { templates } = useTemplates();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupWithStudents[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Selected student for detail view
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentGroups, setStudentGroups] = useState<string[]>([]);

  // Create Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newRosterName, setNewRosterName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch all class sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("class_sessions" as any)
        .select("*")
        .eq("coach_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // For each session, get students
      const groupsWithStudents = await Promise.all(
        (sessionsData || []).map(async (session: any) => {
          const { data: connections } = await supabase
            .from("instructor_students" as any)
            .select("id, student_id")
            .eq("class_session_id", session.id);

          let students: Student[] = [];

          if (connections && connections.length > 0) {
            const studentIds = connections.map((c: any) => c.student_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", studentIds);

            students = connections.map((conn: any) => {
              const profile = profiles?.find((p: any) => p.user_id === conn.student_id);
              return {
                id: conn.id,
                student_id: conn.student_id,
                display_name: profile?.display_name || "Student",
                email: ""
              };
            });
          }

          return {
            ...session,
            students
          };
        })
      );

      setGroups(groupsWithStudents);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRosterName.trim()) return;
    setCreating(true);

    try {
      const { data: code } = await supabase.rpc('generate_join_code' as any);

      const insertData: any = {
        coach_id: user.id,
        name: newRosterName.trim(),
        join_code: code,
        is_active: true
      };

      // Add template if selected
      if (selectedTemplateId && selectedTemplateId !== "none") {
        insertData.default_template_id = selectedTemplateId;
      }

      const { error } = await supabase.from("class_sessions" as any).insert(insertData);

      if (error) throw error;

      const templateName = selectedTemplateId && selectedTemplateId !== "none"
        ? templates.find(t => t.id === selectedTemplateId)?.name
        : null;

      toast({
        title: "Group Created!",
        description: templateName
          ? `${newRosterName} is ready. New students will get "${templateName}" tasks.`
          : `${newRosterName} is ready.`
      });
      setNewRosterName("");
      setSelectedTemplateId("");
      setCreateOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      // Use RPC function for reliable deletion (bypasses RLS issues)
      const { data, error } = await supabase.rpc("delete_class_session" as any, {
        p_session_id: groupId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to delete class");
      }

      // Only update local state after successful deletion
      setGroups(prev => prev.filter(g => g.id !== groupId));
      toast({ title: "Group Deleted", description: `${groupName} has been removed.` });
    } catch (error: any) {
      console.error("Delete group error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      // Refresh to ensure UI matches database state
      fetchData();
    }
  };

  const handleRemoveStudent = async (connectionId: string, studentName: string, groupId: string) => {
    try {
      // Use RPC function for reliable deletion (bypasses RLS issues)
      const { data, error } = await supabase.rpc("remove_student_from_class" as any, {
        p_connection_id: connectionId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to remove student");
      }

      // Only update local state after successful deletion
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            students: g.students.filter(s => s.id !== connectionId)
          };
        }
        return g;
      }));

      toast({ title: "Student Removed", description: `${studentName} has been removed from the group.` });
    } catch (error: any) {
      console.error("Remove student error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      // Refresh to ensure UI matches database state
      fetchData();
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Join code copied." });
  };

  const viewStudentDetails = async (student: Student) => {
    setSelectedStudent(student);

    // Find all groups this student belongs to
    const studentGroupNames = groups
      .filter(g => g.students.some(s => s.student_id === student.student_id))
      .map(g => g.name);
    setStudentGroups(studentGroupNames);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">People</h1>
          <p className="text-muted-foreground">View your groups and students.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRoster} className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  value={newRosterName}
                  onChange={(e) => setNewRosterName(e.target.value)}
                  placeholder="e.g. Period 1, Varsity Team"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Library className="w-4 h-4" />
                  Auto-assign Template (optional)
                </Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.tasks?.length || 0} tasks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Students who join will automatically receive tasks from this template.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Group
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl bg-secondary/20">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No Groups Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a group and share the code with students to get started.
          </p>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <Collapsible open={expandedGroups.has(group.id)} onOpenChange={() => toggleGroup(group.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedGroups.has(group.id) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                            <Users className="w-3 h-3" />
                            {group.students.length} student{group.students.length !== 1 && "s"}
                            <span className="mx-1">•</span>
                            <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{group.join_code}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); copyCode(group.join_code); }}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            {group.default_template_id && (
                              <>
                                <span className="mx-1">•</span>
                                <span className="flex items-center gap-1 text-xs bg-cta-primary/20 text-cta-primary px-2 py-0.5 rounded">
                                  <Library className="w-3 h-3" />
                                  {templates.find(t => t.id === group.default_template_id)?.name || "Template"}
                                </span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the group and disconnect all {group.students.length} students from it.
                              <br /><br />
                              <strong>This cannot be undone.</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {group.students.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4 text-sm">
                        No students yet. Share the code: <strong className="font-mono">{group.join_code}</strong>
                      </p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {group.students.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between gap-3 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group/student"
                          >
                            <div
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={() => viewStudentDetails(student)}
                            >
                              <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold">
                                {student.display_name.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">{student.display_name}</span>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover/student:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove "{student.display_name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the student from "{group.name}". They can rejoin using the class code.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveStudent(student.id, student.display_name, group.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center text-lg font-bold">
                {selectedStudent?.display_name.substring(0, 2).toUpperCase()}
              </div>
              {selectedStudent?.display_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Name:</span>
              <span>{selectedStudent?.display_name}</span>
            </div>
            {selectedStudent?.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span>{selectedStudent.email}</span>
              </div>
            )}
            <div className="flex items-start gap-3 text-sm">
              <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">Groups:</span>
              <div className="flex flex-wrap gap-1">
                {studentGroups.map((groupName, i) => (
                  <span key={i} className="bg-secondary px-2 py-0.5 rounded text-xs">{groupName}</span>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
