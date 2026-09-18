/**
 * CollapsibleSection - Reusable collapsible section component for config panels
 */

import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from "@/shared/lib";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";

interface CollapsibleSectionProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({
  icon,
  title,
  children,
  defaultOpen = true,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors group">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
