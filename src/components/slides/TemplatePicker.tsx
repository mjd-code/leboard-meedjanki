import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  LayoutTemplate,
  Columns2,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  GitCompare,
  Clock,
  Quote,
  Square,
  Type,
} from 'lucide-react';

export type TemplateType =
  | 'title'
  | 'section-header'
  | 'two-column'
  | 'three-up'
  | 'chart-focus'
  | 'data-story'
  | 'comparison'
  | 'timeline'
  | 'quote'
  | 'blank';

interface Template {
  type: TemplateType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const templates: Template[] = [
  {
    type: 'title',
    name: 'Title Slide',
    description: 'Centered title with subtitle',
    icon: Type,
  },
  {
    type: 'section-header',
    name: 'Section Header',
    description: 'Bold header with description',
    icon: LayoutTemplate,
  },
  {
    type: 'two-column',
    name: 'Two Column',
    description: 'Header with left/right content',
    icon: Columns2,
  },
  {
    type: 'three-up',
    name: 'Three-Up Cards',
    description: 'Header with 3 equal boxes',
    icon: LayoutGrid,
  },
  {
    type: 'chart-focus',
    name: 'Chart Focus',
    description: 'Large chart with annotations',
    icon: BarChart3,
  },
  {
    type: 'data-story',
    name: 'Data Story',
    description: 'Big metric with support',
    icon: TrendingUp,
  },
  {
    type: 'comparison',
    name: 'Comparison',
    description: 'Side-by-side comparison',
    icon: GitCompare,
  },
  {
    type: 'timeline',
    name: 'Timeline',
    description: 'Horizontal milestone timeline',
    icon: Clock,
  },
  {
    type: 'quote',
    name: 'Quote',
    description: 'Large centered quote',
    icon: Quote,
  },
  {
    type: 'blank',
    name: 'Blank Canvas',
    description: 'Empty slide for custom layouts',
    icon: Square,
  },
];

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TemplateType) => void;
}

export function TemplatePicker({
  isOpen,
  onClose,
  onSelect,
}: TemplatePickerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-3 mt-4">
          {templates.map((template) => (
            <button
              key={template.type}
              className={cn(
                'flex flex-col items-center p-4 rounded-lg border-2 border-transparent',
                'bg-muted/50 hover:bg-muted hover:border-primary/50',
                'transition-all duration-200 group'
              )}
              onClick={() => {
                onSelect(template.type);
                onClose();
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                <template.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-center">
                {template.name}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
