/* ============================================================
 * MTW systems/radar.js
 * RCS / 雷达参数 / 雷达方程 / 探测累积 / 暴露度 / 间歇开机
 * 依赖：constants / geometry / state / visibility / log
 * 合并自原 M1 的雷达相关函数 + M2 全部
 * ============================================================ */
'use strict';

/* ---------- 目标 RCS 外观朝向判定 ---------- */
function aspectFromRadar(radar, target) {
  const t = hexCenter(target.c, target.r, 1);
  const r = hexCenter(radar.c, radar.r, 1);
  const dx = r.x - t.x, dy = r.y - t.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const fwd = DIR_PIX[target.facing % 6];
  const dot = ux * fwd[0] + uy * fwd[1];
  if (dot >  0.35) return 'front';
  if (dot < -0.35) return 'rear';
  return 'side';
}

/* ---------- RCS 查询 ---------- */
function unitRCS(u, aspect) {
  const ov = RCS_OVERRIDE[u.def.id];
  const base = ov || RCS_BY_CAT[u.def.cat] || {front: 5, side: 8, rear: 6};
  return base[aspect] !== undefined ? base[aspect] : base.front;
}

/* ---------- 高度层 ---------- */
function unitAltitudeMeters(u) {
  if (u.def.mob !== 'air') return 0;
  return ALT_HEIGHT_M[AIR_ALTITUDE[u.def.cat] || 2];
}

/* ---------- 雷达物理参数（由 sens.radar 推导） ---------- */
function radarParams(u) {
  if (!u.def.sens.radar || u.def.sens.radar <= 0) return null;
  const base = u.def.sens.radar;
  return {
    power: 50 * base,
    gain: 30 + base * 1.2,
    bandwidth: 1e6 * (1 + base * 0.3),
    freqGHz: 3 + (base % 3),
    band: base >= 6 ? 'VHF' : 'X',
    maxRangeHex: 8 + base * 2.2,
    killRadiusM: 30 + base * 4,
    fovAngle: 60
  };
}

/* ---------- 雷达 SNR（四次方定律 + 隐身 + 3D 视线） ---------- */
function radarSNR(radarUnit, targetUnit) {
  const rp = radarParams(radarUnit);
  if (!rp) return 0;

  const d = hexDist(radarUnit, targetUnit);
  if (d <= 0.01) return 999;

  let sigma = unitRCS(targetUnit, aspectFromRadar(radarUnit, targetUnit));
  if (rp.band === 'VHF') sigma *= 10;                 // 米波反隐身增益

  const sigNorm = Math.max(0.001, sigma / 5);
  const effRange = rp.maxRangeHex * Math.pow(sigNorm, 0.25);

  if (!hasLOS3D(radarUnit, targetUnit, unitAltitudeMeters(targetUnit) / 100)) return 0;
  return Math.pow(effRange / Math.max(d, 0.5), 4);
}

/* ---------- 每帧雷达探测累积（锁定） ---------- */
function radarDetectTick(dt) {
  G.units.forEach(radar => {
    if (radar.dead || radar.carriedBy || !radar.radarOn) return;
    const rp = radarParams(radar);
    if (!rp) return;

    G.units.forEach(tgt => {
      if (tgt.dead || tgt.side === radar.side || tgt.carriedBy) return;

      const snr = radarSNR(radar, tgt);
      if (snr <= 10) return;

      const rate = Math.min(2, Math.log10(snr)) * 0.5 * dt;
      tgt.trackProgress = tgt.trackProgress || [0, 0];
      tgt.trackProgress[radar.side] = (tgt.trackProgress[radar.side] || 0) + rate;

      if (tgt.trackProgress[radar.side] >= 1.0 && !tgt.lockedBy[radar.side]) {
        tgt.lockedBy[radar.side] = true;
        tgt.spotted[radar.side] = true;
        tgt.lastKnown[radar.side] = {c: tgt.c, r: tgt.r};
        log(`📡 ${radar.def.name} 雷达锁定 ${tgt.def.name}`, 'lg-comm');
      }
    });
  });
}

/* ---------- 每帧雷达自身暴露度累积 ---------- */
function radarExposureTick(dt) {
  G.units.forEach(u => {
    if (u.dead || u.carriedBy) return;
    const rp = radarParams(u);
    if (!rp) return;

    if (!u.radarOn) {
      u.exposureLevel = Math.max(0, (u.exposureLevel || 0) - dt);
      return;
    }

    u.exposureLevel = (u.exposureLevel || 0) + dt * (rp.power / 500);

    if (u.exposureLevel > 1) {
      G.units.forEach(e => {
        if (e.dead || e.side === u.side || e.carriedBy) return;
        const canARM = e.def.cap.includes('反辐射') ||
                       e.def.weapons.some(w => w.n.includes('反辐射'));
        if (canARM && hexDist(e, u) < 20) {
          u.lastKnown[e.side] = {c: u.c, r: u.r};
          u.spotted[e.side] = true;
        }
      });
    }
  });
}

/* ---------- 间歇开机（每 0.6s 关 200ms，降低暴露度） ---------- */
function radarIntermittentTick(dt) {
  G.units.forEach(u => {
    if (u.dead || u.carriedBy || !u.radarIntermittent) return;
    u._itTimer = (u._itTimer || 0) + dt;
    if (u._itTimer > 0.6) {
      u._itTimer = 0;
      u.radarOn = false;
      setTimeout(() => {
        if (!u.dead && u.radarIntermittent) u.radarOn = true;
      }, 200);
    }
  });
}

/* ---------- 开关雷达 ---------- */
function toggleRadar(u) {
  u.radarOn = !u.radarOn;
  if (u.radarOn) u.exposureLevel = 0;
  log(`📡 ${u.def.name} 雷达${u.radarOn ? '开机' : '关机'}`, 'lg-comm');
}