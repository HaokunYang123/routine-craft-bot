import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { queryKeys } from '@/lib/queries/keys';

/**
 * Client entity from class_sessions table
 */
export interface Client {
  id: string;
  name: string;
  join_code: string;
  is_active: boolean;
  default_template_id: string | null;
  created_at: string;
  coach_id: string;
}

/**
 * Page response for infinite query
 */
export interface ClientsPage {
  data: Client[];
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Fetch a single page of clients using cursor-based pagination.
 * Cursor is the created_at timestamp of the last item.
 */
async function fetchClientsPage({
  pageParam,
  userId,
  pageSize,
}: {
  pageParam: string | null;
  userId: string;
  pageSize: number;
}): Promise<ClientsPage> {
  // Build query
  let query = supabase
    .from('class_sessions')
    .select('*', { count: 'exact' })
    .eq('coach_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  // Apply cursor for pagination (items OLDER than cursor)
  if (pageParam) {
    query = query.lt('created_at', pageParam);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const lastItem = data?.[data.length - 1];
  return {
    data: (data ?? []) as Client[],
    nextCursor: data && data.length === pageSize ? lastItem?.created_at ?? null : null,
    totalCount: count ?? 0,
  };
}

/**
 * Hook for fetching clients with infinite scroll pagination.
 *
 * Uses cursor-based pagination for reliable results even with concurrent inserts.
 * The cursor is the created_at timestamp, fetching items older than the last seen.
 *
 * @param pageSize - Number of items per page (default: 25)
 * @returns Infinite query result with paginated client data
 *
 * @example
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteClients(25);
 * const allClients = data?.pages.flatMap(page => page.data) ?? [];
 */
export function useInfiniteClients(pageSize: number = 25) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.clients.infinite(user?.id ?? '', pageSize),
    queryFn: ({ pageParam }) =>
      fetchClientsPage({
        pageParam,
        userId: user!.id,
        pageSize,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
  });
}
