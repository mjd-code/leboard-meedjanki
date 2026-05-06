'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronDown, ChevronLeft, ChevronRight, Quote, FileText, Link as LinkIcon, Download } from 'lucide-react';
import { BlockErrorBoundary } from './BlockErrorBoundary';

/* ---------- Defensive helpers ---------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
function safeJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/* ---------- Toggle (Notion-style, recursive) ---------- */

function ToggleBlockView({
  title,
  childrenHtml,
  defaultOpen,
}: { title: string; childrenHtml: string; defaultOpen: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="toggle-block not-prose my-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-start gap-2 text-left py-1 hover:bg-muted/40 rounded transition-colors"
      >
        <ChevronRight
          className={`w-4 h-4 mt-1.5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90 text-foreground' : ''}`}
        />
        <span className="flex-1 font-medium text-foreground leading-relaxed">{title}</span>
      </button>
      {open && (
        <div className="pl-6 ml-2 border-l border-border/60 mt-1 mb-2">
          <BlogContent html={childrenHtml} />
        </div>
      )}
    </div>
  );
}

/* ---------- Bookmark card ---------- */

function BookmarkCardView({ url, title, description, image, siteName }: {
  url: string; title: string; description: string; image: string; siteName: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="bookmark-card not-prose my-5 flex items-stretch border border-border rounded-xl overflow-hidden bg-card hover:border-primary/60 hover:shadow-soft transition-all no-underline group/bm"
    >
      <div className="flex-1 min-w-0 p-4 flex flex-col gap-1.5">
        <div className="font-semibold text-foreground line-clamp-2 group-hover/bm:text-primary transition-colors">
          {title || url}
        </div>
        {description && (
          <div className="text-sm text-muted-foreground line-clamp-2">{description}</div>
        )}
        <div className="text-xs text-muted-foreground/80 mt-auto pt-2 truncate flex items-center gap-1.5">
          <LinkIcon className="w-3 h-3 shrink-0" />
          <span className="truncate">{siteName || url}</span>
        </div>
      </div>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="w-32 sm:w-44 object-cover shrink-0 border-l border-border" />
      )}
    </a>
  );
}

/* ---------- File attachment card ---------- */

function FileAttachmentView({ url, name, size }: { url: string; name: string; size: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="file-attachment not-prose my-5 flex items-center gap-4 p-4 border border-border rounded-xl bg-card hover:border-primary/60 hover:shadow-soft transition-all no-underline group/fa"
    >
      <div className="shrink-0 w-12 h-14 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center">
        <FileText className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground truncate group-hover/fa:text-primary transition-colors">
          {name || 'File'}
        </div>
        <div className="text-xs text-muted-foreground truncate">{size || 'Klik untuk membuka / unduh'}</div>
      </div>
      <Download className="w-4 h-4 text-muted-foreground group-hover/fa:text-primary transition-colors shrink-0" />
    </a>
  );
}

/* ---------- Video block ---------- */

function VideoBlockView({ src, provider }: { src: string; provider: string }) {
  if (!src) return null;
  const isFile = provider === 'file' || /\.(mp4|webm|ogg)(\?.*)?$/i.test(src);
  let embed = src;
  if (provider === 'youtube' || /youtube\.com|youtu\.be/i.test(src)) {
    const m = src.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
    if (m) embed = `https://www.youtube.com/embed/${m[1]}`;
  } else if (provider === 'vimeo' || /vimeo\.com/i.test(src)) {
    const m = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) embed = `https://player.vimeo.com/video/${m[1]}`;
  }

  return (
    <div className="not-prose my-6 rounded-xl overflow-hidden border border-border bg-black aspect-video">
      {isFile ? (
        <video src={src} controls className="w-full h-full" />
      ) : (
        <iframe
          src={embed}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          title="Video"
        />
      )}
    </div>
  );
}

/* ---------- Block components ---------- */

