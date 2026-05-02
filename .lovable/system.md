# SlideForge Agent System Guide

This document describes how Lovable should handle slide editing for SlideForge.

---

## Design System Selection

**Choose a design approach based on the user's request:**

### Serious / Corporate / Professional
Use the default **Carbon-inspired** system (IBM blue/navy):
- Deep blues and grays
- Minimal imagery
- Clean typography
- Data-focused layouts
- **Triggers**: business, finance, enterprise, consulting, reports, analytics

### Playful / Creative / Marketing
Switch to a **vibrant, colorful** approach:
- Bold accent colors (pick based on brand or ask user)
- Generous use of images and illustrations
- Rounded shapes, more whitespace
- Larger headlines, smaller data
- **Triggers**: startup, product launch, social, creative, fun, brand, marketing

### Branded / Company-Specific
Ask the user for brand colors and apply them:
- Replace `--slide-accent` and `--slide-primary` in component styles
- Match their brand fonts if provided
- **Triggers**: user mentions company name, asks for brand colors

**IMPORTANT**: Always ask the user or infer from context. Don't assume corporate for everything.

---

## Tokenization Rules (CRITICAL)

**ALL values must use design tokens. No hardcoded values.**

### Colors - ALWAYS use tokens
```tsx
// ✅ CORRECT
className="text-slide-gray-900 bg-slide-accent"
className="text-white bg-slide-primary"
className="border-slide-gray-200"

// ❌ WRONG - Never hardcode
className="text-gray-900 bg-blue-500"
style={{ color: '#003366' }}
fill="#2196F3"
```

### Typography - ALWAYS use type classes
```tsx
// ✅ CORRECT
<h1 className="type-h1">Title</h1>
<p className="type-body">Text</p>
<span className="type-label">Label</span>

// ❌ WRONG - Never use raw sizes
<h1 className="text-5xl font-bold">Title</h1>
```

### Spacing - Use slide tokens
```tsx
// ✅ CORRECT
className="p-slide-lg gap-slide-md"
className="px-20 py-16" // Standard slide padding

// ❌ WRONG
className="p-8 gap-6" // Use semantic tokens
```

### Chart Colors - Use CSS variables
```tsx
// ✅ CORRECT
fill="hsl(var(--slide-accent))"
stroke="hsl(var(--slide-primary))"

// ❌ WRONG
fill="#2196F3"
```

---

## Typography Scale (for 1920×1080 slides)

**Minimum font size on slides: 20px (type-caption)**

| Class           | Size    | Usage              |
| --------------- | ------- | ------------------ |
| `.type-display` | 96px    | Hero headlines     |
| `.type-h1`      | 60px    | Section titles     |
| `.type-h2`      | 36px    | Slide titles       |
| `.type-h3`      | 32px    | Card titles        |
| `.type-body-lg` | 28px    | Subtitles          |
| `.type-body`    | 24px    | Default text       |
| `.type-caption` | 20px    | Supporting (min!)  |
| `.type-label`   | 18px    | Metadata only      |
| `.type-metric`  | 48px    | Large numbers      |

**NEVER use text smaller than `type-caption` on slides!**

---

## Workflow Overview

### Creating/Editing Slides

**File Location**: `src/slides/demo/Slide{NN}{Name}.tsx`

**For new slides**:
1. Create file following naming convention
2. Add export to `src/slides/demo/index.ts`
3. Update slides array with component, name, template type

### Required Imports
```tsx
import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
```

### Component Structure
```tsx
export default function Slide{NN}{Name}() {
  return (
    <MSSlideLayout variant="default|dark">
      <div className="flex flex-col h-full px-20 py-16">
        {/* Content */}
      </div>
    </MSSlideLayout>
  );
}
```

---

## Color Tokens

| Token                | Usage                          |
| -------------------- | ------------------------------ |
| `slide-primary`      | Dark backgrounds, primary text |
| `slide-accent`       | Highlights, buttons, links     |
| `slide-accent-muted` | Light accent backgrounds       |
| `slide-gray-900`     | Primary text (light mode)      |
| `slide-gray-600`     | Secondary text                 |
| `slide-gray-400`     | Tertiary/muted text            |
| `slide-gray-200`     | Borders, dividers              |
| `slide-gray-100`     | Light backgrounds              |

---

## Component Classes

```tsx
<div className="slide-card">Basic card</div>
<div className="slide-card-elevated">Card with shadow</div>
<div className="slide-card-accent">Card with accent border</div>
<div className="slide-metric-card">Metric highlight</div>
<span className="slide-badge">Badge</span>
<div className="slide-divider" />
```

---

## Template Patterns

- **Title**: Centered, large title, accent bar, metrics row
- **Three-Up**: Header + 3-column grid with cards
- **Data Viz**: Header + chart area + annotations
- **Timeline**: Horizontal nodes with connections
- **Comparison**: Two columns with matching rows
- **Quote**: Large centered quote with attribution

---

## Charts (Recharts)

```tsx
// Always use CSS variable colors
<Bar dataKey="value" fill="hsl(var(--slide-accent))" />
<Line stroke="hsl(var(--slide-primary))" />
```

---

## Quality Checklist

- [ ] Uses `MSSlideLayout` wrapper
- [ ] ALL colors use design tokens
- [ ] ALL typography uses `.type-*` classes
- [ ] No text smaller than `type-body-sm`
- [ ] Standard slide padding: `px-20 py-16`
- [ ] Charts use CSS variable colors
- [ ] Export added to index.ts

---

## Scaling Considerations

Slides render at 1920×1080 and scale via CSS `transform`. For WebGL/Canvas:
- Use fixed pixel dimensions
- Add `dpr={1}` to Canvas
- Add `resize={{ scroll: false, offsetSize: true }}`

---

## Animation Guidelines

- **Avoid unnecessary animations.** Slides should feel crisp and immediate, not bouncy or distracting.
- Do NOT add entrance animations, hover transitions, or decorative motion unless the user explicitly requests it.
- Functional animations (e.g., chart transitions, 3D orbit controls, explicit user-triggered interactions) are fine.
- Never add `animate-`, `transition-`, `hover:scale-`, or `group-hover` effects by default.
- Prefer static, high-contrast layouts that communicate instantly over animated ones.

---

## IMPORTANT NOTES

1. After remix, help users create their own presentations
2. If user wants different design system, update this file
3. **ALWAYS tokenize everything** - no hardcoded colors, sizes, or spacing
