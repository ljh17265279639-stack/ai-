# Phase 1 · Saturn visual upgrade

Reference target supplied by the user:
https://solar-system-overview-web.ok.kimi.link/

This revision deliberately copies **no UI or source code** from the reference site. It uses the reference only as an art-direction quality bar for the Saturn hero visual.

## Visual changes
- Large full-view Saturn portrait; complete ring remains inside the viewport.
- Realistic Saturn oblateness (polar/equatorial scale ≈ 0.902).
- Axial tilt 26.73° shared by globe and rings.
- 192×128 sphere geometry and 768-segment parameterized ring mesh.
- Strong single warm key light + extremely low fill for a natural terminator.
- Very subtle Fresnel atmospheric limb, geometry-based and texture-independent.
- Sparse, dim fixed stars on a pure-black scene background.
- ACES Filmic tone mapping, exposure 1.05, sRGB output and capped DPR retained.
- Existing real Solar System Scope/NASA-derived Saturn assets and local texture quality manager retained.

## Deliberately not added
- Nebula / Milky Way backdrop.
- Fake baked planet image in place of 3D geometry.
- Extra planets or solar-system navigation.
- Remote runtime CDN dependencies.
