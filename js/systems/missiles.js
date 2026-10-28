/* ============================================================
 * MTW systems/missiles.js
 * 导弹类别 / 比例导引 / 反导拦截 / 命中结算 / NEZ
 * 依赖：constants / geometry / state / combat / radar / log
 * 合并自原 M1 导弹数据 + M3 全部
 * ============================================================ */
'use strict';

/* ---------- 单位换算常量（1 格 = 100m） ---------- */
const HEX_METER = 100;
const G0        = 9.81;

/* ---------- 导弹类别模板 ---------- */
const MSL_CLASS = {
  atgm:    {speed: 300,  maxG: 18, fuel: 22,  arh: false},
  sam:     {speed: 1000, maxG: 35, fuel: 25,  arh: true},
  manpads: {speed: 750,  maxG: 28, fuel: 10,  arh: false},
  aam:     {speed: 1400, maxG: 45, fuel: 14,  arh: true},
  arm:     {speed: 900,  maxG: 22, fuel: 18,  arh: true},
  drone:   {speed: 180,  maxG: 6,  fuel: 120, arh: false}
};

/* ---------- 具体武器覆写（速度/过载/燃料/类别） ---------- */
const MSL_OVERRIDE = {
  'AIM-120 AMRAAM':    {speed: 1200, maxG: 40, fuel: 12, cls: 'aam'},
  'PAC-3 MSE':         {speed: 1800, maxG: 50, fuel: 30, cls: 'sam'},
  'THAAD拦截弹':       {speed: 2800, maxG: 45, fuel: 32, cls: 'sam', interceptor: true},
  '标枪导弹':          {speed: 280,  maxG: 20, fuel: 18, cls: 'atgm'},
  '地狱火AGM-114R':    {speed: 450,  maxG: 22, fuel: 25, cls: 'atgm'},
  'AGM-88 HARM':       {speed: 1200, maxG: 25, fuel: 20, cls: 'arm'},
  'AGM-88G反辐射':     {speed: 1400, maxG: 28, fuel: 22, cls: 'arm'},
  'Kh-31P反辐射':      {speed: 1300, maxG: 26, fuel: 20, cls: 'arm'},
  'HQ-9B防空导弹':     {speed: 1800, maxG: 45, fuel: 35, cls: 'sam'},
  'S-400 48N6E3':      {speed: 2100, maxG: 48, fuel: 35, cls: 'sam'},
  '柳叶刀-3巡飞弹':    {speed: 150,  maxG: 8,  fuel: 80, cls: 'drone'},
  '弹簧刀600巡飞弹':   {speed: 160,  maxG: 8,  fuel: 75, cls: 'drone'},
  '红箭-12反坦克导弹': {speed: 280,  maxG: 20, fuel: 18, cls: 'atgm'},
  '红箭-10反坦克导弹': {speed: 350,  maxG: 22, fuel: 22, cls: 'atgm'},
  '短号-M反坦克导弹':  {speed: 320,  maxG: 20, fuel: 20, cls: 'atgm'}
};

/* ---------- 导弹参数解析 ---------- */
function getMissileDef(wep) {
  const ov = MSL_OVERRIDE[wep.n];
  if (ov) return Object.assign({}, MSL_CLASS[ov.cls] || MSL_CLASS.sam, ov, {name: wep.n});
  const cls = {atgm: 'atgm', sam: 'sam', manpads: 'manpads', drone: 'drone'}[wep.t];
  if (!cls) return null;
  return Object.assign({}, MSL_CLASS[cls], {name: wep.n});
}

/* ---------- 坐标换算 ---------- */
function hexToM(c, r) {
  const h = hexCenter(c, r, 1);
  return {x: h.x * HEX_METER, y: h.y * HEX_METER};
}
function mToHex(x, y) {
  return {x: x / HEX_METER, y: y / HEX_METER};
}

