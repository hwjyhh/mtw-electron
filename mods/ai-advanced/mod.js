MTW.defineMod({
  id: 'ai-advanced',
  name: 'AI 武器使用 + 威胁感知升级',
  version: '1.0.0',

  setup(api) {

    /* ============================================================
     * 0) 状态初始化
     * ============================================================ */
    G._threatMemory = G._threatMemory || {};   // {uid: {side: 次数}}
    G._aiThreat     = G._aiThreat     || {};   // {side: {threats, highThreatSet}}

    api.on('afterInit', () => {
      G._threatMemory = {};
      G._aiThreat = {};
    });

    /* ============================================================
     * 1) 威胁地图：每回合开始为 AI 计算
     *    评分来源：
     *      高价值 pts / 火炮 / 防空 / 指挥 / 雷达 / 反炮兵
     *      距离近 / 能打到我的单位 / 已经攻击过我的
     * ============================================================ */
    function computeThreatMap(side) {
      const myUnits = G.units.filter(u => !u.dead && u.side === side && !u.carriedBy);
      const enemies = G.units.filter(u => !u.dead && u.side !== side && !u.carriedBy);
      if (!enemies.length) return { threats: {}, highThreatSet: new Set() };

      const threats = {};
      enemies.forEach(e => {
        let t = 0;

        // 基础价值
        t += (e.def.pts || 10) * 0.4;

        // 单位类型
        const cat = e.def.cat;
        if (cat === 'ARTY')  t += 45;
        if (cat === 'AD')    t += 30;
        if (cat === 'EW')    t += 25;
        if (cat === 'ARM')   t += 35;
        if (cat === 'AIR' || cat === 'HELI') t += 40;
        if (cat === 'UAV')   t += 15;

        // 能力标签
        const cap = e.def.cap || '';
        if (cap.includes('指挥'))     t += 55;
        if (cap.includes('反炮兵'))   t += 40;
        if (cap.includes('通信中继')) t += 25;
        if (cap.includes('引导'))     t += 20;

        // 雷达辐射
        if (e.def.sens && e.def.sens.radar >= 5) t += 25;

        // 距离 / 威胁射程
        let minDist = Infinity, canHitMe = 0;
        const maxRange = Math.max(...(e.def.weapons || []).map(w => w.r), 0);
        myUnits.forEach(m => {
          const d = hexDist(e, m);
          if (d < minDist) minDist = d;
          if (d <= maxRange) canHitMe++;
        });
        if (canHitMe > 0) t += Math.min(40, canHitMe * 8);
        if (minDist < 4)  t += (4 - minDist) * 12;

        // 攻击记忆（谁打过我）
        const mem = G._threatMemory[e.uid];
        if (mem && mem[side]) t += mem[side] * 18;

        // 快死的目标威胁降低
        const hpRatio = e.hp / Math.max(1, e.maxHp);
        if (hpRatio < 0.3) t *= 0.85;

        threats[e.uid] = t;
      });

      // 前 30% 为高威胁
      const sorted = Object.entries(threats).sort((a, b) => b[1] - a[1]);
      const topN = Math.max(1, Math.ceil(sorted.length * 0.3));
      const highThreatSet = new Set(sorted.slice(0, topN).map(([uid]) => +uid));

      return { threats, highThreatSet };
    }

    /* ============================================================
     * 2) 武器智能选择
     *    与老版差异：弹种 / 目标类型 / 距离 / APS / ERA 全面判断
     * ============================================================ */
    function findBestWeaponV2(u, tgt) {
      const dist = hexDist(u, tgt);
      if (!u.def.weapons || !u.def.weapons.length) return -1;

      const isAir    = tgt.def.mob === 'air';
      const isArmor  = ['ARM','IFV','APC','NAV','HELI'].includes(tgt.def.cat) && !isAir;
      const isSoft   = ['INF','SF','RECON','ENG'].includes(tgt.def.cat);
      const isArty   = tgt.def.cat === 'ARTY';
      const isAD     = tgt.def.cat === 'AD';
      const isFort   = ['FORT','MINE'].includes(tgt.def.cat);

      const facing   = (typeof getHitFacing === 'function') ? getHitFacing(tgt, u) : 'front';
      const hasERA   = (tgt.def.era || 0) > 0;
      const hasAPS   = (tgt.def.aps || 0) > 0;

      const threatInfo = G._aiThreat[u.side];
      const isHighThreat = threatInfo && threatInfo.highThreatSet.has(tgt.uid);
      const revenge = G._threatMemory && G._threatMemory[tgt.uid] &&
                      (G._threatMemory[tgt.uid][u.side] || 0) > 0;

      let best = -1, bestS = -1;

      u.def.weapons.forEach((w, i) => {
        if (w.r < dist || u.fired[i] >= 1) return;
        if (u.ammo[i] < Math.max(1, Math.round(w.rof))) return;
        if (isAir && typeof canEngageAir === 'function' && !canEngageAir(w)) return;
        if (w.band && u.jammedBands && u.jammedBands.has(w.band)) return;

        let s = hitChance(u, tgt, w, dist);
        if (s <= 0) return;

        const isAPFSDS = w.n.includes('APFSDS');
        const isHEAT   = w.n.includes('HEAT');
        const isHESH   = w.n.includes('HESH');
        const isHE     = w.n.endsWith(' HE') ||
                         (w.t === 'howitzer' && w.n.includes('HE')) ||
                         w.t === 'mortar' || w.t === 'mlrs';

        if (isArmor) {
          if (w.t === 'atgm') s *= 3.5;
          if (w.t === 'cannon') {
            if (isAPFSDS) s *= 2.8;
            else if (isHEAT) {
              if (hasERA) s *= 0.75;
              else if (facing === 'side' || facing === 'rear') s *= 2.5;
              else s *= 1.6;
            }
            else if (isHESH) s *= 1.4;
            else if (isHE)   s *= 0.15;
            else             s *= 1.5;
          }
          if (w.t === 'rpg') s *= 2.0;
          if (w.t === 'autocannon') s *= 1.1;
          if (['mg','rifle','sniper'].includes(w.t)) s *= 0.12;
        } else if (isSoft) {
          if (['mg','rifle','sniper','gl'].includes(w.t)) s *= 2.2;
          if (['howitzer','mortar','mlrs'].includes(w.t)) s *= 2.0;
          if (w.t === 'cannon') {
            if (isHE) s *= 2.2;
            else if (isHEAT) s *= 1.2;
            else if (isAPFSDS) s *= 0.1;
            else s *= 1.0;
          }
          if (w.t === 'atgm') s *= 0.6;
          if (w.t === 'autocannon') s *= 1.5;
        } else if (isArty) {
          if (['howitzer','mlrs','mortar'].includes(w.t)) s *= 2.5;
          if (w.t === 'atgm') s *= 2.0;
          if (w.t === 'cannon') s *= 1.8;
          if (w.t === 'drone') s *= 1.5;
        } else if (isAD) {
          if (w.t === 'atgm') s *= 2.2;
          if (w.t === 'cannon') s *= 1.8;
          if (w.t === 'drone') s *= 1.8;
        } else if (isAir) {
          if (w.t === 'sam' || w.t === 'manpads') s *= 2.5;
          if (w.t === 'aaa') s *= 2.0;
          if (w.t === 'autocannon') s *= 0.5;
        } else if (isFort) {
          if (['howitzer','mortar','mlrs'].includes(w.t)) s *= 1.8;
          if (isHE) s *= 2.2;
        }

        if (dist <= 3 && ['autocannon','mg','rifle','gl','rpg'].includes(w.t)) s *= 1.3;
        if (dist >= 7 && ['atgm','sam','howitzer','mlrs'].includes(w.t)) s *= 1.2;
        if (dist >= 7 && ['rpg','gl'].includes(w.t)) s *= 0.4;

        if (isHighThreat) s *= 1.3;
        if (revenge)      s *= 1.15;

        if (hasAPS && ['atgm','rpg','drone'].includes(w.t)) s *= 0.7;

        if (s > bestS) { bestS = s; best = i; }
      });

      return best;
    }

    /* ============================================================
     * 3) 单位行动
     * ============================================================ */
    function actUnit(u, enemies, diff, pref, threatInfo, done) {
      const maxR = Math.max(...u.def.weapons.map(w => w.r), 0);

      const inRange = enemies.filter(e => {
        const d = hexDist(u, e);
        return d <= maxR && hasLOS(u, e);
      });

      const scored = inRange.map(e => ({
        tgt: e,
        score: (threatInfo.threats[e.uid] || 0)
             + (e.def.pts || 0) * 0.5
             - (e.hp / Math.max(1, e.maxHp)) * 30
      })).sort((a, b) => b.score - a.score);

      if (scored.length) {
        for (const cand of scored) {
          const wIdx = findBestWeaponV2(u, cand.tgt);
          if (wIdx >= 0) {
            orderFire(u, cand.tgt, [wIdx], 'attack');
            setTimeout(done, 50);
            return;
          }
        }
      }

      // 移动：向威胁最高的敌人靠近
      if (u.mp > 0 && !u.moving) {
        let bestTgt = null, bestThreat = -1;
        enemies.forEach(e => {
          const t = threatInfo.threats[e.uid] || 0;
          if (t > bestThreat) { bestThreat = t; bestTgt = e; }
        });
        if (bestTgt) {
          const desired = Math.min(Math.max(maxR, 2), 3);
          moveTowards(u, bestTgt, desired);
        }
      }
      setTimeout(done, 30);
    }

    function moveTowards(u, target, desiredDist) {
      const reach = reachableCells(u, u.mp);
      if (!reach.size) return;

      let best = null, bestScore = -Infinity;
      reach.forEach(v => {
        const d = hexDist({c: v.c, r: v.r}, target);
        let s = -Math.abs(d - desiredDist) * 3;
        const cell = cellAt(v.c, v.r);
        const t = TERRAIN[cell.t];
        s += t.cov * 8 + t.con * 4 - v.cost * 0.4;
        if (cell.elev >= 2) s += 8;
        if (cell.fort) s += 6;
        if (cell.mine) s -= 20;
        if (s > bestScore) { bestScore = s; best = v; }
      });

      if (best && (best.c !== u.c || best.r !== u.r)) {
        performMove(u, best);
      }
    }

    /* ============================================================
     * 4) 重写 runAI
     * ============================================================ */
    function runAIV2(side) {
      if (G.gameOver) return;

      G.aiRunning = true;
      G.aiAbort = false;
      updateUI();

      const diff = G.aiDifficulty[side] || 'medium';
      const pref = G.aiPreference[side] || 'balanced';
      const di = (typeof AI_DIFFICULTIES !== 'undefined' && AI_DIFFICULTIES[diff]) || {n: diff};
      const pi = (typeof AI_PREFERENCES !== 'undefined' && AI_PREFERENCES[pref]) || {n: pref};

      log(`🤖 [${side===0?'蓝':'红'}方 AI·${di.n}·${pi.n}] 威胁感知行动开始`, 'lg-ew');

      const threatInfo = computeThreatMap(side);
      G._aiThreat[side] = threatInfo;
      log(`🧠 威胁评估完成：${threatInfo.highThreatSet.size} 个高威胁目标`, 'lg-ew');

      const myUnits = G.units.filter(u =>
        !u.dead && u.side === side && !u.carriedBy && !u.moving);
      const enemies = G.units.filter(u =>
        !u.dead && u.side !== side && u.spotted[side]);

      if (!enemies.length) {
        G.aiRunning = false;
        setTimeout(() => { if (!G.gameOver) endTurn(); }, 300);
        return;
      }

      let i = 0;
      const step = () => {
        if (G.aiAbort) {
          log('AI 已取消', 'lg-sys');
          G.aiAbort = false;
          G.aiRunning = false;
          endTurn();
          return;
        }
        if (i >= myUnits.length || G.gameOver) {
          G.aiRunning = false;
          setTimeout(() => { if (!G.gameOver) endTurn(); }, 200);
          return;
        }
        const u = myUnits[i++];
        if (u.dead || u.sup > 16 || u.pulseStunned > 0) {
          u.mp = 0;
          setTimeout(step, 30);
          return;
        }
        actUnit(u, enemies, diff, pref, threatInfo, () => {
          if (G.aiAbort) return;
          if (typeof draw === 'function') draw();
          setTimeout(step, 60);
        });
      };
      step();
    }

    api.override('runAI', (orig) => {
      return function (side) {
        return runAIV2(side);
      };
    });

    /* ============================================================
     * 5) 命中率威胁加成
     * ============================================================ */
    api.override('hitChance', (orig) => {
      return function (shooter, target, w, dist) {
        let p = orig(shooter, target, w, dist);
        if (p <= 0) return p;
        if (G.ai && G.ai[shooter.side]) {
          const ti = G._aiThreat[shooter.side];
          if (ti && ti.highThreatSet.has(target.uid)) p *= 1.10;
          if (G._threatMemory && G._threatMemory[target.uid] &&
              (G._threatMemory[target.uid][shooter.side] || 0) > 0) p *= 1.05;
        }
        return p;
      };
    });

    /* ============================================================
     * 6) 攻击记忆（谁打过我）
     * ============================================================ */
    api.on('afterShot', (ev) => {
      const { shooter, target, result } = ev;
      if (!shooter || !target || !result || !result.ok) return;

      G._threatMemory = G._threatMemory || {};

      if (!G._threatMemory[shooter.uid]) G._threatMemory[shooter.uid] = {};
      G._threatMemory[shooter.uid][target.side] =
        (G._threatMemory[shooter.uid][target.side] || 0) + 1;

      if (!G._threatMemory[target.uid]) G._threatMemory[target.uid] = {};
      G._threatMemory[target.uid][shooter.side] =
        (G._threatMemory[target.uid][shooter.side] || 0) + 1;
    });

    /* ============================================================
     * 7) 回合末记忆衰减
     * ============================================================ */
    api.on('beforeTurnEnd', () => {
      if (!G._threatMemory) return;
      Object.keys(G._threatMemory).forEach(uid => {
        const mem = G._threatMemory[uid];
        Object.keys(mem).forEach(side => {
          mem[side] = Math.floor(mem[side] * 0.7);
          if (mem[side] <= 0) delete mem[side];
        });
        if (!Object.keys(mem).length) delete G._threatMemory[uid];
      });
    });

    /* ============================================================
     * 8) 区域火力智能重定向（火炮优先打高威胁集群）
     * ============================================================ */
    api.override('executeAreaFire', (orig) => {
      return function (shooter, center, wIndices, mode) {
        if (G.ai && G.ai[shooter.side] && G._aiThreat[shooter.side]) {
          const ti = G._aiThreat[shooter.side];
          const maxR = Math.max(...wIndices.map(i => shooter.def.weapons[i].r), 0);

          let bestTgt = null, bestThreat = 0;
          G.units.forEach(e => {
            if (e.dead || e.side === shooter.side || e.carriedBy) return;
            if (!e.spotted[shooter.side]) return;
            const d = hexDist(shooter, e);
            if (d > maxR) return;
            const threat = ti.threats[e.uid] || 0;
            const centerThreat = G.units.filter(x =>
              !x.dead && x.side !== shooter.side && hexDist(x, center) <= 2
            ).reduce((m, x) => Math.max(m, ti.threats[x.uid] || 0), 0);

            if (threat > bestThreat && threat > centerThreat * 1.3 && threat > 40) {
              bestThreat = threat;
              bestTgt = e;
            }
          });

          if (bestTgt) {
            addEffect('text', center.c, center.r,
              {dur:20, text:'重定向', color:'#79c0ff'});
            center = { c: bestTgt.c, r: bestTgt.r };
            addEffect('text', center.c, center.r,
              {dur:40, text:'🎯威胁打击', color:'#ff3080'});
            log(`🎯 AI 火炮重定向至高威胁目标 (${center.c},${center.r})`, 'lg-ranged');
          }
        }
        return orig.call(this, shooter, center, wIndices, mode);
      };
    });

    /* ============================================================
     * 9) 视觉：玩家单位被 AI 锁定 ⚠
     * ============================================================ */
    api.on('postDraw', ({ ctx, cam, HS }) => {
      if (!G._threatMemory) return;
      const mySide = G.side;
      G.units.forEach(u => {
        if (u.dead || u.carriedBy || u.side !== mySide) return;
        const mem = G._threatMemory[u.uid];
        if (!mem) return;
        const enemySide = 1 - mySide;
        const level = mem[enemySide] || 0;
        if (level <= 0) return;

        const wc = hexCenter(u.c, u.r, HS);
        const sc = worldToScreen(wc.x, wc.y);
        const hs = HS * cam.z;

        ctx.save();
        ctx.fillStyle = level >= 3 ? '#f85149' : '#d29922';
        ctx.font = `bold ${Math.max(12, hs * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('⚠', sc.x, sc.y - hs * 0.75);
        if (level >= 2) {
          ctx.font = `bold ${Math.max(9, hs * 0.22)}px sans-serif`;
          ctx.fillText(`×${level}`, sc.x, sc.y - hs * 0.95);
        }
        ctx.restore();
      });
    });

    /* ============================================================
     * 10) 立即生效
     * ============================================================ */
    console.log('[ai-advanced] AI 武器使用 + 威胁感知升级 已加载');
  }
});