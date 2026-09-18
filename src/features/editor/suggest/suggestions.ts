import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { EditorView } from "@codemirror/view";
import { fuzzyScore } from "@/shared/lib/fuzzy";

export interface SuggestSource {
  /** Note / media titles used by `[[` wikilink completion. */
  files: Array<{ name: string; path?: string; type?: string }>;
  /** Known tags used by `#` completion. */
  tags: string[];
  /** Frontmatter property keys used inside the YAML block. */
  properties?: string[];
}

type SourceGetter = () => SuggestSource;

/** `[[wikilink]]` completion, ranked by fuzzy score. */
export function wikilinkCompletion(getSource: SourceGetter) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/\[\[([^\]\n]*)$/);
    if (!before) return null;
    if (before.from === before.to && !context.explicit) return null;

    const query = before.text.replace("[[", "");
    const { files } = getSource();

    const options = files
      .map((f) => ({ file: f, score: fuzzyScore(query, f.name) }))
      .filter((o) => o.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .slice(0, 30)
      .map(({ file }) => ({
        label: file.name,
        detail: file.path && file.path !== file.name ? file.path : file.type,
        type: file.type === "media" ? "variable" : "text",
        apply: (view: EditorView, _c: Completion, from: number, to: number) => {
          const rest = view.state.sliceDoc(to, to + 2) === "]]" ? 2 : 0;
          view.dispatch({
            changes: { from, to: to + rest, insert: `${file.name}]]` },
            selection: { anchor: from + file.name.length + 2 },
          });
        },
      }));

    return {
      from: before.from + 2,
      options,
      filter: false,
      validFor: /^[^\]\n]*$/,
    };
  };
}

/** `#tag` completion. */
export function tagCompletion(getSource: SourceGetter) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/(?:^|\s)#([\w/-]*)$/);
    if (!before) return null;

    const hashIndex = before.text.indexOf("#");
    const query = before.text.slice(hashIndex + 1);
    const { tags } = getSource();

    const options = tags
      .map((tag) => ({ tag, score: fuzzyScore(query, tag) }))
      .filter((o) => o.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .slice(0, 30)
      .map(({ tag }) => ({ label: `#${tag}`, apply: `#${tag}`, type: "keyword" }));

    if (!options.length) return null;

    return {
      from: before.from + hashIndex,
      options,
      filter: false,
      validFor: /^#[\w/-]*$/,
    };
  };
}

/** Frontmatter property-key completion inside the YAML block. */
export function propertyCompletion(getSource: SourceGetter) {
  return (context: CompletionContext): CompletionResult | null => {
    const doc = context.state.doc.toString();
    if (!doc.startsWith("---")) return null;
    const end = doc.indexOf("\n---", 3);
    if (end === -1 || context.pos > end) return null;

    const before = context.matchBefore(/^[\w-]*$/);
    if (!before) return null;

    const keys = getSource().properties ?? [
      "title",
      "tags",
      "aliases",
      "created",
      "updated",
      "status",
      "author",
    ];


    return {
      from: before.from,
      options: keys.map((key) => ({ label: key, apply: `${key}: `, type: "property" })),
    };
  };
}
