/* ============================================================
 * MTW input/keyboard.js
 * 键盘输入（WASD/QE/Esc/1-9/工兵/电子战快捷键）
 * 依赖：state / hud / ew / engineer / movement / save
 * ============================================================ */
'use strict';

/* 全局按键状态（main.js 的相机循环读取） */
const keys = {};
window.keys = keys;

window.addEventListener('keydown', e => {
  // 输入框内不拦截
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;

  keys[e.key.toLowerCase()] = true;
  keys[e.code] = true;

  // Tab：切换侧栏
  if (e.key === 'Tab') {
    e.preventDefault();
    toggleSidebar('left');
    toggleSidebar('right');
    return;
  }

  // Esc：优先级 AI取消 > EW选择取消 > 通用取消
  if (e.key === 'Escape') {
    if (G.aiRunning) {
      G.aiAbort = true;
      log('正在取消 AI…', 'lg-sys');
      if (typeof forceAbortAI === 'function') forceAbortAI();
      return;
    }
    if (EW_MANUAL.pickingTarget) {
      EW_MANUAL.pickingTarget = null;
      document.getElementById('ewConsole')?.classList.remove('ew-picking');
      log('已取消选择', 'lg-sys');
      return;
    }
    resetInteractionModes();
    return;
  }

  // 空格：非 AI 时结束回合（AI 运行时由 speed.js 在捕获阶段拦截为暂停）
  if (e.key === ' ') {
    e.preventDefault();
    if (!G.aiRunning) document.getElementById('btnEnd').click();
    return;
  }

  // Q/E：旋转
  if ((e.key === 'q' || e.key === 'Q') && G.sel && !G.sel.dead && G.sel.side === G.side) {
    G.sel.facing = (G.sel.facing + 5) % 6;
    draw();
  }
  if ((e.key === 'e' || e.key === 'E') && G.sel && !G.sel.dead && G.sel.side === G.side) {
    G.sel.facing = (G.sel.facing + 1) % 6;
    draw();
  }

  // 模式快捷键
  if (e.key === 'm' || e.key === 'M') document.getElementById('mMove')?.click();
  if (e.key === 'f' || e.key === 'F') document.getElementById('mFire')?.click();
  if (e.key === 'v' || e.key === 'V') document.getElementById('mSel')?.click();
  if (e.key === 'r' || e.key === 'R') document.getElementById('ftRanged')?.click();
  if (e.key === 'a' || e.key === 'A') document.getElementById('mAttackMove')?.click();
  if (e.key === 'g' || e.key === 'G') document.getElementById('mPlace')?.click();
  if (e.key === 's' || e.key === 'S') cycleStance();

  // 工兵快捷键
  if (e.key === '3' && G.sel && isEngineer(G.sel)) { setEngineerMode('clear'); return; }
  if (e.key === '4' && G.sel && isEngineer(G.sel)) { setEngineerMode('mine'); return; }
  if (e.key === '5' && G.sel && isEngineer(G.sel)) { setEngineerMode('fort'); return; }
  if (e.key === '6' && G.sel && isEngineer(G.sel)) { setEngineerMode('repair'); return; }

  // 电子战快捷键
  if (e.key === 'j' || e.key === 'J') { if (G.sel && G.sel.def.ew.jam > 0) { setEWMode('jam'); return; } }
  if (e.key === 'k' || e.key === 'K') { if (G.sel && !G.sel.dead) { setEWMode('recon'); return; } }
  if (e.key === 'l' || e.key === 'L') { if (G.sel && G.sel.def.ew.decoy > 0) { setEWMode('decoy'); return; } }
  if (e.key === 'u' || e.key === 'U') { if (G.sel && (G.sel.def.ew.eccm > 0 || G.sel.def.cat === 'EW')) { setEWMode('shield'); return; } }
  if (e.key === 'y' || e.key === 'Y') { if (G.sel) { setEWMode('arm'); return; } }
  if (e.key === 'h' || e.key === 'H') { if (G.sel) { setEWMode('counter'); return; } }
  if (e.key === 'p' || e.key === 'P') { if (G.sel) { setEWMode('hack'); return; } }

  // 1-9：武器选择
  if (/^[1-9]$/.test(e.key) && G.sel && !G.sel.dead) {
    const idx = parseInt(e.key) - 1;
    if (G.sel.def.weapons[idx]) {
      const i = G.selectedWeapons.indexOf(idx);
      if (i >= 0) G.selectedWeapons.splice(i, 1);
      else G.selectedWeapons.push(idx);
      updateUI();
    }
  }
});

window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
  keys[e.code] = false;
});

/* ---------- 重置交互模式 ---------- */
function resetInteractionModes() {
  G.mode = 'select';
  G.sel = null;
  G.placeDef = null;
  engineerMode = null;
  ewMode = null;
  ['rangedHint', 'engineerHint', 'ewHint'].forEach(id => document.getElementById(id)?.classList.remove('on'));
  document.getElementById('ftRanged')?.classList.remove('active');
  ['ftClear','ftMine','ftFort','ftRepair','ftJam','ftEWRecon','ftDecoy','ftShield','ftARM','ftCounter','ftHack']
    .forEach(id => document.getElementById(id)?.classList.remove('active'));
  if (typeof setModeBtn === 'function') setModeBtn('mSel');
  updateUI();
  draw();
}