/* ============================================================
 * MTW systems/combat.js
 * 命中率 / 装甲 / 防护 / 伤害 / 单次射击结算
 * 依赖：constants / geometry / state / data-units
 * ============================================================ */
'use strict';

/* ---------- 命中率 ---------- */
function hitChance(shooter, target, w, dist) {
  if (dist > w.r) return 0;
  const rr = dist / Math.max(1, w.r);
  let p = w.acc;
  p *= (1 - 0.62 * Math.pow(rr, 1.8));
  p *= (0.55 + 0.055 * shooter.def.training);
  p *= (1 - clamp(shooter.sup / 24, 0, 0.6));
  p *= (0.7 + 0.03 * shooter.morale);

  const cell = cellAt(target.c, target.r);
  const terr = TERRAIN[cell.t];
  let cover = terr.cov + (cell.fort ? 0.10 * cell.fort : 0);
  if (target.dugIn > 0) cover += 0.15;
  if (target.def.mob === 'static') cover += 0.10;
  p *= (1 - clamp(cover, 0, 0.85) * 0.75);
  p *= (1 - clamp(terr.con * 0.55, 0, 0.5));
  if (G.wrecks.some(wk => wk.c === target.c && wk.r === target.r)) p *= 0.88;
  if (target.moved > 0) p *= 0.85;
  if (target.moving) p *= 0.85;
  if (target.pulseStunned > 0) p *= 1.3;

  if (shooter.stance === 'attack')       p *= 1.15;
  else if (shooter.stance === 'defense') p *= 0.85;
  if (target.stance === 'defense')       p *= 0.85;
  else if (target.stance === 'attack')   p *= 1.15;

  const shooterJamPenalty = clamp(shooter.jamming * 0.02, 0, 0.35);
  p *= (1 - shooterJamPenalty);
  const shooterComm = G.commLinks[shooter.side].strength;
  if (shooterComm < 70) p *= (0.85 + 0.15 * shooterComm / 70);
  if (target.cryptoBrokenBy === shooter.side) p *= 1.2;

  if (w.guid) {
    const isInf = target.def.cat === 'INF';
    if (!isInf) {
      const jf = clamp(target.jamming * 0.02 + shooter.jamming * 0.03, 0, 0.55);
      p *= (1 - jf);
    }
    const IR_GUIDED = ['atgm','manpads','sam','drone'];
    if (target.def.ew.decoy > 0 && IR_GUIDED.includes(w.t)) {
      const irPenalty = [0, 0.25, 0.40, 0.55][Math.min(3, target.def.ew.decoy)];
      const distFactor = 0.7 + 0.3 * rr;
      p *= (1 - irPenalty * distFactor);
    }
    if (target.decoyActive && IR_GUIDED.includes(w.t)) p *= 0.5;
    if (w.t === 'atgm' && ['ARM','IFV','APC','NAV'].includes(target.def.cat)) p *= 1.25;
  }

  // 空中目标：仅防空武器有效
  if (target.def.mob === 'air') {
    if (ANTI_AIR_WEAPON_TYPES.includes(w.t))       p *= 1.15;
    else if (SMALL_ARMS_TYPES.includes(w.t))       p *= 0.12;
    else return 0;
  } else {
    if (ANTI_AIR_WEAPON_TYPES.includes(w.t)) p *= 0.25;
  }

  return clamp(p, 0.01, 0.97);
}

/* ---------- 装甲计算 ---------- */
function armorAt(target, facing, isTop) {
  if (isTop) return target.def.armor.t + target.def.addArmor * 0.5;
  if (facing === 'front') return target.def.armor.f + target.def.addArmor;
  if (facing === 'side')  return target.def.armor.s + target.def.addArmor;
  return target.def.armor.t * 0.6 + target.def.addArmor * 0.8;
}

/* ---------- 主动防护（APS / ERA） ---------- */
function applyProtection(target, w, hits) {
  let blocked = 0, apsFired = false, eraFired = false;
  const APS_TYPES = ['rpg','atgm','drone','cannon','mortar','howitzer','mlrs','manpads','sam'];

  if (target.def.aps > 0 && target.apsShots > 0 && APS_TYPES.includes(w.t)) {
    let baseChance = 0.25 + 0.18 * target.def.aps;
    if (w.t === 'rpg' || w.t === 'drone') baseChance *= 1.2;
    const apsChance = clamp(baseChance, 0.1, 0.9);
    for (let i = 0; i < hits; i++) {
      if (Math.random() < apsChance) { blocked++; apsFired = true; }
    }
    if (apsFired) target.apsShots = Math.max(0, target.apsShots - 1);
  }

  if (target.def.era > 0 && ['rpg','atgm','cannon'].includes(w.t) && w.pen < 900) {
    const eraChance = clamp(0.15 + 0.15 * target.def.era, 0, 0.65);
    for (let i = blocked; i < hits; i++) {
      if (Math.random() < eraChance) { blocked++; eraFired = true; }
    }
  }

  return {blocked, apsFired, eraFired};
}

