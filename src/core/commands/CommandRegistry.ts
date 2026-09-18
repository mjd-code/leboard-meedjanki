/**
 * Command Registry
 *
 * Central place where every user-invokable action is registered.
 * Consumed by the command palette, toolbars and hotkey handling.
 */

export interface CommandContext {
  /** Present when a markdown editor is focused. */
  editor: import("@/features/editor/types").EditorApi | null;
}

export interface Command {
  id: string;
  name: string;
  section?: string;
  /** e.g. "Mod-B", "Mod-Shift-K" */
  hotkey?: string;
  icon?: string;
  /** Return false to hide the command in the current context. */
  isEnabled?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void;
}

type Listener = (commands: Command[]) => void;

export class CommandRegistry {
  private commands = new Map<string, Command>();
  private listeners = new Set<Listener>();

  register(command: Command): () => void {
    this.commands.set(command.id, command);
    this.notify();
    return () => this.unregister(command.id);
  }

  registerMany(commands: Command[]): () => void {
    commands.forEach((c) => this.commands.set(c.id, c));
    this.notify();
    return () => {
      commands.forEach((c) => this.commands.delete(c.id));
      this.notify();
    };
  }

  unregister(id: string): void {
    if (this.commands.delete(id)) this.notify();
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  list(): Command[] {
    return Array.from(this.commands.values());
  }

  listFor(ctx: CommandContext): Command[] {
    return this.list().filter((c) => (c.isEnabled ? c.isEnabled(ctx) : true));
  }

  execute(id: string, ctx: CommandContext): boolean {
    const command = this.commands.get(id);
    if (!command) return false;
    if (command.isEnabled && !command.isEnabled(ctx)) return false;
    command.run(ctx);
    return true;
  }

  /** Match a keyboard event against registered hotkeys. */
  findByEvent(event: KeyboardEvent): Command | undefined {
    return this.list().find((c) => c.hotkey && matchesHotkey(event, c.hotkey));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.list());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = this.list();
    this.listeners.forEach((l) => l(snapshot));
  }
}

export function matchesHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.split("-");
  const key = parts[parts.length - 1].toLowerCase();
  const mods = parts.slice(0, -1).map((m) => m.toLowerCase());

  const needsMod = mods.includes("mod");
  const needsShift = mods.includes("shift");
  const needsAlt = mods.includes("alt");

  const hasMod = event.metaKey || event.ctrlKey;
  if (needsMod !== hasMod) return false;
  if (needsShift !== event.shiftKey) return false;
  if (needsAlt !== event.altKey) return false;

  return event.key.toLowerCase() === key;
}

/** Pretty label for display, e.g. "⌘B" / "Ctrl+B". */
export function formatHotkey(hotkey: string): string {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return hotkey
    .split("-")
    .map((part) => {
      const p = part.toLowerCase();
      if (p === "mod") return isMac ? "⌘" : "Ctrl";
      if (p === "shift") return isMac ? "⇧" : "Shift";
      if (p === "alt") return isMac ? "⌥" : "Alt";
      return part.toUpperCase();
    })
    .join(isMac ? "" : "+");
}

export const commandRegistry = new CommandRegistry();
