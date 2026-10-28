/* ============================================================
 * MTW render/effects.js
 * 残骸 / 特效（muzzle / explosion / tracer / hit / smoke / text）
 * 依赖：constants / geometry / state / canvas
 * ============================================================ */
'use strict';

/* ---------- 残骸 ---------- */
function spawnWreck(u) {
  if (!['ARM','IFV','APC','NAV','HELI'].includes(u.def.cat)) return;
  if (G.wrecks.find(w => w.c === u.c && w.r === u.r)) return;
  G.wrecks.push({c: u.c, r: u.r, def: u.def, side: u.side, age: 0, hp: 50});
  addEffect('explosion', u.c, u.r, {dur: 40, size: 1.6, color: '#ff6a20'});
  addEffect('smoke', u.c, u.r, {dur: 120, color: '#555'});
}

/* ---------- 特效添加 ---------- */
function addEffect(type, c, r, opts) {
  opts = opts || {};
  G.effects.push({
    type, c, r, t: 0,
    dur: opts.dur || 20,
    color: opts.color || '#ff9020',
    size: opts.size || 1,
    text: opts.text || '',
    ox: opts.ox || 0,
    oy: opts.oy || 0
  });
  if (G.effects.length > 200) G.effects.shift();
}

/* ---------- 特效推进（每帧） ---------- */
function updateEffects() {
  for (let i = G.effects.length - 1; i >= 0; i--) {
    const e = G.effects[i];
    e.t++;
    if (e.t >= e.dur) G.effects.splice(i, 1);
  }
  for (let i = G.wrecks.length - 1; i >= 0; i--) {
    G.wrecks[i].age++;
    if (G.wrecks[i].age > 200) G.wrecks.splice(i, 1);
  }
}

/* ---------- 特效渲染 ---------- */
function renderEffects() {
  const hs = HS * G.cam.z;
  G.effects.forEach(e => {
    const wc = hexCenter(e.c, e.r, HS);
    const sc = worldToScreen(wc.x + (e.ox || 0) * hs, wc.y + (e.oy || 0) * hs);
    const p = e.t / e.dur;
    ctx.save();

    if (e.type === 'explosion') {
      const r1 = hs * e.size * (0.4 + p * 1.5), a1 = 1 - p;
      const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, r1);
      g.addColorStop(0, `rgba(255,240,180,${a1})`);
      g.addColorStop(0.4, `rgba(255,140,40,${a1 * 0.9})`);
      g.addColorStop(1, `rgba(120,20,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, r1, 0, Math.PI * 2); ctx.fill();
      if (p < 0.3) {
        ctx.fillStyle = `rgba(255,255,255,${1 - p / 0.3})`;
        ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.4 * (1 - p / 0.3), 0, Math.PI * 2); ctx.fill();
      }
    }
    else if (e.type === 'muzzle') {
      const a = 1 - p, r2 = hs * 0.4 * (1 - p * 0.5);
      ctx.fillStyle = `rgba(255,230,120,${a})`;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, r2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,220,100,${a * 0.8})`;
      ctx.lineWidth = 2 * (1 - p);
      for (let i = 0; i < 4; i++) {
        const ang = i * Math.PI / 2 + p * 0.5;
        ctx.beginPath(); ctx.moveTo(sc.x, sc.y);
        ctx.lineTo(sc.x + Math.cos(ang) * hs * 1.2, sc.y + Math.sin(ang) * hs * 1.2);
        ctx.stroke();
      }
    }
    else if (e.type === 'tracer') {
      const A = hexCenter(e.c - (e.ox || 0), e.r - (e.oy || 0), HS);
      const B = hexCenter(e.c, e.r, HS);
      const sa = worldToScreen(A.x, A.y);
      const sb = worldToScreen(B.x, B.y);
      const head = Math.min(1, p * 1.7);
      const tail = Math.max(0, p * 1.7 - 0.4);
      const hx = sa.x + (sb.x - sa.x) * head;
      const hy = sa.y + (sb.y - sa.y) * head;
      const tx = sa.x + (sb.x - sa.x) * tail;
      const ty = sa.y + (sb.y - sa.y) * tail;
      const alpha = 1 - p;
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, 'rgba(255,180,60,0)');
      grad.addColorStop(1, `rgba(255,240,150,${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.5, 3 * G.cam.z) * (1 - p * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,220,${alpha})`;
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(1.5, 2.5 * G.cam.z), 0, Math.PI * 2);
      ctx.fill();
    }
    else if (e.type === 'hit') {
      const a = 1 - p;
      ctx.fillStyle = `rgba(255,80,40,${a})`;
      for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI / 3 + p * 2, d = hs * 0.3 + p * hs * 0.8;
        ctx.beginPath();
        ctx.arc(sc.x + Math.cos(ang) * d, sc.y + Math.sin(ang) * d, hs * 0.08 * (1 - p), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (e.type === 'smoke') {
      const a = (1 - p) * 0.6;
      ctx.fillStyle = `rgba(80,80,80,${a})`;
      for (let i = 0; i < 3; i++) {
        const px = sc.x + (i - 1) * hs * 0.35, py = sc.y - p * hs * 2 - i * hs * 0.2;
        ctx.beginPath(); ctx.arc(px, py, hs * 0.35 * (0.5 + p), 0, Math.PI * 2); ctx.fill();
      }
    }
    else if (e.type === 'dust') {
      const a = (1 - p) * 0.5;
      ctx.fillStyle = `rgba(180,160,120,${a})`;
      for (let i = 0; i < 4; i++) {
        const ang = i * Math.PI / 2, d = p * hs * 0.9;
        ctx.beginPath();
        ctx.arc(sc.x + Math.cos(ang) * d, sc.y + Math.sin(ang) * d, hs * 0.15 * (1 - p * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (e.type === 'text') {
      const a = 1 - p;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.font = `bold ${Math.max(10, hs * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = `rgba(0,0,0,${a})`;
      ctx.lineWidth = 3;
      ctx.strokeText(e.text, sc.x, sc.y - p * hs * 1.5);
      ctx.fillText(e.text, sc.x, sc.y - p * hs * 1.5);
    }

    ctx.restore();
  });
}

/* ---------- 残骸渲染 ---------- */
function renderWrecks() {
  const hs = HS * G.cam.z;
  G.wrecks.forEach(w => {
    const wc = hexCenter(w.c, w.r, HS);
    const sc = worldToScreen(wc.x, wc.y);
    const fade = w.age > 150 ? 1 - (w.age - 150) / 50 : 1;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(30,25,20,0.85)';
    hexPath(ctx, sc.x, sc.y, hs * 0.85);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,30,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(20,15,10,0.6)';
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.55, 0, Math.PI * 2); ctx.fill();

    const sym = CAT_SYM[w.def.cat] || '?';
    ctx.fillStyle = 'rgba(90,70,50,0.8)';
    ctx.font = `bold ${Math.max(10, hs * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sym, sc.x, sc.y + 1);

    ctx.strokeStyle = 'rgba(150,60,40,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sc.x - hs * 0.5, sc.y - hs * 0.4);
    ctx.lineTo(sc.x + hs * 0.5, sc.y + hs * 0.4);
    ctx.stroke();

    if (w.age < 150 && w.age % 8 === 0) addEffect('smoke', w.c, w.r, {dur: 60, color: '#444'});

    ctx.restore();
  });
}