/* ============================================================
 * MTW render/draw.js
 * ★ 唯一的 draw() —— 合并原先 3 层覆盖
 * 依赖：canvas / terrain-layer / unit-layer / effects / overlays
 * ============================================================ */
'use strict';

function draw() {
  if (!G.map) return;

  // 清屏
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, VW, VH);

  ctx.save();

  // 屏幕抖动（单次衰减）
  if (G.screenShake && G.screenShake > 0) {
    const sx = (Math.random() - 0.5) * G.screenShake;
    const sy = (Math.random() - 0.5) * G.screenShake;
    ctx.translate(sx, sy);
    G.screenShake *= 0.9;
    if (G.screenShake < 0.5) G.screenShake = 0;
  }

  // 地形层（含网格/工事/雷场/高程）
  renderTerrain();

  // 信息叠加层（地形之上、单位之下）
  if (G.opt.obs) renderObsRange();
  if (G.opt.ew)  renderEWCoverage();
  renderCounterBatteryMarks();
  renderSelectedUnitRange();
  renderHoverHighlight();
  renderMovePath();
  renderLOSPreview();

  // 残骸
  renderWrecks();

  // 单位
  drawAllUnits();

  // 单位之上：雷达 / 导弹 / NEZ / 探测条
  renderRadarOverlays();
  renderMissiles();
  renderNEZ();
  renderDetectionBars();

  // 战斗群包围圈
  renderTaskForceEnclosures();

  // UI 叠加
  renderSelectionBox();
  renderMultiSelection();

  // 特效（最上层）
  renderEffects();

  // 战场横幅
  updateSideBanner();

  ctx.restore();
}

/* ---------- 战场横幅（DOM 更新） ---------- */
function updateSideBanner() {
  const banner = document.getElementById('sideBanner');
  if (!banner) return;
  banner.textContent = G.gameOver
    ? '战斗结束'
    : (G.side === 0
        ? `蓝方行动（${NAT_INFO[G.sideNat[0]].n}）`
        : `红方行动（${NAT_INFO[G.sideNat[1]].n}）`);
  banner.style.color = G.side === 0 ? '#79c0ff' : '#ff7b72';
  banner.style.borderColor = G.side === 0 ? '#1f6feb' : '#8b2020';
}