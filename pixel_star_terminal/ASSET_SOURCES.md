# PIXEL STAR · Phase 1 asset sources

## Three.js
- Version line used: r186
- Source: https://github.com/mrdoob/three.js
- Runtime files: `vendor/three/three.module.js`, `vendor/three/three.core.js`
- License: MIT (`vendor/three/LICENSE`)

## Saturn / Saturn Ring
- Publisher: Solar System Scope
- Source page: https://www.solarsystemscope.com/textures/
- Files used:
  - `2k_saturn.jpg`
  - `8k_saturn.jpg`
  - `2k_saturn_ring_alpha.png`
  - `8k_saturn_ring_alpha.png`
- License: CC BY 4.0
- Solar System Scope states the pack is based on NASA elevation/imagery data and colors are tuned using spacecraft/Hubble imagery.
- `4k/` files are high-quality downsampled derivatives of the authentic 8K files; no synthetic surface detail is added.

No runtime CDN or remote texture request is used after the local asset preparation step.

### Runtime mirror
For resilience, the 2K Solar System Scope Saturn ring alpha may also be fetched from Simple Space Data's public mirror:
`https://www.simplespacedata.org/texture/solarsystemscope/saturn_ring_alpha/latest/2k_saturn_ring_alpha.png`
The mirrored asset remains attributed to Solar System Scope under CC BY 4.0.