/* ---------- 发射导弹 ---------- */
function launchMissile(shooter, target, wep, opts) {
  opts = opts || {};
  const def = getMissileDef(wep);
  if (!def) return null;

  const start = hexToM(shooter.c, shooter.r);
  const end   = hexToM(target.c, target.r);
  const dx = end.x - start.x, dy = end.y - start.y;
  const d = Math.hypot(dx, dy) || 1;

  MISSILES.push({
    id: 'msl_' + Math.random().toString(36).slice(2, 8),
    side: shooter.side,
    sourceUid: shooter.uid,
    targetUid: target.uid,
    pos: {x: start.x, y: start.y, z: unitAltitudeMeters(shooter)},
    vel: {x: dx / d * def.speed, y: dy / d * def.speed, z: 0},
    speed: def.speed,
    maxSpeed: def.speed,
    maxG: def.maxG,
    fuel: def.fuel,
    fuelMax: def.fuel,
    homing: def.arh ? 'arh' : 'ir',
    wep,
    age: 0,
    dead: false,
    visualOnly: !!opts.visualOnly
  });
  return true;
}

/* ---------- 比例导引（PN） ---------- */
function proportionalNavigation(m, tgt, dt) {
  const tp = hexToM(tgt.c, tgt.r);
  const rx = tp.x - m.pos.x;
  const ry = tp.y - m.pos.y;
  const rz = unitAltitudeMeters(tgt) - m.pos.z;
  const dist = Math.hypot(rx, ry, rz);
  if (dist < 0.5) return {hit: true, dist};

  const losX = rx / dist, losY = ry / dist, losZ = rz / dist;
  const vmag = Math.hypot(m.vel.x, m.vel.y, m.vel.z) || 1;
  const vx = m.vel.x / vmag, vy = m.vel.y / vmag, vz = m.vel.z / vmag;

  const angle = Math.acos(Math.max(-1, Math.min(1, vx * losX + vy * losY + vz * losZ)));
  const maxTurn = (m.maxG * G0) / Math.max(vmag, 1) * dt;

  if (angle > 1e-4 && maxTurn > 1e-4) {
    const ratio = Math.min(1, maxTurn / angle);
    const nx = vx + (losX - vx) * ratio;
    const ny = vy + (losY - vy) * ratio;
    const nz = vz + (losZ - vz) * ratio;
    const nm = Math.hypot(nx, ny, nz) || 1;
    m.vel.x = nx / nm * m.speed;
    m.vel.y = ny / nm * m.speed;
    m.vel.z = nz / nm * m.speed;
  }
  return {hit: false, dist};
}

/* ---------- 每帧导弹推进 ---------- */
function missileTick(dt) {
  for (let i = MISSILES.length - 1; i >= 0; i--) {
    const m = MISSILES[i];
    if (m.dead) { MISSILES.splice(i, 1); continue; }

    m.age += dt;
    const tgt = G.units.find(u => u.uid === m.targetUid && !u.dead);
    if (!tgt) { m.dead = true; MISSILES.splice(i, 1); continue; }

    // 燃料耗尽：减速 + 降过载
    if (m.fuel > 0) {
      m.fuel -= dt;
    } else {
      m.speed *= Math.pow(0.85, dt * 5);
      m.maxG = Math.max(2, m.maxG * Math.pow(0.7, dt * 5));
    }

    const res = proportionalNavigation(m, tgt, dt);
    if (res.hit || res.dist < 50) {
      applyMissileHit(m, tgt);
      m.dead = true;
      MISSILES.splice(i, 1);
      continue;
    }

    m.pos.x += m.vel.x * dt;
    m.pos.y += m.vel.y * dt;
    m.pos.z += m.vel.z * dt;

    if (checkInterception(m)) {
      m.dead = true;
      MISSILES.splice(i, 1);
      continue;
    }

    const hex = mToHex(m.pos.x, m.pos.y);
    if (!inBounds(Math.round(hex.x), Math.round(hex.y)) || m.age > 60) {
      m.dead = true;
      MISSILES.splice(i, 1);
    }
  }
}

