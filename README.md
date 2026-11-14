# PLAY/ARCHIVE · 玩者档案

一个非商业的 AI 网页游戏档案馆。纯静态站点，没有构建步骤、没有后端服务、没有外部运行时依赖。

线上地址：<https://game.yao-yang.cn/>

## 目录结构

```
game/
├── README.md
├── project/
│   ├── game.Caddyfile      # Caddy 静态托管配置（game.yao-yang.cn）
│   └── after_push.sh       # 部署脚本：软链 Caddyfile 并 reload
└── site/                   # 网站根目录（Caddy root）
    ├── index.html          # 首页
    ├── robots.txt
    ├── sitemap.xml
    ├── assets/             # 首页样式、脚本、图标与游戏截图
    └── games/
        ├── xia-bi-wan-3a/
        │   └── index.html  # 首个游戏，单文件自包含
        ├── starry-nightrider/  # 星夜骑手 汉化静态镜像
        │   ├── index.html
        │   ├── assets/     # 构建产物（JS / CSS）
        │   ├── hails/      # NPC 语音
        │   └── …
        ├── wu-suo-shan-men/    # 雾锁山门 静态镜像（WebGL 2）
        │   ├── index.html
        │   ├── game.cdb73b9b.js
        │   ├── assets/
        │   ├── assets-hd/
        │   └── …
        ├── lanternfall/        # 灯落荒原 汉化镜像（单文件 WebGL）
        │   └── index.html
        ├── patchwork-quilt/    # 拼布小国 汉化静态镜像
        │   ├── index.html
        │   ├── assets/         # 构建产物（JS / JSON）
        │   ├── figure/         # 布偶骨骼与动画（GLB）
        │   └── …
        ├── oil-paint/          # 油彩漫步 汉化静态镜像
        │   ├── index.html
        │   ├── assets/         # 构建产物（JS / JSON）
        │   ├── figure/         # 旅人模型与动画（GLB）
        │   └── …
        ├── dino/               # 恐龙狂奔 汉化静态镜像
        │   ├── index.html
        │   ├── assets/         # 构建产物（JS / CSS）
        │   ├── licenses/       # 第三方许可证
        │   └── …
        ├── evensong/           # 晚祷 汉化静态镜像（ES modules + three.js）
        │   ├── index.html
        │   ├── assets/         # 模型、贴图、音频与字体
        │   ├── src/            # 未打包的游戏源码（可直接汉化）
        │   ├── vendor/         # three.js r186
        │   ├── licenses/       # 第三方许可证
        │   └── …
        ├── keraunos/           # 雷霆航线 汉化静态镜像（ES modules + three.js + WebGPU）
        │   ├── index.html
        │   ├── src/            # 未打包的游戏源码（可直接汉化）
        │   ├── vendor/         # three.js r187
        │   ├── sw.js           # 原站 Service Worker（解码 d/ 中的素材）
        │   ├── d/              # 原始编码素材（由 sw.js 解码为 assets/…）
        │   ├── licenses/       # 第三方许可证
        │   └── …
        ├── checkmate-temple/   # 将死圣殿 汉化静态镜像（ES modules + three.js + Rapier）
        │   ├── index.html
        │   ├── main.js         # 未打包的游戏源码（可直接汉化）
        │   ├── voice.js        # 字幕与旁白调度
        │   ├── vendor/         # three.js r170 / Rapier / chess.js / Draco
        │   ├── assets/         # 模型、贴图、音频与铭文数据
        │   ├── voice/          # 英文原声与中文字幕清单
        │   ├── licenses/       # 第三方许可证
        │   └── …
        ├── unsung-vale/        # 无声山谷 汉化静态镜像（Vite + three.js 构建产物）
        │   ├── index.html
        │   ├── assets/         # 构建产物（JS / CSS / 字体）
        │   ├── audio/          # 音乐与音效
        │   ├── models/         # 主角模型（GLB）
        │   ├── world/          # 程序化地形高度数据
        │   ├── CREDITS-AUDIO.md  # 原项目音频署名
        │   ├── licenses/       # 第三方许可证
        │   └── …
        ├── golden-hour/        # 黄金时刻 汉化静态镜像（单文件游戏包 + three.js）
        │   ├── index.html
        │   ├── dist/game.js    # 游戏本体（含 three.js r180）
        │   ├── licenses/       # 第三方许可证
        │   └── …
        ├── what-the-water-keeps/  # 水中所藏 汉化静态镜像（ES modules + three.js）
        │   ├── index.html
        │   ├── src/            # 未打包的游戏源码（可直接汉化）
        │   ├── assets/         # 模型、贴图、音频与字体
        │   ├── CREDITS.md      # 原作信息、汉化与镜像说明
        │   ├── site.json
        │   ├── licenses/       # 第三方许可证（three.js MIT）
        │   └── …
        ├── iron-circuit/       # 铁甲环道 汉化静态镜像（ES modules + three.js）
        │   ├── index.html
        │   ├── game.js         # 未打包的游戏源码（可直接汉化）
        │   ├── data/           # 车辆、赛道与数值配置
        │   ├── assets/         # 怪物卡车模型（GLB）
        │   ├── vendor/         # three.js r187 / GLTFLoader
        │   ├── CREDITS.md      # 原作信息、汉化与镜像说明
        │   ├── site.json
        │   ├── licenses/       # 第三方许可证（three.js MIT）
        │   └── …
        ├── moth-and-lantern/   # 飞蛾与灯 汉化静态镜像（ES modules + three.js）
        │   ├── index.html
        │   ├── src/            # 未打包的游戏源码（可直接汉化）
        │   ├── vendor/         # three.js r187 / addons
        │   ├── CREDITS.md      # 原作信息、汉化与镜像说明
        │   ├── site.json
        │   ├── licenses/       # 第三方许可证（three.js MIT）
        │   └── …
        ├── painted-valley/     # 彩绘山谷 汉化静态镜像（Vite 构建 + three.js + Rapier）
        │   ├── index.html
        │   ├── assets/         # 构建后的游戏包（含 three.js 与 Rapier）
        │   ├── audio/          # 脚步声
        │   ├── figure/         # 漫游者模型与动作
        │   ├── textures/       # 小径地面贴图
        │   ├── CREDITS.md      # 原作信息、汉化与镜像说明
        │   ├── site.json
        │   ├── LICENSES/       # 第三方许可证（three.js MIT、Rapier Apache-2.0）
        │   └── …
        └── xingyun-moba/       # 星陨战纪 原创中文静态镜像（单文件 WebGL）
            ├── index.html
            ├── CREDITS.md       # 原作信息与镜像说明
            ├── site.json
            ├── licenses/       # 第三方许可证（three.js MIT）
            └── …
```

