# SlideForge Installation Guide

Copy these files to replicate the project (excluding demo slides and boilerplate).

## Files to Copy

### Core Pages
- `src/pages/Index.tsx`
- `src/pages/AudienceWindow.tsx`

### Layout Components
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Toolbar.tsx`

### Slide Components
- `src/components/slides/SlideCanvas.tsx`
- `src/components/slides/SlideGrid.tsx`
- `src/components/slides/SlideLayout.tsx`
- `src/components/slides/SlideThumbnail.tsx`
- `src/components/slides/MSSlideLayout.tsx`
- `src/components/slides/PresentationMode.tsx`
- `src/components/slides/PresenterView.tsx`
- `src/components/slides/PresenterNotesPanel.tsx`
- `src/components/slides/FloatingMenu.tsx`
- `src/components/slides/SlideOverviewGrid.tsx`
- `src/components/slides/TemplatePicker.tsx`

### Hooks
- `src/hooks/usePresenterNotes.ts`
- `src/hooks/usePresenterSync.ts`

### Types
- `src/types/slide.ts`

### Styling & Config
- `src/index.css`
- `tailwind.config.ts`

### App Router
- `src/App.tsx`

### Agent Instructions
- `.lovable/system.md`

## Database Setup

Run this migration for presenter notes:

```sql
CREATE TABLE public.presenter_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slide_id TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.presenter_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to presenter_notes" 
ON public.presenter_notes FOR ALL USING (true);
```

## Create Your Slides

Create `src/slides/yourproject/index.ts`:

```ts
import Slide01 from './Slide01Title';

export const yourSlides = [
  { component: Slide01, name: 'Title', template: 'title' },
];
```

Then update `Index.tsx` to import your slides instead of demo slides.
