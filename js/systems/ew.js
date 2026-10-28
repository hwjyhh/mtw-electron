/* ============================================================
 * MTW systems/ew.js
 * 电子战完整行动 + EW_MANUAL 手动控制状态
 * 依赖：constants / geometry / state / visibility / combat
 * ============================================================ */
'use strict';

/* ---------- 手动调频状态（原 MODULE 5，提前到此处） ---------- */
const EW_MANUAL = {
  side: 0,
  freq: [100, 100],
  power: [50, 50],
  bandwidth: [50, 50],
  band: ['VHF', 'VHF'],
  panelOpen: true,
  activeTab: 'freq',
  pickingTarget: null,
  selectedTarget: null,
  cipherTarget: null,
  cipherActive: false,
  jamBand: 'VHF'
};

/* ---------- 调频倍率计算 ---------- */
function getManualFreqMultiplier(side) {
  const freq = EW_MANUAL.freq[side];
  const power = EW_MANUAL.power[side];
  const bw = EW_MANUAL.bandwidth[side];
  return {
    range: 0.5 + (power / 100) * 1.5,
    pen: 0.6 + (freq / 300) * 1.0,
    accuracy: 0.5 + (bw / 100) * 1.0
  };
}

/* ---------- 软杀伤干扰（含调频影响，原 MODULE 5 版本） ---------- */
function executeJamming(jammer, c, r, band) {
  if (!jammer || jammer.dead || jammer.def.ew.jam <= 0) return false;
  if (jammer.mp < 2) { log('MP不足(2)', 'lg-sys'); return false; }

  const mult = getManualFreqMultiplier(jammer.side);
  const baseRange = 3 + jammer.def.ew.jam * 0.5;
  const maxRange = baseRange * mult.range;
  const dist = hexDist(jammer, {c, r});
  if (dist > maxRange) { log(`超干扰范围 (${dist.toFixed(1)}>${maxRange.toFixed(1)})`, 'lg-sys'); return false; }

  band = band || EW_MANUAL.band[jammer.side] || 'VHF';
  const radius = Math.ceil(2 * mult.range);
  const targets = G.units.filter(u =>
    !u.dead && u.side !== jammer.side && !u.carriedBy && hexDist({c, r}, u) <= radius
  );
  if (targets.length === 0) { log('附近无敌方单位', 'lg-sys'); return false; }

  jammer.mp -= 2;
  jammer.ewActive = {mode: 'jam', band, c, r, turnsLeft: 2};
  addEffect('text', c, r, {dur: 30, text: '软杀伤' + band, color: '#d0a0e0'});

  targets.forEach(t => {
    addEffect('muzzle', t.c, t.r, {dur: 25, color: '#d0a0e0'});
    if (Math.random() < 0.3 * mult.accuracy) t.pulseStunned = Math.max(t.pulseStunned || 0, 1);
  });

  log(`📡 ${jammer.def.name} 对(${c},${r}) [${band}]功率${EW_MANUAL.power[jammer.side]}% 软杀伤${targets.length}单位`, 'lg-ew');
  computeEW();
  recalcVisibility();
  return true;
}

/* ---------- 电子侦察 ---------- */
function executeEWRecon(unit, c, r) {
  if (!unit || unit.dead) return false;
  if (unit.mp < 1) { log('MP不足(1)', 'lg-sys'); return false; }

  const dist = hexDist(unit, {c, r});
  const maxRange = Math.max(unit.def.sens.v, unit.def.sens.t, unit.def.sens.radar) + 2;
  if (dist > maxRange) { log('超侦察范围', 'lg-sys'); return false; }

  unit.mp -= 1;
  let found = 0;
  G.units.forEach(u => {
    if (u.dead || u.side === unit.side || u.carriedBy) return;
    const d = hexDist({c, r}, u);
    if (d > 1) return;
    u.spotted[unit.side] = true;
    u.lastKnown[unit.side] = {c: u.c, r: u.r};
    found++;
    log(`🔍 ${unit.def.name} 侦察到 ${u.def.name} (${u.c},${u.r})`, 'lg-comm');
  });
  if (found === 0) log(`🔍 ${unit.def.name} 未发现电子信号`, 'lg-comm');
  addEffect('text', c, r, {dur: 30, text: '侦察', color: '#79c0ff'});
  recalcVisibility();
  return true;
}

/* ---------- 电子欺骗 ---------- */
function executeDecoy(unit, c, r) {
  if (!unit || unit.dead || unit.def.ew.decoy <= 0) return false;
  if (unit.mp < 2) { log('MP不足(2)', 'lg-sys'); return false; }
  if (hexDist(unit, {c, r}) > 3) { log('超范围(3)', 'lg-sys'); return false; }

  unit.mp -= 2;
  addEffect('muzzle', c, r, {dur: 40, color: '#e06a9a'});
  addEffect('text', c, r, {dur: 50, text: '诱饵', color: '#e06a9a'});
  log(`🎭 ${unit.def.name} 在 (${c},${r}) 投放诱饵`, 'lg-ew');
  unit.ewActive = {mode: 'decoy', c, r, turnsLeft: 3};
  return true;
}

