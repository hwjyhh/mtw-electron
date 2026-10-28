/* ============================================================
 * MTW ai/tactics.js
 * ★ 唯一的 runAI + 战斗群编成 + 全谱战术执行
 * 依赖：constants / geometry / state / combat / movement / ew / engineer
 *         / visibility / radar / ai/prefs
 * ============================================================ */
'use strict';

/* ============================================================
 * 1. 编成（难度决定粒度：单群 / 基本 / 完整合成）
 * ============================================================ */
function formBattlegroups(side, diff) {
  const my = G.units.filter(u => !u.dead && u.side === side && !u.carriedBy);
  if (!my.length) return [];
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;

  const byRole = {assault: [], ad: [], recon: [], arty: [], ew: [], air: [], eng: [], log: []};
  my.forEach(u => {
    const c = u.def.cat;
    if (['ARM','IFV','INF','SF'].includes(c))     byRole.assault.push(u);
    else if (c === 'AD')                           byRole.ad.push(u);
    else if (c === 'RECON' || c === 'UAV')         byRole.recon.push(u);
    else if (c === 'ARTY')                         byRole.arty.push(u);
    else if (c === 'EW')                           byRole.ew.push(u);
    else if (c === 'AIR' || c === 'HELI')          byRole.air.push(u);
    else if (c === 'ENG')                          byRole.eng.push(u);
    else                                            byRole.log.push(u);
  });

  // 新手：全部堆一群，不做合成
  if (!t.formation) {
    return [{
      id: 'bg_' + side + '_' + Date.now() + '_0', side,
      name: '主力群', units: my.slice(),
      mission: 'attack', aiControlled: true, playerMacro: null,
      center: aiCenter(my), formedAt: G.turn
    }];
  }

  const groupCount = Math.max(1, Math.ceil(byRole.assault.length / 4));
  const sorted = byRole.assault.slice().sort((a, b) => (a.c + a.r) - (b.c + b.r));
  const groups = [];
  const per = Math.ceil(sorted.length / groupCount);

  for (let i = 0; i < groupCount; i++) {
    const units = sorted.slice(i * per, (i + 1) * per);
    if (!units.length) continue;
    groups.push({
      id: 'bg_' + side + '_' + Date.now() + '_' + i, side,
      name: `第${i + 1}合成群`, units: units.slice(),
      mission: 'attack', aiControlled: true, playerMacro: null,
      center: aiCenter(units), formedAt: G.turn
    });
  }

  if (t.formation === 'full') {
    // 支援就近分配，同类每群上限 2
    ['ad','recon','arty','ew','air','eng','log'].forEach(key => {
      byRole[key].forEach(u => {
        if (!groups.length) return;
        let best = null, bd = Infinity;
        groups.forEach(g => {
          const d = hexDist(u, aiCenter(g.units));
          if (d < bd) { bd = d; best = g; }
        });
        if (best) {
          const same = best.units.filter(x => x.def.cat === u.def.cat).length;
          if (same >= 2) {
            const others = groups.filter(g => g !== best);
            if (others.length) others[0].units.push(u);
            else best.units.push(u);
          } else {
            best.units.push(u);
          }
        }
      });
    });
  } else {
    // basic：仅分配防空 / 侦察
    ['ad','recon'].forEach(key => {
      byRole[key].forEach(u => {
        if (!groups.length) return;
        groups.sort((a, b) => hexDist(u, aiCenter(a.units)) - hexDist(u, aiCenter(b.units)));
        groups[0].units.push(u);
      });
    });
  }

  return groups;
}
window.formBattlegroups = formBattlegroups;

/* ============================================================
 * 2. 武器选择（供各兵种行动使用）
 * ============================================================ */
