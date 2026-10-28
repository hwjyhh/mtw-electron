/* ============================================================
 * MTW input/mouse.js
 * 鼠标：拖拽平移 / 滚轮缩放 / handleClick 主逻辑
 * 依赖：canvas / geometry / state / combat / movement / ew / engineer
 *       / area-fire / macro-panel
 * ============================================================ */
'use strict';

let dragging = false;
let dragStart = null;
let camStart = null;
let _lastDownPos = null;

/* ---------- mousedown ---------- */
cv.addEventListener('mousedown', e => {
  if (e.button === 0) _lastDownPos = {x: e.clientX, y: e.clientY};

  // 左键：放置/地图编辑
  if (e.button === 0) {
    if (G.mode === 'place' && G.placeDef) { placeAt(e); return; }
    if (G.mode === 'mapedit') {
      const rect = cv.getBoundingClientRect();
      const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const h = pixelToHex(w.x, w.y, HS);
      G.edit.dragStart = h;
      G.edit.painting = true;
      paintAt(null, h.c, h.r, true);
      return;
    }
  }

  // 中/右键/Shift+左键：拖拽平移
  if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
    dragging = true;
    dragStart = {x: e.clientX, y: e.clientY};
    camStart = {x: G.cam.x, y: G.cam.y};
    e.preventDefault();
  }
});

/* ---------- mousemove ---------- */
cv.addEventListener('mousemove', e => {
  const rect = cv.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
  const w = screenToWorld(sx, sy);
  const h = pixelToHex(w.x, w.y, HS);
  G.hover = inBounds(h.c, h.r) ? h : null;

  if (dragging && dragStart) {
    G.cam.x = camStart.x - (e.clientX - dragStart.x) / G.cam.z;
    G.cam.y = camStart.y - (e.clientY - dragStart.y) / G.cam.z;
    draw();
  }

  if (G.edit.painting && G.mode === 'mapedit') paintAt(null, h.c, h.r, false);

  updateStatus();
  draw();
});

/* ---------- 全局 mouseup ---------- */
window.addEventListener('mouseup', () => {
  if (G.edit.painting && G.mode === 'mapedit' && G.edit.dragStart && G.hover) {
    finishDragPaint();
  }
  dragging = false;
  G.edit.painting = false;
  G.edit.dragStart = null;
});

/* ---------- 右键取消 ---------- */
cv.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (EW_MANUAL.pickingTarget) {
    EW_MANUAL.pickingTarget = null;
    document.getElementById('ewConsole')?.classList.remove('ew-picking');
    log('已取消选择', 'lg-sys');
    return;
  }
  resetInteractionModes();
});

/* ---------- click：主交互 ---------- */
cv.addEventListener('click', e => {
  // 拖拽后不触发 click
  if (_lastDownPos) {
    const dist = Math.hypot(e.clientX - _lastDownPos.x, e.clientY - _lastDownPos.y);
    _lastDownPos = null;
    if (dist > 5) return;
  }
  if (e.shiftKey) return;

  const rect = cv.getBoundingClientRect();
  const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  const h = pixelToHex(w.x, w.y, HS);
  if (!inBounds(h.c, h.r)) return;
  handleClick(h.c, h.r);
});

/* ---------- 滚轮缩放 ---------- */
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = cv.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
  const before = screenToWorld(sx, sy);
  G.cam.z = clamp(G.cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.35, 2.6);
  const after = screenToWorld(sx, sy);
  G.cam.x += before.x - after.x;
  G.cam.y += before.y - after.y;
  draw();
  updateStatus();
}, {passive: false});

/* ============================================================
 * handleClick：主点击逻辑（原样保留优先级）
 * ============================================================ */
