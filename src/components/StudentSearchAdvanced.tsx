import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  StudentSearchFilter,
  type StudentSearchFilterValue,
} from './StudentSearchFilter';
import { StudentSortDropdown, type SortKey } from './StudentSortDropdown';

interface Props {
  value: StudentSearchFilterValue;
  onChange: (next: StudentSearchFilterValue) => void;
  sortKey: SortKey;
  onSortChange: (next: SortKey) => void;
  availableTags: string[];
  studentTagSource?: string[][];
  placeholder?: string;
  variant?: 'light' | 'dark';
  className?: string;
  defaultOpen?: boolean;
}

export function StudentSearchAdvanced({
  value,
  onChange,
  sortKey,
  onSortChange,
  availableTags,
  studentTagSource,
  placeholder = 'Cari berdasarkan nama...',
  variant = 'light',
  className = '',
}: Props) {
  const isDark = variant === 'dark';

  return (
    <div className={`flex flex-col gap-2 min-w-0 ${className}`}>
      {/* Search Input */}
      <div className="w-full">
        <StudentSearchFilter
          mode="search"
          value={value}
          onChange={onChange}
          availableTags={availableTags}
          placeholder={placeholder}
          variant={variant}
        />
      </div>

      {/* Tags and Sort Buttons - Always below and left-aligned */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-1">
        <StudentSearchFilter
          mode="tags"
          value={value}
          onChange={onChange}
          availableTags={availableTags}
          studentTagSource={studentTagSource}
          variant={variant}
          hideSelectedTags={true}
        />
        <StudentSortDropdown
          value={sortKey}
          onChange={onSortChange}
          variant={variant}
        />
      </div>

      {/* Selected tags display */}
      {value.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 mt-1">
          {value.tags.map((tag) => (
            <Badge
              key={tag}
              variant={isDark ? "secondary" : "default"}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full ${
                isDark 
                  ? 'bg-secondary/40 text-foreground border-foreground/10 shadow-soft'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 shadow-soft'
              }`}
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange({ ...value, tags: value.tags.filter(t => t !== tag) })}
                className="hover:text-destructive transition-colors rounded-full"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...value, tags: [] })}
            className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors px-1 ml-1"
          >
            Hapus semua
          </button>
        </div>
      )}
    </div>
  );
}