function findBestWeapon(u, tgt) {
  const dist = hexDist(u, tgt);
  let best = -1, bestS = -1;
  u.def.weapons.forEach((w, i) => {
    if (w.r < dist || u.fired[i] >= 1) return;
    if (u.ammo[i] < Math.max(1, Math.round(w.rof))) return;
    if (tgt.def.mob === 'air' && !canEngageAir(w)) return;
    if (w.band && u.jammedBands.has(w.band)) return;
    let s = hitChance(u, tgt, w, dist);
    if (['ARM','IFV','APC'].includes(tgt.def.cat) && w.t === 'atgm') s *= 2;
    if (tgt.def.mob === 'air' && ANTI_AIR_WEAPON_TYPES.includes(w.t)) s *= 2;
    if (['INF','SF'].includes(tgt.def.cat) && ['mg','rifle','sniper'].includes(w.t)) s *= 1.5;
    if (tgt.def.cat === 'ARTY' && w.t === 'howitzer') s *= 1.6;
    if (s > bestS) { bestS = s; best = i; }
  });
  return best;
}
window.findBestWeapon = findBestWeapon;

/* ============================================================
 * 3. 目标评分（难度 + 偏好驱动）
 * ============================================================ */
function scoreTargetV2(u, tgt, pref, diff) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  const d = hexDist(u, tgt);
  let s = tgt.def.pts * (1 - tgt.hp / tgt.maxHp * 0.6) / (1 + d * 0.15);

    const capStr = String(tgt.def.cap || '');
  if (t.c2Strike) {
    if (capStr.includes('指挥'))      s *= 2.8;
    if (capStr.includes('通信中继'))  s *= 2.2;
    if (tgt.def.sens.radar >= 5)      s *= 1.9;
  } else if (capStr.includes('指挥')) {
    s *= 2.2;
  }

  if (t.sead && tgt.def.cat === 'AD') s *= 1.8;

  if (t.finisher) {
    const hpR = tgt.hp / tgt.maxHp;
    if (hpR < 0.4) s *= 1.7;
    if (hpR < 0.2) s *= 2.2;
  }

  if (tgt.def.cat === 'ARTY') s *= 1.6;
  if (tgt.def.cat === 'EW')   s *= 1.5;

  if (pref === 'firepower' && ['ARTY','AD','ARM'].includes(tgt.def.cat)) s *= 1.6;
  if (pref === 'maneuver'  && ['ARTY','LOG','AD'].includes(tgt.def.cat)) s *= 1.6;
  if (pref === 'signals'   && tgt.def.cat === 'EW')                        s *= 1.8;

  return s;
}

/* ============================================================
 * 4. 决策（4 级判定）
 * ============================================================ */
function decideMissionV2(bg, enemies, diff, pref) {
  const units = bg.units.filter(u => !u.dead);
  if (!units.length) return 'dead';
  bg.center = aiCenter(units);

  if (bg.playerMacro && bg.playerMacro !== 'auto') {
    const m = bg.playerMacro;
    if (m === 'fire') return 'attack';
    if (['attack','defend','recon','retreat','ew'].includes(m)) return m;
  }

  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  const m = PREF_MOD_V2[pref] || PREF_MOD_V2.balanced;
  const nearby = enemies.filter(e => hexDist(bg.center, e) <= 15);
  const myPower = aiPower(units);
  const enemyPower = aiPower(nearby);
  const hpRatio = units.reduce((s, u) => s + u.hp / u.maxHp, 0) / units.length;
  const avgSup = units.reduce((s, u) => s + u.sup, 0) / units.length;

  // 1 级：不做战力评估，70% 莽攻
  if (!t.missionSmart) {
    if (!nearby.length) return 'defend';
    return Math.random() < 0.7 ? 'attack' : 'defend';
  }

  // 2 级：简单战力比
  if (t.missionSmart === 'simple') {
    if (hpRatio < 0.25) return 'retreat';
    if (nearby.length && myPower > enemyPower * 1.15) return 'attack';
    if (nearby.length) return 'defend';
    return 'attack';
  }

  // 3/4 级：完整判定
  if (t.retreat === 'smart') {
    if (hpRatio < 0.35 || avgSup > 12) return 'retreat';
    if (nearby.length && myPower < enemyPower * 0.5) return 'retreat';
  }

  if (pref === 'defensive') {
    if (myPower > enemyPower * m.atk) return 'attack';
    return 'defend';
  }
  if (pref === 'offensive') {
    if (myPower >= enemyPower * m.atk) return 'attack';
    if (myPower < enemyPower * m.def)  return 'defend';
    return 'attack';
  }
  if (nearby.length && myPower > enemyPower * m.atk) return 'attack';
  if (myPower < enemyPower * m.def) return 'defend';
  return 'attack';
}

