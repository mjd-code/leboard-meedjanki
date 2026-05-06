import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { ReactRenderer } from '@tiptap/react';
import { Extension, Editor, Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2, ChevronRight,
  Image as ImageIcon, Video, Link2, FileText, Table as TableIcon, GalleryHorizontal,
  MessageSquareQuote, LayoutGrid, ChevronDown, Type, Minus,
} from 'lucide-react';

export type SlashItem = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  command: (props: { editor: Editor; range: Range }) => void;
};

const ITEMS: SlashItem[] = [
  {
    title: 'Text', description: 'Just start writing plain text.', icon: Type, keywords: ['paragraph', 'p'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'Heading 1', description: 'Big section heading.', icon: Heading1, keywords: ['h1', 'title'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2', description: 'Medium section heading.', icon: Heading2, keywords: ['h2'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3', description: 'Small section heading.', icon: Heading3, keywords: ['h3'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bulleted List', description: 'Simple bullet list.', icon: List, keywords: ['ul', 'unordered'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered List', description: 'Ordered list.', icon: ListOrdered, keywords: ['ol', 'ordered'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Quote', description: 'Capture a quote.', icon: Quote, keywords: ['blockquote'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code Block', description: 'Syntax-highlighted code.', icon: Code2, keywords: ['code', 'pre'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Divider', description: 'Horizontal separator.', icon: Minus, keywords: ['hr', 'rule'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Toggle', description: 'Collapsible block.', icon: ChevronRight, keywords: ['collapse', 'fold'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'toggleBlock',
        attrs: { open: true },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Toggle title' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Hidden content...' }] },
        ],
      }).run(),
  },
  {
    title: 'Table', description: 'Insert a table.', icon: TableIcon, keywords: ['grid'],
    command: ({ editor, range }) =>
      (editor.chain().focus().deleteRange(range) as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image', description: 'Upload or embed an image.', icon: ImageIcon, keywords: ['picture', 'photo'],
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL:');
      const chain = editor.chain().focus().deleteRange(range);
      if (url) chain.setImage({ src: url }).run(); else chain.run();
    },
  },
  {
    title: 'Video', description: 'YouTube, Vimeo, or .mp4.', icon: Video, keywords: ['youtube', 'vimeo', 'mp4'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'videoBlock' }).run(),
  },
  {
    title: 'Bookmark', description: 'Web link preview card.', icon: Link2, keywords: ['link', 'preview'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'bookmarkBlock' }).run(),
  },
  {
    title: 'File', description: 'PDF / file attachment.', icon: FileText, keywords: ['pdf', 'attachment', 'document'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'fileAttachmentBlock' }).run(),
  },
  {
    title: 'Image Carousel', description: 'Multiple images slideshow.', icon: GalleryHorizontal, keywords: ['gallery', 'slideshow'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'imageCarouselBlock' }).run(),
  },
  {
    title: 'Quote Carousel', description: 'Slideshow of quotes.', icon: MessageSquareQuote, keywords: ['testimonial'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'quoteCarouselBlock' }).run(),
  },
  {
    title: 'Accordion', description: 'Expandable Q&A list.', icon: ChevronDown, keywords: ['faq', 'expand'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'accordionBlock' }).run(),
  },
  {
    title: 'Tabs', description: 'Tabbed content.', icon: LayoutGrid, keywords: ['tab'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: 'tabsBlock' }).run(),
  },
];

type SlashListProps = {
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

const SlashList = forwardRef<{ onKeyDown: (e: { event: KeyboardEvent }) => boolean }, SlashListProps>(
  function SlashList({ items, command }, ref) {
    const [selected, setSelected] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => setSelected(0), [items]);
    useEffect(() => {
      const el = containerRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelected((s) => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selected];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="px-3 py-2 text-xs text-muted-foreground bg-popover border border-border rounded-xl shadow-lg">
          No matches
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="w-72 max-h-80 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl p-1"
      >
        {items.map((it, idx) => {
          const Icon = it.icon;
          const active = idx === selected;
          return (
            <button
              key={it.title}
              data-idx={idx}
              type="button"
              onMouseEnter={() => setSelected(idx)}
              onClick={() => command(it)}
              className={
                'w-full flex items-start gap-3 text-left px-2 py-1.5 rounded-lg transition-colors ' +
                (active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60')
              }
            >
              <div className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md border border-border bg-background">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{it.title}</div>
                <div className="text-xs text-muted-foreground truncate">{it.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase().trim();
          if (!q) return ITEMS;
          return ITEMS.filter((it) => {
            const hay = (it.title + ' ' + (it.keywords || []).join(' ')).toLowerCase();
            return hay.includes(q);
          }).slice(0, 12);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashList, { props, editor: props.editor });
              if (!props.clientRect) return;
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'transparent',
                offset: [0, 8],
              });
            },
            onUpdate: (props: any) => {
              component?.updateProps(props);
              if (!props.clientRect) return;
              popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }
              return (component?.ref as any)?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
