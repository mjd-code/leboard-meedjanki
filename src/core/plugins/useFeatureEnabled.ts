/** React binding for the persisted feature toggles. */

import { useEffect, useState } from 'react';
import { getFeatureToggles, onFeatureTogglesChange } from './feature-toggles';

export function useFeatureEnabled(featureId: string): boolean {
  const [enabled, setEnabled] = useState(() => getFeatureToggles()[featureId] ?? true);

  useEffect(
    () => onFeatureTogglesChange((map) => setEnabled(map[featureId] ?? true)),
    [featureId]
  );

  return enabled;
}