function AccordionBlock({ items }: { items: { title: string; body: string }[] }) {
  const safeItems = asArray<{ title: string; body: string }>(items);
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="my-10 not-prose space-y-px">
      <div className="border-t border-border/50"></div>
      {safeItems.map((it, i) => {
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
  const safeItems = asArray<{ label: string; body: string }>(items);
  const [active, setActive] = React.useState(0);
  const cur = Math.min(active, Math.max(0, safeItems.length - 1));
  return (
    <div className="my-10 not-prose">
      <div className="relative border-b border-border/40">
        <div className="flex overflow-x-auto hide-scrollbar scroll-smooth space-x-6 pb-[2px]">
          {safeItems.map((it, i) => (
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
        {safeItems[cur]?.body}
      </div>
    </div>
  );
}

function SimpleTableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const safeHeaders = asArray<string>(headers);
  const safeRows = asArray<unknown>(rows).map((r) => asArray<string>(r));
  return (
    <div className="my-10 not-prose relative">
      <div className="overflow-x-auto border-y border-border/40 pb-1">
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              {safeHeaders.map((h, i) => (
                <th key={i} className="py-4 px-4 font-display font-semibold text-foreground uppercase tracking-wider text-xs border-b border-border/60 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {safeRows.map((r, ri) => (
              <tr key={ri} className="hover:bg-muted/30 transition-colors group">
                {safeHeaders.map((_, ci) => (
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
  const safeItems = asArray<{ src: string; alt?: string; caption?: string }>(items);
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

  if (!safeItems.length) return null;

  return (
    <div className="my-12 not-prose relative full-bleed max-w-[100vw]">
      <div className="max-w-7xl mx-auto md:px-6">
        <div className="relative group/carousel">
          <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
            <div className="flex">
              {safeItems.map((it, i) => (
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
          {safeItems.length > 1 && (
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
        {safeItems.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-6">
            {safeItems.map((_, i) => (
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
  const safeItems = asArray<{ quote: string; attribution?: string }>(items);
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();
    return () => { embla.off('select', onSelect); };
  }, [embla]);

  if (!safeItems.length) return null;

  return (
    <div className="my-14 not-prose relative">
      <div className="absolute inset-y-0 left-0 outline outline-[1px] outline-primary/10 bg-primary/5 w-[1px]"></div>
      <div className="py-6 md:py-10 pl-6 md:pl-12">
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
          <div className="flex">
            {safeItems.map((it, i) => (
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
      {safeItems.length > 1 && (
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
  | { type: 'quote-carousel'; items: { quote: string; attribution?: string }[] }
  | { type: 'toggle'; title: string; childrenHtml: string; defaultOpen: boolean }
  | { type: 'bookmark'; url: string; title: string; description: string; image: string; siteName: string }
  | { type: 'file-attachment'; url: string; name: string; size: string }
  | { type: 'video'; src: string; provider: string };

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
          if (block === 'accordion') chunks.push({ type: 'accordion', items: safeJsonArray(el.getAttribute('data-items')) });
          else if (block === 'tabs') chunks.push({ type: 'tabs', items: safeJsonArray(el.getAttribute('data-items')) });
          else if (block === 'simple-table') chunks.push({
            type: 'simple-table',
            headers: safeJsonArray<string>(el.getAttribute('data-headers')),
            rows: safeJsonArray<string[]>(el.getAttribute('data-rows')).map((r) => asArray<string>(r)),
          });
          else if (block === 'image-carousel') chunks.push({ type: 'image-carousel', items: safeJsonArray(el.getAttribute('data-items')) });
          else if (block === 'quote-carousel') chunks.push({ type: 'quote-carousel', items: safeJsonArray(el.getAttribute('data-items')) });
          else if (block === 'toggle' && el.tagName.toLowerCase() === 'details') {
            // First child <p> is the summary/title; remaining children are body.
            const children = Array.from(el.children);
            const titleEl = children.find((c) => c.tagName.toLowerCase() === 'p');
            const title = (titleEl?.textContent || '').trim();
            const bodyHtml = children
              .filter((c) => c !== titleEl)
              .map((c) => (c as HTMLElement).outerHTML)
              .join('');
            chunks.push({
              type: 'toggle',
              title: title || 'Toggle',
              childrenHtml: bodyHtml,
              defaultOpen: el.hasAttribute('open'),
            });
          } else if (block === 'bookmark') {
            chunks.push({
              type: 'bookmark',
              url: el.getAttribute('href') || '',
              title: el.getAttribute('data-title') || '',
              description: el.getAttribute('data-description') || '',
              image: el.getAttribute('data-image') || '',
              siteName: el.getAttribute('data-site') || '',
            });
          } else if (block === 'file-attachment') {
            chunks.push({
              type: 'file-attachment',
              url: el.getAttribute('href') || '',
              name: el.getAttribute('data-name') || '',
              size: el.getAttribute('data-size') || '',
            });
          } else if (block === 'video') {
            chunks.push({
              type: 'video',
              src: el.getAttribute('data-src') || '',
              provider: el.getAttribute('data-provider') || '',
            });
          }
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
  const [chunks, setChunks] = React.useState<Chunk[]>(() => [{ type: 'html', html: html || '' }]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      setChunks(parseContent(html || ''));
    } catch (e) {
      // Last-resort fallback: render raw HTML if the parser itself blows up.
      // eslint-disable-next-line no-console
      console.error('[BlogContent] parseContent failed:', e);
      setChunks([{ type: 'html', html: html || '' }]);
    }
  }, [html]);

  // Obsidian-style collapsible headings
  React.useEffect(() => {
    if (!containerRef.current) return;
    const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4');
    
    headings.forEach((heading, index) => {
      if (heading.hasAttribute('data-collapsible')) return;
      heading.setAttribute('data-collapsible', 'true');
      const headingId = `heading-${index}`;
      heading.id = heading.id || headingId;
      
      // Style heading for interaction. We use negative margin left and padding left so it spans into the left margin to capture clicks, but text remains aligned.
      heading.classList.add('cursor-pointer', 'group', 'relative');
      // For mobile: don't pull too much if there's no space, but it's safe if overflow is visible.
      // We'll just position the icon absolute so it doesn't break normal text flow.
      
      // We need to preserve the internal HTML
      const originalHtml = heading.innerHTML;
      heading.innerHTML = '';
      
      const iconContainer = document.createElement('span');
      // On mobile: inline block, visible, small margins. On md: absolute, negative left, opacity 0 until hover.
      iconContainer.className = 'inline-flex md:absolute static md:-left-8 top-1/2 md:-translate-y-1/2 w-5 h-5 md:w-6 md:h-6 items-center justify-center mr-1.5 md:mr-0 text-muted-foreground/50 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-primary shrink-0';
      // Down chevron
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><path d="m6 9 6 6 6-6"/></svg>`;
      
      const textSpan = document.createElement('span');
      textSpan.className = 'flex-1 inline-block';
      textSpan.innerHTML = originalHtml;
      
      heading.classList.add('flex', 'items-start', 'md:items-center');
      heading.appendChild(iconContainer);
      heading.appendChild(textSpan);

      // Track controlled elements
      const getControlledElements = () => {
        const level = parseInt(heading.tagName.replace('H', ''));
        const els: Element[] = [];
        let el = heading.nextElementSibling;
        
        while (el) {
          const tagName = el.tagName;
          if (/^H[1-6]$/.test(tagName)) {
            const nextLevel = parseInt(tagName.replace('H', ''));
            // Stop if we hit a heading of the same or higher level
            if (nextLevel <= level) break;
          }
          els.push(el);
          el = el.nextElementSibling;
        }
        return els;
      };

      const updateVisibility = () => {
        const elements = getControlledElements();
        elements.forEach(el => {
          // If the element has any hidden-by attributes, it should be hidden
          const hiddenBy = el.getAttribute('data-hidden-by') || '';
          const hiddenSet = new Set(hiddenBy.split(' ').filter(Boolean));
          if (hiddenSet.size > 0) {
            el.classList.add('hidden');
          } else {
            el.classList.remove('hidden');
          }
        });
      }

      heading.addEventListener('click', (e) => {
        if (window.getSelection()?.toString().length) return;
        
        const isCollapsed = heading.hasAttribute('data-collapsed');
        const iconSvg = iconContainer.querySelector('svg');
        const elements = getControlledElements();
        
        if (isCollapsed) {
          heading.removeAttribute('data-collapsed');
          if (iconSvg) iconSvg.style.transform = 'rotate(0deg)';
          // Remove this heading's ID from the hidden-by list of its children
          elements.forEach(el => {
            const hiddenBy = el.getAttribute('data-hidden-by') || '';
            const hiddenSet = new Set(hiddenBy.split(' ').filter(Boolean));
            hiddenSet.delete(heading.id);
            el.setAttribute('data-hidden-by', Array.from(hiddenSet).join(' '));
          });
          heading.classList.remove('opacity-60');
          updateVisibility();
        } else {
          heading.setAttribute('data-collapsed', 'true');
          if (iconSvg) iconSvg.style.transform = 'rotate(-90deg)';
          // Add this heading's ID to the hidden-by list of its children
          elements.forEach(el => {
            const hiddenBy = el.getAttribute('data-hidden-by') || '';
            const hiddenSet = new Set(hiddenBy.split(' ').filter(Boolean));
            hiddenSet.add(heading.id);
            el.setAttribute('data-hidden-by', Array.from(hiddenSet).join(' '));
          });
          heading.classList.add('opacity-60');
          updateVisibility();
        }
      });
    });
  }, [chunks]);

  const safeChunks = asArray<Chunk>(chunks);

  const renderChunk = (c: Chunk, i: number): React.ReactNode => {
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
      case 'toggle':
        return (
          <ToggleBlockView
            key={i}
            title={c.title}
            childrenHtml={c.childrenHtml}
            defaultOpen={c.defaultOpen}
          />
        );
      case 'bookmark':
        return <BookmarkCardView key={i} {...c} />;
      case 'file-attachment':
        return <FileAttachmentView key={i} url={c.url} name={c.name} size={c.size} />;
      case 'video':
        return <VideoBlockView key={i} src={c.src} provider={c.provider} />;
      default:
        return null;
    }
  };

  return (
    <div className={className} ref={containerRef}>
      {safeChunks.map((c, i) => (
        <BlockErrorBoundary key={i} label={c.type}>
          {renderChunk(c, i)}
        </BlockErrorBoundary>
      ))}
    </div>
  );
}