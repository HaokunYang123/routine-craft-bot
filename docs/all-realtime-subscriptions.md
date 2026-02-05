# All Realtime Subscription Matches

## Pattern: supabase.channel(
### ./docs/realtime-subscription-exact.md:29
```tsx
  19:                 }
  20:             )
  21:             .subscribe();
  22: 
  23:         return () => {
  24:             supabase.removeChannel(channel);
  25:         };
  26:     }, [groupId]);
  27: ```
  28: 
  29: ## supabase.channel() Line (Exact)
  30: ```tsx
  31:             .channel(`group-detail-tasks-${groupId}`)
  32: ```
  33: 
  34: ## Dependency Array (Exact)
  35: ```tsx
  36:     }, [groupId]);
  37: ```
  38: 
  39: ## Cleanup Function (Exact)
```

### ./docs/realtime-debug-dump.md:1204
```tsx
1194: 1190:                 onAssigned={fetchData}
1195: 1191:             />
1196: 1192:         </div>
1197: 1193:     );
1198: 1194: }
1199: 1195: 
1200: ```
1201: 
1202: ## useEffect Inventory
1203: - Line 313: deps = [fetchData]
1204:   - Uses supabase.channel(): No
1205:   - Calls .subscribe(): No
1206:   - Calls removeChannel(): No
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
```

### ./docs/realtime-debug-dump.md:1210
```tsx
1200: ```
1201: 
1202: ## useEffect Inventory
1203: - Line 313: deps = [fetchData]
1204:   - Uses supabase.channel(): No
1205:   - Calls .subscribe(): No
1206:   - Calls removeChannel(): No
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
```

### ./docs/realtime-debug-dump.md:1216
```tsx
1206:   - Calls removeChannel(): No
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
1222:   - Uses supabase.channel(): No
1223:   - Calls .subscribe(): Yes
1224:   - Calls removeChannel(): Yes
1225:   - Calls fetchData(): Yes
1226:   - Direct setState calls detected: No
```

### ./docs/realtime-debug-dump.md:1222
```tsx
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
1222:   - Uses supabase.channel(): No
1223:   - Calls .subscribe(): Yes
1224:   - Calls removeChannel(): Yes
1225:   - Calls fetchData(): Yes
1226:   - Direct setState calls detected: No
1227: 
1228: ## useCallback Inventory
1229: - Line 176: fetchData deps = [null]
1230: 
1231: ## useMemo Inventory
1232: - Line 322: memberIds deps = [students]
```

## Pattern: .subscribe(
### ./src/pages/student/StudentHome.tsx:135
```tsx
 125:         {
 126:           event: '*',
 127:           schema: 'public',
 128:           table: 'task_instances',
 129:           filter: `assignee_id=eq.${user.id}`,
 130:         },
 131:         () => {
 132:           fetchTasks(); // Refetch on any change
 133:         }
 134:       )
 135:       .subscribe();
 136: 
 137:     return () => {
 138:       supabase.removeChannel(channel);
 139:     };
 140:   }, [user]);
 141: 
 142:   // Refetch on tab visibility change (handles backgrounded tabs)
 143:   useEffect(() => {
 144:     const handleVisibilityChange = () => {
 145:       if (document.visibilityState === 'visible' && user) {
```

### ./src/pages/student/StudentCalendar.tsx:78
```tsx
  68:           event: '*',
  69:           schema: 'public',
  70:           table: 'task_instances',
  71:           filter: `assignee_id=eq.${user.id}`,
  72:         },
  73:         (payload) => {
  74:           console.log('[StudentCalendar] Realtime update:', payload.eventType);
  75:           fetchTasks(); // Refetch on any change
  76:         }
  77:       )
  78:       .subscribe();
  79: 
  80:     return () => {
  81:       supabase.removeChannel(channel);
  82:     };
  83:   }, [user, currentMonth]); // Include currentMonth to resubscribe when month changes
  84: 
  85:   // Refetch on tab visibility change (handles backgrounded tabs)
  86:   useEffect(() => {
  87:     const handleVisibilityChange = () => {
  88:       if (document.visibilityState === 'visible' && user) {
```

### ./src/pages/GroupDetail.tsx:347
```tsx
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
```

### ./src/hooks/useRealtimeSubscription.ts:72
```tsx
  62:         },
  63:         (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
  64:           console.log(`[Realtime] ${channelName}:`, payload.eventType, 'new:', payload.new);
  65: 
  66:           // Invalidate all specified query keys (updates flow through React Query cache)
  67:           queryKeysToInvalidate.forEach((queryKey) => {
  68:             queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
  69:           });
  70:         }
  71:       )
  72:       .subscribe((status, err) => {
  73:         console.log(`[Realtime] ${channelName} status:`, status);
  74:         if (status === 'CHANNEL_ERROR') {
  75:           console.error(`[Realtime] ${channelName} error:`, err);
  76:         }
  77:         if (status === 'SUBSCRIBED') {
  78:           console.log(`[Realtime] ${channelName} subscribed with filter:`, filter || '(none)');
  79:         }
  80:       });
  81: 
  82:     channelRef.current = channel;
```

### ./docs/realtime-subscription-exact.md:21
```tsx
  11:                 { event: "UPDATE", schema: "public", table: "task_instances" },
  12:                 (payload) => {
  13:                     const assigneeId = payload?.new?.assignee_id as string | undefined;
  14:                     const currentMemberIds = memberIdsRef.current;
  15:                     if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
  16:                         return;
  17:                     }
  18:                     fetchDataRef.current();
  19:                 }
  20:             )
  21:             .subscribe();
  22: 
  23:         return () => {
  24:             supabase.removeChannel(channel);
  25:         };
  26:     }, [groupId]);
  27: ```
  28: 
  29: ## supabase.channel() Line (Exact)
  30: ```tsx
  31:             .channel(`group-detail-tasks-${groupId}`)
