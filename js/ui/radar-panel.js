/* ============================================================
 * MTW ui/radar-panel.js
 * 雷达/导弹控制面板（原 MODULE 6 的 UI 部分）
 * ============================================================ */
'use strict';

function buildRadarPanel() {
  const aside = document.getElementById('right');
  if (!aside || document.getElementById('radarPanel')) return;
  const panel = document.createElement('div');
  panel.id = 'radarPanel';
  panel.className = 'panel';
  panel.innerHTML = `<h3>雷达 / 导弹</h3><div id="radarPanelContent"><div class="hint">选中带雷达的单位</div></div>`;
  const first = aside.querySelector('.panel');
  if (first) first.after(panel);
  else aside.prepend(panel);
}

function updateRadarPanel() {
  const box = document.getElementById('radarPanelContent');
  if (!box) return;
  const u = G.sel;
  if (!u || u.dead) { box.innerHTML = '<div class="hint">选中带雷达的单位</div>'; return; }
  const rp = radarParams(u);
  if (!rp) { box.innerHTML = '<div class="hint">该单位无雷达</div>'; return; }

  const expo = Math.min(100, (u.exposureLevel || 0) * 100);
  const locks = G.units.filter(t =>
    !t.dead && t.side !== u.side &&
    t.trackProgress && t.trackProgress[u.side] >= 1
  ).length;

  box.innerHTML = `
    <div class="row"><span class="k">状态</span><span class="v" style="color:${u.radarOn ? '#3fb950' : '#6e7681'}">${u.radarOn ? '开机' : '关机'}</span></div>
    <div class="row"><span class="k">频段</span><span class="v">${rp.band}</span></div>
    <div class="row"><span class="k">探测距离</span><span class="v">${rp.maxRangeHex.toFixed(1)} 格</span></div>
    <div class="row"><span class="k">暴露度</span><span class="v" style="color:${expo > 50 ? '#f85149' : expo > 10 ? '#d29922' : '#3fb950'}">${expo.toFixed(0)}%</span></div>
    <div class="row"><span class="k">已锁定</span><span class="v">${locks}</span></div>
    <div style="display:flex;gap:4px;margin-top:4px">
      <button id="btnRadarToggle" class="sm" style="flex:1">${u.radarOn ? '📡 关机' : '📡 开机'}</button>
      <button id="btnRadarInt" class="sm" style="flex:1">${u.radarIntermittent ? '⏸ 关间歇' : '⏱ 间歇开机'}</button>
    </div>
    <div class="hint" style="margin-top:4px">保持雷达开机 → 暴露位置 → 敌方反辐射导弹锁定</div>
  `;
  document.getElementById('btnRadarToggle').onclick = () => { toggleRadar(u); updateRadarPanel(); draw(); };
  document.getElementById('btnRadarInt').onclick = () => { u.radarIntermittent = !u.radarIntermittent; updateRadarPanel(); };
}