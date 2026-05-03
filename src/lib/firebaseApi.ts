// Lovable Cloud-backed replacement for the original Express /api/* endpoints.
// Talks to whichever database connection is currently active (the default
// Lovable Cloud project, or any user-added external Supabase project).
//
// IMPORTANT: All reads/writes go through `connection-aware` helpers in
// dbConnections.ts so service-role keys (which Supabase blocks in browsers)
// transparently route through the db-proxy edge function.

import { 
  getActiveConnection, 
  connSelect, 
  connSelectQuery, 
  connInsertReturning, 
  connUpsertReturning, 
  connUpdate, 
  connDeleteById, 
  markConnectionFailed, 
  DEFAULT_CONNECTION_ID 
} from './dbConnections';
import { readCache, writeCache } from './localCache';
import { SEED_POSTS, SEED_CATEGORIES } from './seed/blogSeedData';

// --- Admin password (presentation-level) ---
const ADMIN_PASSWORD = "janki_app";
const TOKEN_VALUE = "client-admin-token";

// --- Response helpers ---
const ok = (body: any = { success: true }, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fail = (status: number, message: string): Response =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Normalize DB row (cover_image, author) → Post type (featured_image, author_id)
function normalizePostRow(r: any): any {
  if (!r) return r;
  return {
    ...r,
    featured_image: r.featured_image || r.cover_image || '',
    author_id: r.author_id || r.author || '',
    cover_image: undefined,
    author: r.author || r.author_id || '',
    organic_views: r.organic_views || 0,
    offset_views: r.offset_views || 0,
  };
}

// Normalize incoming post body for DB write (featured_image → also set cover_image, etc.)
function normalizePostWrite(body: any): any {
  const out = { ...body };
  // Map featured_image → cover_image for DB compatibility
  if (out.featured_image !== undefined) {
    out.cover_image = out.featured_image;
  }
  // Map author_id → author for DB compatibility
  if (out.author_id !== undefined) {
    out.author = out.author_id;
  }
  if (out.organic_views === undefined) out.organic_views = 0;
  if (out.offset_views === undefined) out.offset_views = 0;
  return out;
}

// Run an array of async tasks with a hard concurrency cap. Used to throttle
// bulk operations (rank snapshots, bulk imports) that would otherwise fire
// hundreds of parallel writes and exhaust connection pools / hit rate limits
// — the exact failure mode that was producing buffering and white screens.
async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, idx: number) => Promise<R>,
  limit = 4,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        // Don't let one bad row poison the whole batch.
        results[i] = undefined as any;
        console.warn('batch worker failed at index', i, err);
      }
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}

// --- Mappers between DB (snake_case) and app (camelCase) ---
const mapStudentRow = (r: any) => ({
  id: r.id,
  name: r.name,
  bio: r.bio || "",
  photo: r.photo || "",
  tags: r.tags || [],
  assignedGoals: r.assigned_goals || [],
  totalPoints: r.total_points || 0,
  previousRank: r.previous_rank ?? undefined,
  createdAt: r.created_at ?? undefined,
});

const mapStudentInput = (s: any) => {
  const out: any = {};
  if (s.name !== undefined) out.name = s.name;
  if (s.bio !== undefined) out.bio = s.bio;
  if (s.photo !== undefined) out.photo = s.photo;
  if (s.tags !== undefined) out.tags = s.tags;
  if (s.assignedGoals !== undefined) out.assigned_goals = s.assignedGoals;
  if (s.totalPoints !== undefined) out.total_points = s.totalPoints;
  if (s.previousRank !== undefined) out.previous_rank = s.previousRank;
  return out;
};

const mapGoalRow = (r: any) => ({
  id: r.id,
  categoryName: r.category_name ?? r.categoryName ?? "",
  title: r.title,
  points: r.points,
  description: r.description || "",
});

const mapGoalInput = (g: any) => {
  const out: any = {};
  if (g.categoryName !== undefined) out.category_name = g.categoryName;
  if (g.title !== undefined) out.title = g.title;
  if (g.points !== undefined) out.points = g.points;
  if (g.description !== undefined) out.description = g.description;
  return out;
};

const mapCategoryRow = (r: any) => ({ id: r.id, name: r.name });
const mapCategoryInput = (c: any) => {
  const out: any = {};
  if (c.name !== undefined) out.name = c.name;
  return out;
};

