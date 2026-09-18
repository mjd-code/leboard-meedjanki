import { EditorState, Extension, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  highlightActiveLine,
  lineNumbers,
  placeholder as placeholderExt,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";

import { editorTheme, markdownHighlight } from "./theme";
import { livePreview, sourceHighlighting } from "./extensions/livePreview";
import { wikilinkExtension, type LinkHandlers } from "./extensions/wikilinkField";
import { frontmatterField, wordCountField } from "./extensions/frontmatterField";
import {
  wikilinkCompletion,
  tagCompletion,
  propertyCompletion,
  type SuggestSource,
} from "@/features/editor/suggest/suggestions";
import { openCommandPalette } from "@/features/command-palette/paletteEvents";
import type {
  EditorAppearanceConfig,
  EditorBehaviorConfig,
  EditorSuggestionsConfig,
} from "@/shared/stores/useEditorSettingsStore";
import { FONT_FAMILY_CSS } from "@/shared/stores/useEditorSettingsStore";

export interface EditorSettingsSnapshot {
  appearance: EditorAppearanceConfig;
  behavior: EditorBehaviorConfig;
  suggestions: EditorSuggestionsConfig;
}

export interface EditorSetupOptions {
  mode: "source" | "live";
  placeholder?: string;
  settings: EditorSettingsSnapshot;
  getSuggestSource: () => SuggestSource;
  handlers: LinkHandlers;
  onChange: (value: string) => void;
  onSave?: () => void;
}

/** Font / size / spacing driven by user settings. */
export function appearanceTheme(appearance: EditorAppearanceConfig): Extension {
  return EditorView.theme({
    "&": { fontSize: `${appearance.fontSize}px` },
    ".cm-scroller": {
      fontFamily: FONT_FAMILY_CSS[appearance.fontFamily],
      lineHeight: String(appearance.lineHeight),
    },
    ".cm-content": appearance.limitContentWidth
      ? {
          maxWidth: `${appearance.contentWidth}ch`,
          marginLeft: "auto",
          marginRight: "auto",
        }
      : {},
  });
}

export const appearanceCompartment = new Compartment();

export function createEditorExtensions(options: EditorSetupOptions): Extension[] {
  const { appearance, behavior, suggestions } = options.settings;

  const overrides = [
    suggestions.wikilinks ? wikilinkCompletion(options.getSuggestSource) : null,
    suggestions.tags ? tagCompletion(options.getSuggestSource) : null,
    suggestions.properties ? propertyCompletion(options.getSuggestSource) : null,
  ].filter(Boolean) as ReturnType<typeof wikilinkCompletion>[];

  return [
    history(),
    drawSelection(),
    rectangularSelection(),
    crosshairCursor(),
    ...(appearance.showLineNumbers ? [lineNumbers()] : []),
    ...(appearance.highlightActiveLine ? [highlightActiveLine()] : []),
    ...(appearance.highlightSelectionMatches ? [highlightSelectionMatches()] : []),
    ...(behavior.indentOnInput ? [indentOnInput()] : []),
    ...(behavior.bracketMatching ? [bracketMatching()] : []),
    ...(behavior.autoCloseBrackets ? [closeBrackets()] : []),
    ...(behavior.lineWrapping ? [EditorView.lineWrapping] : []),
    indentUnit.of(" ".repeat(Math.max(1, behavior.indentUnit))),
    EditorState.tabSize.of(Math.max(1, behavior.indentUnit)),
    EditorView.contentAttributes.of({ spellcheck: behavior.spellcheck ? "true" : "false" }),
    placeholderExt(options.placeholder ?? "Start writing..."),
    markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
    markdownHighlight,
    editorTheme,
    appearanceCompartment.of(appearanceTheme(appearance)),
    frontmatterField,
    wordCountField,
    ...(suggestions.enabled && overrides.length
      ? [
          autocompletion({
            activateOnTyping: suggestions.activateOnTyping,
            icons: false,
            override: overrides,
          }),
        ]
      : []),
    ...wikilinkExtension(options.handlers),
    ...(options.mode === "live" ? livePreview() : sourceHighlighting()),
    keymap.of([
      {
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          options.onSave?.();
          return true;
        },
      },
      ...(behavior.autoCloseBrackets ? closeBracketsKeymap : []),
      ...completionKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...defaultKeymap,
      ...(behavior.tabIndents ? [indentWithTab] : []),
    ]),
    // Typing "/" on an otherwise empty line opens the command palette.
    EditorView.inputHandler.of((view, from, to, text) => {
      if (!suggestions.slashCommands) return false;
      if (text !== "/") return false;
      const line = view.state.doc.lineAt(from);
      const before = view.state.sliceDoc(line.from, from);
      const after = view.state.sliceDoc(to, line.to);
      if (before.trim() !== "" || after.trim() !== "") return false;
      openCommandPalette();
      return true;
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange(update.state.doc.toString());
    }),
  ];
}

export function createEditorState(doc: string, extensions: Extension[]): EditorState {
  return EditorState.create({ doc, extensions });
}