/* ---------- 电子防护 ---------- */
function executeShield(unit) {
  if (!unit || unit.dead) return false;
  if (unit.mp < 1) { log('MP不足(1)', 'lg-sys'); return false; }

  unit.mp -= 1;
  const targets = [unit, ...G.units.filter(u =>
    !u.dead && u.side === unit.side && u !== unit && hexDist(u, unit) <= 1
  )];
  targets.forEach(u => { u.shieldTurns = (u.shieldTurns || 0) + 2; });
  addEffect('text', unit.c, unit.r, {dur: 30, text: '电子防护', color: '#7ee787'});
  targets.forEach(u => addEffect('muzzle', u.c, u.r, {dur: 20, color: '#7ee787'}));
  log(`🛡 ${unit.def.name} 电子防护 ${targets.length}单位(2回合)`, 'lg-ew');
  return true;
}

/* ---------- 反辐射导弹 ---------- */
function executeARM(unit, c, r) {
  if (!unit || unit.dead) return false;
  const target = unitAt(c, r);
  if (!target || target.dead || target.side === unit.side) { log('目标无效', 'lg-sys'); return false; }

  const hasRadar = target.def.sens.radar >= 3 ||
                   target.def.cap.includes('雷达') ||
                   target.def.weapons.some(w => w.band === 'RADAR');
  if (!hasRadar) { log('该目标无雷达辐射', 'lg-sys'); return false; }

  let wIdx = -1;
  unit.def.weapons.forEach((w, i) => {
    if ((w.n.includes('反辐射') || w.n.includes('HARM') || w.n.includes('Kh-31')) && wIdx < 0) wIdx = i;
  });
  if (wIdx < 0) { log(`${unit.def.name} 无反辐射武器`, 'lg-sys'); return false; }

  const w = unit.def.weapons[wIdx];
  if (unit.fired[wIdx] >= 1) { log('反辐射武器本回合已攻击', 'lg-sys'); return false; }
  const dist = hexDist(unit, target);
  if (dist > w.r) { log(`超出射程(${dist}>${w.r})`, 'lg-sys'); return false; }
  const ammoCost = Math.max(1, Math.round(w.rof));
  if (unit.ammo[wIdx] < ammoCost) { log('弹药不足', 'lg-sys'); return false; }

  unit.ammo[wIdx] -= ammoCost;
  unit.fired[wIdx] += 1;
  unit.mp = Math.max(0, unit.mp - 1);
  addEffect('muzzle', unit.c, unit.r, {dur: 25, color: '#ff3060'});

  const p = 0.9;
  if (Math.random() < p) {
    const dmg = rnd(3.5, 5.5);
    target.hp -= dmg;
    if (target.hp <= 0) { target.dead = true; spawnWreck(target); }
    addEffect('explosion', target.c, target.r, {dur: 45, size: 2.0, color: '#ff3060'});
    addEffect('text', target.c, target.r, {dur: 50, text: '🚀反辐射', color: '#ff3060'});
    log(`🚀 ${unit.def.name} 反辐射导弹命中 ${target.def.name}（雷达源）伤害 ${dmg.toFixed(1)}`, 'lg-hit');
    // 邻近雷达单位短暂瘫痪
    G.units.filter(u => !u.dead && u.side === target.side && hexDist(u, target) <= 1 && u.def.sens.radar >= 3)
      .forEach(u2 => {
        u2.sensorDown = 3;
        addEffect('text', u2.c, u2.r, {dur: 40, text: '雷达瘫痪', color: '#ff3060'});
      });
  } else {
    log(`🚀 ${unit.def.name} 反辐射导弹未命中 ${target.def.name}`, 'lg-sys');
  }
  recalcVisibility();
  updateUI();
  return true;
}

