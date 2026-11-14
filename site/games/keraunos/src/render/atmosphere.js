// 場面の色に、光の届き方と空気を足す段（歪み・発光より前、トーンマップ前の明るさのまま）。
// - 背景を落ち着かせる：空の画素（星雲・遠い惑星）の彩度と明るさを下げ、照らされた物が先に読めるようにする。明るい星は残す
// - 接地と隙間の暗がり（contact.js）：明るい画素（灯り・発光・光線）は暗くしない
// - 霞の輝き：太陽の方向の霞だけが、遠い物ほど光って色づく
// - 光の筋：太陽のまわりの空の明るさを、太陽の画面の位置へ向けて放射状にぼかす。手前の物は筋を切る影絵になる
import { Fn, vec2, vec3, vec4, float, int, screenUV, convertToTexture, getViewPosition, normalize, dot, max, min, exp, pow, mix,
  length, select, smoothstep } from 'three/tsl';
import { radialBlur } from 'three/addons/tsl/display/radialBlur.js';
import { contactShade } from './contact.js';

const LUMA = vec3(0.2126, 0.7152, 0.0722);

export function buildAtmosphere({ color, depth, U, on, tier, params }) {
  const passes = [];
  const shade = on.has('contact') ? contactShade(depth, U, { pairs: tier.contactPairs, scale: tier.contactScale }) : null;
  if (shade) passes.push('contact');

  // 画面の向き（世界の座標）。空の画素も、奥行きを奥の端にして向きを出す
  const viewDirW = (dz) => normalize(U.camWorld.mul(vec4(getViewPosition(screenUV, dz, U.projInv), 0.0)).xyz);

  // 光の筋は縮めた画像で求める（放射状のぼかしは数十回読むので、全画面で計算すると重い）
  let raysTex = null;
  if (on.has('shafts')) {
    const src = Fn(() => {
      const dz = depth.sample(screenUV).r;
      const mu = max(dot(viewDirW(float(0.5)), U.sunDir), 0.0);
      // 光源は太陽・明るい星の芯のまわりだけ。広く取ると画面全体に白い膜がかかる（防衛線の大きな星で起きた）
      const halo = pow(mu, 300.0).mul(5.0).add(pow(mu, 60.0).mul(0.6));
      // 空の明るい所（星の円盤・明るい星雲）だけが筋を出す
      const skyLum = dot(color.sample(screenUV).rgb, LUMA);
      const bright = smoothstep(0.35, 2.0, skyLum).mul(0.8).add(0.2);
      const m = select(dz.greaterThanEqual(0.999999), float(1.0), float(0.0));
      return vec4(U.sunTint.mul(halo.mul(bright)).mul(m), 1.0);
    });
    const srcTex = convertToTexture(src());
    srcTex.setResolutionScale(0.33);
    raysTex = convertToTexture(radialBlur(srcTex, { center: U.sunUV, count: int(tier.shaftSamples), decay: float(0.962), weight: float(0.7), exposure: float(4.0) }));
    raysTex.setResolutionScale(0.33);
    passes.push('shafts');
  }

  const lit = Fn(() => {
    const c = color.sample(screenUV).rgb.toVar();
    const dz = depth.sample(screenUV).r;
    const sky = dz.greaterThanEqual(0.999999);
    const lum = dot(c, LUMA);
    if (on.has('sky')) {
      // 空：彩度を落とし、中くらいの明るさを沈める。太陽・明るい星（明るさ1.5以上）はそのまま残す
      const keep = smoothstep(0.5, 2.0, lum); // 星・太陽の明るい面は色ごと残す
      const sc = mix(vec3(lum), c, mix(U.skySat, float(1.0), keep)).mul(mix(U.skyK, float(1.0), keep));
      c.assign(select(sky, sc, c));
    }
    if (shade) {
      // 半分の解像度の暗がりを、十字の5点で軽くぼかして読む（点の回転の粒が縁でざらつかないように）
      const px = vec2(float(1.5).div(U.res.x), float(1.5).div(U.res.y));
      const a = shade.sample(screenUV).r.mul(0.4)
        .add(shade.sample(screenUV.add(vec2(px.x, 0.0))).r.mul(0.15)).add(shade.sample(screenUV.sub(vec2(px.x, 0.0))).r.mul(0.15))
        .add(shade.sample(screenUV.add(vec2(0.0, px.y))).r.mul(0.15)).add(shade.sample(screenUV.sub(vec2(0.0, px.y))).r.mul(0.15));
      const keep = smoothstep(0.8, 2.5, lum);
      c.mulAssign(mix(a, float(1.0), keep));
      if (params.get('lookview') === 'contact') c.assign(vec3(a));
    }
    if (on.has('haze')) {
      const vp = getViewPosition(screenUV, select(sky, float(0.9999), dz), U.projInv);
      const dist = select(sky, float(1600.0), length(vp));
      const mu = max(dot(viewDirW(select(sky, float(0.9999), dz)), U.sunDir), 0.0);
      // 太陽の方向にだけ強く散る光。広い前方散乱（画面全体を白くする）は使わない
      const glow = pow(mu, 6.0).mul(0.35).add(pow(mu, 40.0).mul(1.2));
      const amount = float(1.0).sub(exp(dist.mul(U.fogD).mul(-0.55)));
      // 色は太陽の光を場面の霧の色へ少し寄せる（場面の色を保つ）
      // 強さは区間の太陽の強さに引きずられないよう、太陽の色だけを使って揃える
      const fogN = vec3(U.fogCol).div(max(dot(vec3(U.fogCol), LUMA), 1e-3));
      const tint = mix(U.sunTint, fogN, 0.35).mul(3.0);
      c.addAssign(tint.mul(glow).mul(amount).mul(U.hazeK).mul(0.06));
    }
    if (raysTex) {
      const r = raysTex.sample(screenUV).rgb.mul(U.shaftK).mul(U.sunVis);
      c.addAssign(r);
      if (params.get('lookview') === 'shafts') c.assign(r);
    }
    return vec4(c, 1.0);
  });
  // 場面の色・空・暗がり・霞・光の筋を1回の全画面の段でまとめる（歪みの段がこの画像を読む）
  const out = convertToTexture(lit());
  if (on.has('sky') || on.has('haze')) passes.push('air');

  return { sceneColor: out, passes };
}
