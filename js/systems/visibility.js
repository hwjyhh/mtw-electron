/* ============================================================
 * MTW systems/visibility.js
 * 传感器 / 可见性 / 电子战环境
 * 依赖：constants / geometry / state / data-units
 * 说明：canSee 为合并版，radarSNR 若存在则走 RCS+3D 高级探测
 * ============================================================ */
'use strict';

/* ---------- 单位支持频段 ---------- */
function getBandForUnit(u) {
  if (u.def.cat === 'EW') return ['VHF','UHF','HF','SATCOM'];
  if (u.def.cat === 'AD' && u.def.sens.radar > 0) return ['RADAR'];
  if (u.def.cat === 'UAV') return ['SATCOM','UHF','SHF'];
  if (u.def.cat === 'AIR' || u.def.cat === 'HELI') return ['VHF','UHF'];
  if (u.def.cat === 'LOG' || u.def.cat === 'RECON') return ['VHF','UHF','HF'];
  return ['VHF','UHF'];
}

/* ---------- 传感器有效视程 ---------- */
function sensorRange(u) {
  const s = u.def.sens;
  let base = Math.max(s.v, s.t);
  const isInf = ['INF','SF','RECON','FORT'].includes(u.def.cat) && u.def.mob !== 'air';
  if (!isInf) {
    const jf = clamp(1 - u.jamming / 30, 0.15, 1);
    base *= jf;
    const comm = G.commLinks[u.side].strength;
    if (comm < 50) base *= 0.8;
    if (u.stance === 'defense') base *= 1.15;
  }
  if (u.sensorDown > 0) base *= 0.4;
  return base;
}

/* ---------- 可见性（合并版） ---------- */
function canSee(observer, target) {
  if (observer.side === target.side) return true;
  if (observer.dead || target.dead) return false;
  const d = hexDist(observer, target);
  const sr = sensorRange(observer);
  if (d > sr) return false;
  if (!hasLOS(observer, target)) return false;

  // 空中目标：需要雷达（若 radar.js 未加载则无法探测）
  if (target.def.mob === 'air') {
    if (typeof radarParams === 'function' && typeof radarSNR === 'function') {
      const rp = radarParams(observer);
      if (!rp) return false;
      if (observer.radarOn === false) return false;
      return radarSNR(observer, target) > 10;
    }
    return false;
  }

  // 地面目标：隐蔽度 + 姿态 + 状态
  const cell = cellAt(target.c, target.r);
  let con = TERRAIN[cell.t].con + (target.def.stealth - 5) * 0.04;
  if (target.decoyActive) return false;
  if (target.stance === 'defense')     con += 0.2;
  else if (target.stance === 'attack') con -= 0.25;
  if (target.moving) con -= 0.15;
  if (target.cryptoBrokenBy != null) con -= 0.4;
  return (sr - d + 2 - con * 8) > 1;
}