`site/` 下的内容会原样对外提供。每个游戏放在独立目录中，删除对应目录即可移除该游戏及其全部静态依赖。

`starry-nightrider/` 是 Starry Nightrider 的非商业汉化静态镜像：界面、地标与 NPC 字幕已本地化，排行榜、在线人数与多人联机接口已停用或改为本地降级，页面内保留了原作者署名与下架联系方式。

`wu-suo-shan-men/` 是歸藏（Guizang）授权镜像，保留原作者的署名、制作说明与转载声明；游戏本体较大，加载时需要 WebGL 2。

`lanternfall/` 是 [Lanternfall](https://loktar00.github.io/lanternfall/) 的非商业汉化镜像，单文件自包含（内含 Three.js、游戏脚本与音频），保留原作者署名与下架联系方式。

`patchwork-quilt/` 是 Patch（patch.gg，`blendi/patchwork-quilt`）的非商业汉化静态镜像：加载提示、操作提示与定格步频文案已本地化；代码 MIT、美术 CC0，随附 `LICENSE.txt`、`LICENCE-NOTES.md`、`CREDITS.md`、`RAPIER-LICENSE.txt` 与第三方声明。建议使用键盘鼠标或手柄。

`oil-paint/` 是 Patch（patch.gg，`blendi/oil-paint`）的非商业汉化静态镜像：极光雪岭与秋日林间两幅场景，加载进度、场景切换、操作提示与页面文案已本地化；代码 MIT、美术 CC0，随附 `LICENSE.txt`、`LICENCE-NOTES.md`、`CREDITS.md`、`RAPIER-LICENSE.txt` 与第三方声明。建议使用键盘鼠标或手柄。

`dino/` 是 [Dino Run: Locked In](https://noclipepe.pages.dev/dino/)（作者 @noclipepe）的非商业汉化静态镜像，已获作者授权：标题、提示、结算与彩蛋文案已本地化；原在线排行榜改为只保存在浏览器 `localStorage` 的本机榜单，页面不向外发送成绩。随附 `CREDITS.md`、`THIRD-PARTY-NOTICES.md` 与 `licenses/`（three.js MIT、Rapier Apache-2.0）。支持键鼠与触屏。

`evensong/` 是 [Evensong](https://evensong-phi.vercel.app/) 的非商业汉化静态镜像，原页面未署名作者，因此不臆造署名：菜单、选项、操作说明、Boss 名称与字幕对白均已本地化，英文原声保留、字幕为中文；游戏为未打包的 ES module + three.js r186，源码在 `src/` 下可直接修改。随附 `CREDITS.md`、`THIRD-PARTY-NOTICES.md` 与 `licenses/`。支持键鼠、手柄与触屏，完整约 55 MB。

`keraunos/` 是 [Keraunos](https://keraunos.yugen-matsuni.chatgpt.site/) 的非商业汉化静态镜像，原页面未署名作者，因此不臆造署名：机库、机体与武器说明、任务提示、操作说明、暂停菜单与字幕均已本地化，日文原声保留、字幕为中文；游戏为未打包的 ES module + three.js r187 WebGPU 构建，保留了原站 Service Worker 与 `d/` 中的编码素材，完整约 235 MB（含桌面与移动端两套素材）。随附 `CREDITS.md`、`THIRD-PARTY-NOTICES.md` 与 `licenses/`。需要支持 WebGPU 的浏览器，支持键鼠与触屏。

`checkmate-temple/` 是 [Checkmate Temple](https://checkmate-temple.vercel.app/) 的非商业汉化静态镜像，原页面未署名作者，因此不臆造署名：标题、载入界面、操作说明、状态提示、菜单、结局、神殿内全部可阅读铭文与字幕均已本地化，英文原声保留、字幕为中文；没有原字幕的低语与囚徒台词继续保持无字幕，未臆造译文。游戏为未打包的 ES module + three.js r170 + Rapier 物理 + chess.js 规则，桌面与移动端两套素材齐备，完整约 33 MB。原站的 Vercel Analytics 已移除。随附 `CREDITS.md`、`THIRD-PARTY-NOTICES.md` 与 `licenses/`（three.js MIT、Rapier / Draco Apache-2.0、chess.js BSD-2-Clause、Cinzel OFL）。支持键鼠与触屏，建议佩戴耳机。

`unsung-vale/` 是 [Unsung Vale](https://github.com/Leonxlnx/unsung-vale)（MIT 许可）的非商业汉化静态镜像：标题、载入界面、开场旁白、目标与罗盘、暂停与设置菜单、制作名单、剧情、请托、人物对白、敌人与首领提示、试炼、护符与遗物说明等全部游戏内文本均已本地化；游戏没有配音与字幕。原作是 Vite 构建的 three.js 第三人称开放世界动作角色扮演，世界完全由代码生成；本地化在源码层完成并以 `--base=./` 重新构建，以支持子目录部署，运行时全部依赖（模型、音频、地形数据、字体）均已本地化，完整约 39 MB。随附 `LICENSE.md`、`CREDITS.md`、`CREDITS-AUDIO.md`（原项目音乐与音效署名）、`THIRD-PARTY-NOTICES.md` 与 `licenses/`（three.js MIT、three-mesh-bvh MIT、Inter / Josefin Sans / Jost OFL）。只支持键鼠（指针锁定）与手柄，不支持触屏，建议佩戴耳机。

`golden-hour/` 是 [GOLDEN HOUR — Solstice Hotel](https://claude.ai/artifact/6N9gzgYJDa925a1tVxps2f) 的非商业汉化静态镜像。原页面未署名作者，因此不臆造署名：载入提示、主菜单、设置、枪匠、武器与涂装名称、HUD、勋章、暂停菜单、比分与计分板、赛后结算，以及酒店内的场景标牌均已本地化；游戏为单文件 `dist/game.js`（内嵌 three.js r180），完整约 4.4 MB。仅支持键鼠并需要指针锁定，不支持触屏与手柄，单人对抗 5v5 机器人。随附 `CREDITS.md`、`THIRD-PARTY-NOTICES.md` 与 `licenses/`（three.js MIT）。

`xingyun-moba/` 是 [星陨战纪 Starfall](https://sanwan.online/games/xingyun-moba/) 的非商业静态镜像，原页面未署名作者，因此不臆造署名。游戏本身即为中文，无需本地化；原站的访客计数器、留言板、访问统计与备案页脚已移除。游戏为单文件自包含 HTML（内嵌 three.js r180，WebGL + WebAudio，全部美术与音效均在运行时程序化生成），完整约 1.9 MB，镜像页面不向任何外部地址发送请求。一名玩家与九个 AI 在三路地图上对战，支持键鼠与触屏。随附 `CREDITS.md` 与 `licenses/`（three.js MIT）。

`what-the-water-keeps/` 是 [What the Water Keeps](https://what-the-water-keeps.vercel.app/) 的非商业汉化静态镜像。原页面与源码均未署名作者，因此不臆造署名。原作是未打包的 ES modules + three.js r187 静态站点，包含八处可抵达的水域、程序化美术、模型与音乐；镜像完整保存约 174 MB 的全部资源（首次载入约 25 MB，其余水域在抵达时按需加载），不向任何外部地址发送请求，可用 `?realm=` 直接进入各水域。标题《水中所藏》、全部界面文案、八处地名与 Web App Manifest 已汉化；标题标记中的「所藏」两字沉入水面，对应原作「keeps」的下沉。游戏没有配音、对白或字幕。支持键鼠、触屏与手柄，无失败条件。随附 `CREDITS.md` 与 `licenses/`（three.js MIT、OFL 字体许可见 `assets/fonts/OFL.txt`）。

`iron-circuit/` 是 [Iron Circuit](https://patch.gg/play/dfg/iron-circuit)（作者 @dfg）的非商业汉化静态镜像：标题、菜单、HUD、名次表、暂停与结算界面、车辆与赛道名称均已本地化；游戏为未打包的 ES module + three.js r187，源码在 `game.js` 下可直接修改，车辆、赛道与数值配置在 `data/`。Patch 仅在 iframe 内生效的宿主脚本已移除，玩法、画面与音效保持不变。完整约 2.3 MB，不向任何外部地址发送请求。仅支持键盘，不支持触屏与手柄。车辆模型来自 Kenney（CC0），随附 `CREDITS.md` 与 `licenses/`（three.js MIT）。

`moth-and-lantern/` 是 [Moth & Lantern](https://games.jimmychandra.com/games/moth_and_lantern/)（制作人兼导演 Jimmy Chandra，程序与美术 Fable 5.2）的非商业汉化静态镜像：标题、界面、首次游玩提示、帮助与鸣谢、庭园选择器、十个路径分段名称、胜利提示与可访问标签均已本地化；一百五十五个关卡来自 David W. Skinner 的 Microban 谜题集（2000），关卡布局原样保留，仅少量关卡标题随界面汉化。游戏为未打包的 ES modules + three.js r187，全部画面、模型、动画与声音均由代码在运行时生成，完整约 2.7 MB，不向任何外部地址发送请求；原站的宿主导航脚本与 Cloudflare Pages Analytics 已移除。支持键鼠与触屏。随附 `CREDITS.md` 与 `licenses/`（three.js MIT）。

`painted-valley/` 是 [Painted valley](https://git.patch.gg/blendi/painted-valley)（Patch，版本 1.1.1）的非商业汉化静态镜像：标题、载入进度、开始与操作提示、四个时刻名称及画面顶部的短暂提示均已本地化；玩法、地形、美术、代码与音效保持不变。原作是 Vite + three.js 0.186 + Rapier 0.21 的夏日山谷漫步，世界与天空全部由代码生成，没有目标与失败条件。镜像为 Vite 构建后的静态包，完整约 10.3 MB，不向任何外部地址发送请求；原演示中的五段 Sonniss 环境录音因授权不允许转发声音文件而不在公开源工程中，本镜像也只有脚步声，`MISSING_ASSETS.md` 记录了出处与补回方法。代码 MIT、画面 CC0，随附 `LICENSE.txt`、`LICENCE-NOTES.md`、`CREDITS.md`、`RAPIER-LICENSE.txt`、`THIRD-PARTY-NOTICES.md` 与 `LICENSES/`。仅支持键鼠（指针锁定）与手柄，不支持触屏。

## 本地预览

```bash
cd site
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开 <http://127.0.0.1:4173/>。

直接双击 `site/index.html` 也能查看首页，但建议用本地服务器预览，以保证游戏路径和剪贴板行为正常。

## 部署

线上由服务器上的 Caddy 托管，域名 `game.yao-yang.cn`。本站没有后端进程，Caddy 只负责返回静态文件。

- `project/game.Caddyfile`：`root * /var/www/game/site`、`file_server`、`encode gzip`
- `project/after_push.sh`：把 Caddyfile 软链到 `/etc/caddy/0.game.Caddyfile` 并 reload Caddy

服务器上仓库放在 `/var/www/game`，拉取更新后执行：

```bash
./project/after_push.sh
```

首次部署前确认脚本可执行：

```bash
chmod +x project/after_push.sh
```

新增或更新游戏后同样不需要重启服务，Caddy 会直接读取 `site/` 下的静态文件。

> 域名、证书邮箱和「侵权联系」邮箱目前沿用 `game.yao-yang.cn` 与 `378031327@qq.com`。
> 如需更换，请同步修改 `site/index.html` 中的 canonical、Open Graph 地址、页脚联系方式，
> 以及 `site/robots.txt`、`site/sitemap.xml` 和 `project/game.Caddyfile`。

## 新增一个世界

1. 在 `site/games/<slug>/` 下放入游戏，入口文件命名为 `index.html`。
   尽量保持单文件自包含；如果游戏有依赖，放在同一目录内，删除目录时不留残余。
2. 在 `site/index.html` 的档案区新增一张游戏卡片，并同步更新：
   - 首页头部「立即游玩」的链接
   - Hero 区的 FEATURED WORLD 预览，以及 `<head>` 中随机 Featured 的世界列表
   - 当前收录数量与「下一个世界」文案
   - 页面底部的最终入口
3. 为首页生成对应的截图素材，统一放在 `site/assets/`，优先使用 WebP。
4. 在 `site/sitemap.xml` 中补充该游戏的线上地址。
5. 本地走一遍首页 → 游戏跳转 → 返回首页，确认没有死链。

游戏链接默认使用新标签页打开：

```html
<a href="games/<slug>/" target="_blank" rel="noopener">…</a>
```

## 非商业与版权

本站仅作非商业展示与交流，不收广告、不做内购、不设付费墙，不以盈利为目的。
所有游戏版权归原作者所有，与任何游戏厂商无关。

若你是权利人或代理方，认为本站内容侵犯了你的合法权益，请邮件联系：

**378031327@qq.com**

请附上作品名称、链接以及你的身份或权利依据。核实后会尽快删除对应内容及首页入口。
