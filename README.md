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
        └── xia-bi-wan-3a/
            └── index.html  # 首个游戏，单文件自包含
```

`site/` 下的内容会原样对外提供。每个游戏放在独立目录中，删除对应目录即可移除该游戏及其全部静态依赖。

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
   - Hero 区的 FEATURED WORLD 预览
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