```

### ./docs/realtime-debug-dump.md:351
```tsx
 341:  337:                 { event: "UPDATE", schema: "public", table: "task_instances" },
 342:  338:                 (payload) => {
 343:  339:                     const assigneeId = payload?.new?.assignee_id as string | undefined;
 344:  340:                     const currentMemberIds = memberIdsRef.current;
 345:  341:                     if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
 346:  342:                         return;
 347:  343:                     }
 348:  344:                     fetchDataRef.current();
 349:  345:                 }
 350:  346:             )
 351:  347:             .subscribe();
 352:  348: 
 353:  349:         return () => {
 354:  350:             supabase.removeChannel(channel);
 355:  351:         };
 356:  352:     }, [groupId]);
 357:  353: 
 358:  354:     const handleSendNote = async () => {
 359:  355:         if (!newNote.trim() || !user || !groupId) return;
 360:  356:         setSendingNote(true);
 361:  357: 
```

### ./docs/realtime-debug-dump.md:1205
```tsx
1195: 1191:             />
1196: 1192:         </div>
1197: 1193:     );
1198: 1194: }
1199: 1195: 
1200: ```
1201: 
1202: ## useEffect Inventory
1203: - Line 313: deps = [fetchData]
1204:   - Uses supabase.channel(): No
1205:   - Calls .subscribe(): No
1206:   - Calls removeChannel(): No
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
```

### ./docs/realtime-debug-dump.md:1211
```tsx
1201: 
1202: ## useEffect Inventory
1203: - Line 313: deps = [fetchData]
1204:   - Uses supabase.channel(): No
1205:   - Calls .subscribe(): No
1206:   - Calls removeChannel(): No
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
```

### ./docs/realtime-debug-dump.md:1217
```tsx
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
1222:   - Uses supabase.channel(): No
1223:   - Calls .subscribe(): Yes
1224:   - Calls removeChannel(): Yes
1225:   - Calls fetchData(): Yes
1226:   - Direct setState calls detected: No
1227: 
```

### ./docs/realtime-debug-dump.md:1223
```tsx
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
1222:   - Uses supabase.channel(): No
1223:   - Calls .subscribe(): Yes
1224:   - Calls removeChannel(): Yes
1225:   - Calls fetchData(): Yes
1226:   - Direct setState calls detected: No
1227: 
1228: ## useCallback Inventory
1229: - Line 176: fetchData deps = [null]
1230: 
1231: ## useMemo Inventory
1232: - Line 322: memberIds deps = [students]
1233: 
```