/* ---------- 反炮兵雷达主动扫描 ---------- */
function executeCounterBattery(unit) {
  if (!unit || unit.dead) return false;
  if (unit.mp < 2) { log('MP不足(2)', 'lg-sys'); return false; }

  const hasRadar = unit.def.cap.includes('反炮兵') || unit.def.sens.radar >= 5;
  if (!hasRadar) { log('该单位无反炮兵雷达', 'lg-sys'); return false; }

  unit.mp -= 2;
  const scanR = Math.max(unit.def.sens.radar * 1.5, 8);
  let found = 0;

  G.units.filter(u => !u.dead && u.side !== unit.side && u.def.cat === 'ARTY')
    .forEach(tgt => {
      if (hexDist(unit, tgt) <= scanR) {
        G.counterBattery.push({
          c: tgt.c, r: tgt.r, markTurn: G.turn,
          fromSide: unit.side, radius: 2
        });
        addEffect('text', tgt.c, tgt.r, {dur: 50, text: '反炮兵!', color: '#ff9f5a'});
        log(`📻 ${unit.def.name} 反炮兵锁定 ${tgt.def.name} (${tgt.c},${tgt.r})`, 'lg-comm');
        found++;
      }
    });

  if (found === 0) log(`📻 ${unit.def.name} 未发现敌方炮兵`, 'lg-comm');
  addEffect('muzzle', unit.c, unit.r, {dur: 30, color: '#ff9f5a'});
  return true;
}

/* ---------- 密码破译 ---------- */
function executeHack(unit, c, r) {
  if (!unit || unit.dead) return false;
  if (unit.mp < 2) { log('MP不足(2)', 'lg-sys'); return false; }

  const target = unitAt(c, r);
  if (!target || target.dead) { log('该格无目标', 'lg-sys'); return false; }
  if (target.side === unit.side) { log('不能破译友军', 'lg-sys'); return false; }

  const hasEW = unit.def.ew.jam >= 5 || unit.def.cat === 'EW';
  if (!hasEW) { log('该单位无破译能力(需干扰>=5)', 'lg-sys'); return false; }
  if (hexDist(unit, target) > 6) { log('超出破译范围(6)', 'lg-sys'); return false; }

  unit.mp -= 2;
  const cb = G.crypto[unit.side];
  if (cb.targetUid !== target.uid) {
    cb.targetUid = target.uid;
    cb.progress = 0;
    cb.targetSide = target.side;
    cb.startTurn = G.turn;
  }

  const gain = 10 + unit.def.ew.jam * 2 + unit.def.training * 0.5;
  cb.progress = Math.min(CRYPTO_INFO.threshold, cb.progress + gain);
  target.cryptoProgress = cb.progress;
  addEffect('text', c, r, {dur: 40, text: `破译 ${cb.progress.toFixed(0)}%`, color: '#f0883e'});
  log(`🔐 ${unit.def.name} 对 ${target.def.name} 破译进度 ${cb.progress.toFixed(0)}%`, 'lg-crypto');

  if (cb.progress >= CRYPTO_INFO.threshold) {
    log(`🔓 破译完成！${target.def.name} 通信已完全破解`, 'lg-crypto');
    target.cryptoBrokenBy = unit.side;
    target.spotted[unit.side] = true;
    cb.progress = 0;
    cb.targetUid = null;
  }
  return true;
}

/* ---------- 反炮兵自动触发（远程射击后调用） ---------- */
function triggerCounterBattery(fromSide, fireC, fireR) {
  G.units.forEach(u => {
    if (u.dead || u.side === fromSide || u.carriedBy) return;
    const isCB = u.def.cap.includes('反炮兵') || u.def.sens.radar >= 5;
    if (!isCB) return;
    const d = hexDist(u, {c: fireC, r: fireR});
    if (d > u.def.sens.radar * 1.5 + 2) return;
    G.counterBattery.push({
      c: fireC, r: fireR, markTurn: G.turn, fromSide, radius: 2
    });
    addEffect('text', fireC, fireR, {dur: 30, text: '反炮兵', color: '#ff9f5a'});
    log(`📻 ${u.def.name} 反炮兵锁定 (${fireC},${fireR})`, 'lg-comm');
  });
}

/* ---------- EW 模式点击处理（由 input/mouse.js 调用） ---------- */
function handleEWMode(c, r) {
  if (!G.sel || G.sel.dead) return;
  const u = G.sel;
  if (!u.def.ew.jam && !u.def.ew.eccm && !u.def.ew.decoy && u.def.cat !== 'EW' && u.def.cat !== 'RECON') {
    log('该单位无电子战能力', 'lg-sys');
    return;
  }

  if (ewMode === 'jam') {
    const band = prompt('选择干扰频段:\nVHF/UHF/HF/SATCOM/RADAR', 'VHF') || 'VHF';
    executeJamming(u, c, r, band);
  }
  else if (ewMode === 'recon')  executeEWRecon(u, c, r);
  else if (ewMode === 'decoy')  executeDecoy(u, c, r);
  else if (ewMode === 'shield') executeShield(u);
  else if (ewMode === 'arm')    executeARM(u, c, r);
  else if (ewMode === 'counter') executeCounterBattery(u);
  else if (ewMode === 'hack')   executeHack(u, c, r);

  computeEW();
  recalcVisibility();
  updateUI();
  draw();
}