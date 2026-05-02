import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ArrowRightLeft,
  Save,
  X,
  Eye,
  EyeOff,
  Server,
  AlertTriangle,
} from "lucide-react";
import {
  ConnectionListSkeleton,
  CrudTableSkeleton,
  TransferLogSkeleton,
} from "./Skeleton";
import {
  listConnections,
  getActiveId,
  setActive,
  addConnection,
  addFirebaseConnection,
  updateConnection,
  removeConnection,
  testConnection,
  getConnectionKeyType,
  getClientFor,
  DEFAULT_CONNECTION_ID,
  DB_EVENTS,
  type DbConnection,
  type DbKeyType,
  connSelect,
  connInsert,
  connDeleteAll,
  connDeleteById,
  callProxy,
  APP_SCHEMA_SQL,
  EXEC_SQL_BOOTSTRAP,
  bootstrapFirebaseSchema,
  connTransferRows,
  type FirestoreCollectionProbe,
} from "../lib/dbConnections";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown } from "lucide-react";
import { ConfirmModal } from "./ui/ConfirmModal";

const APP_TABLES = [
  "admin_users",
  "students",
  "master_goals",
  "categories",
  "activity_logs",
  "page_views",
  "settings",
  "app_events",
];

type ConnectionTestState = {
  message: string;
  ok: boolean;
  keyType?: DbKeyType;
  missingTables?: string[];
  probes?: FirestoreCollectionProbe[];
};

const describeKeyType = (keyType?: DbKeyType) => {
  if (keyType === "service_role") return "service-role key";
  if (keyType === "publishable") return "publishable key";
  return "unknown key type";
};

const describeProvider = (conn: DbConnection) =>
  conn.provider === "firebase" ? "Firebase (Firestore)" : "Supabase (Postgres)";

type Props = {
  refreshData: () => Promise<void> | void;
};