## Pattern: removeChannel(
### ./src/pages/student/StudentHome.tsx:138
```tsx
 128:           table: 'task_instances',
 129:           filter: `assignee_id=eq.${user.id}`,
 130:         },
 131:         () => {
 132:           fetchTasks(); // Refetch on any change
 133:         }
 134:       )
 135:       .subscribe();
 136: 
 137:     return () => {
 138:       supabase.removeChannel(channel);
 139:     };
 140:   }, [user]);
 141: 
 142:   // Refetch on tab visibility change (handles backgrounded tabs)
 143:   useEffect(() => {
 144:     const handleVisibilityChange = () => {
 145:       if (document.visibilityState === 'visible' && user) {
 146:         fetchTasks();
 147:         fetchConnectedGroups();
 148:         fetchCoachNotes();
```

### ./src/pages/student/StudentCalendar.tsx:81
```tsx
  71:           filter: `assignee_id=eq.${user.id}`,
  72:         },
  73:         (payload) => {
  74:           console.log('[StudentCalendar] Realtime update:', payload.eventType);
  75:           fetchTasks(); // Refetch on any change
  76:         }
  77:       )
  78:       .subscribe();
  79: 
  80:     return () => {
  81:       supabase.removeChannel(channel);
  82:     };
  83:   }, [user, currentMonth]); // Include currentMonth to resubscribe when month changes
  84: 
  85:   // Refetch on tab visibility change (handles backgrounded tabs)
  86:   useEffect(() => {
  87:     const handleVisibilityChange = () => {
  88:       if (document.visibilityState === 'visible' && user) {
  89:         console.log('[StudentCalendar] Tab visible, refetching');
  90:         fetchTasks();
  91:       }
```

### ./docs/realtime-subscription-exact.md:24
```tsx
  14:                     const currentMemberIds = memberIdsRef.current;
  15:                     if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
  16:                         return;
  17:                     }
  18:                     fetchDataRef.current();
  19:                 }
  20:             )
  21:             .subscribe();
  22: 
  23:         return () => {
  24:             supabase.removeChannel(channel);
  25:         };
  26:     }, [groupId]);
  27: ```
  28: 
  29: ## supabase.channel() Line (Exact)
  30: ```tsx
  31:             .channel(`group-detail-tasks-${groupId}`)
  32: ```
  33: 
  34: ## Dependency Array (Exact)
```

### ./docs/realtime-subscription-exact.md:42
```tsx
  32: ```
  33: 
  34: ## Dependency Array (Exact)
  35: ```tsx
  36:     }, [groupId]);
  37: ```
  38: 
  39: ## Cleanup Function (Exact)
  40: ```tsx
  41:         return () => {
  42:             supabase.removeChannel(channel);
  43:         };
  44: ```
  45: 
  46: ## Console/Status Logging Inside Subscription
  47: - None found.
```

### ./docs/realtime-debug-dump.md:354
```tsx
 344:  340:                     const currentMemberIds = memberIdsRef.current;
 345:  341:                     if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
 346:  342:                         return;
 347:  343:                     }
 348:  344:                     fetchDataRef.current();
 349:  345:                 }
 350:  346:             )
 351:  347:             .subscribe();
 352:  348: 
 353:  349:         return () => {
 354:  350:             supabase.removeChannel(channel);
 355:  351:         };
 356:  352:     }, [groupId]);
 357:  353: 
 358:  354:     const handleSendNote = async () => {
 359:  355:         if (!newNote.trim() || !user || !groupId) return;
 360:  356:         setSendingNote(true);
 361:  357: 
 362:  358:         try {
 363:  359:             const targetStudentId = noteTargetStudent === "all" ? null : noteTargetStudent;
 364:  360:             const { error } = await supabase.from("notes").insert({
```