/* ============================================================
 * 5. 移动（直线 / 战术）
 * ============================================================ */
function aiMoveDirect(u, target, desired) {
  const reach = reachableCells(u, u.mp);
  if (!reach.size) return;
  let best = null, bs = -Infinity;
  reach.forEach(v => {
    const d = hexDist({c: v.c, r: v.r}, target);
    const s = -Math.abs(d - desired) * 3 - v.cost * 0.05;
    if (s > bs) { bs = s; best = v; }
  });
  if (best && (best.c !== u.c || best.r !== u.r)) performMove(u, best);
}

function aiMoveTowards(u, target, desired, pref, diff) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  const m = PREF_MOD_V2[pref] || PREF_MOD_V2.balanced;
  const reach = reachableCells(u, u.mp);
  if (!reach.size) return;
  let best = null, bs = -Infinity;
  reach.forEach(v => {
    const d = hexDist({c: v.c, r: v.r}, target);
    let s = -Math.abs(d - desired) * 3;
    const cell = cellAt(v.c, v.r), tc = TERRAIN[cell.t];
    if (t.cover) {
      s += tc.cov * 8 + tc.con * 3;
      if (cell.elev >= 2) s += 8;
      if (cell.fort) s += 6 * m.fort;
      if (cell.mine) s -= 15;
    }
    s -= v.cost * 0.4;
    if (cell.road) s += 1;
    if (t.flank) {
      const ang = Math.atan2(v.r - target.r, v.c - target.c);
      if (Math.abs(Math.sin(ang)) > 0.65) s += m.flank;
    }
    if (t.combinedArms) {
      const near = G.units.filter(f =>
        !f.dead && f.side === u.side && f !== u &&
        hexDist({c: v.c, r: v.r}, f) <= 1
      );
      if (u.def.cat === 'ARM' && near.some(f => ['INF','SF'].includes(f.def.cat))) s += 8;
      if (['INF','SF'].includes(u.def.cat) && near.some(f => ['ARM','IFV'].includes(f.def.cat))) s += 8;
    }
    if (s > bs) { bs = s; best = v; }
  });
  if (best && (best.c !== u.c || best.r !== u.r)) performMove(u, best);
}

/* ============================================================
 * 6. 单兵行为：进攻 / 防守 / 撤退
 * ============================================================ */
function aiAssaultUnit(u, enemies, bg, diff, pref, done) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  if (bg.mission === 'retreat') { aiRetreatUnit(u, enemies, done); return; }
  if (bg.mission === 'defend')  { aiDefendUnit(u, enemies, diff, pref, done); return; }
  if (!enemies.length) { done(); return; }

  let target;
  if (t.dynamicRetarget) {
    target = enemies.slice().sort((a, b) => scoreTargetV2(u, b, pref, diff) - scoreTargetV2(u, a, pref, diff))[0];
  } else if (t.focusFire) {
    const coord = G._aiCoord && G._aiCoord[bg.side];
    const focusId = coord ? coord.focusTarget : null;
    target = enemies.find(e => e.uid === focusId) ||
             enemies.slice().sort((a, b) => hexDist(u, a) - hexDist(u, b))[0];
  } else {
    target = enemies.slice().sort((a, b) => hexDist(u, a) - hexDist(u, b))[0];
  }
  if (!target) { done(); return; }

  const w = findBestWeapon(u, target);
  if (w >= 0 && hexDist(u, target) <= u.def.weapons[w].r) {
    orderFire(u, target, [w], isIndirectWeapon(u.def.weapons[w]) ? 'suppress' : 'attack');
    done();
    return;
  }

  const m = PREF_MOD_V2[pref] || PREF_MOD_V2.balanced;
  const baseDesired = ['ARM','IFV'].includes(u.def.cat) ? 2 : 3;
  const desired = Math.max(1, baseDesired + m.desire);
  if (t.cover || t.flank) {
    aiMoveTowards(u, {c: target.c, r: target.r}, desired, pref, diff);
  } else {
    aiMoveDirect(u, {c: target.c, r: target.r}, desired);
  }
  setTimeout(done, 50);
}

