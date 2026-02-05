# Realtime Subscription Exact Snippet

## useEffect Block (Exact Lines)
```tsx
    useEffect(() => {
        if (!groupId) return;
        const channel = supabase
            .channel(`group-detail-tasks-${groupId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "task_instances" },
                (payload) => {
                    const assigneeId = payload?.new?.assignee_id as string | undefined;
                    const currentMemberIds = memberIdsRef.current;
                    if (currentMemberIds.length > 0 && assigneeId && !currentMemberIds.includes(assigneeId)) {
                        return;
                    }
                    fetchDataRef.current();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId]);
```

## supabase.channel() Line (Exact)
```tsx
            .channel(`group-detail-tasks-${groupId}`)
```

## Dependency Array (Exact)
```tsx
    }, [groupId]);
```

## Cleanup Function (Exact)
```tsx
        return () => {
            supabase.removeChannel(channel);
        };
```

## Console/Status Logging Inside Subscription
- None found.