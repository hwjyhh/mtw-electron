/* ============================================================
 * MTW ui/sidebar-left.js
 * 左侧面板：态势 / 电磁态势 / 选中单位 / 战场日志
 * 依赖：constants / state / visibility / hud
 * ============================================================ */
'use strict';

function buildLeftSidebar() {
  const aside = document.getElementById('left');
  if (!aside) return;
  aside.innerHTML = `
    <div class="panel">
      <h3>态势</h3>
      <div class="row"><span class="k">回合</span><span class="v" id="iTurn">1</span></div>
      <div class="row"><span class="k">行动方</span><span class="v" id="iSide">蓝方</span></div>
      <div class="row"><span class="k">蓝方</span><span class="v" id="iP0">0</span></div>
      <div class="row"><span class="k">红方</span><span class="v" id="iP1">0</span></div>
      <div class="row"><span class="k">蓝方分数</span><span class="v" id="iScore0" style="color:#79c0ff">0</span></div>
      <div class="row"><span class="k">红方分数</span><span class="v" id="iScore1" style="color:#ff7b72">0</span></div>
      <div class="row"><span class="k">AI难度</span><span class="v" id="iDiff" style="color:#f0b72f">中</span></div>
      <div class="row"><span class="k">AI偏好</span><span class="v" id="iPref" style="color:#e06a9a">综合</span></div>
    </div>
    <div class="panel">
      <h3>电磁态势</h3>
      <div class="ewBar"><span style="width:70px">蓝方干扰</span><div class="bar"><i id="iEW0bar" style="width:0%;background:#4a90d9"></i></div><span id="iEW0" style="width:32px;text-align:right">0</span></div>
      <div class="ewBar"><span style="width:70px">红方干扰</span><div class="bar"><i id="iEW1bar" style="width:0%;background:#d9534f"></i></div><span id="iEW1" style="width:32px;text-align:right">0</span></div>
      <div class="row"><span class="k">蓝方通信链路</span><span class="v" id="iComm0" style="color:#79c0ff">100%</span></div>
      <div class="row"><span class="k">红方通信链路</span><span class="v" id="iComm1" style="color:#ff7b72">100%</span></div>
      <div class="row"><span class="k">战场电磁压制</span><span class="v" id="iEWJam" style="color:#d0a0e0">—</span></div>
      <h3 style="margin-top:6px">密码破译进度</h3>
      <div class="ewBar"><span style="width:70px">蓝破红</span><div class="bar"><i id="iCrypt0bar" style="width:0%;background:#4a90d9"></i></div><span id="iCrypt0" style="width:32px;text-align:right">0%</span></div>
      <div class="ewBar"><span style="width:70px">红破蓝</span><div class="bar"><i id="iCrypt1bar" style="width:0%;background:#d9534f"></i></div><span id="iCrypt1" style="width:32px;text-align:right">0%</span></div>
    </div>
    <div class="panel"><h3>选中单位</h3><div id="selInfo"><div class="hint">点击地图上的棋子查看详情</div></div></div>
    <div class="panel" style="flex:1;display:flex;flex-direction:column;min-height:0">
      <h3>战场日志</h3>
      <div id="logbox" style="flex:1"></div>
    </div>
  `;
}

