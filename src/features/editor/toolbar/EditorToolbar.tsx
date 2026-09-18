import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Table,
  Link2,
  Minus,
  Sigma,
} from "lucide-react";
import { commandRegistry, formatHotkey } from "@/core/commands/CommandRegistry";
import type { EditorApi } from "@/features/editor/types";

export interface EditorToolbarGroups {
  format: boolean;
  headings: boolean;
  blocks: boolean;
  insert: boolean;
}

interface EditorToolbarProps {
  editor: EditorApi | null;
  groups?: EditorToolbarGroups;
}

type GroupKey = keyof EditorToolbarGroups;

const GROUPS: Array<{ key: GroupKey; items: Array<{ id: string; icon: typeof Bold; label: string }> }> = [
  {
    key: "format",
    items: [
      { id: "editor:bold", icon: Bold, label: "Bold" },
      { id: "editor:italic", icon: Italic, label: "Italic" },
      { id: "editor:strikethrough", icon: Strikethrough, label: "Strikethrough" },
      { id: "editor:inline-code", icon: Code, label: "Inline code" },
    ],
  },
  {
    key: "headings",
    items: [
      { id: "editor:heading-1", icon: Heading1, label: "Heading 1" },
      { id: "editor:heading-2", icon: Heading2, label: "Heading 2" },
      { id: "editor:heading-3", icon: Heading3, label: "Heading 3" },
    ],
  },
  {
    key: "blocks",
    items: [
      { id: "editor:bullet-list", icon: List, label: "Bullet list" },
      { id: "editor:numbered-list", icon: ListOrdered, label: "Numbered list" },
      { id: "editor:task-list", icon: ListChecks, label: "Task list" },
      { id: "editor:quote", icon: Quote, label: "Blockquote" },
    ],
  },
  {
    key: "insert",
    items: [
      { id: "editor:internal-link", icon: Link2, label: "Internal link" },
      { id: "editor:table", icon: Table, label: "Table" },
      { id: "editor:block-math", icon: Sigma, label: "Math block" },
      { id: "editor:divider", icon: Minus, label: "Horizontal rule" },
    ],
  },
];

export const EditorToolbar = ({ editor, groups }: EditorToolbarProps) => {
  const run = (id: string) => {
    commandRegistry.execute(id, { editor });
    editor?.focus();
  };

  const visible = GROUPS.filter((g) => groups?.[g.key] ?? true);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/40 px-1 py-1">
      {visible.map((group, index) => (
        <div key={group.key} className="flex items-center gap-0.5">
          {index > 0 && <Separator orientation="vertical" className="mx-1 h-4" />}
          {group.items.map(({ id, icon: Icon, label }) => {

            const hotkey = commandRegistry.get(id)?.hotkey;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={!editor}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => run(id)}
                    aria-label={label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {label}
                  {hotkey ? ` · ${formatHotkey(hotkey)}` : ""}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </div>
  );
};
