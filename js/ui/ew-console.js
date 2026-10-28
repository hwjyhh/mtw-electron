/* ============================================================
 * MTW ui/ew-console.js
 * 电子战控制台（DOM + 事件绑定 + 面板刷新）
 * 依赖：ew / visibility / hud
 * 说明：CSS 已在 css/overlays.css 中，本文件只做 DOM 注入和逻辑
 * ============================================================ */
'use strict';

function initEWPanel() {
  const stage = document.getElementById('stage');
  if (!stage || document.getElementById('ewConsole')) return;

  const console = document.createElement('div');
  console.id = 'ewConsole';
  console.innerHTML = `
    <div id="ewConsoleHeader">
      <h3>📡 电子战控制台</h3>
      <span class="toggle" id="ewToggleIcon">▼</span>
    </div>
    <div id="ewConsoleBody">
      <div class="ew-tabs">
        <button data-tab="freq" class="on">调频</button>
        <button data-tab="jam">干扰</button>
        <button data-tab="cipher">破译</button>
        <button data-tab="status">状态</button>
      </div>
      <div class="ew-pane on" data-pane="freq">
        <div class="ew-label"><span>主频段</span></div>
        <div class="ew-band-btns" id="ewMainBandBtns">
          ${EW_BANDS_ALL.map(b => `<button data-band="${b}">${b}</button>`).join('')}
        </div>
        <div class="ew-label"><span>频率 MHz</span><span id="ewFreqVal">100</span></div>
        <input type="range" class="ew-slider" id="ewFreqRange" min="30" max="300" value="100">
        <div class="ew-label"><span>功率 %</span><span id="ewPowerVal">50</span></div>
        <input type="range" class="ew-slider" id="ewPowerRange" min="10" max="100" value="50">
        <div class="ew-label"><span>带宽 %</span><span id="ewBandwidthVal">50</span></div>
        <input type="range" class="ew-slider" id="ewBandwidthRange" min="10" max="100" value="50">
        <div class="hint" style="margin-top:4px;font-size:9px">频率↑精度↑ 功率↑范围↑ 带宽↑压制↑</div>
        <div class="ew-actions" style="grid-template-columns:1fr">
          <button id="ewApplyFreq">✓ 应用调频</button>
        </div>
      </div>
      <div class="ew-pane" data-pane="jam">
        <div class="ew-target-box" id="ewJamTargetBox">未选择目标格</div>
        <button id="ewPickJamTarget" style="width:100%;margin:3px 0;padding:5px;background:#21262d;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;font-size:10px;cursor:pointer">🎯 在地图上选择目标格</button>
        <div class="ew-label"><span>干扰频段</span></div>
        <div class="ew-band-btns" id="ewJamBandBtns">
          ${EW_BANDS_ALL.map(b => `<button data-band="${b}">${b}</button>`).join('')}
        </div>
        <div class="ew-label"><span>作用半径</span><span id="ewJamRange">2.0格</span></div>
        <div class="ew-actions">
          <button id="ewDoJam">📡 软杀伤</button>
          <button id="ewDoARM">💥 反辐射</button>
          <button id="ewDoPulse">⚡ 电子脉冲</button>
          <button id="ewDoCounter">📻 反炮兵</button>
        </div>
      </div>
      <div class="ew-pane" data-pane="cipher">
        <div class="ew-target-box" id="ewCipherTargetBox">未选择破译目标</div>
        <button id="ewPickCipherTarget" style="width:100%;margin:3px 0;padding:5px;background:#21262d;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;font-size:10px;cursor:pointer">🔐 在地图上选择敌方目标</button>
        <div class="ew-label"><span>破译进度</span><span id="ewCipherPct">0%</span></div>
        <div class="ew-progress"><i id="ewCipherBar" style="width:0%"></i></div>
        <div class="ew-actions">
          <button id="ewStartCipher">▶ 开始破译</button>
          <button id="ewPauseCipher">⏸ 暂停</button>
        </div>
        <div class="hint" style="margin-top:4px;font-size:9px">破译后目标永久暴露 · 命中+20% · 每回合+8%</div>
      </div>
      <div class="ew-pane" data-pane="status">
        <div class="ew-status-row"><span class="k">主频段</span><span class="v" id="ewStatusBand">VHF</span></div>
        <div class="ew-status-row"><span class="k">频率</span><span class="v" id="ewStatusFreq">100MHz</span></div>
        <div class="ew-status-row"><span class="k">功率</span><span class="v" id="ewStatusPower">50%</span></div>
        <div class="ew-status-row"><span class="k">带宽</span><span class="v" id="ewStatusBW">50%</span></div>
        <div class="ew-status-row"><span class="k">本方干扰源</span><span class="v" id="ewStatusJammers">0</span></div>
        <div class="ew-status-row"><span class="k">频谱占用</span><span class="v" id="ewStatusSpec">0%</span></div>
        <div class="ew-status-row"><span class="k">通信链路</span><span class="v" id="ewStatusComm">100%</span></div>
        <div class="ew-status-row"><span class="k">破译进度</span><span class="v" id="ewStatusCipher">0%</span></div>
        <div class="ew-status-row"><span class="k">反炮兵标记</span><span class="v" id="ewStatusCB">0</span></div>
      </div>
    </div>
  `;
  stage.appendChild(console);
  bindEWPanelEvents();
  updateEWPanel();
}

