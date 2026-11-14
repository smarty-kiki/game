import * as THREE from 'three';
import {
  Fn, attribute, float, vec2, vec3, vec4, abs, exp, pow, mix, clamp, smoothstep, step, length, cos, sin, floor, fract,
  max, min, dot, normalize, cross, select, sign, modelViewMatrix, cameraViewMatrix, cameraProjectionMatrix, positionGeometry,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, billboard, viewVertex, smoothstepR, fbm2, stripGeometry } from './soft.js';

// 機械の大蛇の口の光線と、自機の主砲とのぶつかり合いの見た目。座標は自機からの相対（他の敵と同じ）。
// 作り方は game-visual-asset の「エフェクトの作り方」「最高クラスの攻撃演出」の規則に従う：
//   ・光線（不定形）は画像を使わず、ノイズで削った体積の帯を流して描く。芯は白でなく明るい黄緑、外へ緑。太さは 溜め→太く→保つ→細く消える。
//     まわりを2本のエネルギーの帯がらせんに巻いて前へ流れ、表面を粒の稲妻が這う
//   ・溜めは、逆向きに回る2本のらせんの腕に沿って口へ流れ込む粒。撃つ直前だけ芯が震える（輪や光の球で描かない）
//   ・撃つ瞬間は、光線と直角に広がる粒の輪を2重（2つ目は0.07秒遅れ）。屈折の輪は戦いの側（bossSerpent）が画面に入れる
//   ・ぶつかり合いの点は、2色に分かれて煮え立つエネルギーの塊（口の側は緑、自機の側は紫）から、柔らかな炎の舌が外へ流れる。
//     そこから空気に止められる熱い粒が円盤状に飛び散り、橙の残り火・遅れて明滅するきらめき・両方の光線の表面を這う粒の稲妻が出る。
//     周期的な脈動で火花が噴き、屈折の輪が広がる。光を足す代わりに周りを沈める（dim）。硬い輪・光条の星・線の稲妻は使わない
//   ・加算の光は、最も明るい色の値で明るさだけを丸め、色の比を保つ（白へ飛ばさない）。カメラのすぐ前を通る粒は薄くする

// 色（大蛇＝酸の緑、自機の主砲＝紫）
const B_CORE = [0.82, 1.0, 0.42]; const B_MID = [0.42, 1.0, 0.14]; const B_OUT = [0.12, 0.55, 0.04];
const S_CORE = [0.8, 0.62, 1.0]; const S_MID = [0.58, 0.3, 1.0];
const HOT = [1.0, 0.56, 0.16]; const EMBER = [1.0, 0.78, 0.36];
const TAU = Math.PI * 2;

// WebGPU 版：シェーダーは TSL（今の版の GLSL を1対1で写した。動きの JS は今の版と同じ）

// 加算の光の丸め：最も明るい値 pk で明るさだけを丸める
const toneKeep = (c) => { const pk = max(c.x, max(c.y, c.z)); return c.mul(float(1.0).sub(exp(pk.mul(-1.1)))).div(max(pk, 1e-3)); };
// GLSL の fract(sin(x) * 4375.85) と同じ乱数
const hashS = (x) => fract(sin(x).mul(4375.85));

function additive(U, nodes, depthTest = true) {
  return glowNodeMaterial(U, nodes, { depthTest });
}

