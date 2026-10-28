/* ============================================================
 * MTW ui/hud.js
 * ★ updateUI 主入口 + updateStatus + 侧栏切换 + 结束回合按钮
 * 依赖：sidebar-left / sidebar-right / ew-console / taskforce-panel
 *       / macro-panel / ai/speed
 * ============================================================ */
'use strict';

/* ---------- 主入口：分发到各子面板 ---------- */
function updateUI() {
  if (typeof updateLeftPanel === 'function') updateLeftPanel();
  if (typeof updateRightPanel === 'function') updateRightPanel();
  if (typeof updateEWPanel === 'function') updateEWPanel();
  if (typeof renderTaskForcePanel === 'function') renderTaskForcePanel();

  // 结束回合按钮
  const btnEnd = document.getElementById('btnEnd');
  if (btnEnd) {
    if (G.aiRunning) {
      btnEnd.textContent = '⏹ 取消AI';
      btnEnd.classList.add('cancel-ai');
    } else {
      btnEnd.textContent = '结束回合 ▶';
      btnEnd.classList.remove('cancel-ai');
    }
  }

  // 已选数
  const cnt = document.getElementById('macroSelCount');
  if (cnt) cnt.textContent = (G.selectedUnits ? G.selectedUnits.length : 0) + ' 选中';

  // 雷达面板
  if (typeof updateRadarPanel === 'function') updateRadarPanel();
}

/* ---------- 状态栏 ---------- */
function updateStatus() {
  const el = document.getElementById('stCoord');
  const zh = document.getElementById('stZoom');
  if (!el || !zh) return;

  if (G.hover && inBounds(G.hover.c, G.hover.r)) {
    const cell = cellAt(G.hover.c, G.hover.r);
    const t = TERRAIN[cell.t];
    const obs = G.sel ? isCellObserved(G.hover.c, G.hover.r, G.side) : false;
    el.textContent = `格(${G.hover.c},${G.hover.r}) ${t.n} 高程${cell.elev}` +
      `${cell.fort ? ' 工事' + cell.fort : ''}` +
      `${cell.mine ? ' 雷场' : ''}` +
      `${cell.road ? ' 道路' : ''}` +
      `${obs ? ' 👁' : ''}`;
  } else {
    el.textContent = '—';
  }
  zh.textContent = Math.round(G.cam.z * 100) + '%';
}

/* ---------- 侧栏切换 ---------- */
window.toggleSidebar = function (side) {
  const el = document.getElementById(side);
  if (!el) return;
  el.classList.toggle('collapsed');
  const btn = document.getElementById(side === 'left' ? 'btnToggleLeft' : 'btnToggleRight');
  if (btn) {
    if (el.classList.contains('collapsed')) {
      btn.textContent = side === 'left' ? '▶' : '◀';
    } else {
      btn.textContent = side === 'left' ? '◀ 收起' : '收起 ▶';
    }
  }
  setTimeout(() => {
    resize();
    draw();
  }, 300);
};

/* ---------- 结束回合按钮 ---------- */
function bindEndTurnButton() {
  const btn = document.getElementById('btnEnd');
  if (!btn) return;
  btn.onclick = () => {
    if (G.aiRunning) {
      G.aiAbort = true;
      log('正在取消 AI…', 'lg-sys');
      if (typeof forceAbortAI === 'function') forceAbortAI();
      return;
    }
    if (G.ai[G.side]) return;
    endTurn();
  };
}

/* ---------- 双方 AI 切换按钮 ---------- */
function bindAIToggleButtons() {
  const b0 = document.getElementById('btnSide0ai');
  const b1 = document.getElementById('btnSide1ai');
  if (b0) {
    b0.onclick = () => {
      G.ai[0] = !G.ai[0];
      b0.textContent = '蓝方：' + (G.ai[0] ? 'AI' : '人类');
      if (G.ai[G.side] && !G.aiRunning) setTimeout(() => runAI(G.side), 300);
    };
  }
  if (b1) {
    b1.onclick = () => {
      G.ai[1] = !G.ai[1];
      b1.textContent = '红方：' + (G.ai[1] ? 'AI' : '人类');
      if (G.ai[G.side] && !G.aiRunning) setTimeout(() => runAI(G.side), 300);
    };
  }
  if (b0) b0.textContent = '蓝方：' + (G.ai[0] ? 'AI' : '人类');
  if (b1) b1.textContent = '红方：' + (G.ai[1] ? 'AI' : '人类');
}
/* ---------- 沙盒模式开关 ---------- */
function bindSandboxButton() {
  const btn = document.getElementById('btnSandbox');
  if (!btn) return;
  btn.onclick = () => {
    G.sandbox = !G.sandbox;
    btn.textContent = `🧪 沙盒：${G.sandbox ? '开' : '关'}`;
    btn.classList.toggle('active', G.sandbox);
    log(`🧪 沙盒模式 ${G.sandbox ? '已开启（不判定胜负）' : '已关闭'}`, 'lg-ok');
    updateUI();
  };
}