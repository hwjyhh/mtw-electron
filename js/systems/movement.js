/* ============================================================
 * MTW systems/movement.js
 * 移动范围 / 移动执行 / 移动动画 / 绘制位置
 * 依赖：constants / geometry / state / terrain / visibility
 * ============================================================ */
'use strict';

/* ---------- 可达格子（Dijkstra） ---------- */
function reachableCells(unit, maxMP) {
  const start = {c: unit.c, r: unit.r};
  const result = new Map();
  const costs = new Map();
  const key = (c, r) => c + ',' + r;

  costs.set(key(start.c, start.r), 0);
  const queue = [{c: start.c, r: start.r, cost: 0}];
  result.set(key(start.c, start.r), {c: start.c, r: start.r, cost: 0, prev: null});

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const cur = queue.shift();
    if (cur.cost > maxMP) continue;
    if (costs.get(key(cur.c, cur.r)) < cur.cost) continue;

    for (const nb of hexNeighbors(cur.c, cur.r)) {
      if (!inBounds(nb.c, nb.r)) continue;
      const cell = cellAt(nb.c, nb.r);
      const occ = unitAt(nb.c, nb.r);
      if (occ && occ.side !== unit.side) continue;
      if (occ && occ.uid === unit.uid) continue;
      if (occ && occ.carriedBy) continue;

      const fromCell = cellAt(cur.c, cur.r);
      let cost = moveCost(cell, unit.def.mob, fromCell.elev);
      if (cost === Infinity) continue;

      // 残骸额外消耗
      if (G.wrecks.some(wk => wk.c === nb.c && wk.r === nb.r)) {
        if (unit.def.mob === 'wheel')      cost += 1;
        else if (unit.def.mob === 'track') cost += 0.5;
        else                                cost += 0.25;
      }

      const nc = cur.cost + cost;
      if (nc > maxMP + 1e-6) continue;

      const k = key(nb.c, nb.r);
      if (!costs.has(k) || costs.get(k) > nc) {
        costs.set(k, nc);
        result.set(k, {c: nb.c, r: nb.r, cost: nc, prev: {c: cur.c, r: cur.r}});
        queue.push({c: nb.c, r: nb.r, cost: nc});
      }
    }
  }
  return result;
}

/* ---------- 执行移动（设置动画路径） ---------- */
function performMove(unit, target) {
  if (unit.mp <= 0)                  { log('该单位已无移动力', 'lg-sys'); return false; }
  if (unit.carriedBy)                { log('搭载中无法移动', 'lg-sys'); return false; }
  if (unit.moving)                   { log('该单位正在移动中', 'lg-sys'); return false; }

  const cells = reachableCells(unit, unit.mp);
  const k = target.c + ',' + target.r;
  if (!cells.has(k)) return false;

  const info = cells.get(k);
  if (info.cost > unit.mp + 1e-6) return false;

  // 回溯路径
  const path = [];
  let cur = {c: info.c, r: info.r};
  while (cur) {
    path.unshift(cur);
    const cc = cells.get(cur.c + ',' + cur.r);
    cur = cc && cc.prev ? cc.prev : null;
  }
  const steps = path.length - 1;
  if (steps <= 0) return false;

  unit.movePath = path;
  unit.moving = true;
  unit.moveProgress = 0;
  unit.moveTarget = {c: info.c, r: info.r, cost: info.cost};
  unit.attackingMove = G.mode === 'attackMove';
  unit.mp -= info.cost;
  unit.moved += steps;
  return true;
}

