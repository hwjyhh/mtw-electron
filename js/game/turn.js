/* ============================================================
 * MTW game/turn.js
 * endTurn（含玩家 AI 编队钩子）+ checkVictory
 * 依赖：state / visibility / ew / ai/speed / ai/battlegroups
 * ============================================================ */
'use strict';

function endTurn() {
  if (G.gameOver) return;

  // 用户手动中止 AI：清空计时器并恢复
  if (G.aiRunning) {
    G.aiAbort = true;
    if (window.aiSpeed && window.aiSpeed._timers) {
      window.aiSpeed._timers.forEach(id => clearTimeout(id));
      window.aiSpeed._timers.clear();
    }
    G.aiRunning = false;
  }

  // 1. 结束当前方回合
  G.units.filter(u => !u.dead && u.side === G.side).forEach(u => {
    u.mp = u.def.mp;
    u.moved = 0;
    u.fired = u.def.weapons.map(() => 0);
    u.sup = clamp(u.sup - 3, 0, 20);
    if (u.sup < 4) u.morale = clamp(u.morale + 0.25, 1, 10);
    u.apsShots = 3;
    u.rangedUsedThisTurn = false;
    if (u.ewActive) {
      u.ewActive.turnsLeft--;
      if (u.ewActive.turnsLeft <= 0) u.ewActive = null;
    }
    if (u.shieldTurns && u.shieldTurns > 0) u.shieldTurns--;
    if (u.sensorDown && u.sensorDown > 0) u.sensorDown--;
  });

  // 2. 密码破译每回合自然增长
  [0, 1].forEach(side => {
    const cb = G.crypto[side];
    if (cb.targetUid == null) return;
    const tgt = G.units.find(u => u.uid === cb.targetUid);
    if (!tgt || tgt.dead) { cb.targetUid = null; cb.progress = 0; cb.targetSide = -1; return; }
    const ewHelpers = G.units.filter(u =>
      !u.dead && u.side === side && u.def.ew.jam > 0 && hexDist(u, tgt) <= 6
    );
    let gain = CRYPTO_INFO.progressPerTurn + ewHelpers.length * 2;
    if (G.ai[side] && G.aiDifficulty[side] === 'hard') gain *= 1.4;
    cb.progress = Math.min(CRYPTO_INFO.threshold, cb.progress + gain);
    tgt.cryptoProgress = cb.progress;
    if (cb.progress >= CRYPTO_INFO.threshold) {
      log(`🔓 ${side === 0 ? '蓝方' : '红方'} 持续破译完成 ${tgt.def.name}！`, 'lg-crypto');
      tgt.cryptoBrokenBy = side;
      tgt.spotted[side] = true;
      cb.progress = 0;
      cb.targetUid = null;
    }
  });

  // 3. 切换方
  G.side = 1 - G.side;
  if (G.side === 0) G.turn++;
  G.freqHopping = [Math.max(0, G.freqHopping[0] - 1), Math.max(0, G.freqHopping[1] - 1)];
  computeEW();
  recalcVisibility();

  // 4. 新行动方重置
  G.units.filter(u => !u.dead && u.side === G.side).forEach(u => {
    u.mp = u.def.mp;
    u.moved = 0;
    u.fired = u.def.weapons.map(() => 0);
    u.sup = clamp(u.sup - 2, 0, 20);
    u.apsShots = 3;
    u.rangedUsedThisTurn = false;
  });

  // 5. 通信链路恶化惩罚
  if (G.commLinks[G.side].strength < 50) {
    G.units.filter(u => !u.dead && u.side === G.side).forEach(u => {
      u.mp = Math.floor(u.mp * 0.5);
    });
    log(`⚠ 通信链路 ${G.commLinks[G.side].strength.toFixed(0)}%，MP减半`, 'lg-ew');
  }

  updateUI();
  checkVictory();
  if (typeof renderTaskForcePanel === 'function') renderTaskForcePanel();

  // 6. 触发 AI 或玩家 AI 编队
  const sideForAi = G.side;
  if (G.ai[sideForAi] && !G.gameOver && !G.aiRunning) {
    setTimeout(() => runAI(sideForAi), 350);
    return;
  }

  // 7. 玩家 AI 编队行动（M8 钩子）
  if (!G.ai[sideForAi] && !G.gameOver) {
    const myAiTfs = (G.taskForces || []).filter(tf =>
      tf.side === sideForAi && tf.aiControlled &&
      tf._lastAITurn !== G.turn &&
      tf.units.some(u => !u.dead)
    );
    if (myAiTfs.length && typeof runPlayerAIControlled === 'function') {
      log(`🤖 执行 ${myAiTfs.length} 个 AI 控制编队`, 'lg-ew');
      runPlayerAIControlled(sideForAi, () => {
        renderTaskForcePanel();
      });
    }
  }
}

function checkVictory() {
   if (G.sandbox) return; // 🧪 沙盒模式：直接返回，不判定胜负
  const c0 = G.units.filter(u => !u.dead && u.side === 0).length;
  const c1 = G.units.filter(u => !u.dead && u.side === 1).length;
  if (c0 === 0 && c1 === 0) return;
  if (c0 === 0) {
    G.gameOver = true;
    log('=== 红方获胜 ===', 'lg-hit');
  } else if (c1 === 0) {
    G.gameOver = true;
    log('=== 蓝方获胜 ===', 'lg-ok');
  }
}