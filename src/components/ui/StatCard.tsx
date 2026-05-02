import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="rounded-xl shadow-soft border-border overflow-hidden">
      <CardContent className="p-4 sm:p-6 flex items-center gap-4">
        <div className={`p-4 rounded-full bg-secondary/50 text-foreground shadow-soft ${color || ''} border border-border`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col justify-center">
          <CardHeader className="p-0 mb-1 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-full">
              {title}
            </CardTitle>
          </CardHeader>
          <p className="text-2xl font-black text-foreground">{value || 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}
