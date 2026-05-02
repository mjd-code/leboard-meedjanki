

# Export Brand Guidelines as PDF

## What We'll Build
A downloadable PDF document containing the complete SlideForge brand guidelines, generated via a Node.js script using `reportlab`-style approach with Python.

## Content Structure
1. **Cover Page** - "SlideForge Brand Guidelines" title
2. **Typography** - IBM Plex Sans (primary), IBM Plex Mono (code), weight usage
3. **Color Palette** - All brand colors with hex values and usage notes:
   - Primary: Deep Navy (#003366)
   - Accent/CTA: #4E93FF
   - Backgrounds: #FCFBF8 (slides), #FFFFFF (cards)
   - Gray scale: 9 steps from #F4F5F7 to #111827
   - Semantic: Success (#27AE60), Warning (#F39C12), Error (#E74C3C)
4. **Spacing & Layout** - 8px grid, standard slide padding (px-20 py-16), 16:9 aspect ratio
5. **Component Patterns** - Cards, badges, dividers, metric cards
6. **Typography Scale** - The slide font scale (20px floor through 144px display)
7. **Animation Policy** - No unnecessary animations
8. **Design Principles** - Clean, accessible, enterprise-grade

## Technical Approach
- Python script using `reportlab` to generate a styled PDF
- Color swatches rendered as filled rectangles
- Output to `/mnt/documents/SlideForge_Brand_Guidelines.pdf`
- QA via `pdftoppm` image conversion and visual inspection

