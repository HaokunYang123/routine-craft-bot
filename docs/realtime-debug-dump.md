# Realtime Debug Dump

## GroupDetail.tsx (Complete File Contents)
```tsx
   1: import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
   2: import { useParams, useNavigate, useSearchParams } from "react-router-dom";
   3: import { useQueryClient } from "@tanstack/react-query";
   4: import { supabase } from "@/integrations/supabase/client";
   5: import { useAuth } from "@/hooks/useAuth";
   6: import { useToast } from "@/hooks/use-toast";
   7: import { useGroups } from "@/hooks/useGroups";
   8: import { handleError } from "@/lib/error";
   9: import { queryKeys } from "@/lib/queries/keys";
  10: import { Button } from "@/components/ui/button";
  11: import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
  12: import { Progress } from "@/components/ui/progress";
  13: import { Textarea } from "@/components/ui/textarea";
  14: import { Input } from "@/components/ui/input";
  15: import { Badge } from "@/components/ui/badge";
  16: import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  17: import {
  18:     DropdownMenu,
  19:     DropdownMenuContent,
  20:     DropdownMenuItem,
  21:     DropdownMenuTrigger,
  22: } from "@/components/ui/dropdown-menu";
  23: import {
  24:     Select,
  25:     SelectContent,
  26:     SelectItem,
  27:     SelectTrigger,
  28:     SelectValue,
  29: } from "@/components/ui/select";
  30: import {
  31:     Table,
  32:     TableBody,
  33:     TableCell,
  34:     TableHead,
  35:     TableHeader,
  36:     TableRow,
  37: } from "@/components/ui/table";
  38: import {
  39:     AlertDialog,
  40:     AlertDialogAction,
  41:     AlertDialogCancel,
  42:     AlertDialogContent,
  43:     AlertDialogDescription,
  44:     AlertDialogFooter,
  45:     AlertDialogHeader,
  46:     AlertDialogTitle,
  47:     AlertDialogTrigger,
  48: } from "@/components/ui/alert-dialog";
  49: import {
  50:     ArrowLeft,
  51:     Users,
  52:     Trash2,
  53:     Copy,
  54:     Send,
  55:     MessageSquare,
  56:     Loader2,
  57:     ArrowUpDown,
  58:     Globe,
  59:     QrCode,
  60:     Check,
  61:     Plus,
  62:     Settings,
  63:     ChevronDown,
  64:     ChevronUp,
  65: } from "lucide-react";
  66: import { subDays, format } from "date-fns";
  67: import { QRCodeSVG } from "qrcode.react";
  68: import {
  69:     Dialog,
  70:     DialogContent,
  71:     DialogHeader,
  72:     DialogTitle,
  73:     DialogTrigger,
  74:     DialogFooter,
  75: } from "@/components/ui/dialog";
  76: import { AssignTaskModal } from "@/components/assignments/AssignTaskModal";
  77: 
  78: interface GroupInfo {
  79:     id: string;
  80:     name: string;
  81:     color: string;
  82:     join_code: string;
  83:     qr_token: string | null;
  84: }
  85: 
  86: interface StudentWithProgress {
  87:     id: string;
  88:     student_id: string;
  89:     display_name: string;
  90:     email: string;
  91:     total_tasks: number;
  92:     completed_tasks: number;
  93:     completionRate: number;
  94:     status: "On Track" | "Behind" | "At Risk";
  95:     last_active?: string;
  96: }
  97: 
  98: interface Note {
  99:     id: string;
 100:     from_user_id: string;
 101:     to_user_id: string | null;
 102:     content: string;
 103:     created_at: string | null;
 104:     from_name?: string;
 105:     to_user_name?: string | null;
 106:     visibility: string | null;
 107:     tags?: string[] | null;
 108:     title?: string | null;
 109:     group_id?: string | null;
 110:     class_session_id?: string | null;
 111: }
 112: 
 113: interface TaskInstance {
 114:     id: string;
 115:     assignee_id: string;
 116:     name: string;
 117:     scheduled_date: string | null;
 118:     assign_date: string | null;
 119:     start_time: string | null;
 120:     end_time: string | null;
 121:     status: string;
 122: }
 123: 
 124: type SortField = "name" | "completion" | "status";
 125: type SortOrder = "asc" | "desc";
 126: 
 127: export default function GroupDetail() {
 128:     const { groupId } = useParams<{ groupId: string }>();
 129:     const navigate = useNavigate();
 130:     const { user } = useAuth();
 131:     const { toast } = useToast();
 132:     const { deleteGroup } = useGroups();
 133:     const queryClient = useQueryClient();
 134: 
 135:     const [loading, setLoading] = useState(true);
 136:     const [group, setGroup] = useState<GroupInfo | null>(null);
 137:     const [students, setStudents] = useState<StudentWithProgress[]>([]);
 138:     const [notes, setNotes] = useState<Note[]>([]);
 139:     const [taskInstances, setTaskInstances] = useState<TaskInstance[]>([]);
 140:     const [tasksLoading, setTasksLoading] = useState(false);
 141:     const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | "active" | "overdue" | "completed">("all");
 142:     const [expandedTaskGroups, setExpandedTaskGroups] = useState<Set<string>>(new Set());
 143: 
 144:     // Note State
 145:     const [newNote, setNewNote] = useState("");
 146:     const [newNoteTitle, setNewNoteTitle] = useState("");
 147:     const [noteTargetStudent, setNoteTargetStudent] = useState<string>("all"); // "all" or student_id
 148:     const [sendingNote, setSendingNote] = useState(false);
 149:     const [deleting, setDeleting] = useState(false);
 150: 
 151:     // Filter & Sort State
 152:     const [filterStatus, setFilterStatus] = useState<string>("all");
 153:     const [sortField, setSortField] = useState<SortField>("name");
 154:     const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
 155:     const [copied, setCopied] = useState(false);
 156:     const [showQRDialog, setShowQRDialog] = useState(false);
 157: 
 158:     // Remove Student State
 159:     const [studentToRemove, setStudentToRemove] = useState<StudentWithProgress | null>(null);
 160:     const [removing, setRemoving] = useState(false);
 161: 
 162:     // Assign task dialog state
 163:     const [assignDialogOpen, setAssignDialogOpen] = useState(false);
 164:     const [assignMode, setAssignMode] = useState<"group" | "individual">("group");
 165:     const [assignStudent, setAssignStudent] = useState<StudentWithProgress | null>(null);
 166:     const [searchParams, setSearchParams] = useSearchParams();
 167:     const tabParam = (searchParams.get("tab") || "").toLowerCase();
 168:     const activeTab = ["overview", "tasks", "notes"].includes(tabParam) ? tabParam : "overview";
 169: 
 170:     const handleTabChange = (value: string) => {
 171:         const nextParams = new URLSearchParams(searchParams);
 172:         nextParams.set("tab", value);
 173:         setSearchParams(nextParams, { replace: true });
 174:     };
 175: 
 176:     const fetchData = useCallback(async () => {
 177:         if (!groupId) return;
 178:         try {
 179:             // 1. Fetch group info
 180:             const { data: groupData, error: groupError } = await supabase
 181:                 .from("groups")
 182:                 .select("id, name, color, join_code, qr_token")
 183:                 .eq("id", groupId)
 184:                 .single();
 185: 
 186:             if (groupError) throw groupError;
 187:             setGroup(groupData);
 188: 
 189:             // 2. Fetch members in this group
 190:             const { data: members } = await supabase
 191:                 .from("group_members")
 192:                 .select("id, user_id")
 193:                 .eq("group_id", groupId);
 194: 
 195:             const memberIds = members?.map((m) => m.user_id) ?? [];
 196:             if (memberIds.length > 0) {
 197: 
 198:                 // Get profiles
 199:                 const { data: profiles } = await supabase
 200:                     .from("profiles")
 201:                     .select("user_id, display_name, email, updated_at")
 202:                     .in("user_id", memberIds);
 203: 
 204:                 // Get task instances for all members in one query (past 7 days only for efficiency)
 205:                 const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
 206:                 const { data: allTaskInstances } = await supabase
 207:                     .from("task_instances")
 208:                     .select("id, assignee_id, status")
 209:                     .in("assignee_id", memberIds)
 210:                     .gte("scheduled_date", sevenDaysAgo);
 211: 
 212:                 // Calculate progress for each member
 213:                 const studentsWithProgress: StudentWithProgress[] = members.map((member) => {
 214:                     const profile = profiles?.find((p) => p.user_id === member.user_id);
 215: 
 216:                     // Get task instances for this member
 217:                     const memberTasks = (allTaskInstances || []).filter(
 218:                         (t) => t.assignee_id === member.user_id
 219:                     );
 220:                     const total = memberTasks.length;
 221:                     const completed = memberTasks.filter((t) => t.status === "completed").length;
 222:                     const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
 223: 
 224:                     let status: "On Track" | "Behind" | "At Risk" = "On Track";
 225:                     if (total === 0) status = "On Track"; // No tasks assigned yet
 226:                     else if (rate < 50) status = "At Risk";
 227:                     else if (rate < 80) status = "Behind";
 228: 
 229:                     // Use display_name, fallback to email prefix, then "Student"
 230:                     const emailPrefix = profile?.email ? profile.email.split("@")[0] : null;
 231:                     const displayName = profile?.display_name || emailPrefix || "Student";
 232: 
 233:                     return {
 234:                         id: member.id,
 235:                         student_id: member.user_id,
 236:                         display_name: displayName,
 237:                         email: profile?.email || "",
 238:                         total_tasks: total,
 239:                         completed_tasks: completed,
 240:                         completionRate: rate,
 241:                         status,
 242:                         last_active: profile?.updated_at
 243:                     };
 244:                 });
 245: 
 246:                 setStudents(studentsWithProgress);
 247:             } else {
 248:                 setStudents([]);
 249:             }
 250: 
 251:             if (memberIds.length > 0) {
 252:                 setTasksLoading(true);
 253:                 const { data: tasksData, error: tasksError } = await supabase
 254:                     .from("task_instances")
 255:                     .select("id, assignee_id, name, scheduled_date, assign_date, start_time, end_time, status")
 256:                     .in("assignee_id", memberIds)
 257:                     .order("scheduled_date", { ascending: false });
 258: 
 259:                 if (tasksError) {
 260:                     handleError(tasksError, { component: "GroupDetail", action: "fetch task instances", silent: true });
 261:                     setTaskInstances([]);
 262:                 } else {
 263:                     setTaskInstances((tasksData ?? []) as TaskInstance[]);
 264:                 }
 265:                 setTasksLoading(false);
 266:             } else {
 267:                 setTaskInstances([]);
 268:                 setTasksLoading(false);
 269:             }
 270: 
 271:             // 3. Fetch notes for this group
 272:             const { data: notesData } = await supabase
 273:                 .from("notes")
 274:                 .select("*")
 275:                 .eq("group_id", groupId)
 276:                 .order("created_at", { ascending: false });
 277: 
 278:             if (notesData) {
 279:                 // Get names for note authors and recipients
 280:                 const fromIds = [...new Set(notesData.map((n) => n.from_user_id))];
 281:                 const toIds = [...new Set(notesData.filter((n) => n.to_user_id).map((n) => n.to_user_id))] as string[];
 282:                 const allUserIds = [...new Set([...fromIds, ...toIds])];
 283: 
 284:                 if (allUserIds.length > 0) {
 285:                     const { data: noteProfiles } = await supabase
 286:                         .from("profiles")
 287:                         .select("user_id, display_name")
 288:                         .in("user_id", allUserIds);
 289: 
 290:                     const enrichedNotes: Note[] = notesData.map((note) => ({
 291:                         ...note,
 292:                         from_name: noteProfiles?.find((p) => p.user_id === note.from_user_id)?.display_name || "Unknown",
 293:                         to_user_name: note.to_user_id
 294:                             ? noteProfiles?.find((p) => p.user_id === note.to_user_id)?.display_name || "Student"
 295:                             : null
 296:                     }));
 297:                     setNotes(enrichedNotes);
 298:                 } else {
 299:                     setNotes(notesData as Note[]);
 300:                 }
 301:             } else {
 302:                 setNotes([]);
 303:             }
 304: 
 305:         } catch (error) {
 306:             handleError(error, { component: 'GroupDetail', action: 'fetch group' });
 307:         } finally {
 308:             setLoading(false);
 309:         }
 310:     }, [groupId]);
 311: 
 312:     const fetchDataRef = useRef(fetchData);
 313:     useEffect(() => {
 314:         fetchDataRef.current = fetchData;
 315:     }, [fetchData]);
 316: 
 317:     useEffect(() => {
 318:         if (!user || !groupId) return;
 319:         fetchData();
 320:     }, [user, groupId, fetchData]);
 321: 
 322:     const memberIds = useMemo(
 323:         () => students.map((student) => student.student_id),
 324:         [students]
 325:     );
 326:     const memberIdsRef = useRef<string[]>([]);
 327:     useEffect(() => {
 328:         memberIdsRef.current = memberIds;
 329:     }, [memberIds]);
 330: 
 331:     useEffect(() => {
 332:         if (!groupId) return;
 333:         const channel = supabase
 334:             .channel(`group-detail-tasks-${groupId}`)
 335:             .on(
 336:                 "postgres_changes",
 337:                 { event: "UPDATE", schema: "public", table: "task_instances" },
 338:                 (payload) => {
 339:                     const assigneeId = payload?.new?.assignee_id as string | undefined;
 340:                     const currentMemberIds = memberIdsRef.current;
 341:                     if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
 342:                         return;
 343:                     }
 344:                     fetchDataRef.current();
 345:                 }
 346:             )
 347:             .subscribe();
 348: 
 349:         return () => {
 350:             supabase.removeChannel(channel);
 351:         };
 352:     }, [groupId]);
 353: 
 354:     const handleSendNote = async () => {
 355:         if (!newNote.trim() || !user || !groupId) return;
 356:         setSendingNote(true);
 357: 
 358:         try {
 359:             const targetStudentId = noteTargetStudent === "all" ? null : noteTargetStudent;
 360:             const { error } = await supabase.from("notes").insert({
 361:                 group_id: groupId,
 362:                 from_user_id: user.id,
 363:                 to_user_id: targetStudentId,
 364:                 content: newNote.trim(),
 365:                 title: newNoteTitle.trim() || null,
 366:                 visibility: "shared" // Always shared, targeting handled by to_user_id
 367:             });
 368: 
 369:             if (error) throw error;
 370: 
 371:             const targetName = targetStudentId
 372:                 ? students.find(s => s.student_id === targetStudentId)?.display_name || "student"
 373:                 : "all students";
 374:             toast({ title: "Note Posted", description: `Your note has been sent to ${targetName}.` });
 375:             setNewNote("");
 376:             setNewNoteTitle("");
 377:             setNoteTargetStudent("all");
 378:             fetchData();
 379:         } catch (error: unknown) {
 380:             toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
 381:         } finally {
 382:             setSendingNote(false);
 383:         }
 384:     };
 385: 
 386:     const handleDeleteGroup = async () => {
 387:         if (!groupId) return;
 388:         setDeleting(true);
 389: 
 390:         try {
 391:             // Use hook's deleteGroup for proper query invalidation (real-time UI update)
 392:             const success = await deleteGroup(groupId);
 393:             if (!success) {
 394:                 throw new Error("Failed to delete group");
 395:             }
 396:             navigate("/dashboard");
 397:         } catch (error: unknown) {
 398:             toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
 399:         } finally {
 400:             setDeleting(false);
 401:         }
 402:     };
 403: 
 404:     const handleRemoveStudent = async () => {
 405:         if (!studentToRemove || !groupId) return;
 406:         setRemoving(true);
 407: 
 408:         try {
 409:             // 1. Get assignments for this group to find related tasks
 410:             const { data: groupAssignments } = await supabase
 411:                 .from("assignments")
 412:                 .select("id")
 413:                 .eq("group_id", groupId);
 414: 
 415:             if (groupAssignments && groupAssignments.length > 0) {
 416:                 const assignmentIds = groupAssignments.map(a => a.id);
 417: 
 418:                 // 2. Delete ALL task_instances for this student from group assignments
 419:                 // (not just pending - includes completed, missed, etc.)
 420:                 const { error: deleteTasksError } = await supabase
 421:                     .from("task_instances")
 422:                     .delete()
 423:                     .in("assignment_id", assignmentIds)
 424:                     .eq("assignee_id", studentToRemove.student_id);
 425: 
 426:                 if (deleteTasksError) {
 427:                     console.warn("Could not delete tasks for student:", deleteTasksError.message);
 428:                 }
 429:             }
 430: 
 431:             // 3. Delete notes targeted to this student in this group
 432:             const { error: deleteNotesError } = await supabase
 433:                 .from("notes")
 434:                 .delete()
 435:                 .eq("group_id", groupId)
 436:                 .eq("to_user_id", studentToRemove.student_id);
 437: 
 438:             if (deleteNotesError) {
 439:                 console.warn("Could not delete notes for student:", deleteNotesError.message);
 440:             }
 441: 
 442:             // 4. Remove from group_members table
 443:             const { error } = await supabase
 444:                 .from("group_members")
 445:                 .delete()
 446:                 .eq("id", studentToRemove.id);
 447: 
 448:             if (error) throw error;
 449: 
 450:             // Update local state
 451:             setStudents(prev => prev.filter(s => s.id !== studentToRemove.id));
 452: 
 453:             // Invalidate queries to update UI across the app
 454:             await Promise.all([
 455:                 queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user!.id) }),
 456:                 queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all }),
 457:             ]);
 458: 
 459:             toast({
 460:                 title: "Student Removed",
 461:                 description: `${studentToRemove.display_name} has been removed from the group and all related data has been cleared.`
 462:             });
 463:         } catch (error: unknown) {
 464:             toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
 465:         } finally {
 466:             setRemoving(false);
 467:             setStudentToRemove(null);
 468:         }
 469:     };
 470: 
 471:     const copyCode = () => {
 472:         if (group) {
 473:             navigator.clipboard.writeText(group.join_code);
 474:             setCopied(true);
 475:             toast({ title: "Copied!", description: "Join code copied to clipboard." });
 476:             setTimeout(() => setCopied(false), 2000);
 477:         }
 478:     };
 479: 
 480:     // Generate the QR code URL - this is the URL students will navigate to when scanning
 481:     const getQRCodeUrl = () => {
 482:         if (!group) return "";
 483:         // Use the app's URL with the QR token for scanning
 484:         const baseUrl = window.location.origin;
 485:         return `${baseUrl}/join?token=${group.qr_token}`;
 486:     };
 487: 
 488:     // Sorting Logic
 489:     const handleSort = (field: SortField) => {
 490:         if (sortField === field) {
 491:             setSortOrder(sortOrder === "asc" ? "desc" : "asc");
 492:         } else {
 493:             setSortField(field);
 494:             setSortOrder("asc");
 495:         }
 496:     };
 497: 
 498:     const filteredStudents = students.filter(s => {
 499:         if (filterStatus === "all") return true;
 500:         if (filterStatus === "behind") return s.status === "Behind" || s.status === "At Risk";
 501:         if (filterStatus === "on_track") return s.status === "On Track";
 502:         return true;
 503:     });
 504: 
 505:     const sortedStudents = [...filteredStudents].sort((a, b) => {
 506:         let res = 0;
 507:         if (sortField === "name") res = a.display_name.localeCompare(b.display_name);
 508:         else if (sortField === "completion") res = a.completionRate - b.completionRate;
 509:         else if (sortField === "status") res = a.status.localeCompare(b.status);
 510: 
 511:         return sortOrder === "asc" ? res : -res;
 512:     });
 513: 
 514:     const completionRate = students.length > 0
 515:         ? Math.round(students.reduce((sum, s) => sum + s.completed_tasks, 0) / Math.max(students.reduce((sum, s) => sum + s.total_tasks, 0), 1) * 100)
 516:         : 0;
 517:     const todayStr = format(new Date(), "yyyy-MM-dd");
 518: 
 519:     const getTaskDate = (task: TaskInstance) =>
 520:         task.scheduled_date || task.assign_date || "";
 521: 
 522:     const isTaskOverdue = (task: TaskInstance) => {
 523:         const dateStr = getTaskDate(task);
 524:         return Boolean(dateStr && dateStr < todayStr && task.status !== "completed");
 525:     };
 526: 
 527:     const formatTaskDate = (dateStr: string | null) =>
 528:         dateStr ? format(new Date(dateStr), "MMM d, yyyy") : "—";
 529: 
 530:     const formatTaskTime = (start: string | null, end: string | null) => {
 531:         if (start && end) return `${start} - ${end}`;
 532:         return start || end || "—";
 533:     };
 534: 
 535:     const formatStatusLabel = (status: string) =>
 536:         status
 537:             ? status
 538:                 .replace(/_/g, " ")
 539:                 .replace(/\b\w/g, (match) => match.toUpperCase())
 540:             : "Pending";
 541: 
 542:     const getStudentName = (assigneeId: string) =>
 543:         students.find((student) => student.student_id === assigneeId)?.display_name || "Student";
 544: 
 545:     const taskSort = (a: TaskInstance, b: TaskInstance) =>
 546:         (getTaskDate(b) || "").localeCompare(getTaskDate(a) || "");
 547: 
 548:     const formatTaskStatusBadge = (task: TaskInstance) => {
 549:         if (isTaskOverdue(task)) return "Overdue";
 550:         if (task.status === "completed") return "Completed";
 551:         return "Pending";
 552:     };
 553: 
 554:     const taskGroups = taskInstances.reduce<Record<string, TaskInstance[]>>((acc, task) => {
 555:         if (!acc[task.name]) {
 556:             acc[task.name] = [];
 557:         }
 558:         acc[task.name].push(task);
 559:         return acc;
 560:     }, {});
 561: 
 562:     const groupedTasks = Object.entries(taskGroups).map(([name, instances]) => {
 563:         const sortedInstances = [...instances].sort(taskSort);
 564:         const completedCount = instances.filter((task) => task.status === "completed").length;
 565:         const totalCount = instances.length;
 566:         const hasOverdue = instances.some(isTaskOverdue);
 567:         const allCompleted = totalCount > 0 && completedCount === totalCount;
 568:         const groupStatus = allCompleted ? "completed" : hasOverdue ? "overdue" : "active";
 569:         const uniqueAssignees = Array.from(new Set(instances.map((task) => task.assignee_id)));
 570:         const assignmentLabel =
 571:             uniqueAssignees.length > 1
 572:                 ? "Group"
 573:                 : getStudentName(uniqueAssignees[0] || "");
 574:         const dateForGroup = sortedInstances.length > 0 ? getTaskDate(sortedInstances[sortedInstances.length - 1]) : "";
 575: 
 576:         return {
 577:             name,
 578:             instances: sortedInstances,
 579:             completedCount,
 580:             totalCount,
 581:             groupStatus,
 582:             assignmentLabel,
 583:             dateForGroup,
 584:             isSingleAssignee: uniqueAssignees.length <= 1,
 585:         };
 586:     });
 587: 
 588:     const filteredGroupedTasks = groupedTasks.filter((group) => {
 589:         if (taskStatusFilter === "all") return true;
 590:         return group.groupStatus === taskStatusFilter;
 591:     });
 592: 
 593:     const toggleTaskGroup = (groupName: string) => {
 594:         setExpandedTaskGroups((prev) => {
 595:             const next = new Set(prev);
 596:             if (next.has(groupName)) {
 597:                 next.delete(groupName);
 598:             } else {
 599:                 next.add(groupName);
 600:             }
 601:             return next;
 602:         });
 603:     };
 604: 
 605:     if (loading) {
 606:         return (
 607:             <div className="flex items-center justify-center h-64">
 608:                 <Loader2 className="w-8 h-8 animate-spin text-foreground" />
 609:             </div>
 610:         );
 611:     }
 612: 
 613:     if (!group) {
 614:         return (
 615:             <div className="p-6 text-center">
 616:                 <p>Group not found.</p>
 617:                 <Button onClick={() => navigate("/dashboard")} className="mt-4">Go Back</Button>
 618:             </div>
 619:         );
 620:     }
 621: 
 622:     return (
 623:         <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 pb-20">
 624:             {/* Header */}
 625:             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 626:                 <div className="flex items-center gap-4">
 627:                     <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
 628:                         <ArrowLeft className="w-5 h-5 text-white" />
 629:                     </Button>
 630:                     <div>
 631:                         <h1 className="text-3xl font-bold font-display text-foreground">{group.name}</h1>
 632:                         <p className="text-sm text-muted-foreground mt-1">
 633:                             {students.length} {students.length === 1 ? "student" : "students"}
 634:                         </p>
 635:                     </div>
 636:                 </div>
 637:                 <div className="flex gap-2">
 638:                     <Button
 639:                         onClick={() => {
 640:                             setAssignMode("group");
 641:                             setAssignStudent(null);
 642:                             setAssignDialogOpen(true);
 643:                         }}
 644:                         className="bg-cta-primary hover:bg-cta-hover text-white"
 645:                     >
 646:                         <Plus className="w-4 h-4 mr-2" />
 647:                         Assign to Group
 648:                     </Button>
 649:                     <AlertDialog>
 650:                         <DropdownMenu>
 651:                             <DropdownMenuTrigger asChild>
 652:                                 <Button variant="outline" size="icon">
 653:                                     <Settings className="w-4 h-4" />
 654:                                 </Button>
 655:                             </DropdownMenuTrigger>
 656:                             <DropdownMenuContent align="end">
 657:                                 <AlertDialogTrigger asChild>
 658:                                     <DropdownMenuItem className="text-destructive focus:text-destructive">
 659:                                         <Trash2 className="w-4 h-4 mr-2" />
 660:                                         Delete Group
 661:                                     </DropdownMenuItem>
 662:                                 </AlertDialogTrigger>
 663:                             </DropdownMenuContent>
 664:                         </DropdownMenu>
 665:                         <AlertDialogContent>
 666:                             <AlertDialogHeader>
 667:                                 <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
 668:                                 <AlertDialogDescription>
 669:                                     This will permanently delete this group. All students will be disconnected.
 670:                                 </AlertDialogDescription>
 671:                             </AlertDialogHeader>
 672:                             <AlertDialogFooter>
 673:                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
 674:                                 <AlertDialogAction onClick={handleDeleteGroup} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
 675:                                     {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
 676:                                     Yes, Delete
 677:                                 </AlertDialogAction>
 678:                             </AlertDialogFooter>
 679:                         </AlertDialogContent>
 680:                     </AlertDialog>
 681:                 </div>
 682:             </div>
 683: 
 684:             <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
 685:                 <TabsList>
 686:                     <TabsTrigger value="overview">Overview</TabsTrigger>
 687:                     <TabsTrigger value="tasks">Tasks</TabsTrigger>
 688:                     <TabsTrigger value="notes">Notes</TabsTrigger>
 689:                 </TabsList>
 690: 
 691:                 <TabsContent value="overview" className="space-y-6">
 692:                     {/* Join Code & QR Code Card */}
 693:                     <Card className="border-cta-primary/30 bg-cta-primary/5">
 694:                         <CardContent className="p-4">
 695:                             <div className="flex flex-col sm:flex-row items-center gap-4">
 696:                                 <div className="flex-1 text-center sm:text-left">
 697:                                     <p className="text-sm text-muted-foreground mb-1">Share this code with students to join</p>
 698:                                     <div className="flex items-center justify-center sm:justify-start gap-3">
 699:                                         <span className="text-3xl font-bold font-mono tracking-[0.3em] text-foreground">
 700:                                             {group.join_code}
 701:                                         </span>
 702:                                         <Button
 703:                                             variant="outline"
 704:                                             size="sm"
 705:                                             onClick={copyCode}
 706:                                             className="shrink-0"
 707:                                         >
 708:                                             {copied ? (
 709:                                                 <Check className="w-4 h-4 text-green-500" />
 710:                                             ) : (
 711:                                                 <Copy className="w-4 h-4" />
 712:                                             )}
 713:                                             <span className="ml-2">{copied ? "Copied!" : "Copy"}</span>
 714:                                         </Button>
 715:                                     </div>
 716:                                 </div>
 717:                                 <div className="flex items-center gap-2">
 718:                                     <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
 719:                                         <DialogTrigger asChild>
 720:                                             <Button variant="outline" className="gap-2">
 721:                                                 <QrCode className="w-4 h-4" />
 722:                                                 Show QR Code
 723:                                             </Button>
 724:                                         </DialogTrigger>
 725:                                         <DialogContent className="sm:max-w-md">
 726:                                             <DialogHeader>
 727:                                                 <DialogTitle className="text-center">Scan to Join {group.name}</DialogTitle>
 728:                                             </DialogHeader>
 729:                                             <div className="flex flex-col items-center gap-6 py-6">
 730:                                                 <div className="bg-white p-4 rounded-xl">
 731:                                                     <QRCodeSVG
 732:                                                         value={getQRCodeUrl()}
 733:                                                         size={200}
 734:                                                         level="H"
 735:                                                         includeMargin={true}
 736:                                                     />
 737:                                                 </div>
 738:                                                 <div className="text-center">
 739:                                                     <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
 740:                                                     <p className="text-2xl font-bold font-mono tracking-[0.3em]">
 741:                                                         {group.join_code}
 742:                                                     </p>
 743:                                                 </div>
 744:                                                 <Button
 745:                                                     variant="outline"
 746:                                                     className="w-full"
 747:                                                     onClick={() => {
 748:                                                         copyCode();
 749:                                                     }}
 750:                                                 >
 751:                                                     {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
 752:                                                     {copied ? "Copied!" : "Copy Code"}
 753:                                                 </Button>
 754:                                             </div>
 755:                                         </DialogContent>
 756:                                     </Dialog>
 757:                                 </div>
 758:                             </div>
 759:                         </CardContent>
 760:                     </Card>
 761: 
 762:                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 763:                         {/* Main Content: Roster Table */}
 764:                         <div className="md:col-span-2 space-y-6">
 765:                             <Card>
 766:                                 <CardHeader className="pb-3">
 767:                                     <div className="flex items-center justify-between">
 768:                                         <CardTitle>Students</CardTitle>
 769:                                         <Select value={filterStatus} onValueChange={setFilterStatus}>
 770:                                             <SelectTrigger className="w-[140px]">
 771:                                                 <SelectValue placeholder="Filter" />
 772:                                             </SelectTrigger>
 773:                                             <SelectContent>
 774:                                                 <SelectItem value="all">All Students</SelectItem>
 775:                                                 <SelectItem value="on_track">On Track</SelectItem>
 776:                                                 <SelectItem value="behind">Behind</SelectItem>
 777:                                             </SelectContent>
 778:                                         </Select>
 779:                                     </div>
 780:                                 </CardHeader>
 781:                                 <CardContent className="p-0">
 782:                                     <Table>
 783:                                         <TableHeader>
 784:                                             <TableRow>
 785:                                                 <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
 786:                                                     Name {sortField === "name" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
 787:                                                 </TableHead>
 788:                                                 <TableHead>Tasks</TableHead>
 789:                                                 <TableHead className="cursor-pointer" onClick={() => handleSort("completion")}>
 790:                                                     Progress {sortField === "completion" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
 791:                                                 </TableHead>
 792:                                                 <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
 793:                                                     Status {sortField === "status" && <ArrowUpDown className="inline w-3 h-3 ml-1" />}
 794:                                                 </TableHead>
 795:                                             </TableRow>
 796:                                         </TableHeader>
 797:                                         <TableBody>
 798:                                             {sortedStudents.map((student) => (
 799:                                                 <TableRow key={student.id}>
 800:                                                     <TableCell>
 801:                                                         <div>
 802:                                                             <p className="font-medium">{student.display_name}</p>
 803:                                                             {student.email && (
 804:                                                                 <p className="text-xs text-muted-foreground">{student.email}</p>
 805:                                                             )}
 806:                                                         </div>
 807:                                                     </TableCell>
 808:                                                     <TableCell>
 809:                                                         <span className="text-sm">
 810:                                                             {student.completed_tasks}/{student.total_tasks}
 811:                                                         </span>
 812:                                                     </TableCell>
 813:                                                     <TableCell className="w-[30%]">
 814:                                                         <div className="flex items-center gap-2">
 815:                                                             <Progress value={student.completionRate} className="h-2 flex-1" />
 816:                                                             <span className="text-xs w-10 text-right">{student.completionRate}%</span>
 817:                                                         </div>
 818:                                                     </TableCell>
 819:                                                     <TableCell>
 820:                                                         <Badge
 821:                                                             variant={student.status === "On Track" ? "default" : student.status === "Behind" ? "secondary" : "destructive"}
 822:                                                             className={student.status === "On Track" ? "bg-green-500/20 text-green-700 border-green-500/30" : ""}
 823:                                                         >
 824:                                                             {student.status}
 825:                                                         </Badge>
 826:                                                     </TableCell>
 827:                                                 </TableRow>
 828:                                             ))}
 829:                                             {sortedStudents.length === 0 && (
 830:                                                 <TableRow>
 831:                                                     <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
 832:                                                         {students.length === 0
 833:                                                             ? "No students have joined this group yet. Share the join code above!"
 834:                                                             : "No students found matching filters."}
 835:                                                     </TableCell>
 836:                                                 </TableRow>
 837:                                             )}
 838:                                         </TableBody>
 839:                                     </Table>
 840:                                 </CardContent>
 841:                             </Card>
 842:                         </div>
 843: 
 844:                         <div className="space-y-6">
 845:                             <Card>
 846:                                 <CardHeader>
 847:                                     <CardTitle>Group Stats</CardTitle>
 848:                                 </CardHeader>
 849:                                 <CardContent className="grid gap-4">
 850:                                     <div className="text-center p-4 bg-secondary/30 rounded-lg">
 851:                                         <p className="text-3xl font-bold">{completionRate}%</p>
 852:                                         <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Completion Rate</p>
 853:                                     </div>
 854:                                     <div className="grid grid-cols-2 gap-4">
 855:                                         <div className="text-center p-3 bg-secondary/30 rounded-lg">
 856:                                             <p className="text-xl font-bold">{students.length}</p>
 857:                                             <p className="text-xs text-muted-foreground">Students</p>
 858:                                         </div>
 859:                                         <div className="text-center p-3 bg-secondary/30 rounded-lg">
 860:                                             <p className="text-xl font-bold">{notes.length}</p>
 861:                                             <p className="text-xs text-muted-foreground">Notes</p>
 862:                                         </div>
 863:                                     </div>
 864:                                 </CardContent>
 865:                             </Card>
 866:                         </div>
 867:                     </div>
 868:                 </TabsContent>
 869: 
 870:                 <TabsContent value="tasks" className="space-y-6">
 871:                     <div>
 872:                         <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
 873:                         <p className="text-sm text-muted-foreground">
 874:                             Assign tasks and review task instances for this group.
 875:                         </p>
 876:                     </div>
 877: 
 878:                     <div className="flex flex-wrap items-center gap-2">
 879:                         {[
 880:                             { value: "all", label: "All" },
 881:                             { value: "active", label: "Active" },
 882:                             { value: "overdue", label: "Overdue" },
 883:                             { value: "completed", label: "Completed" },
 884:                         ].map((filter) => (
 885:                             <Button
 886:                                 key={filter.value}
 887:                                 type="button"
 888:                                 size="sm"
 889:                                 variant={taskStatusFilter === filter.value ? "default" : "outline"}
 890:                                 onClick={() => setTaskStatusFilter(filter.value as typeof taskStatusFilter)}
 891:                                 className={taskStatusFilter === filter.value ? "bg-cta-primary hover:bg-cta-hover text-white" : ""}
 892:                             >
 893:                                 {filter.label}
 894:                             </Button>
 895:                         ))}
 896:                     </div>
 897: 
 898:                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 899:                         <div className="lg:col-span-2 space-y-6">
 900:                             {tasksLoading ? (
 901:                                 <Card>
 902:                                     <CardContent className="p-6 text-sm text-muted-foreground">
 903:                                         Loading tasks...
 904:                                     </CardContent>
 905:                                 </Card>
 906:                             ) : filteredGroupedTasks.length === 0 ? (
 907:                                 <Card>
 908:                                     <CardContent className="p-6 text-sm text-muted-foreground">
 909:                                         {taskInstances.length === 0
 910:                                             ? "No tasks assigned to this group yet."
 911:                                             : "No tasks match the selected filter."}
 912:                                     </CardContent>
 913:                                 </Card>
 914:                             ) : (
 915:                                 <Card>
 916:                                     <CardContent className="p-0">
 917:                                         <Table>
 918:                                             <TableHeader>
 919:                                                 <TableRow>
 920:                                                     <TableHead>Task</TableHead>
 921:                                                     <TableHead>Assignment</TableHead>
 922:                                                     <TableHead>Date</TableHead>
 923:                                                     <TableHead>Progress</TableHead>
 924:                                                     <TableHead>Status</TableHead>
 925:                                                     <TableHead className="w-[40px]"></TableHead>
 926:                                                 </TableRow>
 927:                                             </TableHeader>
 928:                                             <TableBody>
 929:                                                 {filteredGroupedTasks.map((group) => {
 930:                                                     const isExpanded = expandedTaskGroups.has(group.name);
 931:                                                     const statusLabel =
 932:                                                         group.groupStatus === "completed"
 933:                                                             ? "Completed"
 934:                                                             : group.groupStatus === "overdue"
 935:                                                             ? "Overdue"
 936:                                                             : "Active";
 937:                                                     const statusVariant =
 938:                                                         group.groupStatus === "completed"
 939:                                                             ? "secondary"
 940:                                                             : group.groupStatus === "overdue"
 941:                                                             ? "destructive"
 942:                                                             : "outline";
 943:                                                     const dateLabel = formatTaskDate(group.dateForGroup);
 944: 
 945:                                                     return (
 946:                                                         <Fragment key={group.name}>
 947:                                                             <TableRow
 948:                                                                 className={group.isSingleAssignee ? "" : "cursor-pointer"}
 949:                                                                 onClick={() => {
 950:                                                                     if (!group.isSingleAssignee) {
 951:                                                                         toggleTaskGroup(group.name);
 952:                                                                     }
 953:                                                                 }}
 954:                                                             >
 955:                                                                 <TableCell className="font-medium">{group.name}</TableCell>
 956:                                                                 <TableCell>{group.assignmentLabel}</TableCell>
 957:                                                                 <TableCell>{dateLabel}</TableCell>
 958:                                                                 <TableCell>
 959:                                                                     {group.completedCount}/{group.totalCount} completed
 960:                                                                 </TableCell>
 961:                                                                 <TableCell>
 962:                                                                     <Badge variant={statusVariant}>{statusLabel}</Badge>
 963:                                                                 </TableCell>
 964:                                                                 <TableCell>
 965:                                                                     {!group.isSingleAssignee && (
 966:                                                                         <Button
 967:                                                                             variant="ghost"
 968:                                                                             size="icon"
 969:                                                                             className="h-8 w-8"
 970:                                                                             onClick={(event) => {
 971:                                                                                 event.stopPropagation();
 972:                                                                                 toggleTaskGroup(group.name);
 973:                                                                             }}
 974:                                                                         >
 975:                                                                             {isExpanded ? (
 976:                                                                                 <ChevronUp className="w-4 h-4" />
 977:                                                                             ) : (
 978:                                                                                 <ChevronDown className="w-4 h-4" />
 979:                                                                             )}
 980:                                                                         </Button>
 981:                                                                     )}
 982:                                                                 </TableCell>
 983:                                                             </TableRow>
 984: 
 985:                                                             {!group.isSingleAssignee && isExpanded && (
 986:                                                                 <TableRow>
 987:                                                                     <TableCell colSpan={6} className="bg-muted/20">
 988:                                                                         <Table>
 989:                                                                             <TableHeader>
 990:                                                                                 <TableRow>
 991:                                                                                     <TableHead>Student</TableHead>
 992:                                                                                     <TableHead>Date</TableHead>
 993:                                                                                     <TableHead>Time</TableHead>
 994:                                                                                     <TableHead>Status</TableHead>
 995:                                                                                 </TableRow>
 996:                                                                             </TableHeader>
 997:                                                                             <TableBody>
 998:                                                                                 {group.instances.map((task) => (
 999:                                                                                     <TableRow key={task.id}>
1000:                                                                                         <TableCell>{getStudentName(task.assignee_id)}</TableCell>
1001:                                                                                         <TableCell>{formatTaskDate(getTaskDate(task))}</TableCell>
1002:                                                                                         <TableCell>{formatTaskTime(task.start_time, task.end_time)}</TableCell>
1003:                                                                                         <TableCell>
1004:                                                                                             <Badge
1005:                                                                                                 variant={isTaskOverdue(task) ? "destructive" : task.status === "completed" ? "secondary" : "outline"}
1006:                                                                                             >
1007:                                                                                                 {formatTaskStatusBadge(task)}
1008:                                                                                             </Badge>
1009:                                                                                         </TableCell>
1010:                                                                                     </TableRow>
1011:                                                                                 ))}
1012:                                                                             </TableBody>
1013:                                                                         </Table>
1014:                                                                     </TableCell>
1015:                                                                 </TableRow>
1016:                                                             )}
1017:                                                         </Fragment>
1018:                                                     );
1019:                                                 })}
1020:                                             </TableBody>
1021:                                         </Table>
1022:                                     </CardContent>
1023:                                 </Card>
1024:                             )}
1025:                         </div>
1026: 
1027:                         <div className="space-y-6">
1028:                             <Card>
1029:                                 <CardHeader>
1030:                                     <CardTitle>Assign to Student</CardTitle>
1031:                                     <CardDescription>Assign tasks to an individual student.</CardDescription>
1032:                                 </CardHeader>
1033:                                 <CardContent className="p-0">
1034:                                     {students.length === 0 ? (
1035:                                         <div className="p-6 text-sm text-muted-foreground">
1036:                                             No students in this group yet.
1037:                                         </div>
1038:                                     ) : (
1039:                                         <Table>
1040:                                             <TableBody>
1041:                                                 {students.map((student) => (
1042:                                                     <TableRow key={student.student_id}>
1043:                                                         <TableCell>
1044:                                                             <div className="flex flex-col">
1045:                                                                 <span className="font-medium">{student.display_name}</span>
1046:                                                                 {student.email && (
1047:                                                                     <span className="text-xs text-muted-foreground">
1048:                                                                         {student.email}
1049:                                                                     </span>
1050:                                                                 )}
1051:                                                             </div>
1052:                                                         </TableCell>
1053:                                                         <TableCell className="text-right">
1054:                                                             <Button
1055:                                                                 variant="outline"
1056:                                                                 size="sm"
1057:                                                                 onClick={() => {
1058:                                                                     setAssignMode("individual");
1059:                                                                     setAssignStudent(student);
1060:                                                                     setAssignDialogOpen(true);
1061:                                                                 }}
1062:                                                             >
1063:                                                                 Assign
1064:                                                             </Button>
1065:                                                         </TableCell>
1066:                                                     </TableRow>
1067:                                                 ))}
1068:                                             </TableBody>
1069:                                         </Table>
1070:                                     )}
1071:                                 </CardContent>
1072:                             </Card>
1073:                         </div>
1074:                     </div>
1075:                 </TabsContent>
1076: 
1077:                 <TabsContent value="notes" className="space-y-6">
1078:                     <Card className="h-[500px] flex flex-col">
1079:                         <CardHeader className="pb-3 border-b">
1080:                             <CardTitle className="flex items-center gap-2">
1081:                                 <MessageSquare className="w-5 h-5" />
1082:                                 Notes
1083:                             </CardTitle>
1084:                         </CardHeader>
1085:                         <div className="flex-1 overflow-y-auto p-4 space-y-4">
1086:                             {notes.length === 0 ? (
1087:                                 <p className="text-center text-sm text-muted-foreground py-10">
1088:                                     No notes yet. Post an announcement or reminder.
1089:                                 </p>
1090:                             ) : (
1091:                                 notes.map((note) => (
1092:                                     <div key={note.id} className="bg-secondary/40 p-3 rounded-lg space-y-1">
1093:                                         <div className="flex items-center justify-between">
1094:                                             <span className="font-bold text-xs">{note.from_name}</span>
1095:                                             <span className="text-[10px] text-muted-foreground">
1096:                                                 {note.created_at ? new Date(note.created_at).toLocaleDateString() : ""}
1097:                                             </span>
1098:                                         </div>
1099:                                         {note.title && <p className="font-semibold text-sm text-accent">{note.title}</p>}
1100:                                         <p className="text-sm">{note.content}</p>
1101:                                         {note.to_user_name && (
1102:                                             <div className="flex items-center gap-2 mt-2">
1103:                                                 <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
1104:                                                     <Users className="w-2 h-2" /> To: {note.to_user_name}
1105:                                                 </Badge>
1106:                                             </div>
1107:                                         )}
1108:                                     </div>
1109:                                 ))
1110:                             )}
1111:                         </div>
1112:                         <div className="p-4 border-t bg-background">
1113:                             <div className="space-y-3">
1114:                                 <Input
1115:                                     placeholder="Title (optional)"
1116:                                     value={newNoteTitle}
1117:                                     onChange={(e) => setNewNoteTitle(e.target.value)}
1118:                                     className="h-8 text-sm"
1119:                                 />
1120:                                 <Textarea
1121:                                     placeholder="Write a note..."
1122:                                     value={newNote}
1123:                                     onChange={(e) => setNewNote(e.target.value)}
1124:                                     className="min-h-[80px] text-sm resize-none"
1125:                                 />
1126:                                 <div className="flex items-center justify-between gap-2">
1127:                                     <Select value={noteTargetStudent} onValueChange={setNoteTargetStudent}>
1128:                                         <SelectTrigger className="flex-1 h-8 text-xs">
1129:                                             <div className="flex items-center gap-2">
1130:                                                 <Users className="w-3 h-3" />
1131:                                                 <SelectValue placeholder="Send to..." />
1132:                                             </div>
1133:                                         </SelectTrigger>
1134:                                         <SelectContent>
1135:                                             <SelectItem value="all">
1136:                                                 <span className="flex items-center gap-2">
1137:                                                     <Globe className="w-3 h-3" /> All Students
1138:                                                 </span>
1139:                                             </SelectItem>
1140:                                             {students.map((student) => (
1141:                                                 <SelectItem key={student.student_id} value={student.student_id}>
1142:                                                     {student.display_name}
1143:                                                 </SelectItem>
1144:                                             ))}
1145:                                         </SelectContent>
1146:                                     </Select>
1147:                                     <Button size="sm" onClick={handleSendNote} disabled={sendingNote || !newNote.trim()}>
1148:                                         {sendingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
1149:                                         <span className="ml-2">Post</span>
1150:                                     </Button>
1151:                                 </div>
1152:                             </div>
1153:                         </div>
1154:                     </Card>
1155:                 </TabsContent>
1156:             </Tabs>
1157: 
1158:             {/* Remove Student Confirmation Dialog */}
1159:             <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
1160:                 <AlertDialogContent>
1161:                     <AlertDialogHeader>
1162:                         <AlertDialogTitle>Remove Student?</AlertDialogTitle>
1163:                         <AlertDialogDescription>
1164:                             Are you sure you want to remove <span className="font-semibold">{studentToRemove?.display_name}</span> from this group?
1165:                             They will no longer have access to group tasks and can rejoin using the join code.
1166:                         </AlertDialogDescription>
1167:                     </AlertDialogHeader>
1168:                     <AlertDialogFooter>
1169:                         <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
1170:                         <AlertDialogAction
1171:                             onClick={handleRemoveStudent}
1172:                             disabled={removing}
1173:                             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
1174:                         >
1175:                             {removing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
1176:                             Remove
1177:                         </AlertDialogAction>
1178:                     </AlertDialogFooter>
1179:                 </AlertDialogContent>
1180:             </AlertDialog>
1181: 
1182:             <AssignTaskModal
1183:                 open={assignDialogOpen}
1184:                 onOpenChange={setAssignDialogOpen}
1185:                 mode={assignMode}
1186:                 groupId={group.id}
1187:                 groupName={group.name}
1188:                 studentId={assignStudent?.student_id}
1189:                 studentName={assignStudent?.display_name}
1190:                 onAssigned={fetchData}
1191:             />
1192:         </div>
1193:     );
1194: }
1195: 
```

