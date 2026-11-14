// 画面の仕上げ（発光の後ろ）：レンズの光の筋とゴースト → 明るさ（目の慣れ） → トーンマップ → 色の調整 → sRGB → 粒子感。
// トーンマップと sRGB は RenderPipeline に任せず、ここで掛ける（色の調整をトーンマップの後ろで掛けるため）。
import * as THREE from 'three';
import { Fn, vec2, vec3, vec4, float, int, Loop, screenUV, screenCoordinate, convertToTexture, dot, max, min, pow, mix,
  length, smoothstep, clamp, log2, exp2, fract, sin, renderOutput, agxToneMapping, acesFilmicToneMapping, neutralToneMapping } from 'three/tsl';
import { lensflare } from 'three/addons/tsl/display/LensflareNode.js';
import { sharpen } from 'three/addons/tsl/display/SharpenNode.js';

const LUMA = vec3(0.2126, 0.7152, 0.0722);

// bloomIncluded: 渡す色に発光がもう足してある（地上の試作など）。そのときは発光を足さず、光の筋とゴーストの元にだけ使う
export function buildFinish({ distorted, bloomPass, U, on, tier, params, sharpK, bloomIncluded = false }) {
  const passes = [];
  const bloomTex = bloomPass ? bloomPass.getTextureNode() : null;
  if (!bloomTex) { on = new Set(on); on.delete('streak'); on.delete('ghosts'); }

  // 横に伸びる光の筋：発光の明るい所だけを、横へ長くぼかす（エンジンの炎・爆発・光線・太陽）。
  // 2段でぼかす。1段目は2段目の読む間隔と同じ幅を同じ重みで平均し、2段目はその間隔で長く伸ばす（読む所の間が埋まり、1本の筋になる）。
  // 1段だけで長く伸ばすと、銃口の光のような小さい光が読む間隔ごとに別々の点になり、点の列（モアレのような縞）に見えていた（國松の指摘 11/8）
  let streak = null; let streakFine = null;
  if (on.has('streak')) {
    const N = tier.streakTaps;
    const M = 6; // 1段目の片側の読む数
    const step2 = U.streakLen.div(N);
    const fine = convertToTexture(Fn(() => {
      const acc = vec3(0.0).toVar();
      Loop(int(M * 2 + 1), ({ i }) => {
        const s = bloomTex.sample(screenUV.add(vec2(float(i).sub(M).mul(step2).div(M * 2), 0.0))).rgb;
        // 弱い発光は伸ばさない（画面全体が横に流れて見えないように）
        acc.addAssign(max(s.sub(0.25), vec3(0.0)));
      });
      return vec4(acc.div(M * 2 + 1), 1.0);
    })());
    fine.setResolutionScale(0.25);
    streakFine = fine;
    streak = convertToTexture(Fn(() => {
      const acc = vec3(0.0).toVar();
      Loop(int(N * 2 + 1), ({ i }) => {
        const k = float(i).sub(N);
        acc.addAssign(fine.sample(screenUV.add(vec2(k.mul(step2), 0.0))).rgb.mul(exp2(k.abs().mul(-5.5 / N))));
      });
      // 割り方は1段だけの時と同じ（広い光の明るさは今までどおり）
      return vec4(acc.div(N * 0.55), 1.0);
    })());
    streak.setResolutionScale(0.25);
    passes.push('streak');
  }

  // レンズのゴースト：明るい光の、画面の中心をはさんだ反対側に出る淡い輪と光の玉
  let ghosts = null;
  if (on.has('ghosts')) {
    ghosts = lensflare(bloomPass, { threshold: float(0.6), ghostSamples: float(4), ghostSpacing: float(0.28), ghostAttenuationFactor: float(26), downSampleRatio: 4 });
    passes.push('ghosts');
  }

  // 目の慣れ：画面の平均の明るさ（対数）を小さな画像に縮めて読み戻し、明るさの掛け率をゆっくり合わせる（look.js が読む）
  let lumTex = null;
  if (on.has('adapt')) {
    lumTex = convertToTexture(Fn(() => vec4(vec3(log2(max(dot(distorted.rgb, LUMA), 1e-4))), 1.0))());
    lumTex.setResolutionScale(1 / 32);
    passes.push('adapt');
  }

  const TM = { agx: agxToneMapping, aces: acesFilmicToneMapping, neutral: neutralToneMapping };
  // Neutral（Khronos PBR Neutral）：明るい所の色味と彩度を保つ（AgX は太陽・噴射・火花が白っぽく褪せた）
  const tm = TM[params.get('tm')] || TM.neutral;

  const graded = Fn(() => {
    let hdr = (bloomTex && !bloomIncluded) ? distorted.rgb.add(bloomTex.rgb) : distorted.rgb;
    if (streak) hdr = hdr.add(streak.sample(screenUV).rgb.mul(U.streakK).mul(U.streakTint));
    if (ghosts) hdr = hdr.add(ghosts.rgb.mul(U.ghostK));
    // 目の慣れの像を描く段を、出力の流れにつないでおく（掛け率 0 で絵には影響しない）
    if (lumTex) hdr = hdr.add(vec3(lumTex.sample(vec2(0.5)).r.mul(0.0)));
    const t = tm(max(hdr, vec3(0.0)), U.exposure).toVar();
    if (on.has('grade')) {
      const l = max(dot(t, LUMA), 1e-5);
      // 彩度：中間の色を落とし、強い光（光線・炎）の色は残す（落ち着いた色で、色は光と発光で差す）
      const satK = mix(U.sat, U.satHi, smoothstep(0.55, 0.95, l));
      const s = mix(vec3(l), t, satK);
      // コントラスト：中間の灰色を軸に暗部を締める（黒を沈め、明るい所はなめらかに残す）
      const l2 = pow(l.div(0.18), U.contrast).mul(0.18);
      const c2 = s.mul(min(l2.div(l), 4.0));
      // 影は場面の霧の色へ、光は太陽の色へ少し寄せる（場面の色を残したまま、明暗で色温度を分ける）
      const lo = mix(vec3(1.0), U.shadowTint, U.splitK.mul(float(1.0).sub(smoothstep(0.0, 0.35, l))));
      const hi = mix(vec3(1.0), U.lightTint, U.splitK.mul(smoothstep(0.3, 0.9, l)));
      // 黒の締まり：AgX は暗部が浮きやすいので、ごく暗い所を黒へ寄せる
      t.assign(max(c2.mul(lo).mul(hi).sub(U.blackPt), vec3(0.0)).div(float(1.0).sub(U.blackPt)));
      // 周辺を少し落とす
      const d = length(screenUV.sub(0.5).mul(vec2(1.0, 0.75)));
      t.mulAssign(float(1.0).sub(U.vignette.mul(smoothstep(0.25, 0.8, d))));
    }
    if (params.get('lookview') === 'streak' && streak) return vec4(streak.sample(screenUV).rgb, 1.0);
    if (params.get('lookview') === 'fine' && streakFine) return vec4(streakFine.sample(screenUV).rgb.mul(4.0), 1.0);
    return vec4(clamp(t, 0.0, 1.0), 1.0);
  });

  let out = renderOutput(graded(), THREE.NoToneMapping, THREE.SRGBColorSpace);
  // 描く解像度を下げたときは、輪郭を少し立てて眠さを戻す（強さは look.js が解像度に合わせて入れる。0 なら素通し）
  if (sharpK) { out = sharpen(out, sharpK); passes.push('sharpen'); }
  if (on.has('grain')) {
    // 粒子感：暗い所ほど少しだけ。毎コマ変わる
    const base = out;
    out = Fn(() => {
      const c = base.rgb;
      const n = fract(sin(dot(screenCoordinate.xy.add(U.time.mul(61.0)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5);
      const k = U.grain.mul(float(1.0).sub(dot(c, LUMA).mul(0.7)));
      return vec4(c.add(vec3(n.mul(k))), 1.0);
    })();
    passes.push('grain');
  }
  passes.push('tonemap', 'grade');
  return { outputNode: out, lumTex, passes };
}