/* ---------- 反导拦截（近防判定） ---------- */
function checkInterception(missile) {
  if (missile.visualOnly) return false;

  for (const ad of G.units) {
    if (ad.dead || ad.carriedBy || ad.side === missile.side) continue;
    const rp = radarParams(ad);
    if (!rp || !ad.radarOn) continue;

    const ap = hexToM(ad.c, ad.r);
    const d = Math.hypot(
      missile.pos.x - ap.x,
      missile.pos.y - ap.y,
      missile.pos.z - unitAltitudeMeters(ad)
    );
    if (d > rp.killRadiusM) continue;

    const relSpeed = Math.hypot(missile.vel.x, missile.vel.y, missile.vel.z);
    const speedPenalty = Math.max(0.1, 1 - relSpeed / 3000);
    const sig = Math.pow(1 / Math.max(d, 50), 2) * 1e4 * 1.5;
    const jam = ad.jamming * 50;
    const burnthrough = sig / (1 + jam);
    const prob = Math.max(0.05, Math.min(0.95,
      0.6 * Math.min(1.5, 1 + 0.1) * speedPenalty * Math.min(1.2, burnthrough)
    ));

    if (Math.random() < prob) {
      addEffect('explosion', ad.c, ad.r, {dur: 22, size: 1.0, color: '#a0e0ff'});
      log(`🛡 ${ad.def.name} 拦截来袭导弹 (${(prob * 100).toFixed(0)}%)`, 'lg-aps');
      return true;
    }
  }
  return false;
}

/* ---------- 导弹命中结算 ---------- */
function applyMissileHit(m, target) {
  const hex = mToHex(m.pos.x, m.pos.y);

  if (m.visualOnly) {
    addEffect('explosion', Math.round(hex.x), Math.round(hex.y),
      {dur: 35, size: 1.3, color: '#ff6a20'});
    return;
  }

  const w = m.wep;
  const isSoft = ['INF','SF','RECON'].includes(target.def.cat) && target.def.armor.f < 20;
  const sp = mToHex(m.pos.x, m.pos.y);
  const facing = getHitFacing(target, {c: Math.round(sp.x), r: Math.round(sp.y)});
  const armor = isSoft ? 0 : armorAt(target, facing, w.top === 1);

  let dmg;
  if (isSoft)                     dmg = rnd(2.5, 5.5);
  else if (w.pen >= armor * 1.1)  dmg = rnd(2.5, 5.5);
  else if (w.pen >= armor * 0.6)  dmg = rnd(0.8, 2.0);
  else                             dmg = rnd(0.1, 0.6);

  const prot = applyProtection(target, w, 1);
  dmg *= (1 - prot.blocked);
  target.hp -= dmg;
  target.sup = clamp(target.sup + 4, 0, 20);
  target.morale = clamp(target.morale - 0.6, 1, 10);

  addEffect('explosion', Math.round(hex.x), Math.round(hex.y),
    {dur: 35, size: 1.3, color: '#ff6a20'});

  if (target.hp <= 0) {
    target.dead = true;
    spawnWreck(target);
    log(`💥 导弹摧毁 ${target.def.name}`, 'lg-hit');
  } else {
    log(`💥 导弹命中 ${target.def.name} -${dmg.toFixed(1)}HP`, 'lg-hit');
  }
}

/* ---------- NEZ（不可逃逸区） ---------- */
function computeNEZ(shooter, wep) {
  const def = getMissileDef(wep);
  if (!def) return null;
  return {
    center: {c: shooter.c, r: shooter.r},
    radius: Math.min(wep.r * 1.2, def.fuel * def.speed * 0.9 / (HEX_METER * 10)),
    minRadius: 1
  };
}

function isInNEZ(nez, target) {
  if (!nez) return false;
  const d = hexDist(nez.center, target);
  return d <= nez.radius && d >= nez.minRadius;
}