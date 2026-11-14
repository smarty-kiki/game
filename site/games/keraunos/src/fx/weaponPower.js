import * as THREE from 'three';
import { Fn, normalView, positionViewDirection, positionGeometry, vec3, vec4, dot, max, pow, sin } from 'three/tsl';
import { nodeUniforms } from './soft.js';
import { POWER } from './weaponFeel.js';

// 取る物：P（ツインの段階を上げる）と B（爆雷を1発足す）。撃破で落ち、近づくと吸い寄せられる。
const MAX = 3;
const COL = { P: new THREE.Color(0.35, 1.0, 0.9), B: new THREE.Color(1.0, 0.72, 0.28) };

// 封入筒：縁は薄いガラスで中心が濃く光り、中の光がゆっくり上下へ流れる。光は当たらない（自分で光る）
function coreMaterial() {
  const U = nodeUniforms({ uCol: new THREE.Color(), uT: 0 });
  const mat = new THREE.MeshBasicNodeMaterial({ fog: false });
  mat.fragmentNode = Fn(() => {
    const m = max(0.0, dot(normalView, positionViewDirection));
    const bands = sin(positionGeometry.z.mul(7.0).sub(U.uT.mul(1.6))).mul(0.18).add(0.82);
    const c = U.uCol.mul(m.mul(m).mul(bands).mul(2.4).add(0.35)).add(vec3(1.0).mul(pow(m, 7.0)).mul(0.8));
    return vec4(c, 1.0);
  })();
  mat.uniforms = U;
  return mat;
}

const haloTex = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
};

export function createPower({ scene, level = 1 }) {
  // 軍用の補給容器：光る封入筒を、鋼の枠と両端の蓋で包み、外を重い輪がゆっくり回る
  const coreG = new THREE.CapsuleGeometry(0.62, 1.5, 6, 16);
  coreG.rotateX(Math.PI / 2);
  const capG = new THREE.CylinderGeometry(0.98, 0.98, 0.42, 6);
  capG.rotateX(Math.PI / 2);
  const capInG = new THREE.CylinderGeometry(0.72, 0.98, 0.2, 6);
  capInG.rotateX(Math.PI / 2);
  const strutG = new THREE.BoxGeometry(0.15, 0.15, 2.5);
  const ringG = new THREE.TorusGeometry(1.75, 0.075, 6, 48);
  const tickG = new THREE.BoxGeometry(0.24, 0.3, 0.3);
  const steel = new THREE.MeshStandardMaterial({ color: 0x4a4f55, metalness: 0.75, roughness: 0.48, fog: false, envMapIntensity: 1.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1f23, metalness: 0.6, roughness: 0.62, fog: false });
  const glow = haloTex();
  const items = [];
  for (let i = 0; i < MAX; i++) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    const a = new THREE.Mesh(coreG, coreMaterial());
    body.add(a);
    for (const z of [-1.28, 1.28]) {
      const cap = new THREE.Mesh(capG, steel); cap.position.z = z; body.add(cap);
      const inner = new THREE.Mesh(capInG, dark); inner.position.z = z * 0.76; if (z > 0) inner.rotation.y = Math.PI; body.add(inner);
    }
    for (let k = 0; k < 6; k++) {
      const an = k * Math.PI / 3 + Math.PI / 6;
      const st = new THREE.Mesh(strutG, dark);
      st.position.set(Math.cos(an) * 0.84, Math.sin(an) * 0.84, 0);
      st.rotation.z = an;
      body.add(st);
    }
    const b = new THREE.Group();
    const lamp = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    b.add(new THREE.Mesh(ringG, steel));
    for (let k = 0; k < 4; k++) {
      const an = k * Math.PI / 2;
      const tick = new THREE.Mesh(tickG, k % 2 ? dark : lamp);
      tick.position.set(Math.cos(an) * 1.75, Math.sin(an) * 1.75, 0);
      tick.rotation.z = an;
      b.add(tick);
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.55 }));
    halo.scale.setScalar(7.5);
    group.add(body, b, halo);
    group.visible = false;
    scene.add(group);
    items.push({ group, a, b, body, lamp, halo, on: false, kind: 'P', far: [0, 0, 0], age: 0, rel: new THREE.Vector3() });
  }
  const s = { level, taken: 0 };

  function drop(kind, rel, P) {
    const it = items.find((x) => !x.on) || items[0];
    it.on = true; it.kind = kind; it.age = 0;
    it.far = [rel[0] + P[0], rel[1] + P[1], rel[2] + P[2]];
    it.a.material.uniforms.uCol.value.copy(COL[kind]);
    it.lamp.color.copy(COL[kind]).multiplyScalar(2.2);
    it.halo.material.color.copy(COL[kind]);
    it.group.visible = true;
  }

  // 戻り値は取った物の種類（無ければ null）
  function update(state, ship, dt) {
    const P = ship.pos;
    const fw = ship.forward;
    let got = null;
    for (const it of items) {
      if (!it.on) continue;
      it.age += dt;
      const rx = it.far[0] - P[0]; const ry = it.far[1] - P[1]; const rz = it.far[2] - P[2];
      const d = Math.hypot(rx, ry, rz) || 1;
      // 自機と一緒に少し進み（すぐ後ろへ流れない）、近いほど強く吸い寄せる
      const pull = d < 140 ? 30 + 90 * (1 - d / 140) : 12;
      const v = ship.speed * 0.9;
      it.far[0] += (fw[0] * v - rx / d * pull) * dt;
      it.far[1] += (fw[1] * v - ry / d * pull) * dt;
      it.far[2] += (fw[2] * v - rz / d * pull) * dt;
      it.rel.set(it.far[0] - P[0], it.far[1] - P[1], it.far[2] - P[2]);
      it.group.position.copy(it.rel);
      // 重い物らしく、ゆっくり回る
      it.a.material.uniforms.uT.value = state.time;
      it.body.rotation.set(0.35 + Math.sin(state.time * 0.4) * 0.12, state.time * 0.55, 0.25);
      it.b.rotation.set(Math.PI / 2 + Math.sin(state.time * 0.35) * 0.3, state.time * 0.3, state.time * 0.42);
      it.halo.material.opacity = 0.42 + 0.14 * Math.sin(state.time * 2.2);
      it.group.scale.setScalar(Math.min(1, it.age / 0.35));
      if (d < 6) {
        it.on = false; it.group.visible = false; got = it.kind;
        if (got === 'P') s.level = Math.min(POWER.max, s.level + 1);
        s.taken += 1;
      } else if (it.age > 14) {
        it.on = false; it.group.visible = false;
      }
    }
    return got;
  }

  return {
    drop, update, items,
    get level() { return s.level; },
    get taken() { return s.taken; },
    lose() { s.level = Math.max(1, s.level - 1); },
    reset(l = level) { s.level = l; for (const it of items) { it.on = false; it.group.visible = false; } },
  };
}
