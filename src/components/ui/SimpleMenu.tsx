import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SimpleMenuOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

interface Props {
  trigger?: React.ReactNode;
  options: SimpleMenuOption[];
  align?: 'start' | 'center' | 'end' | 'left' | 'right';
  className?: string;
  triggerClassName?: string;
}

export function SimpleMenu({
  trigger,
  options,
  align = 'end',
  className = '',
  triggerClassName = '',
}: Props) {
  // map left/right to start/end for Radix UI
  const contentAlign = align === 'left' ? 'start' : align === 'right' ? 'end' : align as 'start' | 'center' | 'end';

  return (
    <div className={`relative inline-block ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button variant="ghost" className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground ${triggerClassName}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={contentAlign} className="w-48 rounded-xl shadow-soft p-1.5 border border-border/40 z-[100] bg-card">
          {options.map((opt, idx) => (
            <DropdownMenuItem
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                opt.onClick();
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                opt.variant === 'destructive'
                  ? 'text-destructive focus:bg-destructive/10 focus:text-destructive'
                  : 'focus:bg-secondary text-foreground'
              }`}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span className="font-medium">{opt.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
