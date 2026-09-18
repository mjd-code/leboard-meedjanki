/**
 * Schema settings — the global context of the Cascading Schema.
 * Rules defined here are inherited by every note and can be overridden per note.
 */

import { useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  PROPERTY_TYPES,
  VISIBILITY_OPTIONS,
  useSchemaStore,
  type PropertyVisibility,
  type SchemaPropertyType,
} from '@/core/schema';
import { useVaultStore } from '@/shared/stores/useVaultStore';

export function SchemaSettings() {
  const vaultId = useVaultStore((s) => s.currentVaultId);
  const schema = useSchemaStore((s) => s.schema);
  const {
    setStrictMode,
    addProperty,
    updateProperty,
    removeProperty,
    moveProperty,
    resetSchema,
    hydrateFromVault,
    persistToVault,
  } = useSchemaStore();

  useEffect(() => {
    if (vaultId) hydrateFromVault(vaultId);
  }, [vaultId, hydrateFromVault]);

  useEffect(() => {
    if (vaultId) void persistToVault(vaultId);
  }, [vaultId, schema, persistToVault]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Properties</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Mandatory properties always appear at the top of a note. Everything else can be tucked
            into the collapsible section.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetSchema} className="flex-shrink-0">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <Label className="text-sm">Strict mode</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Warn when mandatory properties are empty. Blocking saves arrives with the linter.
          </p>
        </div>
        <Switch checked={schema.strictMode} onCheckedChange={setStrictMode} />
      </div>

      <Separator />

      <div className="space-y-3">
        {schema.properties.map((rule, index) => (
          <div key={rule.key} className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={rule.key}
                onChange={(e) => updateProperty(rule.key, { key: e.target.value })}
                className="h-8 font-mono text-xs"
                aria-label="Property name"
              />
              {rule.required && (
                <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                  Mandatory
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                disabled={index === 0}
                onClick={() => moveProperty(rule.key, -1)}
                aria-label="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                disabled={index === schema.properties.length - 1}
                onClick={() => moveProperty(rule.key, 1)}
                aria-label="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeProperty(rule.key)}
                aria-label="Remove property"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={rule.type}
                  onValueChange={(v) => updateProperty(rule.key, { type: v as SchemaPropertyType })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Visibility</Label>
                <Select
                  value={rule.visibility}
                  onValueChange={(v) =>
                    updateProperty(rule.key, { visibility: v as PropertyVisibility })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Default value</Label>
                <Input
                  value={rule.defaultValue ?? ''}
                  onChange={(e) => updateProperty(rule.key, { defaultValue: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="empty"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Taxonomy prefix</Label>
                <Input
                  value={rule.taxonomyPrefix ?? ''}
                  onChange={(e) => updateProperty(rule.key, { taxonomyPrefix: e.target.value })}
                  className="h-8 text-xs font-mono"
                  placeholder="century/"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label className="text-xs text-muted-foreground">Mandatory</Label>
              <Switch
                checked={rule.required}
                onCheckedChange={(v) => updateProperty(rule.key, { required: v })}
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => addProperty()} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add property
      </Button>

      <p className="text-xs text-muted-foreground">
        A single note can override any rule by adding a <code className="font-mono">schema:</code>{' '}
        block to its own properties.
      </p>
    </div>
  );
}
