import * as THREE from 'three';
import {
  Fn, uniform, texture, vec2, vec3, vec4, float, floor, fract, abs, max, min, mix, smoothstep, clamp, pow, dot, length,
  normalize, cross, sign, select, fwidth, positionGeometry, normalGeometry, positionWorld, normalWorld, positionView, normalViewGeometry,
  materialColor, materialRoughness, materialMetalness, materialNormal, uv, screenUV, sin, step, time,
} from 'three/tsl';

// 全部の物（基地の部品・輪・残骸・艦隊・敵・ボス・岩）の表面に、同じ考え方の質感を足す共通の部品（WebGPU・TSL）。
// 作り物に見える原因（一様なつや・一様な明るさ・同じ模様の繰り返し・鮮やかすぎる色・近くで見えない細部）を、層を重ねて崩す。
//   1. 細かい粒と細い傷（自機と同じ detail.jpg を面の向きに合わせて貼る）：つやのむら・細かな凹凸・磨かれた傷
//   2. 板の継ぎ目と板ごとの色・つやの違い（コードで描く。継ぎ目は凹み、板は1枚ずつ少し違う）
//   3. 大きな汚れのむら（場所ごとに汚れ方が違う。同じ部品を並べても同じに見えない）
//   4. 凹みの汚れ（焼いた暗がりの画像か継ぎ目）と角の剥げ（塗装が擦れて地金が光る）
//   重さ：雑音と板の模様は起動時に1回だけ画像へ焼き、描くときは画像を読むだけにする（1画素ごとに雑音を計算しない）
// 強さは SURF_U の表に集める。確認用: ?surface=0 で今までの質感に戻す（見比べ用）

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
export const SURF_ON = Q.get('surface') !== '0';
// 表面の層だけを切る（光・影・映り込みの変更は残す）。確認用: ?layer=0
const SURF_LAYER = SURF_ON && Q.get('layer') !== '0';

// 強さの表（全物体に共通。物ごとの違いは applySurface の引数で掛ける）
export const SURF_U = {
  detail: uniform(1.0),   // 細かい粒・傷の強さ
  plate: uniform(1.0),    // 板ごとの色・つやの違い
  grime: uniform(1.0),    // 大きな汚れのむら
  cavity: uniform(1.0),   // 凹みの汚れ
  wear: uniform(1.0),     // 角の剥げ
  sat: uniform(1.0),      // 彩度（1 で元のまま）。0.8 では画面全体がくすみ見づらかったので元のままにした
  bump: uniform(1.0),     // 凹凸の強さ
  aoDirect: uniform(0.45), // 隙間の暗がりを、太陽の当たる所の色にも掛ける割合
};

// 画面の隙間の暗がり（GTAO）の画像。main.js が後処理を組んだ後に .value を差し替える（それまでは白＝暗がりなし）
const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
white.needsUpdate = true;
export const SURF_AO = texture(white);

let detailTex = null;
function detailTexture() {
  if (detailTex) return detailTex;
  detailTex = new THREE.TextureLoader().load('./assets/airframes/detail.jpg');
  detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
  detailTex.colorSpace = THREE.NoColorSpace;
  detailTex.anisotropy = 8;
  return detailTex;
}

