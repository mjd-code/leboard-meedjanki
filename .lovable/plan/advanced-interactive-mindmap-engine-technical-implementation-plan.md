# Advanced Interactive Mindmap Engine — Technical Implementation Plan

## Objective

Build one production graph surface powered exclusively by `react-force-graph-2d` v1.29.0+ for rendering, camera control, dragging, hit testing, and events. Replace the parallel hand-written Canvas renderer and direct application dependencies on `d3-force`, `d3-hierarchy`, and `d3-path` with deterministic TypeScript layout math that assigns node `fx`/`fy` coordinates.

On approval, this blueprint will also be delivered as root-level `plan.md` before implementation begins.

## Verified Current State

- `GraphLeaf` switches between `NetworkGraph` and `CanvasGraph`; only force mode normally uses `react-force-graph-2d`.
- `CanvasGraph` owns a second camera, wheel/pan/drag loop, hit testing, canvas rendering, minimap adapter, and worker-based layout pipeline.
- `layouts.ts` directly imports `d3-force` and `d3-hierarchy`; `linkRouter.ts` directly imports `d3-path`.
- `package.json` contains those three runtime packages and their three `@types/*` packages; `react-force-graph-2d` is already `^1.29.0`.
- Existing layout names are `force | timeline | tree | fishbone`; the new public vocabulary will be `free-force | timeline | mindmap | fishbone`.
- Collapse state and filtering are currently duplicated across both renderers. Graph configuration is persisted in Zustand, but interaction state is local to each renderer.

## Target Architecture

```text
Vault GraphData
     |
     v
Graph projection/indexes --------> useGraphInteractionStore (Zustand)
(parent/children/date/category)      selected, hovered, collapsed,
     |                               focused root, transition
     v
useLayoutEngine
  |-- freeForce.ts   -> clears fx/fy
  |-- mindmap.ts     -> deterministic targets
  |-- timeline.ts    -> deterministic targets + axis geometry
  `-- fishbone.ts    -> deterministic targets + spine/rib geometry
     |
     v
LayoutTransitionController
(current x/y -> interpolated fx/fy -> final fx/fy)
     |
     v
GraphCanvas.tsx
  react-force-graph-2d
  |-- nodeCanvasObject / nodePointerAreaPaint
  |-- linkCanvasObject
  |-- onRenderFramePre for non-link decorations
  |-- wrapper camera, drag, click, hover, zoom APIs
  `-- GraphMiniMap adapter
```

### Proposed Feature-Sliced Structure

```text
src/features/graph/
  GraphCanvas.tsx                 # sole graph renderer and wrapper integration
  model/
    graphTypes.ts                 # render-node/link and layout contracts
    buildGraphProjection.ts       # normalized IDs, hierarchy, dates, categories
    useGraphInteractionStore.ts   # global interaction state via Zustand
  layout/
    useLayoutEngine.ts
    layoutMath.ts                 # clamp, lerp, easing, bounds, text metrics
    freeForce.ts
    mindmap.ts
    timeline.ts
    fishbone.ts
    transitionController.ts
  render/
    drawNode.ts
    drawLink.ts
    drawArrowhead.ts
    drawDecorations.ts
    textLayout.ts
    theme.ts
  interactions/
    graphTraversal.ts             # ancestors, descendants, visible projection
    focusGraph.ts                 # focus node/subtree and fit bounds
    graphMutations.ts             # add/delete/collapse operations
  __tests__/
    fixtures.ts
    mindmap.test.ts
    timeline.test.ts
    fishbone.test.ts
    traversal.test.ts
```

`GraphLeaf` will always render `GraphCanvas`; `CanvasGraph`, its layout worker, and duplicate pointer/camera code are retired after parity is verified. Existing graph and engine settings remain in Zustand and are migrated without losing persisted user preferences.

## Core Contracts

```ts
type LayoutMode = 'mindmap' | 'timeline' | 'fishbone' | 'free-force';
type MindmapOrientation = 'balanced' | 'radial';

type LayoutPoint = { x: number; y: number };
type NodeTarget = LayoutPoint & { side?: -1 | 0 | 1; angle?: number; lane?: number };

type LayoutGeometry = {
  mode: LayoutMode;
  targets: Map<string, NodeTarget>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  decorations: Array<TimelineAxis | FishboneSpine | FishboneRib>;
};

type LayoutContext = {
  width: number; height: number;
  rootId?: string; levelGap: number; siblingGap: number; laneGap: number;
  nodeMetrics: Map<string, { width: number; height: number }>;
};
```

`useLayoutEngine(graph, mode, options)` will:

1. Normalize link endpoints once and build `byId`, `childrenByParent`, `parentByChild`, `roots`, and category/date indexes in `O(V + E)`.
2. Exclude descendants of collapsed nodes before layout so hidden branches consume no space.
3. Run the selected pure layout function inside `useMemo`; no React state writes occur during render.
4. Start/cancel a transition in an effect keyed by a stable graph/layout signature.
5. Apply coordinates to the same node objects passed to ForceGraph2D; avoid recreating graph objects per animation frame.
6. Return geometry, visibility/pathway sets, transition state, and camera actions.

Malformed hierarchy handling is deterministic: ignore dangling parent references, cut a cycle at its first repeated node, and treat all resulting roots as a virtual-root forest. Warnings remain development-only.

## Layout Mathematics

### 1. Mindmap / Balanced Tree

Compute subtree weight bottom-up:

```text
W(n) = max(1, sum(W(c)) for each visible child c)
```

For balanced mode, keep the chosen root at `(0, 0)`. Sort root children stably by original order, then greedily assign each branch to the side whose accumulated weight is smaller. Let `s in {-1,+1}` be its side, `d` its depth from the root, and `Gx` the level gap:

```text
x(n) = s * d * Gx
span(n) = max(cardHeight(n) + Gy, sum(span(c)))
y(child_i) = top(n) + sum(span(child_j), j < i) + span(child_i)/2
y(n) = weighted center of its visible children
```

Each side is translated so its total span is centered around `y = 0`. Node width participates in horizontal spacing:

```text
x(child) = x(parent) + s * (parentWidth/2 + childWidth/2 + Gx)
```

For radial mode, each root branch receives an angular sector proportional to `W(branch)`:

```text
DeltaTheta_i = 2*pi * W(branch_i) / sum(W(rootChildren))
theta(n) = midpoint of its allocated sector
r(n) = depth(n) * Gr
x(n) = r(n) * cos(theta(n)); y(n) = r(n) * sin(theta(n))
```

The root card is larger and visually distinct. Forests use a virtual root only for math; virtual nodes never render.

### 2. Timeline

Resolve each milestone to epoch milliseconds. Undated entries use stable sequential order in a reserved section. For dated nodes:

```text
u_i = (time_i - timeMin) / max(1, timeMax - timeMin)
x_i = axisLeft + u_i * axisWidth
```

When every timestamp is identical or absent, use:

```text
x_i = axisLeft + i * axisWidth / max(1, N - 1)
```

Collision-aware alternating lanes are assigned in chronological order. Candidate lanes are `+1, -1, +2, -2, ...`; choose the first whose last occupied right edge is left of the current card's left edge:

```text
left_i = x_i - cardWidth_i/2
lane(i) = first l where left_i >= laneEnd[l] + Gx
y_i = baselineY + sign(lane(i)) * ceil(abs(lane(i))/2) * Gy
laneEnd[lane(i)] = x_i + cardWidth_i/2
```

A detail node attached to milestone `m` inherits its side and forms a compact stack:

```text
x(detail_k) = x_m + detailDirection * min(k, maxColumns) * detailGapX
y(detail_k) = y_m + sign(y_m - baselineY) * (1 + floor(k/maxColumns)) * detailGapY
```

Axis ticks use a “nice interval” selected from `{1, 2, 5} * 10^k`; labels are formatted according to span. Timeline axis and ticks are rendered once in `onRenderFramePre`; milestone/detail paths are rendered by `linkCanvasObject`.

### 3. Fishbone / Ishikawa

Select the effect/root node at the right endpoint. Let the spine run from `S=(x0,y0)` to effect anchor `E=(x1,y0)`, with usable length `L=x1-x0`. For `C` major categories, category `j` receives:

```text
a_j = x0 + (j + 1) * L / (C + 1)          # spine anchor
sign_j = -1 when j is even, +1 when odd    # above/below
alpha = pi/4                               # configurable 35°..55°
ribLength_j = max(minRib, baseRib + W(category_j) * growth)
categoryX_j = a_j - ribLength_j * cos(alpha)
categoryY_j = y0 + sign_j * ribLength_j * sin(alpha)
```

For child `k` among `M` nodes on a major rib, place its attachment at fraction `t_k=(k+1)/(M+1)`:

```text
baseX_k = a_j - t_k * ribLength_j * cos(alpha)
baseY_k = y0 + sign_j * t_k * ribLength_j * sin(alpha)
```

Sub-branches use the unit vector perpendicular to the rib, `p=(-sign_j*sin(alpha), -cos(alpha))`. At relative depth `q >= 1`:

```text
branchOffset = q * subBranchGap
x_k = baseX_k + branchOffset * p.x
y_k = baseY_k + branchOffset * p.y
```

Sibling stacks add `siblingIndex * siblingGap` along the rib tangent. Clamp rib endpoints against viewport layout bounds and increase `ribLength` when measured labels would overlap. Categories are stable-sorted; changing unrelated metadata will not reorder the diagram.

## Smooth Layout Transitions