function aiDefendUnit(u, enemies, diff, pref, done) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  const m = PREF_MOD_V2[pref] || PREF_MOD_V2.balanced;

  if (!t.cover) {
    if (enemies.length) {
      const target = enemies.slice().sort((a, b) => hexDist(u, a) - hexDist(u, b))[0];
      const w = findBestWeapon(u, target);
      if (w >= 0 && hexDist(u, target) <= u.def.weapons[w].r) orderFire(u, target, [w], 'attack');
    }
    done();
    return;
  }

  const reach = reachableCells(u, u.mp);
  if (reach.size && u.mp > 0) {
    let best = null, bs = -Infinity;
    reach.forEach(v => {
      const cell = cellAt(v.c, v.r), tc = TERRAIN[cell.t];
      let s = tc.cov * 15 + tc.con * 8;
      if (cell.elev >= 2) s += 12;
      if (cell.fort) s += 18 * m.fort;
      if (cell.mine) s -= 20;
      enemies.forEach(e => {
        const d = hexDist({c: v.c, r: v.r}, e);
        if (d < 4) s -= 8;
        else if (d > 8) s += 3;
      });
      if (s > bs) { bs = s; best = v; }
    });
    if (best && (best.c !== u.c || best.r !== u.r)) {
      performMove(u, best);
      setTimeout(done, 60);
      return;
    }
  }

  if (enemies.length) {
    const target = enemies.slice().sort((a, b) => scoreTargetV2(u, b, pref, diff) - scoreTargetV2(u, a, pref, diff))[0];
    const w = findBestWeapon(u, target);
    if (w >= 0 && hexDist(u, target) <= u.def.weapons[w].r) orderFire(u, target, [w], 'suppress');
  }
  done();
}

function aiRetreatUnit(u, enemies, done) {
  if (u.mp <= 0) { done(); return; }
  const reach = reachableCells(u, u.mp);
  if (!reach.size) { done(); return; }
  const ec = aiCenter(enemies);
  let best = null, bs = -Infinity;
  reach.forEach(v => {
    let s = hexDist({c: v.c, r: v.r}, ec) * 2;
    const cell = cellAt(v.c, v.r), tc = TERRAIN[cell.t];
    s += tc.cov * 10 + tc.con * 5;
    if (s > bs) { bs = s; best = v; }
  });
  if (best && (best.c !== u.c || best.r !== u.r)) performMove(u, best);
  setTimeout(done, 50);
}

/* ============================================================
 * 7. 各兵种行动（难度驱动）
 * ============================================================ */
function aiEWAction(u, enemies, diff, pref) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  if (!t.ew) return;
  if (u.def.ew.jam < 1 || u.mp < 2) return;
  const m = PREF_MOD_V2[pref] || PREF_MOD_V2.balanced;
  const hv = enemies.filter(e => e.def.pts >= 40).slice(0, 3);
  if (!hv.length) return;

  if (t.hack && m.hack >= 1.0) {
    const cmd = hv.filter(e => String(e.def.cap || '').includes('指挥') || String(e.def.cap || '').includes('通信'));
    if (cmd.length && u.def.ew.jam >= 5 && hexDist(u, cmd[0]) <= 6) {
      executeHack(u, cmd[0].c, cmd[0].r);
      return;
    }
  }
  if (t.ew === 'advanced' && pref === 'signals') {
    const radarTgts = hv.filter(e => e.def.sens.radar >= 3 || e.def.cap.includes('雷达'));
    if (radarTgts.length && hexDist(u, radarTgts[0]) <= 5) {
      executeJamming(u, radarTgts[0].c, radarTgts[0].r, 'RADAR');
      return;
    }
  }
  if (hexDist(u, hv[0]) <= 3 + u.def.ew.jam * 0.5 * m.ew) {
    executeJamming(u, hv[0].c, hv[0].r, 'VHF');
  }
}