// 板の継ぎ目（R）・板ごとの値（G）・大きな汚れのむら（B）を、起動時に1回だけ 512 四方の画像へ焼く。
// 前は全部の物の1画素ごとに雑音を約40回計算していて、画面が重くなる一番の原因だった
let surfTex = null;
function surfaceTexture() {
  if (surfTex) return surfTex;
  const S = 512; const ROWS = 8; const rowH = S / ROWS;
  const data = new Uint8Array(S * S * 4);
  let seed = 20261108;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  // 板：行ごとに幅1か2の板を並べ、行ごとに継ぎ目をずらす（端はつながる）
  for (let r = 0; r < ROWS; r++) {
    const shift = Math.floor(rnd() * rowH);
    let x0 = 0;
    while (x0 < S) {
      let w = (rnd() > 0.6 ? 2 : 1) * rowH;
      if (x0 + w > S) w = S - x0;
      const id = Math.floor(rnd() * 255);
      for (let yy = 0; yy < rowH; yy++) {
        const y = r * rowH + yy;
        const dy = Math.min(yy, rowH - 1 - yy);
        for (let xx = 0; xx < w; xx++) {
          const x = (x0 + xx + shift) % S;
          const d = Math.min(Math.min(xx, w - 1 - xx), dy);
          const o = (y * S + x) * 4;
          data[o] = d < 1.5 ? 255 : d < 2.5 ? 110 : 0;
          data[o + 1] = id;
          data[o + 3] = 255;
        }
      }
      x0 += w;
    }
  }
  // 汚れのむら：端がつながる値の雑音を3つの細かさで重ねる
  const layer = (cells, amp) => {
    const g = new Float32Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    const sm = (f) => f * f * (3 - 2 * f);
    for (let y = 0; y < S; y++) {
      const fy = (y / S) * cells; const iy = Math.floor(fy); const ty = sm(fy - iy);
      const y0 = iy % cells; const y1 = (iy + 1) % cells;
      for (let x = 0; x < S; x++) {
        const fx = (x / S) * cells; const ix = Math.floor(fx); const tx = sm(fx - ix);
        const x0 = ix % cells; const x1 = (ix + 1) % cells;
        const a = g[y0 * cells + x0] + (g[y0 * cells + x1] - g[y0 * cells + x0]) * tx;
        const b = g[y1 * cells + x0] + (g[y1 * cells + x1] - g[y1 * cells + x0]) * tx;
        data[(y * S + x) * 4 + 2] += Math.round((a + (b - a) * ty) * amp * 255);
      }
    }
  };
  layer(8, 0.55); layer(16, 0.28); layer(32, 0.17);
  surfTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  surfTex.wrapS = surfTex.wrapT = THREE.RepeatWrapping;
  surfTex.magFilter = THREE.LinearFilter;
  surfTex.minFilter = THREE.LinearMipmapLinearFilter;
  surfTex.generateMipmaps = true;
  surfTex.colorSpace = THREE.NoColorSpace;
  surfTex.anisotropy = 8;
  surfTex.needsUpdate = true;
  return surfTex;
}

// 雑音（引数だけで計算する純粋な関数なので、WGSL の関数にしてよい）
const sfHash = /*@__PURE__*/ Fn(([p0]) => {
  const p = fract(p0.mul(0.3183099).add(0.1)).mul(17.0);
  return fract(p.x.mul(p.y).mul(p.z).mul(p.x.add(p.y).add(p.z)));
}).setLayout({ name: 'sfHash', type: 'float', inputs: [{ name: 'p0', type: 'vec3' }] });

const sfNoise = /*@__PURE__*/ Fn(([x]) => {
  const i = floor(x);
  const f0 = fract(x);
  const f = f0.mul(f0).mul(float(3.0).sub(f0.mul(2.0)));
  return mix(
    mix(mix(sfHash(i), sfHash(i.add(vec3(1, 0, 0))), f.x), mix(sfHash(i.add(vec3(0, 1, 0))), sfHash(i.add(vec3(1, 1, 0))), f.x), f.y),
    mix(mix(sfHash(i.add(vec3(0, 0, 1))), sfHash(i.add(vec3(1, 0, 1))), f.x), mix(sfHash(i.add(vec3(0, 1, 1))), sfHash(i.add(vec3(1, 1, 1))), f.x), f.y),
    f.z,
  );
}).setLayout({ name: 'sfNoise', type: 'float', inputs: [{ name: 'x', type: 'vec3' }] });

const sfFbm = /*@__PURE__*/ Fn(([p]) => {
  return sfNoise(p).mul(0.55).add(sfNoise(p.mul(2.11).add(7.3)).mul(0.28)).add(sfNoise(p.mul(4.37).add(1.9)).mul(0.17));
}).setLayout({ name: 'sfFbm', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });

