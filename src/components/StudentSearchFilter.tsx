import React, { useMemo, useState, useEffect } from 'react';
import { Search, X, Filter, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface StudentSearchFilterValue {
  query: string;
  tags: string[];
}

interface Props {
  value: StudentSearchFilterValue;
  onChange: (next: StudentSearchFilterValue) => void;
  availableTags: string[];
  placeholder?: string;
  className?: string;
  variant?: 'light' | 'dark';
  studentTagSource?: string[][];
  maxQuickChips?: number;
  mode?: 'full' | 'search' | 'tags';
  hideSelectedTags?: boolean;
}

export function StudentSearchFilter({
  value,
  onChange,
  availableTags,
  placeholder = 'Cari berdasarkan nama...',
  className = '',
  variant = 'light',
  studentTagSource,
  maxQuickChips = 6,
  mode = 'full',
  hideSelectedTags = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(value.query);
  
  useEffect(() => {
    setLocalQuery(value.query);
  }, [value.query]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localQuery !== value.query) {
        onChange({ ...value, query: localQuery });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localQuery]);

  const sortedTags = useMemo(
    () => [...new Set(availableTags)].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [availableTags]
  );

  const tagFrequency = useMemo(() => {
    const map = new Map<string, number>();
    if (studentTagSource) {
      studentTagSource.forEach((tags) =>
        (tags || []).forEach((t) => {
          if (!t) return;
          map.set(t, (map.get(t) || 0) + 1);
        })
      );
    }
    return map;
  }, [studentTagSource]);

  const quickChips = useMemo(() => {
    const ranked = [...sortedTags].sort((a, b) => {
      const fa = tagFrequency.get(a) || 0;
      const fb = tagFrequency.get(b) || 0;
      if (fb !== fa) return fb - fa;
      return a.localeCompare(b);
    });
    return ranked.slice(0, maxQuickChips);
  }, [sortedTags, tagFrequency, maxQuickChips]);

  const toggleTag = (tag: string) => {
    const exists = value.tags.includes(tag);
    onChange({
      ...value,
      tags: exists ? value.tags.filter((t) => t !== tag) : [...value.tags, tag],
    });
  };

  const clearAll = () => onChange({ query: '', tags: [] });

  const isDark = variant === 'dark';
  const hasFilters = value.query || value.tags.length > 0;

  return (
    <div className={`flex flex-col sm:flex-row gap-2 items-stretch min-w-0 ${className}`}>
      {mode !== 'tags' && (
        <div className="relative flex-1 min-w-0 group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${isDark ? 'text-foreground/70 group-focus-within:text-primary' : 'text-muted-foreground group-focus-within:text-primary'}`} />
          <Input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-12 pr-10 h-12 sm:h-10 rounded-2xl sm:rounded-xl shadow-inner border-none transition-all ${
              isDark 
                ? 'bg-secondary/30 text-foreground focus-visible:ring-primary/20 backdrop-blur-md'
                : 'bg-secondary/10 text-foreground focus-visible:ring-primary/20'
            }`}
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => { setLocalQuery(''); onChange({ ...value, query: '' }); }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-secondary transition-colors ${isDark ? 'text-foreground/70' : 'text-muted-foreground'}`}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {mode !== 'search' && (
        <div className="flex-1 sm:flex-none min-w-0">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={isDark ? 'secondary' : 'outline'}
                className={`w-full sm:w-auto h-12 sm:h-10 rounded-2xl sm:rounded-xl shadow-soft font-bold gap-2 ${
                  isDark ? 'bg-secondary/30 backdrop-blur-md hover:bg-secondary/50 border-foreground/10' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Tags</span>
                {value.tags.length > 0 && (
                  <Badge variant="default" className="ml-1 h-5 px-1.5 rounded-full text-[10px]">
                    {value.tags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-72 sm:w-80 p-0 rounded-xl shadow-soft border-border"
            >
              <Command>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Filter dengan tag
                  </span>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Hapus semua
                    </button>
                  )}
                </div>

                <CommandInput 
                  placeholder="Ketik untuk mencari tag..." 
                  className="h-12 border-none focus:ring-0" 
                />

                <CommandList className="max-h-64">
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    Tag tidak ditemukan.
                  </CommandEmpty>

                  {!localQuery && quickChips.length > 0 && (
                    <CommandGroup heading={
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Pilih cepat
                        </span>
                      </div>
                    }>
                      <div className="flex flex-wrap gap-1.5 px-3 mb-2">
                        {quickChips.map((tag) => {
                          const checked = value.tags.includes(tag);
                          return (
                            <Badge
                              key={tag}
                              variant={checked ? "default" : "secondary"}
                              className={`cursor-pointer px-2.5 py-1 text-[11px] transition-colors rounded-full ${
                                !checked && 'hover:bg-primary/10 hover:text-primary mb-1'
                              }`}
                              onClick={() => toggleTag(tag)}
                            >
                              {tag}
                            </Badge>
                          );
                        })}
                      </div>
                    </CommandGroup>
                  )}

                  {sortedTags.length > 0 && (
                    <CommandGroup>
                      {sortedTags.map((tag) => {
                        const checked = value.tags.includes(tag);
                        return (
                          <CommandItem
                            key={tag}
                            value={tag}
                            onSelect={() => toggleTag(tag)}
                            className="flex justify-between items-center px-4 py-2 cursor-pointer font-medium rounded-xl mx-2 my-1"
                          >
                            <span>{tag}</span>
                            {checked && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {!hideSelectedTags && mode !== 'search' && value.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center w-full sm:w-auto sm:max-w-[40%] basis-full sm:basis-auto mt-2 sm:mt-0">
          {value.tags.map((tag) => (
            <Badge
              key={tag}
              variant={isDark ? "secondary" : "default"}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full ${
                isDark ? 'bg-secondary/40 text-foreground border-foreground/10' : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="hover:text-destructive transition-colors rounded-full"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function applyStudentSearchFilter<T extends { name?: string; tags?: string[] }>(
  list: T[],
  filter: StudentSearchFilterValue
): T[] {
  const q = filter.query.trim().toLowerCase();
  const tagSet = filter.tags;
  if (!q && tagSet.length === 0) return list;

  return list.filter((s) => {
    const nameMatch = !q || (s.name || '').toLowerCase().includes(q);
    const tagMatch =
      tagSet.length === 0 ||
      (Array.isArray(s.tags) && tagSet.every((t) => s.tags!.includes(t)));
    return nameMatch && tagMatch;
  });
}

export const emptyStudentSearchFilter: StudentSearchFilterValue = { query: '', tags: [] };