/* ---------- 伤害计算 ---------- */
function computeDamage(w, target, isSoft, hitFacing, isTop) {
  if (isSoft) {
    switch (w.t) {
      case 'howitzer': case 'mortar': case 'mlrs': return rnd(2.4, 4.5);
      case 'cannon':   case 'atgm':   case 'drone': return rnd(1.8, 3.6);
      case 'rpg':       return rnd(1.5, 3.0);
      case 'autocannon':return rnd(1.0, 2.2);
      case 'mg':        return rnd(0.8, 1.8);
      case 'sniper':    return rnd(0.8, 1.6);
      default:          return rnd(0.6, 1.6);
    }
  }

  const arm = armorAt(target, hitFacing, isTop);
  let baseDmg;
  if (w.pen >= arm * 1.1)      baseDmg = rnd(2.2, 4.2);
  else if (w.pen >= arm * 0.6) baseDmg = rnd(0.6, 1.6);
  else                          baseDmg = rnd(0.05, 0.35);

  if (['mg','autocannon'].includes(w.t) && w.pen < arm * 1.1) {
    const ratio = w.pen / Math.max(1, arm);
    if (ratio < 0.5)      baseDmg *= 0.05;
    else if (ratio < 1.0) baseDmg *= 0.2;
  }
  return baseDmg;
}

/* ---------- 单次射击结算 ---------- */
function resolveShot(shooter, target, wIdx, mode) {
  const w = shooter.def.weapons[wIdx];
  const dist = hexDist(shooter, target);

  if (dist > w.r) return {ok: false, msg: '超出射程'};
  if (!hasLOS(shooter, target)) return {ok: false, msg: '无视线'};
  if (shooter.fired[wIdx] >= 1) return {ok: false, msg: '该武器本回合已攻击'};

  const ammoCost = Math.max(1, Math.round(w.rof));
  if (shooter.ammo[wIdx] < ammoCost) return {ok: false, msg: '弹药不足'};
  if (w.band && shooter.jammedBands.has(w.band)) return {ok: false, msg: `${w.n} 频段被干扰`};
  if (target.def.mob === 'air' && !canEngageAir(w)) return {ok: false, msg: `${w.n} 无法攻击空中目标`};

  shooter.ammo[wIdx] -= ammoCost;
  shooter.fired[wIdx] += 1;

  const p = hitChance(shooter, target, w, dist);
  const isSoft = ['INF','SF','RECON'].includes(target.def.cat) && target.def.armor.f < 20;
  let hitFacing = 'front', isTop = false;
  if (w.top === 1 || ['mortar','howitzer','mlrs'].includes(w.t)) isTop = true;
  else hitFacing = getHitFacing(target, shooter);

  const arm = armorAt(target, hitFacing, isTop);
  const hits = Math.random() < p ? 1 : 0;
  const prot = applyProtection(target, w, hits);
  const effectiveHits = hits - prot.blocked;

  if (effectiveHits > 0) {
    const dmg = computeDamage(w, target, isSoft, hitFacing, isTop);
    target.hp -= dmg;
  }

  const baseSup = (effectiveHits > 0 ? 3.5 : 1.4) * (1 + (w.pen > 50 ? 0.5 : 0)) * (1 + (w.sup || 0) * 0.5);
  target.sup = clamp(target.sup + baseSup, 0, 20);
  if (effectiveHits > 0) target.morale = clamp(target.morale - rnd(0.2, 0.7) * effectiveHits, 1, 10);
  if (mode === 'suppress') target.sup = clamp(target.sup + effectiveHits * 2, 0, 20);

  if (target.hp <= 0) { target.dead = true; target.morale = 0; }
  shooter.sup = clamp(shooter.sup + 0.3, 0, 20);

  if ((isIndirectWeapon(w) || isRangedWeapon(w)) && typeof triggerCounterBattery === 'function') {
    triggerCounterBattery(shooter.side, shooter.c, shooter.r);
  }

  return {
    ok: true, hits, blocked: prot.blocked, apsFired: prot.apsFired, eraFired: prot.eraFired,
    kills: target.dead ? 1 : 0, shots: 1, p, dist, w,
    effectiveHits, hitFacing, isTop, armor: arm
  };
}
/* ---------- 射击指令执行（补充缺失的 orderFire） ---------- */
function orderFire(shooter, target, wIndices, mode) {
  if (!shooter || !target || shooter.dead || target.dead) return;

  let anyAction = false;
  wIndices.forEach(wIdx => {
    const w = shooter.def.weapons[wIdx];
    if (!w) return;
    
    // 播放开火特效
    addEffect('muzzle', shooter.c, shooter.r, {dur: 10, color: '#ffcc44'});
    if (!isIndirectWeapon(w)) {
      addEffect('tracer', target.c, target.r, {dur: 15, ox: shooter.c - target.c, oy: shooter.r - target.r});
    }

    // 调用战斗结算
    const res = resolveShot(shooter, target, wIdx, mode);
    if (res.ok) {
      anyAction = true;
      if (res.effectiveHits > 0) {
        addEffect('hit', target.c, target.r, {dur: 20});
      }
      if (target.dead) {
        spawnWreck(target);
        log(`💀 ${shooter.def.name} 摧毁了 ${target.def.name}`, 'lg-hit');
      } else if (res.effectiveHits > 0) {
        log(`🎯 ${shooter.def.name} ${w.n} 命中 ${target.def.name}`, 'lg-ok');
      } else {
        log(`${shooter.def.name} ${w.n} 未命中 ${target.def.name}`, 'lg-sys');
      }
    }
  });

  if (anyAction) {
    recalcVisibility();
    updateUI();
    draw();
  }
}