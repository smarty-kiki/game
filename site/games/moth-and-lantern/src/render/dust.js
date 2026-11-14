// Dust and smoke: soft, opaque-ish puffs that take the light of the place they are in (moonlight, plus whatever
// the lanterns throw there). Unlike the glow layer they do not shine: a bump or a landing raises dust, not sparks.
// Usage per frame: begin(); push(...); end().
import * as THREE from 'three';
import { G } from './materials.js';

export class DustLayer {
  constructor(max = 96) {
    this.max = max; this.n = 0;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.a = new Float32Array(max * 4); this.b = new Float32Array(max * 4);
    this.aA = new THREE.InstancedBufferAttribute(this.a, 4).setUsage(THREE.DynamicDrawUsage);
    this.aB = new THREE.InstancedBufferAttribute(this.b, 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPosSize', this.aA); geo.setAttribute('aColor', this.aB); geo.instanceCount = 0;
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uLightMap: G.uLightMap, uFieldRect: G.uFieldRect, uWarm: G.uWarm },
      vertexShader: /* glsl */`
        attribute vec4 aPosSize; attribute vec4 aColor; varying vec2 vP; varying vec4 vC; varying vec2 vF;
        uniform vec4 uFieldRect;
        void main() { vP = position.xy; vC = aColor; vF = (aPosSize.xz - uFieldRect.xy) * uFieldRect.zw;
          vec4 mv = viewMatrix * vec4(aPosSize.xyz, 1.0);
          mv.xy += position.xy * aPosSize.w; mv.z += min(0.3, aPosSize.w * 1.4);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`
        varying vec2 vP; varying vec4 vC; varying vec2 vF; uniform sampler2D uLightMap; uniform float uWarm;
        void main() { float d = length(vP); float a = 1.0 - smoothstep(0.2, 1.0, d);
          vec3 lm = texture2D(uLightMap, clamp(vF, 0.0, 1.0)).rgb;
          vec3 col = vC.rgb * (vec3(0.26, 0.30, 0.46) + vec3(0.10, 0.06, 0.02) * uWarm + lm * 0.55) * (0.82 + 0.18 * (1.0 - d));
          gl_FragColor = vec4(col, a * a * vC.a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      blending: THREE.NormalBlending, depthWrite: false, depthTest: true, transparent: true,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 18;
  }
  begin() { this.n = 0; }
  // size is the radius in world units; colour is the dust's own (linear) colour, a its opacity.
  push(x, y, z, size, r, g, b, a) {
    if (this.n >= this.max || a <= 0.003 || size <= 0) return;
    const i = this.n++ * 4, A = this.a, B = this.b;
    A[i] = x; A[i + 1] = y; A[i + 2] = z; A[i + 3] = size;
    B[i] = r; B[i + 1] = g; B[i + 2] = b; B[i + 3] = a;
  }
  end() { this.geo.instanceCount = this.n; this.aA.needsUpdate = true; this.aB.needsUpdate = true; }
}
