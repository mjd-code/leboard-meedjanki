/**
 * A tab group: the tab strip plus the active leaf's view.
 * Tabs can be dragged to reorder, moved to another group, or dropped on the
 * edges of the content area to create a split.
 */

import { useState } from 'react';
import { cn } from '@/shared/lib';
import { X, Pin, SplitSquareHorizontal, SplitSquareVertical, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { LeafView } from './ViewRegistry';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import type { WorkspaceGroup } from './store/types';

type Edge = 'left' | 'right' | 'top' | 'bottom' | null;

const DRAG_KEY = 'application/x-workspace-leaf';

export function Group({ group, isActive }: { group: WorkspaceGroup; isActive: boolean }) {
  const {
    setActiveLeaf,
    setActiveGroup,
    closeLeaf,
    togglePin,
    splitGroup,
    moveLeaf,
    moveLeafToNewSplit,
    openView,
  } = useWorkspaceStore();

  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [edge, setEdge] = useState<Edge>(null);

  const activeLeaf = group.leaves.find((l) => l.id === group.activeLeafId) ?? group.leaves[0] ?? null;

  const readLeafId = (e: React.DragEvent) =>
    e.dataTransfer.getData(DRAG_KEY) || e.dataTransfer.getData('text/plain');

  const edgeFromEvent = (e: React.DragEvent<HTMLDivElement>): Edge => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0.2) return 'left';
    if (x > 0.8) return 'right';
    if (y < 0.2) return 'top';
    if (y > 0.8) return 'bottom';
    return null;
  };

  return (
    <div
      className={cn(
        'flex flex-col min-w-0 min-h-0 h-full bg-background',
        isActive && 'ring-1 ring-inset ring-sidebar-ring/40'
      )}
      onMouseDown={() => !isActive && setActiveGroup(group.id)}
    >
      {/* Tab strip */}
      <div className="h-9 flex items-stretch border-b border-border bg-muted/30 overflow-x-auto">
        {group.leaves.map((leaf, index) => (
          <div
            key={leaf.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_KEY, leaf.id);
              e.dataTransfer.setData('text/plain', leaf.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropIndex(index);
            }}
            onDragLeave={() => setDropIndex((i) => (i === index ? null : i))}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const id = readLeafId(e);
              setDropIndex(null);
              if (id) moveLeaf(id, group.id, index);
            }}
            onClick={() => setActiveLeaf(group.id, leaf.id)}
            onDoubleClick={() => togglePin(leaf.id)}
            className={cn(
              'group relative flex items-center gap-2 px-3 text-xs cursor-pointer select-none whitespace-nowrap border-r border-border',
              leaf.id === activeLeaf?.id
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:bg-accent/50',
              dropIndex === index && 'border-l-2 border-l-primary'
            )}
            title={leaf.view.title}
          >
            {leaf.pinned && <Pin className="w-3 h-3 shrink-0" />}
            <span className="max-w-[12rem] truncate">{leaf.view.title}</span>
            {!leaf.pinned && (
              <button
                aria-label={`Close ${leaf.view.title}`}
                className="opacity-0 group-hover:opacity-100 hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  closeLeaf(leaf.id);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        <div
          className="flex-1 min-w-8"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = readLeafId(e);
            if (id) moveLeaf(id, group.id);
          }}
        />

        <div className="flex items-center gap-0.5 px-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="New tab"
            onClick={() => {
              setActiveGroup(group.id);
              openView({ type: 'empty', title: 'New tab' });
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Split right"
            onClick={() => splitGroup(group.id, 'horizontal')}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Split down"
            onClick={() => splitGroup(group.id, 'vertical')}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          setEdge(edgeFromEvent(e));
        }}
        onDragLeave={() => setEdge(null)}
        onDrop={(e) => {
          e.preventDefault();
          const id = readLeafId(e);
          const where = edgeFromEvent(e);
          setEdge(null);
          if (!id) return;
          if (!where) {
            moveLeaf(id, group.id);
            return;
          }
          moveLeafToNewSplit(
            id,
            group.id,
            where === 'left' || where === 'right' ? 'horizontal' : 'vertical',
            where === 'left' || where === 'top'
          );
        }}
      >
        {activeLeaf ? <LeafView leaf={activeLeaf} /> : null}

        {edge && (
          <div
            className={cn(
              'pointer-events-none absolute bg-primary/20 border border-primary',
              edge === 'left' && 'inset-y-0 left-0 w-1/2',
              edge === 'right' && 'inset-y-0 right-0 w-1/2',
              edge === 'top' && 'inset-x-0 top-0 h-1/2',
              edge === 'bottom' && 'inset-x-0 bottom-0 h-1/2'
            )}
          />
        )}
      </div>
    </div>
  );
}