function aiReconAction(u, enemies, pref, diff) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  if (!t.ew && u.def.cat !== 'RECON') return;
  if (u.mp < 1) return;

  const unknown = enemies.filter(e => !e.spotted[u.side]);
  const target = unknown.length ? unknown[0] : enemies[0];
  if (!target) return;

  if (hexDist(u, target) <= 8 && u.def.cat === 'RECON') {
    executeEWRecon(u, target.c, target.r);
  }

  if (u.mp > 0 && (u.def.cat === 'RECON' || u.def.cat === 'UAV')) {
    const reach = reachableCells(u, u.mp);
    if (!reach.size) return;
    const desired = pref === 'signals' ? 4 : pref === 'maneuver' ? 3 : 5;
    let best = null, bs = Infinity;
    reach.forEach(v => {
      const s = Math.abs(hexDist({c: v.c, r: v.r}, target) - desired);
      if (s < bs) { bs = s; best = v; }
    });
    if (best && (best.c !== u.c || best.r !== u.r)) performMove(u, best);
  }
}

function aiArtyAction(u, enemies, pref, diff) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  if (!t.arty) return;
  if (u.rangedUsedThisTurn || !enemies.length) return;

  const maxR = Math.max(...u.def.weapons.map(w => w.r), 0);
  const priority = enemies
    .filter(e => hexDist(u, e) <= maxR)
    .sort((a, b) => scoreTargetV2(u, b, pref, diff) - scoreTargetV2(u, a, pref, diff));

  let target = priority[0];
  if (!target) return;
  if (t.arty === 'priority' || pref === 'firepower') {
    const hard = priority.filter(e => ['ARM','ARTY','AD','LOG','EW'].includes(e.def.cat));
    if (hard.length) target = hard[0];
  }

  const wl = u.def.weapons.map((w, i) => i).filter(i =>
    canAreaFire(u.def.weapons[i]) && u.fired[i] < 1 &&
    u.ammo[i] >= Math.max(1, Math.round(u.def.weapons[i].rof))
  );
  if (wl.length) executeAreaFire(u, {c: target.c, r: target.r}, wl, 'suppress');
}

function aiAirAction(u, enemies, pref, diff) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  if (!t.air || !enemies.length) return;
  const ground = enemies.filter(e => e.def.mob !== 'air');
  if (!ground.length) return;

  let hv = null;
  if (t.sead) {
    const ad = ground.filter(e => e.def.cat === 'AD');
    if (ad.length) hv = ad;
  }
  if (!hv) {
    if (pref === 'maneuver')      hv = ground.filter(e => ['ARTY','LOG','AD','EW'].includes(e.def.cat));
    else if (pref === 'offensive') hv = ground.filter(e => ['ARM','AD','ARTY'].includes(e.def.cat));
    else                           hv = ground.filter(e => ['ARM','ARTY','AD','EW','LOG'].includes(e.def.cat));
  }
  const target = (hv.length ? hv : ground)
    .sort((a, b) => scoreTargetV2(u, b, pref, diff) - scoreTargetV2(u, a, pref, diff))[0];
  if (!target) return;

  const w = findBestWeapon(u, target);
  if (w >= 0 && hexDist(u, target) <= u.def.weapons[w].r) orderFire(u, target, [w], 'attack');
}

function aiADAction(u, enemies, bg, pref, diff) {
  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  if (!t.ad) return;

  const airTgts = enemies.filter(e => e.def.mob === 'air');
  if (airTgts.length) {
    const target = airTgts[0];
    const w = findBestWeapon(u, target);
    if (w >= 0 && hexDist(u, target) <= u.def.weapons[w].r) {
      orderFire(u, target, [w], 'attack');
      return;
    }
  }

  if (pref !== 'defensive') {
    const ground = enemies.filter(e => e.def.mob !== 'air');
    if (ground.length) {
      const target = ground.sort((a, b) => scoreTargetV2(u, b, pref, diff) - scoreTargetV2(u, a, pref, diff))[0];
      const w = findBestWeapon(u, target);
      if (w >= 0 && hexDist(u, target) <= u.def.weapons[w].r) {
        orderFire(u, target, [w], 'attack');
        return;
      }
    }
  }

  if (u.mp > 0) {
    const protect = bg.units.find(x =>
      !x.dead && ['ARM','ARTY','LOG'].includes(x.def.cat) && hexDist(u, x) > 2
    );
    if (protect) aiMoveTowards(u, {c: protect.c, r: protect.r}, 1, pref, diff);
  }
}

