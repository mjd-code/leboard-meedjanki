import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { ChevronDown, Plus, Trash2, GripVertical, Image as ImageIcon, Quote, Loader2, Upload } from 'lucide-react';
import { ImageUploader } from '../../ui/ImageUploader';
import { toast } from 'sonner';
import { batchUploadImages } from '@/lib/uploadImage';

/* =====================================================================
 * Shared helpers
 * =====================================================================*/

function TextField({
  value,
  onChange,
  placeholder,
  className = '',
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        'w-full bg-background text-foreground placeholder:text-muted-foreground border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ' +
        className
      }
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-background text-foreground placeholder:text-muted-foreground border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
    />
  );
}

function BlockShell({
  label,
  onDelete,
  children,
}: { label: string; onDelete: () => void; children: React.ReactNode }) {
  return (
    <NodeViewWrapper className="group/block relative my-4 flex items-start gap-1">
      <div
        contentEditable={false}
        data-drag-handle
        className="node-drag-handle mt-3 shrink-0 w-5 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/60 border-b border-border">
          <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
            {label}
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
            aria-label="Hapus blok"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </NodeViewWrapper>
  );
}

/* =====================================================================
 * Accordion
 * =====================================================================*/

type AccordionItem = { title: string; body: string };

const AccordionView = React.memo(function AccordionView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  let items: AccordionItem[] = [];
  try {
    items = Array.isArray(node.attrs.items) 
      ? node.attrs.items 
      : (typeof node.attrs.items === 'string' ? JSON.parse(node.attrs.items) : []);
  } catch (e) { items = []; }
  if (!Array.isArray(items)) items = [];
  const update = (next: AccordionItem[]) => updateAttributes({ items: next });

  return (
    <BlockShell label="Accordion" onDelete={deleteNode}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-md border border-border p-2 space-y-2 bg-background">
            <div className="flex items-center gap-2">
              <TextField
                value={it.title}
                onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, title: v } : x)))}
                placeholder="Judul item..."
              />
              <button
                type="button"
                onClick={() => update(items.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Hapus item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <TextArea
              value={it.body}
              onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, body: v } : x)))}
              placeholder="Isi item..."
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => update([...items, { title: 'Item baru', body: '' }])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Item
        </button>
      </div>
    </BlockShell>
  );
});

export const AccordionBlock = Node.create({
  name: 'accordionBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { items: { default: [{ title: 'Pertanyaan', body: 'Jawaban...' }] } };
  },
  parseHTML() {
    return [{
      tag: 'div[data-block="accordion"]',
      getAttrs: (el) => {
        try { return { items: JSON.parse((el as HTMLElement).getAttribute('data-items') || '[]') }; }
        catch { return { items: [] }; }
      },
    }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-block': 'accordion',
      'data-items': JSON.stringify(node.attrs.items || []),
    })];
  },
  addNodeView() { return ReactNodeViewRenderer(AccordionView); },
});

/* =====================================================================
 * Tabs
 * =====================================================================*/

type TabItem = { label: string; body: string };

