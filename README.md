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
        └── dino/               # 恐龙狂奔 汉化静态镜像
            ├── index.html
            ├── assets/         # 构建产物（JS / CSS）
            ├── licenses/       # 第三方许可证
            └── …
```

`site/` 下的内容会原样对外提供。每个游戏放在独立目录中，删除对应目录即可移除该游戏及其全部静态依赖。

`starry-nightrider/` 是 Starry Nightrider 的非商业汉化静态镜像：界面、地标与 NPC 字幕已本地化，排行榜、在线人数与多人联机接口已停用或改为本地降级，页面内保留了原作者署名与下架联系方式。

`wu-suo-shan-men/` 是歸藏（Guizang）授权镜像，保留原作者的署名、制作说明与转载声明；游戏本体较大，加载时需要 WebGL 2。

`lanternfall/` 是 [Lanternfall](https://loktar00.github.io/lanternfall/) 的非商业汉化镜像，单文件自包含（内含 Three.js、游戏脚本与音频），保留原作者署名与下架联系方式。

`patchwork-quilt/` 是 Patch（patch.gg，`blendi/patchwork-quilt`）的非商业汉化静态镜像：加载提示、操作提示与定格步频文案已本地化；代码 MIT、美术 CC0，随附 `LICENSE.txt`、`LICENCE-NOTES.md`、`CREDITS.md`、`RAPIER-LICENSE.txt` 与第三方声明。建议使用键盘鼠标或手柄。

`oil-paint/` 是 Patch（patch.gg，`blendi/oil-paint`）的非商业汉化静态镜像：极光雪岭与秋日林间两幅场景，加载进度、场景切换、操作提示与页面文案已本地化；代码 MIT、美术 CC0，随附 `LICENSE.txt`、`LICENCE-NOTES.md`、`CREDITS.md`、`RAPIER-LICENSE.txt` 与第三方声明。建议使用键盘鼠标或手柄。

`dino/` 是 [Dino Run: Locked In](https://noclipepe.pages.dev/dino/)（作者 @noclipepe）的非商业汉化静态镜像，已获作者授权：标题、提示、结算与彩蛋文案已本地化；原在线排行榜改为只保存在浏览器 `localStorage` 的本机榜单，页面不向外发送成绩。随附 `CREDITS.md`、`THIRD-PARTY-NOTICES.md` 与 `licenses/`（three.js MIT、Rapier Apache-2.0）。支持键鼠与触屏。

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
