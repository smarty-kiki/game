// 段ごとの影（CSM）：太陽の影を、機体のまわり ±100m だけでなく画面の奥まで落とす。近い段ほど細かい。
// 段の分け方は、機体（数m）・近くの物（数十m）・建物（数百m）・遠景にそれぞれ1段。
// 遠い段は描き直す間隔を空けて重さを抑える（遠い物の影は動きが小さく、遅れが見えない）
import { CSMShadowNode } from 'three/addons/csm/CSMShadowNode.js';

const SPLITS4 = [0.012, 0.06, 0.28, 1.0];
const SPLITS3 = [0.03, 0.22, 1.0];

export function setupShadows({ renderer, sun, tier, num, camera }) {
  if (!sun || !renderer.shadowMap.enabled || !tier.csmCascades) return null;
  const n = num('csmn', tier.csmCascades);
  const size = num('csmmap', tier.csmMap);
  // 影の深さの範囲とずらし量は、場面の大きさ（カメラの見える距離）に合わせる。
  // 遊ぶ画面（見える距離 1800）と大蛇の確認ページ（200）では100倍ちがい、同じ値だと小さい場面の影が消える
  const far = Math.min(camera.far, num('csmfar', 1500));
  const margin = num('csmmargin', Math.min(1000, far * 0.66));
  sun.shadow.camera.near = 0.05;
  sun.shadow.camera.far = num('csmdepth', margin + far * 1.4);
  sun.shadow.mapSize.set(size, size);
  sun.shadow.normalBias = num('csmnb', Math.max(0.004, far * 0.00004));
  // ずらし量は奥行きの範囲に対する割合なので、世界の長さで約 4cm（大きい場面）〜数 mm（小さい場面）になるよう割る
  sun.shadow.bias = num('csmbias', -Math.max(0.004, far * 0.000025) / sun.shadow.camera.far);
  const splits = n === 4 ? SPLITS4 : SPLITS3;
  const csm = new CSMShadowNode(sun, {
    cascades: n, maxFar: far, lightMargin: margin, mode: 'custom',
    customSplitsCallback: (count, near, far, breaks) => { for (let i = 0; i < count; i++) breaks.push(splits[i]); },
  });
  sun.shadow.shadowNode = csm;
  let frame = 0;
  return {
    csm,
    // main.js は影を2コマに1回描き直す（sun.shadow.needsUpdate）。段の影は、近い段をその間隔で、遠い段ほど間を空ける
    update() {
      frame++;
      const want = sun.shadow.needsUpdate;
      csm.lights.forEach((l, i) => {
        const every = i === 0 ? 1 : (i === 1 ? 2 : 4);
        l.shadow.needsUpdate = want && ((frame >> 1) % every === 0 || i === 0);
      });
    },
  };
}