// --- Activity log helper ---
const logAction = async (
  action: string,
  details: string,
  type: "education" | "system",
) => {
  try {
    const conn = getActiveConnection();
    await connInsertReturning(conn, "activity_logs", [
      { action, details, type, timestamp: new Date().toISOString() },
    ]);
  } catch (e) {
    console.warn("log failed", e);
  }
};

// --- Stats ---
const computeStats = async (range: string, from?: string | null, to?: string | null) => {
  const conn = getActiveConnection();
  const now = new Date();
  let cutoff = new Date(0);
  let endCutoff: Date | null = null;

  if (from || to) {
    cutoff = from ? new Date(from) : new Date(0);
    endCutoff = to ? new Date(to) : null;
  } else {
    if (range === "today") cutoff = new Date(new Date().setHours(0, 0, 0, 0));
    if (range === "1w") cutoff = new Date(now.getTime() - 7 * 86400000);
    if (range === "1m") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      cutoff = d;
    }
    if (range === "1y") {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      cutoff = d;
    }
  }

  const [studentsRes, catRes, goalsRes, viewsRes] = await Promise.all([
    connSelect(conn, "students").catch(() => []),
    connSelect(conn, "categories").catch(() => []),
    connSelect(conn, "master_goals").catch(() => []),
    connSelect(conn, "page_views").catch(() => []),
  ]);

  const masterPoints = new Map<string, number>();
  (goalsRes || []).forEach((g: any) => masterPoints.set(g.id, g.points || 0));

  let totalPoints = 0;
  let completedGoals = 0;
  let activeGoals = 0;
  const chartMap: Record<string, number> = {};

  (studentsRes || []).forEach((s: any) => {
    const goals = s.assigned_goals || [];
    goals.forEach((g: any) => {
      activeGoals++;
      if (g.completed && g.completedAt) {
        const d = new Date(g.completedAt);
        if (d >= cutoff && (!endCutoff || d <= endCutoff)) {
          completedGoals++;
          const pts = g.points || masterPoints.get(g.goalId) || 0;
          totalPoints += pts;
          const day = String(g.completedAt).split("T")[0];
          chartMap[day] = (chartMap[day] || 0) + pts;
        }
      }
    });
  });

  let totalHits = 0;
  let uniqueVisitors = 0;
  let articleReads = 0;

  (viewsRes || []).forEach((v: any) => {
    if (!v.date) return;
    const d = new Date(v.date);
    if (d >= cutoff && (!endCutoff || d <= endCutoff)) {
      totalHits += (v.hits || 0);
      uniqueVisitors += (v.unique_hits || Math.ceil((v.hits || 0) * 0.3)); // mock if missing
      articleReads += (v.article_reads || 0);
    }
  });

  const chartData = Object.keys(chartMap)
    .sort()
    .map((date) => ({ date, points: chartMap[date] }));

  return {
    totalStudents: studentsRes?.length || 0,
    totalActiveGoals: activeGoals,
    totalCategories: catRes?.length || 0,
    completedGoals,
    totalPoints,
    uniqueVisitors: Math.floor(uniqueVisitors),
    totalHits,
    articleReads,
    chartData,
  };
};

