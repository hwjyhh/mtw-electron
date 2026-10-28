/* ============================================================
 * MTW core/state.js
 * 全局状态 G / UID / MISSILES / 编辑模式全局
 * 依赖：constants.js
 * ============================================================ */
'use strict';

/* ---------- 全局游戏状态 ---------- */
const G = {
  effects: [], wrecks: [],
  screenShake: 0,
  map: null, units: [], turn: 1, side: 0, mode: 'select',
  sel: null, hover: null,
  cam: {x: 0, y: 0, z: 1},
  log: [],
  placeDef: null,
  ai: [false, true],
  sideNat: ['US', 'CN'],
  opt: {grid:true, range:true, ew:true, fog:true, face:true, obs:false},
  edit: {terr:'open', elev:0, fort:0, mine:0, painting:false, tool:'terr', brush:1, dragStart:null},
  gameOver: false,//沙盒
  sandbox:false,
  selectedWeapons: [],
  attackMode: 'attack',

  /* 电子战 */
  ewJam: [{},{},{},{}],
  commLinks: [
    {strength:100, sources:[]},
    {strength:100, sources:[]}
  ],
  decoyTargets: [{},{},{}],
  spectrumLoad: [0,0],
  counterBattery: [],
  freqHopping: [0,0],

  /* 密码破译 */
  crypto: [
    {progress:0, targetUid:null, targetSide:-1, startTurn:0},
    {progress:0, targetUid:null, targetSide:-1, startTurn:0}
  ],

  /* AI */
  aiRunning: false,
  aiAbort: false,
  aiDifficulty: ['medium', 'medium'],
  aiPreference: ['balanced', 'balanced'],

  /* 多选 / 框选（M5 会补） */
  selectedUnits: [],
  boxSel: {active:false, x1:0, y1:0, x2:0, y2:0},

  /* 战斗群（M4/M8 会补） */
  taskForces: [],

  /* 内部缓存 */
  _aiAnalysis: {},
  _aiCoord: {}
};

/* 频段 → Set 容器 */
[0,1].forEach(side => {
  EW_BANDS_ALL.forEach(band => {
    G.ewJam[side][band] = new Set();
    G.decoyTargets[side][band] = new Set();
  });
});

/* ---------- UID 计数器 ---------- */
let UID = 1;

/* ---------- 导弹数组（M3 使用） ---------- */
const MISSILES = [];
window.MISSILES = MISSILES;

/* ---------- 编辑模式全局 ---------- */
let engineerMode = null;
let ewMode = null;