function handleClick(c, r) {
  // 1. EW picking 优先
  if (EW_MANUAL.pickingTarget) {
    const u = unitAt(c, r);
    if (EW_MANUAL.pickingTarget === 'cipher') {
      if (u && u.side !== G.side) {
        EW_MANUAL.cipherTarget = u;
        EW_MANUAL.pickingTarget = null;
        document.getElementById('ewConsole')?.classList.remove('ew-picking');
        updateEWPanel();
        log(`🔐 已选择破译目标：${u.def.name}`, 'lg-crypto');
      } else {
        log('请点击敌方单位', 'lg-sys');
      }
    } else if (EW_MANUAL.pickingTarget === 'jam') {
      EW_MANUAL.selectedTarget = {c, r};
      EW_MANUAL.pickingTarget = null;
      document.getElementById('ewConsole')?.classList.remove('ew-picking');
      updateEWPanel();
      log(`📡 已选择干扰目标格：(${c},${r})`, 'lg-ew');
    }
    draw();
    return;
  }

  const u = unitAt(c, r);

  // 2. 工兵 / EW 模式
  if (engineerMode) { handleEngineerMode(c, r); return; }
  if (ewMode)       { handleEWMode(c, r); return; }

  // 3. 放置模式
  if (G.mode === 'place' && G.placeDef) {
    const def = typeof G.placeDef === 'string' ? DEF_BY_ID[G.placeDef] : G.placeDef;
    if (u) { log('该格已有单位', 'lg-sys'); return; }
    spawn(def, G.side, c, r, G.side === 0 ? 0 : 3);
    log(`放置 ${def.name} 于 ${c},${r}`, 'lg-ok');
    recalcVisibility(); draw(); updateUI();
    return;
  }

  // 4. 地图编辑
  if (G.mode === 'mapedit') { paintAt(null, c, r, true); return; }

  // 5. 攻击移动
  if (G.mode === 'attackMove' && G.sel && !G.sel.dead) {
    if (G.sel.moving) { log('该单位正在移动中', 'lg-sys'); return; }
    if (u && u.side !== G.sel.side) {
      const dist = hexDist(G.sel, {c, r});
      const valid = [];
      G.sel.def.weapons.forEach((w, i) => {
        if (w.r >= dist && G.sel.ammo[i] >= Math.max(1, Math.round(w.rof)) && G.sel.fired[i] < 1) valid.push(i);
      });
      if (!valid.length) { log('无可用武器', 'lg-sys'); return; }
      orderFire(G.sel, u, valid, G.attackMode);
      draw();
      return;
    }
    if (u && u.side === G.sel.side) { log('该格有友军', 'lg-sys'); return; }
    const ok = performMove(G.sel, {c, r});
    if (ok) {
      G.sel.attackingMove = true;
      log(`${G.sel.def.name} 攻击移动至 (${c},${r})`, 'lg-ok');
    } else {
      log('无法到达该格', 'lg-sys');
    }
    draw(); updateUI();
    return;
  }

  // 6. 远程火力
  if (G.mode === 'ranged' && G.sel && !G.sel.dead) {
    if (G.sel.rangedUsedThisTurn) { log('该单位本回合已使用远程火力', 'lg-sys'); return; }
    let wList = G.selectedWeapons.slice();
    if (!wList.length) {
      wList = G.sel.def.weapons.map((w, i) => i).filter(i =>
        canAreaFire(G.sel.def.weapons[i]) &&
        G.sel.ammo[i] >= Math.max(1, Math.round(G.sel.def.weapons[i].rof)) &&
        G.sel.fired[i] < 1
      );
      if (!wList.length) { log('无可用远程/曲射武器', 'lg-sys'); return; }
    } else {
      wList = wList.filter(i => canAreaFire(G.sel.def.weapons[i]) && G.sel.fired[i] < 1);
      if (!wList.length) { log('选中武器不可用', 'lg-sys'); return; }
    }
    const needObs = wList.some(i => isRangedWeapon(G.sel.def.weapons[i]));
    if (needObs && !isCellObserved(c, r, G.sel.side)) { log('该格未被友军侦察到', 'lg-sys'); return; }
    executeAreaFire(G.sel, {c, r}, wList, G.attackMode);
    draw();
    return;
  }

  // 7. 直接射击
  if (G.mode === 'fire' && G.sel && !G.sel.dead) {
    const shooter = G.sel;
    const dist = hexDist(shooter, {c, r});

    // 空地打击
    if (!u) {
      if (!G.selectedWeapons.length) { log('空地打击：请先勾选武器', 'lg-sys'); return; }
      const areaW = G.selectedWeapons.filter(i => {
        const w = shooter.def.weapons[i];
        if (!w) return false;
        if (shooter.fired[i] >= 1) { log(`${w.n}: 该武器已攻击`, 'lg-sys'); return false; }
        if (!canAreaFire(w)) { log(`${w.n}: 直射武器无法打击空地`, 'lg-sys'); return false; }
        if (w.r < dist) { log(`${w.n}: 超出射程`, 'lg-sys'); return false; }
        if (shooter.ammo[i] < Math.max(1, Math.round(w.rof))) { log(`${w.n}: 弹药不足`, 'lg-sys'); return false; }
        return true;
      });
      if (!areaW.length) { log('选中武器均不可用', 'lg-sys'); return; }
      const needObs = areaW.some(i => isRangedWeapon(shooter.def.weapons[i]));
      if (needObs && !isCellObserved(c, r, shooter.side)) { log('该格未被友军侦察到', 'lg-sys'); return; }
      executeAreaFire(shooter, {c, r}, areaW, G.attackMode);
      draw();
      return;
    }

    // 对单位射击
    if (u.side === shooter.side) { log('不能攻击友军', 'lg-sys'); return; }
    if (!u.spotted[G.side] && G.opt.fog) { log('目标未被侦察', 'lg-sys'); return; }
    if (!G.selectedWeapons.length) { log('请先勾选武器', 'lg-sys'); return; }
    const validW = G.selectedWeapons.filter(i => {
      const w = shooter.def.weapons[i];
      if (!w) return false;
      if (shooter.fired[i] >= 1) { log(`${w.n}: 该武器已攻击`, 'lg-sys'); return false; }
      if (w.r < dist) { log(`${w.n}: 超出射程`, 'lg-sys'); return false; }
      if (shooter.ammo[i] < Math.max(1, Math.round(w.rof))) { log(`${w.n}: 弹药不足`, 'lg-sys'); return false; }
      if (u.def.mob === 'air' && !canEngageAir(w)) { log(`${w.n}: 无法攻击空中目标`, 'lg-sys'); return false; }
      if (isRangedWeapon(w) && !u.spotted[shooter.side] && !isCellObserved(u.c, u.r, shooter.side)) {
        log(`${w.n}: 需友军观察`, 'lg-sys');
        return false;
      }
      return true;
    });
    if (!validW.length) { log('勾选武器不可用', 'lg-sys'); return; }
    orderFire(shooter, u, validW, G.attackMode);
    draw();
    return;
  }

  // 8. 移动
  if (G.mode === 'move' && G.sel && !G.sel.dead) {
    if (G.sel.moving) { log('该单位正在移动中', 'lg-sys'); return; }
    if (u && u.side !== G.sel.side) { log('目标格有敌军', 'lg-sys'); return; }
    const ok = performMove(G.sel, {c, r});
    if (!ok) log('无法到达该格', 'lg-sys');
    draw(); updateUI();
    return;
  }

  // 9. 选择
  if (u) {
    if (G.opt.fog && u.side !== G.side && !u.spotted[G.side]) { log('该单位未被侦察到', 'lg-sys'); return; }
    G.sel = u;
    G.selectedWeapons = [];
    G.mode = 'select';
    updateUI();
    draw();
  } else {
    G.sel = null;
    G.selectedWeapons = [];
    updateUI();
    draw();
  }
}

