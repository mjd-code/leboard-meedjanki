/** User-facing on/off switches for optional features. */

import { useEffect, useState } from 'react';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import {
  TOGGLEABLE_FEATURES,
  getFeatureToggles,
  onFeatureTogglesChange,
  setFeatureEnabled,
} from '@/core/plugins/feature-toggles';

export function FeatureTogglesPanel() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => getFeatureToggles());

  useEffect(() => onFeatureTogglesChange(setToggles), []);

  return (
    <section aria-labelledby="feature-toggles-heading" className="space-y-3">
      <h2 id="feature-toggles-heading" className="text-sm font-semibold">
        Features
      </h2>
      <ul className="space-y-3">
        {TOGGLEABLE_FEATURES.map((feature) => (
          <li key={feature.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor={`toggle-${feature.id}`} className="text-sm">
                {feature.name}
              </Label>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
            <Switch
              id={`toggle-${feature.id}`}
              checked={toggles[feature.id] ?? true}
              onCheckedChange={(checked) => void setFeatureEnabled(feature.id, checked)}
              aria-label={`Turn ${feature.name} ${toggles[feature.id] ? 'off' : 'on'}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
