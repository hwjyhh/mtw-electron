/* ============================================================
 * MTW ai/watchdog.js
 * AI 卡死自愈：forceAbortAI + 8s 心跳检测 + runAI 异常兜底
 * 依赖：state / log / game/turn
 * ============================================================ */
'use strict';

/* ---------- 强制收尾 ---------- */
window.forceAbortAI = function () {
  if (window.aiSpeed && window.aiSpeed._timers) {
    window.aiSpeed._timers.forEach(id => clearTimeout(id));
    window.aiSpeed._timers.clear();
  }
  G.aiAbort = false;
  G.aiRunning = false;
  if (!G.gameOver) endTurn();
};

/* ---------- runAI 异常兜底 ----------
 * 包装 window.runAI：捕获未处理异常，避免 AI 链静默死亡
 * 注意：runAI 在 tactics.js 中定义，此包装在其后加载
 */
(function wrapRunAI() {
  const _orig = window.runAI;
  if (typeof _orig !== 'function') {
    console.warn('[watchdog] runAI 未定义，包装跳过');
    return;
  }
  window.runAI = function (side) {
    if (G.gameOver) return;
    try {
      return _orig.apply(this, arguments);
    } catch (err) {
      console.error('[runAI 异常] side=', side, 'err=', err);
      window.forceAbortAI();
    }
  };
})();

/* ---------- 心跳 watchdog：8s 未换边则强制收尾 ---------- */
let _watchLastSide = G.side;
let _watchStuck = 0;

setInterval(() => {
  if (!G.aiRunning) {
    _watchStuck = 0;
    _watchLastSide = G.side;
    return;
  }
  if (G.aiAbort) {
    _watchStuck = 0;
    return;
  }
  if (G.side !== _watchLastSide) {
    _watchLastSide = G.side;
    _watchStuck = 0;
  } else {
    _watchStuck++;
    if (_watchStuck > 40) {        // 40 × 200ms = 8s
      console.warn('[watchdog] AI 卡住 8s，强制收尾');
      _watchStuck = 0;
      window.forceAbortAI();
    }
  }
}, 200);