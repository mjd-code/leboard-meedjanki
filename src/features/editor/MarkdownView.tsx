import { useEffect, useMemo, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { cn } from "@/shared/lib";
import { MarkdownRenderer } from "@/features/graph/MarkdownRenderer";
import { EditorToolbar } from "@/features/editor/toolbar/EditorToolbar";
import { PropertiesPanel } from "@/features/editor/frontmatter/PropertiesPanel";
import {
  createEditorExtensions,
  appearanceTheme,
  appearanceCompartment,
} from "@/features/editor/cm/setup";
import { createEditorApi } from "@/features/editor/cm/state/editorApi";
import { setActiveEditor } from "@/features/editor/activeEditor";
import { countWords } from "@/features/editor/cm/extensions/frontmatterField";
import type { SuggestSource } from "@/features/editor/suggest/suggestions";
import type { EditorApi, EditorMode } from "@/features/editor/types";
import { useNodeStore } from "@/shared/stores";
import { useEditorSettingsStore } from "@/shared/stores/useEditorSettingsStore";


interface MarkdownViewProps {
  value: string;
  onChange: (next: string) => void;
  mode?: EditorMode;
  placeholder?: string;
  showToolbar?: boolean;
  showProperties?: boolean;
  onWikilinkClick?: (target: string) => void;
  onTagClick?: (tag: string) => void;
  onSave?: () => void;
  className?: string;
  /** Rendered next to the source editor (split view). */
  sideBySide?: boolean;
}

export const MarkdownView = ({
  value,
  onChange,
  mode = "live",
  placeholder,
  showToolbar = true,
  showProperties = false,
  onWikilinkClick,
  onTagClick,
  onSave,
  className,
  sideBySide = false,
}: MarkdownViewProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);
  const changeRef = useRef(onChange);
  const saveRef = useRef(onSave);
  const handlersRef = useRef({ onWikilinkClick, onTagClick });
  const [api, setApi] = useState<EditorApi | null>(null);

  valueRef.current = value;
  changeRef.current = onChange;
  saveRef.current = onSave;
  handlersRef.current = { onWikilinkClick, onTagClick };

  const nodes = useNodeStore((state) => state.nodes);
  const suggestRef = useRef<SuggestSource>({ files: [], tags: [] });
  suggestRef.current = useMemo<SuggestSource>(() => {
    const tags = new Set<string>();
    nodes.forEach((n) => n.tags?.forEach((t) => tags.add(t)));
    return {
      files: nodes
        .filter((n) => n.type !== "folder")
        .map((n) => ({ name: n.name, type: n.type })),
      tags: Array.from(tags).sort(),
      properties: ["title", "tags", "aliases", "created", "updated", "status"],
    };
  }, [nodes]);

  const isReading = mode === "reading";

  const appearance = useEditorSettingsStore((s) => s.appearance);
  const behavior = useEditorSettingsStore((s) => s.behavior);
  const suggestions = useEditorSettingsStore((s) => s.suggestions);
  const toolbarSettings = useEditorSettingsStore((s) => s.toolbar);

  const settingsRef = useRef({ appearance, behavior, suggestions });
  settingsRef.current = { appearance, behavior, suggestions };

  // Changing these requires rebuilding the extension set.
  const structuralKey = JSON.stringify({
    behavior,
    suggestions,
    lineNumbers: appearance.showLineNumbers,
    activeLine: appearance.highlightActiveLine,
    selectionMatches: appearance.highlightSelectionMatches,
  });

  // Mount / re-create the editor when the editing mode or structural settings change.
  useEffect(() => {
    if (isReading || !hostRef.current) return;

    const editorApi = createEditorApi(() => viewRef.current);
    const state = EditorState.create({
      doc: valueRef.current,
      extensions: createEditorExtensions({
        mode: mode === "live" ? "live" : "source",
        placeholder,
        settings: settingsRef.current,
        getSuggestSource: () => suggestRef.current,
        handlers: {
          onWikilinkClick: (t) => handlersRef.current.onWikilinkClick?.(t),
          onTagClick: (t) => handlersRef.current.onTagClick?.(t),
        },
        onChange: (next) => {
          valueRef.current = next;
          changeRef.current(next);
        },
        onSave: () => saveRef.current?.(),
      }),
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    setApi(editorApi);
    setActiveEditor(editorApi);

    return () => {
      view.destroy();
      viewRef.current = null;
      setApi(null);
      setActiveEditor(null);
    };
  }, [mode, isReading, placeholder, structuralKey]);

  // Live-apply font / spacing changes without rebuilding the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: appearanceCompartment.reconfigure(appearanceTheme(appearance)),
    });
  }, [appearance]);

  // Keep the document in sync when the value changes from outside.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  const words = useMemo(() => countWords(value), [value]);


  const editorSurface = (
    <div
      ref={hostRef}
      className="min-h-[50vh] w-full text-sm"
      onFocus={() => api && setActiveEditor(api)}
    />
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showProperties && toolbarSettings.showProperties && (
        <PropertiesPanel value={value} onChange={onChange} />
      )}
      {showToolbar && toolbarSettings.showToolbar && !isReading && (
        <EditorToolbar editor={api} groups={toolbarSettings.groups} />
      )}


      {isReading ? (
        <div className="prose-container min-h-[50vh] py-3">
          {value ? (
            <MarkdownRenderer
              content={value}
              onWikilinkClick={onWikilinkClick}
              onTagClick={onTagClick}
            />
          ) : (
            <p className="text-muted-foreground/30 text-sm italic">
              Nothing to preview
            </p>
          )}
        </div>
      ) : sideBySide ? (
        <div className="grid grid-cols-2 gap-6 min-h-[50vh]">
          <div className="rounded-lg border border-border/30 bg-muted/20 overflow-hidden">
            {editorSurface}
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/20 p-5 overflow-auto">
            {value ? (
              <MarkdownRenderer
                content={value}
                onWikilinkClick={onWikilinkClick}
                onTagClick={onTagClick}
              />
            ) : (
              <p className="text-muted-foreground/30 text-sm italic">
                Nothing to preview
              </p>
            )}
          </div>
        </div>
      ) : (
        editorSurface
      )}

      {toolbarSettings.showWordCount && (
        <div className="px-1 text-[11px] text-muted-foreground/60">
          {words} {words === 1 ? "word" : "words"}
        </div>
      )}

    </div>
  );
};
