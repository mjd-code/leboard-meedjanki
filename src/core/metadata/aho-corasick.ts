/**
 * Minimal Aho-Corasick automaton for case-insensitive multi-pattern search.
 * Used to scan every note body for mentions of every note title in one pass.
 */

interface ACNode {
  next: Map<string, number>;
  fail: number;
  out: number[];
}

const isWordChar = (ch: string | undefined) => !!ch && /[\w\u00C0-\u024F]/.test(ch);

export interface ACMatch {
  patternIndex: number;
  start: number;
  end: number;
}

export class AhoCorasick {
  private nodes: ACNode[] = [{ next: new Map(), fail: 0, out: [] }];
  private patterns: string[];

  constructor(patterns: string[]) {
    this.patterns = patterns.map((p) => p.toLowerCase());
    this.patterns.forEach((pattern, index) => {
      if (!pattern) return;
      let current = 0;
      for (const ch of pattern) {
        let nextId = this.nodes[current].next.get(ch);
        if (nextId === undefined) {
          nextId = this.nodes.length;
          this.nodes.push({ next: new Map(), fail: 0, out: [] });
          this.nodes[current].next.set(ch, nextId);
        }
        current = nextId;
      }
      this.nodes[current].out.push(index);
    });

    // BFS to build failure links.
    const queue: number[] = [];
    this.nodes[0].next.forEach((id) => {
      this.nodes[id].fail = 0;
      queue.push(id);
    });
    while (queue.length) {
      const current = queue.shift()!;
      this.nodes[current].next.forEach((id, ch) => {
        let fail = this.nodes[current].fail;
        while (fail !== 0 && !this.nodes[fail].next.has(ch)) fail = this.nodes[fail].fail;
        const target = this.nodes[fail].next.get(ch);
        this.nodes[id].fail = target !== undefined && target !== id ? target : 0;
        this.nodes[id].out.push(...this.nodes[this.nodes[id].fail].out);
        queue.push(id);
      });
    }
  }

  /** Whole-word matches only. */
  search(text: string): ACMatch[] {
    const lower = text.toLowerCase();
    const matches: ACMatch[] = [];
    let current = 0;

    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];
      while (current !== 0 && !this.nodes[current].next.has(ch)) {
        current = this.nodes[current].fail;
      }
      current = this.nodes[current].next.get(ch) ?? 0;
      for (const patternIndex of this.nodes[current].out) {
        const start = i - this.patterns[patternIndex].length + 1;
        if (isWordChar(lower[start - 1]) || isWordChar(lower[i + 1])) continue;
        matches.push({ patternIndex, start, end: i + 1 });
      }
    }

    return matches;
  }
}
