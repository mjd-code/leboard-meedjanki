'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Bold, Italic, Strikethrough, Link as LinkIcon, Code, Heading1, Heading2 } from 'lucide-react';
import { useEffect } from 'react';
import { AccordionBlock, TabsBlock, ImageCarouselBlock, QuoteCarouselBlock } from './editor/blockNodes';
import { ToggleBlock } from './editor/toggleNode';
import { VideoBlock, BookmarkBlock, FileAttachmentBlock } from './editor/mediaNodes';
import { SlashCommand } from './editor/slashCommand';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

const CenteredImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: 'mx-auto rounded-lg shadow-sm border border-border object-cover max-w-full',
      },
    };
  },
});

export function TiptapEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
      Typography,
      CenteredImage,
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'paragraph' ? "Tulis sesuatu, atau ketik '/' untuk perintah..." : '',
      }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'prose-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      AccordionBlock,
      TabsBlock,
      ImageCarouselBlock,
      QuoteCarouselBlock,
      ToggleBlock,
      VideoBlock,
      BookmarkBlock,
      FileAttachmentBlock,
      SlashCommand,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      try {
        localStorage.setItem('ppmh_insight_draft', editor.getHTML());
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          console.warn('Local storage quota exceeded.');
        }
      }
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-8 bg-background text-foreground rounded-xl border border-border prose-headings:font-display prose-headings:font-bold prose-a:text-primary prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:italic prose-img:rounded-lg prose-img:mx-auto',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL Tautan:', prev || '');
    if (url === null) return;
    if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btn = (active: boolean) =>
    'inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ' +
    (active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent');

  return (
    <div className="flex flex-col w-full relative">
      <BubbleMenu
        editor={editor}
        options={{ placement: 'top' }}
        className="flex items-center gap-0.5 p-1 bg-popover border border-border rounded-xl shadow-2xl"
      >
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))} aria-label="Heading 1">
          <Heading1 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} aria-label="Heading 2">
          <Heading2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-border mx-0.5" />
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} aria-label="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} aria-label="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} aria-label="Strike">
          <Strikethrough className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} aria-label="Inline code">
          <Code className="w-4 h-4" />
        </button>
        <button type="button" onClick={setLink} className={btn(editor.isActive('link'))} aria-label="Link">
          <LinkIcon className="w-4 h-4" />
        </button>
      </BubbleMenu>

      {editor.isActive('table') && (
        <div className="flex flex-wrap items-center gap-1 p-1.5 mb-2 bg-muted/60 border border-border rounded-xl text-xs">
          <span className="px-2 text-muted-foreground font-semibold">Table:</span>
          <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-1 rounded hover:bg-accent">+ Col Before</button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 rounded hover:bg-accent">+ Col After</button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 rounded hover:bg-accent">– Col</button>
          <div className="w-px h-4 bg-border mx-1" />
          <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-1 rounded hover:bg-accent">+ Row Before</button>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 rounded hover:bg-accent">+ Row After</button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 rounded hover:bg-accent">– Row</button>
          <div className="w-px h-4 bg-border mx-1" />
          <button type="button" onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="px-2 py-1 rounded hover:bg-accent">Header Row</button>
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="ml-auto px-2 py-1 rounded text-destructive hover:bg-destructive/10">Delete Table</button>
        </div>
      )}

      <EditorContent editor={editor} className="flex-1" />
    </div>
  );
}
