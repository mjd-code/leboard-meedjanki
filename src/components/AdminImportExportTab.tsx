import React, { useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Settings,
} from "lucide-react";
import { toCSV, downloadCSV, parseCSV } from "../lib/csv";
import { z } from "zod";
import { toast } from "sonner";
import { writeBatch, doc, collection, getDocs } from "firebase/firestore";
import { getActiveConnection } from "../lib/dbConnections";
import { connectFirestore, parseFirebaseConfig } from "../lib/firestoreDriver";
import {
  planImport,
  API_PATH,
  type ImportMode,
  type ImportPlan,
} from "../lib/import/planImport";

type ApiFetch = (url: string, init?: RequestInit) => Promise<Response>;

const SnapshotSchema = z
  .object({
    metadata: z
      .object({
        generated_at: z.string().optional(),
        version: z.string().optional(),
      })
      .optional(),
    students: z.array(z.any()).optional(),
    masterGoals: z.array(z.any()).optional(),
    categories: z.array(z.any()).optional(),
    groups: z.array(z.any()).optional(),
    posts: z.array(z.any()).optional(),
    logs: z.array(z.any()).optional(),
    tracks: z.array(z.any()).optional(),
    goals: z.array(z.any()).optional(),
    historical_achievements: z.array(z.any()).optional(),
  })
  .catchall(z.any());

interface Props {
  apiFetch: ApiFetch;
  students: any[];
  masterGoals: any[];
  categories: any[];
  refreshData: () => void;
}

type DatasetKey =
  | "students"
  | "goals"
  | "categories"
  | "groups"
  | "tracks_full"
  | "stats_overview"
  | "stats_chart"
  | "logs";
type ImportType =
  | "students"
  | "students_names"
  | "goals"
  | "goals_titles"
  | "categories"
  | "groups";

const today = () => new Date().toISOString().split("T")[0];

