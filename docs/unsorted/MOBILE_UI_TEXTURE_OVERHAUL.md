# Mobile-First UI Texture Overhaul

## Goal
Unify the UI with a playful, game-inspired, mobile-first style using SVG-based textures and shared styles. Prioritize clean visuals, performance, and broad consistency across all components.

## Approach
- **SVG Texture Library**: Use a modern SVG texture/background library (e.g., Hero Patterns, SVG Backgrounds, react-svg-texture)
- **Tailwind Integration**: Configure Tailwind CSS for SVG backgrounds and shared style tokens (colors, borders, radii)
- **Shared Styles**: Centralize style definitions for easy reuse and consistency
- **Component Refactor**: Apply textures and shared styles to all major UI containers/components, focusing on mobile-first layout and touch targets
- **Playful Iconography**: Integrate a fun icon set for UI elements
- **Style Guide**: Create a demo/reference page for textures, icons, and shared styles

## Implementation Steps
1. **Research and select SVG texture library**
2. **Integrate SVG backgrounds with Tailwind CSS**
3. **Define shared style system (colors, radii, borders, etc.)**
4. **Refactor UI components for mobile-first, textured design**
5. **Add playful iconography**
6. **Create style guide/demo page**

## Notes
- No dark/light mode; single clean style only
- SVG backgrounds should be inlined for mobile performance
- Accessibility: ensure contrast and tap targets
- Animation phase will follow after texture overhaul

---

## Example Libraries
- [Hero Patterns](https://heropatterns.com/)
- [SVG Backgrounds](https://www.svgbackgrounds.com/)
- [react-svg-texture](https://github.com/pmndrs/react-texture)
- [Phosphor Icons](https://phosphoricons.com/)
- [Iconoir](https://iconoir.com/)

## References
- Tailwind CSS [Customizing](https://tailwindcss.com/docs/customizing-colors)
- Mobile-first [Best Practices](https://web.dev/mobile-first/)
