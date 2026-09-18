import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const WIKILINK = /!?\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
const TAG = /(^|\s)(#[\w/-]+)/g;

export interface LinkHandlers {
  onWikilinkClick?: (target: string) => void;
  onTagClick?: (tag: string) => void;
}

/** Highlights `[[wikilinks]]` and `#tags`, and makes them clickable. */
export function wikilinkExtension(handlers: LinkHandlers) {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
          const text = view.state.sliceDoc(from, to);
          const marks: Array<{ from: number; to: number; deco: Decoration }> = [];

          WIKILINK.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = WIKILINK.exec(text))) {
            marks.push({
              from: from + m.index,
              to: from + m.index + m[0].length,
              deco: Decoration.mark({
                class: "cm-md-wikilink",
                attributes: { "data-wikilink": m[1].trim() },
              }),
            });
          }

          TAG.lastIndex = 0;
          while ((m = TAG.exec(text))) {
            const start = from + m.index + m[1].length;
            marks.push({
              from: start,
              to: start + m[2].length,
              deco: Decoration.mark({
                class: "cm-md-tag",
                attributes: { "data-tag": m[2].slice(1) },
              }),
            });
          }

          marks.sort((a, b) => a.from - b.from);
          let last = -1;
          for (const mark of marks) {
            if (mark.from < last) continue;
            builder.add(mark.from, mark.to, mark.deco);
            last = mark.to;
          }
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );

  const clickHandler = EditorView.domEventHandlers({
    mousedown(event) {
      const target = event.target as HTMLElement;
      if (!(event.metaKey || event.ctrlKey)) return false;

      const link = target.closest("[data-wikilink]") as HTMLElement | null;
      if (link && handlers.onWikilinkClick) {
        event.preventDefault();
        handlers.onWikilinkClick(link.getAttribute("data-wikilink") || "");
        return true;
      }

      const tag = target.closest("[data-tag]") as HTMLElement | null;
      if (tag && handlers.onTagClick) {
        event.preventDefault();
        handlers.onTagClick(tag.getAttribute("data-tag") || "");
        return true;
      }
      return false;
    },
  });

  return [plugin, clickHandler];
}
