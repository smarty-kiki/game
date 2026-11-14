// Physical chess on the temple floor: heavy rigid-body pieces, rules by chess.js, black moved by the other hand.
import * as THREE from 'three';
import { Chess } from 'chess.js';

const G_STATIC = 0x0001, G_PIECE = 0x0002, G_DEBRIS = 0x0004, G_PLAYER = 0x0008, G_CHIP = 0x0010;      // chips do not collide with each other
const grp = (member, filter) => ((member << 16) | filter) >>> 0;
const TYPES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (o) => new THREE.Vector3(o.x, o.y, o.z);
const KEY_SQUARE = 'd5';
export const UNSEEN_TELL = 0.75;          // seconds the square glows under a black piece before the unseen hand lifts it
const CHIPS = { p: 26, n: 32, b: 32, r: 34, q: 40, k: 46 };          // small chips per shattered piece, on top of its large fragments

export const sqPos = (sq) => ({ x: -5.25 + 1.5 * (sq.charCodeAt(0) - 97), z: 5.25 - 1.5 * (+sq[1] - 1) });
export const posSq = (x, z) => {
  const f = Math.floor((x + 6) / 1.5), r = Math.floor((6 - z) / 1.5);
  return (f < 0 || f > 7 || r < 0 || r > 7) ? null : 'abcdefgh'[f] + (r + 1);
};

export class ChessGame {
  constructor(o) {
    Object.assign(this, o);          // scene, RAPIER, gltf, makeMat, audio, fx, sampleAmb, onEvent, data
    const R = this.RAPIER;
    this.world = new R.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    // real contact events for the sound of stone on stone: which collider is which thing, and a queue the physics fills each step
    this.colWho = new Map(); this.evq = R.EventQueue && R.ActiveEvents ? new R.EventQueue(true) : null;
    this.acc = 0;
    this.chess = new Chess();
    this.pieces = []; this.debris = []; this.held = null; this.pending = null; this.over = null; this.exitOpen = false;
    this.busy = 0; this.restoreT = 0; this.thinking = false; this.moveCount = 0;
    this._templates();
    this._statics();
    this._markers();
    this._chipInit();
    this.worker = new Worker('./ai.js', { type: 'module' });
    this.worker.onmessage = (e) => this._aiReply(e.data);
    this.aiId = 0;
    this.setup();
  }

