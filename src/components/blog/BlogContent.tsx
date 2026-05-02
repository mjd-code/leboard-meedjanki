'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronDown, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

/* ---------- Block components ---------- */

function AccordionBlock({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="my-8 not-prose space-y-2">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 p-4 text-left font-display font-bold text-card-foreground hover:bg-muted/40 transition-colors"
              aria-expanded={isOpen}
            >
              <span>{it.title}</span>
              <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-foreground/85 font-serif-body leading-relaxed whitespace-pre-line">
                {it.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabsBlock({ items }: { items: { label: string; body: string }[] }) {
  const [active, setActive] = React.useState(0);
  const cur = Math.min(active, Math.max(0, items.length - 1));
  return (
    <div className="my-8 not-prose">
      <div className="flex flex-wrap gap-1 border-b border-border mb-4 overflow-x-auto">
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={
              'px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[1px] ' +
              (i === cur
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground')
            }
            aria-selected={i === cur}
            role="tab"
          >
            {it.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      <div className="text-foreground/85 font-serif-body leading-relaxed whitespace-pre-line" role="tabpanel">
        {items[cur]?.body}
      </div>
    </div>
  );
}

function SimpleTableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-8 not-prose overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left p-3 font-display font-bold text-foreground border-b border-border whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/30">
              {headers.map((_, ci) => (
                <td key={ci} className="p-3 text-foreground/85 align-top">
                  {r[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImageCarouselBlock({ items }: { items: { src: string; alt?: string; caption?: string }[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selected, setSelected] = React.useState(0);
  const scrollTo = React.useCallback((i: number) => embla?.scrollTo(i), [embla]);

  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();
    return () => { embla.off('select', onSelect); };
  }, [embla]);

  if (!items.length) return null;

  return (
    <div className="my-10 not-prose">
      <div className="relative rounded-xl overflow-hidden bg-muted">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {items.map((it, i) => (
              <div key={i} className="min-w-0 flex-[0_0_100%]">
                <div className="relative w-full aspect-[16/9] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.src} alt={it.alt || ''} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                </div>
                {it.caption && (
                  <div className="px-4 py-3 text-sm italic text-center text-muted-foreground font-serif-body bg-card">
                    {it.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={
                'h-2 rounded-full transition-all ' +
                (i === selected ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60')
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuoteCarouselBlock({ items }: { items: { quote: string; attribution?: string }[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();
    return () => { embla.off('select', onSelect); };
  }, [embla]);

  if (!items.length) return null;

  return (
    <div className="my-10 not-prose">
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {items.map((it, i) => (
              <div key={i} className="min-w-0 flex-[0_0_100%]">
                <figure className="px-8 py-10 md:px-14 md:py-14 text-center">
                  <Quote className="w-8 h-8 text-primary mx-auto mb-4" aria-hidden />
                  <blockquote className="font-display italic text-xl md:text-2xl leading-relaxed text-foreground">
                    “{it.quote}”
                  </blockquote>
                  {it.attribution && (
                    <figcaption className="mt-5 text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                      — {it.attribution}
                    </figcaption>
                  )}
                </figure>
              </div>
            ))}
          </div>
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((_, i) => (
            <span
              key={i}
              className={
                'h-2 rounded-full transition-all ' +
                (i === selected ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40')
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Parser: split HTML into HTML chunks + block descriptors ---------- */

type Chunk =
  | { type: 'html'; html: string }
  | { type: 'accordion'; items: { title: string; body: string }[] }
  | { type: 'tabs'; items: { label: string; body: string }[] }
  | { type: 'simple-table'; headers: string[]; rows: string[][] }
  | { type: 'image-carousel'; items: { src: string; alt?: string; caption?: string }[] }
  | { type: 'quote-carousel'; items: { quote: string; attribution?: string }[] };

function parseContent(html: string): Chunk[] {
  if (typeof window === 'undefined') {
    // Server-side: just render raw HTML; client will hydrate blocks.
    return [{ type: 'html', html }];
  }
  const container = document.createElement('div');
  container.innerHTML = html;

  const chunks: Chunk[] = [];
  let buffer = '';
  const flush = () => { if (buffer.trim()) { chunks.push({ type: 'html', html: buffer }); } buffer = ''; };

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      const block = el.getAttribute?.('data-block');
      if (block) {
        flush();
        try {
          if (block === 'accordion') chunks.push({ type: 'accordion', items: JSON.parse(el.getAttribute('data-items') || '[]') });
          else if (block === 'tabs') chunks.push({ type: 'tabs', items: JSON.parse(el.getAttribute('data-items') || '[]') });
          else if (block === 'simple-table') chunks.push({
            type: 'simple-table',
            headers: JSON.parse(el.getAttribute('data-headers') || '[]'),
            rows: JSON.parse(el.getAttribute('data-rows') || '[]'),
          });
          else if (block === 'image-carousel') chunks.push({ type: 'image-carousel', items: JSON.parse(el.getAttribute('data-items') || '[]') });
          else if (block === 'quote-carousel') chunks.push({ type: 'quote-carousel', items: JSON.parse(el.getAttribute('data-items') || '[]') });
        } catch {
          // ignore malformed
        }
        return;
      }
    }
    buffer += (node as HTMLElement).outerHTML ?? node.textContent ?? '';
  });
  flush();
  return chunks;
}

export function BlogContent({ html, className }: { html: string; className?: string }) {
  const [chunks, setChunks] = React.useState<Chunk[]>(() => [{ type: 'html', html }]);

  React.useEffect(() => {
    setChunks(parseContent(html));
  }, [html]);

  return (
    <div className={className}>
      {chunks.map((c, i) => {
        switch (c.type) {
          case 'html':
            return <div key={i} dangerouslySetInnerHTML={{ __html: c.html }} />;
          case 'accordion':
            return <AccordionBlock key={i} items={c.items} />;
          case 'tabs':
            return <TabsBlock key={i} items={c.items} />;
          case 'simple-table':
            return <SimpleTableBlock key={i} headers={c.headers} rows={c.rows} />;
          case 'image-carousel':
            return <ImageCarouselBlock key={i} items={c.items} />;
          case 'quote-carousel':
            return <QuoteCarouselBlock key={i} items={c.items} />;
        }
      })}
    </div>
  );
}