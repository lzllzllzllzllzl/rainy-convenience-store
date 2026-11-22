/* ============================================================
   雨夜便利店 · 街角微缩场景（三渲二 / 日式动画氛围）
   左键拖拽旋转 · 滚轮缩放 · 右键/Shift 拖拽平移 · 双指触控支持
   ============================================================ */
(() => {
'use strict';
const T = window.THREE;
const cv = document.getElementById('view');
let renderer = null;
try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) {}
if (!renderer) { const n = document.getElementById('nogl'); if (n) n.style.display = 'grid'; return; }

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;

const scene = new T.Scene();
const BGCOL = 0x0a0d19;
scene.background = new T.Color(BGCOL);
scene.fog = new T.Fog(BGCOL, 68, 170);

const camera = new T.PerspectiveCamera(40, 2, 0.5, 340);
function resize() {
  const w = innerWidth, h = innerHeight;
  const zoom = (window.visualViewport && window.visualViewport.scale) || 1;
  renderer.setPixelRatio(Math.min((window.devicePixelRatio || 1) * zoom, 2.5));
  renderer.setSize(w, h, true);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
let _lw = 0, _lh = 0;
function checkSize() {
  if (cv.clientWidth !== _lw || cv.clientHeight !== _lh) {
    _lw = cv.clientWidth; _lh = cv.clientHeight;
    resize();
  }
}

/* ---------------- 自定义轨道控制（拖拽/旋转/缩放/平移，带阻尼） ---------------- */
const orb = {
  tx: -6.5, ty: 2.8, tz: -3.5, th: 0.62, ph: 1.04, r: 46,
  ctx: -6.5, cty: 2.8, ctz: -3.5, cth: 0.62, cph: 1.04, cr: 46
};
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const pts = new Map(); let pinchD = 0;
cv.style.touchAction = 'none'; cv.style.cursor = 'grab';
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey });
  if (pts.size === 2) { const a = [...pts.values()]; pinchD = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  cv.style.cursor = 'grabbing';
});
cv.addEventListener('pointermove', e => {
  const p = pts.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pts.size === 1) {
    if (p.b === 0 && !p.sh) {
      orb.th -= dx * 0.0052;
      orb.ph = clamp(orb.ph - dy * 0.0052, 0.12, 1.5);
    } else pan(dx, dy);
  } else if (pts.size === 2) {
    const a = [...pts.values()];
    const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    if (pinchD > 0) orb.r = clamp(orb.r * pinchD / Math.max(d, 1), 14, 100);
    pinchD = d;
  }
});
const endP = e => { pts.delete(e.pointerId); pinchD = 0; cv.style.cursor = 'grab'; };
cv.addEventListener('pointerup', endP); cv.addEventListener('pointercancel', endP);
cv.addEventListener('wheel', e => { e.preventDefault(); orb.r = clamp(orb.r * Math.exp(e.deltaY * 0.0011), 14, 100); }, { passive: false });
const _dir = new T.Vector3(), _rt = new T.Vector3(), _up = new T.Vector3();
function pan(dx, dy) {
  camera.getWorldDirection(_dir);
  _rt.crossVectors(_dir, camera.up).normalize();
  _up.crossVectors(_rt, _dir).normalize();
  const k = orb.cr * 0.0014;
  orb.tx = clamp(orb.tx - dx * _rt.x * k + dy * _up.x * k, -17, 17);
  orb.ty = clamp(orb.ty + dy * _up.y * k, 0.4, 12);
  orb.tz = clamp(orb.tz - dx * _rt.z * k + dy * _up.z * k, -17, 17);
}

/* ---------------- 灯光 ---------------- */
scene.add(new T.HemisphereLight(0x2e3a6e, 0x14171f, 0.52));
const moon = new T.DirectionalLight(0x8fb0e8, 0.3);
moon.position.set(26, 38, 14);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -34; moon.shadow.camera.right = 34;
moon.shadow.camera.top = 34; moon.shadow.camera.bottom = -34;
moon.shadow.camera.near = 8; moon.shadow.camera.far = 100;
moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.5;
scene.add(moon);
const fill = new T.DirectionalLight(0x5566a8, 0.1);
fill.position.set(-22, 26, -16);
scene.add(fill);

