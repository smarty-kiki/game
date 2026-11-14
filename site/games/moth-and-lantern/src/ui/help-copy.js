// Every word of the help panel and of the first-run hints, in one place, so the copy can change without touching layout code.
// `icon` names are entries of ICONS in icons.js.

export const HELP_LEAD = '把每一盏灯笼推到石台上。灯笼落位，就会亮起。';

// Keyboard map. `keys` are shown as key caps; `alt` is a second set after "or".
export const KEYS = [
  { keys: ['W', 'A', 'S', 'D'], alt: ['←', '↑', '↓', '→'], text: '行走与推动' },
  { keys: ['Z'], text: '撤销——按住可连续回退' },
  { keys: ['R'], text: '重新开始这座庭园' },
  { keys: ['Q', 'E'], text: '将视角转动四分之一圈' },
  { keys: ['V'], text: '等距、立体、俯视' },
  { keys: ['+', '−'], text: '缩放，100% 至 180%' },
  { keys: ['[', ']'], text: '上一座与下一座庭园' },
  { keys: ['L'], text: '全部庭园' },
  { keys: ['M'], text: '声音开关' },
  { keys: ['?'], text: '本页' },
  { keys: ['Esc'], text: '关闭面板' },
];

// Touch gestures, most used first.
export const GESTURES = [
  { icon: 'gFlick', title: '轻扫', text: '走一步' },
  { icon: 'gDrag', title: '按住后拖动', text: '朝该方向连续行走' },
  { icon: 'gTap', title: '点按地块', text: '飞蛾会走到那里' },
  { icon: 'gPan', title: '双指拖动', text: '在大庭园中查看四周' },
  { icon: 'gPinch', title: '双指捏合', text: '缩放' },
];
export const TOUCH_NOTE = '撤销、重来、转视角与切换视角都在拇指旁的工具栏里。';
export const MOUSE_NOTE = '使用鼠标时：点击地块即可走到那里，按住右键拖动可查看四周，滚轮缩放。';
export const UP_NOTE = '屏幕上方永远是「上」：无论庭园怎样转动，飞蛾都朝屏幕上方行走。';

export const CREDITS = [
  '制作人兼导演：<a href="https://x.com/jchandra" target="_blank" rel="noopener noreferrer">Jimmy Chandra</a>',
  '程序与美术：<b>Fable 5.2</b>',
  '音乐与音效：<b>Fable 5.2</b>',
  '关卡：<b>Microban</b>，作者 <b>David W. Skinner</b>（2000），原样使用，谨致谢意。',
  '图形引擎：<b>three.js</b>（MIT 许可）。',
  '游戏、美术、动画与声音皆由代码在游玩中生成：没有录制或手绘的素材。',
];

// First-run hints. One line each; `keys` and `touch` are the two input styles.
export const HINTS = {
  move: { keys: { caps: ['W', 'A', 'S', 'D'], text: '行走', aside: '方向键也可' }, touch: { text: '滑动以行走', aside: '或点按地块' } },
  push: { text: '把每盏灯笼推到石台上' },
  undo: { keys: [{ cap: 'Z', text: '后退一步' }, { cap: 'R', text: '重新开始' }], touch: { text: '<b>撤销</b>后退一步 · <b>重来</b>重新开始' } },
};
