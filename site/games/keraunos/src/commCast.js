// 通信の配役と台詞の表（ここ1か所だけ）。配役は AIの案（國松はまだ選んでいない）。
// 差し替えるとき：CAST の art（画風Cの番号）と voice（声の説明）を変え、
//   assets/portraits/<id>_<顔>.png と assets/voice/<台詞id>.mp3 を作り直す（.work/通信/ の道具）。
// say('名前：本文') の「名前」が CAST の name と合えばその人物、名前が無ければ default の人物が話す。

export const FACES = ['n', 't', 's', 'a']; // 平常・焦り・笑み・怒り

export const CAST = {
  kanata: { name: 'カナタ', side: 'ally', art: '02', role: '自機のパイロット（新任）', color: '#e9b872',
    voice: { persona: 'カナタ、20歳の新任パイロット。気が弱いが真面目で、丁寧語で話す。追い込まれると声が上ずる。', design: '普通の女性より少し高い、若く明るい地声。少し息が混じる。' } },
  shion: { name: 'シオン', side: 'ally', art: '06', role: '母艦の管制官（オペレーター）', color: '#e9b872', default: true,
    voice: { persona: 'シオン、27歳の管制官。頭の回転が速く、短い指示をはきはき出す。落ち着いていて頼れる。', design: '女性として中くらいの高さ。はっきりした発音で、少し早口。' } },
  luka: { name: 'ルカ', side: 'ally', art: '12', role: '小隊長・僚機1番', color: '#e9b872',
    voice: { persona: 'ルカ、38歳の小隊長の女性。荒っぽい男言葉だが面倒見がいい。戦場に慣れていて余裕がある。', design: '普通の女性より低い、ハスキーで太い声。落ち着いている。' } },
  nagi: { name: 'ナギ', side: 'ally', art: '03', role: '索敵担当・僚機2番', color: '#e9b872',
    voice: { persona: 'ナギ、23歳の索敵担当の女性。無口で、要ることだけを短く言い切る。感情をあまり出さない。', design: '女性として低めで静か。平坦で、ささやきに近い小さな声。' } },
  grace: { name: 'グレイス', side: 'enemy', art: 'E01', role: '敵の前線基地の司令', color: '#ff4a36',
    voice: { persona: 'グレイス、35歳の敵の基地司令の女性。冷たく、人を見下す。命令口調でゆっくり話す。', design: '女性として低く冷たい声。よく通り、威圧的。' } },
  riz: { name: 'リズ', side: 'enemy', art: 'E02', role: '敵のエース（宿敵）', color: '#ff4a36',
    voice: { persona: 'リズ、22歳の敵のエースパイロットの女性。戦うのが楽しくて仕方がない。挑発的で、笑いながら話す。', design: '普通の女性より少し高い、かすれた声。いたずらっぽい。' } },
  core: { name: '防衛コア', side: 'enemy', art: 'A01', role: 'ボス・基地の防衛AI', color: '#ff4a36', machine: true,
    voice: { persona: '防衛コア、敵の基地を守る人工知能。感情が無く、一定の速さで淡々と告げる。', design: '感情のない合成音声のような平坦な女性の声。抑揚がほとんど無く、冷たい。' } },
};

