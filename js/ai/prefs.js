/* ============================================================
 * MTW ai/prefs.js
 * 4 级 AI 难度 + 6 种偏好 + TACTIC_V2 能力表 + PREF_MOD_V2 权重
 * 依赖：constants / state / log
 * ============================================================ */
'use strict';

/* ---------- 4 级难度（扩展 beginner） ---------- */
Object.assign(AI_DIFFICULTIES, {
  beginner: {n:'入门', color:'#6e7681', desc:'直射寻路'},
  easy:     {n:'低',   color:'#58a6ff', desc:'集火协同'},
  medium:   {n:'中',   color:'#f0883e', desc:'战斗群协同'},
  hard:     {n:'高',   color:'#f85149', desc:'全谱联合作战'}
});

/* ---------- 4 级能力表（本质区分：新手 → 全谱） ---------- */
const TACTIC_V2 = {
  beginner: {
    formation: false,
    cover: false, flank: false, combinedArms: false,
    focusFire: false, dynamicRetarget: false, finisher: false, c2Strike: false,
    ew: false, counter: false, air: false, fortify: false,
    hack: false, arty: false, ad: false, freqHop: false,
    missionSmart: false, retreat: 'never',
    prepFire: false, sead: false, counterStrike: false,
    dynamicRegroup: false, waveAttack: false
  },
  easy: {
    formation: 'basic',
    cover: true, flank: false, combinedArms: false,
    focusFire: true, dynamicRetarget: false, finisher: false, c2Strike: false,
    ew: 'basic', counter: false, air: false, fortify: false,
    hack: false, arty: true, ad: true, freqHop: false,
    missionSmart: 'simple', retreat: 'simple',
    prepFire: false, sead: false, counterStrike: false,
    dynamicRegroup: false, waveAttack: false
  },
  medium: {
    formation: 'full',
    cover: true, flank: true, combinedArms: true,
    focusFire: true, dynamicRetarget: true, finisher: false, c2Strike: false,
    ew: true, counter: true, air: true, fortify: true,
    hack: false, arty: true, ad: true, freqHop: true,
    missionSmart: 'full', retreat: 'smart',
    prepFire: false, sead: false, counterStrike: false,
    dynamicRegroup: false, waveAttack: false
  },
  hard: {
    formation: 'full',
    cover: true, flank: true, combinedArms: true,
    focusFire: true, dynamicRetarget: true, finisher: true, c2Strike: true,
    ew: 'advanced', counter: 'aggressive', air: 'priority', fortify: true,
    hack: true, arty: 'priority', ad: 'priority', freqHop: true,
    missionSmart: 'full', retreat: 'smart',
    prepFire: true, sead: true, counterStrike: true,
    dynamicRegroup: true, waveAttack: true
  }
};

/* ---------- 6 种偏好权重（影响决策阈值 / 交战距离 / 各兵种倍率） ---------- */
const PREF_MOD_V2 = {
  balanced:  {desire: 0,  atk: 1.25, def: 0.90, flank: 6,  arty: 1.0, air: 1.0, ew: 1.0, fort: 1.0, hack: 1.0},
  firepower: {desire: +1, atk: 1.15, def: 0.85, flank: 4,  arty: 2.0, air: 1.2, ew: 0.8, fort: 1.0, hack: 0.8},
  offensive: {desire: -1, atk: 1.00, def: 0.75, flank: 6,  arty: 1.0, air: 1.5, ew: 0.8, fort: 0.7, hack: 0.8},
  defensive: {desire: +2, atk: 2.00, def: 1.20, flank: 3,  arty: 0.8, air: 0.8, ew: 1.0, fort: 2.0, hack: 1.0},
  signals:   {desire: +1, atk: 1.25, def: 0.90, flank: 5,  arty: 1.5, air: 1.0, ew: 2.0, fort: 1.0, hack: 1.5},
  maneuver:  {desire: -1, atk: 1.10, def: 0.85, flank: 12, arty: 0.8, air: 1.2, ew: 0.8, fort: 0.8, hack: 0.8}
};

/* ---------- AI 内部工具 ---------- */
const aiCenter = list => {
  if (!list.length) return {c: 5, r: 5};
  let sc = 0, sr = 0;
  list.forEach(u => { sc += u.c; sr += u.r; });
  return {c: sc / list.length, r: sr / list.length};
};

const aiPower = list => list
  .filter(u => !u.dead)
  .reduce((s, u) => s + u.def.pts * (u.hp / u.maxHp) * (1 - Math.min(0.5, u.sup / 30)), 0);