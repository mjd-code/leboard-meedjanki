'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronDown, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

/* ---------- Block components ---------- */

function AccordionBlock({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="my-10 not-prose space-y-px">
      <div className="border-t border-border/50"></div>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="border-b border-border/50 bg-transparent group">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left font-display font-medium text-foreground hover:text-primary transition-colors focus:outline-none"
              aria-expanded={isOpen}
            >
              <span className="text-lg md:text-xl tracking-tight">{it.title}</span>
              <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out group-hover:text-primary ${isOpen ? 'rotate-180 text-primary' : ''}`} />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-[1000px] opacity-100 pb-6' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pl-4 border-l-2 border-primary/20 text-foreground/85 font-serif-body leading-relaxed whitespace-pre-line text-base md:text-lg">
                {it.body}
              </div>
            </div>
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
    <div className="my-10 not-prose">
      <div className="relative border-b border-border/40">
        <div className="flex overflow-x-auto hide-scrollbar scroll-smooth space-x-6 pb-[2px]">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={
                'py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-[2px] ' +
                (i === cur
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border')
              }
              aria-selected={i === cur}
              role="tab"
            >
              {it.label || `Tab ${i + 1}`}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 text-foreground/85 font-serif-body leading-relaxed whitespace-pre-line text-lg animate-in fade-in duration-500" role="tabpanel">
        {items[cur]?.body}
      </div>
    </div>
  );
}

function SimpleTableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-10 not-prose relative">
      <div className="overflow-x-auto border-y border-border/40 pb-1">
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="py-4 px-4 font-display font-semibold text-foreground uppercase tracking-wider text-xs border-b border-border/60 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-muted/30 transition-colors group">
                {headers.map((_, ci) => (
                  <td key={ci} className="py-3 px-4 font-serif-body text-foreground/80 align-top group-hover:text-foreground transition-colors">
                    {r[ci] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Scroll indicator for mobile */}
      <div className="text-right mt-2 md:hidden">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none bg-muted/50 px-2 py-1 rounded inline-flex items-center gap-1">
          <ChevronRight className="w-3 h-3" /> Geser
        </span>
      </div>
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
    <div className="my-12 not-prose relative full-bleed max-w-[100vw]">
      <div className="max-w-7xl mx-auto md:px-6">
        <div className="relative group/carousel">
          <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
            <div className="flex">
              {items.map((it, i) => (
                <div key={i} className="min-w-0 flex-[0_0_100%] md:flex-[0_0_80%] md:pr-4 first:pl-4 md:first:pl-0">
                  <figure className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-muted/20 overflow-hidden md:rounded-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.src} alt={it.alt || ''} className="absolute inset-0 w-full h-full object-cover select-none transition-transform duration-700 ease-in-out hover:scale-[1.02]" loading="lazy" />
                  </figure>
                  {it.caption && (
                    <figcaption className="md:px-0 py-3 text-xs md:text-sm text-muted-foreground font-serif-body px-4 border-l border-primary/20 ml-4 md:ml-0 mt-2">
                      {it.caption}
                    </figcaption>
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
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background text-foreground p-3 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity border border-border md:flex hidden hover:scale-105 active:scale-95"
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => embla?.scrollNext()}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background text-foreground p-3 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity border border-border md:flex hidden hover:scale-105 active:scale-95"
                aria-label="Berikutnya"
              >
                <ChevronRight className="w-5 h-5 stroke-[1.5]" />
              </button>
            </>
          )}
        </div>
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-6">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Slide ${i + 1}`}
                className={
                  'h-1 rounded-full transition-all duration-300 ' +
                  (i === selected ? 'w-8 bg-primary' : 'w-2 bg-border hover:bg-muted-foreground')
                }
              />
            ))}
          </div>
        )}
      </div>
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
    <div className="my-14 not-prose relative">
      <div className="absolute inset-y-0 left-0 outline outline-[1px] outline-primary/10 bg-primary/5 w-[1px]"></div>
      <div className="py-6 md:py-10 pl-6 md:pl-12">
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex">
            {items.map((it, i) => (
              <div key={i} className="min-w-0 flex-[0_0_100%]">
                <figure className="max-w-4xl">
                  <Quote className="w-6 h-6 md:w-8 md:h-8 text-primary/30 mb-6" aria-hidden />
                  <blockquote className="font-display italic text-2xl md:text-4xl leading-[1.3] text-foreground tracking-tight">
                    “{it.quote}”
                  </blockquote>
                  {it.attribution && (
                    <figcaption className="mt-8 text-xs uppercase tracking-[0.25em] text-foreground font-semibold flex items-center gap-3">
                      <span className="w-6 h-[1px] bg-primary/40 block"></span>
                      {it.attribution}
                    </figcaption>
                  )}
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
      {items.length > 1 && (
        <div className="flex gap-2 pl-6 md:pl-12 mt-4">
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              className="text-muted-foreground hover:text-primary transition-colors p-2 -ml-2"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              className="text-muted-foreground hover:text-primary transition-colors p-2"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-5 h-5 stroke-[1.5]" />
            </button>
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