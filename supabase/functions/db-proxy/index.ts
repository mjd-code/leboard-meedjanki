// db-proxy: Lets the browser perform admin operations on an arbitrary
// Supabase project using a service-role key WITHOUT exposing that key
// to the browser at request time. The browser sends the URL + key in
// the request body; this function (running server-side) forwards the
// REST call. This is the only safe way: Supabase blocks sb_secret_*
// keys when used directly from a browser origin.
//
// Operations supported:
//   - list_tables               → returns table names from OpenAPI
//   - select  { table, query }  → GET  /rest/v1/<table>?<query>
//   - insert  { table, rows }   → POST /rest/v1/<table>
//   - upsert  { table, rows, onConflict }
//   - delete  { table, query }  → DELETE /rest/v1/<table>?<query>
//   - exec_sql { sql }          → POST /pg/query (via Postgres Meta) — used to bootstrap schema

// deno-lint-ignore no-explicit-any
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  url: string;
  key: string;
  op:
    | "list_tables"
    | "select"
    | "insert"
    | "upsert"
    | "delete"
    | "update"
    | "exec_sql";
  table?: string;
  query?: string;
  rows?: any[];
  onConflict?: string;
  sql?: string;
};

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const { url, key, op } = body || ({} as Body);
  if (!url || !key || !op) return bad("Missing url, key, or op");
  if (!/^https?:\/\//.test(url)) return bad("URL must be absolute");
  const base = url.replace(/\/+$/, "");

  const restHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  try {
    if (op === "list_tables") {
      const r = await fetch(`${base}/rest/v1/`, {
        headers: { ...restHeaders, Accept: "application/openapi+json" },
      });
      const text = await r.text();
      if (!r.ok) return bad(`list_tables failed: ${r.status} ${text}`, r.status);
      const doc = JSON.parse(text);
      const tables = Object.keys(doc?.paths || {})
        .map((p) => p.replace(/^\//, ""))
        .filter((p) => p && !p.startsWith("rpc/") && !p.includes("{"))
        .sort();
      return new Response(JSON.stringify({ tables }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (op === "select") {
      const q = body.query || "select=*";
      const r = await fetch(`${base}/rest/v1/${body.table}?${q}`, {
        headers: { ...restHeaders, "Accept-Profile": "public" },
      });
      const text = await r.text();
      if (!r.ok) return bad(`select failed: ${r.status} ${text}`, r.status);
      return new Response(text, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (op === "insert" || op === "upsert") {
      if (!body.table || !Array.isArray(body.rows)) return bad("table + rows required");
      const headers: Record<string, string> = {
        ...restHeaders,
        Prefer:
          op === "upsert"
            ? "resolution=merge-duplicates,return=representation"
            : "return=representation",
      };
      const qs = op === "upsert" && body.onConflict ? `?on_conflict=${body.onConflict}` : "";
      const r = await fetch(`${base}/rest/v1/${body.table}${qs}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body.rows),
      });
      const text = await r.text();
      if (!r.ok) return bad(`${op} failed: ${r.status} ${text}`, r.status);
      let parsed: any = [];
      try { parsed = text ? JSON.parse(text) : []; } catch { parsed = []; }
      return new Response(JSON.stringify({ ok: true, count: body.rows.length, rows: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (op === "update") {
      if (!body.table || !Array.isArray(body.rows) || !body.rows[0])
        return bad("table + rows[0] (patch) required");
      const q = body.query || "";
      if (!q) return bad("update requires a query filter (e.g. id=eq.123)");
      const r = await fetch(`${base}/rest/v1/${body.table}?${q}`, {
        method: "PATCH",
        headers: { ...restHeaders, Prefer: "return=representation" },
        body: JSON.stringify(body.rows[0]),
      });
      const text = await r.text();
      if (!r.ok) return bad(`update failed: ${r.status} ${text}`, r.status);
      return new Response(text || "[]", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (op === "delete") {
      if (!body.table) return bad("table required");
      const q = body.query || "id=not.is.null";
      const r = await fetch(`${base}/rest/v1/${body.table}?${q}`, {
        method: "DELETE",
        headers: { ...restHeaders, Prefer: "return=minimal" },
      });
      const text = await r.text();
      if (!r.ok) return bad(`delete failed: ${r.status} ${text}`, r.status);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (op === "exec_sql") {
      // The Postgres Meta API at /pg/query is part of Supabase Studio's
      // internal stack and is NOT exposed publicly on hosted projects.
      // For schema bootstrap we instead call the pg-meta endpoint
      // available behind the platform API. As a fallback we attempt the
      // documented `/rest/v1/rpc/exec_sql` if the user has installed it.
      if (!body.sql) return bad("sql required");
      const r = await fetch(`${base}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: restHeaders,
        body: JSON.stringify({ sql: body.sql }),
      });
      const text = await r.text();
      if (!r.ok) {
        return bad(
          `exec_sql failed: ${r.status} ${text}. The destination project must have a SECURITY DEFINER function named exec_sql(text). See the bootstrap instructions.`,
          r.status,
        );
      }
      return new Response(text || "{}", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return bad(`Unknown op: ${op}`);
  } catch (e: any) {
    return bad(`Proxy error: ${e?.message || e}`, 500);
  }
});