// 1つの面の板：継ぎ目の線（0..1）と、板ごとの値（0..1）。行ごとに継ぎ目をずらし、同じ格子に見せない
const sfPlate = /*@__PURE__*/ Fn(([q, w, seed]) => {
  const row = floor(q.y);
  const shift = sfHash(vec3(row, seed, 3.7)).mul(0.83);
  const qq = vec2(q.x.add(shift), q.y);
  // 板の幅を行ごとに 1 か 2 に変える
  const wide = select(sfHash(vec3(row, seed, 9.1)).greaterThan(0.6), float(2.0), float(1.0));
  const cx = floor(qq.x.div(wide));
  const gx = abs(fract(qq.x.div(wide)).sub(0.5)).mul(wide);
  const gy = abs(fract(qq.y).sub(0.5));
  const fwx = fwidth(qq.x).mul(1.2).add(1e-4);
  const fwy = fwidth(qq.y).mul(1.2).add(1e-4);
  const hw = float(0.5).sub(w);
  const lx = float(1.0).sub(smoothstep(hw.sub(fwx), hw.add(fwx), float(0.5).mul(wide).sub(gx)));
  const ly = float(1.0).sub(smoothstep(hw.sub(fwy), hw.add(fwy), float(0.5).sub(gy)));
  const seam = max(lx, ly);
  const id = sfHash(vec3(cx, row, seed));
  return vec2(seam, id);
}).setLayout({ name: 'sfPlate', type: 'vec2', inputs: [{ name: 'q', type: 'vec2' }, { name: 'w', type: 'float' }, { name: 'seed', type: 'float' }] });

// 面の向きの重み（3方向から貼る模様に使う）
const triW = (N, k = 6.0) => {
  const w = pow(abs(normalize(N)), vec3(k));
  return w.div(w.x.add(w.y).add(w.z));
};

// 画像を面の向きに合わせて3方向から貼る（P は部品の座標、s は1枚の大きさ）
const triTex = (tex, P, W, s) => {
  const q = P.div(s);
  return texture(tex, q.zy).mul(W.x).add(texture(tex, q.xz).mul(W.y)).add(texture(tex, q.xy).mul(W.z));
};

// 高さ h の画面上の傾きで法線を傾ける（視点の座標）。傾きが出ない所では元の法線のまま
function bump(n, h, amt) {
  const sx = positionView.dFdx(); const sy = positionView.dFdy();
  const r1 = cross(sy, n); const r2 = cross(n, sx);
  const det = dot(sx, r1);
  const grad = sign(det).mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2)));
  const b = abs(det).mul(n).sub(grad.mul(amt));
  const L2 = dot(b, b);
  return select(L2.greaterThan(1e-24), b.div(max(L2, 1e-24).sqrt()), n);
}

const LUMA = vec3(0.2126, 0.7152, 0.0722);

/**
 * 材質（MeshStandardNodeMaterial / MeshPhysicalNodeMaterial）に質感の層を足す。今の colorNode・roughnessNode・
 * metalnessNode・normalNode があれば、それを元にして包む（無ければ材質の値と画像）。
 * o.P, o.N     部品の座標と法線（既定は positionGeometry・normalGeometry。合成した形はそのまま世界の座標に近い）
 * o.world      止まっている物を世界の座標で描く（並べるときに大きさを変えた模型でも、模様の大きさがそろう）
 * o.scale      細かい粒の1枚の大きさ（部品の座標の単位）。板の大きさは o.panel（無ければ板を描かない）
 * o.ao         焼いた暗がり（0 で暗い）の node。凹みの汚れに使う。無ければ継ぎ目と粒から作る
 * o.paint      塗装の物か（角が剥げて地金が出る）。地金だけの物は false
 * o.k          全体の強さ（物ごと）。o.wear・o.dirt・o.bumpK で層ごとにも掛けられる
 * o.steel      剥げた所の地金の色（線形の値）
 * o.dirtColor  汚れの色（線形の値）
 */
// 灯りの板・発光の帯を、場所（cell の単位の升）ごとに消灯・減光・ちらつきに分ける。
// 全部が同じ明るさで光ると作り物に見えるので、およそ4割を消し、残りの明るさを散らし、ごく一部だけゆっくり明滅させる
export function regionLightK(cell = 40.0, seed = 0.0, P = positionWorld, steady = false) {
  if (!SURF_ON) return float(1.0);
  const id = floor(P.div(cell)).add(vec3(seed, seed * 1.7, seed * 0.3));
  const h1 = sfHash(id); const h2 = sfHash(id.add(vec3(13.1, 7.7, 3.3))); const h3 = sfHash(id.add(vec3(5.5, 21.9, 8.4)));
  const on = mix(0.03, 1.0, step(0.42, h1));
  const lvl = mix(0.35, 1.15, h2);
  // 試験（test=1）は同じ入力で同じ画になるよう、明滅を止める
  if (steady || Q.get('test') === '1') return on.mul(lvl);
  const flick = mix(1.0, sin(time.mul(h3.mul(9.0).add(3.0)).add(h3.mul(40.0))).mul(0.5).add(0.5).mul(0.7).add(0.3), step(0.93, h3));
  return on.mul(lvl).mul(flick);
}

