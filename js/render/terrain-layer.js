/* ============================================================
 * MTW render/terrain-layer.js
 * 地形细节绘制 + 地形/网格/工事/雷场/高程
 * 依赖：constants / geometry / state / canvas
 * ============================================================ */
'use strict';

/* ---------- 单格地形细节（道路/树木/建筑/山/水） ---------- */
function drawTerrainDetail(cell, sc, hs, c, r) {
  const tid = TERRAIN[cell.t].id;
  ctx.save();

  if (tid === 'road' || tid === 'highway' || tid === 'dirt') {
    ctx.strokeStyle = tid === 'highway'
      ? 'rgba(255,220,120,0.75)'
      : 'rgba(220,220,200,0.55)';
    ctx.lineWidth = Math.max(1, hs * 0.05);
    ctx.setLineDash(tid === 'dirt' ? [2, 3] : [4, 4]);
    ctx.beginPath(); ctx.moveTo(sc.x - hs * 0.7, sc.y); ctx.lineTo(sc.x + hs * 0.7, sc.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(1, hs * 0.03);
    ctx.beginPath(); ctx.moveTo(sc.x - hs * 0.7, sc.y - hs * 0.25); ctx.lineTo(sc.x + hs * 0.7, sc.y - hs * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sc.x - hs * 0.7, sc.y + hs * 0.25); ctx.lineTo(sc.x + hs * 0.7, sc.y + hs * 0.25); ctx.stroke();
  }
  else if (['forest','dforest','brush','orchard'].includes(tid)) {
    const n = tid === 'dforest' ? 4 : 2;
    ctx.fillStyle = tid === 'dforest' ? '#1f5a14' : '#2d6a1f';
    for (let i = 0; i < n; i++) {
      const ox = (i % 2 - 0.5) * hs * 0.35;
      const oy = (Math.floor(i / 2) - 0.25) * hs * 0.3;
      ctx.beginPath();
      ctx.moveTo(sc.x + ox, sc.y + oy - hs * 0.18);
      ctx.lineTo(sc.x + ox + hs * 0.12, sc.y + oy + hs * 0.08);
      ctx.lineTo(sc.x + ox - hs * 0.12, sc.y + oy + hs * 0.08);
      ctx.closePath();
      ctx.fill();
    }
  }
  else if (['city','capital','village','industry','rubble'].includes(tid)) {
    const n = tid === 'capital' ? 4 : tid === 'city' ? 3 : 2;
    ctx.fillStyle = 'rgba(60,60,70,0.55)';
    for (let i = 0; i < n; i++) {
      const ox = (i % 2 - 0.5) * hs * 0.35;
      const oy = (Math.floor(i / 2) - 0.25) * hs * 0.3;
      const s = hs * 0.16;
      ctx.fillRect(sc.x + ox - s / 2, sc.y + oy - s / 2, s, s);
    }
  }
  else if (['hill','mount','ridge','peak'].includes(tid)) {
    ctx.strokeStyle = 'rgba(80,60,40,0.5)';
    ctx.lineWidth = Math.max(1, hs * 0.04);
    ctx.beginPath();
    ctx.moveTo(sc.x - hs * 0.25, sc.y + hs * 0.1);
    ctx.lineTo(sc.x, sc.y - hs * 0.2);
    ctx.lineTo(sc.x + hs * 0.25, sc.y + hs * 0.1);
    ctx.stroke();
  }
  else if (['water','lake','sea'].includes(tid)) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1, hs * 0.04);
    for (let i = 0; i < 2; i++) {
      const yy = sc.y - hs * 0.15 + i * hs * 0.3;
      ctx.beginPath();
      ctx.moveTo(sc.x - hs * 0.4, yy);
      ctx.quadraticCurveTo(sc.x - hs * 0.2, yy - hs * 0.08, sc.x, yy);
      ctx.quadraticCurveTo(sc.x + hs * 0.2, yy + hs * 0.08, sc.x + hs * 0.4, yy);
      ctx.stroke();
    }
  }
  else if (tid === 'bridge') {
    ctx.strokeStyle = 'rgba(255,220,160,0.7)';
    ctx.lineWidth = Math.max(1, hs * 0.05);
    ctx.beginPath(); ctx.moveTo(sc.x - hs * 0.7, sc.y); ctx.lineTo(sc.x + hs * 0.7, sc.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,60,40,0.6)';
    for (let i = -2; i <= 2; i++) {
      const xx = sc.x + i * hs * 0.25;
      ctx.beginPath(); ctx.moveTo(xx, sc.y - hs * 0.25); ctx.lineTo(xx, sc.y + hs * 0.25); ctx.stroke();
    }
  }
  else if (tid === 'runway') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(1, hs * 0.05);
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(sc.x - hs * 0.6, sc.y); ctx.lineTo(sc.x + hs * 0.6, sc.y); ctx.stroke();
    ctx.setLineDash([]);
  }
  else if (tid === 'trench') {
    ctx.strokeStyle = 'rgba(60,50,30,0.7)';
    ctx.lineWidth = Math.max(1.5, hs * 0.08);
    ctx.beginPath(); ctx.moveTo(sc.x - hs * 0.5, sc.y + hs * 0.1); ctx.lineTo(sc.x + hs * 0.5, sc.y + hs * 0.1); ctx.stroke();
  }

  ctx.restore();
}

/* ---------- 地形 + 网格 + 工事 + 雷场 + 高程标记（一次遍历） ---------- */
function renderTerrain() {
  const hs = HS * G.cam.z;
  const map = G.map;
  const tl = screenToWorld(0, 0);
  const br = screenToWorld(VW, VH);

  const minC = Math.max(0, Math.floor(tl.x / (hs * SQ3)) - 2);
  const maxC = Math.min(map.cols - 1, Math.ceil(br.x / (hs * SQ3)) + 2);
  const minR = Math.max(0, Math.floor(tl.y / (hs * 1.5)) - 2);
  const maxR = Math.min(map.rows - 1, Math.ceil(br.y / (hs * 1.5)) + 2);

  const drawGrid = G.opt.grid;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const cell = map.cells[r][c];
      const t = TERRAIN[cell.t];
      const wc = hexCenter(c, r, HS);
      const sc = worldToScreen(wc.x, wc.y);

      // 地形填充
      hexPath(ctx, sc.x, sc.y, hs * 0.99);
      ctx.fillStyle = shadeHex(t.col, 1 + cell.elev * 0.10);
      ctx.fill();

      // 地形细节
      if (hs > 18) drawTerrainDetail(cell, sc, hs, c, r);

      // 工事层
      if (cell.fort) {
        hexPath(ctx, sc.x, sc.y, hs * 0.72);
        ctx.fillStyle = 'rgba(120,100,70,0.35)';
        ctx.fill();
        ctx.strokeStyle = '#c8b088';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // 雷场
      if (cell.mine) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = cell.mine === 1 ? '#c04a4a'
                       : cell.mine === 2 ? '#c08840'
                       : '#c04040';
        hexPath(ctx, sc.x, sc.y, hs * 0.5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(7, hs * 0.35)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✳', sc.x, sc.y);
        ctx.restore();
      }

      // 高程标记
      if (cell.elev > 0 && G.cam.z > 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.font = `${Math.max(7, hs * 0.26)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('▲' + cell.elev, sc.x - hs * 0.8, sc.y - hs * 0.85);
      }

      // 网格（叠加在格子最上）
      if (drawGrid) {
        hexPath(ctx, sc.x, sc.y, hs * 0.99);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}