function aiLogAction(u, bg) {
  if (u.def.cat === 'LOG' && u.def.cap.includes('补给')) {
    const targets = bg.units.filter(x => !x.dead && x !== u && hexDist(u, x) <= 1);
    if (targets.length) doResupply(u, targets[0]);
  }
}

/* ============================================================
 * 8. 4 级专属战术：炮火准备 / 反炮兵打击 / 动态重组
 * ============================================================ */
function aiPrepFire(artyUnits, airUnits, enemies, diff) {
  const t = TACTIC_V2[diff];
  if (!t || !t.prepFire || !enemies.length) return;
  const frontline = enemies.filter(e =>
    !e.dead && ['INF','ARM','IFV','APC','RECON'].includes(e.def.cat)
  );
  if (!frontline.length) return;
  const target = frontline[0];
  [...artyUnits, ...airUnits].forEach(u => {
    if (u.dead || u.mp <= 0 || u.rangedUsedThisTurn) return;
    const wl = u.def.weapons.map((w, i) => i).filter(i => {
      const w = u.def.weapons[i];
      return canAreaFire(w) && u.fired[i] < 1 && u.ammo[i] >= Math.max(1, Math.round(w.rof));
    });
    if (wl.length && hexDist(u, target) <= Math.max(...u.def.weapons.map(w => w.r), 0)) {
      executeAreaFire(u, {c: target.c, r: target.r}, wl, 'suppress');
      log(`💥 炮火准备：${u.def.name} 压制 ${target.def.name}`, 'lg-ranged');
    }
  });
}

function aiCounterStrike(side, enemies, artyUnits) {
  const enemyArty = enemies.filter(e => !e.dead && e.def.cat === 'ARTY');
  if (!enemyArty.length) return;
  artyUnits.forEach(u => {
    if (u.dead || u.mp <= 0 || u.rangedUsedThisTurn) return;
    const target = enemyArty.slice().sort((a, b) => hexDist(u, a) - hexDist(u, b))[0];
    if (hexDist(u, target) <= Math.max(...u.def.weapons.map(w => w.r), 0)) {
      const wl = u.def.weapons.map((w, i) => i).filter(i => {
        const w = u.def.weapons[i];
        return canAreaFire(w) && u.fired[i] < 1 && u.ammo[i] >= Math.max(1, Math.round(w.rof));
      });
      if (wl.length) {
        executeAreaFire(u, {c: target.c, r: target.r}, wl, 'attack');
        log(`🎯 反炮兵打击：${u.def.name} → ${target.def.name}`, 'lg-ranged');
      }
    }
  });
}

function aiDynamicRegroup(side, groups) {
  if (!groups || groups.length < 2) return;
  const enemies = G.units.filter(e => !e.dead && e.side !== side && e.spotted[side]);
  if (!enemies.length) return;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!g.units.length) continue;
    const gp = aiPower(g.units);
    const near = enemies.filter(e => hexDist(aiCenter(g.units), e) <= 10);

    if (near.length && gp < aiPower(near) * 0.6) {
      let bestJ = -1, bd = Infinity;
      groups.forEach((o, j) => {
        if (j === i || !o.units.length) return;
        const d = hexDist(aiCenter(g.units), aiCenter(o.units));
        if (d < bd) { bd = d; bestJ = j; }
      });
      if (bestJ >= 0 && bd < 12) {
        groups[bestJ].units.push(...g.units);
        g.units = [];
        log(`🔀 动态重组：第${i + 1}群并入第${bestJ + 1}群`, 'lg-ew');
      }
    }
  }
}

/* ============================================================
 * 9. 战斗群执行（按难度决定行动序列）
 * ============================================================ */
