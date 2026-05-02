import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, Target, Activity, Zap, CheckSquare, Settings } from 'lucide-react';
import { useAdminStatsQuery, useAppEventsQuery } from '../../hooks/useAppQueries';
import { TimeRangeFilter, createDefaultTimeRangeValue, TimeRangeValue } from '../TimeRangeFilter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className='rounded-2xl border-border shadow-soft overflow-hidden'>
      <CardContent className='p-6 flex items-center gap-4'>
        <div className={'p-4 rounded-xl bg-secondary/50 shadow-soft border border-border ' + color}>
          <Icon className='w-6 h-6' />
        </div>
        <div>
          <p className='text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1'>{title}</p>
          <p className='text-2xl font-black text-foreground'>{value || 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminStatisticsTab() {
  const [filter, setFilter] = useState<TimeRangeValue>(() => createDefaultTimeRangeValue('last-week'));
  const { data, isLoading } = useAdminStatsQuery(filter);
  const { data: events } = useAppEventsQuery(filter);

  // Generate basic chart data for the Admin stats
  const chartData = useMemo(() => {
    if (!events) return [];
    
    const countByDate: Record<string, number> = {};
    events.forEach((e: any) => {
      if (e.createdAt) {
        const date = new Date(e.createdAt).toISOString().split('T')[0];
        countByDate[date] = (countByDate[date] || 0) + 1;
      }
    });

    return Object.entries(countByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, events: count }));
  }, [events]);

  return (
    <div className='p-4 sm:p-8 space-y-8'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4'>
        <div>
          <h3 className='text-2xl font-black text-foreground'>Analitik & Penggunaan</h3>
          <p className='text-muted-foreground text-sm mt-1'>Acara platform dan metrik.</p>
        </div>
        <TimeRangeFilter value={filter} onChange={setFilter} />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard title='Pengguna' value={data?.stats?.totalUsers || 0} icon={Users} color='text-blue-500' />
        <StatCard title='Acara' value={data?.stats?.totalEvents || events?.length || 0} icon={Activity} color='text-emerald-500' />
        {/* Placeholder cards for structural balance */}
        <StatCard title='Tujuan Aktif' value={data?.stats?.activeGoals || 0} icon={Target} color='text-orange-500' />
        <StatCard title='Penyelesaian' value={`${data?.stats?.completionRate || 0}%`} icon={Zap} color='text-purple-500' />
      </div>

      <Card className="rounded-xl shadow-soft border-border overflow-hidden">
        <CardHeader className="p-6 border-b border-border">
          <h4 className="font-bold text-foreground">Lini Masa Acara</h4>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ChartContainer config={{ events: { label: "Events", color: "hsl(var(--primary))" } }} className="h-full w-full">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="events" fill="var(--color-events)" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Tidak ada data acara yang tersedia untuk rentang ini.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