function bindEWPanelEvents() {
  document.getElementById('ewConsoleHeader').onclick = () => {
    EW_MANUAL.panelOpen = !EW_MANUAL.panelOpen;
    document.getElementById('ewConsole').classList.toggle('collapsed', !EW_MANUAL.panelOpen);
    document.getElementById('ewToggleIcon').textContent = EW_MANUAL.panelOpen ? '▼' : '▶';
  };

  document.querySelectorAll('.ew-tabs button').forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      EW_MANUAL.activeTab = tab;
      document.querySelectorAll('.ew-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      document.querySelectorAll('.ew-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === tab));
    };
  });

  document.querySelectorAll('#ewMainBandBtns button').forEach(btn => {
    btn.onclick = () => {
      EW_MANUAL.band[EW_MANUAL.side] = btn.dataset.band;
      updateEWPanel();
    };
  });

  document.getElementById('ewFreqRange').oninput = e => {
    EW_MANUAL.freq[EW_MANUAL.side] = parseInt(e.target.value);
    document.getElementById('ewFreqVal').textContent = e.target.value;
    updateEWPanel();
  };
  document.getElementById('ewPowerRange').oninput = e => {
    EW_MANUAL.power[EW_MANUAL.side] = parseInt(e.target.value);
    document.getElementById('ewPowerVal').textContent = e.target.value;
    updateEWPanel();
  };
  document.getElementById('ewBandwidthRange').oninput = e => {
    EW_MANUAL.bandwidth[EW_MANUAL.side] = parseInt(e.target.value);
    document.getElementById('ewBandwidthVal').textContent = e.target.value;
    updateEWPanel();
  };

  document.getElementById('ewApplyFreq').onclick = () => {
    const side = EW_MANUAL.side;
    log(`📻 调频应用：${EW_MANUAL.band[side]} ${EW_MANUAL.freq[side]}MHz 功率${EW_MANUAL.power[side]}% 带宽${EW_MANUAL.bandwidth[side]}%`, 'lg-ew');
    updateEWPanel();
    draw();
  };

  document.querySelectorAll('#ewJamBandBtns button').forEach(btn => {
    btn.onclick = () => { EW_MANUAL.jamBand = btn.dataset.band; updateEWPanel(); };
  });

  document.getElementById('ewPickJamTarget').onclick = () => {
    EW_MANUAL.pickingTarget = 'jam';
    log('🎯 请在地图上点击目标格', 'lg-ew');
    document.getElementById('ewConsole').classList.add('ew-picking');
  };
  document.getElementById('ewPickCipherTarget').onclick = () => {
    EW_MANUAL.pickingTarget = 'cipher';
    log('🔐 请在地图上点击敌方目标', 'lg-crypto');
    document.getElementById('ewConsole').classList.add('ew-picking');
  };

  document.getElementById('ewDoJam').onclick = () => {
    const target = EW_MANUAL.selectedTarget;
    if (!target) { log('请先选择目标格', 'lg-sys'); return; }
    const jammers = G.units.filter(u => !u.dead && u.side === G.side && (u.def.ew.jam > 0 || u.def.cat === 'EW') && u.mp >= 2);
    if (!jammers.length) { log('无可用电子战单位', 'lg-sys'); return; }
    jammers.sort((a, b) => hexDist(a, target) - hexDist(b, target));
    executeJamming(jammers[0], target.c, target.r, EW_MANUAL.jamBand);
    draw();
  };
  document.getElementById('ewDoARM').onclick = () => {
    const target = EW_MANUAL.selectedTarget;
    if (!target) { log('请先选择目标格', 'lg-sys'); return; }
    const u = unitAt(target.c, target.r);
    if (!u) { log('该格无目标', 'lg-sys'); return; }
    const armUnits = G.units.filter(a => !a.dead && a.side === G.side && a.def.weapons.some(w => w.n.includes('反辐射') || w.n.includes('HARM') || w.n.includes('Kh-31')));
    if (!armUnits.length) { log('本方无反辐射单位', 'lg-sys'); return; }
    armUnits.sort((a, b) => hexDist(a, target) - hexDist(b, target));
    executeARM(armUnits[0], target.c, target.r);
    draw();
  };
  document.getElementById('ewDoPulse').onclick = () => {
    const target = EW_MANUAL.selectedTarget;
    if (!target) { log('请先选择目标格', 'lg-sys'); return; }
    const pulseUnits = G.units.filter(u => !u.dead && u.side === G.side && (u.def.ew.jam >= 10 || u.def.cat === 'EW') && u.mp >= 3);
    if (!pulseUnits.length) { log('无可用脉冲单位', 'lg-sys'); return; }
    pulseUnits.sort((a, b) => hexDist(a, target) - hexDist(b, target));
    const pulseUnit = pulseUnits[0];
    if (hexDist(pulseUnit, target) > 4) { log('脉冲单位距离过远', 'lg-sys'); return; }
    pulseUnit.mp -= 3;
    const targets = G.units.filter(u => !u.dead && u.side !== G.side && !u.carriedBy && hexDist(target, u) <= 3);
    targets.forEach(t => { t.pulseStunned = Math.max(t.pulseStunned || 0, 2); });
    addEffect('text', target.c, target.r, {dur: 50, text: '⚡脉冲', color: '#ff3080'});
    log(`⚡ ${pulseUnit.def.name} 电子脉冲 ${targets.length}单位`, 'lg-ew');
    updateUI(); draw();
  };
  document.getElementById('ewDoCounter').onclick = () => {
    const radarUnits = G.units.filter(u => !u.dead && u.side === G.side && (u.def.cap.includes('反炮兵') || u.def.sens.radar >= 5) && u.mp >= 2);
    if (!radarUnits.length) { log('本方无反炮兵雷达', 'lg-sys'); return; }
    executeCounterBattery(radarUnits[0]);
    draw();
  };

  document.getElementById('ewStartCipher').onclick = () => {
    const target = EW_MANUAL.cipherTarget;
    if (!target) { log('请先选择破译目标', 'lg-sys'); return; }
    const hasEW = G.units.some(u => !u.dead && u.side === G.side && (u.def.ew.jam >= 5 || u.def.cat === 'EW'));
    if (!hasEW) { log('本方无破译能力单位', 'lg-sys'); return; }
    G.crypto[G.side].targetUid = target.uid;
    G.crypto[G.side].targetSide = target.side;
    G.crypto[G.side].startTurn = G.turn;
    EW_MANUAL.cipherActive = true;
    log(`🔐 手动启动破译 ${target.def.name}`, 'lg-crypto');
    updateEWPanel();
  };
  document.getElementById('ewPauseCipher').onclick = () => {
    G.crypto[G.side].targetUid = null;
    G.crypto[G.side].progress = 0;
    EW_MANUAL.cipherActive = false;
    log('🔐 破译已暂停', 'lg-sys');
    updateEWPanel();
  };
}