For each node, capture `P0=(node.x ?? oldFx ?? targetX, node.y ?? oldFy ?? targetY)` and target `P1`. Over a default 550 ms duration:

```text
t = clamp((now - startTime) / duration, 0, 1)
ease(t) = 1 - (1 - t)^3
node.fx = P0.x + (P1.x - P0.x) * ease(t)
node.fy = P0.y + (P1.y - P0.y) * ease(t)
```

A single `requestAnimationFrame` controller calls the wrapper's `refresh()` after each mutation. A monotonically increasing transition token cancels stale animation when mode, data, collapse state, or dimensions change. At completion, structured modes retain final `fx/fy`; `free-force` sets `fx = undefined`, `fy = undefined`, resets stale velocities, then calls `d3ReheatSimulation()` through the ForceGraph2D API. Reduced-motion users jump directly to final targets. Repeated resize events are debounced and preserve the current visual center.

## Canvas Rendering Layer

### `linkCanvasObject`

Native Canvas 2D drawing only; no `Path2D` serialization library.

- **Mindmap:** anchor paths to card boundaries. For horizontal mode, use cubic controls `C1=(sx+k*dx,sy)`, `C2=(tx-k*dx,ty)`, where `k=0.45`. Width is `max(minWidth, baseWidth-depth*decay)`. Radial mode bends controls along source/target tangents.
- **Timeline:** milestone links use orthogonal `moveTo/lineTo` steps or a cubic arch whose lift is `min(maxLift, max(minLift, abs(dx)*0.35))`. Arrowheads use the final path tangent, not center-to-center angle.
- **Fishbone:** spine is the heaviest stroke, major ribs medium, sub-ribs light. Geometry records identify each role. Arrowheads are triangles computed from endpoint tangent: `tip`, `tip-len*(cos(theta±beta), sin(theta±beta))`.
- Link opacity derives from pathway highlighting. The renderer uses `ctx.save()/restore()` per link and resets dash, alpha, shadow, alignment, and compositing state.
- Baseline/spine decorations are drawn once in `onRenderFramePre`; semantic links remain in `linkCanvasObject`. This avoids redrawing the same axis for every link while keeping all graph paths inside the wrapper's render cycle.

### `nodeCanvasObject` and Pointer Area

- Measure and cache labels by `{text,font,maxWidth}`; wrap by words, then by grapheme for oversized tokens.
- Derive stable card dimensions from line count, icon/badge regions, and zoom-independent graph units.
- Draw rounded rectangles with `ctx.roundRect` plus fallback path; use semantic theme colors resolved before drawing.
- Render type icon, up to two text lines, optional status dot, and child-count badge.
- Branch nodes expose a circular `+/-` toggle at the outward edge. Its geometry is stored per node for click hit testing; `nodePointerAreaPaint` covers the whole card and toggle.
- Use level of detail: full card above configured zoom, compact card at medium zoom, simple marker below threshold. Avoid allocating arrays, gradients, or formatters inside draw callbacks.

## Interaction and State

All cross-component graph interaction state belongs in a Zustand store:

```text
layoutMode, orientation, collapsedIds, selectedId, hoveredId,
focusedRootId, transitionStatus, highlightMode
```

Graph content remains owned by the vault/session data source; the store invokes explicit mutation adapters rather than maintaining a second node collection.

- **Expand/collapse:** toggle only when the click falls in the rendered toggle region; double-click remains an optional compatibility gesture. Descendants are removed from the visible projection, then targets recompute and animate.
- **Path highlighting:** precompute ancestors and visible descendants from adjacency maps. Hover set is `ancestors(node) union descendants(node) union node`; incident path links remain full opacity, unrelated nodes/links dim without changing graph data.
- **Zoom to node:** `centerAt(node.x,node.y,350)` followed by `zoom(targetZoom,350)`.
- **Focus subtree:** compute bounds from target cards, hide or dim external nodes according to mode, then call `zoomToFit(450,padding,node => subtreeIds.has(node.id))`. Escape restores the whole graph.
- **Drag:** free-force delegates directly to the wrapper. Structured layouts allow preview dragging; on release either animate back to the deterministic target or persist a per-layout manual offset. Default is snap-back to preserve diagram semantics.
- **Add/delete:** mutations call the existing `setGraphData`/vault action. Delete requires one policy for descendants (`cascade` or `promote`); implementation defaults to the current hierarchy-safe cascade behavior and recomputes only after the mutation commits.
- **Keyboard/accessibility:** focusable external controls mirror layout, expand/collapse, focus, and zoom actions because canvas content alone is not keyboard-accessible.

## Phased Roadmap

### Phase 1 — Unified Model and Coordinate Engine

