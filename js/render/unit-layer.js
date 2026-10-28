/* ============================================================
 * MTW render/unit-layer.js
 * 单位绘制 + 朝向箭头
 * 依赖：constants / geometry / state / canvas / movement / visibility
 * ============================================================ */
'use strict';

/* ---------- 朝向箭头 ---------- */
function drawFacingArrow(cx, cy, facing, r, color, lw) {
  const dir = DIR_PIX[facing % 6];
  const tipX = cx + dir[0] * r, tipY = cy + dir[1] * r;
  const baseX = cx + dir[0] * r * 0.6, baseY = cy + dir[1] * r * 0.6;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(tipX, tipY); ctx.stroke();
  const aBack = Math.atan2(dir[1], dir[0]) + Math.PI;
  ctx.beginPath(); ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + Math.cos(aBack + 0.5) * r * 0.25, tipY + Math.sin(aBack + 0.5) * r * 0.25);
  ctx.lineTo(tipX + Math.cos(aBack - 0.5) * r * 0.25, tipY + Math.sin(aBack - 0.5) * r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ---------- 单单位绘制 ---------- */
function drawUnit(u) {
  const world = unitDrawPos(u);
  const hs = HS * G.cam.z;
  let sc = worldToScreen(world.x, world.y);

  // 后坐力偏移
  if (u.recoil && u.recoil.until > performance.now()) {
    const t = (u.recoil.until - performance.now()) / 140;
    sc = {x: sc.x + u.recoil.dx * t, y: sc.y + u.recoil.dy * t};
  }

  const natCol = NAT_INFO[u.def.nation].col;
  const sideCol = u.side === 0 ? '#4a90d9' : '#d9534f';
  const isSpotted = u.spotted[G.side] || u.side === G.side;

  // 确保雷达字段存在（旧存档兼容）
  if (u.radarOn === undefined) u.radarOn = true;

  ctx.save();

  // 移动拖尾
  if (u.moving && u.movePath.length > 1) {
    const idx = Math.min(Math.floor(u.moveProgress), u.movePath.length - 2);
    const a = u.movePath[idx];
    const wa = hexCenter(a.c, a.r, HS);
    const sa = worldToScreen(wa.x, wa.y);
    ctx.strokeStyle = u.side === 0 ? 'rgba(74,144,217,0.6)' : 'rgba(217,83,79,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sc.x, sc.y); ctx.stroke();
  }

  // 底盘光晕
  ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = u.side === 0 ? 'rgba(30,70,120,0.5)' : 'rgba(120,30,30,0.5)';
  if (!isSpotted) ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;

  // 单位框
  const bw = hs * 0.95, bh = hs * 0.62;
  ctx.fillStyle = 'rgba(10,15,22,0.92)';
  ctx.strokeStyle = sideCol;
  ctx.lineWidth = Math.max(1.2, hs * 0.07);
  ctx.beginPath(); ctx.rect(sc.x - bw / 2, sc.y - bh / 2, bw, bh);
  ctx.fill(); ctx.stroke();

  // 类别符号
  const sym = CAT_SYM[u.def.cat] || '?';
  ctx.fillStyle = (CAT_INFO[u.def.cat] || {col: '#aaa'}).col;
  ctx.font = `bold ${Math.max(9, hs * 0.42)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sym, sc.x, sc.y + 1);

  // 国家色条
  ctx.fillStyle = natCol;
  ctx.fillRect(sc.x - bw / 2, sc.y - bh / 2, bw, Math.max(2, hs * 0.09));

  // 名称
  if (G.cam.z > 0.75) {
    ctx.fillStyle = isSpotted ? '#e6edf3' : '#6e7681';
    ctx.font = `${Math.max(8, hs * 0.26)}px "Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nm = u.def.name.length > 9 ? u.def.name.slice(0, 9) + '…' : u.def.name;
    ctx.fillText(nm, sc.x, sc.y + bh / 2 + 2);
  }

  // 血条
  const hpr = clamp(u.hp / u.maxHp, 0, 1);
  const barW = bw * 0.9, barH = Math.max(2, hs * 0.08);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(sc.x - barW / 2, sc.y - bh / 2 - barH - 2, barW, barH);
  ctx.fillStyle = hpr > 0.6 ? '#3fb950' : hpr > 0.3 ? '#d29922' : '#f85149';
  ctx.fillRect(sc.x - barW / 2, sc.y - bh / 2 - barH - 2, barW * hpr, barH);

  // APS / ERA 标记
  if (u.def.aps > 0 || u.def.era > 0) {
    let tag = '';
    if (u.def.aps > 0) tag += 'A';
    if (u.def.era > 0) tag += 'E';
    if (tag) {
      ctx.fillStyle = u.def.aps > 0 ? '#e08bff' : '#d29922';
      ctx.font = `bold ${Math.max(7, hs * 0.22)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(tag, sc.x - bw / 2 + 2, sc.y - bh / 2 - 1);
    }
  }

  // 载员
  if (u.cargo && u.cargo.length > 0) {
    ctx.fillStyle = '#79c0ff';
    ctx.font = `bold ${Math.max(7, hs * 0.24)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('+' + u.cargo.length, sc.x + bw / 2 - 2, sc.y - bh / 2 - 1);
  }

  // 压制标记
  if (u.sup > 3) {
    ctx.fillStyle = u.sup > 12 ? '#f85149' : '#d29922';
    ctx.font = `bold ${Math.max(8, hs * 0.3)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('!', sc.x + bw / 2, sc.y - bh / 2 - 2);
  }

  // 已行动
  if (u.side === G.side && u.mp <= 0 && u.fired.every(f => f >= 1) && !u.moving) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 被干扰
  if (u.jamming > 4 || u.pulseStunned > 0) {
    ctx.strokeStyle = '#d0a0e0';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.80, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d0a0e0';
    ctx.font = `bold ${Math.max(8, hs * 0.25)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('📡', sc.x - bw / 2 - 2, sc.y + bh / 2 + 2);
  }

  // 通信链路数值
  if (G.commLinks[u.side].strength < 80) {
    const link = G.commLinks[u.side].strength;
    ctx.fillStyle = link > 60 ? '#d29922' : link > 30 ? '#f0883e' : '#f85149';
    ctx.font = `bold ${Math.max(7, hs * 0.22)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(link.toFixed(0) + '%', sc.x + bw / 2 - 2, sc.y + bh / 2 + 1);
  }

  // 诱饵
  if (u.decoyActive) {
    ctx.strokeStyle = '#e06a9a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.90, 0, Math.PI * 2); ctx.stroke();
  }

  // 护盾
  if (u.shieldTurns && u.shieldTurns > 0) {
    ctx.strokeStyle = '#7ee787';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.95, 0, Math.PI * 2); ctx.stroke();
  }

  // 破译标记
  if (u.cryptoBrokenBy != null) {
    ctx.strokeStyle = '#f0883e';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 1.0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f0883e';
    ctx.font = `bold ${Math.max(7, hs * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🔐', sc.x, sc.y - bh / 2 - 3);
  }

  // 破译进度条
  if (u.cryptoProgress > 0 && u.cryptoBrokenBy == null) {
    const pct = clamp(u.cryptoProgress / CRYPTO_INFO.threshold, 0, 1);
    const cpW = bw * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(sc.x - cpW / 2, sc.y + bh / 2 + 12, cpW, 3);
    ctx.fillStyle = '#f0883e';
    ctx.fillRect(sc.x - cpW / 2, sc.y + bh / 2 + 12, cpW * pct, 3);
  }

  // 朝向
  if (G.opt.face) drawFacingArrow(sc.x, sc.y, u.facing, hs * 0.55, sideCol, 1.8);

  // 未侦察
  if (!isSpotted) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // 空中标记
  if (u.def.mob === 'air') {
    ctx.fillStyle = 'rgba(120,200,255,0.8)';
    ctx.font = `bold ${Math.max(7, hs * 0.22)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('▲', sc.x - bw / 2, sc.y + bh / 2 + 2);
  }

  // 姿态标记
  if (['INF','SF','RECON','ENG'].includes(u.def.cat)) {
    const st = STANCE_INFO[u.stance] || STANCE_INFO.defense;
    ctx.fillStyle = u.stance === 'attack' ? '#f85149'
                   : u.stance === 'defense' ? '#58a6ff'
                   : '#d29922';
    ctx.font = `${Math.max(7, hs * 0.24)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(st.icon, sc.x - bw / 2 + 2, sc.y + bh / 2 - 8);
  }

  // 脉冲眩晕
  if (u.pulseStunned > 0) {
    ctx.fillStyle = '#ff3080';
    ctx.font = `bold ${Math.max(9, hs * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('⚡', sc.x, sc.y + bh / 2 + 3);
  }

  // 雷达瘫痪
  if (u.sensorDown > 0) {
    ctx.fillStyle = '#ff3060';
    ctx.font = `bold ${Math.max(9, hs * 0.3)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('×', sc.x + bw / 2 - 2, sc.y - bh / 2 + 2);
  }

  // 移动中
  if (u.moving) {
    ctx.strokeStyle = 'rgba(255,200,60,0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.88, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/* ---------- 全部单位 ---------- */
function drawAllUnits() {
  G.units.forEach(u => {
    if (u.dead || u.carriedBy) return;
    if (!isVisible(u, G.side)) return;
    drawUnit(u);
  });
}