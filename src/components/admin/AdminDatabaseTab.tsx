import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { apiFetch } from '../../lib/api';
import { dedupeAssignments } from '../../lib/assignGoals';
import { DataTable } from '@/components/ui/DataTable';
import { PopoverSelect } from '@/components/ui/PopoverSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Database, Loader2, Wand2 } from 'lucide-react';

type CollectionKey = 'students' | 'masterGoals' | 'categories' | 'posts' | 'logs';

const COLLECTIONS: { key: CollectionKey; label: string; endpoint: string; filterCol: string }[] = [
  { key: 'students',    label: 'Students',   endpoint: '/api/students',    filterCol: 'name' },
  { key: 'masterGoals', label: 'Goals',      endpoint: '/api/masterGoals', filterCol: 'title' },
  { key: 'categories',  label: 'Categories', endpoint: '/api/categories',  filterCol: 'name' },
  { key: 'posts',       label: 'Posts',      endpoint: '/api/posts',       filterCol: 'title' },
  { key: 'logs',        label: 'Logs',       endpoint: '/api/logs',        filterCol: 'action' },
];

function buildColumns(rows: any[], filterCol: string): ColumnDef<any>[] {
  const selectCol: ColumnDef<any> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Pilih semua"
        className="h-4 w-4"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Pilih baris"
        className="h-4 w-4"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
  if (!rows.length) return [selectCol, { accessorKey: 'id', header: 'id', cell: ({ row }) => <span className="text-muted-foreground">{row.original.id || '-'}</span> }];
  const keys = Array.from(rows.reduce<Set<string>>((s, r) => { Object.keys(r || {}).forEach(k => s.add(k)); return s; }, new Set()));
  const ordered = [filterCol, 'id', ...keys.filter(k => k !== filterCol && k !== 'id')];
  const dataCols: ColumnDef<any>[] = ordered.slice(0, 8).map((k) => ({
    accessorKey: k,
    header: k,
    cell: ({ row }) => {
      const v = (row.original as any)[k];
      if (v == null) return <span className="text-muted-foreground">—</span>;
      if (typeof v === 'object') return <span className="font-mono text-[10px] text-muted-foreground line-clamp-1 max-w-[280px]">{JSON.stringify(v)}</span>;
      const s = String(v);
      return <span className="text-sm text-foreground line-clamp-1 max-w-[320px]" title={s}>{s}</span>;
    },
  }));
  return [selectCol, ...dataCols];
}