function executeBattlegroupV2(bg, enemies, diff, pref, done) {
  const units = bg.units.filter(u => !u.dead && !u.carriedBy && !u.moving);
  if (!units.length) { done(); return; }

  const t = TACTIC_V2[diff] || TACTIC_V2.medium;
  const m = PREF_MOD_V2[pref] || PREF_MOD_V2.balanced;

  const roles = {assault: [], ad: [], recon: [], arty: [], ew: [], air: [], eng: [], log: []};
  units.forEach(u => {
    const c = u.def.cat;
    if (['ARM','IFV','INF','SF'].includes(c))      roles.assault.push(u);
    else if (c === 'AD')                             roles.ad.push(u);
    else if (c === 'RECON' || c === 'UAV')           roles.recon.push(u);
    else if (c === 'ARTY')                           roles.arty.push(u);
    else if (c === 'EW')                             roles.ew.push(u);
    else if (c === 'AIR' || c === 'HELI')            roles.air.push(u);
    else if (c === 'ENG')                            roles.eng.push(u);
    else                                              roles.log.push(u);
  });

  // 变频跳频（难度 + 偏好）
  if (t.freqHop && G.commLinks[bg.side].strength < 60 && G.freqHopping[bg.side] === 0 && m.ew >= 1.0) {
    const ecm = roles.ew.find(u => u.mp >= 2 && (u.def.ew.eccm > 0 || u.def.ew.jam >= 5));
    if (ecm) {
      ecm.mp -= 2;
      G.freqHopping[bg.side] = 3;
      G.units.filter(f => !f.dead && f.side === bg.side).forEach(f => { f.freqHopped = 3; });
      log(`📻 ${ecm.def.name} 变频跳频`, 'lg-ew');
    }
  }

  // 行动序列（偏好影响顺序）
  const order = [];
  if (t.ew && pref === 'signals') order.push('ew');
  if (t.counter === 'aggressive') order.push('counterStrike');
  if (t.counter)                   order.push('counter');
  if (t.ew)                        order.push('recon');
  if (t.arty === 'priority')       order.push('arty');
  if (t.air === 'priority' || (t.air && (pref === 'offensive' || pref === 'maneuver'))) order.push('air');
  if (t.fortify && pref === 'defensive') order.push('fortify');
  if (t.ad)                        order.push('ad');
  if (t.prepFire)                  order.push('prepFire');
  if (t.arty && !order.includes('arty')) order.push('arty');
  if (t.air && !order.includes('air'))   order.push('air');
  if (t.ew && !order.includes('ew'))     order.push('ew');
  if (t.fortify && !order.includes('fortify')) order.push('fortify');
  if (t.ew && !order.includes('recon'))  order.push('recon');
  order.push('assault');
  order.push('log');

  let oi = 0;
  const step = () => {
    if (oi >= order.length || G.aiAbort) { done(); return; }
    const cur = order[oi++];

    switch (cur) {
      case 'ew':
        roles.ew.forEach(u => aiEWAction(u, enemies, diff, pref));
        step();
        break;

      case 'counter':
        if (enemies.some(e => e.def.cat === 'ARTY')) {
          roles.recon.concat(roles.ad).forEach(u => {
            if ((u.def.cap.includes('反炮兵') || u.def.sens.radar >= 5) && u.mp >= 2) {
              executeCounterBattery(u);
            }
          });
        }
        step();
        break;

      case 'counterStrike':
        aiCounterStrike(bg.side, enemies, roles.arty);
        step();
        break;

      case 'recon':
        roles.recon.forEach(u => aiReconAction(u, enemies, pref, diff));
        step();
        break;

      case 'arty':
        roles.arty.forEach(u => aiArtyAction(u, enemies, pref, diff));
        step();
        break;

      case 'fortify':
        roles.eng.forEach(u => { if (u.mp >= 2) engineerFortify(u); });
        step();
        break;

      case 'air':
        roles.air.forEach(u => aiAirAction(u, enemies, pref, diff));
        step();
        break;

      case 'ad':
        roles.ad.forEach(u => aiADAction(u, enemies, bg, pref, diff));
        step();
        break;

      case 'prepFire':
        aiPrepFire(roles.arty, roles.air, enemies, diff);
        step();
        break;

      case 'log':
        roles.log.forEach(u => aiLogAction(u, bg));
        step();
        break;

      case 'assault': {
        let i = 0;
        const nextU = () => {
          if (i >= roles.assault.length || G.aiAbort) { step(); return; }
          const u = roles.assault[i++];
          if (u.dead || u.carriedBy || u.sup > 16 || u.pulseStunned > 0) {
            u.mp = 0;
            nextU();
            return;
          }
          aiAssaultUnit(u, enemies, bg, diff, pref, () => setTimeout(nextU, 40));
        };
        nextU();
        break;
      }

      default:
        step();
    }
  };
  step();
}