/* ---------------- 纹理工厂 ---------------- */
function ctex(w, h, fn, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.encoding = T.sRGBEncoding; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function texClone(t, rx, ry) { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = T.RepeatWrapping; c.repeat.set(rx, ry); return c; }

const FONT = '"Meiryo","Yu Gothic","Yu Gothic UI","MS Gothic",sans-serif';

/* 卡通明暗阶 */
const gradMap = new T.DataTexture(new Uint8Array([78, 132, 188, 255]), 4, 1, T.RedFormat);
gradMap.minFilter = gradMap.magFilter = T.NearestFilter;
gradMap.generateMipmaps = false;
gradMap.needsUpdate = true;

/* 柔光贴图 */
const texGlow = ctex(128, 128, (g, w, h) => {
  const r = g.createRadialGradient(w/2, w/2, 2, w/2, w/2, w/2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const texDrop = ctex(32, 32, (g, w) => {
  const r = g.createRadialGradient(w/2, w/2, 1, w/2, w/2, w/2);
  r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
/* 地面光带（湿反射）：上端亮、向下渐隐 */
const texStreak = ctex(64, 256, (g, w, h) => {
  const lg = g.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, 'rgba(255,255,255,.95)'); lg.addColorStop(0.5, 'rgba(255,255,255,.35)');
  lg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(w/2, 30, 8, w/2, 60, w*1.1);
  rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
});
/* 积水 */
const texPuddle = ctex(256, 256, (g, w, h) => {
  const r = g.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
  r.addColorStop(0, 'rgba(150,185,245,.42)'); r.addColorStop(0.55, 'rgba(95,125,185,.2)');
  r.addColorStop(1, 'rgba(60,80,130,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  const r2 = g.createRadialGradient(w*0.4, h*0.42, 4, w*0.4, h*0.42, w*0.3);
  r2.addColorStop(0, 'rgba(210,230,255,.25)'); r2.addColorStop(1, 'rgba(210,230,255,0)');
  g.fillStyle = r2; g.fillRect(0, 0, w, h);
});
/* 沥青 */
const texAsphalt = ctex(256, 256, (g, w, h) => {
  g.fillStyle = '#262c40'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.09)';
    g.fillRect(Math.random()*w, Math.random()*h, 1.6, 1.6);
  }
  g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    g.beginPath(); let x = Math.random()*w, y = Math.random()*h; g.moveTo(x, y);
    for (let j = 0; j < 5; j++) { x += (Math.random()-0.5)*60; y += (Math.random()-0.5)*60; g.lineTo(x, y); }
    g.stroke();
  }
});
/* 人行道地砖 */
const texTile = ctex(128, 128, (g, w, h) => {
  g.fillStyle = '#2c3348'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)';
    g.fillRect(Math.random()*w, Math.random()*h, 1.5, 1.5);
  }
  g.strokeStyle = '#232a40'; g.lineWidth = 3;
  g.strokeRect(0, 0, w, h);
});
/* 底座侧面 */
const texBaseSide = ctex(256, 128, (g, w, h) => {
  g.fillStyle = '#12151f'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#171b28'; g.fillRect(0, 0, w, 18);
  g.fillStyle = '#0d0f17'; g.fillRect(0, h-30, w, 30);
  g.fillStyle = 'rgba(255,255,255,.03)';
  for (let i = 0; i < 200; i++) g.fillRect(Math.random()*w, Math.random()*h, 2, 2);
});
/* 排水沟篦子 */
const texGrate = ctex(64, 16, (g, w, h) => {
  g.fillStyle = '#10131c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2e3648';
  for (let x = 3; x < w; x += 8) g.fillRect(x, 3, 3, h-6);
});
/* 井盖 */
const texManhole = ctex(128, 128, (g, w) => {
  g.fillStyle = '#1b2130'; g.beginPath(); g.arc(w/2, w/2, w/2-2, 0, 7); g.fill();
  g.strokeStyle = '#39435c'; g.lineWidth = 4;
  g.beginPath(); g.arc(w/2, w/2, w/2-8, 0, 7); g.stroke();
  g.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = i/8*Math.PI*2;
    g.beginPath(); g.moveTo(w/2, w/2); g.lineTo(w/2+Math.cos(a)*(w/2-12), w/2+Math.sin(a)*(w/2-12)); g.stroke();
  }
});
/* 便利店主招牌 */
const texSignMain = ctex(640, 200, (g, w, h) => {
  const lg = g.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, '#0e6e62'); lg.addColorStop(1, '#083f3a');
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#1fae9a'; g.lineWidth = 8; g.strokeRect(6, 6, w-12, h-12);
  g.fillStyle = '#f2fff9';
  g.font = '900 108px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('コンビニ', w*0.52, h*0.44);
  g.fillStyle = '#ff8c3a'; g.fillRect(w*0.16, h-52, w*0.68, 16);
  g.fillStyle = '#0b2a28'; g.font = '800 44px ' + FONT; g.textAlign = 'left';
  g.fillText('24時間', w*0.175, h-60);
  g.textAlign = 'right'; g.fillStyle = '#ffd9a8';
  g.fillText('雨夜営業中', w*0.84, h-60);
});
/* 招牌灯箱贴图（自发光版） */
const texSignMainE = texSignMain;
/* 街角投影招牌 */
const texSignCorner = ctex(320, 200, (g, w, h) => {
  g.fillStyle = '#101a2b'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2c4a78'; g.lineWidth = 6; g.strokeRect(5, 5, w-10, h-10);
  g.fillStyle = '#ff8c3a'; g.beginPath(); g.arc(w*0.24, h*0.42, 40, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '900 52px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('夜', w*0.24, h*0.42);
  g.fillStyle = '#eaf4ff'; g.textAlign = 'left'; g.font = '800 56px ' + FONT;
  g.fillText('サクラ', w*0.4, h*0.3);
  g.font = '700 44px ' + FONT; g.fillText('マート', w*0.4, h*0.62);
  g.fillStyle = '#37e6c8'; g.font = '700 30px ' + FONT;
  g.fillText('OPEN 24H', w*0.4, h*0.86);
});
/* 路名牌 */
const texPlate = ctex(320, 96, (g, w, h) => {
  g.fillStyle = '#1750b8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8eefc'; g.lineWidth = 6; g.strokeRect(4, 4, w-8, h-8);
  g.fillStyle = '#f4f8ff'; g.font = '800 52px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('さくら通り', w/2, h/2+3);
});
/* 注意行人标志 */
const texWarn = ctex(128, 128, (g, w) => {
  g.translate(w/2, w/2); g.rotate(Math.PI/4);
  g.fillStyle = '#ffd23a'; g.fillRect(-42, -42, 84, 84);
  g.strokeStyle = '#1a1a1a'; g.lineWidth = 7; g.strokeRect(-42, -42, 84, 84);
  g.rotate(-Math.PI/4);
  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.arc(0, -26, 9, 0, 7); g.fill();
  g.fillRect(-8, -14, 16, 26);
  g.save(); g.translate(-6, -6); g.rotate(0.5); g.fillRect(-4, 0, 8, 24); g.restore();
  g.save(); g.translate(8, -4); g.rotate(-0.4); g.fillRect(-4, 0, 8, 26); g.restore();
});
/* 贩卖机面板 */
const texVend = ctex(256, 384, (g, w, h) => {
  g.fillStyle = '#dfe6ee'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#cf3f46'; g.fillRect(0, 0, w, 64);
  g.fillStyle = '#fff'; g.font = '800 30px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('つめた〜い', w/2, 34);
  const cols = ['#ff5f5f', '#4fa8ff', '#ffd23a', '#7ddf6a', '#ff8c3a', '#c78bff', '#ff7fae', '#5fe6d0', '#9fb6ff'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const x = 38 + c*66, y = 100 + r*62;
    g.fillStyle = cols[(r*3+c) % cols.length];
    g.beginPath(); g.arc(x+14, y, 20, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.arc(x+8, y-7, 7, 0, 7); g.fill();
    g.fillStyle = '#2a3040'; g.fillRect(x-8, y+26, 44, 10);
  }
  g.fillStyle = '#20242f'; g.fillRect(0, 348, w, 36);
  g.fillStyle = '#8fa0bb'; g.fillRect(0, 348, w, 5);
});
/* 巷内小招牌 */
const texIzakaya = ctex(96, 256, (g, w, h) => {
  g.fillStyle = '#160e20'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#ff5f8a'; g.lineWidth = 5; g.strokeRect(4, 4, w-8, h-8);
  g.fillStyle = '#ff9db8'; g.font = '800 40px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['深','夜','食','堂'].forEach((ch, i) => g.fillText(ch, w/2, 40 + i*56));
});
/* 暖帘小旗 */
const texNoren = ctex(96, 192, (g, w, h) => {
  g.fillStyle = '#1d2a52'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#3d54a0'; g.lineWidth = 4; g.strokeRect(3, 3, w-6, h-6);
  g.fillStyle = '#f4f0e0'; g.font = '800 34px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['営','業','中'].forEach((ch, i) => g.fillText(ch, w/2, 36 + i*52));
});
/* 公告栏海报 */
function posterTex(bg, accent) {
  return ctex(128, 160, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(10, 10, w-20, 34);
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 4; i++) g.fillRect(10, 56+i*18, (w-20)*(0.5+Math.random()*0.5), 8);
    g.beginPath(); g.arc(w*0.72, h*0.72, 22, 0, 7); g.fill();
  });
}
const texPosterA = posterTex('#f2e7d8', '#d95f43');
const texPosterB = posterTex('#ddebf2', '#2a7fc9');
const texPosterC = posterTex('#e8f2dd', '#4a9e3f');
/* 停车 P / 自行车图标 */
const texP = ctex(96, 96, (g, w) => {
  g.fillStyle = '#3a6fd0'; g.fillRect(0, 0, w, w);
  g.strokeStyle = '#eef4ff'; g.lineWidth = 5; g.strokeRect(4, 4, w-8, w-8);
  g.fillStyle = '#eef4ff'; g.font = '900 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('P', w/2, w/2+4);
});
const texBike = ctex(96, 96, (g, w) => {
  g.strokeStyle = 'rgba(230,238,250,.9)'; g.lineWidth = 6; g.fillStyle = 'rgba(230,238,250,.9)';
  g.beginPath(); g.arc(26, 66, 15, 0, 7); g.stroke();
  g.beginPath(); g.arc(70, 66, 15, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(26, 66); g.lineTo(42, 36); g.lineTo(64, 36); g.lineTo(70, 66); g.lineTo(48, 66); g.lineTo(26, 66); g.stroke();
  g.beginPath(); g.moveTo(42, 36); g.lineTo(38, 26); g.lineTo(52, 26); g.stroke();
});
/* 对街建筑立面 */
function facadeTex(seed) {
  const wins = [];
  let s = seed;
  const rnd = () => { s = (s*9301+49297) % 233280; return s/233280; };
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
    const v = rnd();
    wins.push({ x: 26 + c*80, y: 34 + r*72, w: 52, h: 44, st: v < 0.34 ? 1 : (v < 0.5 ? 2 : 0) });
  }
  const draw = (g, w, h, litOnly) => {
    if (!litOnly) {
      g.fillStyle = '#31334a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(Math.random()*w, Math.random()*h, 2, 2); }
    } else { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
    wins.forEach(win => {
      if (win.st === 0) { if (!litOnly) { g.fillStyle = '#191d2c'; g.fillRect(win.x, win.y, win.w, win.h); g.strokeStyle = '#252a3d'; g.lineWidth = 4; g.strokeRect(win.x, win.y, win.w, win.h); } return; }
      const col = win.st === 1 ? ['#ffd28a', '#ffe6b8'] : ['#8fc6ff', '#b8dcff'];
      if (litOnly) { g.fillStyle = win.st === 1 ? '#ffbf66' : '#7ab4f2'; g.fillRect(win.x, win.y, win.w, win.h); }
      else {
        g.fillStyle = col[0]; g.fillRect(win.x, win.y, win.w, win.h);
        g.fillStyle = col[1]; g.fillRect(win.x+6, win.y+6, win.w-12, 14);
        g.strokeStyle = '#20242f'; g.lineWidth = 5; g.strokeRect(win.x, win.y, win.w, win.h);
        g.beginPath(); g.moveTo(win.x, win.y+win.h/2); g.lineTo(win.x+win.w, win.y+win.h/2); g.stroke();
      }
    });
  };
  const map = ctex(512, 400, (g, w, h) => draw(g, w, h, false));
  const emis = ctex(512, 400, (g, w, h) => draw(g, w, h, true));
  return { map, emis };
}
const facA = facadeTex(7), facB = facadeTex(123);
/* 小店招牌条 */
function shopSignTex(text, bg, fg) {
  return ctex(256, 64, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.strokeRect(3, 3, w-6, h-6);
    g.fillStyle = fg; g.font = '800 34px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w/2, h/2+2);
  });
}
const texShopA = shopSignTex('スナック月', '#3a2050', '#ffd0f0');
const texShopB = shopSignTex('クリーニング', '#14324a', '#bfe8ff');

