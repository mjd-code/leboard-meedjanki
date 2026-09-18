import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/shared/ui/command";
import {
  commandRegistry,
  formatHotkey,
  type Command,
} from "@/core/commands/CommandRegistry";
import { subscribeActiveEditor } from "@/features/editor/activeEditor";
import { onOpenCommandPalette } from "@/features/command-palette/paletteEvents";
import { useFeatureEnabled } from "@/core/plugins/useFeatureEnabled";
import type { EditorApi } from "@/features/editor/types";

/**
 * Ctrl/Cmd+P command palette backed by the CommandRegistry.
 * Also dispatches registered hotkeys globally.
 */
export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const [editor, setEditor] = useState<EditorApi | null>(null);
  const paletteEnabled = useFeatureEnabled("command-palette");

  useEffect(() => commandRegistry.subscribe(setCommands), []);
  useEffect(() => subscribeActiveEditor(setEditor), []);
  // "/" on an empty line in the editor opens the palette too.
  useEffect(() => onOpenCommandPalette(() => setOpen(true)), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPalette =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p";
      if (isPalette) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey) return;
      const command = commandRegistry.findByEvent(event);
      if (!command) return;
      if (command.isEnabled && !command.isEnabled({ editor })) return;
      event.preventDefault();
      command.run({ editor });
    };

    if (!paletteEnabled) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor, paletteEnabled]);

  const grouped = useMemo(() => {
    const available = commands.filter((c) =>
      c.isEnabled ? c.isEnabled({ editor }) : true
    );
    const groups = new Map<string, Command[]>();
    available.forEach((command) => {
      const section = command.section ?? "General";
      const list = groups.get(section) ?? [];
      list.push(command);
      groups.set(section, list);
    });
    return Array.from(groups.entries());
  }, [commands, editor]);

  const run = (command: Command) => {
    setOpen(false);
    // Let the dialog close and focus return to the editor first.
    requestAnimationFrame(() => command.run({ editor }));
  };

  if (!paletteEnabled) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        {grouped.map(([section, items]) => (
          <CommandGroup key={section} heading={section}>
            {items.map((command) => (
              <CommandItem
                key={command.id}
                value={`${section} ${command.name}`}
                onSelect={() => run(command)}
              >
                <span>{command.name}</span>
                {command.hotkey && (
                  <CommandShortcut>{formatHotkey(command.hotkey)}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
};