/* ============================================================
 * 10. ★ 唯一的 runAI（接管全局）
 * ============================================================ */
window.runAI = function (side) {
  if (G.gameOver) return;

  G.aiRunning = true;
  G.aiAbort = false;

  const diff = G.aiDifficulty[side] || 'medium';
  const pref = G.aiPreference[side] || 'balanced';
  const di = AI_DIFFICULTIES[diff] || AI_DIFFICULTIES.medium;
  const pi = AI_PREFERENCES[pref] || AI_PREFERENCES.balanced;
  log(`[${side === 0 ? '蓝' : '红'}方 AI·${di.n}·${pi.n}] 战斗群级行动`, 'lg-ew');

  const enemies = G.units.filter(e => !e.dead && e.side !== side && e.spotted[side]);

  // 集火协同目标（2/3/4 级共用）
  if (enemies.length) {
    G._aiCoord = G._aiCoord || {};
    const focus = enemies.slice().sort((a, b) => {
      const va = a.def.pts * (1 - a.hp / a.maxHp);
      const vb = b.def.pts * (1 - b.hp / b.maxHp);
      return vb - va;
    })[0];
    G._aiCoord[side] = {focusTarget: focus ? focus.uid : null};
  }

  const groups = formBattlegroups(side, diff);
  if (!groups.length) {
    G.aiRunning = false;
    setTimeout(() => endTurn(), 200);
    return;
  }

  // 4 级：动态重组（每 3 回合）
  if ((TACTIC_V2[diff] || {}).dynamicRegroup && G.turn % 3 === 1) {
    aiDynamicRegroup(side, groups);
  }

  // 玩家 AI 编队合并执行
  const playerTfs = (G.taskForces || []).filter(tf =>
    tf.side === side && tf.aiControlled && tf.units.some(u => !u.dead)
  );
  const keepIds = new Set(playerTfs.map(t => t.id));
  G.taskForces = (G.taskForces || []).filter(tf =>
    tf.side !== side || !tf.aiControlled || keepIds.has(tf.id)
  );
  groups.forEach(g => G.taskForces.push(g));

  const allGroups = groups.concat(
    playerTfs.map(tf => ({...tf, units: tf.units.filter(u => !u.dead)}))
  );
  log(`🗂 编成 ${groups.length} 合成群 + ${playerTfs.length} 玩家群`, 'lg-ew');

  let gi = 0;
  const nextGroup = () => {
    if (G.aiAbort || G.gameOver) {
      G.aiRunning = false;
      G.aiAbort = false;
      endTurn();
      return;
    }
    if (gi >= allGroups.length) {
      G.aiRunning = false;
      setTimeout(() => { if (!G.gameOver) endTurn(); }, 200);
      return;
    }
    const bg = allGroups[gi++];
    const alive = bg.units.filter(u => !u.dead);
    if (!alive.length) { nextGroup(); return; }
    bg.units = alive;
    bg.mission = decideMissionV2(bg, enemies, diff, pref);

    const tag = bg.mission === 'attack' ? '进攻'
              : bg.mission === 'defend' ? '防守'
              : bg.mission === 'retreat' ? '撤退'
              : bg.mission === 'recon' ? '侦察'
              : bg.mission === 'ew' ? '电子战'
              : '支援';
    log(`⚔【${bg.name}】${tag} (${alive.length}单位)`, 'lg-ew');
    executeBattlegroupV2(bg, enemies, diff, pref, () => setTimeout(nextGroup, 80));
  };
  nextGroup();
};