const TabsView = React.memo(function TabsView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  let items: TabItem[] = [];
  try {
    items = Array.isArray(node.attrs.items) 
      ? node.attrs.items 
      : (typeof node.attrs.items === 'string' ? JSON.parse(node.attrs.items) : []);
  } catch (e) { items = []; }
  if (!Array.isArray(items)) items = [];
  const [active, setActive] = React.useState(0);
  const update = (next: TabItem[]) => updateAttributes({ items: next });
  const cur = Math.min(active, Math.max(0, items.length - 1));

  return (
    <BlockShell label="Tabs" onDelete={deleteNode}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 border-b border-border pb-2">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={
                'px-3 py-1 text-xs rounded-md font-semibold transition-colors ' +
                (i === cur
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70')
              }
            >
              {it.label || `Tab ${i + 1}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { update([...items, { label: `Tab ${items.length + 1}`, body: '' }]); setActive(items.length); }}
            className="px-2 py-1 text-xs rounded-md text-primary hover:bg-primary/10"
            aria-label="Tambah tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {items[cur] && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TextField
                value={items[cur].label}
                onChange={(v) => update(items.map((x, j) => (j === cur ? { ...x, label: v } : x)))}
                placeholder="Label tab..."
              />
              <button
                type="button"
                onClick={() => { update(items.filter((_, j) => j !== cur)); setActive(0); }}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Hapus tab"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <TextArea
              value={items[cur].body}
              onChange={(v) => update(items.map((x, j) => (j === cur ? { ...x, body: v } : x)))}
              placeholder="Konten tab..."
              rows={5}
            />
          </div>
        )}
      </div>
    </BlockShell>
  );
});

export const TabsBlock = Node.create({
  name: 'tabsBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { items: { default: [{ label: 'Tab 1', body: '' }, { label: 'Tab 2', body: '' }] } };
  },
  parseHTML() {
    return [{
      tag: 'div[data-block="tabs"]',
      getAttrs: (el) => {
        try { return { items: JSON.parse((el as HTMLElement).getAttribute('data-items') || '[]') }; }
        catch { return { items: [] }; }
      },
    }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-block': 'tabs',
      'data-items': JSON.stringify(node.attrs.items || []),
    })];
  },
  addNodeView() { return ReactNodeViewRenderer(TabsView); },
});

/* =====================================================================
 * Simple Table
 * =====================================================================*/

const SimpleTableView = React.memo(function SimpleTableView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const headers: string[] = node.attrs.headers || [];
  const rows: string[][] = node.attrs.rows || [];

  const setHeaders = (next: string[]) => updateAttributes({ headers: next });
  const setRows = (next: string[][]) => updateAttributes({ rows: next });

  const addCol = () => {
    setHeaders([...headers, `Kolom ${headers.length + 1}`]);
    setRows(rows.map((r) => [...r, '']));
  };
  const removeCol = (idx: number) => {
    setHeaders(headers.filter((_, i) => i !== idx));
    setRows(rows.map((r) => r.filter((_, i) => i !== idx)));
  };
  const addRow = () => setRows([...rows, headers.map(() => '')]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  return (
    <BlockShell label="Simple Table" onDelete={deleteNode}>
      <div className="space-y-2">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="p-1 border-b border-border min-w-[140px]">
                    <div className="flex items-center gap-1">
                      <TextField
                        value={h}
                        onChange={(v) => setHeaders(headers.map((x, j) => (j === i ? v : x)))}
                        placeholder={`Kolom ${i + 1}`}
                      />
                      <button type="button" onClick={() => removeCol(i)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Hapus kolom">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="p-1 border-b border-border w-10">
                  <button type="button" onClick={addCol} className="text-primary hover:bg-primary/10 rounded p-1" aria-label="Tambah kolom">
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-border last:border-0">
                  {headers.map((_, ci) => (
                    <td key={ci} className="p-1 align-top">
                      <TextField
                        value={r[ci] ?? ''}
                        onChange={(v) => setRows(rows.map((row, j) => j === ri ? row.map((c, k) => k === ci ? v : c) : row))}
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center align-middle">
                    <button type="button" onClick={() => removeRow(ri)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Hapus baris">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Baris
        </button>
      </div>
    </BlockShell>
  );
});

export const SimpleTableBlock = Node.create({
  name: 'simpleTableBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      headers: { default: ['Kolom 1', 'Kolom 2'] },
      rows: { default: [['', ''], ['', '']] },
    };
  },
  parseHTML() {
    return [{
      tag: 'div[data-block="simple-table"]',
      getAttrs: (el) => {
        try {
          return {
            headers: JSON.parse((el as HTMLElement).getAttribute('data-headers') || '[]'),
            rows: JSON.parse((el as HTMLElement).getAttribute('data-rows') || '[]'),
          };
        } catch { return { headers: [], rows: [] }; }
      },
    }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-block': 'simple-table',
      'data-headers': JSON.stringify(node.attrs.headers || []),
      'data-rows': JSON.stringify(node.attrs.rows || []),
    })];
  },
  addNodeView() { return ReactNodeViewRenderer(SimpleTableView); },
});

/* =====================================================================
 * Image Carousel
 * =====================================================================*/

type ImgItem = { src: string; alt?: string; caption?: string };

const ImageCarouselView = React.memo(function ImageCarouselView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  let items: ImgItem[] = [];
  try {
    items = Array.isArray(node.attrs.items) 
      ? node.attrs.items 
      : (typeof node.attrs.items === 'string' ? JSON.parse(node.attrs.items) : []);
  } catch (e) { items = []; }
  if (!Array.isArray(items)) items = [];
  const update = (next: ImgItem[]) => updateAttributes({ items: next });

  // Use ImageUploader directly in the render
  const onUpload = async (i: number, url: string) => {
    update(items.map((x, j) => (j === i ? { ...x, src: url } : x)));
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const tid = toast.loading('Memulai upload batch...');
    try {
      const urls = await batchUploadImages(files, 'post_images', tid);
      const newItems = urls.map(url => ({ src: url, alt: '', caption: '' }));
      update([...items, ...newItems]);
    } catch(err) {
      console.error(err);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <BlockShell label="Carousel Gambar" onDelete={deleteNode}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-md border border-border p-2 space-y-2 bg-background">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <TextField
                value={it.src}
                onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, src: v } : x)))}
                placeholder="URL gambar..."
              />
              <ImageUploader 
                folder="post_images" 
                maxResolution={1200}
                onUploadSuccess={(url) => onUpload(i, url)} 
                trigger={<span className="text-xs text-primary cursor-pointer hover:underline shrink-0">Upload Individual</span>}
              />
              <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-1" aria-label="Hapus">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <TextField
              value={it.alt || ''}
              onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, alt: v } : x)))}
              placeholder="Alt text (aksesibilitas)..."
            />
            <TextField
              value={it.caption || ''}
              onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, caption: v } : x)))}
              placeholder="Caption (opsional)..."
            />
            {it.src && (
              <div className="relative w-full aspect-video bg-muted rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.src} alt={it.alt || ''} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-4 pt-2">
          <button
            type="button"
            onClick={() => update([...items, { src: '', alt: '', caption: '' }])}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Manual
          </button>
          
          <label className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline cursor-pointer transition-colors bg-emerald-50 px-2 py-1.5 rounded disabled:opacity-50">
            <Upload className="w-3.5 h-3.5" /> Bulk Upload (Maks 20 / Limit Firestore)
            <input type="file" multiple accept="image/*" onChange={handleBulkUpload} className="hidden" />
          </label>
        </div>
      </div>
    </BlockShell>
  );
});

export const ImageCarouselBlock = Node.create({
  name: 'imageCarouselBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { items: { default: [] as ImgItem[] } };
  },
  parseHTML() {
    return [{
      tag: 'div[data-block="image-carousel"]',
      getAttrs: (el) => {
        try { return { items: JSON.parse((el as HTMLElement).getAttribute('data-items') || '[]') }; }
        catch { return { items: [] }; }
      },
    }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-block': 'image-carousel',
      'data-items': JSON.stringify(node.attrs.items || []),
    })];
  },
  addNodeView() { return ReactNodeViewRenderer(ImageCarouselView); },
});

/* =====================================================================
 * Quote Carousel
 * =====================================================================*/

type QuoteItem = { quote: string; attribution?: string };

const QuoteCarouselView = React.memo(function QuoteCarouselView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  let items: QuoteItem[] = [];
  try {
    items = Array.isArray(node.attrs.items) 
      ? node.attrs.items 
      : (typeof node.attrs.items === 'string' ? JSON.parse(node.attrs.items) : []);
  } catch (e) { items = []; }
  if (!Array.isArray(items)) items = [];
  const update = (next: QuoteItem[]) => updateAttributes({ items: next });

  return (
    <BlockShell label="Carousel Kutipan" onDelete={deleteNode}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-md border border-border p-2 space-y-2 bg-background">
            <div className="flex items-start gap-2">
              <Quote className="w-4 h-4 text-primary mt-1 shrink-0" />
              <div className="flex-1 space-y-2">
                <TextArea
                  value={it.quote}
                  onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, quote: v } : x)))}
                  placeholder="Kutipan..."
                />
                <TextField
                  value={it.attribution || ''}
                  onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, attribution: v } : x)))}
                  placeholder="Atribusi (nama, jabatan)..."
                />
              </div>
              <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-1" aria-label="Hapus">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => update([...items, { quote: '', attribution: '' }])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Kutipan
        </button>
      </div>
    </BlockShell>
  );
});

export const QuoteCarouselBlock = Node.create({
  name: 'quoteCarouselBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { items: { default: [] as QuoteItem[] } };
  },
  parseHTML() {
    return [{
      tag: 'div[data-block="quote-carousel"]',
      getAttrs: (el) => {
        try { return { items: JSON.parse((el as HTMLElement).getAttribute('data-items') || '[]') }; }
        catch { return { items: [] }; }
      },
    }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-block': 'quote-carousel',
      'data-items': JSON.stringify(node.attrs.items || []),
    })];
  },
  addNodeView() { return ReactNodeViewRenderer(QuoteCarouselView); },
});

// Re-export icon for convenience in toolbar
export { ChevronDown };