function updateLeftPanel() {
  document.getElementById('iTurn').textContent = G.turn;
  document.getElementById('iSide').textContent = G.side === 0 ? '蓝方' : '红方';
  document.getElementById('iP0').textContent = G.units.filter(u => !u.dead && u.side === 0).reduce((s, u) => s + u.hp, 0).toFixed(0);
  document.getElementById('iP1').textContent = G.units.filter(u => !u.dead && u.side === 1).reduce((s, u) => s + u.hp, 0).toFixed(0);
// 🧪 计算双方存活棋子的总分数
  const score0 = G.units.filter(u => !u.dead && u.side === 0).reduce((s, u) => s + (u.def.pts || 0), 0);
  const score1 = G.units.filter(u => !u.dead && u.side === 1).reduce((s, u) => s + (u.def.pts || 0), 0);
  document.getElementById('iScore0').textContent = score0;
  document.getElementById('iScore1').textContent = score1;
  const enemySide = 1 - G.side;
  const d = G.aiDifficulty[enemySide] || 'medium';
  const p = G.aiPreference[enemySide] || 'balanced';
  const dEl = document.getElementById('iDiff'), pEl = document.getElementById('iPref');
  if (dEl) { dEl.textContent = AI_DIFFICULTIES[d].n; dEl.style.color = AI_DIFFICULTIES[d].color; }
  if (pEl) { pEl.textContent = AI_PREFERENCES[p].n; }

  const ew0 = G.units.filter(u => !u.dead && u.side === 0 && u.def.ew.jam > 0).reduce((s, u) => s + u.def.ew.jam, 0);
  const ew1 = G.units.filter(u => !u.dead && u.side === 1 && u.def.ew.jam > 0).reduce((s, u) => s + u.def.ew.jam, 0);
  const maxEW = Math.max(ew0, ew1, 20);
  document.getElementById('iEW0').textContent = ew0;
  document.getElementById('iEW1').textContent = ew1;
  document.getElementById('iEW0bar').style.width = (ew0 / maxEW * 100) + '%';
  document.getElementById('iEW1bar').style.width = (ew1 / maxEW * 100) + '%';

  document.getElementById('iComm0').textContent = G.commLinks[0].strength.toFixed(0) + '%';
  document.getElementById('iComm1').textContent = G.commLinks[1].strength.toFixed(0) + '%';

  const totalJam = G.units.filter(u => !u.dead).reduce((s, u) => s + u.jamming, 0);
  document.getElementById('iEWJam').textContent = totalJam.toFixed(1);

  const c0 = G.crypto[0], c1 = G.crypto[1];
  document.getElementById('iCrypt0bar').style.width = (c0.progress / CRYPTO_INFO.threshold * 100) + '%';
  document.getElementById('iCrypt1bar').style.width = (c1.progress / CRYPTO_INFO.threshold * 100) + '%';
  document.getElementById('iCrypt0').textContent = c0.progress.toFixed(0) + '%';
  document.getElementById('iCrypt1').textContent = c1.progress.toFixed(0) + '%';

  updateSelInfo();
}

