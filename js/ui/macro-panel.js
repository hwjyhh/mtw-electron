/* ============================================================
 * MTW ui/macro-panel.js
 * 宏观指令面板（多选单位后下达 attack/defend/recon/fire/ew/retreat/auto）
 * 依赖：state / combat / movement / visibility
 * ============================================================ */
'use strict';

const MACRO_COMMANDS = {
  attack:  {n: '进攻',     icon: '⚔'},
  defend:  {n: '防守',     icon: '🛡'},
  recon:   {n: '侦察',     icon: '👁'},
  fire:    {n: '火力支援', icon: '🎯'},
  ew:      {n: '电子战',   icon: '📡'},
  retreat: {n: '撤退',     icon: '🚶'},
  auto:    {n: '自动作战', icon: '🤖'}
};

function buildMacroPanel() {
  const aside = document.getElementById('right');
  if (!aside || document.getElementById('macroPanel')) return;
  const p = document.createElement('div');
  p.id = 'macroPanel';
  p.className = 'panel';
  p.innerHTML = `
    <h3>宏观指令 <span id="macroSelCount" style="font-size:10px;color:#f0b72f">0 选中</span></h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
      <button class="sm" data-cmd="attack">⚔ 进攻</button>
      <button class="sm" data-cmd="defend">🛡 防守</button>
      <button class="sm" data-cmd="recon">👁 侦察</button>
      <button class="sm" data-cmd="fire">🎯 火力支援</button>
      <button class="sm" data-cmd="ew">📡 电子战</button>
      <button class="sm" data-cmd="retreat">🚶 撤退</button>
      <button class="sm" data-cmd="auto" style="grid-column:span 2;background:#1f3a5f">🤖 自动作战(AI 接管)</button>
    </div>
    <div style="display:flex;gap:4px;margin-top:4px">
      <button id="macroCancel" class="sm" style="flex:1">取消指令</button>
      <button id="macroClear" class="sm" style="flex:1">清空选择</button>
    </div>
    <div class="hint" style="margin-top:4px">左键拖拽框选 · Shift+左键多选</div>
  `;
  aside.insertBefore(p, aside.firstChild);

  p.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.onclick = () => issueMacroCommand(btn.dataset.cmd, G.hover || null);
  });
  document.getElementById('macroCancel').onclick = cancelMacroCommand;
  document.getElementById('macroClear').onclick = clearSelection;
}

/* ---------- 选择控制 ---------- */
function selectUnit(u, add) {
  if (!u || u.dead) return;
  if (!add) G.selectedUnits = [];
  if (!G.selectedUnits.includes(u)) G.selectedUnits.push(u);
  G.sel = u;
  G.selectedWeapons = [];
  updateUI();
}
function toggleSelectUnit(u) {
  const i = G.selectedUnits.indexOf(u);
  if (i >= 0) G.selectedUnits.splice(i, 1);
  else G.selectedUnits.push(u);
  if (G.selectedUnits.length) G.sel = G.selectedUnits[G.selectedUnits.length - 1];
  updateUI();
}
function clearSelection() {
  G.selectedUnits = [];
  G.sel = null;
  G.selectedWeapons = [];
  updateUI();
}
function boxSelectUnits(rect) {
  const found = G.units.filter(u =>
    !u.dead && u.side === G.side && !u.carriedBy &&
    u.c >= rect.c1 && u.c <= rect.c2 &&
    u.r >= rect.r1 && u.r <= rect.r2
  );
  if (found.length) {
    G.selectedUnits = found;
    G.sel = found[found.length - 1];
    G.selectedWeapons = [];
    log(`框选 ${found.length} 个单位`, 'lg-ok');
  } else {
    G.selectedUnits = [];
    G.sel = null;
  }
  updateUI();
}

/* ---------- 指令下达 ---------- */
function issueMacroCommand(cmd, targetHex) {
  const units = G.selectedUnits.slice();
  if (!units.length) { log('未选择单位', 'lg-sys'); return; }
  units.forEach(u => { u._macro = {cmd, target: targetHex || null, issuedTurn: G.turn, active: true}; });
  log(`📋 下达宏观指令【${MACRO_COMMANDS[cmd].n}】→ ${units.length} 个单位`, 'lg-ok');
  updateUI();
}
function cancelMacroCommand() {
  G.selectedUnits.forEach(u => u._macro = null);
  log('已取消宏观指令', 'lg-sys');
  updateUI();
}

