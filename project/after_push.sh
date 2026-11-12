#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

ln -fs "$ROOT_DIR/game.Caddyfile" /etc/caddy/0.game.Caddyfile
/usr/sbin/service caddy reload

# 本站为纯静态站点（仓库的 site/），无后端进程，不需要 supervisor 配置。