// --- Router ---
async function runRouter(url: string, init: RequestInit, conn: any): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const path = url.split("?")[0];
  const queryStr = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const query = new URLSearchParams(queryStr);
  let body: any = undefined;
  if (init.body) {
    try {
      body = JSON.parse(init.body as string);
    } catch {
      body = init.body;
    }
  }

  try {
    // ===== AUTH =====
    if (path === "/api/login" && method === "POST") {
      const email = body?.email?.toLowerCase() || '';
      if (!email && body?.password === ADMIN_PASSWORD) {
        logAction("System Login", "Super Admin login", "system");
        return ok({ success: true, token: TOKEN_VALUE, role: 'super_admin' });
      }
      if (email) {
        let users = [];
        try { users = await connSelectQuery(conn, "admin_users") || []; }catch(e){}
        const found = users?.find((u) => (u.email || '').toLowerCase() === email && u.password === body?.password);
        if (found) {
          logAction("User Login", `Admin login: ${email}`, "system");
          return ok({ success: true, token: `usr_${found.id}`, role: found.role, id: found.id });
        }
      }
      logAction("Failed Login", `Percobaan login gagal untuk: ${email}`, "system");
      return fail(401, "Incorrect credentials");
    }
    if (path === "/api/logout" && method === "POST") {
      logAction("System Logout", "Admin logout", "system");
      return ok();
    }
    if (path === "/api/me" && method === "GET") {
      const headers = init.headers as any;
      let auth = null;
      if (headers && typeof headers.get === "function") auth = headers.get("Authorization") || headers.get("authorization");
      else if (headers) auth = headers.Authorization || headers.authorization;
      const token = typeof auth === "string" ? auth.replace("Bearer ", "") : null;
      
      if (!token) return fail(401, "Missing token");
      if (token === TOKEN_VALUE) {
        return ok({ 
          authenticated: true, 
          user: { id: 'legacy', role: 'super_admin', email: 'admin@system', full_name: 'System Admin', privileges: [] } 
        });
      }
      if (token.startsWith('usr_')) {
        const id = token.slice(4);
        let users = [];
        try { users = await connSelectQuery(conn, "admin_users") || []; }catch(e){}
        const user = users?.find((u) => String(u.id) === String(id));
        if (user) {
          const { password, ...safeUser } = user;
          return ok({ authenticated: true, user: safeUser });
        }
      }
      return fail(401, "Invalid token");
    }

    // ===== ADMIN USERS =====
    if (path === "/api/admin_users") {
      let users = [];
      try { users = await connSelectQuery(conn, "admin_users") || []; }catch(e){}
      
      if (method === "GET") {
        return ok(users?.map((u) => { const { password, ...r } = u; return r; }) || []);
      }
      if (method === "POST") {
        const newUser = { id: Date.now().toString(), privileges: [], created_at: new Date().toISOString(), ...body };
        await connInsertReturning(conn, "admin_users", [newUser]);
        return ok({ success: true, id: newUser.id });
      }
      if (method === "PUT") {
        if (!body.id) return fail(400, "Missing id");
        await connUpdate(conn, "admin_users", `id=eq.${body.id}`, body);
        return ok({ success: true });
      }
      if (method === "DELETE") {
        const id = query.get("id");
        if (!id) return fail(400, "Missing id");
        await connDeleteById(conn, "admin_users", id);
        return ok({ success: true });
      }
    }


    // ===== SETTINGS =====
    if (path === "/api/settings" && method === "GET") {
      const rows = await connSelectQuery(
        conn,
        "settings",
        "select=data&id=eq.appearance",
      ).catch(() => []);
      return ok(rows[0]?.data || {});
    }
    if (path === "/api/settings" && method === "PUT") {
      const payload = body || {};
      await connUpsertReturning(conn, "settings", [
        { id: "appearance", data: payload },
      ], "id");
      logAction(
        "Theme Applied",
        "Admin applied new theme and branding settings",
        "system",
      );
      return ok();
    }

    // ===== STUDENTS =====
    if (path === "/api/students" && method === "GET") {
      const rows = await connSelect(conn, "students");
      return ok(rows.map(mapStudentRow));
    }
    if (path === "/api/students" && method === "POST") {
      const input = mapStudentInput(body || {});
      const rows = await connInsertReturning(conn, "students", [input]);
      return ok(mapStudentRow(rows[0] || input));
    }
    if (path === "/api/students/snapshot-ranks" && method === "POST") {
      const [students, goals] = await Promise.all([
        connSelect(conn, "students"),
        connSelect(conn, "master_goals"),
      ]);
      const map = new Map<string, number>();
      (goals || []).forEach((g: any) => map.set(g.id, g.points || 0));
      const ranked = (students || [])
        .map((s: any) => {
          const pts = (s.assigned_goals || []).reduce(
            (acc: number, g: any) =>
              g.completed ? acc + (g.points || map.get(g.goalId) || 0) : acc,
            0,
          );
          return { id: s.id, pts };
        })
        .sort((a: any, b: any) => b.pts - a.pts);
      // Cap at 4 concurrent UPDATEs so we don't flood the DB / proxy.
      await runWithConcurrency(
        ranked,
        (s: any, idx: number) =>
          connUpdate(conn, "students", `id=eq.${s.id}`, {
            previous_rank: idx + 1,
          }),
        4,
      );
      return ok();
    }
    const studentMatch = path.match(/^\/api\/students\/([^/]+)$/);
    if (studentMatch) {
      const id = studentMatch[1];
      if (method === "PUT") {
        const input = mapStudentInput(body || {});
        const rows = await connUpdate(conn, "students", `id=eq.${id}`, input);
        logAction(
          "Student Updated",
          `Updated data/goals for student ${body?.name || id}`,
          "education",
        );
        return ok(mapStudentRow(rows[0] || { id, ...input }));
      }
      if (method === "DELETE") {
        await connDeleteById(conn, "students", id);
        return ok();
      }
    }

    // ===== CATEGORIES =====
    if (path === "/api/categories" && method === "GET") {
      const rows = await connSelect(conn, "categories");
      return ok(rows.map(mapCategoryRow));
    }
    if (path === "/api/categories" && method === "POST") {
      const input = mapCategoryInput(body || {});
      const rows = await connInsertReturning(conn, "categories", [input]);
      return ok(mapCategoryRow(rows[0] || input));
    }
    const catMatch = path.match(/^\/api\/categories\/([^/]+)$/);
    if (catMatch) {
      const id = catMatch[1];
      if (method === "PUT") {
        const input = mapCategoryInput(body || {});
        const rows = await connUpdate(conn, "categories", `id=eq.${id}`, input);
        return ok(mapCategoryRow(rows[0] || { id, ...input }));
      }
      if (method === "DELETE") {
        await connDeleteById(conn, "categories", id);
        return ok();
      }
    }

    // ===== MASTER GOALS =====
    if (path === "/api/masterGoals" && method === "GET") {
      const rows = await connSelect(conn, "master_goals");
      return ok(rows.map(mapGoalRow));
    }
    if (path === "/api/masterGoals" && method === "POST") {
      const input = mapGoalInput(body || {});
      const rows = await connInsertReturning(conn, "master_goals", [input]);
      return ok(mapGoalRow(rows[0] || input));
    }
    const goalMatch = path.match(/^\/api\/masterGoals\/([^/]+)$/);
    if (goalMatch) {
      const id = goalMatch[1];
      if (method === "PUT") {
        const input = mapGoalInput(body || {});
        const rows = await connUpdate(conn, "master_goals", `id=eq.${id}`, input);
        return ok(mapGoalRow(rows[0] || { id, ...input }));
      }
      if (method === "DELETE") {
        await connDeleteById(conn, "master_goals", id);
        return ok();
      }
    }

    // ===== TRACK VISIT =====
    if (path === "/api/track-visit" && method === "POST") {
      const today = new Date().toISOString().split("T")[0];
      const isUnique = !!body?.isUnique;
      const existing = await connSelectQuery(
        conn,
        "page_views",
        `select=*&date=eq.${today}`, // Get all fields
      ).catch(() => []);
      
      const hits = (existing[0]?.hits || 0) + 1;
      const unique_hits = (existing[0]?.unique_hits || 0) + (isUnique ? 1 : 0);
      const article_reads = existing[0]?.article_reads || 0; // Preserve

      await connUpsertReturning(conn, "page_views", [{ date: today, hits, unique_hits, article_reads }], "date");
      return ok();
    }

    if (path === "/api/track-article" && method === "POST") {
      const today = new Date().toISOString().split("T")[0];
      const postId = body?.postId;
      
      // 1. increment global daily article reads
      const existingDaily = await connSelectQuery(conn, "page_views", `select=*&date=eq.${today}`).catch(() => []);
      const article_reads = (existingDaily[0]?.article_reads || 0) + 1;
      const hits = existingDaily[0]?.hits || 0;
      const unique_hits = existingDaily[0]?.unique_hits || 0;
      await connUpsertReturning(conn, "page_views", [{ date: today, hits, unique_hits, article_reads }], "date");

      // 2. increment specific post's organic_views
      if (postId) {
        const existingPost = await connSelectQuery(conn, "posts", `id=eq.${postId}`).catch(()=>[]);
        if (existingPost && existingPost[0]) {
           const organic = (existingPost[0].organic_views || 0) + 1;
           await connUpdate(conn, "posts", `id=eq.${postId}`, { organic_views: organic });
        }
      }
      return ok();
    }

    // ===== LOGS =====
    if (path === "/api/logs" && method === "POST") { await connInsertReturning(conn, "activity_logs", [{ id: "log-"+Date.now(), timestamp: new Date().toISOString(), ...body }]).catch(()=>[]); return ok({success: true}); }
    if (path === "/api/logs" && method === "GET") {
      const rows = await connSelectQuery(
        conn,
        "activity_logs",
        "select=*&order=timestamp.desc&limit=500",
      ).catch(() => []);
      return ok(rows);
    }

    // ===== EVENTS =====
    if (path === "/api/events" && method === "GET") {
      const rows = await connSelectQuery(
        conn,
        "app_events",
        "select=*&order=created_at.desc&limit=500",
      ).catch(() => []);
      return ok(rows);
    }
    if (path === "/api/events" && method === "POST") {
      // Do NOT pass a custom string id — `app_events.id` is uuid with a
      // gen_random_uuid() default. Strip any client-supplied id to let the
      // database generate a valid UUID.
      const { id: _ignored, ...eventBody } = (body ?? {}) as Record<string, unknown>;
      await connInsertReturning(conn, "app_events", [eventBody]).catch(() => []);
      return ok({ success: true });
    }

    // ===== STATS =====
    if (path.startsWith("/api/stats") && method === "GET") {
      const range = query.get("range") || "all";
      const from = query.get("from");
      const to = query.get("to");
      return ok(await computeStats(range, from, to));
    }

    // ===== POSTS =====
    if (path === "/api/posts") {
      if (method === "GET") {
        let rows = [];
        try { rows = await connSelectQuery(conn, "posts", "select=*&order=created_at.desc") || []; }catch(e){}
        return ok((rows as any[]).map(normalizePostRow));
      }
      if (method === "POST") {
        const input = normalizePostWrite({
          ...body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        // Remove client-side id to let DB generate UUID
        delete (input as any).id;
        const rows = await connInsertReturning(conn, "posts", [input]);
        logAction("Artikel Dibuat", `Admin membuat artikel baru: ${input.title}`, "system");
        return ok(normalizePostRow(rows?.[0] || input));
      }
    }
    const postMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (postMatch) {
      const id = postMatch[1];
      if (method === "PUT") {
        const input = normalizePostWrite({ ...body, updated_at: new Date().toISOString() });
        const rows = await connUpdate(conn, "posts", `id=eq.${id}`, input);
        logAction("Artikel Diperbarui", `Admin memperbarui artikel: ${input.title || id}`, "system");
        return ok(normalizePostRow(rows?.[0] || { id, ...input }));
      }
      if (method === "DELETE") {
        await connDeleteById(conn, "posts", id);
        logAction("Artikel Dihapus", `Admin menghapus artikel: ${id}`, "system");
        return ok({ success: true });
      }
    }

    // ===== SEEDING =====
    if (path === "/api/seeding" && method === "POST") {
      logAction("System Action", "Memulai proses Seeding Data Dummies", "system");
      
      try {
        const existingCats = await connSelectQuery(conn, "categories").catch((e) => {
          if (e.message && e.message.includes("Database '(default)' not found")) {
            throw new Error("Database Cloud Firestore belum diaktifkan! Silakan buka Firebase Console -> Cloud Firestore -> Create Database.");
          }
          return [];
        });

        if (existingCats.length === 0) {
          const cats = [
            { id: "cat-1", name: "Al-Qur'an & Hadist" },
            { id: "cat-2", name: "Fiqih & Ibadah" },
            { id: "cat-3", name: "Akhlaq & Adab" }
          ];
          await connInsertReturning(conn, "categories", cats);
        }

        const existingGoals = await connSelectQuery(conn, "master_goals").catch(() => []);
        if (existingGoals.length === 0) {
          const goals = [
            { id: "goal-1", category_id: "cat-1", title: "Hafalan Juz 30", points: 100, description: "Menyelesaikan hafalan juz amma dengan baik" },
            { id: "goal-2", category_id: "cat-2", title: "Praktek Wudhu & Shalat", points: 50, description: "Bisa praktek 100% benar" },
            { id: "goal-3", category_id: "cat-3", title: "Adab Sehari-hari", points: 75, description: "Menerapkan adab makan, tidur, dan berbicara" }
          ];
          await connInsertReturning(conn, "master_goals", goals);
        }

        const existingStudents = await connSelectQuery(conn, "students").catch(() => []);
        if (existingStudents.length === 0) {
          const students = [
            { id: "stu-1", name: "Ahmad Santoso", bio: "Fokus menghafal Al-Qur'an", photo: "", tags: ["Kamar 1", "Baru"], assigned_goals: [{ goalId: "goal-2", points: 50, completed: true, completedAt: new Date().toISOString() }], total_points: 50 },
            { id: "stu-2", name: "Budi Pratama", bio: "Sangat rajin tadarus", photo: "", tags: ["Kamar 2"], assigned_goals: [{ goalId: "goal-1", points: 100, completed: false, completedAt: null }], total_points: 0 }
          ];
          await connInsertReturning(conn, "students", students);
        }

        const existingPosts = await connSelectQuery(conn, "posts").catch(() => []);
        if (existingPosts.length === 0) {
          const postsToInsert = SEED_POSTS.map((p, i) => ({
            id: `post-${i + 1}`,
            title: p.title,
            slug: p.slug,
            content: p.content,
            excerpt: p.excerpt,
            author: "admin-master",
            author_id: "admin-master",
            published: true,
            status: "published",
            category: p.category,
            featured_image: p.featured_image,
            cover_image: p.featured_image,
            organic_views: 0,
            offset_views: 0,
            created_at: new Date(Date.now() - p.daysAgo * 86400000).toISOString(),
            updated_at: new Date(Date.now() - p.daysAgo * 86400000).toISOString(),
            published_at: new Date(Date.now() - p.daysAgo * 86400000).toISOString(),
            tags: p.tags
          }));
          await connInsertReturning(conn, "posts", postsToInsert);
        }
        
        // Auto-create super admin
        const admins = await connSelectQuery(conn, "admin_users").catch(() => []);
        const hasSuper = admins.some((u) => u.role === "super_admin");
        if (!hasSuper) {
          await connInsertReturning(conn, "admin_users", [{ id: "admin-master", email: "admin@master.com", full_name: "Super Administrator", role: "super_admin", password: "admin", privileges: [], created_at: new Date().toISOString() }]);
        }

        return ok({ success: true, message: "Seeding selesai" });
      } catch (err: any) {
        return fail(500, String(err?.message || err));
      }
    }

    // ===== EXPERT RESTORE =====
    if (path === "/api/snapshot/restore" && method === "POST") {
      const snapshot = body;
      try {
        if (snapshot.categories && snapshot.categories.length > 0) {
          await connInsertReturning(conn, "categories", snapshot.categories);
        }
        if (snapshot.masterGoals && snapshot.masterGoals.length > 0) {
          await connInsertReturning(conn, "master_goals", snapshot.masterGoals);
        }
        if (snapshot.students && snapshot.students.length > 0) {
          await connInsertReturning(conn, "students", snapshot.students);
        }
        if (snapshot.posts && snapshot.posts.length > 0) {
          await connInsertReturning(conn, "posts", snapshot.posts);
        }
        if (snapshot.logs && snapshot.logs.length > 0) {
           await connInsertReturning(conn, "activity_logs", snapshot.logs);
        }
        // Write settings or other stuff if needed
        return ok({ success: true });
      } catch (err: any) {
        return fail(500, "Failed to restore: " + (err.message || String(err)));
      }
    }

    return fail(404, `No handler for ${method} ${path}`);
  } catch (err: any) {
    console.error("api error:", method, path, err);
    return fail(500, String(err?.message || err));
  }
}

// Public entry point. Tries the active connection; if it fails (e.g. broken
// external Supabase project the user added) we mark it failed, fall back to
// the default Lovable Cloud connection, and retry once. This guarantees the
// app shell always loads instead of hanging on a dead backend.
export async function firebaseApiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const conn = getActiveConnection();
  const method = (init.method || 'GET').toUpperCase();
  const path = url.split('?')[0];
  const isCacheableRead =
    method === 'GET' &&
    (path === '/api/students' ||
      path === '/api/categories' ||
      path === '/api/masterGoals' ||
      path === '/api/settings' ||
      path === '/api/admin_users' ||
      path === '/api/posts' ||
      path === '/api/logs' ||
      path === '/api/events');
  const cacheScope = isCacheableRead ? `read::${url}` : null;

  const finalize = async (res: Response) => {
    if (cacheScope && res.ok) {
      try {
        const clone = res.clone();
        const data = await clone.json();
        writeCache(conn.id, cacheScope, data);
      } catch {}
    }
    return res;
  };

  try {
    const res = await runRouter(url, init, conn);
    if (res.status >= 500 && conn.id !== DEFAULT_CONNECTION_ID) {
      throw new Error('backend 5xx');
    }
    return finalize(res);
  } catch (err: any) {
    // 1) Try cached read so UI never shows blank when remote is unreachable.
    if (cacheScope) {
      const cached = readCache<any>(conn.id, cacheScope);
      if (cached !== null) {
        console.warn(
          `[firebaseApiFetch] ${url} failed; serving local cache for ${conn.id}.`,
          err?.message || err,
        );
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Local-Cache': '1' },
        });
      }
    }
    // 2) Fallback to default connection if the active one is broken.
    if (conn.id !== DEFAULT_CONNECTION_ID) {
      console.warn(
        `[firebaseApiFetch] active connection ${conn.id} failed, falling back to default`,
        err?.message || err,
      );
      markConnectionFailed(conn.id);
      const res = await runRouter(url, init, getActiveConnection());
      return finalize(res);
    }
    throw err;
  }
}