## useEffect Inventory
- Line 313: deps = [fetchData]
  - Uses supabase.channel(): No
  - Calls .subscribe(): No
  - Calls removeChannel(): No
  - Calls fetchData(): Yes
  - Direct setState calls detected: No
- Line 317: deps = [user, groupId, fetchData]
  - Uses supabase.channel(): No
  - Calls .subscribe(): No
  - Calls removeChannel(): No
  - Calls fetchData(): Yes
  - Direct setState calls detected: No
- Line 327: deps = [memberIds]
  - Uses supabase.channel(): No
  - Calls .subscribe(): No
  - Calls removeChannel(): No
  - Calls fetchData(): No
  - Direct setState calls detected: No
- Line 331: deps = [groupId]
  - Uses supabase.channel(): No
  - Calls .subscribe(): Yes
  - Calls removeChannel(): Yes
  - Calls fetchData(): Yes
  - Direct setState calls detected: No

## useCallback Inventory
- Line 176: fetchData deps = [null]

## useMemo Inventory
- Line 322: memberIds deps = [students]

## useState Inventory
- Line 1: [import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";]
- Line 135: [loading, setLoading] = true
- Line 136: [const [group, setGroup] = useState<GroupInfo | null>(null);]
- Line 137: [const [students, setStudents] = useState<StudentWithProgress[]>([]);]
- Line 138: [const [notes, setNotes] = useState<Note[]>([]);]
- Line 139: [const [taskInstances, setTaskInstances] = useState<TaskInstance[]>([]);]
- Line 140: [tasksLoading, setTasksLoading] = false
- Line 141: [const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | "active" | "overdue" | "completed">("all");]
- Line 142: [const [expandedTaskGroups, setExpandedTaskGroups] = useState<Set<string>>(new Set());]
- Line 145: [newNote, setNewNote] = ""
- Line 146: [newNoteTitle, setNewNoteTitle] = ""
- Line 147: [const [noteTargetStudent, setNoteTargetStudent] = useState<string>("all"); // "all" or student_id]
- Line 148: [sendingNote, setSendingNote] = false
- Line 149: [deleting, setDeleting] = false
- Line 152: [const [filterStatus, setFilterStatus] = useState<string>("all");]
- Line 153: [const [sortField, setSortField] = useState<SortField>("name");]
- Line 154: [const [sortOrder, setSortOrder] = useState<SortOrder>("asc");]
- Line 155: [copied, setCopied] = false
- Line 156: [showQRDialog, setShowQRDialog] = false
- Line 159: [const [studentToRemove, setStudentToRemove] = useState<StudentWithProgress | null>(null);]
- Line 160: [removing, setRemoving] = false
- Line 163: [assignDialogOpen, setAssignDialogOpen] = false
- Line 164: [const [assignMode, setAssignMode] = useState<"group" | "individual">("group");]
- Line 165: [const [assignStudent, setAssignStudent] = useState<StudentWithProgress | null>(null);]

## useRef Inventory
- Line 1: import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
- Line 312: fetchDataRef = fetchData
- Line 326: const memberIdsRef = useRef<string[]>([]);

## Supabase Client Source
- Imported as singleton: `import { supabase } from "@/integrations/supabase/client";`

## Tab Switching / Remount Check
- GroupDetail uses query param tab switching via `useSearchParams` and `Tabs` with `activeTab` derived from `?tab=`.
- This is the same route (`/groups/:groupId`) and does not unmount/remount the component on tab switch; it conditionally renders tab content.