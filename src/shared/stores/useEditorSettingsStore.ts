/**
 * Editor Settings Store - Unified, persisted configuration for the markdown editor.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type EditorFontFamily = 'sans' | 'serif' | 'mono';

export interface EditorAppearanceConfig {
  fontFamily: EditorFontFamily;
  fontSize: number; // px
  lineHeight: number;
  contentWidth: number; // characters
  limitContentWidth: boolean;
  showLineNumbers: boolean;
  highlightActiveLine: boolean;
  highlightSelectionMatches: boolean;
}

export interface EditorBehaviorConfig {
  lineWrapping: boolean;
  indentUnit: number; // spaces
  tabIndents: boolean;
  autoCloseBrackets: boolean;
  bracketMatching: boolean;
  indentOnInput: boolean;
  spellcheck: boolean;
  autoSaveDelay: number; // ms
}

export interface EditorSuggestionsConfig {
  enabled: boolean;
  activateOnTyping: boolean;
  wikilinks: boolean;
  tags: boolean;
  properties: boolean;
  slashCommands: boolean;
}

export interface EditorToolbarConfig {
  showToolbar: boolean;
  showProperties: boolean;
  showWordCount: boolean;
  groups: {
    format: boolean;
    headings: boolean;
    blocks: boolean;
    insert: boolean;
  };
}

export interface EditorSettingsState {
  appearance: EditorAppearanceConfig;
  behavior: EditorBehaviorConfig;
  suggestions: EditorSuggestionsConfig;
  toolbar: EditorToolbarConfig;

  updateAppearance: (updates: Partial<EditorAppearanceConfig>) => void;
  updateBehavior: (updates: Partial<EditorBehaviorConfig>) => void;
  updateSuggestions: (updates: Partial<EditorSuggestionsConfig>) => void;
  updateToolbar: (updates: Partial<Omit<EditorToolbarConfig, 'groups'>>) => void;
  updateToolbarGroup: (group: keyof EditorToolbarConfig['groups'], enabled: boolean) => void;
  reset: () => void;
}

export const defaultAppearanceConfig: EditorAppearanceConfig = {
  fontFamily: 'sans',
  fontSize: 15,
  lineHeight: 1.7,
  contentWidth: 80,
  limitContentWidth: false,
  showLineNumbers: false,
  highlightActiveLine: true,
  highlightSelectionMatches: true,
};

export const defaultBehaviorConfig: EditorBehaviorConfig = {
  lineWrapping: true,
  indentUnit: 2,
  tabIndents: true,
  autoCloseBrackets: true,
  bracketMatching: true,
  indentOnInput: true,
  spellcheck: false,
  autoSaveDelay: 800,
};

export const defaultSuggestionsConfig: EditorSuggestionsConfig = {
  enabled: true,
  activateOnTyping: true,
  wikilinks: true,
  tags: true,
  properties: true,
  slashCommands: true,
};

export const defaultToolbarConfig: EditorToolbarConfig = {
  showToolbar: true,
  showProperties: true,
  showWordCount: true,
  groups: { format: true, headings: true, blocks: true, insert: true },
};

export const useEditorSettingsStore = create<EditorSettingsState>()(
  devtools(
    persist(
      (set) => ({
        appearance: defaultAppearanceConfig,
        behavior: defaultBehaviorConfig,
        suggestions: defaultSuggestionsConfig,
        toolbar: defaultToolbarConfig,

        updateAppearance: (updates) =>
          set((s) => ({ appearance: { ...s.appearance, ...updates } }), false, 'updateAppearance'),
        updateBehavior: (updates) =>
          set((s) => ({ behavior: { ...s.behavior, ...updates } }), false, 'updateBehavior'),
        updateSuggestions: (updates) =>
          set((s) => ({ suggestions: { ...s.suggestions, ...updates } }), false, 'updateSuggestions'),
        updateToolbar: (updates) =>
          set((s) => ({ toolbar: { ...s.toolbar, ...updates } }), false, 'updateToolbar'),
        updateToolbarGroup: (group, enabled) =>
          set(
            (s) => ({ toolbar: { ...s.toolbar, groups: { ...s.toolbar.groups, [group]: enabled } } }),
            false,
            'updateToolbarGroup',
          ),
        reset: () =>
          set(
            {
              appearance: defaultAppearanceConfig,
              behavior: defaultBehaviorConfig,
              suggestions: defaultSuggestionsConfig,
              toolbar: defaultToolbarConfig,
            },
            false,
            'resetEditorSettings',
          ),
      }),
      { name: 'editor-settings' },
    ),
    { name: 'EditorSettingsStore' },
  ),
);

export const FONT_FAMILY_CSS: Record<EditorFontFamily, string> = {
  sans: 'inherit',
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};
