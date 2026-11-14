// 自由飛行の計算。three.js に依存しない。
// 姿勢は四元数で持ち、機体の軸まわりの回転速度を積み上げる。範囲の端も自動の水平戻しもない。
// 機体の前は +Z、上は +Y。後ろから見て画面の右は -X。

export const FLIGHT = {
  pitchRate: 1.7, // 上下の旋回（ラジアン/秒）。押し続ければ約3.7秒で一回転する
  yawRate: 1.1, // 左右の旋回
  rollRate: 2.8, // 機体軸まわりの回転
  response: 4.5, // 回転速度が入力へ追いつく速さ。急に変わらないようにする
  cruiseSpeed: 40,
  boostSpeed: 130,
  bankMax: 0.75, // 左右に旋回する間だけ見せる機体の傾き
  leanMax: 0.12, // 上下に旋回する間だけ見せる機首の振り
};

export function createFlightState() {
  return { q: [0, 0, 0, 1], rate: [0, 0, 0], pos: [0, 0, 0], speed: FLIGHT.cruiseSpeed, bank: 0, lean: 0 };
}

export function quatMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function quatNormalize(q) {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function rotate(q, v) {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

export function forwardOf(f) {
  return rotate(f.q, [0, 0, 1]);
}

export function stepFlightState(f, dt, inp, boost) {
  const target = [
    ((inp.down ? 1 : 0) - (inp.up ? 1 : 0)) * FLIGHT.pitchRate, // +X まわりは機首下げ
    ((inp.left ? 1 : 0) - (inp.right ? 1 : 0)) * FLIGHT.yawRate, // +Y まわりは画面の左へ
    ((inp.rollRight ? 1 : 0) - (inp.rollLeft ? 1 : 0)) * FLIGHT.rollRate, // +Z まわりは後ろから見て右回り
  ];
  const k = 1 - Math.exp(-FLIGHT.response * dt);
  for (let i = 0; i < 3; i++) f.rate[i] += (target[i] - f.rate[i]) * k;

  const half = dt * 0.5;
  f.q = quatNormalize(quatMul(f.q, [f.rate[0] * half, f.rate[1] * half, f.rate[2] * half, 1]));

  f.speed = FLIGHT.cruiseSpeed + (FLIGHT.boostSpeed - FLIGHT.cruiseSpeed) * boost;
  const fw = forwardOf(f);
  for (let i = 0; i < 3; i++) f.pos[i] += fw[i] * f.speed * dt;

  // 見た目の傾きは回転速度から決める（回転速度がなめらかなので、傾きも飛ばない）
  f.bank = -(f.rate[1] / FLIGHT.yawRate) * FLIGHT.bankMax;
  f.lean = (f.rate[0] / FLIGHT.pitchRate) * FLIGHT.leanMax;
  return f;
}

// 道に沿って進む区間の動き。前へは自動で進み、矢印で道の中を上下左右へ動く。
// 機首は動く向きへ少しだけ向く（照準もそちらへ寄る）。道の中心から RAIL.radius より外へは出ない。
// Q / E を押している間は機体を大きく傾け、その向きへ速く動く。
// 道の区間の動き。機首の振れ（yawK・pitchK）を小さくして、画面が大きく揺れないようにする
export const RAIL = { lateral: 26, vertical: 20, response: 2.5, radius: 40, tiltMax: 1.3, tiltPush: 14, yawK: 0.35, pitchK: 0.35 };

function quatFromAxis(ax, ay, az, a) {
  const s = Math.sin(a / 2);
  return [ax * s, ay * s, az * s, Math.cos(a / 2)];
}

export function stepRail(f, dt, inp, boost, center = [0, 0]) {
  if (!f.rv) f.rv = [0, 0];
  if (f.tilt === undefined) f.tilt = 0;
  const k = 1 - Math.exp(-RAIL.response * dt);
  const tiltIn = (inp.rollRight ? 1 : 0) - (inp.rollLeft ? 1 : 0);
  f.tilt += (tiltIn * RAIL.tiltMax - f.tilt) * (1 - Math.exp(-8 * dt));
  // +X は画面の左。右回り（E）に傾けると右（-X）へ速く動く
  const tx = ((inp.left ? 1 : 0) - (inp.right ? 1 : 0)) * RAIL.lateral - (f.tilt / RAIL.tiltMax) * RAIL.tiltPush;
  const ty = ((inp.up ? 1 : 0) - (inp.down ? 1 : 0)) * RAIL.vertical;
  f.rv[0] += (tx - f.rv[0]) * k;
  f.rv[1] += (ty - f.rv[1]) * k;

  f.speed = FLIGHT.cruiseSpeed + (FLIGHT.boostSpeed - FLIGHT.cruiseSpeed) * boost;
  f.pos[0] += f.rv[0] * dt;
  f.pos[1] += f.rv[1] * dt;
  f.pos[2] += f.speed * dt;
  // 道の筒の外へ出ない。外向きの速さは消す
  const dx = f.pos[0] - center[0]; const dy = f.pos[1] - center[1];
  const r = Math.hypot(dx, dy);
  if (r > RAIL.radius) {
    const nx = dx / r; const ny = dy / r;
    f.pos[0] = center[0] + nx * RAIL.radius; f.pos[1] = center[1] + ny * RAIL.radius;
    const out = f.rv[0] * nx + f.rv[1] * ny;
    if (out > 0) { f.rv[0] -= nx * out; f.rv[1] -= ny * out; }
  }

  // 姿勢：動く向きへ機首を少し向け、傾きを足す
  const yaw = Math.atan2(f.rv[0], f.speed) * RAIL.yawK;
  const pitch = -Math.atan2(f.rv[1], f.speed) * RAIL.pitchK;
  const qy = quatFromAxis(0, 1, 0, yaw);
  const qp = quatFromAxis(1, 0, 0, pitch);
  const qr = quatFromAxis(0, 0, 1, f.tilt);
  f.q = quatNormalize(quatMul(quatMul(qy, qp), qr));
  // 機体の細かな動き（翼・尾翼・噴射口）は回転速度から作るので、動きの速さを回転速度として渡す
  f.rate[0] += ((-f.rv[1] / RAIL.vertical) * FLIGHT.pitchRate * 0.8 - f.rate[0]) * k;
  f.rate[1] += ((f.rv[0] / RAIL.lateral) * FLIGHT.yawRate * 0.8 - f.rate[1]) * k;
  f.rate[2] += (tiltIn * FLIGHT.rollRate * 0.5 - f.rate[2]) * k;
  f.bank = 0;
  f.lean = 0;
  return f;
}

// ボス戦：中心のまわりを回りながら機首を中心へ向け続ける。
// 左右上下で回る向き・高さと狙う場所を動かす。ブーストで近づく。
// opts で値を差し替えられる（機械の大蛇は src/fx/bossSerpent.js の ORBIT_OPTS）。opts だけが持つもの：
//   carry    中心が動いたら、自機も同じだけ運ぶ（動くボスのまわりを回り続ける）
//   recenter 左右・上下を離している間、狙いのずれを中心へ戻す速さ（毎秒）
//   上下の範囲 height は、opts を渡したときは中心の高さからの幅（渡さないときは今までどおり 0 からの幅）
//   aimDX/aimDY/aimDZ 機首を向ける点を、中心からずらす量（世界の座標）。大蛇の光線とのぶつかり合いで、機首を口の真下の少し下へ向け、2本の光線が画面を縦に走るようにする
export const ORBIT = { far: 190, near: 125, lateral: 60, drift: 12, vertical: 28, height: 90, aimX: 130, aimY: 80, aimRate: 110, response: 4 };

export function stepOrbit(f, dt, inp, boost, center, opts = null) {
  const O = opts || ORBIT;
  if (!f.rv) f.rv = [0, 0];
  if (!f.orbit) f.orbit = { ax: 0, ay: 0, dir: 1 };
  if (f.tilt === undefined) f.tilt = 0;
  const o = f.orbit;
  if (O.carry && o.c) {
    const cx = center[0] - o.c[0]; const cy = center[1] - o.c[1]; const cz = center[2] - o.c[2];
    if (cx * cx + cy * cy + cz * cz < 60 * 60) { f.pos[0] += cx; f.pos[1] += cy; f.pos[2] += cz; }
  }
  o.c = [center[0], center[1], center[2]];
  const k = 1 - Math.exp(-O.response * dt);
  const mx = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
  const my = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
  if (mx) o.dir = mx;
  f.rv[0] += (mx * O.lateral + (mx ? 0 : o.dir * O.drift) - f.rv[0]) * k;
  f.rv[1] += (my * O.vertical - f.rv[1]) * k;
  o.ax = Math.max(-O.aimX, Math.min(O.aimX, o.ax + mx * O.aimRate * dt));
  o.ay = Math.max(-O.aimY, Math.min(O.aimY, o.ay + my * O.aimRate * 0.7 * dt));
  if (O.recenter) {
    if (!mx) o.ax -= Math.sign(o.ax) * Math.min(Math.abs(o.ax), O.recenter * dt);
    if (!my) o.ay -= Math.sign(o.ay) * Math.min(Math.abs(o.ay), O.recenter * dt);
  }
  f.speed = FLIGHT.cruiseSpeed;

  const hx = center[0] - f.pos[0]; const hz = center[2] - f.pos[2];
  const hd = Math.hypot(hx, hz) || 1;
  // +X が画面の左なので、中心を向いたときの左は 上×前
  const lx = hz / hd; const lz = -hx / hd;
  f.pos[0] += lx * f.rv[0] * dt;
  f.pos[2] += lz * f.rv[0] * dt;
  const y0 = opts ? center[1] : 0;
  f.pos[1] = y0 + Math.max(-O.height, Math.min(O.height, f.pos[1] + f.rv[1] * dt - y0));
  // 円の半径を保つ（回避でずれても戻る）
  const rx = f.pos[0] - center[0]; const rz = f.pos[2] - center[2];
  const r = Math.hypot(rx, rz) || 1;
  const rt = r + (O.far + (O.near - O.far) * boost - r) * (1 - Math.exp(-dt * 0.9));
  f.pos[0] = center[0] + rx / r * rt;
  f.pos[2] = center[2] + rz / r * rt;

  // 機首：中心から狙いの分だけずらした場所へ向ける
  const tiltIn = (inp.rollRight ? 1 : 0) - (inp.rollLeft ? 1 : 0);
  f.tilt += (tiltIn * RAIL.tiltMax - f.tilt) * (1 - Math.exp(-8 * dt));
  const nx = -rx / r; const nz = -rz / r;
  const ax = center[0] + nz * o.ax + (O.aimDX || 0) - f.pos[0];
  const ay = center[1] + o.ay + (O.aimDY || 0) - f.pos[1];
  const az = center[2] - nx * o.ax + (O.aimDZ || 0) - f.pos[2];
  const al = Math.hypot(ax, ay, az) || 1;
  const fw = [ax / al, ay / al, az / al];
  const s = Math.hypot(fw[2], fw[0]) || 1;
  const L = [fw[2] / s, 0, -fw[0] / s];
  const U = [fw[1] * L[2] - fw[2] * L[1], fw[2] * L[0] - fw[0] * L[2], fw[0] * L[1] - fw[1] * L[0]];
  const target = quatMul(quatFromBasis(L, U, fw), quatFromAxis(0, 0, 1, f.tilt));
  // 入ったときに跳ねないよう、向きは滑らかに寄せる
  const dot = target[0] * f.q[0] + target[1] * f.q[1] + target[2] * f.q[2] + target[3] * f.q[3];
  const sg = dot < 0 ? -1 : 1;
  const qk = 1 - Math.exp(-6 * dt);
  f.q = quatNormalize(f.q.map((v, i) => v + (target[i] * sg - v) * qk));
  f.rate[0] += ((-f.rv[1] / RAIL.vertical) * FLIGHT.pitchRate * 0.8 - f.rate[0]) * k;
  f.rate[1] += ((f.rv[0] / O.lateral) * FLIGHT.yawRate * 0.8 - f.rate[1]) * k;
  f.rate[2] += (tiltIn * FLIGHT.rollRate * 0.5 - f.rate[2]) * k;
  f.bank = 0;
  f.lean = 0;
  return f;
}

// 直交する3軸（列）から回転を作る
function quatFromBasis(x, y, z) {
  const t = x[0] + y[1] + z[2];
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    return [(y[2] - z[1]) / s, (z[0] - x[2]) / s, (x[1] - y[0]) / s, s / 4];
  }
  if (x[0] > y[1] && x[0] > z[2]) {
    const s = Math.sqrt(1 + x[0] - y[1] - z[2]) * 2;
    return [s / 4, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s];
  }
  if (y[1] > z[2]) {
    const s = Math.sqrt(1 + y[1] - x[0] - z[2]) * 2;
    return [(y[0] + x[1]) / s, s / 4, (z[1] + y[2]) / s, (z[0] - x[2]) / s];
  }
  const s = Math.sqrt(1 + z[2] - x[0] - y[1]) * 2;
  return [(z[0] + x[2]) / s, (z[1] + y[2]) / s, s / 4, (x[1] - y[0]) / s];
}
