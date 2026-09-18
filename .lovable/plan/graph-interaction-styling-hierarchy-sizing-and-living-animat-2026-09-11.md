# Graph interaction, styling, hierarchy sizing, and living animation

## Goal
Improve both the Force graph and the Canvas projections without removing `react-force-graph-2d` or bypassing the existing graph settings.

## Changes

### 1. Correct node click behavior
- Make a single click select the node in both graph renderers.
- Make a double click expand or collapse nodes that have children.
- Preserve drag, pan, hover tooltip, link-creation, and context-menu behavior.
- Cancel the pending single-click action when the second click arrives, preventing select/collapse conflicts.

### 2. Fix hierarchy and default link colors
- Repair the shared color-opacity conversion so CSS-variable HSL colors remain valid on Canvas.
- Support theme colors, hex colors, RGB/HSL colors, and opacity consistently.
- Keep hierarchy, backlink, tag, semantic, and default link styles connected to the existing settings.
- Normalize legacy `hierarchical` links to the current `hierarchy` style key where graph data enters the shared model.

### 3. Add hierarchy-level node sizing
- Add persisted node settings for enabling hierarchy sizing and choosing the size interval between levels.
- Calculate each node’s radius from its base size and hierarchy depth, with a safe minimum.
- Apply the same sizing formula to Force, Timeline, Tree, and Fishbone views.
- Use the calculated radius for drawing, collisions, hit testing, labels, and link boundary anchoring.
- Add the controls to the existing Nodes settings section.

### 4. Add Living Graph animation
- Add a persisted Play/Pause setting in the graph engine settings.
- Show an icon Play/Pause toggle beside Force, Timeline, Tree, and Fishbone controls.
- In Force mode, Play continuously reheats/resumes the D3-powered simulation; Pause freezes it.
- In the other projections, Play adds restrained living motion and animated link flow without changing the structural layout.
- Respect reduced-motion preferences and keep animation state synchronized between the graph toolbar and settings.

## Technical details
- Update the shared graph and engine stores rather than introducing renderer-only settings.
- Reuse the existing Button, Switch, Slider, Tooltip, and semantic color system.
- Keep `react-force-graph-2d` as the Force renderer while parity work continues.
- Update both `CanvasGraph` and `NetworkGraph`; route all sizing and color behavior through shared helpers.
- Add focused tests for color conversion, depth sizing, and click timing where the current test setup supports them.

## Validation
- Run the project typecheck and relevant tests.
- Exercise both renderers with a local graph fixture.
- Confirm single-click selection, double-click collapse/expand, editable hierarchy colors, level-based sizing, spacing control, Play/Pause, zoom, pan, drag, and tooltips.
- Check desktop and mobile-sized graph controls for overlap and readable labels.
