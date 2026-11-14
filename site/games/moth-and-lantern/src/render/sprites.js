// Two cheap instanced layers that many systems draw into every frame:
//  - GlowLayer: camera-facing additive glows (lantern halos, wisps, fireflies, sparks)
//  - DecalLayer: flat discs and rings on the ground (soft contact shadows, plinth rings, light pulses)
// Usage per frame: layer.begin(); layer.push(...) from every system; layer.end().
import * as THREE from 'three';
import { G } from './materials.js';

function quadGeometry(max) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const a = new Float32Array(max * 4), b = new Float32Array(max * 4);
  const aA = new THREE.InstancedBufferAttribute(a, 4).setUsage(THREE.DynamicDrawUsage);
  const aB = new THREE.InstancedBufferAttribute(b, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aPosSize', aA); geo.setAttribute('aColor', aB);
  geo.instanceCount = 0;
  return { geo, a, b, aA, aB };
}

class Layer {
  constructor(max, material) {
    this.max = max;
    Object.assign(this, quadGeometry(max));
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.n = 0;
  }
  begin() { this.n = 0; }
  end() { this.geo.instanceCount = this.n; this.aA.needsUpdate = true; this.aB.needsUpdate = true; }
}

export class GlowLayer extends Layer {
  constructor(max = 640) {
    super(max, new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        attribute vec4 aPosSize; attribute vec4 aColor; varying vec2 vP; varying vec4 vC;
        void main() { vP = position.xy; vC = aColor;
          vec4 mv = viewMatrix * vec4(aPosSize.xyz, 1.0);
          mv.xy += position.xy * aPosSize.w;
          // Pulled toward the eye so a halo is not cut by the thing it surrounds; small points only a little, so that
          // a firefly or a wisp behind the moth or a lantern is hidden by it.
          mv.z += clamp(aPosSize.w * 1.6, 0.12, 0.45);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`
        varying vec2 vP; varying vec4 vC;
        void main() { float d = length(vP); float a = max(0.0, 1.0 - d);
          float halo = a * a * a; float core = pow(max(0.0, 1.0 - d * 2.6), 2.0);
          gl_FragColor = vec4(vC.rgb * (halo * 0.8 + core * 1.1) * vC.a, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true,
    }));
    this.mesh.renderOrder = 20;
  }
  // size is the radius in world units. Colour is linear rgb, a is overall strength.
  push(x, y, z, size, r, g, b, a) {
    if (this.n >= this.max || a <= 0.002 || size <= 0) return;
    const i = this.n++ * 4, A = this.a, B = this.b;
    A[i] = x; A[i + 1] = y; A[i + 2] = z; A[i + 3] = size;
    B[i] = r; B[i + 1] = g; B[i + 2] = b; B[i + 3] = a;
  }
}

export class DecalLayer extends Layer {
  // additive = true for light, false for soft shadow (colour is then ignored, alpha darkens).
  constructor(max = 256, additive = false) {
    super(max, new THREE.ShaderMaterial({
      uniforms: { uMistRange: G.uMistRange },
      vertexShader: /* glsl */`
        attribute vec4 aPosSize; attribute vec4 aColor; varying vec2 vP; varying vec4 vC; varying float vShape;
        void main() { vP = position.xy; vC = aColor;
          float s = abs(aPosSize.w); vShape = step(aPosSize.w, 0.0);
          vec3 w = aPosSize.xyz + vec3(position.x, 0.0, position.y) * s;
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: additive ? /* glsl */`
        varying vec2 vP; varying vec4 vC; varying float vShape;
        void main() { float d = length(vP);
          float disc = pow(max(0.0, 1.0 - d), 2.0);
          float ring = smoothstep(0.66, 0.72, d) * (1.0 - smoothstep(0.75, 0.82, d)) * 0.8 + 0.07 * pow(max(0.0, 1.0 - d), 2.0);
          float a = mix(disc, ring, vShape);
          gl_FragColor = vec4(vC.rgb * a * vC.a, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` : /* glsl */`
        varying vec2 vP; varying vec4 vC; varying float vShape;
        void main() { float d = length(vP); float a = (1.0 - smoothstep(0.25, 1.0, d));
          gl_FragColor = vec4(vC.rgb, a * vC.a); }`,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false, depthTest: true, transparent: true,
      side: THREE.DoubleSide,   // the quad is laid flat on the ground, which flips its winding when seen from above
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    this.mesh.renderOrder = additive ? 6 : 5;
  }
  // size > 0: soft disc. ring = true draws a ring of that radius instead.
  push(x, y, z, size, r, g, b, a, ring = false) {
    if (this.n >= this.max || a <= 0.002 || size <= 0) return;
    const i = this.n++ * 4, A = this.a, B = this.b;
    A[i] = x; A[i + 1] = y; A[i + 2] = z; A[i + 3] = ring ? -size : size;
    B[i] = r; B[i + 1] = g; B[i + 2] = b; B[i + 3] = a;
  }
}
