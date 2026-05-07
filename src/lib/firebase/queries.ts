import {
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocFromCache,
  getDocs,
  limit as fsLimit,
  orderBy as fsOrderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const BATCH_LIMIT = 450;

export async function listAll<T>(ref: any): Promise<T[]> {
  const snap = await getDocs(ref);
  return snap.docs.map((d: any) => d.data() as T);
}

export interface PageOpts {
  pageSize?: number;
  cursor?: any | null;
  orderField?: string;
  direction?: "asc" | "desc";
}

export async function listPaged<T>(
  ref: any,
  opts: PageOpts = {},
): Promise<{ items: T[]; lastDoc: any | null }> {
  const { pageSize = 100, cursor = null, orderField, direction = "asc" } = opts;
  const parts: any[] = [];
  if (orderField) parts.push(fsOrderBy(orderField, direction));
  if (cursor) parts.push(startAfter(cursor));
  parts.push(fsLimit(pageSize));
  const q = query(ref, ...parts);
  const snap = await getDocs(q);
  return {
    items: snap.docs.map((d: any) => d.data() as T),
    lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function getById<T>(ref: any, id: string): Promise<T | null> {
  const ref2 = doc(ref, id);
  try {
    const cached = await getDocFromCache(ref2);
    if (cached.exists()) return cached.data() as T;
  } catch {
    /* no cache hit */
  }
  const snap = await getDoc(ref2);
  return snap.exists() ? (snap.data() as T) : null;
}

export async function countOf(ref: any): Promise<number> {
  const s = await getCountFromServer(ref);
  return s.data().count;
}

export async function upsert<T extends { id?: string }>(
  ref: any,
  id: string,
  data: Partial<T>,
): Promise<{ id: string } & Partial<T>> {
  const { id: _o, ...payload } = data as any;
  await setDoc(doc(ref, id), payload, { merge: true });
  return { id, ...(payload as any) };
}

export async function patch<T>(ref: any, id: string, data: Partial<T>): Promise<{ id: string } & Partial<T>> {
  const { id: _o, ...payload } = data as any;
  await updateDoc(doc(ref, id), payload);
  return { id, ...(payload as any) };
}

export async function remove(ref: any, id: string): Promise<void> {
  await deleteDoc(doc(ref, id));
}

export type BulkMode = "set" | "merge" | "delete";

export async function bulkWrite<T extends { id: string }>(
  ref: any,
  rows: T[],
  mode: BulkMode = "merge",
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
    const slice = rows.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const row of slice) {
      const r = doc(ref, row.id);
      if (mode === "delete") batch.delete(r);
      else {
        const { id: _o, ...payload } = row as any;
        batch.set(r, payload, { merge: mode === "merge" });
      }
    }
    await batch.commit();
  }
}