import type { EditorView } from "@codemirror/view";
import type { EditorApi, Pos } from "@/features/editor/types";

/** Adapt a CodeMirror view to the editor-agnostic EditorApi contract. */
export function createEditorApi(getView: () => EditorView | null): EditorApi {
  const view = () => {
    const v = getView();
    if (!v) throw new Error("Editor is not mounted");
    return v;
  };

  const toPos = (offset: number): Pos => {
    const line = view().state.doc.lineAt(offset);
    return { line: line.number, col: offset - line.from, offset };
  };

  const toOffset = (pos: Pos): number => {
    if (typeof pos.offset === "number") return pos.offset;
    const line = view().state.doc.line(pos.line);
    return Math.min(line.from + pos.col, line.to);
  };

  return {
    getValue: () => view().state.doc.toString(),
    setValue: (value) => {
      const v = view();
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    },
    getSelection: () => {
      const v = view();
      const { from, to } = v.state.selection.main;
      return v.state.sliceDoc(from, to);
    },
    replaceSelection: (text) => {
      const v = view();
      const { from, to } = v.state.selection.main;
      v.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
    },
    replaceRange: (text, from, to) => {
      const v = view();
      v.dispatch({
        changes: { from: toOffset(from), to: to ? toOffset(to) : toOffset(from), insert: text },
      });
    },
    getCursor: () => toPos(view().state.selection.main.head),
    setCursor: (pos) => {
      const v = view();
      v.dispatch({ selection: { anchor: toOffset(pos) } });
    },
    getLine: (n) => view().state.doc.line(n).text,
    lineCount: () => view().state.doc.lines,
    posToOffset: toOffset,
    offsetToPos: toPos,
    focus: () => view().focus(),

    toggleWrap: (before, after = before) => {
      const v = view();
      const { from, to } = v.state.selection.main;
      const selected = v.state.sliceDoc(from, to);
      const outer = v.state.sliceDoc(
        Math.max(0, from - before.length),
        Math.min(v.state.doc.length, to + after.length)
      );

      if (selected.startsWith(before) && selected.endsWith(after) && selected.length >= before.length + after.length) {
        const inner = selected.slice(before.length, selected.length - after.length);
        v.dispatch({
          changes: { from, to, insert: inner },
          selection: { anchor: from, head: from + inner.length },
        });
        return;
      }

      if (outer.startsWith(before) && outer.endsWith(after)) {
        v.dispatch({
          changes: [
            { from: from - before.length, to: from, insert: "" },
            { from: to, to: to + after.length, insert: "" },
          ],
          selection: { anchor: from - before.length, head: to - before.length },
        });
        return;
      }

      v.dispatch({
        changes: { from, to, insert: `${before}${selected}${after}` },
        selection: selected
          ? { anchor: from + before.length, head: from + before.length + selected.length }
          : { anchor: from + before.length },
      });
      v.focus();
    },

    toggleLinePrefix: (prefix) => {
      const v = view();
      const { from, to } = v.state.selection.main;
      const startLine = v.state.doc.lineAt(from).number;
      const endLine = v.state.doc.lineAt(to).number;
      const changes = [];
      let allPrefixed = true;

      for (let n = startLine; n <= endLine; n++) {
        if (!v.state.doc.line(n).text.startsWith(prefix)) allPrefixed = false;
      }

      for (let n = startLine; n <= endLine; n++) {
        const line = v.state.doc.line(n);
        if (allPrefixed) {
          changes.push({ from: line.from, to: line.from + prefix.length, insert: "" });
        } else if (!line.text.startsWith(prefix)) {
          changes.push({ from: line.from, to: line.from, insert: prefix });
        }
      }

      if (changes.length) v.dispatch({ changes });
      v.focus();
    },

    insertBlock: (text) => {
      const v = view();
      const { from, to } = v.state.selection.main;
      const line = v.state.doc.lineAt(from);
      const needsBreak = line.text.trim().length > 0;
      const insert = `${needsBreak ? "\n" : ""}${text}\n`;
      v.dispatch({
        changes: { from: line.to, to: Math.max(line.to, to), insert },
        selection: { anchor: line.to + insert.length - 1 },
      });
      v.focus();
    },

    wordCount: () => {
      const text = view().state.doc.toString().replace(/^---[\s\S]*?---/, "");
      const words = text.trim().match(/[\p{L}\p{N}'’-]+/gu);
      return words ? words.length : 0;
    },
  };
}
