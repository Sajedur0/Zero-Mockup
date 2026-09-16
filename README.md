# Zero Mockup

A private, client-side screenshot design studio for Google Play marketing assets. Built with React, TypeScript, Vite and Konva, with a responsive desktop editor, tablet drawer and mobile bottom sheets.

## Run

Requires Node.js 22+.

```bash
npm ci
npm run dev
```

The dev server listens on `0.0.0.0:5173` and accepts preview proxy hosts. No API keys, accounts or backend services are needed.

```bash
npm run build       # Type-check and build the static site into dist/
npm run check       # Strict TypeScript checks
npm test            # Model, import-validation and perspective-projection tests
npm run test:e2e    # Playwright editor integration tests
```

For browser tests, install Chromium with `npx playwright install --with-deps chromium`. An existing Chromium executable can be used through `CHROMIUM_PATH=/path/to/chromium npm run test:e2e`. The tests start the dev server automatically if one is not already running.

Deploy the generated `dist/` directory to any static hosting provider. All fonts, icons and demo artwork are bundled locally; no Google Fonts request is needed at runtime.

## Start designing

1. Start with the editable **Bloom** demo or choose **New project** from the project menu.
2. Pick a template, or add text, a frame, shapes, icons and uploaded artwork from the tool rail.
3. Use **Frames → Upload a screenshot** to replace a device's screen. Select a particular device first when a page contains several frames.
4. Select objects on the canvas to edit their properties. Double-click text to focus its text editor. Hold Shift, draw a selection rectangle, or enable Select mode to select multiple objects.
5. Adjust the background and page dimensions when no object is selected.
6. Use **Export** for a single PNG/JPG or a ZIP of every page. **Save project** downloads editable JSON, including uploaded images and the brand kit.

On mobile, **Tools** opens a bottom sheet with horizontally scrollable tool categories. **Properties** edits the current page/selection, and **Layers** exposes objects that are difficult to tap on the canvas. Pinch to zoom; two fingers pan the canvas. Undo/redo remain available in the top toolbar.

## Implemented

- Multiple artboards, custom pixel dimensions, phone/tablet/feature-graphic/icon presets, page duplicate/delete and fit/zoom/pan.
- Solid colors, linear/radial gradients with 2–6 evenly spaced color stops and angle, uploaded backgrounds with opacity/blur, dots/grid/waves patterns.
- Android, iPhone-style and frameless devices; automatic cover-cropping of screenshots; frame colors, radius, rotation, shadow, and cached 3D Y-axis perspective projection.
- Unicode text, bundled Google font families including **Noto Sans Bengali**, size/style/color/alignment, spacing, line height, outline/shadow and explicit auto-fit.
- Rectangle, circle, line, arrow, star, sparkle, blob, text badges, image/logo uploads and a lazily loaded searchable Lucide icon library.
- Layer selection and rename (double-click), visibility/lock, four stacking operations, grouping/ungrouping.
- Drag, resize and rotate handles; group transforms; box/Shift/Select-mode selection; center snapping guides; page alignment and three-object distribution; copy/paste, duplicate, delete and keyboard nudging.
- Exact-canvas-size PNG and maximum-quality JPG; optional transparent PNG; all-pages ZIP export. Editor guides and selection handles are excluded from exports.
- Browser autosave, editable JSON save/import with validation, a 70-step undo/redo history, brand colors/font, dark/light theme and a UI-free page preview.
- Screenshot/image brightness, contrast and saturation controls.
- Resizable and collapsible desktop panels, combined tablet drawers and mobile bottom sheets.

## Keyboard shortcuts

Use Command on macOS or Control on Windows/Linux.

| Action                   | Shortcut                        |
| ------------------------ | ------------------------------- |
| Undo / redo              | Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y |
| Copy / paste / duplicate | Ctrl+C / Ctrl+V / Ctrl+D        |
| Select all / deselect    | Ctrl+A / Escape                 |
| Group / ungroup          | Ctrl+G / Ctrl+Shift+G           |
| Delete                   | Delete or Backspace             |
| Nudge / large nudge      | Arrow / Shift+Arrow             |
| Zoom in / out / fit      | Ctrl+Plus / Ctrl+Minus / Ctrl+0 |
| Select / pan tool        | V / H                           |
| Save editable project    | Ctrl+S                          |
| Search templates         | Ctrl+K                          |
| Shortcut reference       | ?                               |

Copy/paste is a private editor clipboard and does not read the system clipboard.

## Storage, limits and current scope

- Projects and uploads are processed in the browser. Autosave uses `localStorage`, normally 600 ms after the last edit, and also saves on page exit. When storage is unavailable/full, the header warns you to download a project file. **For image-heavy projects, save a JSON file rather than relying only on browser storage.** Clearing browser data deletes the autosave.
- Maximum 30 pages, canvas sides 100–8000 px, individual image uploads up to 15 MB. Browser memory/canvas limits still apply, especially to very large exports on low-memory mobile devices. Large images can exceed the browser's local-storage quota before the upload size limit is reached.
- Imported projects must be version-1 Zero Mockup JSON with self-contained data-URL images. Remote image URLs are intentionally rejected. Imports are not a general Figma/Canva file importer.
- Canvas dimensions are never downscaled at export. Uploaded raster images still have their original pixel density; enlarging a small source cannot recover detail. PNG is lossless; JPG remains inherently lossy even at maximum quality.
- Gradients currently use evenly spaced stops. Text auto-fit is an explicit action, not a continuously running layout system. Perspective is a projected flat device surface, not a volumetric hardware model.
- The included font selection is curated and bundled, rather than a live search across the entire Google Fonts catalog. Curved text, nested groups, measurement rulers, custom SVG-path editing, cloud collaboration and a service-worker offline installation are not implemented.
- Play Store requirements vary by asset type and can change. Presets are a starting point, not an automatic submission validator.
- Browser tests cover Chromium at desktop and mobile viewport sizes. Real-device Safari/Firefox testing is still recommended before a public launch.

## Structure

- `src/App.tsx` — editor orchestration, keyboard/gesture commands, file I/O and export workflow.
- `src/Artboard.tsx` — Konva scene, backgrounds, devices, selection, transforms and snapping.
- `src/perspective.ts` — camera projection and cached device texture warping.
- `src/Library.tsx` / `src/IconLibrary.tsx` — template, text, device, asset, icon, brand and layer libraries.
- `src/Inspector.tsx` / `src/ui.tsx` — property controls and accessible modal primitives.
- `src/model.ts` — serializable document schema, import validation, presets and original demo artwork.
- `src/useProject.ts` — undo/redo and local persistence.
- `src/fonts.css` / `src/styles.css` — bundled fonts, responsive layouts and themes.
- `src/*.test.ts` / `tests/editor.spec.ts` — unit and browser integration tests.

Lucide icons are ISC-licensed. Font families distributed through Fontsource retain their respective SIL Open Font Licenses. Bloom is fictional demonstration artwork included to make the editor immediately usable.
