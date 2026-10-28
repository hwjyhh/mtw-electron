/* ============================================================
 * MTW input/selection.js
 * 框选初始化（左键在 select 模式下拖拽矩形选择）
 * 依赖：canvas / geometry / macro-panel / render/draw
 * ============================================================ */
'use strict';

let _boxSelStart = null;

function setupBoxSelect() {
  cv.addEventListener('mousedown', e => {
    if (e.button !== 0 || e.shiftKey) return;
    if (G.mode !== 'select') return;

    const rect = cv.getBoundingClientRect();
    _boxSelStart = {x: e.clientX - rect.left, y: e.clientY - rect.top};
    G.boxSel.active = false;
    G.boxSel.x1 = G.boxSel.x2 = _boxSelStart.x;
    G.boxSel.y1 = G.boxSel.y2 = _boxSelStart.y;
  });

  cv.addEventListener('mousemove', e => {
    if (!_boxSelStart) return;
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (Math.hypot(x - _boxSelStart.x, y - _boxSelStart.y) > 8) {
      G.boxSel.active = true;
      G.boxSel.x2 = x;
      G.boxSel.y2 = y;
      draw();
    }
  });

  window.addEventListener('mouseup', () => {
    if (!_boxSelStart) return;
    if (G.boxSel.active) {
      const c1 = Math.min(G.boxSel.x1, G.boxSel.x2);
      const c2 = Math.max(G.boxSel.x1, G.boxSel.x2);
      const y1 = Math.min(G.boxSel.y1, G.boxSel.y2);
      const y2 = Math.max(G.boxSel.y1, G.boxSel.y2);
      const corners = [
        screenToWorld(c1, y1), screenToWorld(c2, y2),
        screenToWorld(c1, y2), screenToWorld(c2, y1)
      ];
      let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
      corners.forEach(p => {
        const h = pixelToHex(p.x, p.y, HS);
        minC = Math.min(minC, h.c); maxC = Math.max(maxC, h.c);
        minR = Math.min(minR, h.r); maxR = Math.max(maxR, h.r);
      });
      if (typeof boxSelectUnits === 'function') {
        boxSelectUnits({c1: minC, c2: maxC, r1: minR, r2: maxR});
      }
      G.boxSel.active = false;
    }
    _boxSelStart = null;
    draw();
  });
}