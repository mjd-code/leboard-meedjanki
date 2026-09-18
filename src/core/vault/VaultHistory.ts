/**
 * VaultHistory - Per-Vault History Management
 * 
 * Maintains separate undo/redo stacks for each vault
 */

interface HistoryState {
  nodes: any[];
  links: any[];
  timestamp: number;
}

export class VaultHistory {
  private past: HistoryState[] = [];
  private future: HistoryState[] = [];
  private maxHistorySize = 50;

  addState(nodes: any[], links: any[]): void {
    this.past.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(links)),
      timestamp: Date.now(),
    });

    // Clear future when new state is added
    this.future = [];

    // Limit history size
    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }
  }

  undo(): HistoryState | null {
    if (this.past.length === 0) return null;

    const currentState = this.past.pop()!;
    this.future.push(currentState);

    return this.past[this.past.length - 1] || null;
  }

  redo(): HistoryState | null {
    if (this.future.length === 0) return null;

    const nextState = this.future.pop()!;
    this.past.push(nextState);

    return nextState;
  }

  canUndo(): boolean {
    return this.past.length > 1;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  getState(): { past: HistoryState[]; future: HistoryState[] } {
    return {
      past: this.past,
      future: this.future,
    };
  }

  setState(state: { past: HistoryState[]; future: HistoryState[] }): void {
    this.past = state.past;
    this.future = state.future;
  }
}