/* ---------------- 材质 ---------------- */
function toon(color, opt) { return new T.MeshToonMaterial(Object.assign({ color, gradientMap: gradMap }, opt || {})); }
const M = {
  concrete: toon(0x171b2a),
  curb: toon(0x333c50),
  wallCream: toon(0xbfb5a0),
  wallSkirt: toon(0x2e3442),
  header: toon(0x2c3244),
  innerWarm: toon(0x7a6c58),
  innerDark: toon(0x2c3140),
  roof: toon(0x1a1f2c),
  frame: toon(0x2e3648),
  dark: toon(0x1c2130),
  metal: toon(0x5a6478),
  metalLight: toon(0x8b93a6),
  white: toon(0xc9d2e0),
  teal: toon(0x0b4f48),
  orange: toon(0xe07a30),
  red: toon(0xc9402e),
  mint: toon(0x7fd0c0),
  poleWood: toon(0x55503f),
  poleGray: toon(0x515a70),
  trunk: toon(0x2a2622),
  leaf: toon(0x1a332e),
  shelf: toon(0x262c3c),
  binBody: toon(0x333c52),
  binGreen: toon(0x3f7d52),
  binBlue: toon(0x3a6ea8),
  rail: toon(0x8f9cb4),
  mark: toon(0xd8e0ee, { emissive: 0x8fa2c8, emissiveIntensity: 0.3 }),
  cone: toon(0xe06a28),
  brick: toon(0x2c2a3c),
  baseSide: toon(0xffffff, { map: texBaseSide }),
  glass: new T.MeshToonMaterial({ color: 0x9fc2e0, gradientMap: gradMap, transparent: true, opacity: 0.14, emissive: 0x27405c, emissiveIntensity: 0.22, depthWrite: false }),
  doorGlass: new T.MeshToonMaterial({ color: 0xaecfe4, gradientMap: gradMap, transparent: true, opacity: 0.1, emissive: 0x2c4a66, emissiveIntensity: 0.18, depthWrite: false })
};
const outlineMat = new T.MeshBasicMaterial({ color: 0x05070d, side: T.BackSide });
const signMat = new T.MeshBasicMaterial({ map: texSignMain });

/* ---------------- 几何助手 ---------------- */
function outline(m, s) {
  s = s || 1.045;
  const o = new T.Mesh(m.geometry, outlineMat);
  o.position.copy(m.position); o.rotation.copy(m.rotation);
  o.scale.copy(m.scale).multiplyScalar(s);
  o.castShadow = o.receiveShadow = false;
  m.parent.add(o);
  return o;
}
function mk(geo, mat, x, y, z, o) {
  o = o || {};
  const m = new T.Mesh(geo, mat);
  m.position.set(x || 0, y || 0, z || 0);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  if (o.sx || o.sy || o.sz) m.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
  m.castShadow = !!o.cast;
  m.receiveShadow = o.recv !== false;
  if (o.order) m.renderOrder = o.order;
  (o.parent || scene).add(m);
  if (o.out) outline(m, o.out === true ? 1.045 : o.out);
  return m;
}
function B(w, h, d, mat, x, y, z, o) { return mk(new T.BoxGeometry(w, h, d), mat, x, y, z, o); }
function Cy(rt, rb, h, mat, x, y, z, o) {
  o = o || {};
  return mk(new T.CylinderGeometry(rt, rb, h, o.seg || 18), mat, x, y, z, o);
}
function tube(a, b, r, mat, parent) {
  const d = new T.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new T.Mesh(new T.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
  m.castShadow = false; m.receiveShadow = false;
  (parent || scene).add(m);
  return m;
}
const shimmers = [];
function glow(x, y, z, w, h, color, op) {
  const s = new T.Sprite(new T.SpriteMaterial({
    map: texGlow, color: color || 0xffffff, transparent: true,
    opacity: op === undefined ? 0.4 : op, blending: T.AdditiveBlending, depthWrite: false, fog: false
  }));
  s.position.set(x, y, z); s.scale.set(w, h, 1);
  scene.add(s);
  return s;
}
function streak(x, z, dx, dz, len, w, color, op, y) {
  const g = new T.PlaneGeometry(w, len); g.rotateX(-Math.PI / 2);
  const mat = new T.MeshBasicMaterial({ map: texStreak, color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const m = new T.Mesh(g, mat);
  m.position.set(x, y === undefined ? 0.095 : y, z);
  m.rotation.y = Math.atan2(-dx, -dz);
  m.renderOrder = 6;
  scene.add(m);
  shimmers.push({ mat, base: op, ph: Math.random() * 6.28 });
  return m;
}
function puddle(x, z, rx, rz, y, rot) {
  const g = new T.CircleGeometry(1, 22); g.rotateX(-Math.PI / 2);
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: texPuddle, transparent: true, depthWrite: false, fog: false }));
  m.position.set(x, y === undefined ? 0.088 : y, z);
  m.scale.set(rx, 1, rz);
  if (rot) m.rotation.y = rot;
  m.renderOrder = 4;
  scene.add(m);
  return m;
}

/* ================= 底座与地面 ================= */
B(44, 2.6, 44, M.baseSide, 0, -1.31, 0, { recv: true });
mk(new T.PlaneGeometry(44, 44).rotateX(-Math.PI / 2), M.concrete, 0, 0.002, 0, {});

/* 道路 */
const roadA = B(44, 0.06, 12, toon(0xffffff, { map: texClone(texAsphalt, 11, 3) }), 0, 0.03, 3, {});
B(12, 0.06, 19, toon(0xffffff, { map: texClone(texAsphalt, 3, 4.8) }), 13, 0.03, -12.5, {});
B(12, 0.06, 19, toon(0xffffff, { map: texClone(texAsphalt, 3, 4.8) }), 13, 0.03, 15.5, {});

/* 人行道 */
function walk(x, z, w, d) { return B(w, 0.14, d, toon(0xffffff, { map: texClone(texTile, w/2, d/2) }), x, 0.07, z, {}); }
walk(-7.5, -5.5, 29, 5);        // 店前
walk(4, -12.5, 6, 18.5);        // 店侧
walk(-7.5, 11, 29, 4);          // 对街
walk(20.5, 0, 3, 44);           // 右侧

/* 路缘石 */
B(29, 0.14, 0.35, M.curb, -7.5, 0.07, -2.85, {});
B(3, 0.14, 0.35, M.curb, 20.5, 0.07, -2.85, {});
B(29, 0.14, 0.35, M.curb, -7.5, 0.07, 9.15, {});
B(3, 0.14, 0.35, M.curb, 20.5, 0.07, 9.15, {});
B(0.35, 0.14, 19, M.curb, 7.15, 0.07, -12.5, {});
B(0.35, 0.14, 13, M.curb, 7.15, 0.07, 15.5, {});
B(0.35, 0.14, 19, M.curb, 18.85, 0.07, -12.5, {});
B(0.35, 0.14, 13, M.curb, 18.85, 0.07, 15.5, {});

/* 道路标线 */
const edgeMat = M.mark;
B(28.9, 0.016, 0.14, edgeMat, -7.45, 0.074, -2.75, { recv: false });
B(2.9, 0.016, 0.14, edgeMat, 20.45, 0.074, -2.75, { recv: false });
B(28.9, 0.016, 0.14, edgeMat, -7.45, 0.074, 8.75, { recv: false });
B(2.9, 0.016, 0.14, edgeMat, 20.45, 0.074, 8.75, { recv: false });
B(0.14, 0.016, 18.9, edgeMat, 7.3, 0.074, -12.45, { recv: false });
B(0.14, 0.016, 12.9, edgeMat, 7.3, 0.074, 15.45, { recv: false });
B(0.14, 0.016, 18.9, edgeMat, 18.7, 0.074, -12.45, { recv: false });
B(0.14, 0.016, 12.9, edgeMat, 18.7, 0.074, 15.45, { recv: false });
for (let x = -21; x < 6.5; x += 3.2) B(1.6, 0.016, 0.14, edgeMat, x, 0.074, 3, { recv: false });
for (let z = -20; z < -4; z += 3.2) B(0.14, 0.016, 1.6, edgeMat, 13, 0.074, z, { recv: false });
for (let z = 10; z < 21; z += 3.2) B(0.14, 0.016, 1.6, edgeMat, 13, 0.074, z, { recv: false });

/* 反光斑马线（主路 + 纵路） */
for (let i = 0; i < 10; i++) B(4, 0.016, 0.5, edgeMat, 4.2, 0.074, -2.3 + i * 1.18, { recv: false });
for (let i = 0; i < 10; i++) B(0.5, 0.016, 4, edgeMat, 7.9 + i * 1.18, 0.074, -5.6, { recv: false });

