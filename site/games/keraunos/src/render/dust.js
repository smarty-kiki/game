// 漂う塵：視点の前の箱の中に細かい粒を散らす。太陽に向かって見る粒ほど光る（逆光で塵が光る）。
// 粒は世界に止まっていて、視点が動くと流れて見える。遊ぶ画面は機体が止まって世界が動く作りなので、進む速さぶんだけ
// 仮に視点を進めて（travel）粒を後ろへ流す。地上・格納庫は視点が本当に動くので、そのままで流れる。
// 1回の描画（Sprite のインスタンス）。奥行きで物に隠れ、近すぎる粒と遠い粒は消す
import * as THREE from 'three';
import { Fn, vec4, float, uniform, instancedBufferAttribute, positionView, viewportSize, screenDPR, uv,
  fract, max, dot, pow, normalize, smoothstep, length, cameraViewMatrix } from 'three/tsl';

// box: 箱の横・縦・前後（m）、ahead: 箱の中心を視点の前へ置く距離、size: 粒の大きさの掛け率、drift: 漂う速さ（m/秒）
export function createDust(scene, camera, U, { count = 2000, box = [70, 44, 150], ahead = 45, size = 1, drift = 0 } = {}) {
  const BOX = new THREE.Vector3(...box);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random();
    seed[i * 4 + 3] = Math.random(); // 明るさと大きさのばらつき
  }
  const D = { center: uniform(new THREE.Vector3()), virt: uniform(new THREE.Vector3()), box: uniform(BOX), k: uniform(1) };
  const aSeed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(seed, 4));
  const mat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false, fog: false });
  // 粒は「仮の世界」の格子に止まっている。箱の中心のまわりで巻き戻して、いつも箱の中に粒がある
  const local = fract(aSeed.xyz.sub(D.virt.div(D.box)).add(0.5)).sub(0.5).mul(D.box);
  mat.positionNode = D.center.add(local);
  const r = ahead / 45; // 箱の大きさに合わせて、粒の大きさと消える距離を縮める
  mat.sizeNode = max(viewportSize.y.mul(0.0016 * size).mul(aSeed.w.mul(1.4).add(0.5)).mul(float(30.0 * Math.max(0.1, r)).div(max(positionView.z.negate(), 0.05))), 1.0).div(screenDPR);
  mat.colorNode = Fn(() => {
    const vd = normalize(positionView.xyz);
    // 太陽の向き（視点の座標）との角度で、逆光の粒ほど明るい
    const sunV = normalize(cameraViewMatrix.mul(vec4(U.sunDir, 0.0)).xyz);
    const mu = max(dot(vd, sunV), 0.0);
    const phase = pow(mu, 8.0).mul(2.2).add(0.12);
    const dist = positionView.z.negate();
    const fade = smoothstep(1.5 * r, 6.0 * r, dist).mul(float(1.0).sub(smoothstep(60.0 * r, 110.0 * r, dist)));
    const round = float(1.0).sub(smoothstep(0.15, 0.5, length(uv().sub(0.5))));
    const b = phase.mul(fade).mul(round).mul(aSeed.w.mul(0.8).add(0.2)).mul(D.k).mul(U.dustK);
    return vec4(U.sunTint.mul(0.25).mul(b), 1.0);
  })();
  const _fwd = new THREE.Vector3();
  const travel = new THREE.Vector3();
  let t = 0;
  const dust = new THREE.Sprite(mat);
  dust.count = count;
  dust.frustumCulled = false;
  dust.renderOrder = 5;
  scene.add(dust);
  return {
    mesh: dust,
    // speed: 機体が止まって世界が動く作りのときの、前へ進む速さ（m/秒）。視点が本当に動くなら 0
    update(dt, speed, boost) {
      camera.getWorldDirection(_fwd);
      t += dt;
      travel.addScaledVector(_fwd, speed * dt);
      travel.x += Math.sin(t * 0.13) * drift * dt; travel.y += drift * 0.5 * dt;
      camera.getWorldPosition(D.center.value).addScaledVector(_fwd, ahead);
      D.virt.value.copy(D.center.value).add(travel);
      D.k.value = 1 + boost * 0.6;
    },
    dispose() { scene.remove(dust); mat.dispose(); },
  };
}