export function AdminBackendTab({ refreshData }: Props) {
  const [connections, setConnections] =
    useState<DbConnection[]>(listConnections());
  const [activeId, setActiveIdState] = useState<string>(getActiveId());
  const [section, setSection] = useState<"connections" | "crud" | "transfer">(
    "connections",
  );

  useEffect(() => {
    const handler = () => {
      setConnections(listConnections());
      setActiveIdState(getActiveId());
    };
    window.addEventListener(DB_EVENTS.CHANGED, handler);
    return () => window.removeEventListener(DB_EVENTS.CHANGED, handler);
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            Backend & Database
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Manage connections, browse data, and copy data between databases.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {[
          { id: "connections", label: "Connections", icon: Server },
          { id: "crud", label: "Browse & Edit", icon: Edit3 },
          { id: "transfer", label: "Transfer", icon: ArrowRightLeft },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              section === s.id
                ? "bg-primary text-white"
                : "bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {section === "connections" && (
        <ConnectionsSection
          connections={connections}
          activeId={activeId}
          onChanged={refreshData}
        />
      )}
      {section === "crud" && (
        <CrudSection
          connections={connections}
          activeId={activeId}
          onChanged={refreshData}
        />
      )}
      {section === "transfer" && (
        <TransferSection
          connections={connections}
          onTransferred={refreshData}
        />
      )}
    </div>
  );
}

// ---------------- Connections section ----------------
function ConnectionsSection({
  connections,
  activeId,
  onChanged,
}: {
  connections: DbConnection[];
  activeId: string;
  onChanged: () => Promise<void> | void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addProvider, setAddProvider] = useState<"supabase" | "firebase">(
    "supabase",
  );
  const [editing, setEditing] = useState<DbConnection | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, ConnectionTestState>
  >({});
  // Tiny first-paint skeleton so the section never looks blank/stuck on slow
  // hardware while React mounts the (potentially long) connection list.
  const [firstPaint, setFirstPaint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFirstPaint(false), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSwitch = async (id: string) => {
    if (id === activeId) return;
    setActive(id);
    await onChanged();
  };

  const handleTest = async (conn: DbConnection) => {
    setTesting(conn.id);
    const r = await testConnection(conn, APP_TABLES);
    const keyTypeLabel =
      conn.provider === "firebase"
        ? "Firebase config"
        : describeKeyType(r.keyType);
    const summary = r.ok
      ? r.missingTables.length
        ? `Connected via ${keyTypeLabel} — missing app tables: ${r.missingTables.join(", ")}`
        : `Connected via ${keyTypeLabel}`
      : `Failed (${keyTypeLabel}): ${r.error || "Connection error"}`;
    setTestResult((prev) => ({
      ...prev,
      [conn.id]: {
        message: summary,
        ok: r.ok,
        keyType: r.keyType,
        missingTables: r.missingTables,
        probes: r.probes,
      },
    }));
    setTesting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-black text-foreground">Database Connections</h3>
          <p className="text-xs text-muted-foreground">
            The active connection is used by the entire app.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              //     setEditing(null);
              setAddProvider("supabase");
              setShowAdd(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Supabase
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setAddProvider("firebase");
              setShowAdd(true);
            }}
            className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-600 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Firebase
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Service-role keys grant full admin access to a Supabase project. They
          are stored only in this browser's localStorage. Do not paste them on a
          shared device or a publicly published version of this app.
        </p>
      </div>

      <ul className="space-y-3">
        {firstPaint && connections.length === 0 && (
          <ConnectionListSkeleton rows={2} />
        )}
        {connections.map((c) => {
          const isActive = c.id === activeId;
          return (
            <li
              key={c.id}
              className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                isActive
                  ? "border-primary-600 bg-primary/10/40"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground truncate">
                      {c.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        c.provider === "firebase"
                          ? "text-amber-700 bg-amber-100"
                          : "text-sky-700 bg-sky-100"
                      }`}
                    >
                      {describeProvider(c)}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                    {c.isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    {c.url || "—"}
                  </p>
                  {testResult[c.id] && (
                    <p
                      className={`text-xs mt-1 font-bold ${
                        testResult[c.id].ok
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {testResult[c.id].message}
                    </p>
                  )}
                  {testResult[c.id]?.probes &&
                    testResult[c.id]!.probes!.length > 0 && (
                      <FirestoreProbeReport
                        probes={testResult[c.id]!.probes!}
                      />
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleTest(c)}
                    disabled={testing === c.id}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 active:scale-95 transition-all flex items-center gap-1"
                  >
                    {testing === c.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Test
                  </button>
                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(c.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-700 active:scale-95 transition-all"
                    >
                      Use this
                    </button>
                  )}
                  {!c.isDefault && (
                    <>
                      <button
                        onClick={() => {
                          setEditing(c);
                          setShowAdd(true);
                        }}
                        className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 active:scale-95 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Remove connection "${c.label}"?`)) {
                            removeConnection(c.id);
                            await onChanged();
                          }
                        }}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {showAdd && (
        <ConnectionForm
          initial={editing}
          provider={editing?.provider || addProvider}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowAdd(false);
            setEditing(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function ConnectionForm({
  initial,
  provider,
  onClose,
  onSaved,
}: {
  initial: DbConnection | null;
  provider: "supabase" | "firebase";
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [label, setLabel] = useState(initial?.label || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [key, setKey] = useState(initial?.key || "");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirebase = provider === "firebase";

  const submit = async () => {
    setError(null);
    if (isFirebase) {
      if (!key.trim()) {
        setError("Paste your Firebase config JSON.");
        return;
      }
    } else {
      if (!url.startsWith("http")) {
        setError("URL must start with https://");
        return;
      }
      if (!key || key.length < 20) {
        setError("Key looks invalid.");
        return;
      }
    }
    setBusy(true);
    try {
      if (initial) {
        updateConnection(initial.id, { label, url, key });
      } else if (isFirebase) {
        addFirebaseConnection({ label, config: key });
      } else {
        addConnection({ label, url, key });
      }
      await onSaved();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md p-5 space-y-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-foreground">
            {initial
              ? "Edit connection"
              : isFirebase
                ? "Add Firebase project"
                : "Add Supabase project"}
          </h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block text-xs font-bold text-muted-foreground">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={
              isFirebase ? "My Firebase Project" : "My Supabase Project"
            }
            className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium"
          />
        </label>
        {!isFirebase && (
          <label className="block text-xs font-bold text-muted-foreground">
            Project URL
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-mono"
            />
          </label>
        )}
        <label className="block text-xs font-bold text-muted-foreground">
          {isFirebase ? "Firebase config (JSON)" : "Service-role key"}
          <div className="mt-1 relative">
            {isFirebase ? (
              <textarea
                value={key}
                onChange={(e) => setKey(e.target.value)}
                rows={8}
                placeholder={`{\n  "apiKey": "AIza...",\n  "authDomain": "my-app.firebaseapp.com",\n  "projectId": "my-app",\n  "storageBucket": "my-app.appspot.com",\n  "messagingSenderId": "123",\n  "appId": "1:123:web:abc"\n}`}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs font-mono"
              />
            ) : (
              <>
                <input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  type={showKey ? "text" : "password"}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3 py-2 pr-10 rounded-xl border border-border bg-card text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </label>
        {isFirebase && (
          <p className="text-[11px] text-muted-foreground">
            Paste the Firebase web app config object from your Firebase console
            (Project settings → SDK setup → Config). Access is gated by
            Firestore security rules.
          </p>
        )}

        {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-secondary text-foreground hover:bg-secondary/80"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-700 flex items-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- CRUD section ----------------
function CrudSection({
  connections,
  activeId,
  onChanged,
}: {
  connections: DbConnection[];
  activeId: string;
  onChanged: () => Promise<void> | void;
}) {
  const [connId, setConnId] = useState<string>(activeId);
  const [table, setTable] = useState<string>(APP_TABLES[0]);
  const [customTable, setCustomTable] = useState("");
  // const [rows, setRows] = useState<any[]>([]);
  // const [columns, setColumns] = useState<string[]>([]);
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ row: any; isNew: boolean } | null>(
    null,
  );
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<any | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  const conn = useMemo(
    () => connections.find((c) => c.id === connId) || connections[0],
    [connections, connId],
  );
  const effectiveTable = customTable.trim() || table;

  const queryClient = useQueryClient();

  const {
    data: qData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["db-rows", conn?.id, effectiveTable],
    queryFn: async () => {
      if (!conn) throw new Error("No connection");
      return await connSelect(conn, effectiveTable);
    },
    enabled: !!conn,
    staleTime: 1000 * 60,
  });

  const error = queryError
    ? String((queryError as any)?.message || queryError)
    : null;
  const rows = qData || [];

  const columns = useMemo(() => {
    const cols = new Set<string>();
    rows.forEach((r: any) => Object.keys(r).forEach((k) => cols.add(k)));
    return Array.from(cols);
  }, [rows]);

  const deleteMutation = useMutation({
    mutationFn: async (row: any) => {
      if (!conn || !row.id) throw new Error("No connection or row ID");
      await connDeleteById(conn, effectiveTable, row.id);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["db-rows", conn?.id, effectiveTable],
      });
      if (conn?.id === activeId) await onChanged();
    },
    onError: (e: any) => alert(e?.message || String(e)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!conn) throw new Error("No connection");
      // Use sequential deletion since we don't have a generic bulk delete yet
      for (const id of ids) {
        await connDeleteById(conn, effectiveTable, id);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["db-rows", conn?.id, effectiveTable],
      });
      if (conn?.id === activeId) await onChanged();
    },
    onError: (e: any) => alert(e?.message || String(e)),
  });

  const handleDelete = async () => {
    if (!deleteConfirmRow) return;
    deleteMutation.mutate(deleteConfirmRow);
    setDeleteConfirmRow(null);
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds) return;
    bulkDeleteMutation.mutate(bulkDeleteIds);
    setBulkDeleteIds(null);
  };

  const dataTableColumns = useMemo(() => {
    const tableCols: ColumnDef<any>[] = columns.map((c) => ({
      accessorKey: c,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium text-muted-foreground"
        >
          {c}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[220px] truncate text-foreground">
          {formatCell(row.original[c])}
        </div>
      ),
    }));

    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            className="rounded border-border text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary h-4 w-4"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="rounded border-border text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary h-4 w-4"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      ...tableCols,
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => setEditing({ row: row.original, isNew: false })}
              className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setDeleteConfirmRow(row.original)}
              className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ),
      },
    ];
  }, [columns]);

  const saveMutation = useMutation({
    mutationFn: async ({
      payload,
      isNew,
    }: {
      payload: any;
      isNew: boolean;
    }) => {
      if (!conn) throw new Error("No connection");
      if (isNew) {
        await connInsert(conn, effectiveTable, [payload]);
      } else {
        await connInsert(conn, effectiveTable, [payload], {
          upsert: true,
          onConflict: "id",
        });
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["db-rows", conn?.id, effectiveTable],
      });
      setEditing(null);
      if (conn?.id === activeId) await onChanged();
    },
    onError: (e: any) => alert(e?.message || String(e)),
  });

  const handleSave = async (payload: any, isNew: boolean) => {
    saveMutation.mutate({ payload, isNew });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block text-xs font-bold text-muted-foreground">
          Connection
          <select
            value={connId}
            onChange={(e) => setConnId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} {c.id === activeId ? "(active)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-muted-foreground">
          App table
          <select
            value={table}
            onChange={(e) => {
              setTable(e.target.value);
              setCustomTable("");
            }}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium"
          >
            {APP_TABLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-muted-foreground">
          Custom table (optional)
          <input
            value={customTable}
            onChange={(e) => setCustomTable(e.target.value)}
            placeholder="any_table_name"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-mono"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{effectiveTable}</span>
          {" — "}
          {loading ? "loading…" : `${rows.length} row(s)`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["db-rows", conn?.id, effectiveTable],
              })
            }
            className="text-xs font-bold px-3 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={() =>
              setEditing({ row: { id: crypto.randomUUID() }, isNew: true })
            }
            className="text-xs font-bold px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New row
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-bold break-all">
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <CrudTableSkeleton rows={6} cols={Math.max(columns.length || 4, 4)} />
      ) : (
        <div className="mt-4">
          <DataTable
            columns={dataTableColumns}
            data={rows}
            filterColumn={columns.length > 0 ? columns[0] : undefined}
            filterPlaceholder="Filter"
            onDeleteSelected={(ids) => setBulkDeleteIds(ids)}
          />
          <div className="hidden">
            <table className="min-w-full text-xs">
              <thead className="bg-secondary/60">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="text-left p-2 font-bold text-muted-foreground whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id || i} className="border-t border-border">
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="p-2 max-w-[220px] truncate text-foreground"
                      >
                        {formatCell(row[c])}
                      </td>
                    ))}
                    <td className="p-2 flex gap-1 justify-end">
                      <button
                        onClick={() => setEditing({ row, isNew: false })}
                        className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmRow(row)}
                        className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && !loading && (
                  <tr>
                    <td
                      className="p-4 text-center text-muted-foreground"
                      colSpan={Math.max(columns.length + 1, 1)}
                    >
                      No rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <RowEditor
          row={editing.row}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteConfirmRow}
        title="Konfirmasi Hapus Data"
        message="Apakah Anda yakin ingin menghapus baris data ini? Operasi ini dapat mempengaruhi sistem jika data terkait sedang digunakan."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmRow(null)}
      />

      <ConfirmModal 
        isOpen={!!bulkDeleteIds}
        title="Konfirmasi Hapus Massal Data Basis Data"
        message={`Perhatian! Anda akan menghapus secara permanen ${bulkDeleteIds?.length || 0} baris data dari tabel ini. Operasi berisiko tinggi ini tidak dapat dibatalkan.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteIds(null)}
      />
    </div>
  );
}

function formatCell(v: any) {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Compact per-collection report for the Firebase test result. Each row shows
 * read / write / delete dry-run status plus the underlying error when a
 * Security Rule denied the operation.
 */
function FirestoreProbeReport({
  probes,
}: {
  probes: FirestoreCollectionProbe[];
}) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden">
      <table className="min-w-full text-[11px]">
        <thead className="bg-secondary/60">
          <tr>
            <th className="text-left px-2 py-1 font-bold text-muted-foreground">
              Collection
            </th>
            <th className="px-2 py-1 font-bold text-muted-foreground">Read</th>
            <th className="px-2 py-1 font-bold text-muted-foreground">Write</th>
            <th className="px-2 py-1 font-bold text-muted-foreground">
              Delete
            </th>
            <th className="text-left px-2 py-1 font-bold text-muted-foreground">
              Docs
            </th>
          </tr>
        </thead>
        <tbody>
          {probes.map((p) => {
            const firstErr = p.readError || p.writeError || p.deleteError;
            return (
              <React.Fragment key={p.name}>
                <tr className="border-t border-border">
                  <td className="px-2 py-1 font-mono text-foreground">
                    {p.name}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {p.canRead ? "✓" : "✗"}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {p.canWrite ? "✓" : "✗"}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {p.canDelete ? "✓" : "—"}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {p.canRead ? (p.exists ? p.docCount : "empty") : "—"}
                  </td>
                </tr>
                {firstErr && (
                  <tr className="bg-red-50/60">
                    <td
                      colSpan={5}
                      className="px-2 py-1 text-red-700 font-mono break-all"
                    >
                      {firstErr}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowEditor({
  row,
  isNew,
  onClose,
  onSave,
}: {
  row: any;
  isNew: boolean;
  onClose: () => void;
  onSave: (payload: any, isNew: boolean) => void | Promise<void>;
}) {
  const [text, setText] = useState(JSON.stringify(row, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-2xl p-5 space-y-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-foreground">
            {isNew ? "Insert new row" : "Edit row"}
          </h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Edit raw JSON. Keep <code>id</code> for updates.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs font-mono"
        />
        {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setError(null);
              try {
                const parsed = JSON.parse(text);
                setBusy(true);
                await onSave(parsed, isNew);
              } catch (e: any) {
                setError(String(e?.message || e));
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-700 flex items-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Transfer section ----------------
function TransferSection({
  connections,
  onTransferred,
}: {
  connections: DbConnection[];
  onTransferred: () => Promise<void> | void;
}) {
  const [sourceId, setSourceId] = useState<string>(
    connections[0]?.id || DEFAULT_CONNECTION_ID,
  );
  const [destId, setDestId] = useState<string>(
    connections[1]?.id || connections[0]?.id || "",
  );
  const [tables, setTables] = useState<string[]>([
    "students",
    "master_goals",
    "categories",
  ]);
  const [mode, setMode] = useState<"replace" | "upsert" | "skip">("upsert");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const source = useMemo(
    () => connections.find((c) => c.id === sourceId) || connections[0],
    [connections, sourceId],
  );
  const dest = useMemo(
    () => connections.find((c) => c.id === destId) || connections[0],
    [connections, destId],
  );

  const toggleTable = (t: string) =>
    setTables((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const run = async () => {
    if (sourceId === destId) {
      alert("Source and destination must be different.");
      return;
    }
    if (!tables.length) {
      alert("Pick at least one table.");
      return;
    }
    if (mode === "replace") {
      const where =
        dest?.provider === "firebase"
          ? "overwrite documents with the same id (other fields removed)"
          : `DELETE all rows in [${tables.join(", ")}] on the destination`;
      if (!confirm(`This will ${where}. Continue?`)) return;
    }
    if (!source || !dest) {
      alert("Choose both source and destination connections.");
      return;
    }
    const destKeyType = getConnectionKeyType(dest);

    setBusy(true);
    setLog([]);
    const append = (m: string) => setLog((l) => [...l, m]);

    const destTest = await testConnection(dest, tables);
    append(`Destination: ${dest.label}`);
    append(
      dest.provider === "firebase"
        ? `Provider: Firebase (Firestore)`
        : `Key type: ${describeKeyType(destKeyType)}`,
    );

    if (!destTest.ok) {
      append(
        `✗ Destination connection failed: ${destTest.error || "Unknown error"}`,
      );
      setBusy(false);
      return;
    }

    if (dest.provider !== "firebase" && destKeyType !== "service_role") {
      append(
        "✗ Destination key is not a service-role key. Use a service-role key to create, replace, or fully sync data.",
      );
      setBusy(false);
      return;
    }

    if (dest.provider !== "firebase" && destTest.missingTables.length) {
      append(
        `✗ Destination is missing required tables: ${destTest.missingTables.join(", ")}`,
      );
      append(
        'Click "Bootstrap schema on destination" below to create them automatically (one-time setup required — see help).',
      );
      setBusy(false);
      return;
    }

    for (const t of tables) {
      try {
        append(`→ ${t}: reading from ${source.label}…`);
        const rows = await connSelect(source, t);
        append(`   ${rows.length} row(s) fetched.`);
        if (dest.provider === "firebase") {
          append(
            `   ${mode === "replace" ? "overwriting" : mode === "skip" ? "writing only new docs" : "merging"} ${rows.length} doc(s) in ${dest.label}…`,
          );
          const stats = await connTransferRows(dest, t, rows, { mode });
          append(
            `✓ ${t} — written:${stats.written} created:${stats.created} skipped:${stats.skipped}` +
              (stats.errors.length ? ` errors:${stats.errors.length}` : ""),
          );
          stats.errors.slice(0, 5).forEach((e) => append(`   ⚠ ${e}`));
        } else {
          if (mode === "replace") {
            append(`   wiping destination…`);
            await connDeleteAll(dest, t);
          }
          if (rows.length) {
            append(
              `   ${mode === "upsert" ? "upserting" : mode === "skip" ? "upserting (skip→upsert on Postgres)" : "inserting"} into ${dest.label}…`,
            );
            await connInsert(dest, t, rows, {
              upsert: mode !== "replace",
              onConflict: "id",
            });
          }
          append(`✓ ${t} done.`);
        }
      } catch (e: any) {
        append(`✗ ${t} failed: ${e?.message || e}`);
      }
    }
    setBusy(false);
    await onTransferred();
  };

  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const bootstrap = async () => {
    if (!dest) return;
    if (dest.provider === "firebase") {
      setBootstrapBusy(true);
      setLog([]);
      const append = (m: string) => setLog((l) => [...l, m]);
      append(`Seeding Firestore collections on ${dest.label}…`);
      try {
        const results = await bootstrapFirebaseSchema(
          dest,
          tables.length ? tables : APP_TABLES,
        );
        results.forEach((r) => {
          if (!r.ok) append(`✗ ${r.name}: ${r.error}`);
          else if (r.created)
            append(`✓ ${r.name} — created __schema__ doc with default fields`);
          else append(`• ${r.name} — already has data, left untouched`);
        });
        append("Done. Collections are now visible in the Firebase console.");
      } catch (e: any) {
        append(`✗ Firebase bootstrap failed: ${e?.message || e}`);
      } finally {
        setBootstrapBusy(false);
      }
      return;
    }
    if (getConnectionKeyType(dest) !== "service_role") {
      alert("Destination must use a service-role key.");
      return;
    }
    setBootstrapBusy(true);
    setLog([]);
    const append = (m: string) => setLog((l) => [...l, m]);
    append(`Bootstrapping schema on ${dest.label}…`);
    try {
      await callProxy({
        url: dest.url,
        key: dest.key,
        op: "exec_sql",
        sql: APP_SCHEMA_SQL,
      });
      append("✓ Tables created (or already existed).");
      append("Now retry the transfer.");
    } catch (e: any) {
      append(`✗ Schema bootstrap failed: ${e?.message || e}`);
      append(
        "If the error mentions exec_sql, paste the SQL helper from the Help panel into the destination project's SQL editor first.",
      );
      setShowHelp(true);
    } finally {
      setBootstrapBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs font-bold text-muted-foreground">
          Source
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-muted-foreground">
          Destination
          <select
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="text-xs font-bold text-muted-foreground mb-1">Tables</p>
        <div className="flex flex-wrap gap-2">
          {APP_TABLES.map((t) => {
            const on = tables.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTable(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  on
                    ? "bg-primary text-white border-primary-600"
                    : "bg-card text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-muted-foreground mb-1">Mode</p>
        <div className="flex gap-2">
          {(["upsert", "replace", "skip"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === m
                  ? "bg-primary text-white"
                  : "bg-card text-muted-foreground border border-border hover:bg-secondary"
              }`}
            >
              {m === "upsert"
                ? "Merge (upsert by id)"
                : m === "replace"
                  ? dest?.provider === "firebase"
                    ? "Replace (overwrite docs)"
                    : "Replace (wipe + insert)"
                  : "Skip existing (id collision)"}
            </button>
          ))}
        </div>
        {mode === "skip" && dest?.provider !== "firebase" && (
          <p className="text-[11px] text-muted-foreground mt-1">
            "Skip" maps to upsert on Postgres destinations (PostgREST has no
            native do-nothing-on-conflict). Use a Firebase destination for true
            id-collision skipping.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={run}
          disabled={busy || bootstrapBusy}
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 disabled:opacity-60 active:scale-95 transition-all"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="w-4 h-4" />
          )}
          Push data
        </button>
        <button
          onClick={bootstrap}
          disabled={busy || bootstrapBusy}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-60 active:scale-95 transition-all"
        >
          {bootstrapBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          Bootstrap schema on destination
        </button>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="px-4 py-2.5 rounded-xl text-sm font-bold bg-secondary text-foreground hover:bg-secondary/80"
        >
          {showHelp ? "Hide help" : "Help"}
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
        <p>
          Service-role keys are routed through a server-side proxy (Supabase
          blocks them in the browser). The destination must have the same tables
          — use <b>Bootstrap schema</b> to create them automatically.
        </p>
      </div>

      {showHelp && (
        <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-2">
          <p className="font-bold text-foreground">
            One-time setup for a new destination project
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>
              Open the destination Supabase project → <b>SQL editor</b>.
            </li>
            <li>
              Paste and run the snippet below (creates a helper that lets this
              app run schema SQL).
            </li>
            <li>
              Come back here and click <b>Bootstrap schema on destination</b>.
            </li>
            <li>
              Then click <b>Push data</b>.
            </li>
          </ol>
          <pre className="bg-secondary/60 rounded-lg p-2 overflow-auto text-[11px] font-mono whitespace-pre-wrap">
            {EXEC_SQL_BOOTSTRAP}
          </pre>
        </div>
      )}

      {busy && log.length === 0 && <TransferLogSkeleton lines={8} />}
      {log.length > 0 && (
        <pre className="bg-card border border-border rounded-xl p-3 text-[11px] font-mono text-foreground max-h-72 overflow-auto whitespace-pre-wrap">
          {log.join("\n")}
        </pre>
      )}
    </div>
  );
}