/* 停车位（纵路旁）+ 路锥 */
B(0.14, 0.016, 6.4, edgeMat, 7.45, 0.074, -14, { recv: false });
B(3, 0.016, 0.14, edgeMat, 8.8, 0.074, -17.15, { recv: false });
B(3, 0.016, 0.14, edgeMat, 8.8, 0.074, -10.85, { recv: false });
mk(new T.PlaneGeometry(0.85, 0.85).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: texP, transparent: true, fog: false }), 8.8, 0.08, -14, { recv: false, order: 3 });
Cy(0.02, 0.2, 0.5, M.cone, 9.7, 0.3, -10.3, { cast: true });
B(0.5, 0.05, 0.5, M.dark, 9.7, 0.025, -10.3, {});

/* 自行车停放区（店前转角人行道） */
(function bikeZone() {
  const x0 = 1.7, x1 = 6.7, z0 = -7.5, z1 = -3.5, y = 0.152;
  B(x1-x0, 0.012, 0.08, M.white, (x0+x1)/2, y, z0, { recv: false });
  B(x1-x0, 0.012, 0.08, M.white, (x0+x1)/2, y, z1, { recv: false });
  B(0.08, 0.012, z1-z0, M.white, x0, y, (z0+z1)/2, { recv: false });
  B(0.08, 0.012, z1-z0, M.white, x1, y, (z0+z1)/2, { recv: false });
  mk(new T.PlaneGeometry(0.8, 0.8).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: texBike, transparent: true, fog: false }), 2.25, y + 0.004, -4.1, { recv: false, order: 3 });
})();

/* 排水沟篦子 + 井盖 */
B(8, 0.03, 0.55, new T.MeshBasicMaterial({ map: texClone(texGrate, 12, 1) }), -15, 0.075, -2.5, { recv: false });
B(0.55, 0.03, 4.6, new T.MeshBasicMaterial({ map: texClone(texGrate, 1, 7) }), 7.45, 0.075, -5.6, { recv: false });
mk(new T.CircleGeometry(0.72, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: texManhole }), 12.8, 0.072, 2.6, { recv: false, order: 3 });

/* 积水路面 */
puddle(12.5, 1.5, 3.2, 2.1);
puddle(4.4, 5.9, 1.8, 1.1);
puddle(-13, 4.6, 2.6, 1.5);
puddle(-18.5, -1.2, 1.5, 0.9);
puddle(16, 14, 2.1, 1.4);
puddle(3.6, -4.6, 1.2, 0.8, 0.158);
puddle(-6.2, 18.6, 1.3, 0.8, 0.05);

/* ================= 便利店主体 ================= */
const store = new T.Group(); scene.add(store);
/* 后部实体 */
B(20.5, 6.9, 9.5, [
  M.wallCream, M.wallCream, M.wallCream, M.wallCream, M.innerWarm, M.wallCream
], -9.25, 3.45, -16.75, { cast: true, out: true });
/* 侧墙 */
B(0.9, 6.9, 13.5, [M.innerDark, M.wallCream, M.wallCream, M.wallCream, M.wallCream, M.wallCream], -19.05, 3.45, -14.75, { cast: true, out: true });
B(0.8, 6.9, 13.5, [M.wallCream, M.innerDark, M.wallCream, M.wallCream, M.wallCream, M.wallCream], 0.6, 3.45, -14.75, { cast: true });
/* 屋顶板 */
B(20.9, 0.28, 14.1, M.roof, -9.25, 7.02, -14.75, { cast: true, out: true });
/* 正面：裙楼 / 门柱 / 楣带 */
B(20.5, 0.95, 0.45, M.wallSkirt, -9.25, 0.475, -7.775, { cast: true });
B(0.6, 3.75, 0.45, M.wallCream, -9.4, 2.825, -7.775, { cast: true });
B(0.6, 3.75, 0.45, M.wallCream, -4.9, 2.825, -7.775, { cast: true });
B(0.8, 3.75, 0.45, M.wallCream, -18.325, 2.825, -7.775, { cast: true });
B(0.8, 3.75, 0.45, M.wallCream, -0.2, 2.825, -7.775, { cast: true });
B(20.5, 2.2, 0.45, M.header, -9.25, 5.8, -7.775, { cast: true, out: true });
/* 门框与自动门感应盒 */
B(0.18, 3.8, 0.5, M.frame, -9.15, 2.85, -7.75, {});
B(0.18, 3.8, 0.5, M.frame, -4.85, 2.85, -7.75, {});
B(4.5, 0.24, 0.5, M.frame, -7, 4.72, -7.75, {});
B(0.5, 0.16, 0.24, M.dark, -7, 4.94, -7.6, {});
mk(new T.SphereGeometry(0.045, 8, 8), new T.MeshBasicMaterial({ color: 0x53ff9a }), -7, 4.94, -7.46, {});
/* 营业时间牌 */
mk(new T.PlaneGeometry(1.5, 0.42), new T.MeshBasicMaterial({ map: shopSignTex('OPEN 24時間', '#123', '#ffd9a8') }), -7, 5.15, -7.52, { recv: false });

/* 橱窗玻璃 */
function glassPane(w, x) {
  return mk(new T.PlaneGeometry(w, 3.75), M.glass, x, 2.825, -7.92, { recv: false, order: 8 });
}
glassPane(8.35, -14.125);
glassPane(4.8, -2.2);
B(0.09, 3.75, 0.14, M.frame, -14.125, 2.825, -7.86, {});
B(0.09, 3.75, 0.14, M.frame, -2.2, 2.825, -7.86, {});
B(8.35, 0.07, 0.12, M.frame, -14.125, 3.6, -7.86, {});
B(4.8, 0.07, 0.12, M.frame, -2.2, 3.6, -7.86, {});
/* 橱窗贴纸海报 */
mk(new T.PlaneGeometry(0.8, 1.05), new T.MeshBasicMaterial({ map: texPosterB, transparent: true, fog: false }), -16.4, 2.7, -7.86, { recv: false });
mk(new T.PlaneGeometry(0.8, 1.05), new T.MeshBasicMaterial({ map: texPosterA, transparent: true, fog: false }), -11.8, 2.7, -7.86, { recv: false });

/* 自动门（双开玻璃门，动画） */
const doorL = new T.Group(), doorR = new T.Group();
doorL.position.set(-8.05, 0, -7.7); doorR.position.set(-5.95, 0, -7.7);
store.add(doorL); store.add(doorR);
function doorPanel(g) {
  const pane = new T.Mesh(new T.PlaneGeometry(2.06, 3.4), M.doorGlass);
  pane.position.y = 2.72; pane.renderOrder = 9;
  const top = new T.Mesh(new T.BoxGeometry(2.1, 0.28, 0.1), M.white); top.position.y = 4.52;
  const bot = new T.Mesh(new T.BoxGeometry(2.1, 0.36, 0.1), M.white); bot.position.y = 1.15;
  g.add(pane, top, bot);
}
doorPanel(doorL); doorPanel(doorR);

/* 店内 */
mk(new T.BoxGeometry(18.8, 0.12, 4.1), toon(0x6b5a48), -9.2, 0.06, -9.95, {});
/* 天花板 + 灯板 */
mk(new T.BoxGeometry(18.9, 0.16, 4.3), M.innerDark, -9.2, 4.72, -9.95, {});
[-15, -9, -3].forEach(x => {
  B(3, 0.06, 1, new T.MeshBasicMaterial({ color: 0xfff3d8 }), x, 4.62, -10.2, {});
  glow(x, 4.5, -10, 4.5, 2.2, 0xffe6b8, 0.12);
});
/* 货架 + 商品 */
const prodCols = [0xffd9a8, 0xa9d6ff, 0xffb3c6, 0xbdf0cd, 0xfff3bd, 0xd9c2ff, 0xffc9a3, 0xa9efe4];
const prodMats = prodCols.map(c => toon(c, { emissive: c, emissiveIntensity: 0.52 }));
function shelfUnit(x, z, w, parent) {
  const g = new T.Group(); g.position.set(x, 0, z); (parent || scene).add(g);
  B(w, 1.5, 0.1, M.shelf, 0, 0.75, -0.35, { parent: g });
  B(w, 0.12, 0.8, M.shelf, 0, 0.06, 0, { parent: g });
  [0.42, 0.86, 1.3].forEach((y, li) => {
    B(w, 0.05, 0.72, M.metal, 0, y, 0, { parent: g });
    for (let i = 0; i < Math.floor(w/0.42); i++) {
      const h = 0.2 + ((i*7+li*3) % 3) * 0.06;
      B(0.3, h, 0.3, prodMats[(i+li+Math.round(x)) % prodMats.length], -w/2+0.35+i*0.42, y+0.03+h/2, 0.05, { parent: g, recv: false, cast: false });
    }
  });
  return g;
}
shelfUnit(-14.5, -10.4, 4.4);
shelfUnit(-4.75, -10.4, 4.4);
shelfUnit(-17.3, -11.55, 3.2);
shelfUnit(-9.5, -11.55, 3.2);
/* 收银台 */
B(1.1, 1.0, 2.4, M.shelf, 0.35, 0.56, -9.4, {});
B(1.2, 0.08, 2.5, M.metalLight, 0.35, 1.1, -9.4, {});
B(0.4, 0.25, 0.35, M.dark, 0.35, 1.28, -9.9, {});
/* 冷柜 */
B(3, 2.4, 0.8, toon(0xc8d8e8), -2, 1.2, -11.5, {});
B(2.7, 1.9, 0.1, new T.MeshBasicMaterial({ color: 0xdaf2ff }), -2, 1.5, -11.05, {});
for (let i = 0; i < 8; i++) B(0.18, 0.3, 0.14, prodMats[i % prodMats.length], -3.1 + i*0.32, 1.62, -11.0, { recv: false });
/* 店内照明 */
const il1 = new T.PointLight(0xffd9a8, 1.4, 16, 1); il1.position.set(-14, 4.1, -10.6); scene.add(il1);
const il2 = new T.PointLight(0xffd9a8, 1.4, 16, 1); il2.position.set(-4.5, 4.1, -10.6); scene.add(il2);
const il3 = new T.PointLight(0xffe2b8, 0.9, 12, 1); il3.position.set(-9.3, 3.6, -9.2); scene.add(il3);