- Introduce the contracts, projection indexes, pure math utilities, and `useLayoutEngine`.
- Implement deterministic mindmap, timeline, fishbone, and free-force strategies.
- Add cycle/dangling-parent guards and layout unit tests with invariant checks.
- Update persisted layout names with migration: `tree -> mindmap`, `force -> free-force`.
- Keep the existing renderers temporarily for side-by-side parity checks.

**Exit criteria:** identical inputs produce identical coordinates; all finite-coordinate, non-overlap, chronology, side-balance, and fishbone-angle tests pass.

### Phase 2 — Single ForceGraph2D Canvas Layer

- Create `GraphCanvas` as the only renderer.
- Add custom card nodes, wrapping, badges, status marks, pointer areas, all layout-specific links, axes, ticks, spine, ribs, and arrows.
- Preserve current theme/config controls and minimap behavior through a typed ForceGraph ref adapter.
- Route all layouts through `GraphCanvas` from `GraphLeaf`.

**Exit criteria:** all four modes render from the same component; pan, cursor-centered wheel zoom, touch pinch, drag, selection, context menu, and minimap work through ForceGraph2D.

### Phase 3 — Interaction and Animated Transitions

- Add Zustand interaction store and visible-tree projection.
- Implement toggle hit testing, collapse/expand, ancestry highlighting, subtree focus, zoom-to-node, and layout transitions.
- Add reduced-motion handling and interruption-safe transition cancellation.
- Connect add/delete operations without duplicating vault state.

**Exit criteria:** rapid layout switching does not jump, leak animation frames, or leave stale `fx/fy`; collapse and mutations preserve selection safely; highlight traversal is `O(V+E)` preprocessing and `O(path size)` per hover.

### Phase 4 — Remove Parallel Renderer and Direct D3 Dependencies

- Delete `CanvasGraph`, `layout.worker.ts`, D3-backed `layouts.ts`, and D3-backed `linkRouter.ts` after parity is proven.
- Remove direct runtime dependencies `d3-force`, `d3-hierarchy`, `d3-path` and dev dependencies `@types/d3-force`, `@types/d3-hierarchy`, `@types/d3-path`.
- Remove direct application calls that configure force objects via `d3Force`; retain only ForceGraph2D public APIs. `react-force-graph-2d` may continue using its own transitive force dependencies internally.
- Remove the renderer toggle and obsolete per-depth mixed-layout rules unless converted into a separately scoped future feature.

**Exit criteria:** repository search has no direct `d3-*` imports or `d3Force(...)` usage; package manifest has no direct D3 entries; one graph renderer remains; build and type checks pass.

## Verification Strategy

- **Unit:** subtree weights, side balancing, radial sectors, date normalization, lane collision, fishbone angles/attachments, cycle handling, path traversal, text wrapping, easing endpoints.
- **Property tests:** every visible node has finite coordinates; no duplicate category anchors; timeline X order is monotonic; structured layouts retain exact final `fx/fy`; bounds include measured cards.
- **Visual fixtures:** shallow/deep mindmap, multi-root forest, equal dates, missing dates, dense timeline, odd/even fishbone categories, long labels, collapsed branches, dark/light themes.
- **Browser checks:** switch all modes repeatedly; drag; click toggle; hover pathways; add/delete; focus/escape; zoom-to-node; resize; mobile touch pinch. Capture desktop and mobile screenshots and verify no overlaps in representative fixtures.
- **Performance budgets:** transition holds 55+ FPS at 1,000 nodes on target desktop; no per-frame React state update; layout is linear except stable sorts (`O(V log V)`); hover never recursively scans the raw node array.
- **Regression:** selection still opens notes, link creation remains functional, filters affect nodes and links consistently, minimap viewport remains synchronized, and the console has no update-depth, passive-wheel, or stale-animation errors.

## Key Risks and Controls

- **ForceGraph mutates graph objects:** maintain one render-model identity per source revision; never pass frozen vault objects directly.
- **Fixed coordinates can conflict with drag/simulation:** define mode-specific release behavior and keep transition writes in one controller.
- **Canvas controls are not native DOM:** mirror essential actions in accessible controls and enlarge pointer paint regions.
- **Very dense deterministic layouts exceed viewport:** layout in graph-space, compute bounds, and fit the camera rather than compressing cards until unreadable.
- **Metadata does not always identify an effect/category/date:** use documented deterministic fallbacks and surface invalid fields in settings without breaking rendering.

## Definition of Done

- `react-force-graph-2d` is the sole graph rendering and interaction wrapper for every mode.
- Mindmap, timeline, fishbone, and free-force modes are selectable and persist across reloads.
- Structured layouts are deterministic, card-aware, collapsible, highlightable, focusable, and smoothly animated through `fx/fy`.
- Direct D3 packages/imports and the parallel custom canvas/worker renderer are removed.
- Tests, type checks, build, console inspection, and responsive interaction checks pass.
- The approved blueprint exists as root-level `plan.md`, matching this plan.
