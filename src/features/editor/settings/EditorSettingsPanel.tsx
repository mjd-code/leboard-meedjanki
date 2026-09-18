/**
 * EditorSettingsPanel - Unified editor configuration (mirrors the Graph Config panel).
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Slider } from '@/shared/ui/slider';
import { Input } from '@/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Pencil, Type, Keyboard, Sparkles, LayoutPanelTop, RotateCcw } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/useMobile';
import {
  useEditorSettingsStore,
  type EditorFontFamily,
} from '@/shared/stores/useEditorSettingsStore';

interface EditorSettingsPanelProps {
  variant?: 'default' | 'compact';
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <Label className="text-sm">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2 py-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

const tabItems = [
  { value: 'appearance', icon: Type, label: 'Look' },
  { value: 'behavior', icon: Keyboard, label: 'Typing' },
  { value: 'suggestions', icon: Sparkles, label: 'Assist' },
  { value: 'toolbar', icon: LayoutPanelTop, label: 'Toolbar' },
];

/** Tab body only — reused by the Sheet panel and the Unified Settings Hub. */
export function EditorSettingsContent() {
  const [activeTab, setActiveTab] = useState('appearance');

  const {
    appearance,
    behavior,
    suggestions,
    toolbar,
    updateAppearance,
    updateBehavior,
    updateSuggestions,
    updateToolbar,
    updateToolbarGroup,
  } = useEditorSettingsStore();

  return (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-shrink-0 border-b border-border bg-muted/30 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsList className="inline-flex h-11 sm:h-12 w-full min-w-max items-center justify-start gap-0.5 sm:gap-1 bg-transparent p-1 sm:p-1.5 px-2 sm:px-4">
                {tabItems.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 sm:p-6">
                <TabsContent value="appearance" className="mt-0 space-y-1 focus-visible:outline-none">
                  <div className="space-y-2 py-1.5">
                    <Label className="text-sm">Font</Label>
                    <Select
                      value={appearance.fontFamily}
                      onValueChange={(v) => updateAppearance({ fontFamily: v as EditorFontFamily })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sans">Sans serif</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="mono">Monospace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <SliderRow
                    label="Font size"
                    value={appearance.fontSize}
                    min={11}
                    max={28}
                    unit="px"
                    onChange={(v) => updateAppearance({ fontSize: v })}
                  />
                  <SliderRow
                    label="Line height"
                    value={appearance.lineHeight}
                    min={1.2}
                    max={2.4}
                    step={0.1}
                    onChange={(v) => updateAppearance({ lineHeight: v })}
                  />

                  <ToggleRow
                    label="Readable line length"
                    description="Limit how wide a line of text can get."
                    checked={appearance.limitContentWidth}
                    onChange={(v) => updateAppearance({ limitContentWidth: v })}
                  />
                  {appearance.limitContentWidth && (
                    <div className="flex items-center justify-between gap-4 py-1.5">
                      <Label className="text-sm">Max characters per line</Label>
                      <Input
                        type="number"
                        min={40}
                        max={160}
                        value={appearance.contentWidth}
                        onChange={(e) =>
                          updateAppearance({
                            contentWidth: Math.min(160, Math.max(40, Number(e.target.value) || 40)),
                          })
                        }
                        className="h-8 w-24"
                      />
                    </div>
                  )}

                  <ToggleRow
                    label="Line numbers"
                    checked={appearance.showLineNumbers}
                    onChange={(v) => updateAppearance({ showLineNumbers: v })}
                  />
                  <ToggleRow
                    label="Highlight current line"
                    checked={appearance.highlightActiveLine}
                    onChange={(v) => updateAppearance({ highlightActiveLine: v })}
                  />
                  <ToggleRow
                    label="Highlight matching text"
                    checked={appearance.highlightSelectionMatches}
                    onChange={(v) => updateAppearance({ highlightSelectionMatches: v })}
                  />
                </TabsContent>

                <TabsContent value="behavior" className="mt-0 space-y-1 focus-visible:outline-none">
                  <ToggleRow
                    label="Wrap long lines"
                    checked={behavior.lineWrapping}
                    onChange={(v) => updateBehavior({ lineWrapping: v })}
                  />
                  <SliderRow
                    label="Indent size"
                    value={behavior.indentUnit}
                    min={1}
                    max={8}
                    unit=" spaces"
                    onChange={(v) => updateBehavior({ indentUnit: v })}
                  />
                  <ToggleRow
                    label="Tab key indents"
                    checked={behavior.tabIndents}
                    onChange={(v) => updateBehavior({ tabIndents: v })}
                  />
                  <ToggleRow
                    label="Auto-close brackets"
                    checked={behavior.autoCloseBrackets}
                    onChange={(v) => updateBehavior({ autoCloseBrackets: v })}
                  />
                  <ToggleRow
                    label="Match brackets"
                    checked={behavior.bracketMatching}
                    onChange={(v) => updateBehavior({ bracketMatching: v })}
                  />
                  <ToggleRow
                    label="Smart indent while typing"
                    checked={behavior.indentOnInput}
                    onChange={(v) => updateBehavior({ indentOnInput: v })}
                  />
                  <ToggleRow
                    label="Spell check"
                    checked={behavior.spellcheck}
                    onChange={(v) => updateBehavior({ spellcheck: v })}
                  />
                  <div className="flex items-center justify-between gap-4 py-1.5">
                    <div>
                      <Label className="text-sm">Auto-save delay</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Milliseconds after you stop typing.</p>
                    </div>
                    <Input
                      type="number"
                      min={200}
                      max={10000}
                      step={100}
                      value={behavior.autoSaveDelay}
                      onChange={(e) =>
                        updateBehavior({
                          autoSaveDelay: Math.min(10000, Math.max(200, Number(e.target.value) || 200)),
                        })
                      }
                      className="h-8 w-28"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="suggestions" className="mt-0 space-y-1 focus-visible:outline-none">
                  <ToggleRow
                    label="Suggestions"
                    description="Master switch for all auto-complete popups."
                    checked={suggestions.enabled}
                    onChange={(v) => updateSuggestions({ enabled: v })}
                  />
                  <div className={suggestions.enabled ? '' : 'opacity-50 pointer-events-none'}>
                    <ToggleRow
                      label="Show while typing"
                      checked={suggestions.activateOnTyping}
                      onChange={(v) => updateSuggestions({ activateOnTyping: v })}
                    />
                    <ToggleRow
                      label="Note links [[...]]"
                      checked={suggestions.wikilinks}
                      onChange={(v) => updateSuggestions({ wikilinks: v })}
                    />
                    <ToggleRow
                      label="Tags #..."
                      checked={suggestions.tags}
                      onChange={(v) => updateSuggestions({ tags: v })}
                    />
                    <ToggleRow
                      label="Properties"
                      checked={suggestions.properties}
                      onChange={(v) => updateSuggestions({ properties: v })}
                    />
                  </div>
                  <ToggleRow
                    label="Slash commands"
                    description="Type / on an empty line to open the command palette."
                    checked={suggestions.slashCommands}
                    onChange={(v) => updateSuggestions({ slashCommands: v })}
                  />
                </TabsContent>

                <TabsContent value="toolbar" className="mt-0 space-y-1 focus-visible:outline-none">
                  <ToggleRow
                    label="Formatting toolbar"
                    checked={toolbar.showToolbar}
                    onChange={(v) => updateToolbar({ showToolbar: v })}
                  />
                  <div className={toolbar.showToolbar ? '' : 'opacity-50 pointer-events-none'}>
                    <ToggleRow
                      label="Bold / italic / code"
                      checked={toolbar.groups.format}
                      onChange={(v) => updateToolbarGroup('format', v)}
                    />
                    <ToggleRow
                      label="Headings"
                      checked={toolbar.groups.headings}
                      onChange={(v) => updateToolbarGroup('headings', v)}
                    />
                    <ToggleRow
                      label="Lists & quotes"
                      checked={toolbar.groups.blocks}
                      onChange={(v) => updateToolbarGroup('blocks', v)}
                    />
                    <ToggleRow
                      label="Links, tables & math"
                      checked={toolbar.groups.insert}
                      onChange={(v) => updateToolbarGroup('insert', v)}
                    />
                  </div>
                  <ToggleRow
                    label="Properties panel"
                    description="Frontmatter editor above the note."
                    checked={toolbar.showProperties}
                    onChange={(v) => updateToolbar({ showProperties: v })}
                  />
                  <ToggleRow
                    label="Word count"
                    checked={toolbar.showWordCount}
                    onChange={(v) => updateToolbar({ showWordCount: v })}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
  );
}

export function EditorSettingsPanel({ variant = 'compact' }: EditorSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { suggestions, toolbar, behavior, reset } = useEditorSettingsStore();

  const enabledCount =
    Number(suggestions.enabled) +
    Number(toolbar.showToolbar) +
    Number(toolbar.showProperties) +
    Number(behavior.lineWrapping);

  const trigger =
    variant === 'compact' ? (
      <Button variant="outline" size="sm" className="w-full justify-start gap-2">
        <Pencil className="w-4 h-4" />
        <span className="flex-1 text-left">Configure</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          {enabledCount}
        </Badge>
      </Button>
    ) : (
      <Button variant="outline" className="shadow-lg gap-2">
        <Pencil className="w-4 h-4" />
        Editor Settings
      </Button>
    );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile ? 'h-[85vh] max-h-[85vh] rounded-t-2xl p-0' : 'w-full max-w-[420px] p-0'
        }
      >
        <div className="flex flex-col h-full overflow-hidden">
          <SheetHeader className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-background/95">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Pencil className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="truncate">Editor Settings</span>
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="text-muted-foreground hover:text-foreground h-8 px-2 sm:px-3"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs">Reset</span>
              </Button>
            </div>
          </SheetHeader>

          <EditorSettingsContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}