/* ============================================================
 * 放置 / 地图绘制辅助
 * ============================================================ */
function placeAt(e) {
  const rect = cv.getBoundingClientRect();
  const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  const h = pixelToHex(w.x, w.y, HS);
  if (!inBounds(h.c, h.r)) return;
  if (unitAt(h.c, h.r)) return;
  const def = typeof G.placeDef === 'string' ? DEF_BY_ID[G.placeDef] : G.placeDef;
  if (!def) return;
  spawn(def, G.side, h.c, h.r, G.side === 0 ? 0 : 3);
  recalcVisibility();
  draw();
}

function paintAt(e, fc, fr, isStart) {
  let c, r;
  if (fc !== undefined) { c = fc; r = fr; }
  else {
    const rect = cv.getBoundingClientRect();
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const h = pixelToHex(w.x, w.y, HS);
    c = h.c; r = h.r;
  }
  if (!inBounds(c, r)) return;

  const tool = G.edit.tool, brush = G.edit.brush;

  if ((tool === 'rect' || tool === 'line') && isStart) {
    G.edit.dragStart = {c, r};
    return;
  }

  if (tool !== 'rect' && tool !== 'line') {
    const cells = getBrushCells(c, r, brush);
    cells.forEach(({cc, rr}) => {
      if (!inBounds(cc, rr)) return;
      const cell = G.map.cells[rr][cc];
      if (tool === 'elev') cell.elev = G.edit.elev;
      else if (tool === 'fort') cell.fort = G.edit.fort;
      else if (tool === 'mine') cell.mine = G.edit.mine;
      else cell.t = T_IDX[G.edit.terr];
    });
    draw();
  }
}

function finishDragPaint() {
  const start = G.edit.dragStart, end = G.hover;
  if (!start || !end) return;
  const tool = G.edit.tool, cells = [];

  if (tool === 'rect') {
    const c1 = Math.min(start.c, end.c), c2 = Math.max(start.c, end.c);
    const r1 = Math.min(start.r, end.r), r2 = Math.max(start.r, end.r);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) cells.push({cc: c, rr: r});
  } else if (tool === 'line') {
    const steps = Math.max(Math.abs(start.c - end.c), Math.abs(start.r - end.r), 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      cells.push({
        cc: Math.round(start.c + (end.c - start.c) * t),
        rr: Math.round(start.r + (end.r - start.r) * t)
      });
    }
  }

  cells.forEach(({cc, rr}) => {
    if (!inBounds(cc, rr)) return;
    G.map.cells[rr][cc].t = T_IDX[G.edit.terr];
  });
  draw();
}

function getBrushCells(c, r, size) {
  if (size <= 1) return [{cc: c, rr: r}];
  const out = [{cc: c, rr: r}];
  const visited = new Set([c + ',' + r]);
  let frontier = [{c, r, d: 0}];

  while (frontier.length) {
    const cur = frontier.shift();
    if (cur.d >= size - 1) continue;
    hexNeighbors(cur.c, cur.r).forEach(nb => {
      const k = nb.c + ',' + nb.r;
      if (!visited.has(k) && inBounds(nb.c, nb.r)) {
        visited.add(k);
        out.push({cc: nb.c, rr: nb.r});
        frontier.push({c: nb.c, r: nb.r, d: cur.d + 1});
      }
    });
  }
  return out;
}