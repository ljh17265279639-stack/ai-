# Phase 1.3 Startup Fix

The previous first-launch path could wait indefinitely on raw.githubusercontent.com.

This revision changes startup only; the approved Saturn composition and Dynamic Deep Space scene are unchanged.

- First launch downloads only the minimum local runtime pack: Three.js + standard 2K Saturn/ring textures.
- Three.js uses multiple mirrors with short connection/overall timeouts and automatic failover.
- GitHub Raw is the final fallback, not the first dependency.
- 4K/8K textures are optional and no longer block startup. Use DOWNLOAD_HD_TEXTURES.cmd when desired.
- After preparation, runtime remains fully local: importmap + native ESM, no CDN requests from index.html.

## Startup resilience v2
- The real Saturn ring PNG is no longer a hard startup dependency.
- Primary mirror: Simple Space Data (mirror of Solar System Scope, CC BY 4.0 source attribution retained).
- If all ring mirrors fail, the site starts with a clearly marked procedural fallback instead of aborting.
- `RETRY_REAL_RING.cmd` can be run later to replace the fallback with the real local PNG.
