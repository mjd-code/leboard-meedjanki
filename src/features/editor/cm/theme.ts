import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/** Editor chrome themed with the app's semantic design tokens. */
export const editorTheme = EditorView.theme({
  "&": {
    color: "hsl(var(--foreground))",
    backgroundColor: "transparent",
    fontSize: "0.95rem",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "1.7",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "0.5rem 0.25rem 6rem",
    caretColor: "hsl(var(--primary))",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-line": { padding: "0 2px" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "hsl(var(--primary))" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "hsl(var(--primary) / 0.22)",
  },
  ".cm-activeLine": { backgroundColor: "hsl(var(--muted) / 0.35)" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "hsl(var(--muted-foreground) / 0.5)",
    border: "none",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-placeholder": { color: "hsl(var(--muted-foreground) / 0.4)" },

  // Live preview styling
  ".cm-md-h1": { fontSize: "1.9em", fontWeight: "700", lineHeight: "1.3" },
  ".cm-md-h2": { fontSize: "1.55em", fontWeight: "700", lineHeight: "1.3" },
  ".cm-md-h3": { fontSize: "1.3em", fontWeight: "650" },
  ".cm-md-h4": { fontSize: "1.15em", fontWeight: "600" },
  ".cm-md-h5": { fontSize: "1.05em", fontWeight: "600" },
  ".cm-md-h6": { fontSize: "1em", fontWeight: "600", color: "hsl(var(--muted-foreground))" },
  ".cm-md-strong": { fontWeight: "700" },
  ".cm-md-em": { fontStyle: "italic" },
  ".cm-md-strike": { textDecoration: "line-through", opacity: "0.7" },
  ".cm-md-code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.9em",
    backgroundColor: "hsl(var(--muted) / 0.6)",
    borderRadius: "4px",
    padding: "0.1em 0.3em",
  },
  ".cm-md-fenced": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.9em",
  },
  ".cm-md-quote": { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
  ".cm-md-wikilink": {
    color: "hsl(var(--primary))",
    cursor: "pointer",
    textDecoration: "none",
  },
  ".cm-md-wikilink:hover": { textDecoration: "underline" },
  ".cm-md-tag": {
    color: "hsl(var(--primary))",
    backgroundColor: "hsl(var(--primary) / 0.1)",
    borderRadius: "999px",
    padding: "0.05em 0.45em",
  },
  ".cm-md-task": { marginRight: "0.4em", verticalAlign: "middle", accentColor: "hsl(var(--primary))" },

  // Autocomplete popup
  ".cm-tooltip": {
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.6rem",
    boxShadow: "0 8px 30px hsl(0 0% 0% / 0.35)",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "inherit",
    maxHeight: "16rem",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    padding: "0.35rem 0.7rem",
    borderRadius: "0.4rem",
    margin: "0.1rem 0.2rem",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "hsl(var(--accent))",
    color: "hsl(var(--accent-foreground))",
  },
  ".cm-completionDetail": {
    fontStyle: "normal",
    opacity: 0.6,
    marginLeft: "0.5rem",
    fontSize: "0.85em",
  },
});

export const markdownHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.heading, fontWeight: "700" },
    { tag: t.strong, fontWeight: "700" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.link, color: "hsl(var(--primary))" },
    { tag: t.url, color: "hsl(var(--primary))", opacity: 0.7 },
    { tag: t.monospace, color: "hsl(var(--foreground))" },
    { tag: t.quote, color: "hsl(var(--muted-foreground))" },
    { tag: t.list, color: "hsl(var(--primary))" },
    { tag: t.comment, color: "hsl(var(--muted-foreground))" },
  ])
);
