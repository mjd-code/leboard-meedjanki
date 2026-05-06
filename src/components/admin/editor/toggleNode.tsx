import React from 'react';
import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  NodeViewProps,
} from '@tiptap/react';
import { ChevronRight, GripVertical } from 'lucide-react';

/**
 * Notion-like Toggle Block — infinitely nestable.
 *
 * Schema:
 *   - summary: inline text (always visible — the toggle title)
 *   - body:    block+    (paragraphs, images, code, OR more toggleBlocks)
 *
 * Serialized HTML (for the public renderer):
 *   <details data-block="toggle" [open]>
 *     <summary>...title...</summary>
 *     <div data-toggle-body> ...children... </div>
 *   </details>
 */

const ToggleView = React.memo(function ToggleView({ node, updateAttributes }: NodeViewProps) {
  const open = node.attrs.open !== false;

  // CRITICAL: ProseMirror intercepts mousedown on draggable NodeViews to start
  // a drag/selection. We must short-circuit it BEFORE click bubbles, otherwise
  // the chevron looks "dead" inside the editor.
  const toggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateAttributes({ open: !node.attrs.open });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-block="toggle"
      data-open={open ? 'true' : 'false'}
      className="toggle-block group/block relative my-1.5 flex items-start gap-1"
    >
      <div
        contentEditable={false}
        draggable
        data-drag-handle
        className="node-drag-handle mt-[0.35rem] shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="flex items-start gap-1 flex-1 min-w-0">
        <button
          type="button"
          contentEditable={false}
          // preventDefault on mousedown stops PM from claiming the event
          onMouseDown={toggle}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="mt-[0.35rem] shrink-0 w-5 h-5 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label={open ? 'Tutup toggle' : 'Buka toggle'}
          aria-expanded={open}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
        </button>
        {/* ALWAYS mount NodeViewContent — never unmount, just hide. Unmounting
            destroys the AST children and breaks ProseMirror selection. */}
        <NodeViewContent
          data-toggle-open={open ? 'true' : 'false'}
          className={
            'toggle-content flex-1 min-w-0 pl-1 [&>*:first-child]:!block ' +
            (open ? 'block' : '[&>*:not(:first-child)]:hidden')
          }
        />
      </div>
    </NodeViewWrapper>
  );
});

export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  // The first child is the title (a paragraph), then any blocks (incl. more toggles)
  content: 'paragraph block*',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => (el as HTMLElement).hasAttribute('open'),
        renderHTML: (attrs) => (attrs.open ? { open: '' } : {}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'details[data-block="toggle"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Render as <details> for SEO-friendly, JS-free fallback.
    // Public renderer will replace with a beautiful React component.
    return [
      'details',
      mergeAttributes(HTMLAttributes, { 'data-block': 'toggle' }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addInputRules() {
    // ">> " at the start of a line creates a toggle block
    return [
      textblockTypeInputRule({
        find: /^>>\s$/,
        type: this.type,
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-t': () =>
        this.editor.chain().focus().wrapIn(this.name).run(),
    };
  },
});
