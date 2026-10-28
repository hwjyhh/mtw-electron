/* ============================================================
 * MTW render/overlays.js
 * 所有叠加层：观察范围 / EW覆盖 / 反炮兵标记 / 移动范围 / 悬停格 / 路径 / LOS预览
 *               雷达扫描 / 导弹 / NEZ / 选择框 / 多选 / 探测条 / 战斗群包围圈
 * 依赖：constants / geometry / state / canvas / radar / missiles / movement / visibility
 * ============================================================ */
'use strict';

/* ---------- 观察范围（G.opt.obs） ---------- */
function renderObsRange() {
  const hs = HS * G.cam.z;
  ctx.save();
  G.units.forEach(obs => {
    if (obs.dead || obs.side !== G.side || obs.carriedBy) return;
    const sr = sensorRange(obs);
    const visited = new Set();
    const queue = [{c: obs.c, r: obs.r, d: 0}];
    visited.add(obs.c + ',' + obs.r);

    while (queue.length) {
      const cur = queue.shift();
      const wc = hexCenter(cur.c, cur.r, HS);
      const sc = worldToScreen(wc.x, wc.y);
      hexPath(ctx, sc.x, sc.y, hs * 0.95);
      ctx.fillStyle = 'rgba(120,220,255,0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,220,255,0.30)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (cur.d >= sr) continue;

      for (const nb of hexNeighbors(cur.c, cur.r)) {
        if (!inBounds(nb.c, nb.r)) continue;
        const k = nb.c + ',' + nb.r;
        if (visited.has(k)) continue;
        visited.add(k);
        if (!hasLOS({c: obs.c, r: obs.r}, nb)) continue;
        queue.push({c: nb.c, r: nb.r, d: cur.d + 1});
      }
    }
  });
  ctx.restore();
}

