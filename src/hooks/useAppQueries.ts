import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, fetchAppData } from '../lib/api';

export function useAuthQuery() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAppDataQuery() {
  return useQuery({
    queryKey: ['app-data'],
    queryFn: fetchAppData,
    staleTime: 120000,
    retry: false,
  });
}

// Preset mapping for admin stats
const presetMap: Record<string, string> = {
  'today':      'day',
  'yesterday':  'yesterday',
  'last-week':  'week',
  'last-month': 'month',
  'all-time':   'all',
  'custom':     'all',
};

export function useAdminStatsQuery(filter: any) {
  return useQuery({
    queryKey: ['admin-stats', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('range', presetMap[filter.preset] || 'all');
      if (filter.preset === 'custom') {
        if (filter.range.start) params.set('from', filter.range.start.toISOString());
        if (filter.range.end)   params.set('to',   filter.range.end.toISOString());
      }
      const [statsRes, logsRes] = await Promise.all([
        apiFetch(`/api/stats?${params.toString()}`),
        apiFetch('/api/logs')
      ]);
      const stats = statsRes.ok ? await statsRes.json() : null;
      let logs = logsRes.ok ? await logsRes.json() : [];
      logs = logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { stats, logs };
    },
    staleTime: 60000,
  });
}

export function useAppEventsQuery(filter: any) {
  return useQuery({
    queryKey: ['app-events', filter],
    queryFn: async () => {
      const { start, end } = filter.range;
      const startIso = start?.toISOString();
      const endIso = end?.toISOString();
      const res = await apiFetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      let evts = await res.json() || [];
      if (startIso) evts = evts.filter((e: any) => e.created_at >= startIso);
      if (endIso) evts = evts.filter((e: any) => e.created_at <= endIso);
      return evts;
    },
    staleTime: 60000,
  });
}


export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      const isEdit = !!id;
      const url = isEdit ? `/api/students/${id}` : '/api/students';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save student');
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['app-data'] });
      const previousData = queryClient.getQueryData(['app-data']);

      if (previousData) {
        queryClient.setQueryData(['app-data'], (old: any) => {
          if (!old) return old;
          const newStudents = [...(old.students || [])];
          if (id) {
            const index = newStudents.findIndex((s) => s.id === id);
            if (index !== -1) {
              newStudents[index] = { ...newStudents[index], ...data };
            }
          } else {
            newStudents.push({ ...data, id: 'temp-id-' + Date.now() });
          }
          return { ...old, students: newStudents };
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['app-data'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['app-data'] });
    },
  });
}
