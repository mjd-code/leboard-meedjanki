import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function RankMovement({ currentRank, previousRank }: { currentRank: number, previousRank?: number }) {
  if (previousRank === undefined || previousRank === null || previousRank === currentRank) {
    return (
      <Badge variant="outline" className="flex items-center justify-center px-2 py-0.5 bg-muted/20 text-muted-foreground border-transparent rounded-full shrink-0 shadow-none opacity-50">
        <span className="text-[10px] font-bold">—</span>
      </Badge>
    );
  }
  
  if (currentRank < previousRank) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-full shrink-0 shadow-none">
        <ArrowUp className="w-3 h-3" strokeWidth={3} />
        <span className="text-[10px] font-bold">{previousRank - currentRank}</span>
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive border-destructive/20 rounded-full shrink-0 shadow-none">
        <ArrowDown className="w-3 h-3" strokeWidth={3} />
        <span className="text-[10px] font-bold">{currentRank - previousRank}</span>
      </Badge>
    );
  }
}
