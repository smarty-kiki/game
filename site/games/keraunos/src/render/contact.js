// 接地と隙間の暗がり（奥行きの曲がりから求める軽い暗がり）。
// GTAO は半径を世界の長さで決めるため、数m の機体と数百m の建物が同じ画面に並ぶこのゲームでは、どちらかにしか効かなかった。
// ここでは画面の長さで決めた点の対（中心をはさんで反対の2点）の奥行きを比べ、中心が両側より奥にある所（溝・継ぎ目・
// 部品の付け根・物の足元）だけを暗くする。平らな面や斜めの面では両側の平均が中心と同じになるので暗くならない。
// 奥行きは距離に対する割合で比べるので、近くの機体にも遠くの建物にも同じ見え方で効く。法線は要らない（場面を2回描かない）
import { Fn, vec2, vec4, float, int, Loop, screenUV, screenCoordinate, interleavedGradientNoise, perspectiveDepthToViewZ,
  cos, sin, sqrt, max, min, smoothstep, select, convertToTexture } from 'three/tsl';

// depth: 場面の奥行きのテクスチャの node。U: { near, far, aspect, contactR, contactK }。返すのは暗がりの係数（1=そのまま）のテクスチャ
export function contactShade(depth, U, { pairs = 8, scale = 0.5 } = {}) {
  const viewDist = (uv) => perspectiveDepthToViewZ(depth.sample(uv).r, U.near, U.far).negate();
  const node = Fn(() => {
    const d0 = depth.sample(screenUV).r;
    const z0 = perspectiveDepthToViewZ(d0, U.near, U.far).negate();
    const acc = float(0.0).toVar();
    // 点の向きは画素ごとに回して、少ない点でも縞を出さない
    const rot = interleavedGradientNoise(screenCoordinate).mul(6.2831853);
    Loop(int(pairs), ({ i }) => {
      const fi = float(i);
      const a = fi.mul(2.3999632).add(rot);
      // 半径は小さい所から大きい所へ散らす（細い継ぎ目と大きな隅の両方を拾う）
      const r = sqrt(fi.add(0.5).div(pairs)).mul(U.contactR);
      const off = vec2(cos(a).div(U.aspect), sin(a)).mul(r);
      const za = viewDist(screenUV.add(off));
      const zb = viewDist(screenUV.sub(off));
      // 片方が空（とても遠い）なら、その対は数えない（物の縁の外側を暗くしない）
      const valid = za.lessThan(z0.mul(1.6)).and(zb.lessThan(z0.mul(1.6)));
      // 中心が両側の平均よりどれだけ奥か（距離に対する割合）
      const cav = z0.sub(za.add(zb).mul(0.5)).div(z0);
      // 少しの奥まりから効き、手前の別の物にさえぎられた大きな差（物の重なり）では弱める
      // 差が大きい所（手前の物の縁と奥の面）は暗くしない。ここを広く取ると物のまわりに黒い縁取りが出る
      const o = smoothstep(0.0015, 0.015, cav).mul(float(1.0).sub(smoothstep(0.045, 0.12, cav)));
      acc.addAssign(select(valid, o, float(0.0)));
    });
    const v = float(1.0).sub(min(acc.div(pairs).mul(U.contactK), 0.85));
    return vec4(select(d0.greaterThanEqual(0.999999), float(1.0), max(v, 0.0)), 0.0, 0.0, 1.0);
  });
  const tex = convertToTexture(node());
  tex.setResolutionScale(scale);
  return tex;
}
