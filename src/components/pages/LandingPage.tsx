'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Post, Student } from '../../lib/types';
import Link from 'next/link';
import {
  ArrowRight, Trophy, BookOpen, Activity, Star, Users, Eye, Sparkles,
  GraduationCap, Newspaper, Target,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { HScroller, HScrollItem } from '@/components/ui/HScroller';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { ArticleCard } from '@/components/ui/ArticleCard';
import { SmartSearchBar, type SortKey } from '@/components/ui/SmartSearchBar';

function todayLabel() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function LandingPage() {
  const { data: allPosts = [] } = useQuery<Post[]>({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      return all.filter((p) => p.status === 'published');
    },
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['public-students'],
    queryFn: async () => {
      const res = await apiFetch('/api/students');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  // Categories
  const categoryCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    allPosts.forEach((p) => {
      const cat = (p.category || 'Umum').trim();
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allPosts]);

  // Filter / sort / search state
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('newest');
  const [activeCat, setActiveCat] = React.useState<string | null>(null);

  const filteredPosts = React.useMemo(() => {
    let list = [...allPosts];
    if (activeCat) list = list.filter((p) => (p.category || 'Umum') === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return (a.published_at || '').localeCompare(b.published_at || '');
        case 'popular':
          return (((b as any).views || 0) - ((a as any).views || 0));
        case 'az':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return (b.published_at || '').localeCompare(a.published_at || '');
      }
    });
    return list;
  }, [allPosts, activeCat, search, sort]);

  const featuredPosts = filteredPosts.slice(0, 8);

  const topStudents = [...students]
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, 8);

  // Stats Hook
  const [statsRange, setStatsRange] = React.useState('all');
  const { data: analytics } = useQuery({
    queryKey: ['public-analytics', statsRange],
    queryFn: async () => {
      const res = await apiFetch(`/api/stats?range=${statsRange}`);
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    }
  });

  // Stats
  const totalViews = allPosts.reduce((s, p) => s + (((p as any).organic_views as number) || 0) + (((p as any).offset_views as number) || 0), 0);
  const totalPoints = students.reduce((s, st) => s + (st.totalPoints || 0), 0);
  const stats = [
    { label: 'Web Visitors', value: analytics?.uniqueVisitors || 0, icon: Users, hint: 'Pengunjung Unik' },
    { label: 'Artikel Dibaca', value: analytics?.articleReads || totalViews || 0, icon: Eye, hint: 'Global Article Readers' },
    { label: 'Santri', value: students.length, icon: Users, hint: 'Santri terdaftar' },
    { label: 'Artikel', value: allPosts.length, icon: Newspaper, hint: 'Telah diterbitkan' },
    { label: 'Total Poin', value: totalPoints, icon: Target, hint: 'Capaian santri' },
    { label: 'Kategori', value: categoryCounts.length, icon: BookOpen, hint: 'Rubrik aktif' },
  ];

  // Mock trends
  const trendData = [
    { name: 'Sen', aktif: 40 }, { name: 'Sel', aktif: 30 }, { name: 'Rab', aktif: 20 },
    { name: 'Kam', aktif: 27 }, { name: 'Jum', aktif: 18 }, { name: 'Sab', aktif: 23 },
    { name: 'Min', aktif: 34 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero / Masthead — static grid on PC/tablet for visual emphasis */}
      <section className="border-b-4 border-double border-foreground">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-4 inline-flex items-center gap-2">
              <Activity className="w-3 h-3" /> {todayLabel()}
            </p>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-black text-foreground tracking-tight leading-[0.9]">
              PPMH <span className="italic font-normal text-primary">Insight</span>
            </h1>
            <div className="mt-6 max-w-2xl mx-auto">
              <p className="font-serif-body italic text-lg md:text-xl text-foreground/70 leading-relaxed">
                Pusat data, pencapaian santri, dan berita terkini Pondok Pesantren Miftahul Huda — disajikan dengan keterbukaan dan kejernihan.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link href="/leaderboard" className="px-7 py-3 bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors w-full sm:w-auto inline-flex justify-center items-center">
                <Trophy className="w-4 h-4 mr-2" /> Leaderboard
              </Link>
              <Link href="/blog" className="px-7 py-3 border-2 border-foreground text-foreground font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors w-full sm:w-auto inline-flex justify-center items-center">
                <BookOpen className="w-4 h-4 mr-2" /> Baca Insight
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Smart Search + Category Chips (sticky-ish discovery bar) */}
      <section className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 space-y-3">
          <SmartSearchBar
            value={search}
            onChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            placeholder="Telusuri berita, kategori, atau topik…"
          />
          {categoryCounts.length > 0 && (
            <CategoryChips
              categories={categoryCounts}
              activeName={activeCat}
              onSelect={setActiveCat}
            />
          )}
        </div>
      </section>

      {/* Berita Unggulan — horizontal rail */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-2 inline-flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Sekilas PPMH
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-black text-foreground tracking-tight">
              <Star className="w-6 h-6 text-primary inline mr-2" />
              {activeCat ? activeCat : 'Berita Unggulan'}
              {search && <span className="font-normal italic text-base text-muted-foreground ml-3">"{search}"</span>}
            </h2>
          </div>
          <Link href="/blog" className="hidden sm:inline-flex items-center text-foreground font-bold hover:text-primary transition-colors uppercase tracking-widest text-xs border-b border-foreground hover:border-primary pb-1">
            Semua Artikel <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
        <div className="editorial-rule mb-6" />

        {featuredPosts.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-serif-body italic">
              Tidak ada artikel yang cocok dengan filter Anda.
            </p>
          </div>
        ) : (
          <HScroller ariaLabel="Berita unggulan">
            {featuredPosts.map((post) => (
              <HScrollItem key={post.id}>
                <ArticleCard post={post} showViews={sort === 'popular'} />
              </HScrollItem>
            ))}
          </HScroller>
        )}
      </section>

      {/* Statistik PPMH — horizontal rail */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-14">
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-6">
          <span className="text-foreground inline-flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-primary" /> Statistik PPMH
          </span>
          <span className="flex-1 editorial-rule" />
          <select 
            value={statsRange} 
            onChange={e => setStatsRange(e.target.value)}
            className="bg-transparent border border-border text-foreground rounded-lg py-1 px-2 text-[10px] focus:outline-none"
          >
            <option value="today">Hari Ini</option>
            <option value="1w">Minggu Ini</option>
            <option value="1m">Bulan Ini</option>
            <option value="1y">Tahun Ini</option>
            <option value="all">All-Time</option>
          </select>
        </div>

        <HScroller ariaLabel="Statistik PPMH">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="snap-start shrink-0 w-[60%] sm:w-[34%] md:w-[24%] lg:w-[20%]"
              >
                <div className="h-full p-5 rounded-2xl border border-border bg-card hover:border-foreground transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="font-display text-3xl font-black text-foreground mt-1">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate font-serif-body italic">
                    {s.hint}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Trend mini chart card inside the same rail */}
          <div className="snap-start shrink-0 w-[80%] sm:w-[60%] md:w-[40%] lg:w-[34%]">
            <div className="h-full p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
                  Tren Aktivitas
                </p>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">7 Hari</span>
              </div>
              <div className="h-28 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="landingAktif" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis hide />
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }} />
                    <Area type="monotone" dataKey="aktif" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#landingAktif)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </HScroller>
      </section>

      {/* Top Santri — horizontal rail */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-14">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Top Santri</h2>
          </div>
          <Link href="/leaderboard" className="text-primary text-xs font-bold uppercase tracking-widest hover:underline inline-flex items-center">
            Semua <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        <div className="editorial-rule mb-6" />

        {topStudents.length === 0 ? (
          <p className="text-muted-foreground italic font-serif-body">Belum ada data santri.</p>
        ) : (
          <HScroller ariaLabel="Top santri">
            {topStudents.map((s, i) => (
              <div key={s.id} className="snap-start shrink-0 w-[70%] sm:w-[40%] md:w-[28%] lg:w-[22%]">
                <Link
                  href={`/student/${s.id}`}
                  className="group block h-full p-5 rounded-2xl border border-border bg-card hover:border-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white shrink-0 ${
                        i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-foreground/40'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                        {s.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-serif-body italic">
                        {s.bio || 'Santri PPMH'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      Total Poin
                    </span>
                    <span className="font-display text-2xl font-black text-primary">
                      {s.totalPoints || 0}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </HScroller>
        )}
      </section>

    </div>
  );
}