/* ---------- 移动动画推进（每帧调用） ---------- */
function tickMovement(dt) {
  G.units.forEach(u => {
    if (!u.moving || u.dead) return;

    const speed = 1.2;
    u.moveProgress += dt * speed;
    const maxIdx = u.movePath.length - 1;

    if (u.moveProgress >= maxIdx) {
      // 到达终点
      u.moving = false;
      const end = u.movePath[maxIdx];
      u.c = end.c;
      u.r = end.r;

      // 雷场伤害
      const cell = cellAt(u.c, u.r);
      if (cell && cell.mine && u.def.mob !== 'air') {
        let dmg = 0;
        if (cell.mine === 1 && (u.def.cat === 'INF' || u.def.cat === 'SF')) dmg = rnd(0.8, 2.2);
        else if (cell.mine === 2 && u.def.armor.f > 10) dmg = rnd(1.2, 2.8);
        else if (cell.mine === 3) dmg = rnd(1.0, 2.5);
        else dmg = rnd(0.1, 0.5);
        if (u.def.era > 0) dmg *= 0.7;
        u.hp -= dmg;
        u.sup = clamp(u.sup + 4, 0, 20);
        addEffect('explosion', u.c, u.r, {dur: 20, size: 0.7, color: '#ff4030'});
        if (u.hp <= 0) u.dead = true;
        log(`${u.def.name} 进入雷场！受损 ${dmg.toFixed(1)}`, 'lg-hit');
        if (Math.random() < 0.4) cell.mine = 0;
      }

      u.movePath = [];
      u.moveProgress = 0;
      u.moveTarget = null;
      recalcVisibility();

      // 攻击移动：到达后自动寻找目标
      if (u.attackingMove && !u.dead) {
        const enemies = G.units.filter(e => !e.dead && e.side !== u.side);
        let best = null, bestScore = -1;
        const maxR = Math.max(...u.def.weapons.map(w => w.r), 0);
        enemies.forEach(e => {
          const d = hexDist(u, e);
          if (d > maxR || !hasLOS(u, e)) return;
          const score = e.def.pts / (1 + d);
          if (score > bestScore) { bestScore = score; best = e; }
        });
        if (best) {
          const valid = [];
          u.def.weapons.forEach((w, i) => {
            if (w.r >= hexDist(u, best) && u.ammo[i] >= Math.max(1, Math.round(w.rof)) && u.fired[i] < 1) valid.push(i);
          });
          if (valid.length && u.side === G.side) {
            setTimeout(() => { orderFire(u, best, valid, 'attack'); draw(); updateUI(); }, 150);
          } else if (valid.length) {
            setTimeout(() => orderFire(u, best, valid, 'attack'), 150);
          }
        }
        u.attackingMove = false;
      }
    } else {
      // 中途：插值 + 朝向更新
      const idx = Math.floor(u.moveProgress);
      const seg = u.movePath[idx];
      if (seg) {
        u.c = seg.c;
        u.r = seg.r;
        if (idx + 1 < u.movePath.length) {
          const nxt = u.movePath[idx + 1];
          const a = hexCenter(seg.c, seg.r, 1);
          const b = hexCenter(nxt.c, nxt.r, 1);
          const ux = b.x - a.x, uy = b.y - a.y;
          const len = Math.hypot(ux, uy);
          if (len > 0.01) {
            let bestDir = u.facing, bestDot = -2;
            for (let k = 0; k < 6; k++) {
              const dot = (ux * DIR_PIX[k][0] + uy * DIR_PIX[k][1]) / len;
              if (dot > bestDot) { bestDot = dot; bestDir = k; }
            }
            u.facing = bestDir;
          }
        }
      }
      u.spotted[u.side] = true;
    }
  });
}

/* ---------- 动画中的绘制位置（用于渲染层插值） ---------- */
function unitDrawPos(u) {
  if (!u.moving || !u.movePath || u.movePath.length < 2) return hexCenter(u.c, u.r, HS);
  const idx = Math.min(Math.floor(u.moveProgress), u.movePath.length - 2);
  const t = u.moveProgress - idx;
  const a = u.movePath[idx];
  const b = u.movePath[idx + 1];
  const pa = hexCenter(a.c, a.r, HS);
  const pb = hexCenter(b.c, b.r, HS);
  return {x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t};
}
/* ---------- 搭载 / 卸载 / 补给 ---------- */
function canLoad(inf, vehicle) {
  if (!inf || !vehicle) return false;
  if (inf.side !== vehicle.side) return false;
  if (!['INF','SF','RECON','ENG'].includes(inf.def.cat)) return false;
  if (inf.def.mob !== 'leg') return false;
  if (!['IFV','APC','NAV','HELI'].includes(vehicle.def.cat)) return false;
  if (vehicle.def.carry <= 0) return false;
  if (vehicle.cargo.length >= vehicle.def.carry) return false;
  if (hexDist(inf, vehicle) > 1) return false;
  return true;
}
function loadUnit(inf, vehicle) {
  if (!canLoad(inf, vehicle)) return false;
  inf.carriedBy = vehicle;
  vehicle.cargo.push(inf);
  inf.c = vehicle.c;
  inf.r = vehicle.r;
  log(`${inf.def.name} 登上 ${vehicle.def.name}`, 'lg-ok');
  recalcVisibility();
  return true;
}
function unloadUnit(vehicle) {
  if (!vehicle.cargo.length) return false;
  const inf = vehicle.cargo.pop();
  inf.carriedBy = null;
  const nb = hexNeighbors(vehicle.c, vehicle.r);
  let placed = false;
  for (const n of nb) {
    if (!inBounds(n.c, n.r)) continue;
    if (unitAt(n.c, n.r)) continue;
    const cell = cellAt(n.c, n.r);
    if (moveCost(cell, inf.def.mob) === Infinity) continue;
    inf.c = n.c;
    inf.r = n.r;
    placed = true;
    break;
  }
  if (!placed) { inf.c = vehicle.c; inf.r = vehicle.r; }
  inf.mp = Math.max(0, inf.mp - 2);
  log(`${inf.def.name} 从 ${vehicle.def.name} 下车`, 'lg-ok');
  recalcVisibility();
  return true;
}
function doResupply(supply, target) {
  if (!supply || !target) return false;
  if (supply.def.cat !== 'LOG' && !supply.def.cap.includes('补给')) return false;
  if (hexDist(supply, target) > 1 && !(supply.c === target.c && supply.r === target.r)) return false;
  if (supply.side !== target.side) return false;
  let did = false;
  target.def.weapons.forEach((w, i) => {
    if (target.ammo[i] < w.ammo) { target.ammo[i] = w.ammo; did = true; }
  });
  if (did) {
    target.sup = Math.max(0, target.sup - 3);
    log(`${supply.def.name} 为 ${target.def.name} 补给弹药`, 'lg-ok');
  } else {
    log(`${target.def.name} 弹药已满`, 'lg-sys');
  }
  return did;
}