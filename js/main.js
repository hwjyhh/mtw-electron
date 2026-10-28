/* ============================================================
 * MTW main.js
 * ★ 启动引导 + 单 RAF 主循环（合并原 camLoop / animLoop）
 *   合并 3 个 setInterval → 统一帧内累积节流
 * 依赖：全部
 * ============================================================ */
'use strict';

/* ---------- 启动 ---------- */
function boot() {
  // 1. 左侧栏 + 右侧栏（动态构建）
  if (typeof buildLeftSidebar === 'function')  buildLeftSidebar();
  if (typeof buildRightSidebar === 'function') buildRightSidebar();

  // 2. 浮动工具条
  buildFloatTools();

  // 3. 右侧附加面板（战斗群 / 宏观指令 / 雷达）
  if (typeof buildTaskForcePanel === 'function') buildTaskForcePanel();
  if (typeof buildMacroPanel === 'function')     buildMacroPanel();
  if (typeof buildRadarPanel === 'function')     buildRadarPanel();

  // 4. 电子战控制台
  if (typeof initEWPanel === 'function') initEWPanel();

  // 5. 模态框
  if (typeof initAllModals === 'function') initAllModals();

  // 6. 按钮
  if (typeof bindEndTurnButton === 'function')     bindEndTurnButton();
  if (typeof bindAIToggleButtons === 'function')   bindAIToggleButtons();
  if (typeof bindSandboxButton === 'function')    bindSandboxButton();
  if (typeof bindSaveLoadButtons === 'function')   bindSaveLoadButtons();

  // 7. 框选
  if (typeof setupBoxSelect === 'function') setupBoxSelect();

  // 8. 为既有单位补雷达字段（保险）
  G.units.forEach(u => {
    if (u.radarOn === undefined)           u.radarOn = true;
    if (u.radarIntermittent === undefined) u.radarIntermittent = false;
    if (u.exposureLevel === undefined)     u.exposureLevel = 0;
    if (!u.trackProgress)                  u.trackProgress = [0, 0];
    if (!u.lockedBy)                       u.lockedBy = [false, false];
    if (u._macro === undefined)            u._macro = null;
    if (u._aiRole === undefined)           u._aiRole = 'main';
  });

  // 9. 启动
  resize();
  initGame('encounter', 'medium');
}

/* ---------- 浮动工具条（替代 index.html 里的硬编码） ---------- */
function buildFloatTools() {
  const box = document.getElementById('floatTools');
  if (!box || box.children.length > 0) return;
  const tools = [
    ['ftRanged',   '🎯', '远程火力'],
    ['ftObserve',  '👁', '观察'],
    ['ftRotate',   '↻', '旋转'],
    ['ftLoad',     '⬆', '搭载'],
    ['ftUnload',   '⬇', '卸载'],
    ['ftSupply',   '📦', '补给'],
    ['ftClear',    '🔨', '破障(3)'],
    ['ftMine',     '💣', '布雷(4)'],
    ['ftFort',     '🏗', '工事(5)'],
    ['ftRepair',   '🔧', '修车(6)'],
    ['ftJam',      '📡', '干扰(J)'],
    ['ftEWRecon',  '🔍', '侦察(K)'],
    ['ftDecoy',    '🎭', '诱饵(L)'],
    ['ftShield',   '🛡', '防护(U)'],
    ['ftARM',      '💥', '反辐射(Y)'],
    ['ftCounter',  '📻', '反炮兵(H)'],
    ['ftHack',     '🔐', '破译(P)']
  ];
  box.innerHTML = tools.map(([id, ico, tip]) =>
    `<button class="floatBtn" id="${id}"><span>${ico}</span><span class="tip">${tip}</span></button>`
  ).join('');

  // 事件
  const map = {
    ftRanged: toggleRangedMode,
    ftObserve: () => { G.opt.obs = !G.opt.obs; document.getElementById('ftObserve').classList.toggle('active', G.opt.obs); draw(); },
    ftRotate: () => { if (G.sel && !G.sel.dead) { G.sel.facing = (G.sel.facing + 1) % 6; draw(); } },
    ftLoad: () => {
      if (!G.sel || G.sel.dead) { log('请先选择步兵', 'lg-sys'); return; }
      const candidates = G.units.filter(u =>
        !u.dead && u !== G.sel && u.side === G.sel.side &&
        hexDist(u, G.sel) <= 1 &&
        ['IFV','APC','NAV','HELI'].includes(u.def.cat) && u.def.carry > 0
      );
      if (!candidates.length) { log('附近无可搭载车辆', 'lg-sys'); return; }
      if (loadUnit(G.sel, candidates[0])) { G.sel = null; updateUI(); draw(); }
    },
    ftUnload: () => {
      if (!G.sel || G.sel.dead) { log('请先选择载具', 'lg-sys'); return; }
      if (!G.sel.cargo.length) { log('该载具无搭载', 'lg-sys'); return; }
      if (unloadUnit(G.sel)) updateUI();
      draw();
    },
    ftSupply: () => {
      if (!G.sel || G.sel.dead) { log('请先选择补给单位', 'lg-sys'); return; }
      const targets = G.units.filter(u => !u.dead && u.side === G.sel.side && u !== G.sel && hexDist(u, G.sel) <= 1);
      if (!targets.length) { log('附近无可补给单位', 'lg-sys'); return; }
      doResupply(G.sel, targets[0]);
      updateUI(); draw();
    },
    ftClear:   () => setEngineerMode('clear'),
    ftMine:    () => setEngineerMode('mine'),
    ftFort:    () => setEngineerMode('fort'),
    ftRepair:  () => setEngineerMode('repair'),
    ftJam:     () => setEWMode('jam'),
    ftEWRecon: () => setEWMode('recon'),
    ftDecoy:   () => setEWMode('decoy'),
    ftShield:  () => setEWMode('shield'),
    ftARM:     () => setEWMode('arm'),
    ftCounter: () => setEWMode('counter'),
    ftHack:    () => setEWMode('hack')
  };
  Object.entries(map).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  });
}

