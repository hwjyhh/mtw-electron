/* ============================================================
 * MTW systems/area-fire.js
 * 区域射击（远程武器 / 曲射武器）
 * 依赖：constants / geometry / state / combat / visibility
 * ============================================================ */
'use strict';

function executeAreaFire(shooter, center, wIndices, mode) {
  if (shooter.rangedUsedThisTurn) return false;
  let anyOk = false;

  const affected = [{c: center.c, r: center.r}, ...hexNeighbors(center.c, center.r)];

  wIndices.forEach(wIdx => {
    const w = shooter.def.weapons[wIdx];
    if (!w) return;
    if (shooter.fired[wIdx] >= 1) { log(`${w.n}: 该武器已攻击`, 'lg-sys'); return; }

    const ammoCost = Math.max(1, Math.round(w.rof));
    if (shooter.ammo[wIdx] < ammoCost) { log(`${w.n}: 弹药不足`, 'lg-sys'); return; }
    if (!canAreaFire(w)) { log(`${w.n}: 无法打击空地`, 'lg-sys'); return; }
    if (w.band && shooter.jammedBands.has(w.band)) { log(`${w.n}: 频段被干扰`, 'lg-ew'); return; }

    const dist = hexDist(shooter, center);
    if (dist > w.r) { log(`${w.n}: 超出射程`, 'lg-sys'); return; }
    if (!isIndirectWeapon(w) && !hasLOS({c: shooter.c, r: shooter.r}, center)) {
      log(`${w.n}: 无视线`, 'lg-sys'); return;
    }
    if (isRangedWeapon(w) && !isCellObserved(center.c, center.r, shooter.side)) {
      log(`${w.n}: 需友军观察`, 'lg-sys'); return;
    }

    shooter.ammo[wIdx] -= ammoCost;
    shooter.fired[wIdx] += 1;
    anyOk = true;
    shooter.rangedUsedThisTurn = true;

    addEffect('muzzle', shooter.c, shooter.r, {dur: 15, color: '#ffd050'});

    // 修复原代码 bug：原代码引用了未定义变量 target，此处用 center 作为瞄准点
    {
      const tw = hexCenter(center.c, center.r, HS);
      const sw = hexCenter(shooter.c, shooter.r, HS);
      const dx = sw.x - tw.x, dy = sw.y - tw.y;
      const len = Math.hypot(dx, dy) || 1;
      shooter.recoil = {
        dx: (dx / len) * 8,
        dy: (dy / len) * 8,
        until: performance.now() + 140
      };
    }

    addEffect('explosion', center.c, center.r, {dur: 35, size: 1.4, color: '#ff6a20'});

    let totalHit = 0, totalKill = 0, suppressCount = 0;

    affected.forEach(ac => {
      const target = unitAt(ac.c, ac.r);
      if (!target || target.dead) return;
      if (target.def.mob === 'air' && !ANTI_AIR_WEAPON_TYPES.includes(w.t)) return;

      const sameSide = target.side === shooter.side;
      const centerBonus = (ac.c === center.c && ac.r === center.r) ? 1.0 : 0.5;
      const p = hitChance(shooter, target, w, hexDist(shooter, ac)) * centerBonus;

      if (Math.random() < p) {
        totalHit++;
        const isSoft = ['INF','SF','RECON'].includes(target.def.cat) && target.def.armor.f < 20;
        let dmg = computeDamage(w, target, isSoft);
        if (sameSide) dmg *= 0.3;
        target.hp -= dmg;
        if (target.hp <= 0) {
          target.dead = true;
          target.morale = 0;
          totalKill++;
          spawnWreck(target);
        }
      }

      let supAdd = (2 + (w.sup || 0) * 2 + (w.pen > 50 ? 1 : 0)) * centerBonus;
      if (mode === 'suppress') supAdd *= 1.6;
      target.sup = clamp(target.sup + supAdd, 0, 20);
      target.morale = clamp(target.morale - 0.25 * centerBonus * (mode === 'suppress' ? 1.4 : 1), 1, 10);
      suppressCount++;
    });

    log(
      `${mode === 'suppress' ? '[压制]' : '[区域射击]'} ${shooter.def.name} ${w.n} 轰击 (${center.c},${center.r}) 命中${totalHit} 压制${suppressCount}${totalKill ? ' 摧毁' + totalKill : ''}`,
      'lg-ranged'
    );

    if (typeof triggerCounterBattery === 'function') {
      triggerCounterBattery(shooter.side, shooter.c, shooter.r);
    }
  });

  if (anyOk) { recalcVisibility(); updateUI(); }
  return anyOk;
}