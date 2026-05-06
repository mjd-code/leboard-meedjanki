import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { apiFetch } from '../../lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { PopoverSelect } from '@/components/ui/PopoverSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Database, Loader2 } from 'lucide-react';

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

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground underline decoration-primary decoration-4 underline-offset-8 flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Database Manager
          </h3>
          <p className="text-muted-foreground text-sm mt-3">Jelajahi seluruh koleksi backend dalam satu tabel terpadu.</p>
        </div>
        <PopoverSelect
          value={active}
          onValueChange={(v) => setActive(v as CollectionKey)}
          options={COLLECTIONS.map(c => ({ value: c.key, label: c.label }))}
          className="w-full sm:w-64 h-12 rounded-xl border-border bg-card font-bold"
        />
      </div>

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
    </div>
  );
}
