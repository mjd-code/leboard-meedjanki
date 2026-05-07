import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { Category, MasterGoal, Student, Group } from '@/types';

const DEFAULT_APP_SETTINGS = {
  primaryColor: { h: 144, s: 29, l: 20 },
  accentColor: { h: 34, s: 62, l: 57 },
  bgColor: { h: 79, s: 29, l: 92 },
  textColor: { h: 144, s: 18, l: 15 },
  appName: 'Tiny Tree',
  badgeTitle: 'Bonsai Collection',
  heroTitle: 'Bonsai',
  heroSubtitle: 'The fascinating and amazing world of Bonsai.',
};

async function readCollection<T = any>(name: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as T[];
  } catch (e) {
    console.warn(`[firestore] read ${name} failed`, e);
    return [];
  }
}

export async function fetchAppData() {
  if (typeof window === 'undefined') {
    return { categories: [], masterGoals: [], students: [], groups: [], appSettings: DEFAULT_APP_SETTINGS };
  }
  const [categories, masterGoals, students, groups, settingsSnap] = await Promise.all([
    readCollection<Category>('categories'),
    readCollection<MasterGoal>('master_goals'),
    readCollection<Student>('students'),
    readCollection<Group>('groups'),
    getDoc(doc(db, 'settings', 'app')).catch(() => null),
  ]);

  let appSettings: any = settingsSnap?.exists() ? settingsSnap.data() : {};
  if (!appSettings || !appSettings.primaryColor) {
    appSettings = { ...DEFAULT_APP_SETTINGS, ...appSettings };
  }
  if (typeof document !== 'undefined' && appSettings.appName) document.title = appSettings.appName;

  return { categories, masterGoals, students, groups, appSettings };
}

export function useAuthQuery() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      return { authenticated: !!token };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAppDataQuery() {
  return useQuery({
    queryKey: ['app-data'],
    queryFn: fetchAppData,
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useAdminStatsQuery(_filter: any) {
  return useQuery({
    queryKey: ['admin-stats', _filter],
    queryFn: async () => {
      const logs = await readCollection<any>('logs');
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { stats: null as any, logs };
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
      let evts = await readCollection<any>('events');
      if (startIso) evts = evts.filter((e) => e.created_at >= startIso);
      if (endIso) evts = evts.filter((e) => e.created_at <= endIso);
      return evts;
    },
    staleTime: 60000,
  });
}

export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        await updateDoc(doc(db, 'students', id), data);
        return { id, ...data };
      }
      const ref = await addDoc(collection(db, 'students'), data);
      return { id: ref.id, ...data };
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
            if (index !== -1) newStudents[index] = { ...newStudents[index], ...data };
          } else {
            newStudents.push({ ...data, id: 'temp-id-' + Date.now() });
          }
          return { ...old, students: newStudents };
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) queryClient.setQueryData(['app-data'], context.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['app-data'] });
    },
  });
}