/* 雨棚 */
const awn = new T.Group(); store.add(awn);
mk(new T.BoxGeometry(19.3, 0.2, 2.75), toon(0x173744), -8.95, 4.55, -6.62, { rx: 0.19, cast: true, parent: awn, out: true });
const fascia = mk(new T.BoxGeometry(19.3, 0.58, 0.12), M.teal, -8.95, 4.22, -5.4, { rx: 0.19, cast: true, parent: awn, out: true });
const stripMat = new T.MeshBasicMaterial({ color: 0xff5f9e });
mk(new T.BoxGeometry(19.3, 0.09, 0.13), stripMat, -8.95, 3.86, -5.37, { rx: 0.19, parent: awn });
[[-17.6], [-8.95], [-0.4]].forEach(([x]) => {
  const a = new T.Vector3(x, 4.35, -5.5), b = new T.Vector3(x, 5.6, -7.6);
  tube(a, b, 0.045, M.frame, awn);
});

/* 主招牌（灯箱，会闪烁） */
const signBox = mk(new T.BoxGeometry(11, 1.7, 0.42), [
  M.dark, M.dark, M.dark, M.dark, signMat, M.dark
], -9.25, 6.15, -7.35, { cast: true, out: true });
const signGlowMat = glow(-9.25, 6.55, -7.3, 11, 3.4, 0x9fe8d8, 0.4).material;

/* 街角投影招牌 */
(function cornerSign() {
  Cy(0.07, 0.07, 3.4, M.frame, 1.9, 4.6, -6.9, { cast: true });
  tube(new T.Vector3(1.0, 5.2, -8.0), new T.Vector3(1.9, 5.9, -6.9), 0.05, M.frame);
  B(2.3, 1.3, 0.1, M.dark, 2.3, 5.85, -6.62, { ry: Math.PI / 4, cast: true, out: true });
  mk(new T.PlaneGeometry(2.14, 1.16), new T.MeshBasicMaterial({ map: texSignCorner }), 2.3, 5.85, -6.53, { ry: Math.PI / 4, recv: false });
  mk(new T.PlaneGeometry(2.14, 1.16), new T.MeshBasicMaterial({ map: texSignCorner }), 2.3, 5.85, -6.71, { ry: Math.PI / 4 + Math.PI, recv: false });
})();
glow(2.3, 5.85, -6.2, 3.6, 3.6, 0x7fd8ff, 0.3);

/* 路名牌（店侧墙） */
mk(new T.PlaneGeometry(1.5, 0.45), new T.MeshBasicMaterial({ map: texPlate }), 1.02, 3.1, -5.5, { ry: Math.PI / 2, recv: false });
/* 空调外机（店侧墙上 ×2 + 屋顶） */
function acUnit(x, y, z, ry) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; scene.add(g);
  B(1.0, 0.72, 0.45, M.metalLight, 0, 0, 0, { parent: g, cast: true, out: true });
  mk(new T.CircleGeometry(0.26, 18), M.dark, 0, 0, 0.24, { parent: g, recv: false });
  mk(new T.CircleGeometry(0.08, 12), M.metal, 0, 0, 0.25, { parent: g, recv: false });
  B(0.7, 0.1, 0.05, M.dark, 0, 0.28, 0.235, { parent: g });
  return g;
}
acUnit(1.32, 5.3, -12.5, -Math.PI / 2);
acUnit(1.32, 5.3, -16.2, -Math.PI / 2);
acUnit(-14, 7.6, -13, Math.PI);
/* 屋顶小物 */
Cy(0.16, 0.16, 0.8, M.metalLight, -4, 7.55, -12, { cast: true });
B(0.8, 0.5, 0.6, M.metal, -15.5, 7.4, -11, { cast: true });

/* 门口地垫 */
B(2.5, 0.05, 1.5, toon(0x2e4438), -7, 0.165, -6.35, {});
/* 雨伞架 + 伞 */
(function umbrellaStand() {
  const g = new T.Group(); g.position.set(-4.95, 0, -6.9); scene.add(g);
  B(0.72, 0.08, 0.72, M.frame, 0, 0.04, 0, { parent: g });
  B(0.72, 0.7, 0.05, M.frame, 0, 0.39, -0.34, { parent: g });
  B(0.72, 0.7, 0.05, M.frame, 0, 0.39, 0.34, { parent: g });
  B(0.05, 0.7, 0.72, M.frame, -0.34, 0.39, 0, { parent: g });
  B(0.05, 0.7, 0.72, M.frame, 0.34, 0.39, 0, { parent: g, out: true });
  [[0xd05038, -0.18, 0.12], [0x3a5aa8, 0.1, -0.1], [0xe8c040, 0.22, 0.15]].forEach(([c, dx, tilt]) => {
    Cy(0.045, 0.045, 1.15, toon(c), dx, 0.65, 0, { rz: tilt, parent: g, cast: true });
    Cy(0.075, 0.075, 0.14, toon(c), dx - Math.sin(tilt)*0.55, 1.22, 0, { rz: tilt, parent: g });
  });
})();
/* 暖帘小旗（随风轻摆） */
const noren = mk(new T.PlaneGeometry(0.62, 1.35), new T.MeshBasicMaterial({ map: texNoren, side: T.DoubleSide }), 0.5, 4.05, -5.62, { ry: 0.25, recv: false });
noren.geometry.translate(0, -0.675, 0);
noren.position.set(0.5, 4.32, -5.6);

