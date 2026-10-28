/* ============================================================
 * MTW core/log.js
 * 战场日志
 * 依赖：state.js
 * ============================================================ */
'use strict';

function log(msg, cls) {
  const el = document.getElementById('logbox');
  if (!el) return;
  const d = document.createElement('div');
  d.className = cls || 'lg-info';
  d.textContent = `[T${G.turn}] ${msg}`;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  G.log.push({t: G.turn, msg, cls});
  if (G.log.length > 500) G.log.shift();
}