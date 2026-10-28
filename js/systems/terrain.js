/* ============================================================
 * MTW systems/terrain.js
 * 地图生成 / 移动消耗
 * 依赖：constants.js / geometry.js / state.js
 * ============================================================ */
'use strict';

/* ---------- 空地图 ---------- */
function makeMap(cols, rows, fill) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({t: T_IDX[fill || 'open'], elev: 0, fort: 0, mine: 0, road: false});
    }
    cells.push(row);
  }
  return {cols, rows, cells};
}

/* ---------- 移动消耗 ---------- */
function moveCost(cell, mob, elevFrom) {
  const t = TERRAIN[cell.t];
  const idx = mob === 'leg' ? 0 : mob === 'wheel' ? 1 : mob === 'track' ? 2 : 3;
  let cost = t.mv[idx];
  if (cost === Infinity || cost === undefined) return Infinity;
  if (elevFrom !== undefined && cell.elev > elevFrom) cost += (cell.elev - elevFrom) * 0.5;
  if (cell.mine) cost += 1;
  if (cell.road && (mob === 'wheel' || mob === 'track')) cost = Math.max(0.3, cost * 0.5);
  return cost;
}

/* ---------- 按类型生成地图 ---------- */
function genMapByType(type, cols, rows) {
  const m = makeMap(cols, rows, 'open');
  const setT    = (c, r, id) => { if (c >= 0 && r >= 0 && c < cols && r < rows) m.cells[r][c].t = T_IDX[id]; };
  const setElev = (c, r, v)  => { if (c >= 0 && r >= 0 && c < cols && r < rows) m.cells[r][c].elev = v; };
  const setFort = (c, r, v)  => { if (c >= 0 && r >= 0 && c < cols && r < rows) m.cells[r][c].fort = v; };
  const setMine = (c, r, v)  => { if (c >= 0 && r >= 0 && c < cols && r < rows) m.cells[r][c].mine = v; };
  const area = cols * rows;
  const rI = (a, b) => Math.floor(rnd(a, b));

  switch (type) {
    case 'urban':
      for (let i = 0; i < area * 0.45; i++) setT(rI(0, cols), rI(0, rows), 'village');
      for (let i = 0; i < area * 0.18; i++) {
        const c = rI(Math.floor(cols * 0.25), Math.floor(cols * 0.75));
        const r = rI(Math.floor(rows * 0.2), Math.floor(rows * 0.8));
        const roll = Math.random();
        setT(c, r, roll < 0.15 ? 'capital' : (roll < 0.55 ? 'city' : 'industry'));
      }
      break;
    case 'desert':
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) setT(c, r, Math.random() < 0.55 ? 'desert' : 'sand');
      for (let i = 0; i < area * 0.15; i++) { const c = rI(0, cols), r = rI(0, rows); setT(c, r, 'dune'); setElev(c, r, 1); }
      break;
    case 'forest':
      for (let i = 0; i < area * 0.55; i++) {
        const c = rI(0, cols), r = rI(0, rows);
        setT(c, r, Math.random() < 0.5 ? 'forest' : (Math.random() < 0.55 ? 'dforest' : 'brush'));
      }
      break;
    case 'mountain':
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const d = Math.abs(c - cols / 2) / cols;
        if (Math.random() < 0.45 + d * 0.3) { setT(c, r, 'hill'); setElev(c, r, 1); }
      }
      for (let i = 0; i < area * 0.18; i++) { const c = rI(0, cols), r = rI(0, rows); setT(c, r, 'mount'); setElev(c, r, 2); }
      for (let i = 0; i < area * 0.07; i++) { const c = rI(0, cols), r = rI(0, rows); setT(c, r, 'ridge'); setElev(c, r, 3); }
      break;
    case 'plains':
      for (let i = 0; i < area * 0.6; i++) setT(rI(0, cols), rI(0, rows), Math.random() < 0.5 ? 'grass' : 'farm');
      break;
    case 'amphibious':
      for (let r = 0; r < rows; r++) {
        const edge = cols * 0.55 + Math.sin(r * 0.35) * 3;
        for (let c = 0; c < cols; c++) {
          if (c < edge - 3)      setT(c, r, Math.random() < 0.6 ? 'grass' : 'open');
          else if (c < edge)     setT(c, r, 'beach');
          else                   setT(c, r, 'sea');
        }
      }
      break;
    case 'random':
    default: {
      const pool = ['open','grass','forest','hill','brush','farm','desert','rocky','village'];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.78) setT(c, r, pool[rI(0, pool.length)]);
        if (Math.random() < 0.15) setElev(c, r, rI(0, 4));
      }
      break;
    }
  }

  // 道路系统：中线横向 + 中线纵向
  const midR = Math.floor(rows * 0.5);
  for (let c = 0; c < cols; c++) {
    const cell = m.cells[midR][c];
    if (cell.t === T_IDX['water'] || cell.t === T_IDX['sea']) cell.t = T_IDX['bridge'];
    else if (['open','grass','farm','desert','sand','brush','dune'].includes(TERRAIN[cell.t].id)) cell.t = T_IDX['road'];
    cell.road = true;
  }
  const midC = Math.floor(cols * 0.5);
  for (let r = 0; r < rows; r++) {
    const cell = m.cells[r][midC];
    if (cell.t === T_IDX['water'] || cell.t === T_IDX['sea']) cell.t = T_IDX['bridge'];
    else if (['open','grass','farm','desert','sand','brush','dune'].includes(TERRAIN[cell.t].id)) cell.t = T_IDX['highway'];
    cell.road = true;
  }

  // 随机工事 / 雷场
  const fortN = Math.floor(area * 0.02), mineN = Math.floor(area * 0.015);
  for (let i = 0; i < fortN; i++) setFort(rI(0, cols), rI(0, rows), rI(1, 4));
  for (let i = 0; i < mineN; i++) setMine(rI(0, cols), rI(0, rows), rI(1, 4));

  return m;
}