import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Textarea } from "@/shared/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Plus,
  X,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  ListOrdered,
  GripVertical,
  ChevronDown,
  Code2,
  Lock,
} from "lucide-react";
import { cn } from "@/shared/lib";
import { useNodeStore } from "@/shared/stores";
import type { FrontmatterProperty, FrontmatterPropertyType } from "@/features/editor/types";
import {
  parseFrontmatter,
  writeFrontmatter,
  writeRawFrontmatter,
} from "@/features/editor/cm/extensions/frontmatterField";
import {
  detectListLayout,
  isReservedKey,
  normalizeTag,
  propertiesToYaml,
  reservedType,
  tagSegments,
  toStringList,
  type ListLayout,
} from "@/features/editor/frontmatter/frontmatter-utils";
import { useResolvedSchema, useSchemaStore, type ResolvedProperty } from "@/core/schema";

const isEmptyValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

interface PropertiesPanelProps {
  /** Full markdown document (frontmatter + body). */
  value: string;
  onChange: (next: string) => void;
}

const TYPE_ICON: Record<FrontmatterPropertyType, typeof Type> = {
  text: Type,
  number: Hash,
  date: Calendar,
  checkbox: ToggleLeft,
  select: ChevronDown,
  tags: Hash,
  list: ListOrdered,
};

const TYPE_LABEL: Record<FrontmatterPropertyType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  checkbox: "Checkbox",
  select: "Select",
  tags: "Tags",
  list: "List",
};

const TYPES = Object.keys(TYPE_LABEL) as FrontmatterPropertyType[];

const coerceValue = (value: unknown, type: FrontmatterPropertyType): unknown => {
  switch (type) {
    case "tags":
    case "list":
      return toStringList(value);
    case "checkbox":
      return Boolean(value);
    case "number": {
      const n = Number(Array.isArray(value) ? value[0] : value);
      return Number.isFinite(n) ? n : 0;
    }
    default: {
      const v = Array.isArray(value) ? value[0] : value;
      return v === null || v === undefined ? "" : String(v);
    }
  }
};