/* ---------- 每帧宏观指令执行 ---------- */
function executeMacroTick() {
  G.selectedUnits.forEach(u => {
    if (u.dead || u.carriedBy || !u._macro || !u._macro.active) return;
    if (u.side !== G.side) return;
    if (u.mp <= 0 && u.fired.every(f => f >= 1)) return;

    const enemies = G.units.filter(e => !e.dead && e.side !== u.side && e.spotted[u.side]);
    const cmd = u._macro.cmd;

    if (cmd === 'attack')       macroAttack(u, enemies, u._macro);
    else if (cmd === 'defend')  macroDefend(u);
    else if (cmd === 'recon')   macroRecon(u, enemies);
    else if (cmd === 'fire')    macroFire(u, enemies);
    else if (cmd === 'ew')      macroEW(u, enemies);
    else if (cmd === 'retreat') macroRetreat(u, enemies);
    else if (cmd === 'auto')    macroAuto(u, enemies);
  });
}

function macroAttack(u, enemies, m) {
  if (!enemies.length) return;
  let t = m.target ? unitAt(m.target.c, m.target.r) : null;
  if (!t || t.dead) t = enemies.sort((a, b) => hexDist(u, a) - hexDist(u, b))[0];
  if (!t) return;

  const w = findBestWeapon(u, t);
  if (w >= 0 && hexDist(u, t) <= u.def.weapons[w].r && u.fired[w] < 1) {
    orderFire(u, t, [w], 'attack');
    return;
  }
  if (u.mp > 0) {
    const reach = reachableCells(u, u.mp);
    let best = null, bs = -Infinity;
    reach.forEach(v => {
      const s = -hexDist({c: v.c, r: v.r}, t) + TERRAIN[cellAt(v.c, v.r).t].cov * 5;
      if (s > bs) { bs = s; best = v; }
    });
    if (best && (best.c !== u.c || best.r !== u.r)) performMove(u, best);
  }
}
function macroDefend(u) {
  if (u.def.cat === 'ENG' && u.mp >= 2) engineerFortify(u);
  if (['INF','SF','RECON','ENG'].includes(u.def.cat)) u.stance = 'defense';
}
function macroRecon(u, enemies) {
  if (!enemies.length) return;
  const t = enemies.sort((a, b) => hexDist(u, a) - hexDist(u, b))[0];
  if (u.def.cat === 'RECON' && u.mp >= 1) executeEWRecon(u, t.c, t.r);
  if (u.mp > 0) {
    const reach = reachableCells(u, u.mp);
    let best = null, bs = Infinity;
    reach.forEach(v => {
      const s = Math.abs(hexDist({c: v.c, r: v.r}, t) - 5);
      if (s < bs) { bs = s; best = v; }
    });
    if (best && (best.c !== u.c || best.r !== u.r)) performMove(u, best);
  }
}
function macroFire(u, enemies) {
  if (!enemies.length) return;
  const arty = enemies.filter(e => e.def.cat === 'ARTY');
  const t = (arty.length ? arty : enemies)[0];
  const w = findBestWeapon(u, t);
  if (w >= 0 && hexDist(u, t) <= u.def.weapons[w].r) {
    const mode = isIndirectWeapon(u.def.weapons[w]) ? 'suppress' : 'attack';
    orderFire(u, t, [w], mode);
  }
}
function macroEW(u, enemies) {
  if (!enemies.length) return;
  const hv = enemies.filter(e => e.def.pts >= 40).slice(0, 3);
  if (u.def.ew.jam > 0 && u.mp >= 2 && hv.length) executeJamming(u, hv[0].c, hv[0].r, 'VHF');
  if (u.def.cat === 'RECON' && u.mp >= 1 && enemies[0]) executeEWRecon(u, enemies[0].c, enemies[0].r);
  if (u.def.ew.jam >= 5 && u.mp >= 2) {
    const cmd = enemies.find(e => e.def.cap.includes('指挥'));
    if (cmd) executeHack(u, cmd.c, cmd.r);
  }
}
function macroRetreat(u, enemies) {
  if (u.mp <= 0) return;
  const reach = reachableCells(u, u.mp);
  let best = null, bs = -Infinity;
  reach.forEach(v => {
    let s = 0;
    enemies.forEach(e => s += hexDist({c: v.c, r: v.r}, e));
    if (s > bs) { bs = s; best = v; }
  });
  if (best && (best.c !== u.c || best.r !== u.r)) performMove(u, best);
}
function macroAuto(u, enemies) {
  if (!enemies.length) return;
  const diff = G.aiDifficulty[u.side] || 'medium';
  if (diff === 'beginner' || diff === 'easy') {
    const w = findBestWeapon(u, enemies[0]);
    if (w >= 0 && hexDist(u, enemies[0]) <= u.def.weapons[w].r) orderFire(u, enemies[0], [w], 'attack');
  }
}