/* ---------- 远程模式 ---------- */
function toggleRangedMode() {
  if (!G.sel || G.sel.dead) { log('请先选择单位', 'lg-sys'); return; }
  if (G.sel.rangedUsedThisTurn) { log('该单位本回合已使用远程火力', 'lg-sys'); return; }
  const hasRanged = G.sel.def.weapons.some((w, i) =>
    canAreaFire(w) && G.sel.ammo[i] >= Math.max(1, Math.round(w.rof)) && G.sel.fired[i] < 1
  );
  if (!hasRanged) { log('无远程/曲射武器', 'lg-sys'); return; }
  G.mode = 'ranged';
  engineerMode = null; ewMode = null;
  setModeBtn(null);
  document.getElementById('ftRanged').classList.add('active');
  document.getElementById('rangedHint').classList.add('on');
  document.getElementById('engineerHint').classList.remove('on');
  document.getElementById('ewHint').classList.remove('on');
  ['ftClear','ftMine','ftFort','ftRepair','ftJam','ftEWRecon','ftDecoy','ftShield','ftARM','ftCounter','ftHack']
    .forEach(id => document.getElementById(id)?.classList.remove('active'));
  log('远程火力模式', 'lg-ranged');
  draw();
}

/* ---------- 工兵 / EW 模式切换 ---------- */
function setEngineerMode(m) {
  if (!G.sel || G.sel.dead) { log('请先选择单位', 'lg-sys'); return; }
  if (!isEngineer(G.sel)) { log('该单位不是工兵', 'lg-sys'); return; }
  if (engineerMode === m) engineerMode = null;
  else engineerMode = m;
  if (engineerMode) ewMode = null;
  ['ftClear','ftMine','ftFort','ftRepair'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active',
      (id === 'ftClear' && engineerMode === 'clear') ||
      (id === 'ftMine' && engineerMode === 'mine') ||
      (id === 'ftFort' && engineerMode === 'fort') ||
      (id === 'ftRepair' && engineerMode === 'repair'));
  });
  ['ftJam','ftEWRecon','ftDecoy','ftShield','ftARM','ftCounter','ftHack']
    .forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById('ewHint')?.classList.remove('on');

  if (engineerMode) {
    const tips = {clear: '破障：点击相邻格', mine: '布雷：点击相邻格', fort: '修工事：点击自身格', repair: '修车辆：点击相邻车辆'};
    log(tips[engineerMode], 'lg-ok');
    document.getElementById('engineerHint')?.classList.add('on');
    G.mode = 'select'; setModeBtn(null);
  } else {
    document.getElementById('engineerHint')?.classList.remove('on');
  }
  draw();
}

