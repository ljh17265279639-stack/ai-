# Phase 1 hotfix

## Why the previous archive showed no 3D background
- `index.html` was opened through `file://` while the background uses native ESM + importmap.
- Browser module security blocked `js/space-scene.js` and local module imports.
- Three.js / astronomy textures are intentionally local runtime files and had not yet been prepared.

## Fixes
- Added `START_PIXEL_STAR.cmd`: first-run asset preparation + local static-server launch.
- Added `serve_static.ps1`: dependency-free Windows static file server for local preview only.
- Added a visible `file://` warning instead of silent black background.
- Corrected Saturn ring UVs: radius maps across the texture strip; V remains centred so ring bands stay concentric.

The deployed site remains a pure static site with `index.html` as its entry point.