// 色の画像に焼き込まれた赤の塗装を、部品の役割の色へ塗り替える（赤は撃つ対象だけに残し、全部が赤で見飽きるのを防ぐ）。
// cols は色1つ（[r,g,b]、線形）か色の配列。配列なら cell の単位の升ごとに1色を選ぶ（コンテナの積み荷の色を散らす）
export function recolorPaint(m, base, cols, cell = 8.0) {
  if (!cols) return;
  const c0 = m.colorNode ?? base;
  const mx = max(base.g, base.b);
  const sat = base.r.sub(mx);
  const mask = smoothstep(0.05, 0.16, sat).mul(smoothstep(0.45, 0.7, sat.div(max(base.r, 0.001))));
  const lum = dot(base, vec3(0.3, 0.59, 0.11));
  const k = pow(clamp(lum.div(0.1), 0.0, 3.0), 0.6);
  let col;
  if (Array.isArray(cols[0])) {
    const h = sfHash(floor(positionWorld.div(cell)).add(vec3(3.1, 7.3, 1.9)));
    col = vec3(...cols[0]);
    for (let i = 1; i < cols.length; i++) col = select(h.greaterThan(i / cols.length), vec3(...cols[i]), col);
  } else col = vec3(...cols);
  m.colorNode = mix(c0, col.mul(k), mask);
}

// 色の画像に描かれた白い灯りの板と黄黒の縞を、場所ごとに消す・暗くする・煤けさせる（同じ部品が並んでも同じに光らない）
export function breakLitPaint(m, base = materialColor.rgb, cellW = 40.0, cellY = 25.0) {
  if (!SURF_ON) return;
  const c0 = m.colorNode ?? base;
  const lum = dot(base, vec3(0.3, 0.59, 0.11));
  const bright = smoothstep(0.42, 0.75, lum);
  const yel = clamp(base.r.add(base.g).mul(0.5).sub(base.b).mul(3.0), 0.0, 1.0).mul(smoothstep(0.15, 0.4, lum));
  const rkW = clamp(regionLightK(cellW, 1.0, positionWorld, true), 0.0, 1.0);
  const rkY = clamp(regionLightK(cellY, 4.0, positionWorld, true), 0.0, 1.0);
  m.colorNode = c0.mul(mix(1.0, mix(0.16, 1.0, rkW), bright)).mul(mix(1.0, mix(0.38, 1.0, rkY), yel));
}

