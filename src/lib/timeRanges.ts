// Centralized time-range labels, presets and helpers used across the app.
// Keep UI text consistent — never hardcode "total"/"all-time" strings in components.

export type TimeRange = 'all-time' | 'monthly' | 'weekly';

export const TIME_RANGE = {
  ALL_TIME: 'all-time',
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
} as const satisfies Record<string, TimeRange>;

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
  shortLabel: string;
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: TIME_RANGE.ALL_TIME, label: 'Sepanjang waktu', shortLabel: 'Semua' },
  { value: TIME_RANGE.MONTHLY,  label: 'Bulanan',  shortLabel: 'Bulanan'  },
  { value: TIME_RANGE.WEEKLY,   label: 'Mingguan',   shortLabel: 'Mingguan'   },
];

export const POINTS_CAPTION = {
  ALL_TIME: 'Total Poin',
  MONTHLY: 'Poin Bulanan',
  WEEKLY: 'Poin Mingguan',
} as const;

export const STATS_CAPTION = {
  STUDENTS: 'Total Siswa',
  ACTIVE_GOALS: 'Tujuan Aktif',
  UNIQUE_VIEWS: 'Total Tayangan Unik',
  POINTS_DISTRIBUTED: 'Total Poin Didistribusikan',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Chart-level filter presets used by the reusable <TimeRangeFilter /> component.
// Charts share these so wording stays consistent everywhere a time range is shown.

export type RangePreset = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'last-year' | 'all-time' | 'custom';

export interface RangePresetOption {
  value: RangePreset;
  label: string;
}

export const RANGE_PRESET_OPTIONS: RangePresetOption[] = [
  { value: 'this-week',  label: 'Minggu ini'  },
  { value: 'last-week',  label: 'Minggu lalu'  },
  { value: 'this-month', label: 'Bulan ini' },
  { value: 'last-month', label: 'Bulan lalu' },
  { value: 'last-3-months', label: '3 bulan lalu' },
  { value: 'last-6-months', label: '6 bulan lalu' },
  { value: 'last-year',  label: 'Tahun lalu'  },
  { value: 'all-time',   label: 'Sepanjang waktu'   },
  { value: 'custom',     label: 'Rentang kustom' },
];

export interface DateRange {
  /** Inclusive start (00:00:00). null = unbounded (all-time). */
  start: Date | null;
  /** Inclusive end (23:59:59.999). null = unbounded. */
  end: Date | null;
}

export const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const endOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/** Resolve a preset into a concrete DateRange relative to `now`. */
export function presetToRange(preset: RangePreset, now: Date = new Date()): DateRange {
  if (preset === 'all-time') return { start: null, end: null };
  if (preset === 'custom')   return { start: null, end: null };

  const end = endOfDay(now);
  const start = new Date(now);
  if (preset === 'this-week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
  }
  if (preset === 'last-week')  start.setDate(now.getDate() - 6);   // 7-day window incl. today
  if (preset === 'this-month') start.setDate(1);
  if (preset === 'last-month') start.setDate(now.getDate() - 29);  // 30-day window
  if (preset === 'last-3-months') start.setMonth(now.getMonth() - 3);
  if (preset === 'last-6-months') start.setMonth(now.getMonth() - 6);
  if (preset === 'last-year')  start.setFullYear(now.getFullYear() - 1);
  return { start: startOfDay(start), end };
}

/** True if a timestamp falls inside `range`. Unbounded sides match anything. */
export function isWithinRange(ts: number | Date, range: DateRange): boolean {
  const t = typeof ts === 'number' ? ts : ts.getTime();
  if (isNaN(t)) return false;
  if (range.start && t < range.start.getTime()) return false;
  if (range.end && t > range.end.getTime()) return false;
  return true;
}

/** Format a Date as YYYY-MM-DD for <input type="date"> binding. */
export function toDateInputValue(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date. */
export function fromDateInputValue(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
