import { cn } from "@/shared/lib";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  FolderTree,
  Network,
  Settings2,
  FileArchive,
  User,
  LayoutGrid,
  Pencil,

} from "lucide-react";

export type RibbonTool = "files" | "graph" | "editor" | "import-export" | "settings" | "account" | "vaults";

interface IconRibbonProps {
  activeTool: RibbonTool | null;
  onToolSelect: (tool: RibbonTool) => void;
  className?: string;
}

interface RibbonItem {
  id: RibbonTool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}

const ribbonItems: RibbonItem[] = [
  { id: "files", icon: FolderTree, label: "File Explorer", shortcut: "⌘1" },
  { id: "graph", icon: Network, label: "Graph View", shortcut: "⌘2" },
  { id: "editor", icon: Pencil, label: "Editor Settings", shortcut: "⌘3" },
  { id: "import-export", icon: FileArchive, label: "Import / Export", shortcut: "⌘4" },

  { id: "settings", icon: Settings2, label: "Settings", shortcut: "⌘," },
];

const bottomItems: RibbonItem[] = [
  { id: "vaults", icon: LayoutGrid, label: "Vault Manager" },
  { id: "account", icon: User, label: "Account" },
];

export function IconRibbon({ activeTool, onToolSelect, className }: IconRibbonProps) {
  const renderItem = (item: RibbonItem, isActive: boolean) => (
    <Tooltip key={item.id} delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={() => onToolSelect(item.id)}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-1 focus:ring-offset-sidebar",
            isActive && "bg-sidebar-accent text-sidebar-primary"
          )}
          aria-label={item.label}
          aria-pressed={isActive}
        >
          <item.icon className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{item.label}</span>
        {item.shortcut && (
          <span className="text-muted-foreground text-xs">{item.shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className={cn(
        "w-12 h-full bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3",
        className
      )}
    >
      {/* Top tools */}
      <div className="flex flex-col items-center gap-1">
        {ribbonItems.map((item) => renderItem(item, activeTool === item.id))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom tools */}
      <div className="flex flex-col items-center gap-1">
        {bottomItems.map((item) => renderItem(item, activeTool === item.id))}
      </div>
    </div>
  );
}
