/// <reference lib="webworker" />
/**
 * Unlinked-mention scanner.
 *
 * Receives every note body plus every note title/alias and returns, per title,
 * the notes that mention it in plain text (i.e. outside an existing wikilink).
 */

import { AhoCorasick } from './aho-corasick';

export interface MentionDoc {
  id: string;
  name: string;
  text: string;
}

export interface MentionPattern {
  /** Node the pattern belongs to. */
  nodeId: string;
  /** Title or alias to search for. */
  text: string;
}

export interface MentionHit {
  nodeId: string;
  nodeName: string;
  count: number;
  snippet: string;
}

export interface MentionsRequest {
  requestId: number;
  docs: MentionDoc[];
  patterns: MentionPattern[];
}

export interface MentionsResponse {
  requestId: number;
  /** target node id -> notes mentioning it without a link */
  mentions: Record<string, MentionHit[]>;
}

const linkRanges = (content: string): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  const re = /!?\[\[[^\]]*\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
};

const snippetAt = (text: string, start: number, end: number): string => {
  const from = Math.max(0, start - 40);
  const to = Math.min(text.length, end + 40);
  const prefix = from > 0 ? '…' : '';
  const suffix = to < text.length ? '…' : '';
  return `${prefix}${text.slice(from, to).replace(/\s+/g, ' ').trim()}${suffix}`;
};

export function scanMentions(
  docs: MentionDoc[],
  patterns: MentionPattern[]
): Record<string, MentionHit[]> {
  const mentions: Record<string, MentionHit[]> = {};
  if (!patterns.length || !docs.length) return mentions;

  const automaton = new AhoCorasick(patterns.map((p) => p.text));

  docs.forEach((doc) => {
    const skip = linkRanges(doc.text);
    const perTarget = new Map<string, { count: number; snippet: string }>();

    automaton.search(doc.text).forEach(({ patternIndex, start, end }) => {
      const pattern = patterns[patternIndex];
      if (!pattern || pattern.nodeId === doc.id) return;
      if (skip.some(([from, to]) => start >= from && start < to)) return;
      const existing = perTarget.get(pattern.nodeId);
      if (existing) existing.count += 1;
      else perTarget.set(pattern.nodeId, { count: 1, snippet: snippetAt(doc.text, start, end) });
    });

    perTarget.forEach((hit, targetId) => {
      (mentions[targetId] ??= []).push({
        nodeId: doc.id,
        nodeName: doc.name,
        count: hit.count,
        snippet: hit.snippet,
      });
    });
  });

  return mentions;
}

self.onmessage = (event: MessageEvent<MentionsRequest>) => {
  const { requestId, docs, patterns } = event.data;
  const response: MentionsResponse = {
    requestId,
    mentions: scanMentions(docs, patterns),
  };
  (self as unknown as Worker).postMessage(response);
};