/* ================= 街角道具 ================= */
/* 自动贩卖机 */
(function vending() {
  const g = new T.Group(); g.position.set(4.7, 0, -4.6); g.rotation.y = Math.PI / 4; scene.add(g);
  B(1.45, 2.05, 1.1, toon(0xdde3ec), 0, 1.03, 0, { parent: g, cast: true, out: true });
  mk(new T.PlaneGeometry(1.2, 1.6), new T.MeshBasicMaterial({ map: texVend }), 0, 1.18, 0.56, { parent: g, recv: false });
  B(1.25, 0.14, 0.06, M.dark, 0, 0.2, 0.55, { parent: g });
  B(0.4, 0.24, 0.08, toon(0xff8c3a, { emissive: 0xff8c3a, emissiveIntensity: 0.5 }), 0, 2.18, 0.5, { parent: g });
  B(0.24, 0.34, 0.05, M.dark, 0.5, 0.62, 0.56, { parent: g });
  glow(0, 1.3, 1.0, 2.4, 2.8, 0xbfe8ff, 0.35).position.set(4.7, 1.5, -3.75);
  const vl = new T.PointLight(0xbfe0ff, 0.6, 6, 1); vl.position.set(5.6, 1.4, -3.9); scene.add(vl);
})();
/* 自行车 */
(function bicycle() {
  const g = new T.Group(); g.position.set(2.6, 0.46, -5.0); g.rotation.y = 0.5; g.rotation.z = 0.06; scene.add(g);
  const tire = toon(0x1c2028);
  const wheelG = new T.TorusGeometry(0.42, 0.05, 10, 26);
  [-0.95, 0.95].forEach(x => {
    const w = mk(wheelG, tire, x, 0, 0, { ry: Math.PI / 2, parent: g, recv: false, out: 1.25 });
    Cy(0.09, 0.09, 0.06, M.metalLight, x, 0, 0, { rx: Math.PI / 2, parent: g, recv: false });
  });
  const fr = M.mint;
  tube(new T.Vector3(0, 0.02, 0), new T.Vector3(-0.28, 0.5, 0), 0.032, fr, g);
  tube(new T.Vector3(0, 0.02, 0), new T.Vector3(0.78, 0.5, 0), 0.032, fr, g);
  tube(new T.Vector3(-0.28, 0.5, 0), new T.Vector3(0.78, 0.5, 0), 0.032, fr, g);
  tube(new T.Vector3(0, 0.02, 0), new T.Vector3(-0.95, 0, 0), 0.026, fr, g);
  tube(new T.Vector3(-0.28, 0.5, 0), new T.Vector3(-0.95, 0, 0), 0.026, fr, g);
  tube(new T.Vector3(0.78, 0.5, 0), new T.Vector3(0.95, 0, 0), 0.026, fr, g);
  tube(new T.Vector3(0.78, 0.5, 0), new T.Vector3(0.86, 0.78, 0), 0.03, fr, g);
  const hb = tube(new T.Vector3(0.6, 0.82, 0), new T.Vector3(1.02, 0.82, 0), 0.03, M.frame, g);
  hb.rotation.z = 0;
  B(0.36, 0.07, 0.18, M.dark, -0.32, 0.56, 0, { parent: g, out: true });
  const basket = B(0.4, 0.28, 0.32, toon(0xb8a888), 1.0, 0.72, 0, { parent: g, out: true });
  basket.material = toon(0xb0a084);
  Cy(0.03, 0.03, 0.5, M.frame, 0.1, -0.22, 0, { rz: 0.5, parent: g });
})();
/* 垃圾桶 ×2 */
function bin(x, z, lidMat) {
  Cy(0.4, 0.34, 0.9, M.binBody, x, 0.47, z, { cast: true, out: true });
  Cy(0.42, 0.42, 0.12, lidMat, x, 0.97, z, { cast: true });
  Cy(0.44, 0.44, 0.05, M.dark, x, 0.03, z, {});
  B(0.3, 0.14, 0.02, M.metalLight, x, 0.62, z + 0.38, {});
}
bin(-20.6, -4.35, M.binGreen);
bin(-19.5, -4.35, M.binBlue);
/* 邮筒 */
(function postbox() {
  const g = new T.Group(); g.position.set(6.3, 0, -3.75); g.rotation.y = Math.PI / 4; scene.add(g);
  Cy(0.42, 0.42, 1.1, M.red, 0, 0.62, 0, { parent: g, cast: true, out: true });
  mk(new T.SphereGeometry(0.42, 16, 10, 0, Math.PI*2, 0, Math.PI/2), M.red, 0, 1.17, 0, { parent: g, cast: true });
  Cy(0.5, 0.5, 0.12, M.dark, 0, 0.06, 0, { parent: g });
  B(0.34, 0.06, 0.03, M.dark, 0, 0.92, 0.41, { parent: g });
})();

/* ================= 路灯 / 电线杆 / 护栏 ================= */
function streetLamp(x, z, dirX, dirZ) {
  const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
  Cy(0.09, 0.12, 5.3, M.poleGray, 0, 2.65, 0, { parent: g, cast: true });
  const head = new T.Vector3(dirX * 2.0, 5.15, dirZ * 2.0);
  tube(new T.Vector3(0, 5.2, 0), head, 0.06, M.poleGray, g);
  B(1.0, 0.2, 0.42, M.dark, head.x, head.y, head.z, { parent: g, cast: true });
  const ang = Math.atan2(dirX, dirZ);
  mk(new T.BoxGeometry(0.82, 0.05, 0.32).rotateX(0), new T.MeshBasicMaterial({ color: 0xffe6bd }), head.x, head.y - 0.13, head.z, { ry: ang + Math.PI / 2, parent: g });
  const wgl = glow(x + dirX*2.0, 5.0, z + dirZ*2.0, 3.2, 3.2, 0xffd9a3, 0.5);
  const pl = new T.PointLight(0xffd9a3, 1.1, 20, 1); pl.position.set(x + dirX*2.0, 4.8, z + dirZ*2.0); scene.add(pl);
  const cone = mk(new T.ConeGeometry(2.1, 4.9, 24, 1, true),
    new T.MeshBasicMaterial({ color: 0xffd9a3, transparent: true, opacity: 0.05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }),
    x + dirX*2.0, 2.6, z + dirZ*2.0, { recv: false });
  cone.renderOrder = 5;
  return { g, wgl, pl };
}
streetLamp(4.5, 11.6, 0, -1);      // 对街，照亮斑马线
streetLamp(20.55, 4.5, -1, 0);     // 右侧路，照亮路口
streetLamp(-20.55, 11.6, 1, 0.1);  // 巷口

/* 电线杆 ×2 + 电线 */
function pole(x, z) {
  const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
  Cy(0.15, 0.19, 7.2, M.poleWood, 0, 3.6, 0, { parent: g, cast: true, seg: 12 });
  Cy(0.17, 0.17, 0.1, M.dark, 0, 7.25, 0, { parent: g });
  B(1.7, 0.13, 0.13, M.poleWood, 0, 6.35, 0, { parent: g, cast: true });
  [-0.65, 0, 0.65].forEach(dx => Cy(0.04, 0.04, 0.18, toon(0xd8e2f0), dx, 6.5, 0, { parent: g }));
  return g;
}
const pole1 = pole(20.4, -14.5);
const pole2 = pole(20.4, 13.5);
/* 变压器 */
Cy(0.3, 0.3, 0.85, toon(0x3d4456), 20.05, 4.7, -14.5, { cast: true });
B(0.1, 0.6, 0.5, M.metal, 19.75, 4.7, -14.5, {});
function wire(a, c, sag) {
  const mid = new T.Vector3().addVectors(a, c).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new T.QuadraticBezierCurve3(a, mid, c);
  const m = mk(new T.TubeGeometry(curve, 22, 0.028, 5), toon(0x171a22), 0, 0, 0, { recv: false, cast: false });
  return m;
}
[-0.65, 0, 0.65].forEach(dx => {
  wire(new T.Vector3(20.4+dx, 6.5, -14.5), new T.Vector3(20.4+dx, 6.5, 13.5), 0.9);
});
wire(new T.Vector3(20.4, 5.0, -14.5), new T.Vector3(1.1, 5.1, -12.5), 1.6);   // 进店线
wire(new T.Vector3(20.4, 6.6, 13.5), new T.Vector3(2.2, 6.5, -7.4), 2.3);     // 跨路口长线
/* 路口凸面镜（杆2上） */
(function mirror() {
  Cy(0.03, 0.03, 0.7, M.frame, 20.05, 2.85, 13.0, { rz: 0.6, seg: 8 });
  const m = mk(new T.CircleGeometry(0.42, 22), new T.MeshBasicMaterial({ color: 0x9fd8ff }), 19.75, 2.75, 12.7, { recv: false });
  m.lookAt(13, 2.75, 3);
  const rim = mk(new T.TorusGeometry(0.44, 0.05, 8, 22), M.orange, 19.75, 2.75, 12.7, { recv: false });
  rim.lookAt(13, 2.75, 3);
  glow(19.75, 2.75, 12.7, 1.4, 1.4, 0xaad8ff, 0.18);
})();
/* 停车 P 牌（杆2上） */
mk(new T.PlaneGeometry(0.5, 0.5), new T.MeshBasicMaterial({ map: texP, transparent: true, fog: false }), 20.4, 2.0, 13.5, { ry: -Math.PI / 2, recv: false });
/* 护栏 */
(function guardrail() {
  const g = new T.Group(); scene.add(g);
  for (let i = 0; i < 5; i++) Cy(0.05, 0.05, 0.8, M.rail, 19.35, 0.4, 10.3 + i * 1.85, { parent: g, cast: true, seg: 10 });
  B(7.4, 0.08, 0.06, M.rail, 19.35, 0.62, 14, { parent: g });
  B(7.4, 0.08, 0.06, M.rail, 19.35, 0.32, 14, { parent: g });
})();
/* 注意行人标志 */
(function warnSign() {
  Cy(0.04, 0.04, 2.6, M.poleGray, 1.9, 1.3, 11.5, { cast: true, seg: 10 });
  mk(new T.PlaneGeometry(0.78, 0.78), new T.MeshBasicMaterial({ map: texWarn, transparent: true, fog: false }), 1.9, 2.35, 11.5, { ry: Math.PI, recv: false });
  mk(new T.PlaneGeometry(0.78, 0.78), new T.MeshBasicMaterial({ map: texWarn, transparent: true, fog: false }), 1.9, 2.35, 11.5, { recv: false });
})();

