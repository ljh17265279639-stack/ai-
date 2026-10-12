# Phase 1 · 3D background foundation

Completed in code:
- Native ESM + importmap entry for Three.js.
- New WebGL background isolated from the task/calendar/goal data layer.
- Renderer: antialias, sRGB output, ACESFilmicToneMapping, exposure 1.05, black scene background.
- DPR cap: desktop <= 2, mobile <= 1.5.
- Camera near plane: 0.002.
- Sparse fixed 3D star field; no nebula panorama.
- Saturn sphere and custom parametric XZ ring geometry.
- Saturn and rings share one 27-degree tilted parent group.
- Ring UVs map the long strip by radius.
- Ring material: DoubleSide, alphaTest 0.04, depthWrite false.
- Saturn self-rotation uses a real 10.55-hour period ratio mapped onto a visual Earth-day timescale.
- Texture manager: Promise cache, retry, Standard/4K/8K fallback chain, sRGB/data-map handling hook, anisotropy capped at 8.
- Existing motion pause / prefers-reduced-motion now also pauses the 3D rotation.

Scope intentionally excluded per latest decision:
- No ten-body solar-system catalogue.
- No Sun + eight planets + Moon implementation.
- No Earth three-layer system.

Run `prepare_phase1_assets.cmd` once on Windows to place the verified local vendor/assets, then serve this directory as a static site and open `index.html`.
