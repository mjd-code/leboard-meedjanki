/**
 * Editor contracts shared by the CodeMirror engine, toolbar, suggesters
 * and the command registry.
 */

export interface Pos {
  line: number;
  col: number;
  offset: number;
}

export type EditorMode = "source" | "live" | "reading";

export interface EditorApi {
  getValue(): string;
  setValue(value: string): void;
  getSelection(): string;
  replaceSelection(text: string): void;
  replaceRange(text: string, from: Pos, to?: Pos): void;
  getCursor(): Pos;
  setCursor(pos: Pos): void;
  getLine(n: number): string;
  lineCount(): number;
  posToOffset(pos: Pos): number;
  offsetToPos(offset: number): Pos;
  focus(): void;
  /** Wrap the selection with markers, toggling them off when already present. */
  toggleWrap(before: string, after?: string): void;
  /** Toggle a line prefix such as "# ", "- ", "> ". */
  toggleLinePrefix(prefix: string): void;
  /** Insert a block of text at the cursor on its own lines. */
  insertBlock(text: string): void;
  wordCount(): number;
}

export type FrontmatterPropertyType =
  | "text"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  | "tags"
  | "list";

export interface FrontmatterProperty {
  key: string;
  type: FrontmatterPropertyType;
  value: unknown;
}

export interface SuggestItem {
  /** Text inserted when picked. */
  value: string;
  label: string;
  detail?: string;
  score?: number;
}
