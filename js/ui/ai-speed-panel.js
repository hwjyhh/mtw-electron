/* ============================================================
 * MTW ui/ai-speed-panel.js
 * AI 速度面板扩展入口
 *
 * 说明：面板的完整构建与事件绑定已在 js/ai/speed.js 中实现
 *       （buildSpeedPanel / updateSpeedPanel / showSpeedPanel / hideSpeedPanel）。
 *       本文件仅作为"UI 层占位"，方便以后迁移或扩展（如增加速度曲线、AI 日志视图等）。
 * ============================================================ */
'use strict';

/* 预留：若以后要从 speed.js 抽出面板，可在此实现以下函数：
 *   - buildAiSpeedPanel()      （替代 buildSpeedPanel）
 *   - updateAiSpeedPanel()     （替代 updateSpeedPanel）
 *   - showAiSpeedPanel() / hideAiSpeedPanel()
 * 当前由 speed.js 内部自动调用，本文件不重复定义。
 */

(function () {
  // 仅在未提供内置实现时兜底初始化
  if (typeof window.aiSpeed === 'undefined') {
    console.warn('[ai-speed-panel] aiSpeed 未定义，跳过速度面板初始化');
  }
})();