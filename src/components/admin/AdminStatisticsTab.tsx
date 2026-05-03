import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, Target, Activity, Zap, CheckSquare, Settings, Eye, FileText, Database, Shield } from 'lucide-react';
import { useAdminStatsQuery, useAppEventsQuery } from '../../hooks/useAppQueries';
import { TimeRangeFilter, createDefaultTimeRangeValue, TimeRangeValue } from '../TimeRangeFilter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';

function formatDate(isoStr?: string) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('id-ID', {
    dateStyle: 'medium',
  });
}

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
    if (!data?.stats?.chartData) return [];
    return data.stats.chartData;
  }, [data]);

  const logColumns: ColumnDef<any>[] = [
    { accessorKey: 'timestamp', header: 'Waktu', cell: ({ row }) => formatDate(row.getValue('timestamp')) },
    { accessorKey: 'action', header: 'Aksi', cell: ({ row }) => <span className="font-bold">{row.getValue('action')}</span> },
    { accessorKey: 'details', header: 'Detail', cell: ({ row }) => <span className="text-muted-foreground truncate block max-w-sm">{row.getValue('details')}</span> },
    { accessorKey: 'type', header: 'Tipe', cell: ({ row }) => <Badge variant={row.getValue('type') === 'system' ? 'destructive' : 'default'} className="uppercase text-[9px] tracking-wider">{row.getValue('type')}</Badge> },
  ];

  return (
    <div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4'>
        <div>
          <h3 className='text-2xl font-black text-foreground'>Analitik & Audit Trail</h3>
          <p className='text-muted-foreground text-sm mt-1'>Data performa aplikasi dan log aktivitas admin.</p>
        </div>
        <TimeRangeFilter value={filter} onChange={setFilter} />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard title='Pengunjung (Unik)' value={data?.stats?.uniqueVisitors || 0} icon={Users} color='text-blue-500' />
        <StatCard title='Artikel Dibaca' value={data?.stats?.articleReads || 0} icon={Eye} color='text-emerald-500' />
        <StatCard title='Siswa Aktif' value={data?.stats?.totalStudents || 0} icon={Users} color='text-amber-500' />
        <StatCard title='Capaian Poin' value={data?.stats?.totalPoints || 0} icon={Target} color='text-purple-500' />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="rounded-xl shadow-soft border-border overflow-hidden h-full">
            <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
              <h4 className="font-bold text-foreground">Aktivitas Poin & Pembacaan</h4>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 w-full">
                {chartData.length > 0 ? (
                  <ChartContainer config={{ points: { label: "Points/Hits", color: "hsl(var(--primary))" } }} className="h-full w-full">
                      <BarChart data={chartData}>
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="points" fill="var(--color-points)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Tidak ada data yang tersedia untuk rentang ini.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="rounded-xl shadow-soft border-border overflow-hidden h-full">
            <CardHeader className="p-6 border-b border-border bg-destructive/5 text-destructive">
              <h4 className="font-bold flex items-center gap-2"><Shield className="w-4 h-4" /> System Audit Trail</h4>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[350px]">
              {data?.logs?.length ? (
                <div className="divide-y divide-border">
                  {data.logs.slice(0, 15).map((log: any) => (
                    <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm">{log.action}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{log.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Tidak ada catatan audit.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card className="rounded-xl shadow-soft border-border overflow-hidden">
        <CardHeader className="p-6 border-b border-border bg-secondary/30">
          <h4 className="font-bold text-foreground">Log Aktivitas Penuh</h4>
        </CardHeader>
        <CardContent className="p-0">
           <DataTable columns={logColumns} data={data?.logs || []} filterColumn="details" filterPlaceholder="Cari log..." />
        </CardContent>
      </Card>
    </div>
  );
}
