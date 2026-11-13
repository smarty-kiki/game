import{$ as e,A as t,C as n,E as r,F as i,G as a,H as o,I as s,L as c,M as l,N as u,P as d,R as f,S as p,U as m,V as h,W as g,X as _,Y as v,Z as y,_ as b,a as x,b as S,c as ee,d as te,et as C,f as w,g as ne,h as T,i as re,j as ie,l as E,m as ae,n as D,o as oe,p as se,q as ce,r as le,s as ue,t as de,u as fe,v as pe,x as me,y as O,z as he}from"./camera-qpqToIkq.js";var k=[[2,96],[0,80],[-7,56],[3,32],[10,6],[3,-20],[-5,-44],[4,-68],[10,-90]],A={x:0,z:78},j={x:11,z:-96,r:21},M=[];{let e=e=>k[Math.max(0,Math.min(k.length-1,e))];for(let t=0;t<k.length-1;t++){let n=e(t-1),r=e(t),i=e(t+1),a=e(t+2);for(let e=0;e<24;e++){let t=e/24,o=t*t,s=o*t,c=(e,n,r,i)=>.5*(2*n+(-e+r)*t+(2*e-5*n+4*r-i)*o+(-e+3*n-3*r+i)*s);M.push([c(n[0],r[0],i[0],a[0]),c(n[1],r[1],i[1],a[1])])}}M.push(k[k.length-1])}var ge=M;function _e(e,t){let n=1/0;for(let r=0;r<M.length-1;r++){let[i,a]=M[r],[o,s]=M[r+1],c=o-i,l=s-a,u=Math.max(0,Math.min(1,((e-i)*c+(t-a)*l)/(c*c+l*l))),d=Math.hypot(e-i-c*u,t-a-l*u);d<n&&(n=d)}return n}var ve=(e,t)=>{let n=Math.hypot(e-j.x,t-j.z)+w(e*.11,t*.11)*3.5;return 1-Math.min(1,Math.max(0,(n-j.r*.72)/(j.r*.5)))},ye=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)};function be(e,t,n){let r=2.8*w(e/74+3.1,t/74-1.7)+1.2*w(e/26,t/26)+.3*w(e/8.3,t/8.3);return r+=5.5*ye(70,-110,t),r-=.28*Math.exp(-(n*n)/3.2),r}var N=ne,P=new Float32Array(N*N),F=new Uint8Array(N*N*4);async function xe(e){for(let t=0;t<N;t++){e&&t%24==0&&await e(t/N);for(let e=0;e<N;e++){let n=-256+e/(N-1)*2*256,r=-256+t/(N-1)*2*256,i=Math.abs(n)<60&&r>-130&&r<110?_e(n,r):99;P[e+t*N]=be(n,r,i);let a=(e+t*N)*4,o=w(n*.9,r*.9)*.35+w(n*.23,r*.23)*.5;F[a]=Math.round(255*(1-ye(.75,1.9,i+o))),F[a+1]=Math.round(255*ve(n,r)),F[a+2]=Math.round(255*Math.min(1,Math.max(0,.5+.6*w(n/17+9,r/17)+.3*w(n/5,r/5+4)))),F[a+3]=255}}}function I(e,t){let n=Math.min(N-1.001,Math.max(0,(e+256)/512*(N-1))),r=Math.min(N-1.001,Math.max(0,(t+256)/512*(N-1))),i=Math.floor(n),a=Math.floor(r),o=n-i,s=r-a,c=P[i+a*N],l=P[i+1+a*N],u=P[i+(a+1)*N],d=P[i+1+(a+1)*N];return(c+(l-c)*o)*(1-s)+(u+(d-u)*o)*s}function Se(e){let n=new t(P,N,N,ce,l);n.minFilter=n.magFilter=c,n.needsUpdate=!0;let r=new t(F,N,N);r.minFilter=r.magFilter=c,r.needsUpdate=!0,e.tHeight.value=n,e.tLand.value=r;let i=new a(512,512,512,512);i.rotateX(-Math.PI/2);let s=i.attributes.position;for(let e=0;e<s.count;e++)s.setY(e,I(s.getX(e),s.getZ(e))-.04);let d=new _({glslVersion:u,uniforms:e,vertexShader:`
      ${T}
      out vec3 vWorld;
      void main() { vWorld = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,fragmentShader:`
      ${T}
      in vec3 vWorld;
      layout(location = 0) out vec4 outC;
      void main() {
        vec4 m = texture(tLand, landUv(vWorld.xz));
        // laid in broadly first: warm where the sun falls, plum where it doesn't
        // asked square by ragged square, so that what shows between the dabs is itself in touches
        vec2 sq = floor(vWorld.xz / 0.32 + (texture(tNoise, vWorld.xz / 2.3).rg - 0.5) * 1.8) * 0.32;
        float lit = step(0.5, woodSunAt(vec3(sq.x, vWorld.y + 0.2, sq.y)));
        vec3 c = mix(vec3(0.3, 0.16, 0.16), vec3(0.72, 0.44, 0.14), lit);
        c = mix(c, mix(vec3(0.21, 0.17, 0.2), vec3(0.6, 0.47, 0.33), lit), m.r);
        c *= 0.78 + 0.3 * texture(tNoise, vWorld.xz / 9.0).r;
        outC = vec4(hazed(c, vWorld), 1.0);
      }`}),f=new o(i,d);f.frustumCulled=!1;function p(e=384,t=192){let n=new Float32Array((e+1)*(e+1));for(let r=0;r<=e;r++)for(let i=0;i<=e;i++)n[i+r*(e+1)]=I(-t+r/e*2*t,-t+i/e*2*t);return{heights:n,cells:e,half:t}}return{mesh:f,heightField:p}}var Ce=`
const vec3 LIT_L[6] = vec3[6](vec3(0.97, 0.71, 0.2), vec3(0.94, 0.5, 0.13), vec3(0.8, 0.25, 0.11), vec3(0.64, 0.45, 0.28), vec3(0.56, 0.62, 0.2), vec3(0.74, 0.58, 0.42));
const vec3 LIT_M[6] = vec3[6](vec3(0.74, 0.47, 0.15), vec3(0.7, 0.33, 0.11), vec3(0.58, 0.18, 0.11), vec3(0.45, 0.3, 0.21), vec3(0.34, 0.42, 0.15), vec3(0.5, 0.38, 0.3));
const vec3 LIT_S[6] = vec3[6](vec3(0.43, 0.25, 0.2), vec3(0.4, 0.19, 0.18), vec3(0.33, 0.12, 0.17), vec3(0.25, 0.18, 0.22), vec3(0.16, 0.25, 0.2), vec3(0.27, 0.22, 0.27));
// r is this dab's own chance; v drifts slowly over the ground, so leaves of a kind lie together
int litterKind(float r, float v, float moss, float way) {
  if (r < way * 0.62) return 5;
  if (fract(r * 7.31) < moss * 0.1) return 4;
  return v < 0.42 ? 0 : v < 0.7 ? 1 : v < 0.84 ? 2 : 3;
}
vec3 litter(int k, float lit, float r) { return paint3(LIT_L[k], LIT_M[k], LIT_S[k], lit, r); }
`,we=`
void makeDab(inout Dab d) {
  vec2 cell; float sub;
  if (!ringCell(0.0, true, cell, sub)) { d.alive = 0.0; return; }
  vec4 r = hash4(cell, sub * 3.0 + 1.0);
  vec4 q = hash4(cell + 31.7, sub + 11.0);
  vec2 xz = (cell + r.xy) * uCell0;
  float lod;
  d.alive = ringGrow(distance(xz, cameraPosition.xz), lod);
  if (d.alive <= 0.0) return;
  vec3 P = vec3(xz.x, heightAt(xz), xz.y);
  vec3 Nn = normalAt(xz);
  vec4 m = texture(tLand, landUv(xz));
  float lit = woodSunAt(P + vec3(0.0, 0.2, 0.0)) * clamp(dot(Nn, uSunDir) * 2.4, 0.0, 1.0);
  float patch_ = texture(tNoise, xz / 13.0).r * 1.9 + texture(tNoise, xz / 3.7).g * 0.5;
  int kind = litterKind(q.x, fract(patch_ + (q.z - 0.5) * 0.3), m.b, m.r);
  vec3 c1 = litter(kind, lit, q.y);
  int other = litterKind(q.z, fract(patch_ + 0.2 + (q.w - 0.5) * 0.5), m.b, m.r * 0.5);
  vec3 c2 = litter(other, lit, q.w);
  // the open ground of the clearing is grass gone to gold
  vec3 gl = paint3(vec3(0.95, 0.8, 0.36), vec3(0.62, 0.52, 0.2), vec3(0.2, 0.2, 0.2), lit, q.y);
  float grassy = step(r.z, m.g * 0.8);
  c1 = mix(c1, gl, grassy);
  // here and there a wet leaf in the shade gives back the sky
  if (lit < 0.2 && q.w > 0.93) c1 = mix(vec3(0.34, 0.36, 0.52), vec3(0.2, 0.17, 0.26), q.z);
  c1 = jitter(c1, r.wzy, 0.5);
  c2 = jitter(c2, q.wzy, 0.5);
  // leaves lie any way round, though those that fell together lie much alike
  float a = (texture(tNoise, xz / 6.3).a * 1.2 + q.y * 0.8) * TAU;
  d.dir = vec3(cos(a), 0.0, sin(a));
  d.pos = P;
  d.size = uCell0 * vec2(1.05 + 0.5 * r.z, 1.7 + 0.9 * r.w) * lod;
  d.c1 = hazed(c1, P);
  d.c2 = hazed(c2, P);
  d.seed = dot(cell, vec2(1.0, 57.0)) + sub * 0.37;
  d.turnabout = 1.0;
  d.lie = 1.0;
  d.nrm = Nn;
  d.height = (0.03 + 0.07 * q.z) * pow(lod, 0.35);
  d.glaze = 1.0;
}
`,Te=`
void makeDab(inout Dab d) {
  vec2 cell; float sub;
  if (!ringCell(40.0, false, cell, sub)) { d.alive = 0.0; return; }
  vec4 r = hash4(cell, 40.0);
  vec4 q = hash4(cell + 17.3, 51.0);
  vec4 f = hash4(cell + sub * 7.7 + 3.1, sub * 13.0 + 3.0);
  vec2 foot = (cell + r.xy) * uCell0;
  float lod;
  d.alive = ringGrow(distance(foot, cameraPosition.xz), lod);
  if (d.alive <= 0.0) return;
  vec4 m = texture(tLand, landUv(foot));
  // it grows in drifts, keeps off the way, and fills the clearing
  float drift = smoothstep(0.46, 0.7, texture(tNoise, foot / 37.0).a);
  float chance = max(0.05 + 0.8 * drift, m.g) * (1.0 - m.r);
  if (q.x > chance) { d.alive = 0.0; return; }
  float grass = step(q.z, max(m.g * 1.1, 0.22));           // a tuft of grass rather than a fern
  float kind = fract(q.y * 3.7 + floor(texture(tNoise, foot / 14.0).r * 3.0) * 0.33);
  float big = min(pow(lod, 0.6), 2.2);
  float a = (sub + f.x) / 6.0 * TAU + r.z * TAU;
  vec2 fan = vec2(cos(a), sin(a));
  vec2 xz = foot + fan * mix(0.1, 0.03, grass) * big;
  vec3 P = vec3(xz.x, heightAt(xz), xz.y);
  float gust = gustAt(xz);
  float lit = sunAt(P + vec3(0.0, 0.3, 0.0));
  vec3 c;
  if (grass > 0.5) c = paint3(vec3(1.0, 0.88, 0.46), vec3(0.76, 0.6, 0.24), vec3(0.3, 0.27, 0.2), lit, f.w);
  else if (kind < 0.45) c = paint3(vec3(0.98, 0.58, 0.16), vec3(0.68, 0.36, 0.13), vec3(0.34, 0.18, 0.16), lit, f.w);   // bracken turned rust
  else if (kind < 0.75) c = paint3(vec3(1.0, 0.82, 0.26), vec3(0.72, 0.54, 0.15), vec3(0.34, 0.26, 0.16), lit, f.w);    // fern gone yellow
  else c = paint3(vec3(0.66, 0.74, 0.25), vec3(0.34, 0.45, 0.16), vec3(0.13, 0.23, 0.17), lit, f.w);                     // still green
  c = jitter(c, f.zwx, 0.55);
  float sway = sin(uTime * (1.6 + f.z) + f.w * 40.0) * (0.04 + 0.1 * gust);
  vec2 lean = fan * mix(0.9 + 1.3 * f.y, 0.12 + 0.4 * f.y, grass) + uWind.xy * (0.08 + 0.6 * gust + sway);
  d.dir = normalize(vec3(lean.x, 1.0, lean.y));
  d.pos = P - vec3(0.0, 0.02, 0.0);
  float tall = mix(0.45, 0.85, f.z) * mix(1.0, 1.3, m.g) * mix(0.72, 1.0, grass);
  // a frond is a broad curved stroke that arches over; a blade of grass a thin straight one
  d.size = vec2(mix(0.17, 0.04, grass) * big * (0.8 + 0.5 * f.x), tall);
  d.cell = grass > 0.5 ? floor(f.y * 2.99) : (f.x > 0.5 ? 3.0 : 7.0);
  d.c1 = hazed(c, P);
  d.c2 = hazed(jitter(c * 1.2, f.xzy, 0.8), P);
  d.seed = dot(cell, vec2(1.0, 57.0)) + sub * 0.37 + 0.5;
  d.base = 1.0;
  d.lift = 0.25;
}
`;function Ee(e){let t=ee(e,{head:Ce,body:we,per:3,n:192,cell0:.14,levels:6,minPx:[5,9],maxPx:[4e3,4e3],cells:[0,8]}),n=ee(e,{head:Ce,body:Te,per:6,n:96,cell0:.42,levels:4,minPx:[2.5,12],maxPx:[60,420],cells:[0,4]}),r=new d;return r.add(t.group,n.group),{group:r,follow(e,r){t.follow(e,r),n.follow(e,r)}}}var De=0,L=1,R=2,Oe=3,ke=`
const vec3 BARK_L[4] = vec3[4](vec3(0.88, 0.6, 0.33), vec3(1.0, 0.94, 0.74), vec3(0.84, 0.6, 0.34), vec3(0.86, 0.62, 0.4));
const vec3 BARK_M[4] = vec3[4](vec3(0.37, 0.3, 0.31), vec3(0.76, 0.71, 0.68), vec3(0.3, 0.22, 0.2), vec3(0.33, 0.25, 0.25));
const vec3 BARK_S[4] = vec3[4](vec3(0.15, 0.12, 0.19), vec3(0.4, 0.4, 0.53), vec3(0.12, 0.09, 0.14), vec3(0.14, 0.1, 0.16));
vec3 bark(int k, vec3 P, vec3 Nn, float r, float foot) {
  // a trunk is lit as a round thing by a low sun, and from below by the bright leaves on the ground
  float lit = sunAt(P + Nn * 0.35) * clamp(dot(Nn, uSunDir) * 1.2 + 0.25, 0.0, 1.0);
  vec3 c = paint3(BARK_L[k], BARK_M[k], BARK_S[k], lit, r);
  c += vec3(0.1, 0.045, 0.0) * (1.0 - lit) * exp(-foot * 0.45);
  return c;
}
`,Ae=`
const vec3 LEAF_L[5] = vec3[5](vec3(1.0, 0.8, 0.2), vec3(1.0, 0.57, 0.12), vec3(0.94, 0.26, 0.09), vec3(0.86, 0.82, 0.24), vec3(1.0, 0.9, 0.36));
const vec3 LEAF_M[5] = vec3[5](vec3(0.76, 0.49, 0.11), vec3(0.72, 0.33, 0.09), vec3(0.61, 0.15, 0.08), vec3(0.52, 0.52, 0.14), vec3(0.82, 0.62, 0.17));
const vec3 LEAF_S[5] = vec3[5](vec3(0.46, 0.25, 0.1), vec3(0.42, 0.17, 0.09), vec3(0.34, 0.09, 0.11), vec3(0.24, 0.29, 0.13), vec3(0.5, 0.33, 0.13));
`;function je(e,t,n,r,i,a){let o=e.position.length/3,s=new C,c=new C,l=new C,u=new C,d=new C(1,0,.3).normalize();for(let o=0;o<t.length;o++){s.copy(t[Math.min(o+1,t.length-1)]).sub(t[Math.max(o-1,0)]).normalize(),c.copy(d).addScaledVector(s,-d.dot(s)).normalize(),d=c.clone(),l.crossVectors(s,c);for(let s=0;s<r;s++){let d=s/r*Math.PI*2,f=Math.cos(d),p=Math.sin(d);u.copy(t[o]).addScaledVector(c,f*n[o]).addScaledVector(l,p*n[o]),e.position.push(u.x,u.y,u.z),e.normal.push(c.x*f+l.x*p,c.y*f+l.y*p,c.z*f+l.z*p),e.data.push(i,a,t[o].y-t[0].y)}}for(let n=0;n<t.length-1;n++)for(let t=0;t<r;t++){let i=o+n*r+t,a=o+n*r+(t+1)%r;e.index.push(i,a,i+r,a,a+r,i+r)}}function Me(){let e=se(4471),t=[],n=(n,r,i,a,o=1)=>{let s=(i===L?.13+e()*.08:i===R?.75+e()*.3:.26+e()*e()*.42)*o,c=i===L?15+e()*6:i===R?19+e()*4:21+e()*8+s*5,l=i===L?4:i===Oe?e()<.75?2:1:i===R?e()<.5?3:0:[0,0,0,0,0,1,1,1,1,2,3,3][Math.floor(e()*12)];t.push({x:n,z:r,y:I(n,r),type:i,tier:a,r:s,h:c,family:l,seed:e()*1e3,lean:[(e()-.5)*.09,(e()-.5)*.09]})},r=7.2;for(let t=-40;t<=40;t++)for(let i=-40;i<=40;i++){let a=(i+.15+e()*.7)*r,o=(t+.15+e()*.7)*r-8,s=Math.hypot(Math.max(0,Math.abs(a)-10),Math.max(0,Math.abs(o+8)-100));if(s>185||e()>.84||(s<60?_e(a,o):99)<2.7||ve(a,o)>.25)continue;let c=w(a/46+5,o/46-3),l=w(a/31-7,o/31+2);n(a,o,c>.42?L:l>.5?Oe:e()<.04?R:De,s<40?0:s<92?1:2)}let i={x:j.x+3,z:j.z-2};t.push({...i,y:I(i.x,i.z),type:R,tier:0,r:1.25,h:23,family:0,seed:77,lean:[.03,-.02],hero:!0});for(let[e,t,r]of[[A.x-5.5,A.z-13,1.9],[A.x+6.2,A.z-19,1.6]])n(e,t,De,0,r);return t}function Ne(e){let t=Me(),n=se(99173),a={position:[],normal:[],data:[],index:[]},c=[],l=[],f=[],p=[],g=new C;for(let e of t){let t=e.tier===0,r=e.tier===1,i=e.h*(e.type===L?.95:.8),o=t?9:r?5:3,s=[],u=[];for(let t=0;t<o;t++){let n=t/(o-1),r=n*n*.4+n*.6,a=Math.sin(n*2.4+e.seed)*.25*(e.type===L?1.6:1);s.push(new C(e.x+e.lean[0]*r*i+a*e.lean[1]*8,e.y-.3+r*(i+.3),e.z+e.lean[1]*r*i-a*e.lean[0]*8)),u.push(e.r*(1-.6*r)*(1+.5*Math.exp(-(r*i)/(.35+e.r*.6))))}je(a,s,u,t?9:r?7:5,e.type,e.seed);let d=(t,n)=>{let r=0;for(;r<o-2&&s[r+1].y-e.y<t;)r++;let i=he.clamp((t-(s[r].y-e.y))/(s[r+1].y-s[r].y),0,1);return n.lerpVectors(s[r],s[r+1],i),u[r]+(u[r+1]-u[r])*i};t&&_e(e.x,e.z)<60&&p.push({x:e.x,z:e.z,y:e.y,r:e.r*1.15});let m=new C(e.x+e.lean[0]*i,e.y+e.h*(e.hero?.66:.8),e.z+e.lean[1]*i),h=e.hero?11.5:e.type===R?7.5:e.type===L?2.6+n():4+n()*1.8+e.r*2,_=[];if(t){let t=e.hero?9:e.type===L?4:5+Math.floor(n()*3);for(let r=0;r<t;r++){let o=r/t*Math.PI*2+n()*1.2,s=i*(e.hero?.2+r/t*.5:.48+r/t*.45),l=new C,u=d(s,l),f=e.hero?.9+n()*.5:e.type===L?.35:.45+n()*.45,p=h/Math.sin(f)*(.7+n()*.4)*(1-r/t*.35),m=new C(Math.cos(o),0,Math.sin(o)),v=l.clone().addScaledVector(m,p*Math.sin(f)).add(new C(0,p*Math.cos(f),0)),y=l.clone().lerp(v,.45).add(new C(0,-p*.1,0)).addScaledVector(m,p*.12),b=[],x=[];for(let t=0;t<=5;t++){let n=t/5,r=1-n;b.push(new C().addScaledVector(l,r*r).addScaledVector(y,2*r*n).addScaledVector(v,n*n)),x.push(Math.max(.035,u*(e.hero?.62:.5)*(1-.82*n)))}je(a,b,x,6,e.type,e.seed+r);for(let t=0;t<(e.hero?12:6);t++){let t=.15+n()*.8,r=Math.min(4,Math.floor(t*5)),i=b[r+1].clone().sub(b[r]).normalize(),a=b[r].clone().lerp(b[r+1],t*5-r),o=n()<.55;o&&(i.add(g.set(n()-.5,n()*.6,n()-.5).multiplyScalar(1.5)).normalize(),a.addScaledVector(i,.8)),c.push(a.x,a.y,a.z,i.x,i.y,i.z,-i.z,.3,i.x,n()*1e3,o?.09:x[r]*2.4,e.type,o?1.7+n()*1.5:1.6)}for(let t of e.hero?[.5,.68,.86,1.02]:[.7,1]){let r=1-t,i=new C().addScaledVector(l,r*r).addScaledVector(y,2*r*t).addScaledVector(v,t*t);i.add(g.set(n()-.5,n()*.9,n()-.5).multiplyScalar(1.6)),_.push([i.x,i.y,i.z,(e.hero?2.3:1.25)+n()*1+e.r*.6])}}for(let t=0;t<(e.hero?8:3);t++)_.push([m.x+(n()-.5)*h*.9,e.y+e.h*(e.hero?.92:.96)+(n()-.5)*3,m.z+(n()-.5)*h*.9,1.5+n()*(e.hero?1.6:.9)])}else{let t=r?7:4;for(let i=0;i<t;i++){let t=n()*Math.PI*2,i=Math.sqrt(n())*h;_.push([m.x+Math.cos(t)*i,m.y+(n()-.45)*e.h*.3,m.z+Math.sin(t)*i,(r?2.3:3.4)+n()*1.2])}}let v=t?e.hero?150:54:r?20:11,y=t?e.hero?.2:.27:.4;for(let[t,r,i,a]of _){f.push(t,r,i,a);let o=g.set(t-m.x,r-m.y,i-m.z).normalize().clone();for(let s=0;s<v;s++){let s=new C(n()-.5,n()-.5,n()-.5).normalize().addScaledVector(o,.5).add(new C(0,.15,0)).normalize(),c=a*(.72+n()*.4),u=t+s.x*c,d=r+s.y*c,f=i+s.z*c,p=s.multiplyScalar(.6).addScaledVector(g.set(u-m.x,d-m.y,f-m.z).normalize(),.55).normalize(),h=n()<.14?Math.floor(n()*4):e.family;l.push(u,d,f,p.x,p.y,p.z,n()*1e3,a*y*(1+n()*.6),h,0)}for(let o=0;o<2;o++)l.push(t+(n()-.5)*a*.5,r-a*.15*o,i+(n()-.5)*a*.5,0,-1,0,n()*1e3,a*1.25,e.family,1)}let b=t?Math.round(110+e.r*150):r?36:0,x=Math.min(i,t?14:18);for(let t=0;t<b;t++){let t=n()**1.3*x,i=n()*Math.PI*2,a=new C,o=d(t,a),s=Math.cos(i),l=Math.sin(i),u=Math.min(.5,o*(e.type===L?1.5:.75))*(r?1.5:1);c.push(a.x+s*o,a.y,a.z+l*o,e.lean[0],1,e.lean[1],s,0,l,n()*1e3,u,e.type,(e.type===L?Math.min(.5,o*2.3):1+n()*1.5)*(r?1.6:1))}}for(let e=0;e<620;e++){let e=(n()-.5)*150,t=-125+n()*235,r=_e(e,t);if(r<2.3||r>62||ve(e,t)>.6)continue;let i=I(e,t),a=1.1+n()*n()*3.4,o=n()<.4?3:n()<.6?0:n()<.5?1:2,s=3+Math.floor(n()*4);for(let r=0;r<s;r++){let r=e+(n()-.5)*a*.9,s=i+a*(.45+n()*.6),u=t+(n()-.5)*a*.9,d=.38+n()*.5;for(let e=0;e<12;e++){let e=new C(n()-.5,n()-.3,n()-.5).normalize();l.push(r+e.x*d,s+e.y*d,u+e.z*d,e.x,e.y,e.z,n()*1e3,.22+n()*.2,n()<.2?Math.floor(n()*4):o,0)}let f=g.set(r-e,s-i,u-t).normalize();c.push(e+f.x*a*.3,i+a*.3,t+f.z*a*.3,f.x,f.y,f.z,f.z,0,-f.x,n()*1e3,.05,Oe,a*.75)}}let y=new r;y.setAttribute(`position`,new ie(a.position,3)),y.setAttribute(`normal`,new ie(a.normal,3)),y.setAttribute(`aData`,new ie(a.data,3)),y.setIndex(a.index);let b=new _({glslVersion:u,uniforms:e,vertexShader:`
      ${T}
      in vec3 aData;
      out vec3 vWorld; out vec3 vN; out vec3 vData;
      void main() { vWorld = position; vN = normal; vData = aData; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,fragmentShader:`
      ${T}
      ${ke}
      in vec3 vWorld; in vec3 vN; in vec3 vData;
      layout(location = 0) out vec4 outC;
      void main() {
        vec3 Nn = normalize(vN);
        float grain = texture(tNoise, vec2(atan(Nn.z, Nn.x) * 1.3 + vData.y, vWorld.y * 0.07)).r;
        vec3 c = bark(int(vData.x + 0.5), vWorld, Nn, grain, vData.z) * (0.72 + 0.3 * grain);
        outC = vec4(hazed(c, vWorld), 1.0);
      }`}),x=new o(y,b);x.frustumCulled=!1;let S=c.length/13,ee=new Float32Array(S*3),w=new Float32Array(S*3),ne=new Float32Array(S*3),re=new Float32Array(S*4);for(let e=0;e<S;e++){for(let t=0;t<3;t++)ee[e*3+t]=c[e*13+t],w[e*3+t]=c[e*13+3+t],ne[e*3+t]=c[e*13+6+t];for(let t=0;t<4;t++)re[e*4+t]=c[e*13+9+t]}let ae=te(E(S,{aPos:[ee,3],aDir:[w,3],aNrm:[ne,3],aData:[re,4]}),fe(e,{head:ke+`in vec3 aPos; in vec3 aDir; in vec3 aNrm; in vec4 aData;`,body:`
      void makeDab(inout Dab d) {
        vec4 r = hash4(aData.x);
        int k = int(aData.z + 0.5);
        vec3 Nn = normalize(aNrm);
        float foot = aPos.y - heightAt(aPos.xz);
        vec3 c = bark(k, aPos, Nn, r.x, foot);
        d.dir = aDir;
        // a birch is banded across; here and there one of its black scars
        if (k == 1) { d.dir = cross(aDir, Nn); if (r.y < 0.16) c = vec3(0.13, 0.11, 0.15); }
        // moss on the cold side, low down
        if (k != 1 && foot < 2.2 && r.z < 0.3 * (1.0 - foot / 2.2) + 0.1 * max(-dot(Nn, uSunDir), 0.0)) c = mix(c, vec3(0.34, 0.4, 0.14) * (0.5 + 0.9 * sunAt(aPos + Nn * 0.3)), 0.8);
        // lichen, and the cold light of the sky on the shaded side
        if (r.w < 0.1) c = mix(c, vec3(0.56, 0.58, 0.4) * (0.45 + 0.6 * dot(c, vec3(0.6))), 0.7);
        else if (r.w > 0.9 && dot(Nn, uSunDir) < 0.0) c = mix(c, vec3(0.3, 0.33, 0.48), 0.6);
        c = jitter(c, r.yzw, 0.7);
        d.turnabout = 1.0;
        d.pos = aPos;
        d.size = vec2(aData.y, aData.w);
        d.c1 = hazed(c, aPos);
        d.c2 = hazed(jitter(c * 1.2 + vec3(0.02, 0.02, 0.05), r.wxy, 0.6), aPos);
        d.seed = aData.x;
        d.lift = 0.5;
      }`,minPx:[3,10],maxPx:[120,500],cells:[0,4]}),3),D=l.length/10,oe=new Float32Array(D*3),ce=new Float32Array(D*3),le=new Float32Array(D*4);for(let e=0;e<D;e++){for(let t=0;t<3;t++)oe[e*3+t]=l[e*10+t],ce[e*3+t]=l[e*10+3+t];for(let t=0;t<4;t++)le[e*4+t]=l[e*10+6+t]}let ue=te(E(D,{aPos:[oe,3],aNrm:[ce,3],aData:[le,4]}),fe(e,{head:Ae+`in vec3 aPos; in vec3 aNrm; in vec4 aData;`,body:`
      void makeDab(inout Dab d) {
        vec4 r = hash4(aData.x);
        vec4 q = hash4(aData.x + 271.3);
        vec3 toEye = cameraPosition - aPos;
        float dist = length(toEye);
        // far crowns are fewer, larger touches
        float keep = mix(1.0, 0.3, smoothstep(35.0, 130.0, dist));
        // (they leave and come back by growing, never at a stroke)
        d.alive = aData.w > 0.5 ? 1.0 : smoothstep(0.0, 1.0, (keep - q.w) / 0.12);
        if (d.alive <= 0.0) return;
        float gust = gustAt(aPos.xz);
        vec3 P = aPos;
        float high = clamp((P.y - heightAt(P.xz)) / 20.0, 0.1, 1.0);
        P.xz += uWind.xy * (gust * 0.5 + sin(uTime * (1.1 + r.x) + r.y * 30.0) * (0.05 + 0.16 * gust)) * high;
        P.y += sin(uTime * (1.7 + r.z) + r.w * 30.0) * (0.03 + 0.1 * gust) * high;
        vec3 Nn = aNrm;
        vec3 view = -toEye / dist;
        int k = int(aData.z + 0.5);
        vec3 c;
        if (aData.w > 0.5) {
          c = mix(LEAF_S[k] * 0.6, vec3(0.12, 0.1, 0.17), 0.3);
        } else {
          // a crown is never wholly dark: light comes down through all the leaves above it
          float sun = mix(0.5, 1.0, sunAt(P + Nn * 0.9));
          // a leaf with the sun behind it is a lamp: the light comes through it
          float through = pow(max(dot(view, uSunDir), 0.0), 2.0);
          float x = sun * clamp(0.55 + 0.45 * dot(Nn, uSunDir) + 0.6 * through, 0.0, 1.0);
          x *= mix(0.6, 1.0, smoothstep(-0.7, 0.1, Nn.y));
          c = paint3(LEAF_L[k], LEAF_M[k], LEAF_S[k], x, r.x);
          c = mix(c, vec3(0.2, 0.16, 0.25), (1.0 - smoothstep(0.1, 0.4, x)) * 0.14);
          // turned in a gust, the pale back of the leaf
          if (q.x < gust * 0.3) c = mix(c, vec3(1.0, 0.92, 0.6), 0.4 * sun);
        }
        c = jitter(c, r.yzw, aData.w > 0.5 ? 0.3 : 0.55);
        float turn = (q.y - 0.5) * 2.0 + sin(uTime * 3.0 + r.w * 50.0) * 0.5 * gust;
        vec3 round_ = cross(Nn, view);
        d.dir = dot(round_, round_) > 1e-4 ? normalize(round_) : vec3(0.0, 1.0, 0.0);
        d.spin = turn;
        d.pos = P;
        float s = aData.y / sqrt(aData.w > 0.5 ? 1.0 : keep);
        d.size = vec2(s, s * (aData.w > 0.5 ? 1.2 : 1.5 + 0.5 * q.z));
        d.c1 = hazed(c, P);
        d.c2 = hazed(jitter(c * 1.16, q.zxy, 0.7), P);
        d.seed = aData.x;
        d.lift = aData.w > 0.5 ? -0.2 : 0.5;
        d.turnabout = 1.0;
      }`,minPx:[5,8],maxPx:[64,100],cells:[4,2]}),4),de=new v,pe=new m({side:2});de.add(new o(y,pe));let me=new s(new i(1,1),pe,f.length/4),O=new h;for(let e=0;e<f.length/4;e++){let t=f[e*4+3]*.36;O.makeScale(t,t*.8,t).setPosition(f[e*4],f[e*4+1],f[e*4+2]),me.setMatrixAt(e,O)}me.frustumCulled=!1,de.add(me);let k=new d;return k.add(x,ae,ue),{group:k,shade:de,colliders:p,trees:t,counts:{trees:t.length,bark:S,leaves:D}}}var Pe=`
vec3 skyColour(vec3 v) {
  float sunward = max(dot(v, uSunDir), 0.0);
  vec3 low = airColour(v);
  vec3 high = mix(vec3(0.56, 0.68, 0.84), vec3(0.8, 0.84, 0.82), sunward * sunward);
  vec3 c = mix(low, high, smoothstep(0.0, 0.75, v.y));
  c = mix(c, vec3(1.0, 0.95, 0.78), pow(sunward, 24.0) * 0.9);
  return c;
}
`;function Fe(e){let t=new d,n=new o(new y(900,24,16),new _({glslVersion:u,uniforms:e,side:1,depthTest:!1,depthWrite:!1,vertexShader:`
      ${T}
      out vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); }`,fragmentShader:`
      ${T}
      ${Pe}
      in vec3 vDir;
      layout(location = 0) out vec4 outC;
      void main() { outC = vec4(skyColour(normalize(vDir)) * 0.97, 1.0); }`}));n.frustumCulled=!1,n.renderOrder=-10,t.add(n);let r=2600,i=se(515),a=new Float32Array(r*4);for(let e=0;e<r;e++){let t=i()*Math.PI*2,n=-.08+i()**1.4*1.08,r=Math.sqrt(Math.max(0,1-n*n));a.set([Math.cos(t)*r,n,Math.sin(t)*r,i()*1e3],e*4)}let s=te(E(r,{aDir:[a,4]}),fe(e,{head:Pe+`in vec4 aDir;`,body:`
      void makeDab(inout Dab d) {
        vec4 r = hash4(aDir.w);
        vec3 v = normalize(aDir.xyz);
        d.pos = cameraPosition + v * 800.0;
        // strokes lie level, tipping a little, and swing round the sun
        vec3 level = normalize(cross(vec3(0.0, 1.0, 0.0), v));
        vec3 ring = normalize(cross(uSunDir, v) + 1e-4);
        d.dir = normalize(mix(level, ring, 0.45) + vec3(0.0, (r.x - 0.5) * 0.5, 0.0));
        d.size = vec2(46.0 + 40.0 * r.y, 150.0 + 130.0 * r.z);
        vec3 c = skyColour(v);
        d.c1 = jitter(c, r.yzw, 0.22);
        d.c2 = jitter(c * 1.05, r.wxy, 0.3);
        d.seed = aDir.w;
        d.lift = 0.0;
      }`,minPx:[10,20],maxPx:[900,1800],cells:[0,8],depthTest:!1,depthWrite:!1}),-9);return t.add(s),{group:t}}function Ie(e,t=2400){return{mesh:te(E(t),fe(e,{body:`
      const vec3 BOX = vec3(64.0, 26.0, 64.0);
      void makeDab(inout Dab d) {
        float id = float(gl_InstanceID);
        vec4 r = hash4(id * 1.13 + 3.0);
        vec4 q = hash4(id * 2.71 + 19.0);
        float fall = 0.9 + 1.3 * r.w;
        vec3 p = r.xyz * BOX;
        p.y -= uTime * fall;
        p.xz += uWind.xy * uTime * (0.6 + 1.6 * q.x) + vec2(sin(uTime * (0.7 + q.y) + q.z * 20.0), cos(uTime * (0.9 + q.w) + q.x * 20.0)) * 0.6;
        vec3 origin = vec3(cameraPosition.x, uFocus.y + 11.0, cameraPosition.z);
        p = mod(p - origin + BOX * 0.5, BOX) - BOX * 0.5 + origin;
        float ground = heightAt(p.xz);
        float gust = gustAt(p.xz);
        // most hang on until a gust; all vanish into the carpet
        d.alive = smoothstep(q.z * 0.75 - 0.08, q.z * 0.75 + 0.05, gust + 0.2) * smoothstep(ground, ground + 0.5, p.y) * (1.0 - smoothstep(BOX.x * 0.38, BOX.x * 0.5, distance(p.xz, cameraPosition.xz)));
        if (d.alive <= 0.0) return;
        float sun = sunAt(p);
        float turnOver = sin(uTime * (2.0 + 3.0 * q.y) + q.w * 30.0);
        vec3 c = q.x < 0.5 ? vec3(1.0, 0.76, 0.2) : q.x < 0.8 ? vec3(0.98, 0.5, 0.12) : vec3(0.86, 0.22, 0.1);
        c = mix(c * vec3(0.36, 0.3, 0.36), c, sun * (0.72 + 0.28 * turnOver));
        d.pos = p;
        d.dir = normalize(vec3(sin(uTime * 1.3 + q.z * 9.0), turnOver, cos(uTime * 1.7 + q.x * 9.0)));
        d.size = vec2(0.085, 0.13) * (0.7 + 0.7 * r.x) * (0.55 + 0.45 * abs(turnOver));
        d.c1 = hazed(jitter(c, r.zxy, 0.4), p);
        d.c2 = d.c1 * 1.12;
        d.seed = id;
        d.lift = 0.0;
      }`,minPx:[2.5,3.5],maxPx:[24,36],cells:[4,2]}),6)}}function Le(e,t=260){let n=new Float32Array(t*3),r=new Float32Array(t*4),i=new Float32Array(t*3);for(let e=0;e<t;e++)r[e*4]=Math.random()*1e3;let a=E(t,{aPos:[n,3],aData:[r,4]},!0),o=te(a,fe(e,{head:`in vec3 aPos; in vec4 aData;`,body:`
      void makeDab(inout Dab d) {
        d.alive = smoothstep(0.0, 0.25, aData.y);
        if (d.alive <= 0.0) return;
        vec4 r = hash4(aData.x);
        float sun = sunAt(aPos + vec3(0.0, 0.1, 0.0));
        float turnOver = sin(uTime * (5.0 + 6.0 * r.y) + r.w * 30.0) * aData.z;
        vec3 c = r.x < 0.5 ? vec3(1.0, 0.76, 0.2) : r.x < 0.8 ? vec3(0.98, 0.5, 0.12) : vec3(0.86, 0.22, 0.1);
        c = mix(c * vec3(0.42, 0.3, 0.34), c, sun * (0.75 + 0.25 * turnOver));
        d.pos = aPos;
        d.dir = normalize(vec3(sin(uTime * 4.0 * aData.z + r.z * 9.0), 0.4 + turnOver, cos(uTime * 3.0 * aData.z + r.x * 9.0)));
        d.size = vec2(0.09, 0.14) * (0.7 + 0.6 * r.z) * (0.6 + 0.4 * abs(turnOver));
        d.c1 = hazed(jitter(c, r.zxy, 0.4), aPos);
        d.c2 = d.c1 * 1.12;
        d.seed = aData.x;
        d.lift = 0.0;
      }`,minPx:[2.5,3.5],maxPx:[30,44],cells:[4,2]}),6),s=0,c=0;return{mesh:o,update(e,o,l,u,d,f){for(c+=d&&u>2.4?e*u*5.5:0;c>=1;){--c;let e=s;s=(s+1)%t;let a=(Math.random()-.5)*2;n[e*3]=o.x-l.x*.25-l.z*a*.28,n[e*3+1]=o.y+.05,n[e*3+2]=o.z-l.z*.25+l.x*a*.28;let d=1+Math.random()*2.4,f=-.4+Math.random()*1.6;i[e*3]=l.x*(u*.45-f)-l.z*a*1.7,i[e*3+1]=d,i[e*3+2]=l.z*(u*.45-f)+l.x*a*1.7,r[e*4+1]=1,r[e*4+2]=1}for(let a=0;a<t;a++){if(r[a*4+1]<=0)continue;let t=a*3,o=Math.exp(-2.2*e);i[t]*=o,i[t+2]*=o,i[t+1]=Math.max(i[t+1]-6.5*e,-1.3),i[t]+=Math.sin(r[a*4]+n[t+1]*9)*e*2,n[t]+=i[t]*e,n[t+1]+=i[t+1]*e,n[t+2]+=i[t+2]*e;let s=f(n[t],n[t+2])+.04;n[t+1]<=s?(n[t+1]=s,i[t]=i[t+2]=0,r[a*4+2]=0,r[a*4+1]-=e*1.6):r[a*4+1]-=e*.35}a.attributes.aPos.needsUpdate=!0,a.attributes.aData.needsUpdate=!0}}}var z=new URLSearchParams(location.search),B=z.has(`capture`),Re=()=>(z.get(`quality`)??window.patch?.quality??`high`)===`low`,ze=!0,Be=!1,Ve=me({...S.block,onSet(){},onTrigger(){},onVisible(e){ze=e,Be&&mt()}});Ve.progress(.03,`正在铺开大地`);var He={},Ue=performance.now(),V=e=>{let t=performance.now();He[e]=Math.round(t-Ue),Ue=t},H=new p({antialias:!1,powerPreference:`high-performance`});H.setPixelRatio(B?1:Math.min(devicePixelRatio,1.5)),H.setSize(innerWidth,innerHeight),H.autoClear=!1,H.outputColorSpace=f,document.getElementById(`view`).appendChild(H.domElement);var U=pe();U.tBrush.value=ae(),z.has(`impasto`)&&(U.uImpasto.value=+z.get(`impasto`));var W=new v,G=new g(46,innerWidth/innerHeight,.2,2e3),We=()=>{};function Ge(){H.setSize(innerWidth,innerHeight),G.aspect=innerWidth/innerHeight,G.updateProjectionMatrix(),We()}addEventListener(`resize`,Ge),V(`start`);var Ke=0,K=(e,t)=>{Ke=Math.max(Ke,e),Ve.progress(Ke,t)},qe=x(U,e=>K(.05+.55*e,`正在描绘旅人`)),Je=()=>new Promise(e=>setTimeout(e,0));await xe(e=>(K(.03+.07*e,`正在铺开大地`),Je()));var Ye=Se(U);V(`land`),K(.1,`正在生长树林`),await Je();var Xe=Ne(U);V(`forest`);var Ze=Ee(U),Qe=Fe(U),$e=Ie(U,2400),et=ue(H,U,Xe.shade);V(`shade`),K(.25,`正在描绘旅人`),await Je();var tt=Le(U);W.add(Qe.group,Ye.mesh,Xe.group,Ze.group,$e.mesh,tt.mesh),await O.init();var q=new O.World({x:0,y:-9.81,z:0});{let e=Ye.heightField();q.createCollider(O.ColliderDesc.heightfield(e.cells,e.cells,e.heights,{x:2*e.half,y:1,z:2*e.half}));for(let e of Xe.colliders)q.createCollider(O.ColliderDesc.cylinder(5,e.r).setTranslation(e.x,e.y+4.5,e.z))}V(`physics`);var nt=await qe,{man:J}=nt;W.add(J.object,nt.cloakMesh,nt.dabs);var Y=new re(J),X=new C(A.x,I(A.x,A.z),A.z),Z=new le({RAPIER:O,world:q,man:J,animator:Y,spawn:X,yaw:Math.PI}),Q=new de(G);Q.yaw=Math.PI;var rt=new D(H.domElement,{pads:!B&&!z.has(`nopad`)});q.step(),V(`figure`);var it=oe(H,U);We=()=>it.resize(),it.uniforms.uCanvas.value=z.has(`canvas`)?+z.get(`canvas`):1;function at(){let e=Re();it.uniforms.uShafts.value=z.has(`shafts`)?+z.get(`shafts`):+!e,$e.mesh.geometry.instanceCount=e?900:2400}at(),window.patch?.addEventListener?.(`qualitychange`,at);var $={x:b.x,z:b.y},ot=0;function st(e,t,n,r){let i=e*$.x+n*$.z,a=-e*$.z+n*$.x,o=he.clamp(.5+.8*w((i-ot*4)/40,a/90)+.3*w((i-ot*6.5)/11,a/17),0,1),s=.4+3.2*o*o;return r.set($.x*s,.25*Math.sin(ot*2.3+e)*o,$.z*s)}function ct(){let e=Z.halfHeight();Z.body.setTranslation({x:X.x,y:X.y+Z.t.radius+e+.05,z:X.z},!0),q.propagateModifiedBodyPositionsToColliders(),Z.vel.set(0,0,0),Z.speed=0,Z.mode=`move`,Z.feet.copy(X),Z.prevFeet.copy(X),Z.visualY=X.y,Z.grounded=!0,Y.lock=null,Y.lockOff=null,Y.enter(Y.locoState({strafe:!1}),.1)}var lt=new e;function ut(e){e=Math.min(e,1/20),ot+=e;let t=rt.read(e);Z.update(e,t,Q.yaw),(Z.feet.y<I(Z.feet.x,Z.feet.z)-6||_e(Z.feet.x,Z.feet.z)>78)&&ct();let n=Z.visualRoot(e);J.object.position.copy(n),J.object.rotation.set(0,Z.yaw,0),J.object.updateMatrixWorld(!0);let r=Z.vel.clone().applyAxisAngle(new C(0,1,0),-Z.yaw);Y.update(e,{speed:Z.mode===`move`?Z.speed:Math.hypot(r.x,r.z),moveAngle:Z.moveAngle,grounded:Z.grounded}),Y.relaxHands(Z.speed),Y.uprightTrunk(e,Z.speed,Z.grounded&&Z.mode!==`jump`&&Z.mode!==`air`?1:.3);let i=Z.mode===`move`||Z.mode===`idleExtra`?he.clamp(1-(Z.speed-1.5)/2,0,1):0;Y.lookToward(e,G.getWorldDirection(new C),i),Y.armClearance(e),Z.mode===`move`&&!Z.strafe?Y.leanInto(e,Z.turnRate,Z.speed,Z.accelF):Y.leanInto(e,0,0,0);let a=Z.grounded&&Z.mode!==`jump`&&Z.mode!==`air`;Y.placeFeet(e,(e,t,n)=>Z.ground(e,t,n,1.4),n.y,+!!a),J.object.updateMatrixWorld(!0),nt.updateCloak(e,st,I),tt.update(e,n,{x:Math.sin(Z.yaw),z:Math.cos(Z.yaw)},Z.speed,a,I),Q.update(e,n,t.look,t.zoom,(e,t,n)=>Z.castRay(e,t,n),I),G.updateMatrixWorld(!0),H.getDrawingBufferSize(lt),U.uTime.value=ot,U.uPixel.value=2*Math.tan(he.degToRad(G.fov)/2)/lt.y,U.uFocus.value.copy(n),Ze.follow(G.position.x,G.position.z),et.update(W,n),it.render(W,G)}window.lab={THREE:n,player:Z,follow:Q,camera:G,input:rt,animator:Y,figure:nt,shared:U,frame:it,renderer:H,timings:He,counts:Xe.counts,heightAt:I,respawn:ct,way:ge,step(e=1/60,t=1){for(let n=0;n<t;n++)ut(e)},setInput(e){rt.override=e},teleport(e,t,n,r){let i=I(e,t),a=Z.halfHeight();Z.body.setTranslation({x:e,y:i+Z.t.radius+a+.05,z:t},!0),q.propagateModifiedBodyPositionsToColliders(),Z.feet.set(e,i,t),Z.prevFeet.copy(Z.feet),Z.visualY=i,Z.vel.set(0,0,0),Z.speed=0,Z.mode=`move`,Z.grounded=!0,Z.yaw=Z.lastYaw=Math.atan2(n-e,r-t),Q.yaw=Z.yaw,Q.pivot.set(0,0,0),Y.lock=null,Y.lockOff=null,Y.enter(Y.locoState({strafe:!1}),.05),ut(1/60)},view(e,t){Q.free=e?{position:new C(...e),target:new C(...t)}:null}},K(.68,`正在调色`);function dt(){let e=H.getContext(),t=e.fenceSync(e.SYNC_GPU_COMMANDS_COMPLETE,0);return e.flush(),new Promise(n=>{let r=()=>{if(e.clientWaitSync(t,0,0)===e.TIMEOUT_EXPIRED)return void setTimeout(r,4);e.deleteSync(t),n()};r()})}B||(H.debug.checkShaderErrors=!1,await H.compileAsync(W,G),V(`shaders`),K(.86,`正在调色`));for(let e=0;e<(B?1:5)&&(ut(1/60),!B);e++)await dt(),K(.88+.025*e,`正在落笔`),await Je();V(`first frame`);var ft=!1,pt=0;function mt(){let e=ze&&!B;e!==ft&&(ft=e,pt=performance.now(),H.setAnimationLoop(e?()=>{let e=performance.now();ut((e-pt)/1e3),pt=e}:null))}if(!B){let e=document.getElementById(`hint`);addEventListener(`keydown`,t=>{t.code===`KeyH`&&e.classList.toggle(`off`)}),setTimeout(()=>e.classList.add(`faded`),9e3)}Ge(),Be=!0,mt(),document.getElementById(`loading`)?.remove(),(z.has(`clean`)||B)&&document.getElementById(`hint`)?.remove(),Ve.ready(),window.lab.ready=!0,window.__block={ready:!0,block:Ve,timings:He,set(){}};