/* ---------- 电子战覆盖（干扰源范围） ---------- */
function renderEWCoverage() {
  const hs = HS * G.cam.z;
  ctx.save();
  G.units.forEach(u => {
    if (u.dead || u.def.ew.jam <= 0) return;
    if (!isVisible(u, G.side)) return;

    const wc = hexCenter(u.c, u.r, HS);
    const sc = worldToScreen(wc.x, wc.y);
    const range = (5 + u.def.ew.jam * 0.5) * HS * G.cam.z;
    const col = u.side === 0 ? '120,160,255' : '255,120,255';

    const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, range);
    g.addColorStop(0, `rgba(${col},0.25)`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, range, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(${col},0.4)`;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, range, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.restore();
}

/* ---------- 反炮兵标记（虚线圆） ---------- */
function renderCounterBatteryMarks() {
  const hs = HS * G.cam.z;
  G.counterBattery.forEach(cb => {
    const age = G.turn - cb.markTurn;
    if (age >= 3) return;
    const wc = hexCenter(cb.c, cb.r, HS);
    const sc = worldToScreen(wc.x, wc.y);

    ctx.save();
    ctx.strokeStyle = `rgba(255,159,90,${0.6 - age * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * cb.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,159,90,${0.15 - age * 0.05})`;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * cb.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

/* ---------- 选中单位的移动范围 + 传感器/武器圈 ---------- */
function renderSelectedUnitRange() {
  if (!G.sel || G.sel.dead || G.sel.carriedBy) return;
  const u = G.sel;
  const hs = HS * G.cam.z;

  // 移动范围
  if ((G.mode === 'move' || G.mode === 'select' || G.mode === 'attackMove') && !u.moving) {
    const reach = reachableCells(u, u.mp);
    ctx.save();
    ctx.fillStyle = u.side === 0 ? 'rgba(74,144,217,0.20)' : 'rgba(217,83,79,0.20)';
    reach.forEach(v => {
      if (v.c === u.c && v.r === u.r) return;
      const wc = hexCenter(v.c, v.r, HS);
      const sc = worldToScreen(wc.x, wc.y);
      hexPath(ctx, sc.x, sc.y, hs * 0.96);
      ctx.fill();
    });
    ctx.strokeStyle = u.side === 0 ? 'rgba(74,144,217,0.55)' : 'rgba(217,83,79,0.55)';
    ctx.lineWidth = 1;
    reach.forEach(v => {
      if (v.c === u.c && v.r === u.r) return;
      const wc = hexCenter(v.c, v.r, HS);
      const sc = worldToScreen(wc.x, wc.y);
      hexPath(ctx, sc.x, sc.y, hs * 0.96);
      ctx.stroke();
    });
    ctx.restore();
  }

  // 传感器 / 武器圈
  if (G.opt.range) {
    const sr = sensorRange(u);
    ctx.save();
    const wc = hexCenter(u.c, u.r, HS);
    const sc = worldToScreen(wc.x, wc.y);

    ctx.strokeStyle = 'rgba(120,220,160,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, sr * HS * SQ3 * G.cam.z * 0.92, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    const maxR = Math.max(...u.def.weapons.map(w => w.r), 0);
    if (maxR > 0) {
      ctx.strokeStyle = 'rgba(230,160,80,0.4)';
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, maxR * HS * SQ3 * G.cam.z * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // 选中框
  const wc = hexCenter(u.c, u.r, HS);
  const sc = worldToScreen(wc.x, wc.y);
  ctx.save();
  ctx.strokeStyle = '#f0b72f';
  ctx.lineWidth = 2.5;
  hexPath(ctx, sc.x, sc.y, hs * 0.95);
  ctx.stroke();
  if (G.opt.face) drawFacingArrow(sc.x, sc.y, u.facing, hs * 0.75, '#f0b72f', 2.5);
  ctx.restore();
}

/* ---------- 悬停格 ---------- */
function renderHoverHighlight() {
  if (!G.hover || !inBounds(G.hover.c, G.hover.r)) return;
  const hs = HS * G.cam.z;
  const wc = hexCenter(G.hover.c, G.hover.r, HS);
  const sc = worldToScreen(wc.x, wc.y);

  ctx.save();
  if (G.mode === 'ranged') {
    ctx.strokeStyle = 'rgba(255,159,90,0.95)';
    ctx.lineWidth = 2.5;
    hexPath(ctx, sc.x, sc.y, hs * 0.95);
    ctx.stroke();
    if (G.sel) {
      const areaAffected = [{c: G.hover.c, r: G.hover.r}, ...hexNeighbors(G.hover.c, G.hover.r)];
      ctx.fillStyle = 'rgba(255,159,90,0.18)';
      areaAffected.forEach(a => {
        if (!inBounds(a.c, a.r)) return;
        const wc2 = hexCenter(a.c, a.r, HS);
        const sc2 = worldToScreen(wc2.x, wc2.y);
        hexPath(ctx, sc2.x, sc2.y, hs * 0.96);
        ctx.fill();
      });
    }
  }
  else if (G.mode === 'attackMove') {
    ctx.strokeStyle = 'rgba(255,120,60,0.95)';
    ctx.lineWidth = 2.5;
    hexPath(ctx, sc.x, sc.y, hs * 0.95);
    ctx.stroke();
  }
  else if (typeof engineerMode !== 'undefined' && engineerMode) {
    ctx.strokeStyle = 'rgba(126,231,135,0.95)';
    ctx.lineWidth = 2.5;
    hexPath(ctx, sc.x, sc.y, hs * 0.95);
    ctx.stroke();
  }
  else if (typeof ewMode !== 'undefined' && ewMode) {
    ctx.strokeStyle = 'rgba(208,160,224,0.95)';
    ctx.lineWidth = 2.5;
    hexPath(ctx, sc.x, sc.y, hs * 0.95);
    ctx.stroke();
    if (ewMode === 'jam' || ewMode === 'decoy') {
      for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) {
        const cc = G.hover.c + dc, rr = G.hover.r + dr;
        if (!inBounds(cc, rr)) continue;
        const wc2 = hexCenter(cc, rr, HS);
        const sc2 = worldToScreen(wc2.x, wc2.y);
        hexPath(ctx, sc2.x, sc2.y, hs * 0.95);
        ctx.fillStyle = 'rgba(208,160,224,0.18)';
        ctx.fill();
      }
    }
  }
  else {
    ctx.strokeStyle = 'rgba(240,183,47,0.6)';
    ctx.lineWidth = 1.6;
    hexPath(ctx, sc.x, sc.y, hs * 0.95);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- 移动路径预览 ---------- */
function renderMovePath() {
  if ((G.mode !== 'move' && G.mode !== 'attackMove') || !G.sel || !G.hover) return;
  if (G.sel.dead || G.sel.moving) return;

  const reach = reachableCells(G.sel, G.sel.mp);
  const k = G.hover.c + ',' + G.hover.r;
  if (!reach.has(k)) return;

  const path = [];
  let cur = {c: G.hover.c, r: G.hover.r};
  while (cur) {
    path.unshift(cur);
    const cc = reach.get(cur.c + ',' + cur.r);
    cur = cc && cc.prev ? cc.prev : null;
  }

  ctx.save();
  ctx.strokeStyle = G.mode === 'attackMove'
    ? 'rgba(255,120,60,0.85)'
    : 'rgba(240,183,47,0.85)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  path.forEach((p, i) => {
    const wc = hexCenter(p.c, p.r, HS);
    const sc = worldToScreen(wc.x, wc.y);
    i ? ctx.lineTo(sc.x, sc.y) : ctx.moveTo(sc.x, sc.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ---------- 视线预览 ---------- */
function renderLOSPreview() {
  if ((G.mode !== 'fire' && G.mode !== 'ranged') || !G.sel || !G.hover || G.sel.dead) return;

  const wc1 = hexCenter(G.sel.c, G.sel.r, HS);
  const wc2 = hexCenter(G.hover.c, G.hover.r, HS);
  const s1 = worldToScreen(wc1.x, wc1.y);
  const s2 = worldToScreen(wc2.x, wc2.y);
  const ok = hasLOS(G.sel, {c: G.hover.c, r: G.hover.r});

  ctx.save();
  ctx.strokeStyle = ok ? 'rgba(63,185,80,0.8)' : 'rgba(248,81,73,0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
  ctx.restore();
}
/* ---------- 雷达扫描（改为清爽的虚线圆圈） ---------- */
function renderRadarOverlays() {
  const hs = HS * G.cam.z;

  G.units.forEach(u => {
    if (u.dead || u.carriedBy || !u.radarOn) return;
    const rp = radarParams(u);
    if (!rp) return;

    const wc = hexCenter(u.c, u.r, HS);
    const sc = worldToScreen(wc.x, wc.y);
    const range = rp.maxRangeHex * HS * SQ3 * G.cam.z * 0.9;
    const col = u.side === 0 ? '74,144,217' : '217,83,79';

    // 1. 极淡的内部底色填充（方便看清范围，如果不想要这层，把下面两行注释掉）
    ctx.fillStyle = `rgba(${col}, 0.03)`; 
    ctx.beginPath(); ctx.arc(sc.x, sc.y, range, 0, Math.PI * 2); ctx.fill();

    // 2. 虚线雷达外圈
    ctx.save();
    ctx.strokeStyle = `rgba(${col}, 0.6)`; // 0.6 是线条透明度，觉得太亮可以改成 0.4
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]); // [实线长度, 虚线间隔]
    ctx.beginPath(); 
    ctx.arc(sc.x, sc.y, range, 0, Math.PI * 2); 
    ctx.stroke();
    ctx.restore(); // 恢复默认线段样式，防止影响后面画别的

    // 3. 暴露度警告（保留原先的 📡 提示）
    if (u.exposureLevel > 0.5) {
      ctx.fillStyle = `rgba(255,80,80,${Math.min(1, u.exposureLevel) * 0.5})`;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📡', sc.x, sc.y + 15);
    }
  });
}

/* ---------- 导弹 ---------- */
function renderMissiles() {
  if (!MISSILES.length) return;
  const hs = HS * G.cam.z;

  MISSILES.forEach(m => {
    // 米→世界→屏幕
    const wc = {x: (m.pos.x / 100) * HS * SQ3, y: (m.pos.y / 100) * HS * 1.5};
    const sc = worldToScreen(wc.x, wc.y);
    const speed = Math.hypot(m.vel.x, m.vel.y, m.vel.z);

    ctx.save();
    if (speed > 1) {
      const vx = m.vel.x / speed, vy = m.vel.y / speed;
      const tail = {x: sc.x - vx * hs * 0.8, y: sc.y - vy * hs * 0.8};
      const g = ctx.createLinearGradient(tail.x, tail.y, sc.x, sc.y);
      g.addColorStop(0, 'rgba(255,180,60,0)');
      g.addColorStop(1, 'rgba(255,220,100,0.95)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(sc.x, sc.y); ctx.stroke();
    }
    ctx.fillStyle = m.side === 0 ? '#79c0ff' : '#ff7b72';
    ctx.beginPath(); ctx.arc(sc.x, sc.y, Math.max(2, hs * 0.16), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });
}

/* ---------- NEZ 圈（选中单位的导弹射程） ---------- */
function renderNEZ() {
  if (!G.sel || G.sel.dead) return;
  const u = G.sel;
  const w = u.def.weapons.find(w => ['sam','manpads','atgm','drone'].includes(w.t));
  if (!w) return;

  const hn = hexCenter(u.c, u.r, HS);
  const sc = worldToScreen(hn.x, hn.y);
  const rPix = w.r * HS * SQ3 * G.cam.z * 0.9;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,80,80,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.beginPath(); ctx.arc(sc.x, sc.y, rPix, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,80,80,0.05)';
  ctx.fill();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,80,80,0.9)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEZ', sc.x, sc.y - rPix - 6);
  ctx.restore();
}

/* ---------- 框选 ---------- */
function renderSelectionBox() {
  if (!G.boxSel.active) return;
  const x1 = Math.min(G.boxSel.x1, G.boxSel.x2);
  const x2 = Math.max(G.boxSel.x1, G.boxSel.x2);
  const y1 = Math.min(G.boxSel.y1, G.boxSel.y2);
  const y2 = Math.max(G.boxSel.y1, G.boxSel.y2);

  ctx.save();
  ctx.strokeStyle = '#f0b72f';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  ctx.fillStyle = 'rgba(240,183,47,0.08)';
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  ctx.restore();
}

/* ---------- 多选高亮 ---------- */
function renderMultiSelection() {
  if (!G.selectedUnits || !G.selectedUnits.length) return;
  const hs = HS * G.cam.z;
  G.selectedUnits.forEach(u => {
    if (u.dead || u.carriedBy) return;
    const wc = hexCenter(u.c, u.r, HS);
    const sc = worldToScreen(wc.x, wc.y);
    ctx.save();
    ctx.strokeStyle = '#f0b72f';
    ctx.lineWidth = 3;
    hexPath(ctx, sc.x, sc.y, hs * 0.95);
    ctx.stroke();
    ctx.restore();
  });
}

/* ---------- 探测进度条（雷达锁定进度） ---------- */
function renderDetectionBars() {
  if (!G.opt.fog) return;
  const hs = HS * G.cam.z;
  G.units.forEach(u => {
    if (u.dead || u.carriedBy || !u.spotted[G.side]) return;
    const prog = (u.trackProgress && u.trackProgress[G.side]) || 0;
    if (prog <= 0.05) return;

    const wc = hexCenter(u.c, u.r, HS);
    const sc = worldToScreen(wc.x, wc.y);
    const bw = hs * 1.2, bh = 3;
    const pct = Math.min(1, prog);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(sc.x - bw / 2, sc.y - hs * 0.95, bw, bh);
    ctx.fillStyle = pct > 0.8 ? '#f85149' : pct > 0.4 ? '#d29922' : '#58a6ff';
    ctx.fillRect(sc.x - bw / 2, sc.y - hs * 0.95, bw * pct, bh);
    ctx.restore();
  });
}

/* ---------- 战斗群包围圈 ---------- */
function renderTaskForceEnclosures() {
  if (!G.taskForces || !G.taskForces.length) return;
  const hs = HS * G.cam.z;

  G.taskForces.forEach(tf => {
    const units = tf.units.filter(u => !u.dead && !u.carriedBy);
    if (units.length < 1) return;

    const sideCol = tf.side === 0 ? '74,144,217' : '217,83,79';
    const isSel = (G.selectedUnits || []).some(u => tf.units.includes(u));
    const pts = units.map(u => {
      const wc = hexCenter(u.c, u.r, HS);
      return worldToScreen(wc.x, wc.y);
    });

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
    const pad = hs * 0.9;

    ctx.save();
    ctx.strokeStyle = `rgba(${sideCol},${isSel ? 0.85 : 0.45})`;
    ctx.lineWidth = isSel ? 2 : 1;
    ctx.setLineDash([6, 4]);

    const x1 = minX - pad, x2 = maxX + pad, y1 = minY - pad, y2 = maxY + pad;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(x1 + r, y1);
    ctx.lineTo(x2 - r, y1); ctx.quadraticCurveTo(x2, y1, x2, y1 + r);
    ctx.lineTo(x2, y2 - r); ctx.quadraticCurveTo(x2, y2, x2 - r, y2);
    ctx.lineTo(x1 + r, y2); ctx.quadraticCurveTo(x1, y2, x1, y2 - r);
    ctx.lineTo(x1, y1 + r); ctx.quadraticCurveTo(x1, y1, x1 + r, y1);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(${sideCol},0.06)`;
    ctx.fill();
    ctx.setLineDash([]);

    const aiTag = tf.aiControlled ? '🤖' : '👤';
    const macroLabel = (typeof MACRO_COMMANDS !== 'undefined' && tf.playerMacro)
      ? `·${MACRO_COMMANDS[tf.playerMacro]?.n || tf.playerMacro}`
      : '';
    ctx.fillStyle = `rgba(${sideCol},0.95)`;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${tf.name}${aiTag}${macroLabel}`, (x1 + x2) / 2, y1 - 3);
    ctx.restore();
  });
}