function setEWMode(m) {
  if (!G.sel || G.sel.dead) { log('请先选择单位', 'lg-sys'); return; }
  if (ewMode === m) ewMode = null;
  else ewMode = m;
  if (ewMode) engineerMode = null;

  ['ftJam','ftEWRecon','ftDecoy','ftShield','ftARM','ftCounter','ftHack'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active',
      (id === 'ftJam' && ewMode === 'jam') ||
      (id === 'ftEWRecon' && ewMode === 'recon') ||
      (id === 'ftDecoy' && ewMode === 'decoy') ||
      (id === 'ftShield' && ewMode === 'shield') ||
      (id === 'ftARM' && ewMode === 'arm') ||
      (id === 'ftCounter' && ewMode === 'counter') ||
      (id === 'ftHack' && ewMode === 'hack'));
  });
  ['ftClear','ftMine','ftFort','ftRepair']
    .forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById('engineerHint')?.classList.remove('on');

  if (ewMode) {
    const tips = {
      jam: '软杀伤干扰：点击目标格',
      recon: '电子侦察：点击目标格',
      decoy: '电子欺骗：点击目标格',
      shield: '电子防护：自动为自身+相邻友军',
      arm: '反辐射打击：点击敌方雷达目标',
      counter: '反炮兵雷达：自动扫描敌方炮兵',
      hack: '密码破译：点击敌方单位持续破译'
    };
    log(tips[ewMode] || '', 'lg-ew');
    document.getElementById('ewHint')?.classList.add('on');
    G.mode = 'select'; setModeBtn(null);
  } else {
    document.getElementById('ewHint')?.classList.remove('on');
  }
  draw();
}

/* ============================================================
 * 主循环
 * ============================================================ */
let _lastFrame = performance.now();
let _dirty = true;
let _acc = {
  status: 0,
  ew: 0,
  ewPanel: 0,
  hud: 0
};

function frame(now) {
  const dt = Math.min(0.1, (now - _lastFrame) / 1000);
  _lastFrame = now;

  // === 1. 相机（WASD） ===
  updateCameraFromKeys(dt);

  // === 2. 物理 tick ===
  updateEffects();
  tickMovement(dt);
  if (typeof radarDetectTick === 'function')       radarDetectTick(dt);
  if (typeof radarExposureTick === 'function')     radarExposureTick(dt);
  if (typeof radarIntermittentTick === 'function') radarIntermittentTick(dt);
  if (typeof missileTick === 'function')           missileTick(dt);
  if (!G.aiRunning && typeof executeMacroTick === 'function') executeMacroTick();

  // === 3. 合并原 setInterval(updateStatus, 200) ===
  _acc.status += dt;
  if (_acc.status >= 0.2) {
    _acc.status = 0;
    updateStatus();
  }

  // === 4. 合并原 setInterval(computeEW, 500) ===
  _acc.ew += dt;
  if (_acc.ew >= 0.5) {
    _acc.ew = 0;
    if (!G.gameOver) computeEW();
  }

  // === 5. 合并原 setInterval(updateEWPanel, 500) ===
  _acc.ewPanel += dt;
  if (_acc.ewPanel >= 0.5) {
    _acc.ewPanel = 0;
    if (document.getElementById('ewConsole')) updateEWPanel();
  }

  // === 6. HUD 节流刷新（AI 状态变化检测） ===
  _acc.hud += dt;
  if (_acc.hud >= 0.1) {
    _acc.hud = 0;
    const btnEnd = document.getElementById('btnEnd');
    if (btnEnd) {
      const wantText = G.aiRunning ? '⏹ 取消AI' : '结束回合 ▶';
      if (btnEnd.textContent !== wantText) {
        btnEnd.textContent = wantText;
        btnEnd.classList.toggle('cancel-ai', G.aiRunning);
      }
    }
  }

  // === 7. 绘制 ===
  const needsDraw =
    _dirty ||
    G.effects.length > 0 ||
    G.wrecks.some(w => w.age < 160) ||
    G.units.some(u => u.moving) ||
    MISSILES.length > 0 ||
    (G.sel && G.sel.recoil && G.sel.recoil.until > now);

  if (needsDraw) {
    draw();
    _dirty = false;
  }

  requestAnimationFrame(frame);
}

function updateCameraFromKeys(dt) {
  const speed = 500 / G.cam.z;
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup'])    dy -= 1;
  if (keys['s'] || keys['arrowdown'])  dy += 1;
  if (keys['a'] || keys['arrowleft'])  dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    G.cam.x += (dx / len) * speed * dt;
    G.cam.y += (dy / len) * speed * dt;
    _dirty = true;
  }
}

/* 标记脏数据（供其他模块调用） */
function markDirty() { _dirty = true; }
window.markDirty = markDirty;

/* ============================================================
 * 启动
 * ============================================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    boot();
    requestAnimationFrame(frame);
  });
} else {
  boot();
  requestAnimationFrame(frame);
}