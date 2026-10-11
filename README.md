# @n3rdw1z4rd/engine-editor

A browser-first, mobile-friendly scene editor for [`@n3rdw1z4rd/engine`](https://github.com/n3rdw1z4rd/engine): Godot-style editing of Three.js scenes, usable on a phone as well as a desktop.

Built with Vite, TypeScript, [Preact](https://preactjs.com) and [`@preact/signals`](https://preactjs.com/guide/v10/signals/). The 3D viewport is plain Three.js driven by the engine; Preact only renders the panels around it.

> Status: early prototype. Edits aren't undoable or saved yet (see Roadmap).

## Features

- **Scene tree** of game objects, with attached objects nested under their parent.
- **Inspector** built from each script's `@field` metadata: sliders, number inputs, checkboxes, color pickers, object references. Data components are shown read-only.
- **Viewport** with an editor camera separate from the game's cameras: orbit, pan and pinch-zoom by touch or mouse; tap to select; Move / Rotate / Scale gizmo with larger handles on touch screens.
- **Play / Stop**: runs the scripts through the scene's own camera, then restores every transform and field value on Stop.
- **Console** showing script errors (a throwing script is disabled, the rest keep running) and anything scripts log.
- **Layouts for every screen** (container queries):
  - wide (≥ 900 px): panels docked around the viewport
  - phone portrait: one tabbed bottom sheet that snaps to peek, half or full
  - phone landscape: the sheet docks to the side
  - full screen: every panel hidden, with a floating **UI** button to bring them back
- Pointer events only, `100dvh`, safe-area insets for notches, and 44 px touch targets on coarse pointers.

## Getting started

Until `@n3rdw1z4rd/engine` is published, the editor depends on a sibling checkout (`"file:../engine"`):

```
n3rdw1z4rd/
├── engine/          https://github.com/n3rdw1z4rd/engine
└── engine-editor/   ← this repo
```

```bash
git clone https://github.com/n3rdw1z4rd/engine
git clone https://github.com/n3rdw1z4rd/engine-editor

cd engine && npm install          # its `prepare` script builds dist/ (needed for the Vite plugin)
cd ../engine-editor && npm install
npm run dev                       # http://localhost:5173, and on your LAN for testing on a phone
```

Requires Node `^20.19.0 || >=22.12.0` (Vite 8).

### How the two repos connect

| Concern | How |
| --- | --- |
| Engine code | Resolved to the engine's **TypeScript source** through its `"n3rdw1z4rd-source"` export condition (`resolve.conditions` in `vite.config.ts`, `customConditions` in `tsconfig.json`). Engine edits hot-reload here with no engine build. |
| `@field` decorators | `decorators()` from `@n3rdw1z4rd/engine/vite`, loaded from the engine's `dist/`. Re-run `npm run build` in `engine/` only when the plugin itself changes. |
| Shared libraries | `resolve.dedupe` keeps one copy each of `three`, `@n3rdw1z4rd/core`, `preact` and `@preact/signals`, even though the sibling engine has its own `node_modules`. Without it the bundle nearly doubles and `instanceof` checks between engine and editor objects fail. |

Once the engine is on npm, change `"@n3rdw1z4rd/engine": "file:../engine"` to a version range. Nothing else changes; the published package ships its `src/` for the source condition.

## Controls

| Action | Touch | Mouse / keyboard |
| --- | --- | --- |
| Orbit · pan · zoom | one finger · two fingers · pinch | drag · right-drag · wheel |
| Select | tap an object, or a row in Scene | click |
| Open in Inspector | — | double-click a row in Scene |
| Move · Rotate · Scale | toolbar | `W` · `E` · `R` |
| Play / Stop | toolbar | `P` / `Esc` |
| Deselect | — | `Esc` (while editing) |
| Delete selection | Inspector → Delete | `Delete` / `Backspace` |
| Full screen | ⛶, then the **UI** button | `F` |
| Resize the bottom sheet | drag or tap its handle | — |

## Project structure

```
src/
├── main.tsx          entry: console capture, keyboard shortcuts, render <App/>
├── editor.ts         everything that touches the engine: camera, picking, gizmo, Play/Stop, edits
├── state.ts          editor signals: selection, playing, layout, logs
├── styles.css        tokens + the three layouts (container queries)
├── ui/
│   ├── App.tsx       toolbar, viewport, bottom sheet, full screen
│   ├── SceneTree.tsx
│   ├── Inspector.tsx fields from @field metadata
│   └── Console.tsx
└── demo/
    ├── scene.ts      demo scene from core prefabs (AsteroidMesh, CreateStarfield)
    └── scripts.ts    Spin, Bob, LookAt, Tag
```

UI components never change the scene themselves. They call functions in `editor.ts` (`setField`, `setTransform`, `rename`, …), which is where the undo stack will hook in.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (editor and engine source). |
| `npm run typecheck` | Type-check without emitting. |
| `npm run build` | Type-check, then a static build in `dist/`. |
| `npm run preview` | Serve `dist/` locally. |

## Roadmap

1. Undo/redo: a command stack behind the `editor.ts` edit functions.
2. Scene save/load: JSON with stable ids, object references and asset paths; prefabs. Play then runs a disposable copy instead of snapshot/restore.
3. In-editor scripting: CodeMirror 6 + esbuild-wasm, hot reload that keeps `@field` values.
4. Projects in the browser (OPFS, zip import/export), installable PWA, and game export.

## Known issues

- `src/demo/scene.ts` shims `rng.nextFloat` because `AsteroidMesh` in `@n3rdw1z4rd/core` 0.18.4 calls it unbound and throws. Remove the shim once core is fixed.
- The production bundle is ~720 KB (190 KB gzipped). Most of it is Three.js; ~100 KB is core, which doesn't tree-shake yet.

## License

MIT © n3rdw1z4rd
