---
'@loopstack/loopstack-studio': minor
---

Studio ships light and dark themes built on the IntelliJ palettes, with a theme toggle in the sidebar footer. The choice persists in `localStorage` under `loopstack:theme` (dark by default) and is applied by an inline script in `index.html` before first paint, so reloading doesn't flash the wrong theme. A `ThemeProvider` owns the state and toggles the `dark` class on `<html>`; the component tokens, workflow diagram, Mermaid diagrams and Prism syntax highlighting all resolve against the active theme.
