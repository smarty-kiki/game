// Loads everything the game needs, with progress, and hands it out by name.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// A dropped connection or a failed response cached by the browser should not end the run:
// retry twice with a fresh URL (the query string also sidesteps a cached failure).
const ATTEMPTS = 3;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function retry(load) {
  let error;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try { return await load(attempt); }
    catch (err) {
      error = err;
      if (attempt + 1 < ATTEMPTS) await pause(400 * (attempt + 1));
    }
  }
  throw error;
}
function retryUrl(url, attempt) {
  if (!attempt) return url;
  const u = new URL(url, location.href);
  u.searchParams.set('retry', String(attempt));
  return u.href;
}

export class Assets {
  constructor() { this.map = new Map(); this.gltfLoader = new GLTFLoader(); this.texLoader = new THREE.TextureLoader(); }
  /**
   * manifest: { name: 'path.glb' | 'path.webp' | 'path.json' | 'path.m4a' | { url, type: 'gltf'|'texture'|'json'|'buffer', srgb?, repeat?, optional? } }
   * onProgress(fraction, name)
   */
  async load(manifest, onProgress = () => {}) {
    const entries = Object.entries(manifest).map(([name, v]) => [name, typeof v === 'string' ? { url: v } : v]);
    let done = 0;
    await Promise.all(entries.map(async ([name, e]) => {
      const type = e.type || (/\.(glb|gltf)$/i.test(e.url) ? 'gltf' : /\.(png|jpe?g|webp)$/i.test(e.url) ? 'texture' : /\.json$/i.test(e.url) ? 'json' : 'buffer');
      try {
        let value;
        if (type === 'gltf') value = await retry((attempt) => this.gltfLoader.loadAsync(retryUrl(e.url, attempt)));
        else if (type === 'texture') {
          value = await retry((attempt) => this.texLoader.loadAsync(retryUrl(e.url, attempt)));
          if (e.srgb !== false) value.colorSpace = THREE.SRGBColorSpace;
          if (e.repeat) { value.wrapS = value.wrapT = THREE.RepeatWrapping; }
          value.anisotropy = 8;
        } else if (type === 'json') value = await retry((attempt) => fetch(retryUrl(e.url, attempt)).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + e.url); return r.json(); }));
        else value = await retry((attempt) => fetch(retryUrl(e.url, attempt)).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + e.url); return r.arrayBuffer(); }));
        this.map.set(name, value);
      } catch (err) {
        if (!e.optional) throw new Error(`could not load "${name}" (${e.url}): ${err.message || err}`);
        console.warn(`optional asset "${name}" is missing (${e.url})`);
      }
      onProgress(++done / entries.length, name);
    }));
  }
  has(name) { return this.map.has(name); }
  get(name) { const v = this.map.get(name); if (v === undefined) throw new Error(`no asset named "${name}"`); return v; }
  gltf(name) { return this.get(name); }
  texture(name) { return this.get(name); }
  json(name) { return this.get(name); }
  buffer(name) { return this.get(name); }
}