### ./docs/realtime-debug-dump.md:1206
```tsx
1196: 1192:         </div>
1197: 1193:     );
1198: 1194: }
1199: 1195: 
1200: ```
1201: 
1202: ## useEffect Inventory
1203: - Line 313: deps = [fetchData]
1204:   - Uses supabase.channel(): No
1205:   - Calls .subscribe(): No
1206:   - Calls removeChannel(): No
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
```

### ./docs/realtime-debug-dump.md:1212
```tsx
1202: ## useEffect Inventory
1203: - Line 313: deps = [fetchData]
1204:   - Uses supabase.channel(): No
1205:   - Calls .subscribe(): No
1206:   - Calls removeChannel(): No
1207:   - Calls fetchData(): Yes
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
1222:   - Uses supabase.channel(): No
```

### ./docs/realtime-debug-dump.md:1218
```tsx
1208:   - Direct setState calls detected: No
1209: - Line 317: deps = [user, groupId, fetchData]
1210:   - Uses supabase.channel(): No
1211:   - Calls .subscribe(): No
1212:   - Calls removeChannel(): No
1213:   - Calls fetchData(): Yes
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
1222:   - Uses supabase.channel(): No
1223:   - Calls .subscribe(): Yes
1224:   - Calls removeChannel(): Yes
1225:   - Calls fetchData(): Yes
1226:   - Direct setState calls detected: No
1227: 
1228: ## useCallback Inventory
```

### ./docs/realtime-debug-dump.md:1224
```tsx
1214:   - Direct setState calls detected: No
1215: - Line 327: deps = [memberIds]
1216:   - Uses supabase.channel(): No
1217:   - Calls .subscribe(): No
1218:   - Calls removeChannel(): No
1219:   - Calls fetchData(): No
1220:   - Direct setState calls detected: No
1221: - Line 331: deps = [groupId]
1222:   - Uses supabase.channel(): No
1223:   - Calls .subscribe(): Yes
1224:   - Calls removeChannel(): Yes
1225:   - Calls fetchData(): Yes
1226:   - Direct setState calls detected: No
1227: 
1228: ## useCallback Inventory
1229: - Line 176: fetchData deps = [null]
1230: 
1231: ## useMemo Inventory
1232: - Line 322: memberIds deps = [students]
1233: 
1234: ## useState Inventory
```

### ./src/pages/GroupDetail.tsx:350
```tsx
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
```

### ./src/hooks/useRealtimeSubscription.ts:87
```tsx
  77:         if (status === 'SUBSCRIBED') {
  78:           console.log(`[Realtime] ${channelName} subscribed with filter:`, filter || '(none)');
  79:         }
  80:       });
  81: 
  82:     channelRef.current = channel;
  83: 
  84:     // Cleanup on unmount (immediate cleanup on navigation)
  85:     return () => {
  86:       if (channelRef.current) {
  87:         supabase.removeChannel(channelRef.current);
  88:         channelRef.current = null;
  89:       }
  90:     };
  91:   }, [channelName, table, filter, event, enabled, queryClient, queryKeysToInvalidate]);
  92: 
  93:   return { channel: channelRef.current };
  94: }
  95: 
```

## Pattern: "coach-tasks"
- No matches found.

## Pattern: "group-detail-tasks"
- No matches found.

## Pattern: "postgres_changes"
### ./src/pages/GroupDetail.tsx:336
```tsx
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
```

### ./docs/realtime-debug-dump.md:340
```tsx
 330:  326:     const memberIdsRef = useRef<string[]>([]);
 331:  327:     useEffect(() => {
 332:  328:         memberIdsRef.current = memberIds;
 333:  329:     }, [memberIds]);
 334:  330: 
 335:  331:     useEffect(() => {
 336:  332:         if (!groupId) return;
 337:  333:         const channel = supabase
 338:  334:             .channel(`group-detail-tasks-${groupId}`)
 339:  335:             .on(
 340:  336:                 "postgres_changes",
 341:  337:                 { event: "UPDATE", schema: "public", table: "task_instances" },
 342:  338:                 (payload) => {
 343:  339:                     const assigneeId = payload?.new?.assignee_id as string | undefined;
 344:  340:                     const currentMemberIds = memberIdsRef.current;
 345:  341:                     if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
 346:  342:                         return;
 347:  343:                     }
 348:  344:                     fetchDataRef.current();
 349:  345:                 }
 350:  346:             )
```

### ./docs/realtime-subscription-exact.md:10
```tsx
   1: # Realtime Subscription Exact Snippet
   2: 
   3: ## useEffect Block (Exact Lines)
   4: ```tsx
   5:     useEffect(() => {
   6:         if (!groupId) return;
   7:         const channel = supabase
   8:             .channel(`group-detail-tasks-${groupId}`)
   9:             .on(
  10:                 "postgres_changes",
  11:                 { event: "UPDATE", schema: "public", table: "task_instances" },
  12:                 (payload) => {
  13:                     const assigneeId = payload?.new?.assignee_id as string | undefined;
  14:                     const currentMemberIds = memberIdsRef.current;
  15:                     if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
  16:                         return;
  17:                     }
  18:                     fetchDataRef.current();
  19:                 }
  20:             )
```