export function AdminImportExportTab({
  apiFetch,
  students,
  masterGoals,
  categories,
  refreshData,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [statsRange, setStatsRange] = useState<
    "today" | "1w" | "1m" | "1y" | "all"
  >("1m");
  const [importType, setImportType] = useState<ImportType>("students_names");
  const [previewRows, setPreviewRows] = useState<
    Record<string, string>[] | null
  >(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Relational JSON snapshot import progress state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0); // 0..100
  const [importStatus, setImportStatus] = useState<string>("");

  // Smart-import dry-run state
  const [plan, setPlan] = useState<ImportPlan<any> | null>(null);
  const [planMode, setPlanMode] = useState<ImportMode | null>(null);
  const [ignoreInvalid, setIgnoreInvalid] = useState(false);
  const [committing, setCommitting] = useState(false);

  const goalById = useMemo(() => {
    const m = new Map<string, any>();
    (masterGoals || []).forEach((g) => m.set(String(g.id), g));
    return m;
  }, [masterGoals]);

  const categoryById = useMemo(() => {
    const m = new Map<string, any>();
    (categories || []).forEach((c) => m.set(String(c.id), c));
    return m;
  }, [categories]);

  const handleFullSnapshotJSONExport = async () => {
    setBusy("full_json");
    try {
      // Fetch via API where possible
      const [postsRes, logsRes, groupsRes] = await Promise.all([
        apiFetch("/api/posts"),
        apiFetch("/api/logs"),
        apiFetch("/api/groups"),
      ]);
      const posts = postsRes.ok ? await postsRes.json() : [];
      const logs = logsRes.ok ? await logsRes.json() : [];
      const groups = groupsRes.ok ? await groupsRes.json() : [];

      // Pull relational/historical collections directly from Firestore so we
      // can keep the original document IDs (foreign-keys) intact.
      const conn = getActiveConnection();
      const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
      const db = connectFirestore(conn.id, cfg);

      const RELATIONAL = [
        "tracks",
        "historical_achievements",
        "achievements",
        "student_goals",
      ];
      const relational: Record<string, any[]> = {};
      await Promise.all(
        RELATIONAL.map(async (name) => {
          try {
            const snap = await getDocs(collection(db, name));
            relational[name] = snap.docs.map((d: any) => ({
              id: d.id,
              ...(d.data() as any),
            }));
          } catch {
            relational[name] = [];
          }
        }),
      );

      // Make sure every flat collection also carries its `id` explicitly.
      const withId = (rows: any[]) =>
        (rows || []).map((r) => ({ ...r, id: r.id }));

      const snapshot = {
        metadata: {
          generated_at: new Date().toISOString(),
          version: "2.1-relational-groups",
          source_connection: conn.id,
        },
        groups: withId(groups),
        categories: withId(categories),
        masterGoals: withId(masterGoals),
        goals: withId(masterGoals), // alias for downstream consumers
        students: withId(students),
        posts: withId(posts),
        logs: withId(logs),
        tracks: relational.tracks || [],
        historical_achievements: [
          ...(relational.historical_achievements || []),
          ...(relational.achievements || []),
          ...(relational.student_goals || []),
        ],
      };

      const jsonString = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_snapshot_${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Export failed: " + (e?.message || e));
    } finally {
      setBusy(null);
    }
  };
  const handleExport = async (key: DatasetKey) => {
    setBusy(key);
    try {
      let csv = "";
      let filename = `${key}_${today()}.csv`;
      if (key === "students") {
        const rows = (students || []).map((s) => {
          const completed = (s.assignedGoals || []).filter(
            (g: any) => g.completed,
          ).length;
          const totalPts = (s.assignedGoals || []).reduce(
            (acc: number, g: any) => {
              if (!g.completed) return acc;
              const mg = goalById.get(String(g.goalId));
              return acc + (g.points || mg?.points || 0);
            },
            0,
          );
          return {
            id: s.id,
            name: s.name,
            bio: s.bio || "",
            tags: (s.tags || []).join("|"),
            assigned_goals_count: (s.assignedGoals || []).length,
            completed_goals_count: completed,
            total_points: totalPts,
            previous_rank: s.previousRank ?? "",
            created_at: s.createdAt ?? "",
          };
        });
        csv = toCSV(rows);
      } else if (key === "goals") {
        const rows = (masterGoals || []).map((g) => ({
          id: g.id,
          title: g.title,
          points: g.points,
          description: g.description || "",
          category_id: g.categoryId || "",
          category_name: g.categoryName || "",
          order: g.order ?? "",
        }));
        csv = toCSV(rows);
      } else if (key === "categories") {
        const rows = (categories || []).map((c) => ({
          id: c.id,
          name: c.name,
          group_id: c.groupId || "",
          order: c.order ?? "",
        }));
        csv = toCSV(rows);
      } else if (key === "groups") {
        const res = await apiFetch("/api/groups");
        const groups = res.ok ? await res.json() : [];
        const rows = (groups || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          order: g.order ?? "",
          is_system: g.isSystem ? "true" : "false",
        }));
        csv = toCSV(rows);
      } else if (key === "tracks_full") {
        // Long-form: one row per (student, assigned goal)
        const rows: any[] = [];
        (students || []).forEach((s) => {
          (s.assignedGoals || []).forEach((g: any) => {
            const mg = goalById.get(String(g.goalId));
            rows.push({
              student_id: s.id,
              student_name: s.name,
              goal_id: g.goalId,
              goal_title: mg?.title || "",
              category_name: mg?.categoryName || "",
              points: g.points || mg?.points || 0,
              completed: g.completed ? "true" : "false",
              completed_at: g.completedAt || "",
            });
          });
        });
        csv = toCSV(rows, [
          "student_id",
          "student_name",
          "goal_id",
          "goal_title",
          "category_name",
          "points",
          "completed",
          "completed_at",
        ]);
      } else if (key === "stats_overview" || key === "stats_chart") {
        const res = await apiFetch(`/api/stats?range=${statsRange}`);
        if (!res.ok) throw new Error("Failed to fetch stats");
        const stats = await res.json();
        if (key === "stats_overview") {
          const rows = [
            {
              range: statsRange,
              generated_at: new Date().toISOString(),
              total_students: stats.totalStudents,
              total_active_goals: stats.totalActiveGoals,
              total_categories: stats.totalCategories,
              completed_goals: stats.completedGoals,
              total_points: stats.totalPoints,
              unique_visitors: stats.uniqueVisitors,
            },
          ];
          csv = toCSV(rows);
          filename = `stats_overview_${statsRange}_${today()}.csv`;
        } else {
          csv = toCSV(stats.chartData || [], ["date", "points"]);
          filename = `stats_points_trend_${statsRange}_${today()}.csv`;
        }
      } else if (key === "logs") {
        const res = await apiFetch("/api/logs");
        if (!res.ok) throw new Error("Failed to fetch logs");
        const logs = await res.json();
        csv = toCSV(logs || [], [
          "timestamp",
          "type",
          "action",
          "details",
          "id",
        ]);
      }
      downloadCSV(filename, csv);
    } catch (e: any) {
      alert("Export failed: " + (e?.message || e));
    } finally {
      setBusy(null);
    }
  };

  /**
   * Relational JSON restore — preserves original Firestore document IDs and
   * uses chunked writeBatch (≤450 ops) to stay below the 500-op Firestore
   * limit. Failed chunks are retried with exponential backoff before bubbling
   * up the error to the user.
   */
  const importFullSnapshot = async (
    validatedData: z.infer<typeof SnapshotSchema>,
  ) => {
    const conn = getActiveConnection();
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    const db = connectFirestore(conn.id, cfg);

    // Map JSON section → Firestore collection name. The keys mirror what the
    // export writes; values are the destination collections.
    const SECTION_TO_COLLECTION: Record<string, string> = {
      groups: "groups",
      categories: "categories",
      masterGoals: "master_goals",
      goals: "master_goals",
      students: "students",
      posts: "posts",
      logs: "activity_logs",
      tracks: "tracks",
      historical_achievements: "historical_achievements",
    };
    // Insert in dependency order so foreign-key references resolve cleanly.
    const ORDER = [
      "groups",
      "categories",
      "masterGoals",
      "goals",
      "students",
      "posts",
      "logs",
      "tracks",
      "historical_achievements",
    ];

    // Convert API/camelCase rows to Firestore snake_case shape so the read
    // mappers can rebuild them on next load.
    const toFirestoreShape = (section: string, row: any): any => {
      const r = { ...row };
      delete r.id;
      if (section === "groups") {
        const out: any = { name: r.name, order: r.order ?? 0 };
        if (r.isSystem !== undefined) out.is_system = !!r.isSystem;
        else if (r.is_system !== undefined) out.is_system = !!r.is_system;
        return out;
      }
      if (section === "categories") {
        const out: any = { name: r.name };
        if (r.order !== undefined) out.order = r.order;
        const gid = r.groupId ?? r.group_id ?? null;
        out.group_id = gid || null;
        return out;
      }
      if (section === "masterGoals" || section === "goals") {
        const out: any = {
          title: r.title,
          points: r.points ?? 0,
          description: r.description || "",
        };
        if (r.order !== undefined) out.order = r.order;
        const cid = r.categoryId ?? r.category_id ?? null;
        if (cid) out.category_id = cid;
        const cname = r.categoryName ?? r.category_name ?? "";
        if (cname) out.category_name = cname;
        return out;
      }
      // Other sections: leave as-is (students/posts/logs/tracks/historical_*)
      return r;
    };

    type Op = { collection: string; section: string; id: string; data: any };
    const ops: Op[] = [];
    for (const section of ORDER) {
      const rows = ((validatedData as any)[section] || []) as any[];
      const collName = SECTION_TO_COLLECTION[section];
      if (!rows.length || !collName) continue;
      for (const raw of rows) {
        if (!raw) continue;
        const { id } = raw;
        // Preserve the original document id whenever present so relational
        // links (studentId, goalId, trackId, …) survive the round-trip.
        const docId =
          id != null && String(id).length > 0
            ? String(id)
            : doc(collection(db, collName)).id;
        ops.push({
          collection: collName,
          section,
          id: docId,
          data: toFirestoreShape(section, raw),
        });
      }
    }

    const CHUNK = 450;
    const totalChunks = Math.max(1, Math.ceil(ops.length / CHUNK));
    setIsImporting(true);
    setImportProgress(0);
    setImportStatus(
      `Mempersiapkan ${ops.length} dokumen dalam ${totalChunks} batch…`,
    );

    const commitWithRetry = async (slice: Op[], chunkIdx: number) => {
      const sectionsInChunk = Array.from(
        new Set(slice.map((o) => o.section)),
      ).join(", ");
      let attempt = 0;
      let lastErr: any = null;
      while (attempt < 3) {
        try {
          setImportStatus(
            `Restoring chunk ${chunkIdx + 1} of ${totalChunks} (${sectionsInChunk})${attempt ? ` — retry ${attempt}` : ""}…`,
          );
          const batch = writeBatch(db);
          for (const op of slice) {
            batch.set(doc(db, op.collection, op.id), op.data, { merge: true });
          }
          await batch.commit();
          return;
        } catch (e) {
          lastErr = e;
          attempt++;
          await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
        }
      }
      throw lastErr;
    };

    for (let i = 0; i < totalChunks; i++) {
      const slice = ops.slice(i * CHUNK, (i + 1) * CHUNK);
      await commitWithRetry(slice, i);
      setImportProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    setImportStatus(`Selesai. ${ops.length} dokumen berhasil di-restore.`);
  };

  const onFilePickedJSON = async (file: File) => {
    setBusy("import_json");
    setIsImporting(false);
    setImportProgress(0);
    setImportStatus("");
    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);
      const validatedData = SnapshotSchema.parse(parsedData);

      const counts = {
        students: validatedData.students?.length || 0,
        masterGoals:
          validatedData.masterGoals?.length || validatedData.goals?.length || 0,
        categories: validatedData.categories?.length || 0,
        groups: (validatedData as any).groups?.length || 0,
        posts: validatedData.posts?.length || 0,
        logs: validatedData.logs?.length || 0,
        tracks: (validatedData as any).tracks?.length || 0,
        historical_achievements:
          (validatedData as any).historical_achievements?.length || 0,
      };
      const summary = `Dry Run Summary (relational restore):
- Groups: ${counts.groups}
- Categories: ${counts.categories}
- Goals: ${counts.masterGoals}
- Students: ${counts.students}
- Posts: ${counts.posts}
- Logs: ${counts.logs}
- Tracks: ${counts.tracks}
- Historical achievements: ${counts.historical_achievements}

Dokumen akan ditulis menggunakan ID asli (foreign-key & urutan grup/kategori tetap valid) dalam batch 450 op. Lanjutkan?`;
      if (!confirm(summary)) return;
      if (!confirm(summary)) return;

      const toastId = toast.loading("Memulai restorasi relasional…");
      try {
        await importFullSnapshot(validatedData);
        toast.success(
          "Snapshot berhasil direstore. Relasi & timestamps dipertahankan.",
          { id: toastId },
        );
        refreshData();
      } catch (err: any) {
        toast.error("Restorasi gagal: " + (err?.message || err), {
          id: toastId,
          duration: 8000,
        });
        throw err;
      }
    } catch (e: any) {
      if (!isImporting) toast.error("Gagal membaca JSON: " + (e?.message || e));
    } finally {
      setBusy(null);
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  // ============= IMPORT =============
  const onFilePicked = async (file: File) => {
    setImportMessage(null);
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      setPreviewHeaders(headers);
      setPreviewRows(rows);
    } catch (e: any) {
      setImportMessage({
        type: "error",
        text: "Could not read CSV: " + (e?.message || e),
      });
      setPreviewRows(null);
    }
  };

  // ============= SMART IMPORT (dry-run + idempotent upsert) =============

  /**
   * Build an ImportPlan against the current snapshot and open the dry-run
   * modal. Nothing is written until the admin clicks "Commit".
   */
  const analyzeForDryRun = async () => {
    if (!previewRows) return;
    setBusy("analyze");
    setImportMessage(null);
    try {
      const mode: ImportMode =
        importType === "students"
          ? "students"
          : importType === "goals"
            ? "goals"
            : importType === "categories"
              ? "categories"
              : "groups";

      let existing: any[] = [];
      if (mode === "students") existing = students || [];
      else if (mode === "goals") existing = masterGoals || [];
      else if (mode === "categories") existing = categories || [];
      else {
        const res = await apiFetch("/api/groups");
        existing = res.ok ? await res.json() : [];
      }

      let groupsForFk: any[] = [];
      if (mode === "categories") {
        const res = await apiFetch("/api/groups");
        groupsForFk = res.ok ? await res.json() : [];
      }

      const built = planImport(mode, previewRows, {
        existing,
        categories: categories || [],
        groups: groupsForFk,
      });
      setPlan(built);
      setPlanMode(mode);
      setIgnoreInvalid(false);
    } catch (e: any) {
      setImportMessage({
        type: "error",
        text: "Analyze failed: " + (e?.message || e),
      });
    } finally {
      setBusy(null);
    }
  };

  /**
   * Execute the previously-built plan. Updates use PUT with ONLY the changed
   * fields (never overwrites omitted columns). Creates use POST. No deletes,
   * ever.
   */
  const commitPlan = async () => {
    if (!plan || !planMode) return;
    if (plan.invalid.length > 0 && !ignoreInvalid) return;
    setCommitting(true);
    setImportMessage(null);
    const path = API_PATH[planMode];
    let created = 0;
    let updated = 0;
    let failed = 0;
    try {
      for (const u of plan.toUpdate) {
        const body: any = { id: u.id };
        for (const f of u.changedFields) body[f] = (u.after as any)[f];
        const res = await apiFetch(`${path}/${encodeURIComponent(u.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) updated++;
        else failed++;
      }
      for (const c of plan.toCreate) {
        const body: any = { ...c.data };
        if (c.id) body.id = c.id;
        const res = await apiFetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) created++;
        else failed++;
      }

      try {
        await apiFetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Smart Import",
            details: `${planMode}: +${created} created, ~${updated} updated, ${plan.unchanged} unchanged, ${failed} failed`,
            type: "system",
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {}

      setImportMessage({
        type: failed > 0 ? "error" : "success",
        text: `Created ${created} · Updated ${updated} · Unchanged ${plan.unchanged}${failed ? ` · Failed ${failed}` : ""}.`,
      });
      if (created + updated > 0) refreshData();
      setPlan(null);
      setPlanMode(null);
      setPreviewRows(null);
      setPreviewHeaders([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      setImportMessage({ type: "error", text: e?.message || String(e) });
    } finally {
      setCommitting(false);
    }
  };

  const runImport = async () => {
    if (!previewRows || previewRows.length === 0) return;
    // Full modes go through the dry-run planner. Names-only modes keep their
    // legacy create-only fast path (they're just seed helpers).
    if (
      importType === "students" ||
      importType === "goals" ||
      importType === "categories" ||
      importType === "groups"
    ) {
      return analyzeForDryRun();
    }
    // From here, TS knows it's a "names-only" path. Re-widen so the existing
    // (intentional) branches that also accept the full forms still compile.
    const it = importType as ImportType;
    setBusy("import");
    setImportMessage(null);
    const findCol = (candidates: string[]): string | null => {
      const lower = previewHeaders.map((h) => h.toLowerCase().trim());
      for (const c of candidates) {
        const idx = lower.indexOf(c);
        if (idx >= 0) return previewHeaders[idx];
      }
      return null;
    };

    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      if (it === "students_names" || it === "students") {
        const nameCol = findCol(["name", "student_name", "full_name"]);
        if (!nameCol) throw new Error('CSV must have a "name" column.');
        const bioCol = findCol(["bio", "description"]);
        const photoCol = findCol(["photo", "avatar", "image"]);
        const tagsCol = findCol(["tags"]);
        for (const row of previewRows) {
          const name = (row[nameCol] || "").trim();
          if (!name) continue;
          const payload: any = { name };
          if (it === "students") {
            if (bioCol) payload.bio = row[bioCol] || "";
            if (photoCol) payload.photo = row[photoCol] || "";
            if (tagsCol) {
              const raw = (row[tagsCol] || "").trim();
              if (raw)
                payload.tags = raw
                  .split(/[|,;]/)
                  .map((t) => t.trim())
                  .filter(Boolean);
            }
          }
          const res = await apiFetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) inserted++;
          else {
            failed++;
            errors.push(`Row "${name}" failed`);
          }
        }
      } else if (it === "goals_titles" || it === "goals") {
        const titleCol = findCol(["title", "goal", "name"]);
        if (!titleCol) throw new Error('CSV must have a "title" column.');
        const ptsCol = findCol(["points", "pts"]);
        const descCol = findCol(["description", "desc"]);
        const catNameCol = findCol(["category_name", "category"]);
        // ---- Smart Import: upsert categories using slugified name as the natural ID. ----
        if (it === "goals" && catNameCol) {
          const slugify = (s: string) =>
            s
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)+/g, "");
          const uniqueNames = new Map<string, string>(); // slug -> display name
          for (const row of previewRows) {
            const raw = (row[catNameCol] || "").trim();
            if (!raw) continue;
            const slug = slugify(raw);
            if (slug && !uniqueNames.has(slug)) uniqueNames.set(slug, raw);
          }
          const existing = new Set(
            (categories || []).map((c: any) => slugify(c.name || "")),
          );
          for (const [slug, name] of uniqueNames.entries()) {
            if (existing.has(slug)) continue;
            await apiFetch("/api/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: slug, name }),
            }).catch(() => {});
          }
        }
        // ---- Insert Goals (linked by categoryId/categoryName as natural FK). ----
        const catIdCol = findCol(["category_id", "categoryid", "categoryId"]);
        const orderCol = findCol(["order", "sort_order", "position"]);
        for (const row of previewRows) {
          const title = (row[titleCol] || "").trim();
          if (!title) continue;
          const payload: any = { title, points: 0 };
          if (it === "goals") {
            const ptsRaw = ptsCol ? row[ptsCol] : "";
            const pts = parseInt(String(ptsRaw || "0"), 10);
            payload.points = isNaN(pts) ? 0 : pts;
            if (descCol) payload.description = row[descCol] || "";
            if (catNameCol && row[catNameCol])
              payload.categoryName = (row[catNameCol] || "").trim();
            if (catIdCol && row[catIdCol])
              payload.categoryId = row[catIdCol].trim();
            if (orderCol && row[orderCol] !== "") {
              const o = parseInt(String(row[orderCol] || "0"), 10);
              if (!isNaN(o)) payload.order = o;
            }
          }
          const res = await apiFetch("/api/masterGoals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) inserted++;
          else {
            failed++;
            errors.push(`Row "${title}" failed`);
          }
        }
      }

      // Log activity
      try {
        await apiFetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CSV Import",
            details: `Imported ${inserted} ${importType} rows (${failed} failed)`,
            type: "system",
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {}

      setImportMessage({
        type: failed > 0 ? "error" : "success",
        text: `Imported ${inserted} rows${failed > 0 ? ` · ${failed} failed` : ""}.`,
      });
      if (inserted > 0) refreshData();
      if (failed === 0) {
        setPreviewRows(null);
        setPreviewHeaders([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (e: any) {
      setImportMessage({ type: "error", text: e?.message || String(e) });
    } finally {
      setBusy(null);
    }
  };

  // ============= UI =============
  const ExportCard = ({
    icon: Icon,
    title,
    subtitle,
    dataKey,
    count,
  }: {
    icon: any;
    title: string;
    subtitle: string;
    dataKey: DatasetKey;
    count?: number;
  }) => (
    <div className="bg-background border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-foreground truncate">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {typeof count === "number" && (
            <p className="text-[11px] text-muted-foreground/60 mt-1 font-mono">
              {count} record{count === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => handleExport(dataKey)}
        disabled={busy === dataKey}
        className="mt-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11"
      >
        {busy === dataKey ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Export CSV
      </button>
    </div>
  );

  return (
    <>
      <div className="p-4 sm:p-8 space-y-10">
        {/* HEADER */}
        <div>
          <h3 className="text-2xl font-black text-foreground underline decoration-primary-500 decoration-4 underline-offset-8">
            Import / Export
          </h3>
          <p className="text-muted-foreground font-medium mt-2 text-sm">
            Backup, share, or seed data using CSV files. Exports always include
            current live data.
          </p>
        </div>

        {/* EXPORT SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-black text-foreground">Ekspor Data</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 lg:col-span-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-primary-900 truncate">
                    System Full Snapshot (JSON)
                  </h4>
                  <p className="text-xs text-primary-700">
                    Export semua data termasuk murid, goals, post, kategory, dan
                    log dalam satu klik.
                  </p>
                </div>
              </div>
              <button
                onClick={handleFullSnapshotJSONExport}
                disabled={busy === "full_json" || isImporting}
                className="mt-2 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11 shadow-sm"
              >
                {busy === "full_json" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Full Snapshot (JSON)
              </button>
            </div>
            <ExportCard
              icon={Database}
              title="Students"
              subtitle="Profile + summary stats per student"
              dataKey="students"
              count={students?.length}
            />
            <ExportCard
              icon={Database}
              title="Tracks & Goals"
              subtitle="All master goals with points & category"
              dataKey="goals"
              count={masterGoals?.length}
            />
            <ExportCard
              icon={Database}
              title="Categories"
              subtitle="Goal category list (with group_id, order)"
              dataKey="categories"
              count={categories?.length}
            />
            <ExportCard
              icon={Database}
              title="Groups"
              subtitle="Top-level group list (Kelas / Tingkatan)"
              dataKey="groups"
            />
            <ExportCard
              icon={FileText}
              title="Assigned Tracks (long form)"
              subtitle="One row per student × goal, with completion"
              dataKey="tracks_full"
            />
            <ExportCard
              icon={FileText}
              title="Log Aktivitas"
              subtitle="Aktivitas admin & pendidikan terbaru"
              dataKey="logs"
            />
          </div>

          {/* Stats export */}
          <div className="bg-background border border-border rounded-2xl p-4 sm:p-5 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground">Statistics CSV</h4>
                <p className="text-xs text-muted-foreground">
                  Export aggregate stats for the selected time range.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      { v: "today", l: "Today" },
                      { v: "1w", l: "Last week" },
                      { v: "1m", l: "Last month" },
                      { v: "1y", l: "Last year" },
                      { v: "all", l: "All time" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setStatsRange(opt.v)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        statsRange === opt.v
                          ? "bg-primary text-white border-primary-600"
                          : "bg-card text-muted-foreground border-border hover:border-primary-300"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => handleExport("stats_overview")}
                  disabled={busy === "stats_overview"}
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11"
                >
                  {busy === "stats_overview" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Overview
                </button>
                <button
                  onClick={() => handleExport("stats_chart")}
                  disabled={busy === "stats_chart"}
                  className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:bg-secondary font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11"
                >
                  {busy === "stats_chart" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Points Trend
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* IMPORT SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-black text-foreground">Impor Data</h4>
          </div>

          <div className="bg-background border border-border rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Seed Data Dummies */}
            {/* <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-4 bg-primary/10 rounded-xl border border-dashed border-primary mb-6">
            <div className="flex-1">
              <h5 className="font-bold text-sm text-primary-900">Seeding Data Dummies (Testing)</h5>
              <p className="text-xs text-primary-700 mt-1">Mengisi database Firestore dengan data sample: 1 Admin, beberapa murid, master goals, kategori dan artikel post. Akun master admin akan digenerate dengan email: admin@master.com, pass: admin</p>
            </div>
            <button
               onClick={async () => {
                 if(confirm("Yakin ingin melakukan seeding? Data dummies akan ditambahkan ke database Anda.")) {
                    setBusy('seeding');
                    const toastId = toast.loading('Sedang melakukan seeding data...');
                    try {
                      const res = await apiFetch('/api/seeding', { method: 'POST' });
                      if(res.ok) {
                        toast.success("Seeding berhasil dilakukan!", { id: toastId });
                        refreshData();
                      } else {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || errData.message || 'Gagal seeding. Periksa konfigurasi Firestore Anda.');
                      }
                    } catch(e: any) {
                      toast.error(e.message || 'Gagal melakukan seeding', { id: toastId, duration: 8000 });
                    } finally {
                      setBusy(null);
                    }
                 }
               }}
               disabled={busy === 'seeding'}
               className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
            >
              {busy === 'seeding' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Seed Data Dummies
            </button>
          </div> */}

            {/* Import JSON Full Snapshot */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-4 bg-muted/30 rounded-xl border border-dashed border-primary mb-6">
              <div className="flex-1">
                <h5 className="font-bold text-sm">Kembalikan Snapshot JSON</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Menggabungkan/Restore data dari Full System Snapshot JSON.
                </p>
              </div>
              <input
                type="file"
                accept=".json,application/json"
                disabled={isImporting || busy === "import_json"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFilePickedJSON(f);
                  e.target.value = "";
                }}
                className="block flex-1 text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary file:text-white file:cursor-pointer"
              />
            </div>

            {/* Relational JSON Restore — Progress */}
            {(isImporting || importStatus) && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>JSON Snapshot Restore</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {importProgress}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{importStatus}</p>
              </div>
            )}

            {/* Type selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                What does the CSV contain?
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {(
                  [
                    // { v: "students_names", l: "Student names", hint: '"name" column only' },
                    {
                      v: "students",
                      l: "Students (full)",
                      hint: "name, bio, tags, photo",
                    },
                    // {
                    //   v: "goals_titles",
                    //   l: "Goal titles",
                    //   hint: '"title" column only',
                    // },
                    {
                      v: "goals",
                      l: "Goals (full)",
                      hint: "title, points, category_id/name, order",
                    },
                    {
                      v: "categories",
                      l: "Categories",
                      hint: "name, group_id, order",
                    },
                    { v: "groups", l: "Groups", hint: "name, order" },
                  ] as { v: ImportType; l: string; hint: string }[]
                ).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => {
                      setImportType(opt.v);
                      setImportMessage(null);
                    }}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      importType === opt.v
                        ? "border-primary-600 bg-primary/10"
                        : "border-border bg-card hover:border-primary-300"
                    }`}
                  >
                    <div className="font-bold text-sm text-foreground">
                      {opt.l}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {opt.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* File picker */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFilePicked(f);
                }}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-card file:text-foreground file:border file:border-border hover:file:bg-secondary file:cursor-pointer"
              />
              {previewRows && (
                <button
                  onClick={runImport}
                  disabled={busy === "import"}
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11 shrink-0"
                >
                  {busy === "import" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import {previewRows.length} row
                  {previewRows.length === 1 ? "" : "s"}
                </button>
              )}
            </div>

            {/* Status message */}
            {importMessage && (
              <div
                className={`flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${
                  importMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {importMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{importMessage.text}</span>
              </div>
            )}

            {/* Preview */}
            {previewRows && previewRows.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-card border-b border-border text-xs font-bold text-muted-foreground">
                  Preview · {previewRows.length} row
                  {previewRows.length === 1 ? "" : "s"} ·{" "}
                  {previewHeaders.length} column
                  {previewHeaders.length === 1 ? "" : "s"}
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-background sticky top-0">
                      <tr>
                        {previewHeaders.map((h) => (
                          <th
                            key={h}
                            className="text-left font-bold text-foreground px-3 py-2 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 25).map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          {previewHeaders.map((h) => (
                            <td
                              key={h}
                              className="px-3 py-1.5 text-muted-foreground whitespace-nowrap max-w-[220px] truncate"
                            >
                              {r[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewRows.length > 25 && (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground/60 bg-background border-t border-border">
                      …and {previewRows.length - 25} more rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hint */}
            <div className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Tip: Export a sample first to see the exact column format
              expected. New records are always added (no duplicate check).
            </div>
          </div>
        </section>
      </div>

      {plan && planMode && (
        <div className="fixed inset-0 bg-base-900/60 backdrop-blur-md z-[100] flex justify-center items-center p-4">
          <div className="bg-card rounded-2xl shadow-soft w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-black text-lg text-foreground">
                  Dry-Run Preview · {planMode}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Nothing has been written yet. Review the diff and click Commit
                  to apply.
                </p>
              </div>
              <button
                onClick={() => {
                  setPlan(null);
                  setPlanMode(null);
                }}
                disabled={committing}
                className="p-2 hover:bg-secondary rounded-xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-2xl font-black text-emerald-700">
                    {plan.toCreate.length}
                  </div>
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Create
                  </div>
                </div>
                <div className="rounded-xl border border-primary-200 bg-primary/10 p-3">
                  <div className="text-2xl font-black text-primary">
                    {plan.toUpdate.length}
                  </div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wide">
                    Update
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="text-2xl font-black text-muted-foreground">
                    {plan.unchanged}
                  </div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Unchanged
                  </div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <div className="text-2xl font-black text-red-700">
                    {plan.invalid.length}
                  </div>
                  <div className="text-xs font-bold text-red-800 uppercase tracking-wide">
                    Invalid
                  </div>
                </div>
              </div>

              {plan.toUpdate.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">
                    Updates ({plan.toUpdate.length})
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto border border-border rounded-xl p-2">
                    {plan.toUpdate.slice(0, 50).map((u) => (
                      <li key={u.id} className="font-mono">
                        <span className="text-primary">{u.id}</span> →{" "}
                        {u.changedFields.join(", ")}
                      </li>
                    ))}
                    {plan.toUpdate.length > 50 && (
                      <li className="opacity-60">
                        …and {plan.toUpdate.length - 50} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {plan.toCreate.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">
                    New records ({plan.toCreate.length})
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto border border-border rounded-xl p-2">
                    {plan.toCreate.slice(0, 50).map((c) => (
                      <li key={c.row} className="font-mono">
                        row {c.row}:{" "}
                        {(c.data as any).name || (c.data as any).title}
                      </li>
                    ))}
                    {plan.toCreate.length > 50 && (
                      <li className="opacity-60">
                        …and {plan.toCreate.length - 50} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {plan.invalid.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-red-700 mb-1">
                    Invalid rows ({plan.invalid.length})
                  </h4>
                  <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto border border-red-200 bg-red-50 rounded-xl p-2">
                    {plan.invalid.slice(0, 50).map((v, i) => (
                      <li key={i} className="font-mono">
                        row {v.row}: {v.reason}
                      </li>
                    ))}
                  </ul>
                  <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={ignoreInvalid}
                      onChange={(e) => setIgnoreInvalid(e.target.checked)}
                    />
                    Skip invalid rows and commit the rest
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-background">
              <button
                onClick={() => {
                  setPlan(null);
                  setPlanMode(null);
                }}
                disabled={committing}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border border-border hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={commitPlan}
                disabled={
                  committing ||
                  (plan.invalid.length > 0 && !ignoreInvalid) ||
                  plan.toCreate.length + plan.toUpdate.length === 0
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {committing && <Loader2 className="w-4 h-4 animate-spin" />}
                Commit ({plan.toCreate.length + plan.toUpdate.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
