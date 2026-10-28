/* ============================================================
 * MTW render/canvas.js
 * Canvas 上下文 / 尺寸 / 坐标变换
 * 依赖：constants
 * ============================================================ */
'use strict';

const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');

let VW = 0, VH = 0, DPR = 1;

function resize() {
  const stage = document.getElementById('stage');
  DPR = window.devicePixelRatio || 1;
  VW = stage.clientWidth;
  VH = stage.clientHeight;
  cv.width  = VW * DPR;
  cv.height = VH * DPR;
  cv.style.width  = VW + 'px';
  cv.style.height = VH + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener('resize', () => {
  resize();
  if (typeof draw === 'function') draw();
});

/* ---------- 坐标变换 ---------- */
const worldToScreen = (x, y) => ({
  x: (x - G.cam.x) * G.cam.z + VW / 2,
  y: (y - G.cam.y) * G.cam.z + VH / 2
});

const screenToWorld = (sx, sy) => ({
  x: (sx - VW / 2) / G.cam.z + G.cam.x,
  y: (sy - VH / 2) / G.cam.z + G.cam.y
});