/* ================= 对街建筑 / 小巷 ================= */
(function bgBuilding1() {
  const mats = [M.brick, M.brick, M.roof, M.brick,
    new T.MeshToonMaterial({ map: facA.map, emissiveMap: facA.emis, emissive: 0xffffff, emissiveIntensity: 0.75, gradientMap: gradMap }),
    M.brick];
  mk(new T.BoxGeometry(13, 10.2, 8.6), mats, -15.5, 5.1, 17.3, { cast: true, out: true });
  B(13.3, 0.35, 8.9, M.roof, -15.5, 10.35, 17.3, {});
  /* 屋顶水塔 */
  Cy(0.8, 0.8, 1.4, toon(0x4a4640), -18.5, 11.2, 17.5, { cast: true });
  Cy(0.5, 0.5, 0.5, toon(0x3a3630), -18.5, 10.4, 17.5, { cast: true });
  /* 天线 */
  Cy(0.03, 0.03, 2.6, M.metal, -12.5, 11.8, 16.5, { cast: true, seg: 6 });
  B(0.9, 0.04, 0.04, M.metal, -12.5, 12.8, 16.5, {});
  /* 墙上招牌 */
  mk(new T.PlaneGeometry(2.4, 0.6), new T.MeshBasicMaterial({ map: texShopB }), -13.5, 2.2, 12.95, { recv: false });
  /* 巷内墙空调外机 */
  acUnit(-8.75, 5.0, 16.5, -Math.PI / 2);
})();
(function bgBuilding2() {
  const mats = [toon(0x363a50), toon(0x363a50), M.roof, toon(0x363a50),
    new T.MeshToonMaterial({ map: facB.map, emissiveMap: facB.emis, emissive: 0xffffff, emissiveIntensity: 0.75, gradientMap: gradMap }),
    toon(0x454a62)];
  mk(new T.BoxGeometry(10, 7.8, 6.8), mats, 2, 3.9, 16.4, { cast: true, out: true });
  B(10.3, 0.3, 7.1, M.roof, 2, 7.95, 16.4, {});
  mk(new T.PlaneGeometry(2.8, 0.7), new T.MeshBasicMaterial({ map: texShopA }), 2.5, 2.4, 12.96, { recv: false });
  Cy(0.02, 0.02, 2.0, M.metal, 5.5, 9.0, 15.0, { seg: 6 });
})();

/* 小巷入口 */
let bulbMat, bulbGlow, bulbLight; /* 巷内悬挂灯泡（动画中呼吸明暗） */
(function alley() {
  mk(new T.PlaneGeometry(6, 9).rotateX(-Math.PI / 2), toon(0x141824), -6, 0.02, 17.5, {});
  mk(new T.PlaneGeometry(6, 9), toon(0x191d2a), -6, 4.5, 21.85, { ry: Math.PI, recv: false });
  mk(new T.PlaneGeometry(9, 9), toon(0x1a1e2c), -8.95, 4.5, 17.5, { ry: Math.PI / 2, recv: false });
  mk(new T.PlaneGeometry(9, 7.6), toon(0x1a1e2c), -3.05, 3.8, 17.5, { ry: -Math.PI / 2, recv: false });
  /* 台阶 */
  B(5.6, 0.14, 0.6, toon(0x2a3040), -6, 0.07, 13.8, {});
  B(5.6, 0.14, 0.6, toon(0x252b3a), -6, 0.21, 14.3, {});
  /* 墙上管道 */
  Cy(0.07, 0.07, 8.4, M.metal, -8.6, 6.4, 17.6, { rz: Math.PI / 2, seg: 10 });
  Cy(0.05, 0.05, 8.4, M.metal, -8.6, 5.6, 17.6, { rz: Math.PI / 2, seg: 10 });
  /* 巷内小门 */
  B(1.0, 2.1, 0.1, toon(0x24222e), -7.6, 1.15, 21.7, {});
  /* 悬挂灯泡 */
  tube(new T.Vector3(-8.9, 5.4, 19.2), new T.Vector3(-6.2, 4.4, 19.2), 0.02, M.dark);
  bulbMat = new T.MeshBasicMaterial({ color: 0xffd9a0 });
  mk(new T.SphereGeometry(0.1, 10, 8), bulbMat, -6.2, 4.3, 19.2, {});
  bulbGlow = glow(-6.2, 4.3, 19.2, 2.2, 2.2, 0xffc98a, 0.5);
  bulbLight = new T.PointLight(0xffc98a, 0.5, 8, 1); bulbLight.position.set(-6.2, 4.0, 19.2); scene.add(bulbLight);
  /* 居酒屋竖招牌 */
  mk(new T.PlaneGeometry(0.9, 2.3), new T.MeshBasicMaterial({ map: texIzakaya }), -3.1, 4.3, 15.2, { ry: -Math.PI / 2, recv: false });
  glow(-3.3, 4.3, 15.2, 1.8, 3.4, 0xff8ab0, 0.25);
  /* 巷内垃圾桶 */
  B(1.1, 1.0, 0.8, toon(0x2c4438), -7.8, 0.5, 17.5, { cast: true, out: true });
  B(1.15, 0.1, 0.85, toon(0x243830), -7.8, 1.05, 17.5, {});
  /* 巷口反光 */
  streak(-6, 16.8, 0, -1, 3.2, 1.1, 0xffc98a, 0.1, 0.06);
})();

/* 公告栏 */
(function bulletin() {
  const g = new T.Group(); g.position.set(-13.8, 0, 11.7); g.rotation.y = Math.PI; scene.add(g);
  Cy(0.05, 0.05, 0.9, M.frame, -0.85, 0.45, 0, { parent: g, seg: 8 });
  Cy(0.05, 0.05, 0.9, M.frame, 0.85, 0.45, 0, { parent: g, seg: 8 });
  B(2.1, 1.5, 0.2, toon(0x3a3f50), 0, 1.85, 0, { parent: g, cast: true, out: true });
  mk(new T.PlaneGeometry(1.85, 1.25), toon(0x6b5a44), 0, 1.85, 0.115, { parent: g, recv: false });
  mk(new T.PlaneGeometry(0.62, 0.82), new T.MeshBasicMaterial({ map: texPosterA, fog: false }), -0.58, 1.95, 0.13, { parent: g, recv: false });
  mk(new T.PlaneGeometry(0.62, 0.82), new T.MeshBasicMaterial({ map: texPosterC, fog: false }), 0.06, 1.9, 0.13, { parent: g, recv: false });
  mk(new T.PlaneGeometry(0.55, 0.72), new T.MeshBasicMaterial({ map: texPosterB, fog: false }), 0.63, 1.78, 0.13, { parent: g, recv: false });
  B(2.3, 0.09, 0.45, M.teal, 0, 2.66, 0, { parent: g, cast: true });
})();

/* 树木 */
function tree(x, z, s) {
  const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
  Cy(0.11*s, 0.16*s, 1.7*s, M.trunk, 0, 0.85*s, 0, { parent: g, cast: true });
  [[0, 2.3, 0, 1.15], [0.55, 1.95, 0.3, 0.8], [-0.5, 2.0, -0.25, 0.75]].forEach(([dx, dy, dz, r]) => {
    mk(new T.SphereGeometry(r*s, 14, 10), M.leaf, dx*s, dy*s, dz*s, { sy: 0.82, parent: g, cast: true, out: true });
  });
}
tree(-18.3, 11.0, 1.0);
tree(-5.0, 11.2, 0.85);
tree(20.7, 19.8, 0.95);

/* ================= 湿路反光光带 ================= */
streak(4.4, 5.0, 0.1, 1, 6.5, 0.8, 0xffe2b0, 0.13);          // 路灯A
streak(14.6, 4.5, -1, 0.12, 6.0, 0.8, 0xffe2b0, 0.12);       // 路灯B
streak(-17.6, 11.7, 1, 0.15, 4.2, 0.7, 0xffe2b0, 0.09, 0.175); // 路灯C
streak(-7, 1.4, 0, 1, 8.0, 3.6, 0xffcf9e, 0.07);             // 店门口暖光
streak(-9.3, -0.2, 0, 1, 5.5, 1.8, 0x59e8d0, 0.06);          // 招牌青光
streak(6.4, -3.2, 0.72, 0.7, 3.4, 1.0, 0xbfe4ff, 0.11);      // 贩卖机
streak(11.8, 0.6, 0.18, 1, 5.2, 1.2, 0xff9ec4, 0.07);        // 路口粉光
streak(13.6, 1.4, 0.22, 1, 5.6, 1.3, 0x7fe0ff, 0.07);        // 路口青光
/* 门前景象暖光斑 */
const spillMat = new T.MeshBasicMaterial({ map: texGlow, color: 0xffcf9e, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, fog: false });
const spill = mk(new T.PlaneGeometry(6, 4.4).rotateX(-Math.PI / 2), spillMat, -7, 0.09, -5.4, { recv: false, order: 5 });
glow(-13, 3.0, -6.6, 11, 5, 0xffddb0, 0.13);   // 橱窗整体光晕
glow(-7, 1.8, -5.6, 5.5, 3.5, 0xffd9a8, 0.2);  // 门洞光

