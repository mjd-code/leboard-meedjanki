import { useEffect, useState } from "react";
import {
  container,
  type ServiceIdentifier,
} from "@/shared/di/container";

/**
 * Resolve a registered service from the DI container inside a component.
 * Returns `null` until the service instance is available.
 */
export function useService<T>(id: ServiceIdentifier): T | null {
  const [service, setService] = useState<T | null>(() =>
    container.isResolved(id) ? container.resolveSync<T>(id) : null
  );

  useEffect(() => {
    let cancelled = false;
    if (!container.has(id)) {
      console.warn(`[useService] Service ${String(id)} is not registered`);
      return;
    }
    container
      .resolve<T>(id)
      .then((instance) => {
        if (!cancelled) setService(instance);
      })
      .catch((error) => {
        console.error(`[useService] Failed to resolve ${String(id)}`, error);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return service;
}
