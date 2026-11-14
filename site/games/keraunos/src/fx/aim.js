// 照準の寄せ：機首から見て、狙える敵のうち一番近い角度の物を返す（ツインの狙い・照準の色・照準の位置で共通）。
// world.assistDir と同じ規則に、的ごとの許す角度 t.assistAng を足したもの。無い的は既定の maxAng を使う。
// 重巡洋艦は機首が動ける範囲の外（左右・上下へ 20〜30 度）を回るので、その的だけ広く寄せる（spec REQ-021）。

export function aimAssist(world, ox, oy, oz, forward, maxAng) {
  if (!world.targets) return world.assistDir(ox, oy, oz, forward, maxAng);
  let best = null;
  let bestA = Infinity;
  for (const t of world.targets) {
    if (!t.aim || t.radius <= 0.5) continue;
    const x = t.rel.x - ox; const y = t.rel.y - oy; const z = t.rel.z - oz;
    const d = Math.hypot(x, y, z) || 1;
    if (d > 400) continue;
    const c = (x * forward[0] + y * forward[1] + z * forward[2]) / d;
    if (c <= 0) continue;
    // 敵の見かけの大きさの分だけ、許す角度を広げる
    const a = Math.acos(Math.min(1, c)) - Math.atan(t.radius / d);
    const lim = t.assistAng !== undefined ? Math.max(maxAng, t.assistAng) : maxAng;
    if (a < lim && a < bestA) { bestA = a; best = { dir: [x / d, y / d, z / d], target: t, ang: a }; }
  }
  return best;
}
