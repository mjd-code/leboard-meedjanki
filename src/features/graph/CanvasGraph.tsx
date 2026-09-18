/** Canvas renderer for Timeline, Tree and Fishbone projections. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Link, Node } from '@/shared/stores/types';
import { buildGraphModel } from '@/core/graph/engine/model';
import { useGraphLayout } from '@/core/graph/engine/useGraphLayout';
import { anchor, routeLink, routingForLayout } from '@/core/graph/engine/linkRouter';
import type { EngineNode, LayoutOptions } from '@/core/graph/engine/types';
import { useGraphEngineStore } from '@/shared/stores/useGraphEngineStore';
import { colorWithOpacity, resolveColor } from '@/shared/lib/color-utils';
import type { GraphConfigState, LinkStyle } from '@/shared/stores/useGraphStore';
import { GraphMiniMap } from './GraphMiniMap';

interface CanvasGraphProps {
  graphData: { nodes: Node[]; links: Link[] };
  selectedNode: Node | null;
  onNodeSelect: (node: Node | null) => void;
  onNodeHover?: (node: Node | null) => void;
  onNodeContextMenu?: (node: Node, event: MouseEvent) => void;
  graphConfig?: GraphConfigState;
  search: string;
  maxDepth: number;
  contentFilter: string;
  tagFilter: string;
}

interface Camera { x: number; y: number; k: number }
interface PointerState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  nodeId: string | null;
}

const linkId = (end: string | Node) => typeof end === 'string' ? end : end.id;

function descendantsOf(id: string, nodes: Node[]): Set<string> {
  const result = new Set<string>();
  const visit = (parentId: string) => {
    for (const node of nodes) {
      if (node.parentId !== parentId || result.has(node.id)) continue;
      result.add(node.id);
      visit(node.id);
    }
  };
  visit(id);
  return result;
}

function nodeColor(node: EngineNode, config: GraphConfigState['nodes'], selected: boolean) {
  if (selected) return resolveColor(config.selectedColor);
  if (config.autoColorBy === 'depth') return `hsl(${(node.depth * 40) % 360}, 70%, 55%)`;
  if (config.autoColorBy === 'tags' && node.tags.length) {
    const hash = node.tags[0].split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `hsl(${hash % 360}, 70%, 55%)`;
  }
  return resolveColor(node.type === 'folder' ? config.folderColor : config.fileColor);
}

function drawNodeShape(ctx: CanvasRenderingContext2D, node: EngineNode, x: number, y: number, shape: GraphConfigState['nodes']['shape'], radius = node.radius) {
  const r = radius;
  ctx.beginPath();
  if (shape === 'square') ctx.rect(x - r, y - r, r * 2, r * 2);
  else if (shape === 'diamond') {
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
  } else if (shape === 'triangle') {
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r * 0.8); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath();
  } else if (shape === 'hexagon') {
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.PI / 3 * i - Math.PI / 6;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else ctx.arc(x, y, r, 0, Math.PI * 2);
}

function dashFor(style: LinkStyle | undefined, fallback: string): number[] {
  if (style?.lineStyle === 'dashed') return [8, 4];
  if (style?.lineStyle === 'dotted') return [2, 3];
  if (style) return [];
  return fallback.split(',').map(Number).filter(Number.isFinite);
}

export const CanvasGraph = ({ graphData, selectedNode, onNodeSelect, onNodeHover, onNodeContextMenu, graphConfig, search, maxDepth, contentFilter, tagFilter }: CanvasGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const pointerRef = useRef<PointerState | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggedRef = useRef<Record<string, { x: number; y: number }>>({});
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<Node | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const [renderRevision, redraw] = useState(0);
  const engine = useGraphEngineStore();
  

  const visibleData = useMemo(() => {
    const hidden = new Set<string>();
    collapsed.forEach((id) => descendantsOf(id, graphData.nodes).forEach((child) => hidden.add(child)));
    const nodes = graphData.nodes.filter((node) => {
      if (hidden.has(node.id) || node.depth > maxDepth) return false;
      if (search && !node.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (contentFilter && !node.content.toLowerCase().includes(contentFilter.toLowerCase())) return false;
      return !tagFilter || node.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
    });
    const ids = new Set(nodes.map((node) => node.id));
    const links = graphData.links.filter((link) => {
      if (!ids.has(linkId(link.source)) || !ids.has(linkId(link.target))) return false;
      if (link.type === 'hierarchy') return graphConfig?.topology.showHierarchy ?? true;
      if (link.type === 'backlink') return graphConfig?.topology.showBacklinks ?? true;
      if (link.type === 'tag') return graphConfig?.topology.showTags ?? true;
      return true;
    });
    return { nodes, links };
  }, [collapsed, contentFilter, graphConfig?.topology, graphData, maxDepth, search, tagFilter]);

  const model = useMemo(() => buildGraphModel(visibleData.nodes, visibleData.links, {
    baseRadius: graphConfig?.nodes.relSize ?? 6,
    timeField: engine.timeField,
    sizeByDepth: graphConfig?.nodes.sizeByDepth,
    depthSizeInterval: graphConfig?.nodes.depthSizeInterval,
  }), [visibleData, graphConfig?.nodes.depthSizeInterval, graphConfig?.nodes.relSize, graphConfig?.nodes.sizeByDepth, engine.timeField]);

  const force = graphConfig?.forces;
  const options = useMemo<LayoutOptions>(() => ({
    kind: engine.layout,
    width: size.width,
    height: size.height,
    linkDistance: force?.linkDistance ?? 100,
    chargeStrength: force?.chargeStrength ?? -300,
    centerStrength: force?.centerStrength ?? 1,
    alphaDecay: force?.alphaDecay ?? 0.02,
    velocityDecay: force?.velocityDecay ?? 0.3,
    warmupTicks: force?.warmupTicks ?? 100,
    cooldownTicks: force?.cooldownTicks ?? 100,
    laneHeight: engine.laneHeight,
    levelDistance: engine.levelDistance,
    depthRules: engine.depthRules,
  }), [engine.depthRules, engine.laneHeight, engine.layout, engine.levelDistance, force, size]);
  const layout = useGraphLayout(model, options);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(320, entry.contentRect.width), height: Math.max(240, entry.contentRect.height) }));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
  }, []);

  const position = useCallback((id: string) => {
    const dragged = draggedRef.current[id];
    if (dragged) return dragged;
    const i = layout.index[id];
    return i === undefined ? null : { x: layout.x[i], y: layout.y[i] };
  }, [layout]);

  const draw = useCallback((time = 0) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !graphConfig) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr; canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`; canvas.style.height = `${size.height}px`;
    const cam = cameraRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size.width, size.height);
    ctx.translate(cam.x, cam.y); ctx.scale(cam.k, cam.k);

    const defaultLinkColor = resolveColor(graphConfig.links.color);
    ctx.save(); ctx.strokeStyle = defaultLinkColor; ctx.globalAlpha = 0.35; ctx.lineWidth = 1 / cam.k;
    if (layout.spine) { ctx.beginPath(); ctx.moveTo(layout.spine.x1, layout.spine.y1); ctx.lineTo(layout.spine.x2, layout.spine.y2); ctx.stroke(); }
    if (layout.ticks?.length) {
      ctx.font = `${11 / cam.k}px sans-serif`; ctx.fillStyle = defaultLinkColor; ctx.textAlign = 'center';
      for (const tick of layout.ticks) { ctx.beginPath(); ctx.moveTo(tick.x, 12); ctx.lineTo(tick.x, size.height - 12); ctx.stroke(); ctx.fillText(tick.label, tick.x, 20); }
    }
    ctx.restore();

    const routing = engine.routing === 'auto' ? routingForLayout(layout.kind) : engine.routing;
    for (const link of model.links) {
      const a = position(link.source); const b = position(link.target);
      if (!a || !b) continue;
      const sourceNode = model.nodes.find((node) => node.id === link.source);
      const targetNode = model.nodes.find((node) => node.id === link.target);
      if (!sourceNode || !targetNode) continue;
      const style = link.type ? graphConfig.topology.styles[link.type as keyof typeof graphConfig.topology.styles] : undefined;
      const color = resolveColor(style?.color ?? graphConfig.links.color);
      ctx.save(); ctx.strokeStyle = colorWithOpacity(color, style?.opacity ?? graphConfig.links.opacity);
      ctx.lineWidth = (style?.width ?? graphConfig.links.width) / cam.k;
      ctx.setLineDash(dashFor(style, graphConfig.links.dashArray).map((n) => n / cam.k));
      ctx.stroke(routeLink({ ...a, radius: sourceNode.radius }, { ...b, radius: targetNode.radius }, routing));
      ctx.restore();
      const start = anchor({ ...a, radius: sourceNode.radius }, b);
      const end = anchor({ ...b, radius: targetNode.radius }, a);
      if (graphConfig.links.showArrows && graphConfig.links.arrowLength > 0) {
        const angle = Math.atan2(end.y - start.y, end.x - start.x); const len = graphConfig.links.arrowLength / cam.k;
        ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - len * Math.cos(angle - Math.PI / 6), end.y - len * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - len * Math.cos(angle + Math.PI / 6), end.y - len * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      if (graphConfig.links.showParticles && graphConfig.links.particles > 0) {
        ctx.save(); ctx.fillStyle = resolveColor(graphConfig.links.particleColor);
        const particleCount = graphConfig.links.showParticles ? Math.max(1, graphConfig.links.particles) : 1;
        for (let i = 0; i < particleCount; i += 1) {
          const speed = graphConfig.links.showParticles ? graphConfig.links.particleSpeed : 0.08;
          const t = ((time * speed * 0.001) + i / particleCount) % 1;
          ctx.beginPath(); ctx.arc(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t, graphConfig.links.particleWidth / (2 * cam.k), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }

    if (!graphConfig.nodes.visible) return;
    const showLabels = graphConfig.nodes.showLabels && engine.showLabels && cam.k >= engine.labelZoomThreshold;
    for (const node of model.nodes) {
      const p = position(node.id); if (!p) continue;
      const selected = selectedNode?.id === node.id; const fill = nodeColor(node, graphConfig.nodes, selected);
      ctx.save(); ctx.globalAlpha = graphConfig.nodes.opacity; ctx.fillStyle = fill; ctx.shadowBlur = 10; ctx.shadowColor = colorWithOpacity(fill, 0.8);
      drawNodeShape(ctx, node, p.x, p.y, graphConfig.nodes.shape, node.radius); ctx.fill(); ctx.restore();
      if (collapsed.has(node.id)) {
        ctx.save(); ctx.strokeStyle = colorWithOpacity(fill, 0.65); ctx.lineWidth = 2 / cam.k; ctx.setLineDash([3 / cam.k, 2 / cam.k]);
        ctx.beginPath(); ctx.arc(p.x, p.y, node.radius + 4 / cam.k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (showLabels) {
        const style = graphConfig.nodes.labelFontStyle;
        const fontStyle = style === 'bold-italic' ? 'bold italic ' : style === 'normal' ? '' : `${style} `;
        const fontSize = graphConfig.nodes.labelSize / cam.k;
        const label = graphConfig.nodes.labelField === 'id' ? node.id : node.name;
        ctx.font = `${fontStyle}${fontSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const y = p.y + node.radius + 10 / cam.k; const width = ctx.measureText(label).width + 8 / cam.k;
        if (graphConfig.nodes.labelBackground) { ctx.fillStyle = colorWithOpacity(graphConfig.nodes.labelBackgroundColor, 0.85); ctx.fillRect(p.x - width / 2, y - fontSize / 2 - 2 / cam.k, width, fontSize + 4 / cam.k); }
        ctx.fillStyle = resolveColor(graphConfig.nodes.labelColor); ctx.fillText(label, p.x, y);
      }
    }
  }, [collapsed, engine.labelZoomThreshold, engine.routing, engine.showLabels, graphConfig, layout, model.links, model.nodes, position, renderRevision, selectedNode, size]);

  useEffect(() => {
    let frame = 0;
    const animate = (time: number) => { draw(time); if (graphConfig?.links.showParticles) frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [draw, graphConfig?.links.showParticles]);

  const toGraph = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect(); const cam = cameraRef.current;
    return { x: (clientX - rect.left - cam.x) / cam.k, y: (clientY - rect.top - cam.y) / cam.k };
  }, []);
  const hitTest = useCallback((clientX: number, clientY: number) => {
    const point = toGraph(clientX, clientY); if (!point) return null;
    for (let i = model.nodes.length - 1; i >= 0; i -= 1) {
      const node = model.nodes[i]; const p = position(node.id); if (!p) continue;
      if (Math.hypot(p.x - point.x, p.y - point.y) <= node.radius + 4) return visibleData.nodes.find((item) => item.id === node.id) ?? null;
    }
    return null;
  }, [model.nodes, position, toGraph, visibleData.nodes]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault(); const rect = canvas.getBoundingClientRect(); const cam = cameraRef.current;
      const px = event.clientX - rect.left; const py = event.clientY - rect.top;
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const next = Math.min(6, Math.max(0.15, cam.k * Math.exp(-dy * 0.0015))); const ratio = next / cam.k;
      cam.x = px - (px - cam.x) * ratio; cam.y = py - (py - cam.y) * ratio; cam.k = next; redraw((n) => n + 1);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const miniMapNodes = useMemo(() => visibleData.nodes.map((node) => ({ ...node, ...(position(node.id) ?? {}) })), [position, renderRevision, visibleData.nodes]);
  const miniMapApi = useRef({
    zoom: () => cameraRef.current,
    width: () => size.width,
    height: () => size.height,
    centerAt: (x: number, y: number) => { cameraRef.current.x = size.width / 2 - x * cameraRef.current.k; cameraRef.current.y = size.height / 2 - y * cameraRef.current.k; redraw((n) => n + 1); },
  });
  miniMapApi.current.width = () => size.width; miniMapApi.current.height = () => size.height;
  miniMapApi.current.centerAt = (x, y) => { cameraRef.current.x = size.width / 2 - x * cameraRef.current.k; cameraRef.current.y = size.height / 2 - y * cameraRef.current.k; redraw((n) => n + 1); };

  return (
    <div ref={hostRef} className="relative h-full w-full bg-background">
      <canvas ref={canvasRef} className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(e) => { const node = hitTest(e.clientX, e.clientY); pointerRef.current = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, nodeId: node?.id ?? null }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { const pointer = pointerRef.current; if (!pointer) { const node = hitTest(e.clientX, e.clientY); if (node?.id !== hovered?.id) { setHovered(node); onNodeHover?.(node); } setTooltip({ x: e.nativeEvent.offsetX + 12, y: e.nativeEvent.offsetY + 12 }); return; } const cam = cameraRef.current; const dx = e.clientX - pointer.lastX; const dy = e.clientY - pointer.lastY; if (pointer.nodeId) { const current = position(pointer.nodeId); if (current) draggedRef.current[pointer.nodeId] = { x: current.x + dx / cam.k, y: current.y + dy / cam.k }; } else { cam.x += dx; cam.y += dy; } pointer.lastX = e.clientX; pointer.lastY = e.clientY; redraw((n) => n + 1); }}
        onPointerUp={(e) => { const pointer = pointerRef.current; pointerRef.current = null; if (!pointer || Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) >= 4 || e.detail > 1) return; const node = hitTest(e.clientX, e.clientY); if (!node) return; if (clickTimerRef.current) clearTimeout(clickTimerRef.current); clickTimerRef.current = setTimeout(() => onNodeSelect(node), 220); }}
        onDoubleClick={(e) => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); const node = hitTest(e.clientX, e.clientY); if (!node || !graphData.nodes.some((child) => child.parentId === node.id)) return; setCollapsed((current) => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; }); }}
        onPointerLeave={() => { setHovered(null); onNodeHover?.(null); }}
        onContextMenu={(e) => { e.preventDefault(); const node = hitTest(e.clientX, e.clientY); if (node) onNodeContextMenu?.(node, e.nativeEvent); }}
      />
      {hovered && <div className="pointer-events-none absolute z-40 rounded border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md" style={{ left: tooltip.x, top: tooltip.y }}>{hovered.type === 'folder' ? '📁' : '📄'} {hovered.name} · depth {hovered.depth}</div>}
      {layout.computing && <div className="absolute bottom-4 left-4 rounded-md bg-muted/80 px-3 py-1 text-xs text-muted-foreground">Computing {engine.layout} layout…</div>}
      {graphConfig && <GraphMiniMap nodes={miniMapNodes} links={visibleData.links} graphRef={miniMapApi} folderColor={graphConfig.nodes.folderColor} fileColor={graphConfig.nodes.fileColor} linkColor={graphConfig.links.color} selectedNodeId={selectedNode?.id} />}
    </div>
  );
};