// ---- 光線の帯（カメラへ向く帯。遠くでも細くなりすぎない） ----
// 流れるノイズ（ドメインワープ）で中身が前へ流れ、外の層は縁をノイズで削る。縞は入れない
function stripMaterial(U) {
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const z = U.uLen.mul(aT);
  const vp = modelViewMatrix.mul(vec4(0.0, 0.0, z, 1.0));
  const dir = normalize(modelViewMatrix.mul(vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  const c = cross(dir, vp.xyz);
  const side = select(length(c).greaterThan(1e-5), normalize(c), vec3(1.0, 0.0, 0.0));
  const neck = smoothstep(0.0, U.uR.mul(2.5), z);
  const wob = U.uWob.mul(sin(z.mul(0.05).sub(U.uTime.mul(23.0))).mul(0.55).add(sin(z.mul(0.13).sub(U.uTime.mul(41.0))).mul(0.45))).add(1.0);
  const w0 = U.uR.mul(mix(0.45, 1.0, neck)).mul(wob);
  // 見かけの太さに下限（遠くでも細くなりすぎない）と上限（カメラの近くを通っても画面を埋めない）
  const w = min(max(w0, U.uPx.mul(vp.z.negate())), U.uMaxPx.mul(vp.z.negate())).mul(U.uGrow);
  const vv = viewVertex(vec4(vp.xyz.add(side.mul(w).mul(aSide)), 1.0));
  const vZ = z.toVarying('vZ');
  const vFace = abs(dot(dir, normalize(vp.xyz))).toVarying('vFace'); // 1 に近いほど、光線を縦に見通している
  const fragmentNode = Fn(() => {
    const s = aSide;
    const q = vec2(s.mul(1.6), vZ.mul(0.018).sub(U.uTime.mul(U.uSpeed).mul(0.55)));
    const warp = fbm2(q.mul(1.3).add(vec2(3.1, 0.0)));
    const n = fbm2(vec2(s.mul(2.3).add(warp.mul(1.4)), vZ.mul(0.03).sub(U.uTime.mul(U.uSpeed))));
    const prof = exp(s.mul(s).mul(U.uSharp).negate());
    // 外の殻：中心から離れるほどノイズで削れる（縁がちぎれて揺れる）
    const carve = smoothstep(0.18, 0.62, n.add(float(1.0).sub(abs(s)).mul(0.55)).sub(0.25));
    const body = mix(prof, prof.mul(carve).mul(1.35), U.uShell);
    const ends = smoothstep(0.0, 6.0, vZ).mul(smoothstep(0.0, 10.0, U.uLen.sub(vZ)));
    const near = smoothstep(6.0, 40.0, vv.viewDist);
    // ほぼ真正面から見通す所だけ薄くする（斜めに見る光線は消さない）
    const endOn = mix(1.0, float(1.0).sub(smoothstep(0.975, 0.997, vFace).mul(0.7)), U.uEndOn);
    const col = mix(U.uOut, U.uIn, clamp(prof.mul(prof).mul(1.4).add(n.sub(0.5).mul(0.4)), 0.0, 1.0)).mul(U.uGain).mul(n.mul(0.5).add(0.75));
    return vec4(toneKeep(col).mul(1.5), body.mul(ends).mul(near).mul(endOn));
  })();
  return additive(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// ---- 光線に巻きつく2本のエネルギーの帯（らせん。前へ流れ、奥を回る所は暗い） ----
function helixMaterial(U) {
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const z = U.uLen.mul(aT);
  const th = z.mul(U.uTurn).sub(U.uTime.mul(U.uSpin)).add(U.uPhase);
  const r = U.uR.mul(U.uGrow).mul(smoothstep(0.0, U.uR.mul(4.0), z)).mul(sin(z.mul(0.07).sub(U.uTime.mul(17.0))).mul(0.18).add(1.0));
  const vp = modelViewMatrix.mul(vec4(cos(th).mul(r), sin(th).mul(r), z, 1.0));
  const ax = modelViewMatrix.mul(vec4(0.0, 0.0, z, 1.0));
  const tg = normalize(vec3(sin(th).negate().mul(r).mul(U.uTurn), cos(th).mul(r).mul(U.uTurn), 1.0));
  const tv = normalize(modelViewMatrix.mul(vec4(tg, 0.0)).xyz);
  const c = cross(tv, vp.xyz);
  const side = select(length(c).greaterThan(1e-5), normalize(c), vec3(1.0, 0.0, 0.0));
  const w = max(U.uW, vp.z.negate().mul(0.0018)).mul(min(U.uGrow, 1.0));
  const vBack = clamp(ax.z.sub(vp.z).div(max(r, 1e-3)), -1.0, 1.0).toVarying('vBack'); // 正なら光線の奥側
  const vv = viewVertex(vec4(vp.xyz.add(side.mul(w).mul(aSide)), 1.0));
  const vZ = z.toVarying('vZ');
  const fragmentNode = Fn(() => {
    const prof = exp(aSide.mul(aSide).mul(-3.2));
    const f0 = sin(vZ.mul(0.045).sub(U.uTime.mul(26.0))).mul(0.5).add(0.5);
    const flow = f0.mul(f0).mul(0.55).add(0.45);
    const ends = smoothstep(0.0, 24.0, vZ).mul(smoothstep(0.0, 70.0, U.uLen.sub(vZ)));
    const back = mix(1.0, 0.3, smoothstep(0.0, 0.7, vBack));
    const near = smoothstep(6.0, 40.0, vv.viewDist);
    return vec4(toneKeep(U.uCol.mul(1.4)).mul(1.5), prof.mul(flow).mul(ends).mul(back).mul(near).mul(U.uOpacity));
  })();
  return additive(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// ---- 粒（GPU で動かす）。種類：0 熱い粒（空気に止められる）・1 渦（口へ流れ込む）・3 きらめき（漂って明滅）・4 稲妻の粒（止まって瞬く） ----
function partMaterial(U) {
  // 位置と速度は4つ組で持つ（3つ組だと WebGPU が更新のたびに全件を4つ組へ詰め直す新しい配列を作り、ボス戦で毎コマ大量のゴミが出ていた。spec REQ-013）
  const aPos = attribute('aPos', 'vec4').xyz; const aVel = attribute('aVel', 'vec4').xyz;
  const aLife = attribute('aLife', 'vec4'); const aCol = attribute('aCol', 'vec4'); const aMisc = attribute('aMisc', 'vec4');
  const t = U.uNow.sub(aLife.x);
  const age = t.div(aLife.y);
  const type = aMisc.x;
  const isSwirl = type.greaterThan(0.5).and(type.lessThan(1.5));
  // 渦：口（uC）のまわりのらせんの腕に沿って、回りながら中心へ流れ込む
  const r = aMisc.z.mul(pow(max(age.oneMinus(), 0.0), 1.4));
  const ang = aMisc.y.add(aMisc.w.mul(age.add(age.mul(age).mul(1.6))));
  const rad = U.uE1.mul(cos(ang)).add(U.uE2.mul(sin(ang)));
  const pS = U.uC.add(rad.mul(r)).add(U.uAx.mul(aPos.x).mul(age.oneMinus()));
  const tang = U.uE1.mul(sin(ang).negate()).add(U.uE2.mul(cos(ang))).mul(sign(aMisc.w));
  const vS = tang.mul(r).mul(abs(aMisc.w)).mul(2.0).sub(rad.mul(aMisc.z).mul(1.4).div(max(aLife.y, 0.05)));
  // ほかの粒：空気に止められながら飛ぶ
  const d = select(type.greaterThan(2.5), float(0.9), float(3.2));
  const e = exp(d.negate().mul(t));
  const pO = aPos.add(aVel.mul(e.oneMinus()).div(d)).sub(U.uP);
  const vO = aVel.mul(e);
  const p = select(isSwirl, pS, pO);
  const v = select(isSwirl, vS, vO);
  const mv = cameraViewMatrix.mul(vec4(p, 1.0));
  const depth = mv.z.negate();
  const vNear = smoothstep(3.0, 16.0, depth).toVarying('vNear'); // カメラのすぐ前を通る粒は太い帯に見えるので薄くする
  const dv = cameraViewMatrix.mul(vec4(v, 0.0)).xyz;
  const sl = length(dv.xy);
  const dir = select(sl.greaterThan(1e-4), dv.xy.div(max(sl, 1e-4)), vec2(1.0, 0.0));
  const sideV = vec2(dir.y.negate(), dir.x);
  const w = max(aLife.z, depth.mul(0.0011));
  const round = select(aLife.w.lessThan(1e-4), float(1.0), float(0.0));
  const len = min(sl.mul(aLife.w), depth.mul(0.08)); // 筋の長さの上限（画面の大きさで）
  const P = positionGeometry.xy;
  const off = select(round.greaterThan(0.5), P.mul(2.0).mul(w), dir.mul(P.y.sub(0.5)).mul(w.mul(2.0).add(len)).add(sideV.mul(P.x).mul(2.0).mul(w)));
  const alive = age.greaterThanEqual(0.0).and(age.lessThan(1.0));
  const vertexNode = select(alive, cameraProjectionMatrix.mul(vec4(mv.xy.add(off), mv.z, mv.w)), vec4(2.0, 2.0, 2.0, 1.0));
  const vAge = age.toVarying('vAge'); const vRound = round.toVarying('vRound');
  const fragmentNode = Fn(() => {
    const vC = positionGeometry.xy.mul(2.0);
    const rr = length(vC);
    const kRound = rr.oneMinus().mul(rr.oneMinus()).mul(step(rr, 1.0));
    const y = vC.y.mul(0.5).add(0.5); const b = max(0.0, float(1.0).sub(abs(vC.x)));
    const kStreak = b.mul(b).mul(smoothstep(0.0, 0.9, y)).mul(y.mul(0.45).add(0.55));
    const k = select(vRound.greaterThan(0.5), kRound, kStreak);
    const vType = aMisc.x; const vSeed = aMisc.y;
    const f0 = pow(max(vAge.oneMinus(), 0.0), 1.3).mul(smoothstep(0.0, 0.12, vAge));
    const f1 = smoothstep(0.0, 0.2, vAge).mul(vAge.mul(0.9).add(0.45)); // 渦は中心へ近いほど明るい
    const f3 = sin(vAge.mul(3.14159)).mul(step(0.5, hashS(floor(vAge.mul(22.0)).add(vSeed.mul(91.7)))).mul(0.75).add(0.25)); // きらめき：不規則に明滅
    const f4 = vAge.oneMinus().mul(step(0.5, hashS(floor(vAge.mul(9.0)).add(vSeed.mul(53.1)))).mul(0.4).add(0.6)); // 稲妻の粒：一瞬だけ光って瞬く
    const fade = select(vType.greaterThan(3.5), f4, select(vType.greaterThan(2.5), f3, select(vType.greaterThan(0.5).and(vType.lessThan(1.5)), f1, f0)));
    const col = aCol.rgb.mul(aCol.a.mul(0.8).add(0.7));
    return vec4(toneKeep(col).mul(1.6), k.mul(fade).mul(vNear));
  })();
  return additive(U, { vertexNode, fragmentNode });
}

// 柔らかい光（芯・口の光・当たりの光・靄）。光条や縁は描かない
function glowMaterial(U) {
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const r = length(bb.vC);
    const k = exp(r.mul(r).mul(-5.5)).mul(float(1.0).sub(smoothstep(0.75, 1.0, r)));
    return vec4(toneKeep(U.uCol).mul(1.5), k.mul(U.uOpacity));
  })();
  return additive(U, { vertexNode: bb.vertexNode, fragmentNode }, false);
}

// ---- ぶつかり合いの塊：板の +y を画面の上の口の向きへ回し、口の側を緑、自機の側を紫に分ける ----
// 煮え立つ塊・外へ流れる柔らかな炎の舌（角度のノイズを半径と時間でずらして外へ流す。細い光条にしない）・小さな熱い芯
function coronaMaterial(U) {
  const vC = positionGeometry.xy.mul(2.0);
  const centre = modelViewMatrix.mul(vec4(0.0, 0.0, 0.0, 1.0));
  const ax = cameraViewMatrix.mul(vec4(U.uAxis, 0.0)).xyz;
  const l = length(ax.xy);
  const dd = select(l.greaterThan(1e-4), ax.xy.div(max(l, 1e-4)), vec2(0.0, 1.0));
  const vAcross = l.toVarying('vAcross'); // 0 なら光線を縦に見通している（色を分けない）
  const sd = vec2(dd.y, dd.x.negate());
  const mv = vec4(centre.xy.add(sd.mul(vC.x).add(dd.mul(vC.y)).mul(U.uSize)), centre.z, centre.w);
  const vertexNode = cameraProjectionMatrix.mul(mv);
  const fragmentNode = Fn(() => {
    const q = positionGeometry.xy.mul(2.0);
    const r = length(q);
    const d = q.div(max(r, 1e-4));
    const t = U.uTime;
    const n1 = fbm2(d.mul(2.4).add(vec2(r.mul(2.4).sub(t.mul(3.1)).add(U.uSeed), r.mul(1.9).sub(t.mul(2.3)))));
    const n2 = fbm2(d.mul(5.1).add(vec2(r.mul(-3.3).add(t.mul(1.4)), r.mul(2.8).sub(t.mul(3.9)).add(U.uSeed))));
    const tongues = pow(clamp(n1.mul(0.72).add(n2.mul(0.46)), 0.0, 1.0), 3.2).mul(2.6);
    const boil = fbm2(q.mul(3.6).add(vec2(t.mul(2.1), t.mul(-1.5))).add(U.uSeed));
    const ballR = boil.mul(0.09).add(0.17).add(U.uPush.mul(0.03));
    const ball = smoothstepR(ballR, ballR.mul(0.3), r);
    const core = exp(r.mul(r).mul(-160.0));
    const halo = exp(r.mul(r).mul(-6.0)).mul(0.24);
    const body = core.mul(1.8).add(ball.mul(boil.mul(0.6).add(0.5))).add(tongues.mul(1.35).mul(exp(r.mul(-2.2))).mul(smoothstep(0.05, 0.24, r))).add(halo);
    const split = clamp(vAcross.mul(2.5), 0.0, 1.0);
    const sideK = mix(0.5, smoothstep(-0.32, 0.32, q.y.div(max(r, 0.14))), split);
    const col0 = mix(U.uB, U.uA, sideK);
    const col = mix(col0, U.uMid, clamp(core.mul(1.1).add(ball.mul(0.3)), 0.0, 1.0));
    const edge = float(1.0).sub(smoothstep(0.7, 1.0, r));
    return vec4(toneKeep(col.mul(body.mul(0.7).add(0.8))).mul(1.45), clamp(body, 0.0, 2.4).mul(edge).mul(U.uOpacity).mul(step(r, 1.0)));
  })();
  return additive(U, { vertexNode, fragmentNode }, false);
}

export function createSerpentBeam({ scene, R = Math.random }) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const Z = new THREE.Vector3(0, 0, 1);
  const _v = new THREE.Vector3(); const _w = new THREE.Vector3(); const _u = new THREE.Vector3(); const _e1 = new THREE.Vector3(); const _e2 = new THREE.Vector3();
  const _p = new THREE.Vector3(); const _h = new THREE.Vector3(); const _b1 = new THREE.Vector3(); const _b2 = new THREE.Vector3(); const _q = new THREE.Vector3();

  // ---- 光線の帯：外の殻（ノイズで縁が削れる）・中の層・芯 ----
  const beam = new THREE.Group(); beam.visible = false; scene.add(beam);
  const strip = stripGeometry(140);
  const layerMeshes = [];
  const layer = (r, px, sharp, shell, speed, inn, out, gain, wob, order, maxPx) => {
    const mat = stripMaterial(nodeUniforms({ uLen: 600, uR: r, uPx: px, uMaxPx: maxPx, uGrow: 0, uTime: 0, uWob: wob, uGain: gain, uSharp: sharp, uShell: shell, uSpeed: speed, uEndOn: 0, uIn: new THREE.Color(...inn), uOut: new THREE.Color(...out) }));
    const m = new THREE.Mesh(strip, mat); m.frustumCulled = false; m.renderOrder = order; beam.add(m);
    layerMeshes.push(m);
    return mat.uniforms;
  };
  const layers = [
    layer(11.5, 0.008, 1.0, 1.0, 7, B_MID, B_OUT, 0.8, 0.12, 6, 0.038),
    layer(6, 0.004, 1.8, 0.55, 11, B_MID, [0.22, 0.8, 0.06], 0.95, 0.08, 7, 0.022),
    layer(2.2, 0.002, 2.6, 0.0, 16, B_CORE, B_CORE, 1.2, 0.05, 8, 0.008),
  ];
  const GAIN = layers.map((u) => u.uGain.value);
  // 巻きつく2本の帯
  const helixGeo = stripGeometry(280);
  const helices = [0, Math.PI].map((ph) => {
    const mat = helixMaterial(nodeUniforms({ uLen: 600, uR: 7.0, uW: 1.0, uTime: 0, uPhase: ph, uTurn: 0.085, uSpin: 19, uGrow: 0, uOpacity: 0, uCol: new THREE.Color(...B_CORE) }));
    const m = new THREE.Mesh(helixGeo, mat); m.frustumCulled = false; m.renderOrder = 9; beam.add(m);
    return mat.uniforms;
  });
  // 柔らかい光の板（芯・口・当たり・ぶつかりの芯・靄・押し切りの光）
  const glow = (order) => {
    const mat = glowMaterial(nodeUniforms({ uSize: 10, uAspect: 1, uRot: 0, uCol: new THREE.Color(1, 1, 1), uOpacity: 0 }));
    const m = new THREE.Mesh(quad, mat); m.frustumCulled = false; m.renderOrder = order; m.visible = false; scene.add(m);
    return { m, u: mat.uniforms };
  };
  const core = glow(10);     // 溜めの芯
  const mouthG = glow(10);   // 撃っている間の口の光
  const hitG = glow(10);     // 自機の盾に当たった所の光
  const knot = glow(15);     // ぶつかりの小さな熱い芯
  const haze = glow(12);     // ぶつかりの薄い靄
  const flashG = glow(14);   // ぶつかり始め・脈動・押し切りの一瞬の光
  const coronaMat = coronaMaterial(nodeUniforms({ uSize: 10, uAxis: new THREE.Vector3(0, 1, 0), uTime: 0, uOpacity: 0, uSeed: 0, uPush: 0,
    uA: new THREE.Color(...B_MID), uB: new THREE.Color(...S_MID), uMid: new THREE.Color(0.9, 0.95, 0.72) }));
  const corona = new THREE.Mesh(quad, coronaMat); corona.frustumCulled = false; corona.renderOrder = 14; corona.visible = false; scene.add(corona);
  const mouthLight = new THREE.PointLight(0x9cff40, 0, 420, 1.3); scene.add(mouthLight);
  const clashLight = new THREE.PointLight(0xc8ff9a, 0, 400, 1.4); scene.add(clashLight);

  // ---- 粒の束（GPU で動かす）。長く残る粒と、一瞬で消える稲妻の粒は別の束（稲妻の大量の粒が火花を上書きしないように） ----
  let now = 0; const P0 = new THREE.Vector3();
  function makeParts(N, order) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', quad.attributes.position); g.setIndex(quad.index);
    const attrs = [];
    const at = (name, n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(N * n), n); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); attrs.push(a); return a; };
    const aPos = at('aPos', 4); const aVel = at('aVel', 4); const aLife = at('aLife', 4); const aCol = at('aCol', 4); const aMisc = at('aMisc', 4);
    for (let i = 0; i < N; i++) { aLife.array[i * 4] = -99; aLife.array[i * 4 + 1] = 1; }
    g.instanceCount = N;
    const mat = partMaterial(nodeUniforms({ uNow: 0, uP: new THREE.Vector3(), uC: new THREE.Vector3(), uE1: new THREE.Vector3(1, 0, 0), uE2: new THREE.Vector3(0, 1, 0), uAx: new THREE.Vector3(0, 0, 1) }));
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = order; scene.add(mesh);
    let cur = 0; const segs = []; // 書き換えた範囲だけを送る [始め, 終わり)
    let first = true;
    return {
      mesh, mat,
      // pos は自機からの相対。種類 1（渦）では pos.x を前後の深さに使う
      emit(type, pos, vel, delay, life, w, stretch, col, hot, seed, r0 = 0, spin = 0) {
        const i = cur; cur = (cur + 1) % N;
        const rel = type === 1;
        aPos.array[i * 4] = pos.x + (rel ? 0 : P0.x); aPos.array[i * 4 + 1] = pos.y + (rel ? 0 : P0.y); aPos.array[i * 4 + 2] = pos.z + (rel ? 0 : P0.z);
        aVel.array[i * 4] = vel.x; aVel.array[i * 4 + 1] = vel.y; aVel.array[i * 4 + 2] = vel.z;
        aLife.array[i * 4] = now + delay; aLife.array[i * 4 + 1] = life; aLife.array[i * 4 + 2] = w; aLife.array[i * 4 + 3] = stretch;
        aCol.array[i * 4] = col[0]; aCol.array[i * 4 + 1] = col[1]; aCol.array[i * 4 + 2] = col[2]; aCol.array[i * 4 + 3] = hot;
        aMisc.array[i * 4] = type; aMisc.array[i * 4 + 1] = seed; aMisc.array[i * 4 + 2] = r0; aMisc.array[i * 4 + 3] = spin;
        const s = segs[segs.length - 1];
        if (s && s[1] === i) s[1] = i + 1; else segs.push([i, i + 1]);
      },
      update(time) {
        mat.uniforms.uNow.value = time; mat.uniforms.uP.value.copy(P0);
        if (!segs.length) return;
        for (const a of attrs) {
          if (!first) for (const [s0, s1] of segs) a.addUpdateRange(s0 * a.itemSize, (s1 - s0) * a.itemSize);
          a.needsUpdate = true;
        }
        first = false; segs.length = 0;
      },
    };
  }
  const pt = makeParts(4096, 13);
  const bt = makeParts(8192, 13);
  const emit = pt.emit;
  const ZERO = new THREE.Vector3();
  function basis(axis) {
    _u.copy(axis).normalize();
    _e1.set(0, 1, 0).cross(_u); if (_e1.lengthSq() < 1e-4) _e1.set(1, 0, 0).cross(_u);
    _e1.normalize(); _e2.crossVectors(_u, _e1);
  }
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

  // ---- 状態 ----
  let swirlAcc = 0; let flowAcc = 0; let hotAcc = 0; let rayAcc = 0; let embAcc = 0; let glitAcc = 0; let boltAcc = 1; let crawlAcc = 0; let impAcc = 0;
  let clashOn = false; let dim = 0; let dimT = 0; let flashT = 9; let flashSize = 10; let flashDur = 0.22; const flashP = new THREE.Vector3();
  let beamLenToC = 100; let beamR = 12;

  function setBeam(A, dir, len, grow, time, wide = 1) {
    beam.visible = grow > 0.001;
    beam.position.copy(A);
    beam.quaternion.setFromUnitVectors(Z, dir);
    for (const u of layers) { u.uLen.value = len; u.uGrow.value = grow * wide; u.uTime.value = time; }
    for (const u of helices) { u.uLen.value = len; u.uGrow.value = grow * wide; u.uTime.value = time; }
  }

  // 粒の稲妻：S から dirV の向きへ reach の長さ。軸のまわり半径 rad を、wrap だけ回りながら這う（arc なら始めと終わりは軸に戻る）。
  // 芯の粒を密に並べ、1つおきに大きく暗い光の粒を重ねて柔らかな光にする
  // 中点をずらす折れ線（両端は0）。粗い段ほど大きくずらし、細かい段ほど小さく（稲妻らしい細かな折れ）
  const JX = new Float32Array(17); const JY = new Float32Array(17);
  function jag() {
    JX.fill(0); JY.fill(0);
    let amp = 1;
    for (let st = 16; st >= 2; st >>= 1) {
      for (let i = st >> 1; i < 16; i += st) {
        JX[i] = (JX[i - (st >> 1)] + JX[i + (st >> 1)]) * 0.5 + (R() - 0.5) * amp;
        JY[i] = (JY[i - (st >> 1)] + JY[i + (st >> 1)]) * 0.5 + (R() - 0.5) * amp;
      }
      amp *= 0.58;
    }
  }
  function dots(a, b, n0, delay, life, wd, colCore, colGlow, seed, glowEvery) {
    // 粒の明るい芯は板の幅の4割ほど。間をそれより狭くして、粒が重なって1本の光の筋に見えるようにする
    const n = Math.max(n0, Math.min(14, Math.ceil(a.distanceTo(b) / (wd * 0.7))));
    for (let k = 0; k < n; k++) {
      _q.copy(a).lerp(b, (k + 1) / n);
      bt.emit(4, _q, ZERO, delay, life, wd, 0, colCore, 0.7, seed);
      if (k % (glowEvery * 2) === 0) bt.emit(4, _q, ZERO, delay, life * 1.2, wd * 3.4, 0, colGlow, 0, seed);
    }
  }
  const _br = new THREE.Vector3(); const _bd = new THREE.Vector3();
  function bolt(S, dirV, reach, rad, wrap, colCore, colGlow, dist, arc) {
    _b1.set(0, 1, 0).cross(dirV); if (_b1.lengthSq() < 1e-4) _b1.set(1, 0, 0).cross(dirV);
    _b1.normalize(); _b2.crossVectors(dirV, _b1);
    const a0 = R() * TAU; const turn = (R() < 0.5 ? -1 : 1) * wrap * (0.6 + 0.8 * R());
    const life = 0.06 + 0.06 * R(); const delay = R() * 0.02; const seed = R();
    const wd = dist * (0.003 + 0.001 * R());
    const jagA = reach * 0.26 + rad * 0.35;
    const bi = 4 + Math.floor(R() * 9); // 枝の出る所
    jag();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const env = arc ? Math.sin(Math.PI * t) : Math.min(1, t * 3.5);
      const ang = a0 + turn * t;
      _p.copy(S).addScaledVector(dirV, reach * t)
        .addScaledVector(_b1, Math.cos(ang) * rad * env + JX[i] * jagA)
        .addScaledVector(_b2, Math.sin(ang) * rad * env + JY[i] * jagA);
      if (i > 0) dots(_h, _p, 3, delay, life, wd, colCore, colGlow, seed, 2);
      if (i === bi) _br.copy(_p);
      _h.copy(_p);
    }
    // 枝：折れ目の1つから、外へ斜めに短く
    _bd.copy(dirV).multiplyScalar(0.6).addScaledVector(_b1, (R() - 0.5) * 2).addScaledVector(_b2, (R() - 0.5) * 2).normalize();
    const bl = reach * (0.2 + 0.2 * R());
    jag();
    _h.copy(_br);
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      _p.copy(_br).addScaledVector(_bd, bl * t).addScaledVector(_b1, JX[i * 2] * bl * 0.35).addScaledVector(_b2, JY[i * 2] * bl * 0.35);
      dots(_h, _p, 2, delay + 0.01, life * 0.8, wd * 0.8, colCore, colGlow, seed, 2);
      _h.copy(_p);
    }
  }

  // 熱い粒を、軸 _u に直角な円盤の向きへ（side の側へ少し傾けて）飛ばす。side -1：口の側、1：自機の側
  function spray(C, dist, n, speed, life, side0 = 0) {
    for (let i = 0; i < n; i++) {
      const side = side0 || (R() < 0.5 ? -1 : 1);
      const th = R() * TAU;
      _v.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).addScaledVector(_u, side * (0.08 + 0.5 * R()));
      const rr = R();
      // 目標の絵の放射は、太さと長さのそろわない筋が密に出る。14% ほどは画面の3割ほどまで届く長い筋にする
      _v.normalize().multiplyScalar(dist * speed * (0.35 + 0.9 * rr * rr + (R() < 0.14 ? 1.6 : 0)));
      const hot = R();
      const col = hot < 0.24 ? HOT : side < 0 ? (R() < 0.45 ? B_CORE : B_MID) : (R() < 0.45 ? S_CORE : S_MID);
      _p.copy(C).addScaledVector(_v, 0.004);
      emit(0, _p, _v, 0, life * (0.6 + 0.8 * R()), dist * (0.002 + 0.0018 * R()), 0.05 + 0.06 * R(), col, hot < 0.24 ? 0.95 : 0.4 + 0.5 * R(), R());
    }
  }

  return {
    // 溜め：逆向きに回る2本のらせんの腕に沿って、粒が口へ流れ込む。芯は小さく育ち、撃つ直前だけ震える。aim があれば薄い予告の光線
    charge(A, u, time, aimDir = null, aimLen = 0, dt = 1 / 60) {
      const dist = A.length() + 6;
      basis(aimDir || _v.copy(A).negate());
      pt.mat.uniforms.uC.value.copy(A); pt.mat.uniforms.uE1.value.copy(_e1); pt.mat.uniforms.uE2.value.copy(_e2); pt.mat.uniforms.uAx.value.copy(_u);
      swirlAcc += dt * (70 + 220 * u);
      while (swirlAcc >= 1) {
        swirlAcc -= 1;
        const arm = R() < 0.6 ? 1 : -1; // 2本の腕は逆向きに回る
        const k = Math.floor(R() * 3);
        const a0 = (k / 3) * TAU + R() * 0.5;
        const r0 = dist * (0.06 + 0.07 * R()) * (0.8 + 0.4 * u);
        _p.set((R() - 0.3) * dist * 0.05, 0, 0);
        emit(1, _p, ZERO, 0, 0.45 + 0.35 * R(), dist * (0.0014 + 0.0012 * R()), 0.055, R() < 0.25 ? B_CORE : B_MID, 0.3 + 0.5 * u, R(), r0, arm * (3.5 + 2.5 * R()));
      }
      const tremble = u > 0.85 ? (u - 0.85) / 0.15 : 0;
      core.m.visible = true;
      core.m.position.copy(A).addScaledVector(_e1, (R() - 0.5) * dist * 0.006 * tremble).addScaledVector(_e2, (R() - 0.5) * dist * 0.006 * tremble);
      core.u.uCol.value.setRGB(...lerp3(B_MID, B_CORE, u));
      core.u.uOpacity.value = 0.35 + 0.65 * u;
      core.u.uSize.value = dist * (0.012 + 0.03 * u) * (1 + 0.15 * tremble * Math.sin(time * 90));
      mouthLight.position.copy(A); mouthLight.intensity = 120 + 380 * u * u;
      // 予告の線は芯の層だけを細く、暗く、瞬かせて出す（外の層は世界の太さなので、カメラの近くを通ると太い帯に見える）
      if (aimDir) {
        setBeam(A, aimDir, aimLen, 0.12 + 0.08 * u, time, 1);
        layerMeshes[0].visible = false; layerMeshes[1].visible = false; layers[2].uMaxPx.value = 0.0028;
        layers[2].uGain.value = GAIN[2] * (0.35 + 0.25 * u) * (0.75 + 0.25 * Math.sin(time * 47));
        for (const h of helices) h.uOpacity.value = 0;
      } else beam.visible = false;
      mouthG.m.visible = false; hitG.m.visible = false;
    },
    // 撃つ瞬間の波動：光線と直角に広がる粒の輪を2重（2つ目は0.07秒遅れ）と、前へ走る細い粒
    fireWave(A, dir, P, time) {
      P0.fromArray(P); now = time;
      const dist = A.length() + 6;
      basis(dir);
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < 56; i++) {
          const th = (i / 56) * TAU + R() * 0.1;
          _v.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).multiplyScalar(dist * (1.4 + 0.5 * R()) * (ring ? 1.3 : 1));
          emit(0, A, _v, ring * 0.07, 0.35 + 0.15 * R(), dist * 0.0022, 0.05, ring ? B_MID : B_CORE, 0.6, R());
        }
      }
      for (let i = 0; i < 18; i++) {
        _v.copy(_u).multiplyScalar(dist * (3 + 3 * R())).addScaledVector(_e1, (R() - 0.5) * dist * 0.3).addScaledVector(_e2, (R() - 0.5) * dist * 0.3);
        emit(0, A, _v, 0, 0.25 + 0.15 * R(), dist * 0.002, 0.07, B_CORE, 0.7, R());
      }
      flashT = 0; flashDur = 0.22; flashSize = dist * 0.06; flashP.copy(A);
    },
    // 撃っている間：grow 0..1（始まりは一瞬太く）。hit（自機の盾で止まった所）があれば、そこに当たりの光と熱い粒
    // clashing：自機の光線とぶつかっている間。口の光を小さくし、光線を真正面から見通す所を薄くする
    fire(A, dir, len, grow, time, hit = null, clashing = false, dt = 1 / 60) {
      core.m.visible = false;
      beamLenToC = len;
      setBeam(A, dir, len, grow, time);
      layerMeshes[0].visible = true; layerMeshes[1].visible = true; layers[2].uMaxPx.value = 0.008;
      layers.forEach((u, i) => { u.uGain.value = GAIN[i]; u.uEndOn.value = clashing ? 1 : 0; });
      for (const h of helices) h.uOpacity.value = (clashing ? 0.35 : 0.6) * Math.min(1, grow);
      const dist = A.length() + 6;
      beamR = 9 * Math.min(1.3, grow);
      mouthG.m.visible = grow > 0.01; mouthG.m.position.copy(A);
      mouthG.u.uCol.value.setRGB(...B_CORE);
      mouthG.u.uOpacity.value = Math.min(1, grow) * (clashing ? 0.6 : 0.9);
      mouthG.u.uSize.value = dist * 0.05 * grow * (clashing ? 0.75 : 1) * (0.92 + 0.08 * Math.sin(time * 37));
      mouthLight.position.copy(A); mouthLight.intensity = 700 * grow * (clashing ? 0.25 : 1);
      // 光線のまわりを、らせんに回りながら前へ流れる粒
      basis(dir);
      flowAcc += dt * 110 * Math.min(1, grow);
      while (flowAcc >= 1) {
        flowAcc -= 1;
        const z = R() * Math.min(len, 380); const th = R() * TAU; const rr = 9 * (1.1 + 0.6 * R()) * grow;
        _p.copy(A).addScaledVector(_u, z).addScaledVector(_e1, Math.cos(th) * rr).addScaledVector(_e2, Math.sin(th) * rr);
        _v.copy(_u).multiplyScalar(220 + 160 * R()).addScaledVector(_e1, -Math.sin(th) * 60).addScaledVector(_e2, Math.cos(th) * 60);
        emit(0, _p, _v, 0, 0.3 + 0.25 * R(), 0.5 + 0.4 * R(), 0.05, R() < 0.3 ? B_CORE : B_MID, 0.3, R());
      }
      // 光線の表面を這う粒の稲妻（口の近くほど多い）
      crawlAcc += dt;
      if (crawlAcc > 0.07 && grow > 0.3) {
        crawlAcc = 0;
        const n = clashing ? 1 : 2;
        for (let k = 0; k < n; k++) {
          const z0 = Math.min(len - 10, 8 + Math.pow(R(), 1.6) * Math.min(len, 420));
          if (z0 < 4) continue;
          _w.copy(A).addScaledVector(_u, z0);
          bolt(_w, _u, Math.min(len - z0, 30 + 70 * R()), beamR * (0.95 + 0.3 * R()), 1.1, B_CORE, scale3(B_MID, 0.4), _w.length() + 6, false);
        }
      }
      hitG.m.visible = !!hit && grow > 0.05;
      if (hit) {
        const hd = hit.length() + 6;
        hitG.m.position.copy(hit); hitG.u.uCol.value.setRGB(...B_CORE);
        hitG.u.uOpacity.value = grow * 0.8; hitG.u.uSize.value = hd * 0.05 * (0.9 + 0.1 * Math.sin(time * 53));
        impAcc += dt * 70;
        while (impAcc >= 1) {
          impAcc -= 1;
          _v.copy(dir).multiplyScalar(-1).addScaledVector(_e1, (R() - 0.5) * 1.6).addScaledVector(_e2, (R() - 0.5) * 1.6).normalize().multiplyScalar(hd * (1 + 2 * R()));
          emit(0, hit, _v, 0, 0.2 + 0.2 * R(), hd * 0.0022, 0.05, R() < 0.3 ? HOT : B_CORE, 0.6, R());
        }
      }
    },
    hide() {
      beam.visible = false; core.m.visible = false; mouthG.m.visible = false; hitG.m.visible = false;
      mouthLight.intensity = 0;
    },
    // ぶつかり合い：C（ぶつかる点、自機からの相対）。axis は大蛇の光線の向き（口 → C）。power 0..1 は自機の主砲の強さ。P は自機の位置。
    // push 0..1 は押し込み具合（大きいほど自機が押している）
    clash(C, axis, power, time, dt, P, push = 0.5) {
      clashOn = true; now = time; P0.fromArray(P);
      const dist = C.length() + 6;
      basis(axis);
      const flick = 0.85 + 0.15 * Math.sin(time * 71) + 0.1 * Math.sin(time * 137);
      // 1) 空気に止められる熱い粒：ぶつかる面に沿って円盤状に。口の側は緑、自機の側は紫、一部は熱い橙
      hotAcc += dt * (320 + 160 * power);
      const nHot = Math.floor(hotAcc); hotAcc -= nHot;
      spray(C, dist, nHot, 1.1 + 0.3 * power, 0.45);
      // 1a) 柔らかく太い光の筋：芯から外へ走る、ぼけた長い筋（光条の星のように止まった線にはせず、飛んで消える粒で描く）
      rayAcc += dt * 12;
      while (rayAcc >= 1) {
        rayAcc -= 1;
        const side = R() < 0.5 ? -1 : 1;
        const th = R() * TAU;
        _v.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).addScaledVector(_u, side * 0.15 * R()).normalize().multiplyScalar(dist * (1.0 + 0.6 * R()));
        emit(0, C, _v, 0, 0.2 + 0.1 * R(), dist * 0.005, 0.11, side < 0 ? B_MID : S_MID, 0.25, R());
      }
      // 1b) 芯のまわりで弾ける、短く明るい火花（密なはじけ）
      for (let i = 0; i < nHot; i++) {
        _v.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(dist * (0.25 + 0.55 * R()));
        const hot = R();
        emit(0, C, _v, 0, 0.1 + 0.12 * R(), dist * (0.0018 + 0.0012 * R()), 0.035, hot < 0.35 ? EMBER : hot < 0.7 ? B_CORE : S_CORE, 1.0, R());
      }
      // 2) 橙の残り火：ゆっくり漂って冷える小さな粒
      embAcc += dt * 50;
      while (embAcc >= 1) {
        embAcc -= 1;
        const th = R() * TAU;
        _v.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).addScaledVector(_u, (R() - 0.5) * 0.8).normalize().multiplyScalar(dist * (0.5 + 0.9 * R()));
        emit(0, C, _v, 0, 0.6 + 0.6 * R(), dist * (0.0016 + 0.001 * R()), 0.02, R() < 0.6 ? HOT : EMBER, 0.7, R());
      }
      // 3) 遅れて漂うきらめき
      glitAcc += dt * 30;
      while (glitAcc >= 1) {
        glitAcc -= 1;
        _v.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(dist * (0.1 + 0.3 * R()));
        _p.copy(C).addScaledVector(_v, 0.25);
        emit(3, _p, _v, 0.05, 0.8 + 0.6 * R(), dist * (0.0012 + 0.001 * R()), 0, R() < 0.5 ? B_CORE : S_CORE, 0.4, R());
      }
      // 4) 両方の光線の表面を這う粒の稲妻（口の側は緑、自機の側は紫）と、塊のまわりへ跳ねる短い稲妻
      boltAcc += dt;
      if (boltAcc > 0.045) {
        boltAcc = 0;
        const toMouth = beamLenToC; const toShip = C.length();
        _w.copy(_u).negate();
        for (let k = 0; k < 2; k++) {
          if (R() < 0.2) continue;
          bolt(C, _w, Math.min(toMouth * 0.75, dist * (0.12 + 0.2 * R())), beamR * (0.9 + 0.4 * R()), 1.2, B_CORE, scale3(B_MID, 0.4), dist, false);
        }
        _w.copy(C).negate().normalize();
        for (let k = 0; k < 2; k++) {
          if (R() < 0.2) continue;
          bolt(C, _w, Math.min(toShip * 0.7, dist * (0.12 + 0.2 * R())), Math.max(2.2, dist * 0.016) * (0.9 + 0.5 * R()), 1.2, S_CORE, scale3(S_MID, 0.45), dist, false);
        }
        for (let k = 0; k < 2; k++) {
          const th = R() * TAU;
          _w.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).addScaledVector(_u, (R() - 0.5) * 0.6).normalize();
          const sideCol = R() < 0.5;
          bolt(C, _w, dist * (0.05 + 0.07 * R()), dist * 0.008, 1.2, sideCol ? B_CORE : S_CORE, scale3(sideCol ? B_MID : S_MID, 0.4), dist, true);
        }
      }
      // 5) 2色に分かれて煮え立つ塊と、小さな熱い芯。薄い光の靄
      corona.visible = true; corona.position.copy(C);
      coronaMat.uniforms.uAxis.value.copy(_u).negate();
      coronaMat.uniforms.uTime.value = time; coronaMat.uniforms.uPush.value = push;
      coronaMat.uniforms.uSize.value = dist * 0.12 * (1 + 0.25 * power) * flick;
      coronaMat.uniforms.uOpacity.value = 1;
      const mixT = 0.5 + 0.5 * Math.sin(time * 9);
      knot.m.visible = true; knot.m.position.copy(C);
      knot.u.uCol.value.setRGB(...lerp3(B_CORE, S_CORE, mixT)); knot.u.uOpacity.value = 1;
      knot.u.uSize.value = dist * 0.018 * flick;
      haze.m.visible = true; haze.m.position.copy(C);
      haze.u.uCol.value.setRGB(...lerp3(B_MID, S_MID, 1 - mixT)); haze.u.uOpacity.value = 0.06;
      haze.u.uSize.value = dist * 0.16;
      clashLight.position.copy(C); clashLight.intensity = 260 * flick;
      dimT = Math.max(dimT, 0.26);
    },
    endClash() { clashOn = false; },
    // 押し合いの脈動：火花が噴き、塊が一瞬ふくらむ（戦いの側が屈折の輪と揺れを合わせる）
    pulse(C, axis, k, P, time) {
      P0.fromArray(P); now = time; basis(axis);
      const dist = C.length() + 6;
      spray(C, dist, Math.round(55 * k), 1.25, 0.45);
      // 衝撃の粒の輪：屈折の輪と同じ速さで広がる（空気に止められて、画面の高さの3割ほどで止まる）
      const ph0 = R() * TAU;
      for (let i = 0; i < 90; i++) {
        const th = ph0 + (i / 90) * TAU;
        _v.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).multiplyScalar(dist * (0.95 + 0.15 * R()) * k);
        const up = Math.sin(th) > 0;
        emit(0, C, _v, 0, 0.38 + 0.08 * R(), dist * 0.0026, 0.03, up ? B_MID : S_MID, 0.5, R());
      }
      flashT = 0; flashDur = 0.16; flashSize = dist * 0.035 * k; flashP.copy(C);
      clashLight.intensity = Math.max(clashLight.intensity, 420 * k);
    },
    // ぶつかり始め・押し切った・爆ぜた瞬間：熱い粒を四方へ、きらめき、一瞬の柔らかい光
    burst(C, axis, scale = 1, P = null, time = null) {
      if (P) P0.fromArray(P);
      if (time != null) now = time;
      const dist = C.length() + 6;
      basis(axis);
      spray(C, dist, Math.round(70 * scale), 1.3 * Math.sqrt(scale), 0.5);
      for (let i = 0; i < Math.round(50 * scale); i++) {
        _v.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(dist * (0.4 + 1.0 * R()) * Math.sqrt(scale));
        const hot = R();
        emit(0, C, _v, 0, 0.3 + 0.4 * R(), dist * (0.0022 + 0.002 * R()), 0.05, hot < 0.3 ? HOT : hot < 0.65 ? B_CORE : S_CORE, 0.6, R());
      }
      for (let i = 0; i < Math.round(28 * scale); i++) {
        _v.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(dist * (0.15 + 0.4 * R()));
        emit(3, C, _v, 0.08 + 0.1 * R(), 0.9 + 0.7 * R(), dist * 0.0014, 0, R() < 0.5 ? B_CORE : S_CORE, 0.5, R());
      }
      flashT = 0; flashDur = 0.22; flashSize = dist * 0.07 * scale; flashP.copy(C);
      clashLight.position.copy(C); clashLight.intensity = 600 * scale;
      dimT = Math.max(dimT, 0.3);
    },
    // 押し切った瞬間：口のまわりへ緑の光の粒が飛び散り返り、紫の稲妻が口へ走り込む
    splash(A, axis, P, time) {
      P0.fromArray(P); now = time; basis(axis);
      const dist = A.length() + 6;
      for (let i = 0; i < 80; i++) {
        const th = R() * TAU;
        _v.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).multiplyScalar(0.6 + 0.8 * R()).addScaledVector(_u, -(0.3 + 0.9 * R()));
        _v.multiplyScalar(dist * (0.6 + 1.2 * R()));
        emit(0, A, _v, 0, 0.35 + 0.4 * R(), dist * (0.0022 + 0.002 * R()), 0.05, R() < 0.4 ? B_CORE : R() < 0.7 ? B_MID : HOT, 0.5, R());
      }
      _w.copy(_u).negate();
      for (let k = 0; k < 4; k++) {
        const th = R() * TAU;
        _v.copy(_e1).multiplyScalar(Math.cos(th)).addScaledVector(_e2, Math.sin(th)).addScaledVector(_w, 0.4).normalize(); // _q は bolt の中で使うので向きは _v に置く
        bolt(A, _v, dist * (0.06 + 0.06 * R()), dist * 0.01, 1.5, S_CORE, scale3(S_MID, 0.45), dist, true);
      }
    },
    // 周りの沈みの強さ（0..1）。戦いの側が画面の外側を暗くする
    get dim() { return dim; },
    // 毎コマ：粒の時計と自機の位置を進め、一瞬の光と沈みを戻す。ぶつかり合いが無いコマは塊・芯・靄を消す
    update(time, dt, P) {
      now = time; if (P) P0.fromArray(P);
      pt.update(time); bt.update(time);
      if (!clashOn) { knot.m.visible = false; haze.m.visible = false; corona.visible = false; clashLight.intensity = Math.max(0, clashLight.intensity - dt * 5000); }
      clashOn = false;
      flashT += dt;
      flashG.m.visible = flashT < flashDur;
      if (flashG.m.visible) {
        const u = flashT / flashDur;
        flashG.m.position.copy(flashP); flashG.u.uCol.value.setRGB(...lerp3(B_CORE, S_CORE, 0.35));
        flashG.u.uOpacity.value = (1 - u) * (1 - u); flashG.u.uSize.value = flashSize * (0.7 + 0.6 * u);
      }
      dim += (dimT - dim) * (1 - Math.exp(-dt * 8));
      dimT = Math.max(0, dimT - dt * 0.9);
    },
    // 確認用
    get parts() { return { beam, core, mouthG, hitG, knot, haze, flashG, corona, helices: beam.children.slice(3), particles: pt.mesh, bolts: bt.mesh, lights: [mouthLight, clashLight] }; },
    get state() { return { beam: beam.visible, len: layers[0].uLen.value, grow: layers[0].uGrow.value, core: core.m.visible, clash: corona.visible, dim: Number(dim.toFixed(2)) }; },
  };
}