/* ---------- 选中单位详情 ---------- */
function updateSelInfo() {
  const si = document.getElementById('selInfo');
  if (!si) return;

  if (!G.sel || G.sel.dead) {
    si.innerHTML = '<div class="hint">点击地图上的棋子查看详情</div>';
    return;
  }

  const u = G.sel, d = u.def;
  const hpr = clamp(u.hp / u.maxHp, 0, 1) * 100;

  const wpnHtml = d.weapons.map((w, i) => {
    const am = u.ammo[i];
    const cost = Math.max(1, Math.round(w.rof));
    const fireable = am >= cost && u.fired[i] < 1;
    const sel = G.selectedWeapons.includes(i);
    const ranged = canAreaFire(w) ? ' 🎯' : '';
    const airMark = canEngageAir(w) ? ' ✈' : '';
    const jammed = w.band && u.jammedBands.has(w.band);
    const firedTag = u.fired[i] >= 1 ? ' ✔' : '';
    return `<div class="row" style="font-size:10px;background:${sel ? '#1f6feb33' : ''}">
      <span class="k">${i + 1}. ${w.n}${ranged}${airMark}${jammed ? ' 📡' : ''}${firedTag}</span>
      <span class="v" style="color:${jammed ? '#d0a0e0' : fireable ? '#3fb950' : '#6e7681'}">${am}/${w.ammo} R${w.r}</span>
    </div>`;
  }).join('');

  let capHtml = '';
  if (d.cap) d.cap.split(',').forEach(c => { capHtml += `<span class="chip">${c}</span>`; });

  let protHtml = '';
  if (d.aps > 0)  protHtml += `<span class="chip" style="background:#3a1f4a;color:#e08bff">APS Lv${d.aps}</span>`;
  if (d.era > 0)  protHtml += `<span class="chip" style="background:#4a3f1f;color:#d29922">ERA Lv${d.era}</span>`;
  if (d.ew.jam > 0)    protHtml += `<span class="ewTag">干扰${d.ew.jam}</span>`;
  if (d.ew.eccm > 0)   protHtml += `<span class="ewTag">抗扰${d.ew.eccm}</span>`;
  if (d.ew.decoy > 0)  protHtml += `<span class="ewTag">诱饵${d.ew.decoy}</span>`;

  let jamInfo = '';
  if (u.jamming > 0.5) {
    jamInfo = `<div class="row"><span class="k">📡 被干扰</span><span class="v" style="color:#d0a0e0">${u.jamming.toFixed(1)}</span></div>`;
    if (u.jammedBands.size > 0) {
      jamInfo += `<div class="row"><span class="k">压制频段</span><span class="v" style="color:#d0a0e0;font-size:9.5px">${[...u.jammedBands].join(',')}</span></div>`;
    }
  }

  let cryptoInfo = '';
  if (u.cryptoBrokenBy != null) {
    cryptoInfo = `<div class="row"><span class="k">🔐 状态</span><span class="v" style="color:#f0883e">已被破译</span></div>`;
  } else if (u.cryptoProgress > 0) {
    cryptoInfo = `<div class="row"><span class="k">🔐 破译进度</span><span class="v" style="color:#f0883e">${u.cryptoProgress.toFixed(0)}%</span></div>`;
  }

  const facingNames = ['北', '东北', '东南', '南', '西南', '西北'];
  const stanceTxt = ['INF','SF','RECON','ENG'].includes(d.cat)
    ? `${STANCE_INFO[u.stance].icon} ${STANCE_INFO[u.stance].n}`
    : '—';

  si.innerHTML = `
    <div style="font-weight:700;font-size:12px;color:${NAT_INFO[d.nation].col};margin-bottom:3px">${d.name}</div>
    <div style="margin-bottom:4px">
      <span class="tag ${d.nation}">${NAT_INFO[d.nation].n}</span>
      <span class="chip">${(CAT_INFO[d.cat] || {n: d.cat}).n}</span>
      <span class="chip">${d.echelon}</span>
      <span class="chip">${d.pts}分</span>
    </div>
    ${capHtml ? `<div style="margin-bottom:4px">${capHtml}</div>` : ''}
    ${protHtml ? `<div style="margin-bottom:4px">${protHtml}</div>` : ''}
    <div class="row"><span class="k">兵力</span><span class="v">${u.hp.toFixed(1)}/${u.maxHp}</span></div>
    <div class="bar"><i style="width:${hpr}%;background:${hpr > 60 ? '#3fb950' : hpr > 30 ? '#d29922' : '#f85149'}"></i></div>
    <div class="row"><span class="k">士气/压制</span><span class="v">${u.morale.toFixed(1)} / ${u.sup.toFixed(1)}</span></div>
    <div class="row"><span class="k">姿态</span><span class="v">${stanceTxt}</span></div>
    <div class="row"><span class="k">朝向</span><span class="v">${facingNames[u.facing % 6]} (Q/E)</span></div>
    <div class="row"><span class="k">机动</span><span class="v">${d.mob} ${u.mp.toFixed(1)}/${d.mp} MP${u.moving ? ' 🚶' : ''}</span></div>
    <div class="row"><span class="k">装甲 前/侧/顶</span><span class="v">${d.armor.f}/${d.armor.s}/${d.armor.t}${d.addArmor ? '+' + d.addArmor : ''}</span></div>
    ${jamInfo}${cryptoInfo}
    <div style="margin-top:5px;border-top:1px solid #21262d;padding-top:4px">
      <div class="hint" style="margin-bottom:2px">武器 (1-9切换，✔=已攻击)</div>
      ${wpnHtml || '<div class="hint">无武装</div>'}
    </div>
    <div class="hint" style="margin-top:5px;font-style:italic">${d.d || ''}</div>
  `;
}