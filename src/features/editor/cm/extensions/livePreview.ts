import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

/**
 * Live preview: hides markdown syntax markers on lines the cursor is not on,
 * and renders task checkboxes as real widgets.
 */

const HIDDEN_MARKS = new Set([
  "HeaderMark",
  "EmphasisMark",
  "StrikethroughMark",
  "CodeMark",
  "LinkMark",
  "QuoteMark",
  "SuperscriptMark",
  "SubscriptMark",
]);

const STYLED_NODES: Record<string, string> = {
  ATXHeading1: "cm-md-h1",
  ATXHeading2: "cm-md-h2",
  ATXHeading3: "cm-md-h3",
  ATXHeading4: "cm-md-h4",
  ATXHeading5: "cm-md-h5",
  ATXHeading6: "cm-md-h6",
  StrongEmphasis: "cm-md-strong",
  Emphasis: "cm-md-em",
  Strikethrough: "cm-md-strike",
  InlineCode: "cm-md-code",
  Blockquote: "cm-md-quote",
  FencedCode: "cm-md-fenced",
};

class CheckboxWidget extends WidgetType {
  constructor(private checked: boolean, private pos: number) {
    super();
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.pos === this.pos;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.className = "cm-md-task";
    box.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 3, insert: this.checked ? "[ ]" : "[x]" },
      });
    });
    return box;
  }

  ignoreEvent() {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;
  const cursorLines = new Set(
    state.selection.ranges.flatMap((r) => {
      const from = state.doc.lineAt(r.from).number;
      const to = state.doc.lineAt(r.to).number;
      const lines: number[] = [];
      for (let n = from; n <= to; n++) lines.push(n);
      return lines;
    })
  );

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {


        if (node.name === "TaskMarker") {
          const lineNumber = state.doc.lineAt(node.from).number;
          if (!cursorLines.has(lineNumber)) {
            const text = state.sliceDoc(node.from, node.to);
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                widget: new CheckboxWidget(/x/i.test(text), node.from),
              })
            );
          }
          return;
        }

        if (HIDDEN_MARKS.has(node.name)) {
          const lineNumber = state.doc.lineAt(node.from).number;
          if (!cursorLines.has(lineNumber)) {
            builder.add(node.from, node.to, Decoration.replace({}));
          }
        }
      },
    });
  }

  return builder.finish();
}

/** Marks applied as line/inline classes (separate pass, safe ordering). */
const styleMarks = ViewPlugin.fromClass(
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
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            const cls = STYLED_NODES[node.name];
            if (cls && node.to > node.from) {
              builder.add(node.from, node.to, Decoration.mark({ class: cls }));
            }
          },
        });
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);

const hideMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations || Decoration.none),
  }
);

export function livePreview() {
  return [styleMarks, hideMarks];
}

export function sourceHighlighting() {
  return [styleMarks];
}
