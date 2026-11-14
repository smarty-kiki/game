# Credits

*Keraunos* · 雷霆航线

- Original game, code, models, textures, music and Japanese voices:
  [KERAUNOS](https://keraunos.yugen-matsuni.chatgpt.site/) — the original page
  does not name an author, so none is invented here.
- Chinese localization and static mirror: PLAY/ARCHIVE · 玩者档案
- 3D renderer: three.js r187 (MIT), see `licenses/three-MIT.txt`
- Planet surface textures: Solar System Scope, based on NASA data, CC BY 4.0,
  see `THIRD-PARTY-NOTICES.md`

This mirror is rehosted for the non-commercial PLAY/ARCHIVE. All rights to the
game, its code, art, music and recordings remain with the original author.
Takedown contact: 378031327@qq.com.

The Chinese localization translates the interface, menus, HUD, mission
messages and dialogue subtitles. The original Japanese voice recordings are
kept unchanged; subtitles follow the Chinese translation. Dialogue lines that
never had a voice recording in the original game remain text-only.

The game is a WebGPU title and needs a current desktop or mobile browser with
WebGPU enabled. The mirror keeps the original service worker (`sw.js`): the
files under `d/` are the original encoded asset blobs, which the service worker
decodes in the browser and serves as `assets/…`. No online services were used
by the original game, and none were added here.
