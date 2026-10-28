/* ============================================================
 * MTW ai/speed.js
 * AI 执行速度控制（0.25x–5x）+ 暂停/继续 + 中止
 * 依赖：state / log / ai/tactics
 * ============================================================ */
'use strict';

/* ---------- 速度状态 ---------- */
const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4, 5];

window.aiSpeed = {
  speeds: SPEEDS,
  speed: 1,
  paused: false,
  _timers: new Set(),
  setSpeed(v) {
    v = parseFloat(v);
    if (!SPEEDS.includes(v)) return;
    this.speed = v;
    updateSpeedPanel();
  },
  pause()  { this.paused = true;  updateSpeedPanel(); },
  resume() { this.paused = false; updateSpeedPanel(); },
  toggle() { this.paused ? this.resume() : this.pause(); }
};

/* ---------- 劫持 setTimeout ----------
 * 关键：仅当 G.aiRunning 为真时施加缩放与暂停
 * 非 AI 场景完全透传，避免影响正常逻辑
 */
const realSetTimeout = window.setTimeout.bind(window);

window.setTimeout = function (fn, ms, ...rest) {
  if (!G.aiRunning) return realSetTimeout(fn, ms, ...rest);
  const S = window.aiSpeed;
  const delay = Math.max(1, (ms || 0) / S.speed);
  let myId = null;

  const wrapped = function tick() {
    if (myId) S._timers.delete(myId);
    if (G.aiAbort) return;
    if (S.paused) {
      myId = realSetTimeout(tick, 80);
      S._timers.add(myId);
      return;
    }
    try {
      fn(...rest);
    } catch (err) {
      console.error('[aiCall]', err);
    }
  };
  myId = realSetTimeout(wrapped, delay);
  S._timers.add(myId);
  return myId;
};

/* ---------- 面板 ---------- */
let aiSpeedPanelEl = null;

function buildSpeedPanel() {
  if (document.getElementById('aiSpeedPanel')) {
    aiSpeedPanelEl = document.getElementById('aiSpeedPanel');
    return;
  }
  const stage = document.getElementById('stage');
  if (!stage) return;

  const el = document.createElement('div');
  el.id = 'aiSpeedPanel';
  el.innerHTML = `
    <div class="speed-wrap">
      <span class="speed-title">AI 执行</span>
      <button id="aiPauseBtn" class="sm" style="min-width:68px;padding:3px 8px;background:#1f6feb;border-color:#79c0ff;color:#fff;font-weight:700;border-radius:4px;cursor:pointer">⏸ 暂停</button>
      <select id="aiSpeedSel">
        ${SPEEDS.map(s => `<option value="${s}" ${s === 1 ? 'selected' : ''}>${s}×</option>`).join('')}
      </select>
      <button id="aiStopBtn" class="sm" title="中止AI" style="min-width:34px;padding:3px 6px;background:#8b2020;border-color:#f85149;color:#fff;border-radius:4px;cursor:pointer">✕</button>
    </div>
  `;
  el.style.display = 'none';
  stage.appendChild(el);
  aiSpeedPanelEl = el;

  document.getElementById('aiPauseBtn').onclick = () => window.aiSpeed.toggle();
  document.getElementById('aiSpeedSel').onchange = e => window.aiSpeed.setSpeed(e.target.value);
  document.getElementById('aiStopBtn').onclick = () => {
    G.aiAbort = true;
    log('✕ 用户中止 AI', 'lg-sys');
    if (typeof forceAbortAI === 'function') forceAbortAI();
  };
}

function updateSpeedPanel() {
  const btn = document.getElementById('aiPauseBtn');
  const sel = document.getElementById('aiSpeedSel');
  if (btn) {
    btn.textContent = window.aiSpeed.paused ? '▶ 继续' : '⏸ 暂停';
    btn.style.background = window.aiSpeed.paused ? '#3fb950' : '#1f6feb';
    btn.style.borderColor = window.aiSpeed.paused ? '#79ffa0' : '#79c0ff';
  }
  if (sel && parseFloat(sel.value) !== window.aiSpeed.speed) {
    sel.value = window.aiSpeed.speed;
  }
}

function showSpeedPanel() {
  if (aiSpeedPanelEl) aiSpeedPanelEl.style.display = 'block';
  window.aiSpeed.paused = false;
  window.aiSpeed.speed = 1;
  updateSpeedPanel();
}
function hideSpeedPanel() {
  if (aiSpeedPanelEl) aiSpeedPanelEl.style.display = 'none';
  window.aiSpeed.paused = false;
  window.aiSpeed._timers.forEach(id => clearTimeout(id));
  window.aiSpeed._timers.clear();
}

/* ---------- 监视 G.aiRunning 变化 ---------- */
let _lastAiRunning = false;
setInterval(() => {
  if (G.aiRunning && !_lastAiRunning) showSpeedPanel();
  else if (!G.aiRunning && _lastAiRunning) hideSpeedPanel();
  _lastAiRunning = G.aiRunning;
}, 100);

/* ---------- AI 运行时快捷键（捕获阶段，优先于 game/input） ---------- */
window.addEventListener('keydown', e => {
  if (!G.aiRunning) return;
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;

  if (e.key === ' ') {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.aiSpeed.toggle();
    return;
  }
  if (e.key === 'P' || e.key === 'p') {
    if (e.shiftKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.aiSpeed.toggle();
    }
    return;
  }
  const map = {'1': 1, '2': 2, '3': 4, '4': 5, '5': 0.5, '6': 0.25, '0': 1.5};
  if (map[e.key] !== undefined) {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.aiSpeed.setSpeed(map[e.key]);
  }
}, true);

/* ---------- 启动 ---------- */
function bootSpeed() {
  buildSpeedPanel();
  updateSpeedPanel();
}
if (document.readyState !== 'loading') bootSpeed();
else window.addEventListener('DOMContentLoaded', bootSpeed);