function updateEWPanel() {
  if (!document.getElementById('ewConsole')) return;
  const side = EW_MANUAL.side;

  document.querySelectorAll('#ewMainBandBtns button').forEach(b => {
    b.classList.toggle('on', b.dataset.band === EW_MANUAL.band[side]);
  });

  const freqEl = document.getElementById('ewFreqRange');
  if (freqEl) { freqEl.value = EW_MANUAL.freq[side]; document.getElementById('ewFreqVal').textContent = EW_MANUAL.freq[side]; }
  const powerEl = document.getElementById('ewPowerRange');
  if (powerEl) { powerEl.value = EW_MANUAL.power[side]; document.getElementById('ewPowerVal').textContent = EW_MANUAL.power[side]; }
  const bwEl = document.getElementById('ewBandwidthRange');
  if (bwEl) { bwEl.value = EW_MANUAL.bandwidth[side]; document.getElementById('ewBandwidthVal').textContent = EW_MANUAL.bandwidth[side]; }

  const jamBox = document.getElementById('ewJamTargetBox');
  if (jamBox) {
    if (EW_MANUAL.selectedTarget) {
      jamBox.textContent = `目标: (${EW_MANUAL.selectedTarget.c},${EW_MANUAL.selectedTarget.r})`;
      jamBox.classList.add('set');
    } else {
      jamBox.textContent = '未选择目标格';
      jamBox.classList.remove('set');
    }
  }

  document.querySelectorAll('#ewJamBandBtns button').forEach(b => {
    b.classList.toggle('on', b.dataset.band === EW_MANUAL.jamBand);
  });

  const mult = getManualFreqMultiplier(side);
  const rangeEl = document.getElementById('ewJamRange');
  if (rangeEl) rangeEl.textContent = (2 * mult.range).toFixed(1) + '格';

  const cipherBox = document.getElementById('ewCipherTargetBox');
  const cb = G.crypto[side];
  const activeTarget = cb.targetUid ? G.units.find(u => u.uid === cb.targetUid) : null;
  if (cipherBox) {
    if (activeTarget) {
      cipherBox.textContent = `破译中: ${activeTarget.def.name} (${activeTarget.c},${activeTarget.r})`;
      cipherBox.classList.add('set');
    } else if (EW_MANUAL.cipherTarget) {
      cipherBox.textContent = `已选择: ${EW_MANUAL.cipherTarget.def.name} (未启动)`;
      cipherBox.classList.add('set');
    } else {
      cipherBox.textContent = '未选择破译目标';
      cipherBox.classList.remove('set');
    }
  }

  const pctEl = document.getElementById('ewCipherPct');
  if (pctEl) pctEl.textContent = cb.progress.toFixed(0) + '%';
  const barEl = document.getElementById('ewCipherBar');
  if (barEl) barEl.style.width = cb.progress + '%';

  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt('ewStatusBand', EW_MANUAL.band[side]);
  setTxt('ewStatusFreq', EW_MANUAL.freq[side] + 'MHz');
  setTxt('ewStatusPower', EW_MANUAL.power[side] + '%');
  setTxt('ewStatusBW', EW_MANUAL.bandwidth[side] + '%');
  const jammerCount = G.units.filter(u => !u.dead && u.side === side && (u.def.ew.jam > 0 || u.def.cat === 'EW')).length;
  setTxt('ewStatusJammers', jammerCount);
  setTxt('ewStatusSpec', (G.spectrumLoad[side] || 0).toFixed(0) + '%');
  setTxt('ewStatusComm', (G.commLinks[side]?.strength || 100).toFixed(0) + '%');
  setTxt('ewStatusCipher', cb.progress.toFixed(0) + '%');
  setTxt('ewStatusCB', G.counterBattery.filter(c => c.fromSide === side).length);
}