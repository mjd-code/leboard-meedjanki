export const COMMAND_PALETTE_EVENT = 'kb:open-command-palette';

/** Opens the command palette from anywhere (editor "/" trigger, buttons, ...). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
}

export function onOpenCommandPalette(handler: () => void) {
  window.addEventListener(COMMAND_PALETTE_EVENT, handler);
  return () => window.removeEventListener(COMMAND_PALETTE_EVENT, handler);
}
