# Phase 1.2 · Saturn Reference Lock

This pass intentionally discards the previous visual tuning and locks the 3D background to the approved Saturn reference.

## Corrected visual mistakes
- Saturn axial tilt (26.73°) is kept physical, but camera elevation is treated independently.
- The ring colour pass is no longer a grazing-angle MeshStandardMaterial that turns almost black.
- Saturn is rendered before the ring. The ring is rendered afterwards with depth testing so the near half stays visible and the far half is naturally occluded by the globe.
- Ring bands use the authentic local PNG at full opacity; the texture alpha controls gaps instead of lowering the whole disk opacity.
- A slightly offset dark sheet plus thin inner/outer rims gives the ring visible thickness.
- The ring casts an alpha-tested shadow on the globe for physical integration.
- HUD surfaces are near-transparent and no longer blur away the ring detail.

## Art target
- Complete ring ellipse clearly visible.
- Sparse black-space background.
- Ring brighter than Phase 1.1, with deeper brown/grey bands and stronger contrast.
- Globe stays volumetric without overwhelming the ring system.