export const PropertiesPanel = ({ value, onChange }: PropertiesPanelProps) => {
  const [newKey, setNewKey] = useState("");
  const [listLayout, setListLayout] = useState<ListLayout>("block");
  const [rawMode, setRawMode] = useState(false);
  const [rawDraft, setRawDraft] = useState("");
  const [dragRow, setDragRow] = useState<number | null>(null);

  const info = useMemo(() => parseFrontmatter(value), [value]);
  const properties = info.properties;

  // Follow the layout already used by the document.
  useEffect(() => {
    if (info.raw) setListLayout(detectListLayout(info.raw));
  }, [info.raw]);

  // ---- Cascading schema (global rules -> this note's overrides) ----
  const frontmatterRecord = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.key, p.value])) as Record<string, unknown>,
    [properties]
  );
  const rules = useResolvedSchema(frontmatterRecord);
  const strictMode = useSchemaStore((s) => s.schema.strictMode);
  const ruleFor = (key: string) => rules.find((r) => r.key === key);

  const missingRequired = rules.filter(
    (r) => r.required && !properties.some((p) => p.key === r.key)
  );
  const emptyRequired = rules.filter(
    (r) =>
      r.required &&
      properties.some((p) => p.key === r.key && isEmptyValue(p.value))
  );

  const nodes = useNodeStore((state) => state.nodes);
  const knownTags = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => n.tags?.forEach((t) => set.add(normalizeTag(t))));
    rules.forEach((r) => {
      if (r.taxonomyPrefix) set.add(normalizeTag(r.taxonomyPrefix));
    });
    return Array.from(set).filter(Boolean).sort();
  }, [nodes, rules]);

  const commit = (next: FrontmatterProperty[], layout: ListLayout = listLayout) => {
    onChange(writeFrontmatter(value, next, layout));
  };

  const updateValue = (key: string, next: unknown) => {
    commit(properties.map((p) => (p.key === key ? { ...p, value: next } : p)));
  };

  const renameKey = (key: string, nextKeyRaw: string) => {
    const nextKey = nextKeyRaw.trim();
    if (!nextKey || nextKey === key) return;
    if (properties.some((p) => p.key.toLowerCase() === nextKey.toLowerCase())) return;
    commit(
      properties.map((p) =>
        p.key === key
          ? { ...p, key: nextKey, type: reservedType(nextKey) ?? p.type, value: coerceValue(p.value, reservedType(nextKey) ?? p.type) }
          : p
      )
    );
  };

  const changeType = (key: string, type: FrontmatterPropertyType) => {
    commit(
      properties.map((p) => (p.key === key ? { ...p, type, value: coerceValue(p.value, type) } : p))
    );
  };

  const removeProperty = (key: string) => {
    commit(properties.filter((p) => p.key !== key));
  };

  const addProperty = () => {
    const key = newKey.trim();
    setNewKey("");
    if (!key) return;
    if (properties.some((p) => p.key.toLowerCase() === key.toLowerCase())) return;
    const rule = ruleFor(key);
    const type = reservedType(key) ?? (rule?.type as FrontmatterPropertyType) ?? "text";
    commit([
      ...properties,
      { key, type, value: coerceValue(rule?.defaultValue ?? "", type) },
    ]);
  };

  /** Seed every mandatory property the schema requires but the note lacks. */
  const addMissingRequired = () => {
    const seeded = missingRequired.map((rule) => {
      const type = (reservedType(rule.key) ?? rule.type) as FrontmatterPropertyType;
      return { key: rule.key, type, value: coerceValue(rule.defaultValue ?? "", type) };
    });
    commit([...seeded, ...properties]);
  };

  const moveRow = (from: number, to: number) => {
    if (from === to || to < 0 || to >= properties.length) return;
    const next = [...properties];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    commit(next);
  };

  const duplicateKey = properties.some(
    (p) => p.key.trim().toLowerCase() === newKey.trim().toLowerCase() && newKey.trim()
  );

  const yamlPreview = propertiesToYaml(properties, listLayout);

  const openRaw = () => {
    setRawDraft(yamlPreview);
    setRawMode(true);
  };

  const saveRaw = () => {
    onChange(writeRawFrontmatter(value, rawDraft));
    setRawMode(false);
  };

  // Smart Visibility Engine: mandatory first, then always-visible, the rest
  // behind an accordion.
  const rank = (key: string): number => {
    const rule = ruleFor(key);
    if (!rule) return 2;
    if (rule.required) return 0;
    return rule.visibility === "always" ? 1 : 3;
  };

  const rows = properties
    .map((property, index) => ({ property, index, rank: rank(property.key) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
  const primaryRows = rows.filter((r) => r.rank < 3);
  const secondaryRows = rows.filter((r) => r.rank === 3);

  const renderRow = ({ property, index }: { property: FrontmatterProperty; index: number }) => {
    const Icon = TYPE_ICON[property.type] ?? Type;
    const rule = ruleFor(property.key);
    const mandatory = Boolean(rule?.required);
    const reserved = isReservedKey(property.key) || mandatory;
    const invalid = strictMode && mandatory && isEmptyValue(property.value);

    return (
      <div
        key={property.key}
        className={cn(
          "group flex items-start gap-2 rounded-md px-1 py-0.5 transition-colors",
          dragRow === index && "bg-accent/40",
          invalid && "ring-1 ring-destructive/40"
        )}
        onDragOver={(e) => {
          if (dragRow === null) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (dragRow === null) return;
          e.preventDefault();
          moveRow(dragRow, index);
          setDragRow(null);
        }}
      >
        <button
          type="button"
          aria-label={`Reorder ${property.key}`}
          draggable
          onDragStart={() => setDragRow(index)}
          onDragEnd={() => setDragRow(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              moveRow(index, index - 1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              moveRow(index, index + 1);
            }
          }}
          className="mt-1.5 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="flex w-40 shrink-0 items-center gap-1 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={reserved}>
              <button
                type="button"
                aria-label={`Change type of ${property.key} (currently ${TYPE_LABEL[property.type]})`}
                className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-60"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TYPES.map((t) => {
                const TIcon = TYPE_ICON[t];
                return (
                  <DropdownMenuItem key={t} onSelect={() => changeType(property.key, t)}>
                    <TIcon className="mr-2 h-3.5 w-3.5" />
                    {TYPE_LABEL[t]}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            defaultValue={property.key}
            key={`${property.key}-key`}
            readOnly={reserved}
            aria-label={`Property name ${property.key}`}
            onBlur={(e) => renameKey(property.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-7 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          />
          {reserved && (
            <Lock
              className="h-3 w-3 shrink-0 text-muted-foreground/60"
              aria-label={mandatory ? "Mandatory property" : "Reserved key"}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {property.type === "checkbox" ? (
            <Checkbox
              checked={Boolean(property.value)}
              onCheckedChange={(checked) => updateValue(property.key, checked === true)}
              className="mt-1.5"
              aria-label={property.key}
            />
          ) : property.type === "tags" || property.type === "list" ? (
            <ListValueInput
              propertyKey={property.key}
              isTags={property.type === "tags"}
              values={toStringList(property.value)}
              suggestions={property.type === "tags" ? knownTags : []}
              onChange={(next) => updateValue(property.key, next)}
            />
          ) : property.type === "select" ? (
            <SelectValueInput
              propertyKey={property.key}
              value={String(property.value ?? "")}
              options={optionsForKey(nodes, property.key)}
              onChange={(next) => updateValue(property.key, next)}
            />
          ) : (
            <Input
              type={property.type === "number" ? "number" : property.type === "date" ? "date" : "text"}
              value={property.value === null || property.value === undefined ? "" : String(property.value)}
              aria-label={property.key}
              onChange={(e) =>
                updateValue(
                  property.key,
                  property.type === "number" ? Number(e.target.value) : e.target.value
                )
              }
              className="h-8 border-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
            />
          )}
        </div>

        {mandatory ? (
          <Badge variant="secondary" className="mt-1.5 shrink-0 text-[10px]">
            Required
          </Badge>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => removeProperty(property.key)}
            aria-label={`Remove ${property.key}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };


  return (
    <section aria-label="Document properties" className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">Properties</h2>
        <div className="flex items-center gap-1">
          <div role="group" aria-label="List layout" className="flex rounded-md border border-border/50">
            {(["block", "inline"] as ListLayout[]).map((layout) => (
              <button
                key={layout}
                type="button"
                aria-pressed={listLayout === layout}
                onClick={() => {
                  setListLayout(layout);
                  commit(properties, layout);
                }}
                className={cn(
                  "px-2 py-1 text-[11px] capitalize transition-colors",
                  listLayout === layout ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {layout}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-pressed={rawMode}
            aria-label="Toggle raw YAML view"
            onClick={() => (rawMode ? setRawMode(false) : openRaw())}
          >
            <Code2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {info.error && (
        <p role="alert" className="text-xs text-destructive">
          Properties could not be read: {info.error}
        </p>
      )}

      {rawMode ? (
        <div className="space-y-2">
          <Textarea
            value={rawDraft}
            onChange={(e) => setRawDraft(e.target.value)}
            spellCheck={false}
            rows={Math.max(4, rawDraft.split("\n").length + 1)}
            aria-label="Raw YAML frontmatter"
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveRaw}>
              Apply YAML
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRawMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {(missingRequired.length > 0 || (strictMode && emptyRequired.length > 0)) && (
            <div className="flex items-start justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">
                {missingRequired.length > 0
                  ? `Mandatory properties missing: ${missingRequired.map((r) => r.key).join(", ")}`
                  : `Mandatory properties left empty: ${emptyRequired.map((r) => r.key).join(", ")}`}
              </p>
              {missingRequired.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 shrink-0 px-2 text-[11px]"
                  onClick={addMissingRequired}
                >
                  Add them
                </Button>
              )}
            </div>
          )}

          <div className="space-y-1">{primaryRows.map(renderRow)}</div>

          {secondaryRows.length > 0 && (
            <details className="rounded-md border border-border/40 bg-background/30">
              <summary className="cursor-pointer select-none px-2 py-1 text-[11px] text-muted-foreground">
                System config ({secondaryRows.length})
              </summary>
              <div className="space-y-1 px-1 pb-1">{secondaryRows.map(renderRow)}</div>
            </details>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addProperty();
                }
              }}
              onBlur={addProperty}
              placeholder="Add property"
              aria-label="Add property"
              aria-invalid={duplicateKey}
              className="h-7 w-40 border-none bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
            />
            {duplicateKey && <span className="text-[11px] text-destructive">Already used</span>}
          </div>

          {properties.length > 0 && (
            <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {`---\n${yamlPreview}\n---`}
            </pre>
          )}
        </>
      )}
    </section>
  );
};

function optionsForKey(nodes: { content: string }[], key: string): string[] {
  const set = new Set<string>();
  nodes.forEach((n) => {
    const match = n.content?.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (match) set.add(match[1].trim().replace(/^['"]|['"]$/g, ""));
  });
  return Array.from(set).filter(Boolean).sort();
}

const SelectValueInput = ({
  propertyKey,
  value,
  options,
  onChange,
}: {
  propertyKey: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) => {
  const listId = `select-${propertyKey}`;
  return (
    <>
      <Input
        list={listId}
        value={value}
        aria-label={propertyKey}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 border-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
};

const ListValueInput = ({
  propertyKey,
  isTags,
  values,
  suggestions,
  onChange,
}: {
  propertyKey: string;
  isTags: boolean;
  values: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) => {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const clean = (raw: string) => (isTags ? normalizeTag(raw) : raw.trim());

  const matches = useMemo(() => {
    const q = clean(draft).toLowerCase();
    if (!q) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q) && !values.includes(s)).slice(0, 6);
  }, [draft, suggestions, values, isTags]);

  const add = (raw: string) => {
    const item = clean(raw);
    setDraft("");
    setOpen(false);
    if (!item || values.includes(item)) return;
    onChange([...values, item]);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= values.length) return;
    const next = [...values];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 py-1">
        {values.map((item, index) => {
          const segments = tagSegments(item);
          return (
            <Badge
              key={item}
              variant="secondary"
              draggable
              onDragStart={() => (dragIndex.current = index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex.current !== null) move(dragIndex.current, index);
                dragIndex.current = null;
              }}
              className="cursor-grab gap-0.5 px-2 py-0.5 text-xs font-normal"
            >
              {isTags && segments.length > 1 ? (
                segments.map((seg, i) => (
                  <span key={`${seg}-${i}`} className={cn(i > 0 && "font-medium")}>
                    {i > 0 && <span className="mx-0.5 text-muted-foreground/60">/</span>}
                    {seg}
                  </span>
                ))
              ) : (
                <span>{item}</span>
              )}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(values.filter((v) => v !== item))}
                className="ml-1 rounded-sm hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
        <Input
          value={draft}
          aria-label={`Add value to ${propertyKey}`}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(matches.length === 1 ? matches[0] : draft);
            }
            if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
            if (e.key === "Escape") setOpen(false);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              add(draft);
            }, 120);
          }}
          placeholder="+"
          className="h-6 w-24 border-none bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
        />
      </div>

      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-44 w-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(m);
                }}
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
