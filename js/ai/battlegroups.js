/* ============================================================
 * MTW ai/battlegroups.js
 * 玩家 AI 编队执行（供 endTurn 钩子调用）
 * 依赖：ai/tactics.js（formBattlegroups / decideMissionV2 / executeBattlegroupV2）
 * ============================================================ */
'use strict';

/* ---------- 玩家 AI 编队行动 ----------
 * 由 game/turn.js 的 endTurn 触发：
 *   若当前回合有 aiControlled 的玩家编队，则 AI 代为行动
 * 与 runAI 的区别：只处理玩家编成的 taskForces，不重新编成所有单位
 */
window.runPlayerAIControlled = function (side, callback) {
  const tfs = (G.taskForces || []).filter(tf =>
    tf.side === side && tf.aiControlled && tf._lastAITurn !== G.turn &&
    tf.units.some(u => !u.dead)
  );

  if (!tfs.length) {
    if (callback) callback(false);
    return;
  }

  G.aiRunning = true;
  G.aiAbort = false;

  const enemies = G.units.filter(e => !e.dead && e.side !== side && e.spotted[side]);
  const diff = G.aiDifficulty[side] || 'hard';
  const pref = G.aiPreference[side] || 'balanced';

  let i = 0;
  const next = () => {
    if (i >= tfs.length || G.aiAbort) {
      tfs.forEach(tf => { tf._lastAITurn = G.turn; });
      G.aiRunning = false;
      G.aiAbort = false;
      if (callback) callback(true);
      return;
    }
    const bg = tfs[i++];
    bg.units = bg.units.filter(u => !u.dead);
    if (!bg.units.length) { next(); return; }

    bg.mission = decideMissionV2(bg, enemies, diff, pref);
    executeBattlegroupV2(bg, enemies, diff, pref, () => setTimeout(next, 80));
  };
  next();
};