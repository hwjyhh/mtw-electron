/* ============================================================
 * MTW core/geometry.js
 * 六角格坐标换算 / 视线 / 朝向 / 遮挡
 * 依赖：constants.js
 * ============================================================ */
'use strict';

/* ---------- 像素 ↔ 六角格 ---------- */
function hexCenter(c, r, hs) {
  hs = hs || HS;
  return {x: hs * SQ3 * (c + 0.5*(r & 1)), y: hs * 1.5 * r};
}

function hexPath(ctx, cx, cy, hs) {
  hs = hs || HS;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI/180 * (60*i + 30);
    const x = cx + hs * Math.cos(a);
    const y = cy + hs * Math.sin(a);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function hexToAxial(c, r) {
  return {q: c - ((r - (r & 1)) >> 1), r};
}
function axialToOffset(q, r) {
  return {c: q + ((r - (r & 1)) >> 1), r};
}
function hexDist(a, b) {
  const A = hexToAxial(a.c, a.r), B = hexToAxial(b.c, b.r);
  const dq = A.q - B.q, dr = A.r - B.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}
function hexNeighbors(c, r) {
  const a = hexToAxial(c, r);
  return AXDIR.map(d => axialToOffset(a.q + d[0], a.r + d[1]));
}
function pixelToHex(px, py, hs) {
  hs = hs || HS;
  const q = (SQ3/3*px - 1/3*py) / hs;
  const r = (2/3*py) / hs;
  let x = q, z = r, y = -x - z;
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx-x), dy = Math.abs(ry-y), dz = Math.abs(rz-z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return axialToOffset(rx, rz);
}

/* ---------- 网格状态访问 ---------- */
const inBounds = (c, r) => G.map && c >= 0 && r >= 0 && c < G.map.cols && r < G.map.rows;
const cellAt   = (c, r) => inBounds(c, r) ? G.map.cells[r][c] : null;
const unitAt   = (c, r) => G.units.find(u => !u.dead && u.c === c && u.r === r);

function cellHeight(c, r) {
  const cell = cellAt(c, r);
  if (!cell) return 0;
  return cell.elev + (TERRAIN[cell.t].blk || 0);
}

/* ---------- 颜色调整 ---------- */
function shadeHex(hex, f) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${clamp(Math.round(r*f),0,255)},${clamp(Math.round(g*f),0,255)},${clamp(Math.round(b*f),0,255)})`;
}

/* ---------- 视线（2D，含地形阻挡） ---------- */
function hasLOS(a, b) {
  const N = hexDist(a, b);
  if (N <= 1) return true;
  const A = hexToAxial(a.c, a.r), B = hexToAxial(b.c, b.r);
  const hStart = cellHeight(a.c, a.r) + 2.2;
  const hEnd   = cellHeight(b.c, b.r) + 1.0;
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const q = A.q + (B.q - A.q)*t;
    const r = A.r + (B.r - A.r)*t;
    let x = q, z = r, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx-x), dy = Math.abs(ry-y), dz = Math.abs(rz-z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz)       ry = -rx - rz;
    else                    rz = -rx - ry;
    const off = axialToOffset(rx, rz);
    if (!inBounds(off.c, off.r)) continue;
    const hBlock = cellHeight(off.c, off.r);
    const hLine  = hStart + (hEnd - hStart) * t;
    if (hBlock >= hLine - 0.3) return false;
  }
  return true;
}

/* ---------- 视线（3D，含目标高度，原 M2） ---------- */
function hasLOS3D(observer, target, targetAlt) {
  const N = hexDist(observer, target);
  if (N <= 1) return true;
  const A = hexToAxial(observer.c, observer.r);
  const B = hexToAxial(target.c, target.r);
  const hStart = cellHeight(observer.c, observer.r) + 0.5;
  const hEnd   = targetAlt > 0 ? targetAlt : cellHeight(target.c, target.r) + 0.5;
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const q = A.q + (B.q - A.q)*t;
    const r = A.r + (B.r - A.r)*t;
    let x = q, z = r, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx-x), dy = Math.abs(ry-y), dz = Math.abs(rz-z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz)       ry = -rx - rz;
    else                    rz = -rx - ry;
    const off = axialToOffset(rx, rz);
    if (!inBounds(off.c, off.r)) continue;
    const hBlock = cellHeight(off.c, off.r);
    const hLine  = hStart + (hEnd - hStart) * t;
    if (hBlock >= hLine - 0.3) return false;
  }
  return true;
}

/* ---------- 命中方向（front / side / rear） ---------- */
function getHitFacing(target, attacker) {
  const t = hexCenter(target.c, target.r, 1);
  const a = hexCenter(attacker.c, attacker.r, 1);
  const dx = a.x - t.x, dy = a.y - t.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return 'front';
  const ux = dx / len, uy = dy / len;
  const fwd = DIR_PIX[target.facing % 6];
  const dot = ux * fwd[0] + uy * fwd[1];
  if (dot > 0.35)  return 'front';
  if (dot < -0.35) return 'rear';
  return 'side';
}