export function applySurface(m, o = {}) {
  if (!SURF_LAYER) return m;
  const P = o.P || (o.world ? positionWorld : positionGeometry.toVarying('vSfP'));
  const N = o.N || (o.world ? normalWorld : normalGeometry.toVarying('vSfN'));
  const s = float(o.scale ?? 1.0);
  const k = float(o.k ?? 1.0);
  const W = triW(N);
  const dt = detailTexture();
  const st = surfaceTexture();
  // 1. 細かい粒（r）・細い傷（g）・細かなむら（b）。画像を3方向から1回ずつ（前は2つの大きさで6回）
  const d1 = triTex(dt, P, W, s);
  const grain = d1.r;
  const scratch = smoothstep(0.55, 0.85, d1.g).mul(SURF_U.detail).mul(k);
  // 2. 板の継ぎ目と板ごとの値（焼いた画像を3方向から。1枚の画像に8行の板が入っている）
  let seam = float(0.0);
  let plateId = float(0.5);
  if (o.panel) {
    const ps = P.div(float(o.panel).mul(8.0));
    const tx = texture(st, ps.zy); const ty = texture(st, ps.xz.add(vec2(0.37, 0.11))); const tz = texture(st, ps.xy.add(vec2(0.71, 0.53)));
    seam = tx.r.mul(W.x).add(ty.r.mul(W.y)).add(tz.r.mul(W.z));
    plateId = tx.g.mul(W.x).add(ty.g.mul(W.y)).add(tz.g.mul(W.z));
  }
  // 3. 大きな汚れのむら（世界の座標で。ゆっくり変わるので、面の主な向きの1方向から1回だけ読む）
  const gw = positionWorld.div(s.mul(38.0 * 8.0));
  const guv = select(W.x.greaterThan(W.y).and(W.x.greaterThan(W.z)), gw.zy, select(W.y.greaterThan(W.z), gw.xz, gw.xy));
  const grime = texture(st, guv).b.mul(SURF_U.grime);
  const region = sfHash(floor(positionWorld.div(s.mul(160.0))));
  // 4. 凹み（焼いた暗がり・継ぎ目）と角
  const aoN = o.ao ? float(o.ao) : float(1.0);
  const cavity = clamp(float(1.0).sub(aoN).mul(1.6).add(seam.mul(0.8)).add(grain.sub(0.6).mul(0.4)), 0.0, 1.0).mul(SURF_U.cavity);
  const edgeGeo = clamp(length(fwidth(normalViewGeometry)).mul(2.5).sub(0.12), 0.0, 1.0);
  const chipNoise = smoothstep(0.42, 0.78, d1.g.mul(0.5).add(grain.mul(0.5)).add(d1.b.sub(0.5).mul(0.35)));
  const wear = clamp(edgeGeo.mul(chipNoise).mul(1.6).add(scratch.mul(0.35)), 0.0, 1.0).mul(SURF_U.wear).mul(float(o.wear ?? 1.0)).mul(k);
  const dirt = clamp(cavity.mul(0.75).add(grime.sub(0.42).mul(1.1)).add(region.sub(0.5).mul(0.3)), 0.0, 1.0).mul(float(o.dirt ?? 1.0)).mul(k);

  // 色：彩度を落とし、板ごと・場所ごとに明るさを少し変え、凹みに汚れ、角は地金
  const c0 = o.baseColor || (m.colorNode ? vec3(m.colorNode) : materialColor.rgb);
  const lum0 = dot(c0, LUMA);
  let c = mix(vec3(lum0), c0, SURF_U.sat);
  c = c.mul(float(1.0).add(plateId.sub(0.5).mul(0.34).mul(SURF_U.plate).mul(k)));
  c = c.mul(float(1.0).add(region.sub(0.5).mul(0.1).mul(k)));
  c = c.mul(mix(float(1.0), d1.b.mul(0.3).add(0.84), SURF_U.detail.mul(k)));
  c = mix(c, vec3(...(o.dirtColor || [0.035, 0.03, 0.026])), dirt.mul(0.4));
  if (o.paint !== false) c = mix(c, vec3(...(o.steel || [0.55, 0.56, 0.58])), wear.mul(0.8));
  else c = c.add(wear.mul(0.05));
  m.colorNode = c;

  // つや：粒・傷・汚れ・剥げ・板ごとに変える（一様なつやを崩すのが一番効く）
  const r0 = m.roughnessNode || materialRoughness;
  const r = r0
    .add(grain.sub(0.5).mul(0.3).mul(SURF_U.detail).mul(k))
    .add(d1.b.sub(0.5).mul(0.22).mul(k))
    .add(plateId.sub(0.5).mul(0.3).mul(SURF_U.plate).mul(k))
    .add(dirt.mul(0.12))
    .sub(0.06)
    .sub(scratch.mul(0.22))
    .sub(wear.mul(0.35));
  m.roughnessNode = clamp(r, 0.14, 1.0);

  // 金属度：剥げた角は地金
  const m0 = m.metalnessNode || materialMetalness;
  m.metalnessNode = o.paint !== false ? mix(m0, 0.9, wear.mul(0.85)) : m0;

  // 凹凸：粒（細かい）と継ぎ目（凹み）。凹凸の量は部品の大きさに合わせる
  const n0 = m.normalNode || materialNormal;
  const h = grain.mul(SURF_U.detail).sub(seam.mul(1.4)).add(scratch.mul(-0.2));
  m.normalNode = bump(n0, h, s.mul(0.012).mul(SURF_U.bump).mul(float(o.bumpK ?? 1.0)).mul(k));
  return m;
}
