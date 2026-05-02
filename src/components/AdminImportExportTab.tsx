import React, { useMemo, useRef, useState } from 'react';
import { Download, Upload, FileText, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { toCSV, downloadCSV, parseCSV } from '../lib/csv';

type ApiFetch = (url: string, init?: RequestInit) => Promise<Response>;

interface Props {
  apiFetch: ApiFetch;
  students: any[];
  masterGoals: any[];
  categories: any[];
  refreshData: () => void;
}

type DatasetKey = 'students' | 'goals' | 'categories' | 'tracks_full' | 'stats_overview' | 'stats_chart' | 'logs';
type ImportType = 'students' | 'students_names' | 'goals' | 'goals_titles' | 'categories';

const today = () => new Date().toISOString().split('T')[0];

export function AdminImportExportTab({ apiFetch, students, masterGoals, categories, refreshData }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [statsRange, setStatsRange] = useState<'today' | '1w' | '1m' | '1y' | 'all'>('1m');
  const [importType, setImportType] = useState<ImportType>('students_names');
  const [previewRows, setPreviewRows] = useState<Record<string, string>[] | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ============= EXPORT =============
  const handleExport = async (key: DatasetKey) => {
    setBusy(key);
    try {
      let csv = '';
      let filename = `${key}_${today()}.csv`;
      if (key === 'students') {
        const rows = (students || []).map((s) => {
          const completed = (s.assignedGoals || []).filter((g: any) => g.completed).length;
          const totalPts = (s.assignedGoals || []).reduce((acc: number, g: any) => {
            if (!g.completed) return acc;
            const mg = goalById.get(String(g.goalId));
            return acc + (g.points || mg?.points || 0);
          }, 0);
          return {
            id: s.id,
            name: s.name,
            bio: s.bio || '',
            tags: (s.tags || []).join('|'),
            assigned_goals_count: (s.assignedGoals || []).length,
            completed_goals_count: completed,
            total_points: totalPts,
            previous_rank: s.previousRank ?? '',
            created_at: s.createdAt ?? '',
          };
        });
        csv = toCSV(rows);
      } else if (key === 'goals') {
        const rows = (masterGoals || []).map((g) => ({
          id: g.id,
          title: g.title,
          points: g.points,
          description: g.description || '',
          category_id: g.categoryId || '',
          category_name: categoryById.get(String(g.categoryId))?.name || '',
        }));
        csv = toCSV(rows);
      } else if (key === 'categories') {
        const rows = (categories || []).map((c) => ({ id: c.id, name: c.name }));
        csv = toCSV(rows);
      } else if (key === 'tracks_full') {
        // Long-form: one row per (student, assigned goal)
        const rows: any[] = [];
        (students || []).forEach((s) => {
          (s.assignedGoals || []).forEach((g: any) => {
            const mg = goalById.get(String(g.goalId));
            rows.push({
              student_id: s.id,
              student_name: s.name,
              goal_id: g.goalId,
              goal_title: mg?.title || '',
              category_id: mg?.categoryId || '',
              category_name: categoryById.get(String(mg?.categoryId))?.name || '',
              points: g.points || mg?.points || 0,
              completed: g.completed ? 'true' : 'false',
              completed_at: g.completedAt || '',
            });
          });
        });
        csv = toCSV(rows, [
          'student_id', 'student_name', 'goal_id', 'goal_title',
          'category_id', 'category_name', 'points', 'completed', 'completed_at',
        ]);
      } else if (key === 'stats_overview' || key === 'stats_chart') {
        const res = await apiFetch(`/api/stats?range=${statsRange}`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const stats = await res.json();
        if (key === 'stats_overview') {
          const rows = [{
            range: statsRange,
            generated_at: new Date().toISOString(),
            total_students: stats.totalStudents,
            total_active_goals: stats.totalActiveGoals,
            total_categories: stats.totalCategories,
            completed_goals: stats.completedGoals,
            total_points: stats.totalPoints,
            unique_visitors: stats.uniqueVisitors,
          }];
          csv = toCSV(rows);
          filename = `stats_overview_${statsRange}_${today()}.csv`;
        } else {
          csv = toCSV(stats.chartData || [], ['date', 'points']);
          filename = `stats_points_trend_${statsRange}_${today()}.csv`;
        }
      } else if (key === 'logs') {
        const res = await apiFetch('/api/logs');
        if (!res.ok) throw new Error('Failed to fetch logs');
        const logs = await res.json();
        csv = toCSV(logs || [], ['timestamp', 'type', 'action', 'details', 'id']);
      }
      downloadCSV(filename, csv);
    } catch (e: any) {
      alert('Export failed: ' + (e?.message || e));
    } finally {
      setBusy(null);
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
      setImportMessage({ type: 'error', text: 'Could not read CSV: ' + (e?.message || e) });
      setPreviewRows(null);
    }
  };

  const runImport = async () => {
    if (!previewRows || previewRows.length === 0) return;
    setBusy('import');
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
      if (importType === 'students_names' || importType === 'students') {
        const nameCol = findCol(['name', 'student_name', 'full_name']);
        if (!nameCol) throw new Error('CSV must have a "name" column.');
        const bioCol = findCol(['bio', 'description']);
        const photoCol = findCol(['photo', 'avatar', 'image']);
        const tagsCol = findCol(['tags']);
        for (const row of previewRows) {
          const name = (row[nameCol] || '').trim();
          if (!name) continue;
          const payload: any = { name };
          if (importType === 'students') {
            if (bioCol) payload.bio = row[bioCol] || '';
            if (photoCol) payload.photo = row[photoCol] || '';
            if (tagsCol) {
              const raw = (row[tagsCol] || '').trim();
              if (raw) payload.tags = raw.split(/[|,;]/).map((t) => t.trim()).filter(Boolean);
            }
          }
          const res = await apiFetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) inserted++;
          else { failed++; errors.push(`Row "${name}" failed`); }
        }
      } else if (importType === 'goals_titles' || importType === 'goals') {
        const titleCol = findCol(['title', 'goal', 'name']);
        if (!titleCol) throw new Error('CSV must have a "title" column.');
        const ptsCol = findCol(['points', 'pts']);
        const descCol = findCol(['description', 'desc']);
        const catIdCol = findCol(['category_id', 'categoryid']);
        const catNameCol = findCol(['category_name', 'category']);
        // Build name->id map for category lookup
        const catNameToId = new Map<string, string>();
        (categories || []).forEach((c) => catNameToId.set(c.name.toLowerCase(), c.id));
        for (const row of previewRows) {
          const title = (row[titleCol] || '').trim();
          if (!title) continue;
          const payload: any = { title, points: 0 };
          if (importType === 'goals') {
            const ptsRaw = ptsCol ? row[ptsCol] : '';
            const pts = parseInt(String(ptsRaw || '0'), 10);
            payload.points = isNaN(pts) ? 0 : pts;
            if (descCol) payload.description = row[descCol] || '';
            let categoryId: string | undefined;
            if (catIdCol && row[catIdCol]) categoryId = row[catIdCol];
            else if (catNameCol && row[catNameCol]) categoryId = catNameToId.get(row[catNameCol].toLowerCase().trim());
            if (categoryId) payload.categoryId = categoryId;
          }
          const res = await apiFetch('/api/masterGoals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) inserted++;
          else { failed++; errors.push(`Row "${title}" failed`); }
        }
      } else if (importType === 'categories') {
        const nameCol = findCol(['name', 'category', 'category_name']);
        if (!nameCol) throw new Error('CSV must have a "name" column.');
        for (const row of previewRows) {
          const name = (row[nameCol] || '').trim();
          if (!name) continue;
          const res = await apiFetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          if (res.ok) inserted++;
          else { failed++; errors.push(`Row "${name}" failed`); }
        }
      }

      // Log activity
      try {
        await apiFetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CSV Import',
            details: `Imported ${inserted} ${importType} rows (${failed} failed)`,
            type: 'system',
            timestamp: new Date().toISOString(),
          })
        });
      } catch {}

      setImportMessage({
        type: failed > 0 ? 'error' : 'success',
        text: `Imported ${inserted} rows${failed > 0 ? ` · ${failed} failed` : ''}.`,
      });
      if (inserted > 0) refreshData();
      if (failed === 0) {
        setPreviewRows(null);
        setPreviewHeaders([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (e: any) {
      setImportMessage({ type: 'error', text: e?.message || String(e) });
    } finally {
      setBusy(null);
    }
  };

  // ============= UI =============
  const ExportCard = ({
    icon: Icon, title, subtitle, dataKey, count,
  }: { icon: any; title: string; subtitle: string; dataKey: DatasetKey; count?: number }) => (
    <div className="bg-background border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-foreground truncate">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {typeof count === 'number' && (
            <p className="text-[11px] text-muted-foreground/60 mt-1 font-mono">{count} record{count === 1 ? '' : 's'}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => handleExport(dataKey)}
        disabled={busy === dataKey}
        className="mt-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11"
      >
        {busy === dataKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Export CSV
      </button>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 space-y-10">
      {/* HEADER */}
      <div>
        <h3 className="text-2xl font-black text-foreground underline decoration-primary-500 decoration-4 underline-offset-8">
          Import / Export
        </h3>
        <p className="text-muted-foreground font-medium mt-2 text-sm">
          Backup, share, or seed data using CSV files. Exports always include current live data.
        </p>
      </div>

      {/* EXPORT SECTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h4 className="text-lg font-black text-foreground">Ekspor Data</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ExportCard icon={Database} title="Students" subtitle="Profile + summary stats per student" dataKey="students" count={students?.length} />
          <ExportCard icon={Database} title="Tracks & Goals" subtitle="All master goals with points & category" dataKey="goals" count={masterGoals?.length} />
          <ExportCard icon={Database} title="Categories" subtitle="Goal category list" dataKey="categories" count={categories?.length} />
          <ExportCard icon={FileText} title="Assigned Tracks (long form)" subtitle="One row per student × goal, with completion" dataKey="tracks_full" />
          <ExportCard icon={FileText} title="Log Aktivitas" subtitle="Aktivitas admin & pendidikan terbaru" dataKey="logs" />
        </div>

        {/* Stats export */}
        <div className="bg-background border border-border rounded-2xl p-4 sm:p-5 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-foreground">Statistics CSV</h4>
              <p className="text-xs text-muted-foreground">Export aggregate stats for the selected time range.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  { v: 'today', l: 'Today' },
                  { v: '1w', l: 'Last week' },
                  { v: '1m', l: 'Last month' },
                  { v: '1y', l: 'Last year' },
                  { v: 'all', l: 'All time' },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setStatsRange(opt.v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      statsRange === opt.v
                        ? 'bg-primary text-white border-primary-600'
                        : 'bg-card text-muted-foreground border-border hover:border-primary-300'
                    }`}
                  >{opt.l}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => handleExport('stats_overview')}
                disabled={busy === 'stats_overview'}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11"
              >
                {busy === 'stats_overview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Overview
              </button>
              <button
                onClick={() => handleExport('stats_chart')}
                disabled={busy === 'stats_chart'}
                className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:bg-secondary font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11"
              >
                {busy === 'stats_chart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              What does the CSV contain?
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {([
                { v: 'students_names', l: 'Student names', hint: '"name" column only' },
                { v: 'students', l: 'Students (full)', hint: 'name, bio, tags, photo' },
                { v: 'goals_titles', l: 'Goal titles', hint: '"title" column only' },
                { v: 'goals', l: 'Goals (full)', hint: 'title, points, category_name' },
                { v: 'categories', l: 'Categories', hint: '"name" column' },
              ] as { v: ImportType; l: string; hint: string }[]).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => { setImportType(opt.v); setImportMessage(null); }}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    importType === opt.v
                      ? 'border-primary-600 bg-primary/10'
                      : 'border-border bg-card hover:border-primary-300'
                  }`}
                >
                  <div className="font-bold text-sm text-foreground">{opt.l}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</div>
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
                disabled={busy === 'import'}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60 min-h-11 shrink-0"
              >
                {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import {previewRows.length} row{previewRows.length === 1 ? '' : 's'}
              </button>
            )}
          </div>

          {/* Status message */}
          {importMessage && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${
              importMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {importMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{importMessage.text}</span>
            </div>
          )}

          {/* Preview */}
          {previewRows && previewRows.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-card border-b border-border text-xs font-bold text-muted-foreground">
                Preview · {previewRows.length} row{previewRows.length === 1 ? '' : 's'} · {previewHeaders.length} column{previewHeaders.length === 1 ? '' : 's'}
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-background sticky top-0">
                    <tr>
                      {previewHeaders.map((h) => (
                        <th key={h} className="text-left font-bold text-foreground px-3 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 25).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {previewHeaders.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-muted-foreground whitespace-nowrap max-w-[220px] truncate">{r[h]}</td>
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
            Tip: Export a sample first to see the exact column format expected. New records are always added (no duplicate check).
          </div>
        </div>
      </section>
    </div>
  );
}
