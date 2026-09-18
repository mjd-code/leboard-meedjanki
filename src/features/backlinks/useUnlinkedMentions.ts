/**
 * Runs the unlinked-mention scan in a Web Worker, debounced, and exposes the
 * hits for one target note. Falls back to a synchronous scan if workers are
 * unavailable (e.g. some test environments).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  MentionHit,
  MentionsRequest,
  MentionsResponse,
} from '@/core/metadata/mentions.worker';
import { scanMentions } from '@/core/metadata/mentions.worker';
import type { Node } from '@/shared/stores/types';

const DEBOUNCE_MS = 150;

export function useUnlinkedMentions(nodes: Node[], targetId: string | null): MentionHit[] {
  const [mentions, setMentions] = useState<Record<string, MentionHit[]>>({});
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);

  const files = useMemo(
    () => nodes.filter((node) => node.type !== 'folder'),
    [nodes]
  );

  // Recompute only when titles or bodies actually change.
  const signature = useMemo(
    () => files.map((f) => `${f.id}:${f.name}:${(f.content ?? '').length}`).join('|'),
    [files]
  );

  useEffect(() => {
    let cancelled = false;

    const docs = files.map((f) => ({ id: f.id, name: f.name, text: f.content ?? '' }));
    const patterns = files
      .filter((f) => f.name.trim().length > 2)
      .map((f) => ({ nodeId: f.id, text: f.name.trim() }));

    const timer = window.setTimeout(() => {
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(
            new URL('@/core/metadata/mentions.worker.ts', import.meta.url),
            { type: 'module' }
          );
        }
        const worker = workerRef.current;
        const requestId = ++requestRef.current;
        const handle = (event: MessageEvent<MentionsResponse>) => {
          if (cancelled || event.data.requestId !== requestRef.current) return;
          setMentions(event.data.mentions);
          worker.removeEventListener('message', handle);
        };
        worker.addEventListener('message', handle);
        const message: MentionsRequest = { requestId, docs, patterns };
        worker.postMessage(message);
      } catch {
        if (!cancelled) setMentions(scanMentions(docs, patterns));
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    []
  );

  return targetId ? mentions[targetId] ?? [] : [];
}