// 台詞。who は CAST のキー。face は顔（n 平常・t 焦り・s 笑み・a 怒り）。
// re は数の入る台詞（表示はそのまま、声は text を読む）。note は声の演技の指示（日本語）。
// cool：同じ台詞を次に出せるまでの秒（連打を止める）。ttl：前の台詞が長くて待たされたとき、何秒まで待って出すか（過ぎたら捨てる）。
//   書いていない台詞は、物語の台詞として必ず出す。反応（bark）は ttl 1.5 秒。
export const LINES = [
  // 自機・出撃と反応
  { id: 'k_sortie', who: 'kanata', face: 's', text: 'カナタ、出ます！', note: '緊張しながらも元気に、出撃の名乗り。' },
  { id: 'k_hit1', who: 'kanata', face: 't', text: '当たった！', note: '被弾して思わず叫ぶ。短く鋭く。', bark: 'hurt' },
  { id: 'k_hit2', who: 'kanata', face: 't', text: 'まだ飛べます！', note: '痛みをこらえて踏ん張る。', bark: 'hurt' },
  { id: 'k_low', who: 'kanata', face: 't', text: 'シールドが持たない……！', note: '追い込まれて声が上ずる。', bark: 'low' },
  { id: 'k_kill1', who: 'kanata', face: 's', text: '撃墜！', note: '手応えに小さく喜ぶ。', bark: 'kill' },
  { id: 'k_kill2', who: 'kanata', face: 's', text: 'よし、次！', note: '勢いに乗って前を向く。', bark: 'kill' },
  { id: 'k_back', who: 'kanata', face: 'n', text: 'すみません、戻りました！', note: '撃墜から復帰して、申し訳なさそうに。', bark: 'revive' },
  { id: 'k_boss', who: 'kanata', face: 't', text: 'あれが防衛コア……！', note: '巨大な敵を見上げて息をのむ。' },
  { id: 'k_clear', who: 'kanata', face: 's', text: 'やった……！ みんなで帰ろう！', note: '力が抜けて、安心して笑う。' },
  // 管制官
  { id: 'o_start', who: 'shion', face: 'n', text: '敵の前線基地はこの小惑星帯の先。岩をよけて進んで' },
  { id: 'o_wipe', who: 'shion', face: 's', cool: 20, ttl: 4, text: '編隊を全滅！ 強化を取って' },
  { id: 'o_mastall', who: 'shion', face: 's', text: 'レーダー塔を全部潰した。防衛コアの砲台が2基止まるはず' },
  { id: 'o_mast', who: 'shion', face: 'n', cool: 30, ttl: 3, re: '^レーダー塔を破壊。残り \\d+ 基$', text: 'レーダー塔を破壊。' },
  { id: 'o_grave', who: 'shion', face: 'n', text: '沈没艦の墓場に入る。漂う残骸に気をつけて' },
  { id: 'o_outer', who: 'shion', face: 'n', text: '基地の外周に入る。砲台と燃料タンクを撃って。レーダー塔を全部壊せばボス戦が楽になる' },
  { id: 'o_tunnel', who: 'shion', face: 't', text: '基地の内部へ突入！ 狭いぞ' },
  { id: 'o_line', who: 'shion', face: 'n', text: '通路を抜けた！ 防衛線だ' },
  { id: 'o_cruiser', who: 'shion', face: 't', text: '重巡洋艦が来る！' },
  { id: 'o_cruiserout', who: 'shion', face: 'n', text: '重巡洋艦は離脱した' },
  { id: 'o_ring', who: 'shion', face: 's', cool: 40, ttl: 3, text: '輪を通過。シールド回復' },
  { id: 'o_gate3', who: 'shion', face: 's', text: '輪を3つ通過！ 強化を取って' },
  { id: 'o_gate', who: 'shion', face: 'n', ttl: 3, re: '^輪を通過 \\d/3$', text: '輪を通過。' },
  { id: 'o_arm', who: 'shion', face: 's', ttl: 4, re: '^腕を破壊。残り \\d+ 本$', text: '腕を破壊。' },
  { id: 'o_coreboom', who: 'shion', face: 't', text: '炉を破壊！ 離れて！' },
  { id: 'o_heat', who: 'shion', face: 't', text: '基地の奥から巨大な熱源！ 防衛コアが来る' },
  { id: 'o_radaroff', who: 'shion', face: 'n', text: 'レーダーが落ちて、砲台が2基止まっている。残りを叩いて' },
  { id: 'o_turrets', who: 'shion', face: 'n', text: '砲台を全部壊せば腕が外れる。予告の線を見て、向きを変えて' },
  { id: 'o_armsoff', who: 'shion', face: 't', text: '砲台が全滅。腕が外れた！ 光線の輪は間をくぐるか、外へ抜けて' },
  { id: 'o_coreopen', who: 'shion', face: 't', text: '腕が全部落ちた。炉が開く！ 撃ち込んで。突進は回避の回転でかわして' },
  { id: 'o_pillar', who: 'shion', face: 't', text: '柱が倒れてくる！ 上か下へ' },
  { id: 'o_bulkU', who: 'shion', face: 't', text: '隔壁が閉まる！ 上の隙間へ' },
  { id: 'o_bulkD', who: 'shion', face: 't', text: '隔壁が閉まる！ 下の隙間へ' },
  { id: 'o_bulkM', who: 'shion', face: 't', text: '隔壁が閉まる！ 真ん中へ' },
  { id: 'o_bulkhit', who: 'shion', face: 't', cool: 15, ttl: 2, text: '隔壁に接触！' },
  { id: 'o_down', who: 'shion', face: 't', text: 'カナタ、応答して！', note: '撃墜された仲間に必死に呼びかける。', bark: 'down' },
  // 管制官：大蛇のボス戦（bossSerpent.js）。voice は声を作るときだけ使う読み（表示は text）
  { id: 'o_snk_appear', who: 'shion', face: 't', text: '前方に巨大な機影！ 機械の大蛇だ。体当たりに気をつけろ', voice: '前方に巨大なきえい！ 機械のだいじゃだ。体当たりに気をつけろ' },
  { id: 'o_snk_brief', who: 'shion', face: 'n', text: '背中の砲台は壊せる。口の光線は、主砲を溜めて口へ撃ち返せば押し返せる' },
  { id: 'o_snk_counter', who: 'shion', face: 't', text: '主砲を溜めて、撃つ瞬間に口へ撃ち返せ！ 光線を押し返せる' },
  { id: 'o_snk_clash', who: 'shion', face: 't', text: 'ぶつかった！ 押し返せ！' },
  { id: 'o_snk_far', who: 'shion', face: 't', text: '遠すぎて押し切れない！ 近づいて撃ち返せ！' },
  { id: 'o_snk_win', who: 'shion', face: 's', text: '押し切った！ 大蛇の口に叩き込んだぞ！', voice: '押し切った！ だいじゃの口に叩き込んだぞ！' },
  { id: 'o_snk_bite', who: 'shion', face: 't', text: '噛みつかれた！ 突進は回避の回転でかわせ' },
  { id: 'o_snk_turret1', who: 'shion', face: 'n', text: '砲台を潰した！ 背中の砲台は壊せる、潰せば弾幕が減る', voice: '砲台を潰した！ 背中の砲台は壊せる、潰せばだんまくが減る' },
  { id: 'o_snk_turretall', who: 'shion', face: 's', text: '背中の砲台を全部潰した！ もう弾幕は来ない', voice: '背中の砲台を全部潰した！ もうだんまくは来ない' },
  { id: 'o_snk_p2', who: 'shion', face: 't', text: '大蛇の装甲が割れた！ 薙ぎ払いが来る、光線の線を見て横へ', voice: 'だいじゃの装甲が割れた！ なぎはらいが来る、光線の線を見て横へ' },
  { id: 'o_snk_p3', who: 'shion', face: 't', text: 'あと少し！ 頭を狙え。光線は主砲で押し返せ' },
  { id: 'o_snk_down', who: 'shion', face: 't', text: '大蛇の動きが止まった！ 離れて！', voice: 'だいじゃの動きが止まった！ 離れて！' },
  // レールガンを積んでいるとき（主砲が無く押し合えない）。溜めている口を撃ち抜くと光線が止まる（spec REQ-015）
  // このミラーにはこの4行の音声が含まれていない（d/ に該当の .ogg が無い）。字幕だけを出し、404 を避ける。
  { id: 'o_snk_brief_r', who: 'shion', face: 'n', noVoice: true, text: '背中の砲台は壊せる。口の光線は、溜めている口をレールガンで撃ち抜けば止められる' },
  { id: 'o_snk_counter_r', who: 'shion', face: 't', noVoice: true, text: '口が光ってる！ 撃たれる前にレールガンで撃ち抜け！' },
  { id: 'o_snk_p3_r', who: 'shion', face: 't', noVoice: true, text: 'あと少し！ 頭を狙え。光線はレールガンで撃ち抜いて止めろ' },
  { id: 'o_snk_snipe', who: 'shion', face: 's', noVoice: true, text: '撃ち抜いた！ 光線が止まったぞ！' },
  // ルカ
  { id: 'l_boss_snk', who: 'luka', face: 's', text: '二人とも付いてる。大蛇の頭を集中して叩くぞ！', voice: '二人とも付いてる。だいじゃの頭を集中して叩くぞ！' },
  { id: 'l_join', who: 'luka', face: 's', text: 'こっちも付いていく。金属の輪を3つくぐれば、ツインを強化できるぞ' },
  { id: 'l_behind', who: 'luka', face: 't', text: 'また後ろだ！' },
  { id: 'l_boss', who: 'luka', face: 's', text: '二人とも付いてる。炉を集中して叩くぞ！' },
  { id: 'l_chased', who: 'luka', face: 't', text: '後ろに付かれた！ 振り切れない、撃ち落として！' },
  { id: 'l_saved', who: 'luka', face: 's', text: '助かった！ 借りができたな' },
  { id: 'l_out', who: 'luka', face: 't', text: '被弾した！ ここで離脱する' },
  // ナギ
  { id: 'g_behind', who: 'nagi', face: 't', text: '後ろ！ 急減速か宙返りで前へ出して' },
  { id: 'g_box', who: 'nagi', face: 'n', text: '右の箱に爆雷が入ってる。撃って開けて' },
  { id: 'g_chased', who: 'nagi', face: 't', text: '後ろに付かれた！ 振り切れない、撃ち落として！' },
  { id: 'g_saved', who: 'nagi', face: 's', text: '助かった！ 借りができたな' },
  { id: 'g_out', who: 'nagi', face: 't', text: '被弾した！ ここで離脱する' },
  // 敵
  { id: 'e_grace_outer', who: 'grace', face: 'a', text: '侵入機を確認。外周の砲台は全基で迎え撃て。', note: '部下に冷たく命じる。' },
  { id: 'e_grace_tunnel', who: 'grace', face: 'a', text: '内部へ入られただと？ 隔壁を閉じろ。', note: '苛立ちを抑えて命じる。' },
  { id: 'e_grace_clear', who: 'grace', face: 't', text: '……前線基地を放棄する。全員、退け。', note: '悔しさを押し殺して、低く。' },
  { id: 'e_riz_in', who: 'riz', face: 's', text: 'その橙の機体、あたしが遊んであげる。', note: '獲物を見つけて楽しそうに挑発する。' },
  { id: 'e_riz_out', who: 'riz', face: 'a', text: 'ちっ、今日はここまで。次は落とすよ。', note: '舌打ちして悔しがりつつ、余裕を見せる。' },
  { id: 'e_core_start', who: 'core', face: 'n', text: '侵入機を確認。排除を開始します。', note: '感情なく淡々と告げる。' },
  { id: 'e_core_down', who: 'core', face: 'a', text: '炉心、損傷。機能を、停止します。', note: '途切れ途切れに、ゆっくり止まる。' },
];

const byText = new Map();
const byRe = [];
for (const l of LINES) {
  if (l.re) byRe.push([new RegExp(l.re), l]);
  else byText.set(`${l.who}|${l.text}`, l);
}
const nameToKey = new Map(Object.entries(CAST).map(([k, c]) => [c.name, k]));
const DEFAULT = Object.keys(CAST).find((k) => CAST[k].default);

/** say の1行を、話し手・本文・台詞の記録（声と顔）に分ける。知らない台詞は line=null（文字だけ出す）。 */
export function parseLine(raw) {
  const m = raw.match(/^([^：]{1,8})：(.*)$/);
  const who = m && nameToKey.has(m[1]) ? nameToKey.get(m[1]) : DEFAULT;
  const text = m && nameToKey.has(m[1]) ? m[2] : raw;
  let line = byText.get(`${who}|${text}`) || null;
  if (!line) for (const [re, l] of byRe) if (l.who === who && re.test(text)) { line = l; break; }
  return { who, text, line };
}

export function lineById(id) { return LINES.find((l) => l.id === id) || null; }
export function barks(kind) { return LINES.filter((l) => l.bark === kind); }
