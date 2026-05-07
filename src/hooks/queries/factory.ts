import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  bulkWrite,
  getById,
  listAll,
  patch,
  remove,
  upsert,
  type BulkMode,
} from "@/lib/firebase/queries";

export interface DomainHooksOpts<TRow extends { id: string }, TInput = Partial<TRow>> {
  ref: any;
  key: string;
  mapRow?: (r: any) => TRow;
  mapInput?: (i: TInput) => any;
  defaultId?: () => string;
}

export function createDomainHooks<TRow extends { id: string }, TInput = Partial<TRow>>(
  opts: DomainHooksOpts<TRow, TInput>,
) {
  const { ref, key, mapRow = (r: any) => r as TRow, mapInput = (i: any) => i, defaultId } = opts;
  const listKey: QueryKey = [key];
  const itemKey = (id: string): QueryKey => [key, id];

  const useList = () =>
    useQuery({
      queryKey: listKey,
      queryFn: async () => (await listAll<any>(ref)).map(mapRow),
    });

  const useItem = (id: string | null | undefined) =>
    useQuery({
      queryKey: id ? itemKey(id) : [key, "__noop__"],
      enabled: !!id,
      queryFn: async () => {
        const row = await getById<any>(ref, id!);
        return row ? mapRow(row) : null;
      },
    });

  const useUpsert = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, data }: { id?: string; data: TInput }) => {
        const finalId = id || defaultId?.() || crypto.randomUUID();
        await upsert(ref, finalId, mapInput(data));
        return mapRow({ id: finalId, ...mapInput(data) });
      },
      onSettled: () => qc.invalidateQueries({ queryKey: listKey }),
    });
  };

  const usePatch = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: TInput }) => {
        await patch(ref, id, mapInput(data));
        return mapRow({ id, ...mapInput(data) });
      },
      onSettled: (_d, _e, vars) => {
        qc.invalidateQueries({ queryKey: listKey });
        if (vars?.id) qc.invalidateQueries({ queryKey: itemKey(vars.id) });
      },
    });
  };

  const useDelete = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await remove(ref, id);
        return id;
      },
      onSettled: () => qc.invalidateQueries({ queryKey: listKey }),
    });
  };

  const useBulk = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ rows, mode = "merge" }: { rows: TRow[]; mode?: BulkMode }) => {
        await bulkWrite(ref, rows.map((r) => ({ ...(mapInput(r as any) as any), id: r.id })) as any, mode);
      },
      onSettled: () => qc.invalidateQueries({ queryKey: listKey }),
    });
  };

  return { listKey, itemKey, useList, useItem, useUpsert, usePatch, useDelete, useBulk, ref };
}