  // ------------------------------------------------------------ assets
  _templates() {
    this.tpl = {}; this.frags = {};
    const collect = (node) => {
      const parts = []; node.updateMatrixWorld(true);
      node.traverse(m => { if (m.isMesh) parts.push({ geometry: m.geometry, brk: /break/i.test(m.material.name) }); });
      let n = 0; parts.forEach(p => n += p.geometry.attributes.position.count);
      const step = Math.max(1, Math.floor(n / 500)); const pts = [];
      let h = 0, r = 0;
      for (const p of parts) { const a = p.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i); h = Math.max(h, y); if (i % step === 0) pts.push(a.getX(i), y, a.getZ(i)); } }
      for (const p of parts) { const a = p.geometry.attributes.position; for (let i = 0; i < a.count; i++) if (a.getY(i) < h * 0.12) r = Math.max(r, Math.hypot(a.getX(i), a.getZ(i))); }
      return { parts, hull: new Float32Array(pts), h, r };
    };
    this.gltf.scene.traverse(n => {
      let m = /^piece_(\w+)$/.exec(n.name); if (m) this.tpl[m[1]] = collect(n);
      m = /^frag_([a-z]+)_(\d+)$/.exec(n.name);
      if (m) { const c = collect(n); c.offset = n.position.clone(); (this.frags[m[1]] ||= []).push(c); }
    });
  }
  _statics() {
    const R = this.RAPIER, w = this.world, g = grp(G_STATIC, G_PIECE | G_DEBRIS | G_CHIP);
    const cub = (x, y, z, hx, hy, hz) => w.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setCollisionGroups(g).setFriction(0.8).setRestitution(0.05));
    cub(0, -0.5, 0, 60, 0.5, 60);
    cub(-12.9, 4, 0, 0.4, 4, 30); cub(12.9, 4, 0, 0.4, 4, 30); cub(0, 4, 17.4, 14, 4, 0.4); cub(0, 4, -21.4, 14, 4, 0.4);
    cub(-10.2, 4, -15, 2.6, 4, 6.4); cub(10.2, 4, -15, 2.6, 4, 6.4);
    for (let i = 0; i < 6; i++) cub(0, 0.08 * (i + 1), -(8.6 + 0.4 * i + 6), 7.6, 0.08 * (i + 1), 6);      // dais steps
    for (const c of this.data.collision) {
      if (c.t === 'b') cub((c.x0 + c.x1) / 2, 1.5, -(c.y0 + c.y1) / 2, (c.x1 - c.x0) / 2, 1.5, (c.y1 - c.y0) / 2);
      else w.createCollider(R.ColliderDesc.cylinder(1.0, c.r).setTranslation(c.x, 1.0, -c.y).setCollisionGroups(g));
    }
  }
  _markers() {
    this.markers = new THREE.Group(); this.scene.add(this.markers);
    const geo = new THREE.PlaneGeometry(1.5, 1.5); geo.rotateX(-Math.PI / 2);
    this.markMat = (col) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 uCol; uniform float uA,uT;
        void main(){ vec2 p=abs(vUv-0.5)*2.0; float e=max(p.x,p.y); float rim=smoothstep(0.55,0.98,e)*smoothstep(1.0,0.97,e);
          float core=(1.0-smoothstep(0.0,1.0,length(p)))*0.35; float a=(rim*0.9+core)*uA*(0.8+0.2*sin(uT*2.0));
          gl_FragColor=vec4(uCol*a,1.0); }`,
    });
    this.markPool = [];
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(geo, this.markMat(0xffb060)); m.visible = false; m.position.y = 0.006; m.renderOrder = 2; this.markers.add(m); this.markPool.push(m); }
    this.checkMark = new THREE.Mesh(geo, this.markMat(0xff2a10)); this.checkMark.visible = false; this.checkMark.position.y = 0.007; this.markers.add(this.checkMark);
    this.markA = 0;
  }
  _showMoves(piece) {
    this.markPool.forEach(m => m.visible = false);
    if (!piece || this.over || this.chess.turn() !== piece.color) return;
    const ms = this.chess.moves({ square: piece.square, verbose: true }); const seen = new Set(); let i = 0;
    for (const mv of ms) { if (seen.has(mv.to)) continue; seen.add(mv.to); const m = this.markPool[i++]; const p = sqPos(mv.to);
      m.position.set(p.x, 0.006, p.z); m.material.uniforms.uCol.value.set(mv.captured ? 0xff4a18 : 0xffb060); m.visible = true; }
  }

  // ------------------------------------------------------------ pieces
  setup(fen) {
    for (const p of this.pieces) this._destroy(p);
    for (const d of this.debris) { this.world.removeRigidBody(d.body); this.scene.remove(d.mesh); }
    for (const c of this.chips) this.world.removeRigidBody(c.body);
    this.chips = []; this.wrecks = []; this.gritN = 0; this.gritFade = []; this.aloftP = null;
    for (const c in this.chipIM) { this.chipIM[c].count = 0; this.chipIM[c].next = 0; } this.gritIM.count = 0;
    this.pieces = []; this.debris = []; this.held = null; this.pending = null; this.over = null; this.thinking = false; this.aiId++;
    if (fen) this.chess.load(fen); else this.chess.reset();
    const b = this.chess.board();
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const c = b[r][f]; if (c) this._spawn(c.type, c.color, c.square); }
    this.checkMark.visible = false; this._showMoves(null);
    this._status();
  }
  _spawn(type, color, square) {
    const R = this.RAPIER, t = this.tpl[TYPES[type]], pos = sqPos(square);
    const mats = this.makeMat(color);
    const mesh = new THREE.Group();
    for (const part of t.parts) { const m = new THREE.Mesh(part.geometry, part.brk ? mats.brk : mats.marble); m.castShadow = true; m.receiveShadow = true; mesh.add(m); }
    this.scene.add(mesh);
    const q = new THREE.Quaternion().setFromAxisAngle(UP, color === 'b' ? Math.PI : 0);
    const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, 0.002, pos.z).setRotation(q).setLinearDamping(0.25).setAngularDamping(0.7).setCanSleep(true));
    const cdesc = R.ColliderDesc.convexHull(t.hull).setDensity(2600).setFriction(0.8).setRestitution(0.02).setCollisionGroups(grp(G_PIECE, G_STATIC | G_PIECE | G_DEBRIS | G_CHIP));
    if (this.evq) cdesc.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(40);
    const col = this.world.createCollider(cdesc, body);
    const p = { type, color, square, mesh, body, col, mats, h: t.h, r: t.r, home: q.clone(), state: 'rest', tw: null, lastV: new THREE.Vector3(), quiet: 0, cfB: 9.81 / 60, cfF: 0, cfG: 0, cfO: null, cfN: 90 };
    this.colWho.set(col.handle, p);
    this.pieces.push(p); this._sync(p);
    return p;
  }
  _destroy(p) { this.colWho.delete(p.col.handle); this.world.removeRigidBody(p.body); this.scene.remove(p.mesh); p.dead = true; }
  _sync(p) { const t = p.body.translation(), r = p.body.rotation(); p.mesh.position.set(t.x, t.y, t.z); p.mesh.quaternion.set(r.x, r.y, r.z, r.w); }
  at(square) { return this.pieces.find(p => p.square === square && !p.dead); }
  tilt(p) { const r = p.body.rotation(); return new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w)).angleTo(UP); }
  _castShadow(p, on) { if (p.castS === on || !p.mesh) return; p.castS = on; p.mesh.traverse(m => { if (m.isMesh) m.castShadow = on; }); }
  circles() { return this.pieces.filter(p => p !== this.held && !p.tw && !p.aloft).map(p => { const t = p.body.translation(); return { x: t.x, z: t.z, r: p.r * 0.9 }; }); }

  // ------------------------------------------------------------ player hands
  pick(origin, dir, maxD = 3.4) {       // which piece is the player looking at
    const hit = this.world.castRay(new this.RAPIER.Ray(origin, dir), maxD, true, undefined, grp(G_PIECE, G_PIECE));
    if (!hit) return null;
    return this.pieces.find(p => p.col.handle === hit.collider.handle) || null;
  }
  grab(p) {
    if (!p || this.held || p.tw || p.aloft) return false;
    if (p.color !== 'w') { this.onEvent('resist', p); this.audio.refuse([p.mesh.position.x, 0.5, p.mesh.position.z]); return false; }
    if (this.pending === p) this.pending = null;
    this.held = p; p.state = 'held'; p.body.setGravityScale(0, true); p.body.wakeUp();
    this.audio.scrape([p.mesh.position.x, 0.2, p.mesh.position.z], 0.6, 0.25, p);
    this._showMoves(p); this.onEvent('grab', p);
    return true;
  }
  release(lay = null) {
    const p = this.held; if (!p) return;
    this.held = null; p.state = 'free'; p.body.setGravityScale(1, true); p.quiet = 0;
    if (lay) this._tip(p, lay); else p.laid = false;
    this.pending = p; this.pendingT = 0;
    this._showMoves(null);
  }
  _tip(p, axis) {            // let a held piece go over onto its side
    const t = p.body.translation(), r = p.body.rotation();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axis.x, 0, axis.z).normalize(), -1.25).multiply(new THREE.Quaternion(r.x, r.y, r.z, r.w));
    p.body.setTranslation({ x: t.x, y: t.y + 0.35, z: t.z }, true); p.body.setRotation(q, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true); p.body.setAngvel({ x: axis.x * -1.5, y: 0, z: axis.z * -1.5 }, true); p.laid = true;
  }
  _holdStep(dt) {
    const p = this.held, c = this.carry; if (!p || !c) return;
    const t = p.body.translation(), v = p.body.linvel();
    const want = new THREE.Vector3((c.x - t.x) * 3.2, (c.y - t.y) * 3.0, (c.z - t.z) * 3.2);
    const hs = Math.hypot(want.x, want.z); const maxH = 1.9; if (hs > maxH) { want.x *= maxH / hs; want.z *= maxH / hs; }
    want.y = THREE.MathUtils.clamp(want.y, -1.2, 0.55);                // it comes off the floor slowly
    const k = 0.075;
    const nv = { x: v.x + (want.x - v.x) * k, y: v.y + (want.y - v.y) * 0.12, z: v.z + (want.z - v.z) * k };
    p.body.setLinvel(nv, true);
    // sway: the top lags behind the base
    const r = p.body.rotation(), q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const target = new THREE.Vector3(-(want.x - v.x) * 0.10 - v.x * 0.05, 1, -(want.z - v.z) * 0.10 - v.z * 0.05).normalize();
    const axis = new THREE.Vector3().crossVectors(up, target); const ang = Math.asin(Math.min(1, axis.length()));
    if (axis.lengthSq() > 1e-8) axis.normalize();
    const av = p.body.angvel(); const wantAv = axis.multiplyScalar(ang * 7);
    p.body.setAngvel({ x: av.x + (wantAv.x - av.x) * 0.12, y: av.y * 0.9, z: av.z + (wantAv.z - av.z) * 0.12 }, true);
    // striking a piece it may legally take
    if (!this.over && this.chess.turn() === 'w') {
      const sp = Math.hypot(v.x, v.z);
      for (const mv of this.chess.moves({ square: p.square, verbose: true })) {
        if (!mv.captured || mv.flags.includes('e')) continue;
        const vic = this.at(mv.to); if (!vic || vic.tw || vic.aloft) continue;
        const vt = vic.body.translation(); const d = Math.hypot(vt.x - t.x, vt.z - t.z);
        if (d < p.r + vic.r + 0.07 && sp > 0.45) {
          const dir = new THREE.Vector3(vt.x - t.x, 0, vt.z - t.z).normalize();
          this.release(); this.pending = null;
          this._commit({ from: p.square, to: mv.to, promotion: 'q' }, p, { dir });
          return;
        }
      }
    }
  }

  // ------------------------------------------------------------ rules
  _resolveDrop(p) {
    const t = p.body.translation(); const sq = posSq(t.x, t.z); const tilt = this.tilt(p); const cm = p.body.worldCom(); const key = sqPos(KEY_SQUARE);
    // the way out: the white king on its side on the key square. It counts if it was laid down (or has fallen flat) and rests on the square or against whatever is there.
    const down = tilt > 0.95 || (p.laid && tilt > 0.5);
    if (p.type === 'k' && p.color === 'w' && down && (sq === KEY_SQUARE || posSq(cm.x, cm.z) === KEY_SQUARE || Math.hypot(cm.x - key.x, cm.z - key.z) < 1.35 || Math.hypot(t.x - key.x, t.z - key.z) < 1.35) && !this.exitOpen) { p.state = 'laid'; this.onEvent('concede', p); return; }
    if (sq && sq !== p.square && !this.over && this.chess.turn() === p.color) {
      const mv = this.chess.moves({ square: p.square, verbose: true }).find(m => m.to === sq);
      if (mv) { this._commit({ from: p.square, to: sq, promotion: 'q' }, p, null); return; }
    }
    const moved = sq !== p.square || tilt > 0.1 || Math.hypot(t.x - sqPos(p.square).x, t.z - sqPos(p.square).z) > 0.1;
    if (sq !== p.square) { this.audio.refuse([t.x, 0.5, t.z]); this.onEvent('illegal', { piece: p, sq }); }
    if (moved) this._tweenHome(p, sq !== p.square);
    else p.state = 'rest';
  }
  _commit(m, p, strike) {
    let mv; try { mv = this.chess.move(m); } catch (e) { this._tweenHome(p, true); return; }
    this.moveCount++;
    const dest = sqPos(mv.to);
    let victim = null;
    if (mv.captured) { const vsq = mv.flags.includes('e') ? mv.to[0] + mv.from[1] : mv.to; victim = this.at(vsq); }
    p.square = mv.to;
    const done = () => {
      if (mv.promotion) { const pos = p.body.translation(); this._destroy(p); this.pieces.splice(this.pieces.indexOf(p), 1); const q = this._spawn(mv.promotion, mv.color, mv.to); this.fx.dust(v3(pos), 14, 0.8); }
      if (mv.flags.includes('k') || mv.flags.includes('q')) {
        const rank = mv.color === 'w' ? '1' : '8'; const ks = mv.flags.includes('k');
        const rook = this.at((ks ? 'h' : 'a') + rank); if (rook) { rook.square = (ks ? 'f' : 'd') + rank; this.busy++; this._tween(rook, sqPos(rook.square), { hover: 1.7, dur: 1.9, unseen: true, onDone: () => { this.busy--; } }); }
      }
      this.busy--; this._status(); this.onEvent('moved', mv);
      if (!this.over && this.chess.turn() === 'b') this._think();
    };
    this.busy++;
    const from = p.body.translation(); const dist = Math.hypot(dest.x - from.x, dest.z - from.z);
    if (mv.color === 'w') {
      if (victim) this._explode(victim, strike ? strike.dir : new THREE.Vector3(dest.x - from.x, 0, dest.z - from.z).normalize(), p);
      this._tween(p, dest, { hover: 0.12, dur: 0.45 + dist * 0.25, onDone: done });
    } else {
      const knight = p.type === 'n';
      this._tween(p, dest, { hover: knight ? 1.75 : 0.5, dur: 1.5 + dist * 0.24, unseen: true, tell: UNSEEN_TELL, victim, onDone: done });
    }
    this.onEvent(victim ? 'capture' : 'move', mv);
  }
  _status() {
    const c = this.chess; this.checkMark.visible = false;
    if (c.isCheckmate()) { this.over = c.turn() === 'w' ? 'black' : 'white'; this.onEvent('mate', this.over); }
    else if (c.isDraw() || c.isStalemate()) { this.over = 'draw'; this.onEvent('draw', c.isStalemate() ? 'stalemate' : 'draw'); }
    else if (c.inCheck()) { const k = this.pieces.find(p => p.type === 'k' && p.color === c.turn()); if (k) { const s = sqPos(k.square); this.checkMark.position.set(s.x, 0.007, s.z); this.checkMark.visible = true; } this.onEvent('check', c.turn()); }
    else this.onEvent('quiet');
  }
  _think() { this.thinking = true; this.thinkT = 0; this.aiMove = undefined; this.worker.postMessage({ fen: this.chess.fen(), depth: 3, id: ++this.aiId }); }
  _aiReply(d) { if (d.id !== this.aiId) return; this.aiMove = d.move; }
  _playBlack() {
    this.thinking = false;
    let m = this.aiMove; const legal = this.chess.moves({ verbose: true }); if (!legal.length) return;
    if (!m || !legal.find(l => l.from === m.from && l.to === m.to)) { const l = legal[Math.floor(Math.random() * legal.length)]; m = { from: l.from, to: l.to, promotion: l.promotion }; }
    const p = this.at(m.from); if (!p) return;
    if (this.held === p) this.release();
    this._commit({ from: m.from, to: m.to, promotion: m.promotion || 'q' }, p, null);
  }

  // ------------------------------------------------------------ the unseen hand: kinematic tweens
  _tween(p, dest, o) {
    const R = this.RAPIER; const t = p.body.translation(), r = p.body.rotation();
    if (p.aloft) { p.aloft = null; this._castShadow(p, true); if (this.aloftP === p) this.aloftP = null; }
    p.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
    p.tw = { t: 0, dur: o.dur, p0: v3(t), q0: new THREE.Quaternion(r.x, r.y, r.z, r.w), p1: new THREE.Vector3(dest.x, 0.002, dest.z), q1: p.home.clone(), hover: o.hover, onDone: o.onDone, victim: o.victim, unseen: o.unseen,
      pre: o.unseen && o.tell ? o.tell : 0, capture: !!o.victim, u: 0, phase: '' };
    p.state = 'tween';
    if (o.unseen) { if (p.tw.pre > 0) this._cue('tell', p); else this._unseenLift(p); }
    else this.audio.scrape([t.x, 0.2, t.z], 0.3, 0.12, p);
  }
  // The unseen hand's move, announced: 'tell' (the square glows, nothing moves yet), 'lift', 'travel', 'land', and 'strike' as it takes a piece.
  // The light is drawn by fx.unseen in main.js; the sound side gets audio.unseenCue(phase, pos, piece, info) for all but 'strike'.
  _cue(phase, p, at) {
    const w = p.tw; if (!w) return; w.phase = phase; const pos = at || (phase === 'land' ? w.p1 : w.p0);
    if (this.fx.unseen) this.fx.unseen(phase, p, w);
    if (phase !== 'strike' && this.audio.unseenCue) this.audio.unseenCue(phase, [pos.x, 0.2, pos.z], p, { from: [w.p0.x, 0.2, w.p0.z], to: [w.p1.x, 0.2, w.p1.z], dur: w.dur, tell: phase === 'tell' ? w.pre : 0, capture: w.capture });
  }
  _unseenLift(p) { const w = p.tw; this._cue('lift', p); this.audio.unseenLift([w.p0.x, 0.6, w.p0.z], Math.min(w.dur * 0.8, 2.2), p); this.onEvent('unseen', p); }
  _tweenHome(p, unseen) { this.busy++; const d = sqPos(p.square); const t = p.body.translation(); const dist = Math.hypot(d.x - t.x, d.z - t.z);
    this._tween(p, d, { hover: 0.3 + Math.min(dist * 0.1, 0.5), dur: 0.9 + dist * 0.22, unseen, onDone: () => { this.busy--; } }); }
  _tweenStep(p, dt) {
    const w = p.tw;
    if (w.pre > 0) { w.pre -= dt; if (w.pre > 0) return; this._unseenLift(p); }          // the tell: the piece stands a moment in its own light before it rises
    w.t += dt; const u = w.u = Math.min(w.t / w.dur, 1);
    if (w.unseen && !w.trav && u > 0.12) { w.trav = true; this._cue('travel', p); }
    const e = u * u * (3 - 2 * u);
    const lift = Math.min(u / 0.28, 1), fall = Math.max((u - 0.84) / 0.16, 0);
    const y = THREE.MathUtils.lerp(w.p0.y, w.hover, lift * lift * (3 - 2 * lift)) * (1 - fall * fall) + w.p1.y * fall * fall;
    const hu = THREE.MathUtils.clamp((u - 0.12) / 0.76, 0, 1); const he = hu * hu * (3 - 2 * hu);
    const x = THREE.MathUtils.lerp(w.p0.x, w.p1.x, he), z = THREE.MathUtils.lerp(w.p0.z, w.p1.z, he);
    const q = w.q0.clone().slerp(w.q1, Math.min(u / 0.35, 1));
    // a little sway as it travels
    const dx = w.p1.x - w.p0.x, dz = w.p1.z - w.p0.z, dl = Math.hypot(dx, dz);
    if (dl > 0.2) { const s = Math.sin(hu * Math.PI * 2) * 0.07 * Math.min(1, dl / 3); q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dz / dl, 0, -dx / dl), s)); }
    p.body.setNextKinematicTranslation({ x, y, z }); p.body.setNextKinematicRotation(q);
    if (!w.swept && u > 0.8) { w.swept = true; this._clearUnder(p, w.p1); }          // rubble is brushed off the square before the piece comes down on it
    if (w.victim && !w.victim.dead) { const vt = w.victim.body.translation(); if (Math.hypot(vt.x - x, vt.z - z) < p.r + w.victim.r + 0.12 || u > 0.8) { if (w.unseen) this._cue('strike', p, { x, z }); this._explode(w.victim, new THREE.Vector3(dx, 0, dz).normalize(), p); w.victim = null; } }
    if (u >= 1) {
      if (w.unseen) this._cue('land', p);
      p.tw = null; p.state = 'rest';
      p.body.setBodyType(this.RAPIER.RigidBodyType.Dynamic, true); p.body.setLinvel({ x: 0, y: 0, z: 0 }, true); p.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      p.body.setTranslation({ x: w.p1.x, y: w.p1.y, z: w.p1.z }, true); p.body.setRotation(w.q1, true);
      const m = p.h * p.h * p.h;
      this.audio.thud([w.p1.x, 0.2, w.p1.z], 0.5 + m * 0.35, p); this.fx.shake(0.012 + m * 0.012, w.p1); this.fx.dust(new THREE.Vector3(w.p1.x, 0.05, w.p1.z), 5, 0.35);
      this._clearUnder(p);
      if (w.onDone) w.onDone();
    }
  }

  _clearUnder(p, at) {          // nothing stays trapped under a seated piece: fragments and chips are pushed out to its rim
    const t = at || p.body.translation();
    for (const list of [this.debris, this.chips]) for (const d of list) { const q = d.body.translation(); const dx = q.x - t.x, dz = q.z - t.z, l = Math.hypot(dx, dz);
      if (l < p.r * 1.02 && q.y < 0.35) { const k = l > 1e-3 ? 1 / l : 0, ax = k ? dx * k : 1, az = k ? dz * k : 0; d.body.setTranslation({ x: t.x + ax * (p.r + 0.12), y: q.y + 0.02, z: t.z + az * (p.r + 0.12) }, true); d.body.setLinvel({ x: ax * 1.2, y: 0.3, z: az * 1.2 }, true); } }
  }
  setPlayer(x, z) {         // a body at the player's feet so rubble can be kicked through
    const R = this.RAPIER;
    if (!this.kick) { this.kick = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, 0.32, z)); this.world.createCollider(R.ColliderDesc.capsule(0.12, 0.26).setCollisionGroups(grp(G_PLAYER, G_DEBRIS | G_CHIP)), this.kick); }
    this.kick.setNextKinematicTranslation({ x, y: 0.4, z });
  }
  // ------------------------------------------------------------ the unseen hand clears the key square
  // When the white king is brought near to be laid down, whatever stands on that square is lifted and held overhead; it is set back if the king goes away.
  _aside(dt, time) {
    const k = this.pieces.find(p => p.type === 'k' && p.color === 'w'); const c = sqPos(KEY_SQUARE); let o = this.aloftP;
    if (o && (o.dead || !o.aloft)) o = this.aloftP = null;
    let want = false, top = 2.4;
    if (k) { const t = k.body.translation(); const near = Math.hypot(t.x - c.x, t.z - c.z) < (o ? 3.6 : 3.1);
      want = near && (this.held === k || this.pending === k || k.state === 'laid' || !!k.tw); top = k.h + 1.0; }
    if (!o && want && !(k && k.tw)) { const p = this.at(KEY_SQUARE);
      if (p && p !== k && !p.tw && p !== this.held && this.pending !== p) { const t = p.body.translation();
        p.body.setBodyType(this.RAPIER.RigidBodyType.KinematicPositionBased, true); p.aloft = { y: t.y, x: t.x, z: t.z }; p.state = 'aloft'; o = this.aloftP = p;
        this.audio.unseenLift([t.x, 0.6, t.z], 1.6, p); this.onEvent('unseen', p); this.onEvent('aside', p); } }
    if (!o) return;
    if (!want) { o.aloft = null; this.aloftP = null; this._castShadow(o, true); this._tweenHome(o, true); return; }
    // held high in the well's light it throws no shadow: on the king lying under it that shadow read as a patch of dirt or fur
    const a = o.aloft; this._castShadow(o, a.y < 0.5); a.y += (top - a.y) * Math.min(1, dt * 3.4); a.x += (c.x - a.x) * Math.min(1, dt * 3); a.z += (c.z - a.z) * Math.min(1, dt * 3);
    o.body.setNextKinematicTranslation({ x: a.x, y: a.y + Math.sin(time * 1.1) * 0.025, z: a.z });
    const r = o.body.rotation(); const q = new THREE.Quaternion(r.x, r.y, r.z, r.w).slerp(o.home, Math.min(1, dt * 2)); o.body.setNextKinematicRotation(q);
    a.up = a.y > top - 0.25;
  }

  // ------------------------------------------------------------ chips and grit: what a capture leaves behind
  _chipInit() {
    const g0 = new THREE.IcosahedronGeometry(1, 0); const a = g0.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i), z = a.getZ(i); let h = Math.sin(x * 12.9 + y * 78.2 + z * 37.7) * 43758.5; h -= Math.floor(h); const k = 0.7 + 0.55 * h; a.setXYZ(i, x * k, y * k * 0.62, z * k); }
    g0.computeVertexNormals();
    const cap = this.chipCap = (this.fragStep || 1) > 1 ? 280 : 640; this.chipIM = {}; this.chips = []; this.wrecks = [];
    for (const c of ['w', 'b']) { const g = g0.clone(); g.setAttribute('iAmb', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
      const im = new THREE.InstancedMesh(g, this.chipMat(c), cap); im.count = 0; im.next = 0; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; this.scene.add(im); this.chipIM[c] = im; }
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2); this.gritCap = 48; pg.setAttribute('iAmb', new THREE.InstancedBufferAttribute(new Float32Array(this.gritCap * 4), 4));
    this.gritIM = new THREE.InstancedMesh(pg, this.gritMat(), this.gritCap); this.gritIM.count = 0; this.gritIM.frustumCulled = false; this.gritIM.renderOrder = 1; this.gritIM.receiveShadow = true; this.scene.add(this.gritIM);
    this.gritIM.setColorAt(0, new THREE.Color(1, 1, 1));
    this.gritN = 0; this.gritFade = []; this._m4 = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._amb = [0, 0, 0];
  }
  _chip(color, pos, vel) {
    const R = this.RAPIER, im = this.chipIM[color]; let i;
    if (im.count < this.chipCap) i = im.count++; else { i = im.next = (im.next + 1) % this.chipCap; const old = this.chips.findIndex(c => c.im === im && c.i === i); if (old >= 0) { this.world.removeRigidBody(this.chips[old].body); this.chips.splice(old, 1); } }
    const s = 0.016 + Math.pow(Math.random(), 2.2) * 0.05; const sc = new THREE.Vector3(s * (0.7 + Math.random() * 0.9), s * (0.6 + Math.random() * 0.6), s * (0.7 + Math.random() * 0.9));
    const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6))).setLinvel(vel.x, vel.y, vel.z)
      .setAngvel({ x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 20 }).setLinearDamping(0.9).setAngularDamping(2.2).setCanSleep(true));
    this.colWho.set(this.world.createCollider(R.ColliderDesc.cuboid(sc.x * 0.8, sc.y * 0.5, sc.z * 0.8).setDensity(400).setFriction(0.9).setRestitution(0.22).setCollisionGroups(grp(G_CHIP, G_STATIC | G_PIECE | G_DEBRIS | G_PLAYER)), body).handle, 'rubble');
    this.ambRaw(pos.x, pos.z, this._amb); im.geometry.attributes.iAmb.setXYZW(i, this._amb[0], this._amb[1], this._amb[2], 1); im.geometry.attributes.iAmb.needsUpdate = true;
    this.chips.push({ body, im, i, sc, still: false });
  }
  _grit(pos, dir, color) {         // a mark of ground stone that stays on the square
    const i = this.gritN % this.gritCap; this.gritN++; const im = this.gritIM; im.count = Math.min(this.gritN, this.gritCap);
    const sz = 1.2 + Math.random() * 0.45; this._q.setFromAxisAngle(UP, Math.random() * 6.283);
    this._m4.compose(this._v.set(pos.x + dir.x * 0.18, 0.004 + (i % 8) * 0.0004, pos.z + dir.z * 0.18), this._q, new THREE.Vector3(sz, 1, sz)); im.setMatrixAt(i, this._m4); im.instanceMatrix.needsUpdate = true;
    im.setColorAt(i, new THREE.Color(color === 'w' ? 0xbdb6a6 : 0x101012)); im.instanceColor.needsUpdate = true;
    this.ambRaw(pos.x, pos.z, this._amb); im.geometry.attributes.iAmb.setXYZW(i, this._amb[0], this._amb[1], this._amb[2], 0); im.geometry.attributes.iAmb.needsUpdate = true;
    this.gritFade = this.gritFade.filter(f => f.i !== i); this.gritFade.push({ i, t: -0.35 });
  }
  _chipStep(dt) {
    const dirty = { w: false, b: false };
    let any = false;
    for (const c of this.chips) { const sl = c.body.isSleeping(); if (sl && c.still) continue; any = true;
      if (!sl) { const v = c.body.linvel(); if (Math.hypot(v.x, v.y, v.z) < 0.25) { c.calm = (c.calm || 0) + dt; if (c.calm > 0.7) c.body.sleep(); } else c.calm = 0; }
      const t = c.body.translation(), r = c.body.rotation(); this._m4.compose(this._v.set(t.x, t.y, t.z), this._q.set(r.x, r.y, r.z, r.w), c.sc); c.im.setMatrixAt(c.i, this._m4); dirty[c.im === this.chipIM.w ? 'w' : 'b'] = true;
      if (sl) { c.still = true; this.ambRaw(t.x, t.z, this._amb); const a = c.im.geometry.attributes.iAmb; a.setXYZW(c.i, this._amb[0], this._amb[1], this._amb[2], 1); a.needsUpdate = true; } else c.still = false; }
    for (const k in dirty) if (dirty[k]) this.chipIM[k].instanceMatrix.needsUpdate = true;
    if (this.gritFade.length) { const a = this.gritIM.geometry.attributes.iAmb; for (const f of this.gritFade) { f.t += dt; a.setW(f.i, 0.9 * THREE.MathUtils.smoothstep(f.t, 0, 1.4)); } a.needsUpdate = true; this.gritFade = this.gritFade.filter(f => f.t < 1.4); }
    return any;
  }

  // ------------------------------------------------------------ shattering
  _explode(vic, dir, striker) {
    if (vic.dead) return; const R = this.RAPIER;
    const t = vic.body.translation(), r = vic.body.rotation(); const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    const base = v3(t); const strike = base.clone().addScaledVector(dir, -vic.r).setY(t.y + vic.h * 0.45);
    if (this.held === vic) this.release(); if (this.pending === vic) this.pending = null;
    this._destroy(vic); this.pieces.splice(this.pieces.indexOf(vic), 1);
    const fl = this.frags[TYPES[vic.type]] || [];
    for (let fi = 0; fi < fl.length; fi += (this.fragStep || 1)) { const f = fl[fi];
      const mesh = new THREE.Group();
      for (const part of f.parts) { const m = new THREE.Mesh(part.geometry, part.brk ? vic.mats.brk : vic.mats.marble); m.castShadow = true; mesh.add(m); }
      const pos = f.offset.clone().applyQuaternion(q).add(base);
      const out = pos.clone().sub(strike); out.y = Math.abs(out.y) * 0.5 + 0.25; out.normalize();
      const sp = 0.8 + Math.random() * 2.2;                 // thrown, not flung: most of it stays within a square or two
      const vel = out.multiplyScalar(sp).addScaledVector(dir, 0.5 + Math.random() * 1.1); vel.y += 0.8 + Math.random() * 1.6;
      const body = this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(q).setLinvel(vel.x, vel.y, vel.z)
        .setAngvel({ x: (Math.random() - 0.5) * 9, y: (Math.random() - 0.5) * 9, z: (Math.random() - 0.5) * 9 }).setLinearDamping(0.6).setAngularDamping(1.4).setCanSleep(true));
      let cd = R.ColliderDesc.convexHull(f.hull); if (!cd) cd = R.ColliderDesc.ball(0.08);
      this.colWho.set(this.world.createCollider(cd.setDensity(70).setFriction(0.75).setRestitution(0.18).setCollisionGroups(grp(G_DEBRIS, G_STATIC | G_PIECE | G_DEBRIS | G_CHIP | G_PLAYER)), body).handle, 'rubble');
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      this.debris.push({ mesh, body, lastV: vel.clone(), cool: 0 });
    }
    const c = base.clone().setY(t.y + vic.h * 0.45);
    // many small chips, thrown wider than the big pieces; grit that falls and a mark that stays. No sparks.
    const nChips = Math.round(CHIPS[vic.type] / (this.fragStep || 1));
    for (let i = 0; i < nChips; i++) { const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * vic.r * 0.85;
      const pos = new THREE.Vector3(base.x + Math.cos(a) * rr, t.y + 0.04 + Math.random() * vic.h * 0.9, base.z + Math.sin(a) * rr);
      const out = pos.clone().sub(strike); out.y = Math.abs(out.y) * 0.4 + 0.15; out.normalize();
      const vel = out.multiplyScalar(0.4 + Math.random() * 2.6).addScaledVector(dir, 0.3 + Math.random() * 1.3); vel.y += 0.4 + Math.random() * 2.0; this._chip(vic.color, pos, vel); }
    this._grit(base, dir, vic.color); this.wrecks.push({ mats: vic.mats, x: base.x, z: base.z });
    const ds = 0.8 + vic.h * 0.5;
    this.fx.dust(c, 20, ds); this.fx.dust(base.clone().setY(t.y + 0.1), 26, ds * 0.45, 2.4); this.fx.grit(c, Math.round(70 / (this.fragStep || 1)), vic.r, vic.color, dir); this.fx.shake(0.11, c);
    this.audio.shatter([c.x, c.y, c.z]);
    this.onEvent('shatter', { piece: vic, pos: c });
  }

  // ------------------------------------------------------------ frame
  update(dt, time) {
    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= 1 / 60) {
      this.acc -= 1 / 60;
      this._holdStep(1 / 60);
      this._aside(1 / 60, time);
      for (const p of this.pieces) if (p.tw) this._tweenStep(p, 1 / 60);
      if (this.evq) { this.world.step(this.evq);             // what touched what this step, and how hard (the strongest contact on each piece)
        this.evq.drainContactForceEvents(ev => { const a = this.colWho.get(ev.collider1()), b = this.colWho.get(ev.collider2()), f = ev.totalForceMagnitude();
          if (a && a.body) { if (b) { if (f > a.cfG) { a.cfG = f; a.cfO = b; } } else if (f > a.cfF) a.cfF = f; }          // cfF: from the floor. cfG: from another piece or rubble (cfO)
          if (b && b.body) { if (a) { if (f > b.cfG) { b.cfG = f; b.cfO = a; } } else if (f > b.cfF) b.cfF = f; } }); }
      else this.world.step();
      for (const p of this.pieces) {                           // impacts -> sound
        // A knock is a contact force well above what that piece has been carrying lately (its own weight at rest, or a load leaning on it):
        // the excess, as a change of speed in m/s, goes to the sound of the stone. Standing still gives nothing.
        if (this.evq) { const f = p.cfF + p.cfG, o = p.cfG > 0.3 * f ? p.cfO : null; p.cfF = p.cfG = 0; p.cfO = null; if (p.cfN > 0) p.cfN--;          // (not while a newly set piece settles)
          if (!p.dead && !p.tw && !p.aloft) { const m = p.body.mass(), d = m > 0 ? f / 60 / m : 0, net = d - 1.25 * p.cfB - 0.02; p.cfB += (d - p.cfB) * 0.2;
            if (net > 0.08 && !p.cfN && this.audio.pieceContact) this.audio.pieceContact(p, o && o.dead ? null : o, net); } }
        if (p.tw || p.aloft) continue; const v = p.body.linvel(); const dv = Math.hypot(v.x - p.lastV.x, v.y - p.lastV.y, v.z - p.lastV.z); p.lastV.set(v.x, v.y, v.z);
        if (dv > 0.5 && p !== this.held) { const t = p.body.translation(); const m = p.h * p.h * p.h; this.audio.thud([t.x, 0.2, t.z], Math.min(dv * 0.35, 1.3) * (0.5 + m * 0.3), p); this.fx.shake(Math.min(dv * 0.012, 0.05) * (0.5 + m * 0.4), t); if (dv > 1.2) this.fx.dust(new THREE.Vector3(t.x, 0.05, t.z), 6, 0.4); }
      }
      for (const d of this.debris) { if (d.body.isSleeping()) continue; const v = d.body.linvel(); const dv = Math.hypot(v.x - d.lastV.x, v.y - d.lastV.y, v.z - d.lastV.z); d.lastV.set(v.x, v.y, v.z); d.cool -= 1 / 60;
        if (dv > 0.9 && d.cool < 0) { d.cool = 0.25; const t = d.body.translation(); this.audio.clack([t.x, 0.1, t.z], Math.min(dv * 0.08, 0.4)); } }
    }
    for (const p of this.pieces) { this._sync(p); const t = p.mesh.position; this.sampleAmb(t.x, t.z, p.mats.amb.value); }
    let moving = !!this.held || !!this.aloftP;
    for (const p of this.pieces) if (p.tw || !p.body.isSleeping()) { moving = true; break; }
    for (const d of this.debris) { const sl = d.body.isSleeping(); if (sl && d.still) continue; d.still = sl; moving = true; const t = d.body.translation(), r = d.body.rotation();
      if (!sl) { const v = d.body.linvel(), a = d.body.angvel(); d.age = (d.age || 0) + dt; const sp = Math.hypot(v.x, v.y, v.z); if (sp < 0.2 && Math.hypot(a.x, a.y, a.z) < 0.8) { d.calm = (d.calm || 0) + dt; if (d.calm > 1.0) d.body.sleep(); } else d.calm = 0; if (d.age > 7 && sp < 0.6) { d.body.sleep(); d.age = 4; } } d.mesh.position.set(t.x, t.y, t.z); d.mesh.quaternion.set(r.x, r.y, r.z, r.w); d.mesh.updateMatrix(); }
    if (this._chipStep(dt)) moving = true;
    this.moving = moving;                        // lets the renderer skip redrawing shadows while nothing on the board is moving
    for (const w of this.wrecks) this.sampleAmb(w.x, w.z, w.mats.amb.value);
    // a dropped piece decides the move by where it comes to rest
    if (this.pending) {
      const p = this.pending; this.pendingT += dt; const v = p.body.linvel(), a = p.body.angvel();
      if (Math.hypot(v.x, v.y, v.z) < 0.06 && Math.hypot(a.x, a.y, a.z) < 0.2) p.quiet += dt; else p.quiet = 0;
      if (this.aloftP && this.aloftP.aloft && !this.aloftP.aloft.up && p.type === 'k') p.quiet = 0;          // wait for the square to be cleared
      if (p.quiet > 0.35 || this.pendingT > 5) { this.pending = null; this._resolveDrop(p); }
    }
    // the other hand takes its time
    if (this.thinking) { this.thinkT += dt; if (this.thinkT > 1.6 && this.aiMove !== undefined && this.busy === 0 && !this.pending) this._playBlack(); }
    // anything knocked askew is stood back up
    this.restoreT += dt;
    if (this.restoreT > 0.8 && this.busy === 0 && !this.pending) {
      this.restoreT = 0;
      for (const p of this.pieces) {
        if (p === this.held || p.tw || p.aloft || p.state === 'laid') continue;
        const t = p.body.translation(), s = sqPos(p.square), v = p.body.linvel();
        if ((Math.hypot(t.x - s.x, t.z - s.z) > 0.12 || this.tilt(p) > 0.1 || t.y > 0.05) && Math.hypot(v.x, v.y, v.z) < 0.1) { this._tweenHome(p, true); break; }
      }
    }
    const target = this.held ? 1 : 0; this.markA += (target - this.markA) * Math.min(1, dt * 4);
    for (const m of this.markPool) { m.material.uniforms.uA.value = this.markA * 0.55; m.material.uniforms.uT.value = time; }
    this.checkMark.material.uniforms.uA.value = 0.8; this.checkMark.material.uniforms.uT.value = time * 2;
  }

  // helpers for automated checks: drop a piece over a square and let the physics and rules decide
  debugDrop(from, to, lay = false) {
    const p = this.at(from); if (!p) return false; const d = sqPos(to);
    p.body.setTranslation({ x: d.x + 0.07, y: 0.3, z: d.z - 0.05 }, true); p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    if (lay) this._tip(p, { x: 1, z: 0 });
    p.state = 'free'; p.quiet = 0; this.pending = p; this.pendingT = 0; return true;
  }
  snapshot() { return this.pieces.map(p => { const t = p.body.translation(); const s = sqPos(p.square); return { sq: p.square, type: p.type, color: p.color, off: +Math.hypot(t.x - s.x, t.z - s.z).toFixed(3), y: +t.y.toFixed(3), tilt: +this.tilt(p).toFixed(3), state: p.state }; }); }
}