/* ---------- 电子战环境计算（每回合/每帧可调） ---------- */
function computeEW() {
  G.units.forEach(u => {
    u.jamming = 0;
    u.jammingBy = [];
    u.jammedBands = new Set();
    u.decoyActive = false;
    if (u.freqHopped > 0) u.freqHopped--;
  });

  [0,1].forEach(side => {
    EW_BANDS_ALL.forEach(band => G.ewJam[side][band].clear());
  });

  // 频谱负载统计
  [0,1].forEach(side => {
    const jammers = G.units.filter(u =>
      !u.dead && u.side === side && !u.carriedBy &&
      (u.def.ew.jam > 0 || u.def.cat === 'EW')
    );
    let load = 0;
    jammers.forEach(j => { load += j.def.ew.jam * 8; });
    G.spectrumLoad[side] = clamp(load, 0, 100);
  });

  // 收集干扰源
  const jammers = [];
  G.units.forEach(u => {
    if (u.dead || u.carriedBy) return;
    if (u.def.ew.jam <= 0) return;
    const strength = u.def.ew.jam + (u.def.sens.radar > 0 ? 1 : 0);
    if (strength <= 0) return;
    const bands = getBandForUnit(u);
    jammers.push({u, strength, bands});
    bands.forEach(band => G.ewJam[u.side][band].add(u.uid));
  });

  // 对每个单位计算受干扰量
  G.units.forEach(u => {
    if (u.dead || u.carriedBy) return;

    if (u.pulseStunned > 0) {
      u.jamming = 30;
      u.jammedBands = new Set(['VHF','UHF','HF','SATCOM','RADAR','IR']);
      return;
    }

    const isInf = ['INF','SF','RECON','FORT','MINE'].includes(u.def.cat) && u.def.mob !== 'air';
    if (isInf && u.def.cat !== 'EW') return;

    let totalJam = 0;
    const jammedBands = new Set();

    jammers.forEach(j => {
      if (j.u.side === u.side) return;
      const d = hexDist(j.u, u);
      const range = 5 + j.strength * 0.5;
      if (d > range) return;
      const falloff = 1 - d / (range + 1);
      let jamStrength = j.strength * falloff;

      const targetBands = getBandForUnit(u);
      const matchedBands = j.bands.filter(b => targetBands.includes(b));
      if (matchedBands.length === 0) return;

      matchedBands.forEach(b => jammedBands.add(b));
      totalJam += jamStrength;
      u.jammingBy.push({by: j.u.uid, name: j.u.def.name, bands: matchedBands, strength: jamStrength});
    });

    const eccm = u.def.ew.eccm || 0;
    const freqBonus = u.freqHopped > 0 ? 5 : 0;
    u.jamming = Math.max(0, totalJam - eccm * 1.5 - freqBonus);
    u.jammedBands = jammedBands;
  });

  // 通信链路强度
  [0,1].forEach(side => {
    const units = G.units.filter(u => !u.dead && u.side === side);
    if (units.length === 0) { G.commLinks[side] = {strength: 100, sources: []}; return; }
    let totalPenalty = 0;
    units.forEach(u => {
      if (u.def.cat === 'LOG' && (u.def.echelon === 'CO' || u.def.cap.includes('指挥'))) totalPenalty += u.jamming * 2;
      if (u.def.cap.includes('通信中继')) totalPenalty += u.jamming * 1.5;
      totalPenalty += u.jamming * 0.3;
      if (u.cryptoBrokenBy != null) totalPenalty += 15;
    });
    if (G.freqHopping[side] > 0) totalPenalty = Math.max(0, totalPenalty - 20);
    const strength = clamp(100 - totalPenalty, 0, 100);
    G.commLinks[side] = {
      strength,
      sources: units.filter(u => u.jamming > 0).map(u => u.uid)
    };
  });

  // 脉冲眩晕递减 / 反炮兵标记过期
  G.units.forEach(u => { if (u.pulseStunned > 0) u.pulseStunned--; });
  G.counterBattery = G.counterBattery.filter(cb => G.turn - cb.markTurn < 3);
}

/* ---------- 可见性重算（M7 修复版） ---------- */
function recalcVisibility() {
  G.units.forEach(u => {
    if (u.dead) return;
    u.spotted = [false, false];
    u.spotted[u.side] = true;
    if (u.cryptoBrokenBy != null) u.spotted[u.cryptoBrokenBy] = true;

    [0,1].forEach(side => {
      if (side === u.side) return;
      // 雷达锁定优先（radar.js 提供 lockedBy）
      if (u.lockedBy && u.lockedBy[side]) {
        u.spotted[side] = true;
        u.lastKnown[side] = {c: u.c, r: u.r};
        return;
      }
      for (const o of G.units) {
        if (o.dead || o.side !== side || o.carriedBy) continue;
        if (canSee(o, u)) {
          u.spotted[side] = true;
          u.lastKnown[side] = {c: u.c, r: u.r};
          break;
        }
      }
    });
  });
}

/* ---------- 供渲染查询 ---------- */
const isVisible = (unit, side) => !G.opt.fog || unit.side === side || unit.spotted[side];

function isCellObserved(c, r, side) {
  for (const obs of G.units) {
    if (obs.dead || obs.side !== side || obs.carriedBy) continue;
    const d = hexDist({c: obs.c, r: obs.r}, {c, r});
    if (d > sensorRange(obs)) continue;
    if (!hasLOS({c: obs.c, r: obs.r}, {c, r})) continue;
    return true;
  }
  return false;
}