import * as THREE from 'three';

const QUALITY_ORDER = ['standard', '4k', '8k'];
const TEXTURE_PATHS = Object.freeze({
  standard: Object.freeze({
    saturn: './assets/textures/standard/saturn.jpg',
    saturnRing: './assets/textures/standard/saturn_ring.png'
  }),
  '4k': Object.freeze({
    saturn: './assets/textures/4k/saturn.jpg',
    saturnRing: './assets/textures/4k/saturn_ring.png'
  }),
  '8k': Object.freeze({
    saturn: './assets/textures/8k/saturn.jpg',
    saturnRing: './assets/textures/8k/saturn_ring.png'
  })
});


function createFallbackSaturnRingTexture() {
  const width = 2048;
  const height = 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  const image = ctx.createImageData(width, height);

  // Structural fallback only. It is NOT presented as astronomical imagery.
  // Radial zones roughly follow Saturn's main D/C/B/Cassini/A ring regions.
  // The real Solar System Scope alpha strip remains the preferred source.
  const stops = [
    [0.00, 0.16, [55, 43, 39], 0.05],
    [0.16, 0.35, [112, 91, 77], 0.34],
    [0.35, 0.69, [184, 157, 129], 0.86],
    [0.69, 0.75, [42, 31, 28], 0.10],
    [0.75, 0.95, [154, 127, 104], 0.72],
    [0.95, 1.00, [91, 69, 57], 0.22]
  ];

  const sampleZone = (t) => {
    for (const [a, b, rgb, alpha] of stops) {
      if (t >= a && t <= b) return { a, b, rgb, alpha };
    }
    return { a: 0, b: 1, rgb: [120, 100, 84], alpha: 0.4 };
  };

  for (let x = 0; x < width; x += 1) {
    const t = x / (width - 1);
    const zone = sampleZone(t);
    const local = (t - zone.a) / Math.max(0.0001, zone.b - zone.a);
    const fine = 0.72 + 0.18 * Math.sin(t * 880.0) + 0.10 * Math.sin(t * 2270.0 + 1.3);
    const broad = 0.88 + 0.12 * Math.sin(t * 72.0 + 0.4);
    const edgeFade = Math.min(1, local * 10, (1 - local) * 10);
    const alpha = Math.max(0, Math.min(1, zone.alpha * fine * broad * (0.42 + 0.58 * edgeFade)));

    const warm = 0.90 + 0.10 * Math.sin(t * 133.0);
    const r = Math.max(0, Math.min(255, zone.rgb[0] * warm));
    const g = Math.max(0, Math.min(255, zone.rgb[1] * (0.97 + 0.03 * Math.sin(t * 81.0 + 0.8))));
    const b = Math.max(0, Math.min(255, zone.rgb[2]));

    for (let y = 0; y < height; y += 1) {
      const i = (y * width + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.userData.pixelStarFallback = true;
  return texture;
}

export class TextureManager {
  constructor(renderer, { retries = 2 } = {}) {
    this.renderer = renderer;
    this.retries = retries;
    this.loader = new THREE.TextureLoader();
    this.promiseCache = new Map();
    this.maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
  }

  getQualityChain(requested = 'standard') {
    const idx = Math.max(0, QUALITY_ORDER.indexOf(requested));
    return QUALITY_ORDER.slice(0, idx + 1).reverse();
  }

  async loadSet(requested = 'standard') {
    const qualityChain = this.getQualityChain(requested);
    let lastError = null;

    for (const quality of qualityChain) {
      try {
        // Saturn's globe texture remains required.
        const saturn = await this.loadTexture(TEXTURE_PATHS[quality].saturn, { color: true });

        // The real Solar System Scope ring PNG is preferred, but a missing PNG must
        // never prevent the whole site from booting. If every requested/local tier
        // misses the ring asset, create a deterministic geometry-compatible fallback.
        let saturnRing;
        let ringSource = 'real';
        try {
          saturnRing = await this.loadTexture(TEXTURE_PATHS[quality].saturnRing, { color: true });
        } catch (ringError) {
          console.warn(`[PIXEL STAR] ${quality} Saturn ring PNG unavailable; using local procedural fallback.`, ringError);
          saturnRing = createFallbackSaturnRingTexture();
          ringSource = 'fallback';
        }

        return { quality, saturn, saturnRing, ringSource };
      } catch (error) {
        lastError = error;
        console.warn(`[PIXEL STAR] ${quality} Saturn globe texture failed, preparing downgrade.`, error);
      }
    }

    throw lastError || new Error('No local Saturn globe texture could be loaded.');
  }

  loadTexture(url, { color = false } = {}) {
    const cacheKey = `${url}|${color ? 'srgb' : 'linear'}`;
    if (this.promiseCache.has(cacheKey)) return this.promiseCache.get(cacheKey);

    const promise = this.#loadWithRetry(url, this.retries)
      .then(texture => {
        texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = this.maxAnisotropy;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        return texture;
      })
      .catch(error => {
        this.promiseCache.delete(cacheKey);
        throw error;
      });

    this.promiseCache.set(cacheKey, promise);
    return promise;
  }

  async #loadWithRetry(url, retries) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await this.loader.loadAsync(url);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 180 * (attempt + 1)));
        }
      }
    }
    throw new Error(`Texture load failed after ${retries + 1} attempts: ${url}`, { cause: lastError });
  }
}

export function chooseDefaultQuality() {
  const saved = localStorage.getItem('pixelStarTextureQuality');
  if (QUALITY_ORDER.includes(saved)) return saved;
  return 'standard';
}