export function AdminDatabaseTab() {
  const [active, setActive] = useState<CollectionKey>('students');
  const meta = COLLECTIONS.find(c => c.key === active)!;
  const queryClient = useQueryClient();
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [healPreview, setHealPreview] = useState<
    | null
    | {
        affected: { id: string; name: string; before: number; after: number; dupCount: number; orphanCount: number; cleaned: any[] }[];
        run: () => Promise<void>;
      }
  >(null);
  const [healing, setHealing] = useState(false);
  const [healResult, setHealResult] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['db-browser', meta.endpoint],
    queryFn: async () => {
      const res = await apiFetch(meta.endpoint);
      if (!res.ok) throw new Error(`Failed to load ${meta.label}`);
      const json = await res.json();
      return Array.isArray(json) ? json : (json.items || json.data || []);
    },
  });

  const columns = useMemo(() => buildColumns(data, meta.filterCol), [data, meta.filterCol]);

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    setBusy(true);
    try {
      await Promise.all(bulkDeleteIds.map(id =>
        apiFetch(`${meta.endpoint}/${id}`, { method: 'DELETE' }).catch(() => null)
      ));
      await queryClient.invalidateQueries({ queryKey: ['db-browser', meta.endpoint] });
      await queryClient.invalidateQueries({ queryKey: ['app-data'] });
    } finally {
      setBusy(false);
      setBulkDeleteIds(null);
    }
  };

  const analyzeDuplicateAssignments = async () => {
    setHealResult(null);
    const [stRes, mgRes] = await Promise.all([
      apiFetch('/api/students'),
      apiFetch('/api/masterGoals'),
    ]);
    if (!stRes.ok || !mgRes.ok) {
      setHealResult('Gagal memuat students / masterGoals.');
      return;
    }
    const stJson = await stRes.json();
    const mgJson = await mgRes.json();
    const students: any[] = Array.isArray(stJson) ? stJson : stJson.items || stJson.data || [];
    const masterGoals: any[] = Array.isArray(mgJson) ? mgJson : mgJson.items || mgJson.data || [];
    const validGoalIds = new Set<string>(masterGoals.map((g) => g.id).filter(Boolean));

    const clean = (list: any[] | undefined) => {
      const deduped = dedupeAssignments(list);
      return deduped.filter((a) => validGoalIds.has(a.goalId));
    };

    const affected = students
      .map((s) => {
        const before = s.assignedGoals?.length ?? 0;
        const cleaned = clean(s.assignedGoals);
        const after = cleaned.length;
        const dupCount = before - dedupeAssignments(s.assignedGoals).length;
        const orphanCount = dedupeAssignments(s.assignedGoals).length - after;
        return { id: s.id, name: s.name || s.id, before, after, dupCount, orphanCount, cleaned };
      })
      .filter((row) => row.before !== row.after);

    if (affected.length === 0) {
      setHealResult(`Tidak ada masalah terdeteksi. (${validGoalIds.size} master goals aktif)`);
      return;
    }

    setHealPreview({
      affected,
      run: async () => {
        setHealing(true);
        try {
          let healed = 0;
          for (const row of affected) {
            await apiFetch(`/api/students/${row.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assignedGoals: row.cleaned }),
            }).catch(() => null);
            healed += 1;
          }
          await queryClient.invalidateQueries({ queryKey: ['db-browser', '/api/students'] });
          await queryClient.invalidateQueries({ queryKey: ['app-data'] });
          setHealResult(`Selesai. ${healed} student diperbaiki.`);
        } finally {
          setHealing(false);
          setHealPreview(null);
        }
      },
    });
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground underline decoration-primary decoration-4 underline-offset-8 flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Database Manager
          </h3>
          <p className="text-muted-foreground text-sm mt-3">Jelajahi seluruh koleksi backend dalam satu tabel terpadu.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={analyzeDuplicateAssignments}
            disabled={healing}
            className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-border bg-card text-xs font-black uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-60"
            title="Pindai dan perbaiki duplikasi assignedGoals pada semua student"
          >
            {healing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Heal Duplicate Goals
          </button>
          <PopoverSelect
            value={active}
            onValueChange={(v) => setActive(v as CollectionKey)}
            options={COLLECTIONS.map(c => ({ value: c.key, label: c.label }))}
            className="w-full sm:w-64 h-12 rounded-xl border-border bg-card font-bold"
          />
        </div>
      </div>

      {healResult && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          {healResult}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat {meta.label}…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          filterColumn={meta.filterCol}
          filterPlaceholder={`Cari ${meta.label.toLowerCase()}…`}
          onDeleteSelected={(ids) => setBulkDeleteIds(ids)}
        />
      )}

      <ConfirmModal
        isOpen={!!bulkDeleteIds}
        title="Konfirmasi Hapus Massal"
        message={`Hapus ${bulkDeleteIds?.length ?? 0} baris dari koleksi ${meta.label}? Operasi ini tidak dapat dibatalkan.`}
        onConfirm={handleBulkDelete}
        onCancel={() => !busy && setBulkDeleteIds(null)}
      />

      <ConfirmModal
        isOpen={!!healPreview}
        title="Perbaiki Duplikasi Goal Assignments"
        message={
          healPreview
            ? `Ditemukan masalah pada ${healPreview.affected.length} student. Total perubahan:\n` +
              healPreview.affected
                .slice(0, 8)
                .map((r) => `• ${r.name}: ${r.before} → ${r.after}  (dup: ${r.dupCount}, orphan: ${r.orphanCount})`)
                .join('\n') +
              (healPreview.affected.length > 8 ? `\n…dan ${healPreview.affected.length - 8} lainnya.` : '') +
              '\n\nDuplikasi dikolapsasi (status completed dipertahankan) dan assignment ke goal yang sudah dihapus akan dibersihkan. Lanjutkan?'
            : ''
        }
        onConfirm={() => healPreview?.run()}
        onCancel={() => !healing && setHealPreview(null)}
      />
    </div>
  );
}