/* ================= 雨 ================= */
const RN = 1300, WIND = 1.7;
const rainPos = new Float32Array(RN * 6);
const rainSpd = new Float32Array(RN), rainLen = new Float32Array(RN);
const rainX = new Float32Array(RN), rainY = new Float32Array(RN), rainZ = new Float32Array(RN);
for (let i = 0; i < RN; i++) {
  rainX[i] = Math.random() * 52 - 26; rainY[i] = Math.random() * 30; rainZ[i] = Math.random() * 52 - 26;
  rainSpd[i] = 21 + Math.random() * 13; rainLen[i] = 0.7 + Math.random() * 0.95;
}
const rainGeo = new T.BufferGeometry();
rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: 0xa9bfe8, transparent: true, opacity: 0.3, depthWrite: false, fog: false }));
rain.frustumCulled = false; rain.renderOrder = 20;
scene.add(rain);
function updateRain(dt) {
  for (let i = 0; i < RN; i++) {
    rainY[i] -= rainSpd[i] * dt;
    rainX[i] += WIND * dt;
    if (rainY[i] < 0.2) { rainY[i] = 26 + Math.random() * 9; rainX[i] = Math.random() * 52 - 26; rainZ[i] = Math.random() * 52 - 26; }
    const o = i * 6, dx = WIND * rainLen[i] / rainSpd[i];
    rainPos[o] = rainX[i]; rainPos[o+1] = rainY[i]; rainPos[o+2] = rainZ[i];
    rainPos[o+3] = rainX[i] - dx; rainPos[o+4] = rainY[i] + rainLen[i]; rainPos[o+5] = rainZ[i];
  }
  rainGeo.attributes.position.needsUpdate = true;
}
/* 地面涟漪 */
const ripGeo = new T.RingGeometry(0.5, 0.62, 24); ripGeo.rotateX(-Math.PI / 2);
const ripPool = [];
for (let i = 0; i < 46; i++) {
  const m = new T.Mesh(ripGeo, new T.MeshBasicMaterial({ color: 0xaecdff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  m.visible = false; m.renderOrder = 7; scene.add(m);
  ripPool.push({ m, t: -1 });
}
const zones = [
  { x0: -21.5, x1: 6.5, z0: -2.6, z1: 8.6, y: 0.1, w: 3 },
  { x0: 7.4, x1: 18.6, z0: -2.6, z1: 8.6, y: 0.1, w: 2 },
  { x0: 7.4, x1: 18.6, z0: -21, z1: -3.4, y: 0.1, w: 1.6 },
  { x0: 7.4, x1: 18.6, z0: 9.4, z1: 21, y: 0.1, w: 1 },
  { x0: -21.5, x1: 6.5, z0: -7.5, z1: -3.5, y: 0.185, w: 1.2 },
  { x0: -21.5, x1: 6.5, z0: 9.5, z1: 12.6, y: 0.185, w: 1 },
  { x0: 19.3, x1: 21.7, z0: -21, z1: 21, y: 0.185, w: 0.8 }
];
const zoneW = zones.reduce((a, z) => a + z.w, 0);
let ripAcc = 0;
function updateRipples(dt) {
  ripAcc += dt * 24;
  while (ripAcc > 1) {
    ripAcc -= 1;
    const r = ripPool.find(p => p.t < 0);
    if (!r) break;
    let pick = Math.random() * zoneW;
    const z = zones.find(zz => (pick -= zz.w) < 0) || zones[0];
    r.m.position.set(z.x0 + Math.random() * (z.x1 - z.x0), z.y, z.z0 + Math.random() * (z.z1 - z.z0));
    r.t = 0; r.m.visible = true;
  }
  ripPool.forEach(p => {
    if (p.t < 0) return;
    p.t += dt;
    const k = p.t / 0.8;
    if (k >= 1) { p.t = -1; p.m.visible = false; return; }
    p.m.scale.setScalar(0.25 + 1.5 * k);
    p.m.material.opacity = (1 - k) * 0.42;
  });
}
/* 雨棚滴水 */
const DN = 16;
const dripPos = new Float32Array(DN * 3), dripY = new Float32Array(DN), dripX = new Float32Array(DN);
for (let i = 0; i < DN; i++) {
  dripX[i] = -18 + Math.random() * 18.3;
  dripY[i] = 3.9 - Math.random() * 3.9;
}
const dripGeo = new T.BufferGeometry();
dripGeo.setAttribute('position', new T.BufferAttribute(dripPos, 3));
const drips = new T.Points(dripGeo, new T.PointsMaterial({ size: 0.13, map: texDrop, color: 0xbcd4ff, transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
drips.frustumCulled = false; drips.renderOrder = 19;
scene.add(drips);
function updateDrips(dt) {
  for (let i = 0; i < DN; i++) {
    dripY[i] -= 8.5 * dt;
    if (dripY[i] < 0.12) { dripY[i] = 3.85 + Math.random() * 0.2; dripX[i] = -18 + Math.random() * 18.3; }
    dripPos[i*3] = dripX[i]; dripPos[i*3+1] = dripY[i]; dripPos[i*3+2] = -5.38;
  }
  dripGeo.attributes.position.needsUpdate = true;
}

/* ---------------- 动画 ---------------- */
const clock = new T.Clock();
let doorClock = Math.random() * 10;
let flickWait = 2.5 + Math.random() * 4, flickT = 0;
const ease = x => x * x * (3 - 2 * x);
function doorK(t) {
  if (t < 4.2 || t >= 9.7) return 0;
  if (t < 5.2) return ease((t - 4.2) / 1.0);
  if (t < 8.6) return 1;
  return 1 - ease((t - 8.6) / 1.0);
}
const doorLight = new T.PointLight(0xffd2a0, 0.6, 8, 1);
doorLight.position.set(-7, 2.2, -6.2); scene.add(doorLight);
const pinkBase = new T.Color(0xff5f9e);

/* 首帧同步渲染（保证任何环境下画面立即可见） */
camera.position.set(
  orb.ctx + orb.cr * Math.sin(orb.cph) * Math.sin(orb.cth),
  orb.cty + orb.cr * Math.cos(orb.cph),
  orb.ctz + orb.cr * Math.sin(orb.cph) * Math.cos(orb.cth)
);
camera.lookAt(orb.ctx, orb.cty, orb.ctz);
renderer.render(scene, camera);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  /* 控制器阻尼 */
  const s = 1 - Math.exp(-9 * dt);
  orb.cth += (orb.th - orb.cth) * s; orb.cph += (orb.ph - orb.cph) * s; orb.cr += (orb.r - orb.cr) * s;
  orb.ctx += (orb.tx - orb.ctx) * s; orb.cty += (orb.ty - orb.cty) * s; orb.ctz += (orb.tz - orb.ctz) * s;
  camera.position.set(
    orb.ctx + orb.cr * Math.sin(orb.cph) * Math.sin(orb.cth),
    orb.cty + orb.cr * Math.cos(orb.cph),
    orb.ctz + orb.cr * Math.sin(orb.cph) * Math.cos(orb.cth)
  );
  camera.lookAt(orb.ctx, orb.cty, orb.ctz);

  /* 自动门 */
  doorClock = (doorClock + dt) % 10;
  const dk = doorK(doorClock);
  doorL.position.x = -8.05 - 1.55 * dk;
  doorR.position.x = -5.95 + 1.55 * dk;
  doorLight.intensity = 0.55 + 0.55 * dk;
  spillMat.opacity = 0.11 + 0.09 * dk;

  /* 招牌闪烁 */
  flickWait -= dt;
  if (flickWait <= 0) { flickT = 0.34; flickWait = 3.5 + Math.random() * 6; }
  let f = 1;
  if (flickT > 0) { flickT -= dt; f = Math.random() < 0.45 ? 0.35 : 0.9; }
  signMat.color.setScalar(f);
  signGlowMat.opacity = 0.45 * f;

  /* 氛围脉动 */
  stripMat.color.copy(pinkBase).multiplyScalar(0.78 + 0.22 * Math.sin(t * 2.2));
  bulbMat.color.setScalar(0.85 + 0.15 * Math.sin(t * 3.1 + 1));
  bulbLight.intensity = 0.42 + 0.14 * Math.sin(t * 3.1 + 1);
  bulbGlow.material.opacity = 0.4 + 0.12 * Math.sin(t * 3.1 + 1);
  noren.rotation.z = Math.sin(t * 1.1) * 0.05;
  shimmers.forEach(o => { o.mat.opacity = o.base * (0.86 + 0.14 * Math.sin(t * 1.3 + o.ph)); });

  updateRain(dt);
  updateRipples(dt);
  updateDrips(dt);
  checkSize();

  renderer.render(scene, camera);
}
animate();
})();
