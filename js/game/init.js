/* ============================================================
 * MTW game/init.js
 * spawn（M7 增强版）+ initGame（M7 增强版）+ generateDeploy
 * 依赖：constants / geometry / state / terrain / data-units
 *       / visibility / ui / ew / missiles
 * ============================================================ */
'use strict';

/* ---------- 生成单位（含雷达字段初始化） ---------- */
function spawn(defId, side, c, r, facing) {
  const def = typeof defId === 'string' ? DEF_BY_ID[defId] : defId;
  if (!def) return null;

  const u = {
    uid: UID++, def, side, c, r,
    men: def.men, hp: def.men, maxHp: def.men,
    ammo: def.weapons.map(w => w.ammo),
    sup: 0, morale: def.morale, mp: def.mp,
    moved: 0, fired: def.weapons.map(() => 0),
    dugIn: 0, dead: false, jamming: 0, apsShots: 3,
    facing: facing !== undefined ? facing : (side === 0 ? 0 : 3),
    cargo: [], carriedBy: null,
    spotted: [true, true], lastKnown: [null, null],
    ewActive: null, jammingBy: [], jammedBands: new Set(),
    commLink: 100, decoyActive: false,
    stance: 'defense',
    moving: false, movePath: [], moveProgress: 0, moveTarget: null,
    rangedUsedThisTurn: false, attackingMove: false,
    cryptoBrokenBy: null, cryptoProgress: 0,
    pulseStunned: 0, sensorDown: 0, shieldTurns: 0, freqHopped: 0,
    // M7 增强字段
    radarOn: true,
    radarIntermittent: false,
    exposureLevel: 0,
    trackProgress: [0, 0],
    lockedBy: [false, false],
    _macro: null,
    _aiRole: 'main'
  };
  G.units.push(u);
  return u;
}

/* ---------- 部署生成 ---------- */
function generateDeploy(nat) {
  const lists = {
    US: [
      'us_hq_bn','us_rifle','us_rifle','us_wpn','us_at_team','us_scout','us_eng','us_medic',
      'us_m109a7','us_himars','us_avenger','us_ah64e','us_mq9','us_ew_team','us_supply',
      'us_ammo','us_artillery_obs','us_rifle_sopmod','us_mar_rifle','us_sniper',
      'us_stryker_icv','us_m2a3','us_m1a2sep3','us_m1a1sa','us_m777','us_lav25',
      'us_cav_scout','us_cuas','us_jtac','us_stryker_shorad'
    ],
    CN: [
      'cn_hq_bn','cn_rifle','cn_rifle191','cn_mech_rifle','cn_at','cn_scout','cn_eng','cn_medic',
      'cn_plz05','cn_phl03','cn_hq17','cn_z10','cn_gj2','cn_ew','cn_supply',
      'cn_ammo','cn_arty_obs','cn_sf','cn_marine','cn_sniper',
      'cn_04a','cn_08','cn_99a','cn_96a','cn_pcl181','cn_recon_cav',
      'cn_cuas','cn_fo','cn_08_shorad','cn_pp87'
    ],
    RU: [
      'ru_hq_bn','ru_mot_rifle','ru_mot_rifle_m','ru_mot_mech','ru_at','ru_scout','ru_eng','ru_medic',
      'ru_2s19','ru_bm30','ru_pantsir','ru_ka52','ru_orlan30','ru_ew','ru_supply',
      'ru_ammo','ru_arty_obs','ru_spetsnaz','ru_marine','ru_sniper',
      'ru_bmp3','ru_btr82a','ru_t90m','ru_t72b3','ru_2s35','ru_recon',
      'ru_cuas','ru_fo','ru_btr82a_2023','ru_tos1a'
    ]
  };
  const arr = (lists[nat] || lists.US).filter(id => DEF_BY_ID[id]);
  while (arr.length < 30) {
    const all = UNIT_DEFS.filter(d => d.nation === nat);
    if (!all.length) break;
    arr.push(all[Math.floor(Math.random() * all.length)].id);
  }
  return arr.slice(0, 30);
}

/* ---------- 初始化游戏（M7 增强版） ---------- */
function initGame(mapType, mapSize) {
  mapType = mapType || 'encounter';
  mapSize = mapSize || 'medium';

  // 记录当前配置（供 mod/loader 重建使用）
  G.mapType = mapType;
  G.mapSize = mapSize;

  const nat0 = document.getElementById('natSide0').value;
  const nat1 = document.getElementById('natSide1').value;
  G.sideNat = [nat0, nat1];

  const sizeCfg = MAP_SIZES[mapSize] || MAP_SIZES.medium;
  const typeCfg = MAP_TYPES[mapType] || MAP_TYPES.encounter;

  G.map = genMapByType(mapType, sizeCfg.cols, sizeCfg.rows);
  G.units = [];
  G.wrecks = [];
  G.effects = [];
  MISSILES.length = 0;              // M7 清空导弹
  UID = 1;
  G.turn = 1;
  G.side = 0;
  G.sel = null;
  G.gameOver = false;

  const centerWC = hexCenter(Math.floor(sizeCfg.cols / 2), Math.floor(sizeCfg.rows / 2), HS);
  G.cam = {x: centerWC.x, y: centerWC.y, z: 1};

  G.selectedWeapons = [];
  G.attackMode = 'attack';
  G.mode = 'select';
  engineerMode = null;
  ewMode = null;
  G.aiRunning = false;
  G.aiAbort = false;

  G.crypto = [
    {progress: 0, targetUid: null, targetSide: -1, startTurn: 0},
    {progress: 0, targetUid: null, targetSide: -1, startTurn: 0}
  ];
  G.counterBattery = [];
  G.freqHopping = [0, 0];
  G.spectrumLoad = [0, 0];

  // M7 多选/框选重置
  G.selectedUnits = [];
  G.boxSel = {active: false, x1: 0, y1: 0, x2: 0, y2: 0};

  // 电子战面板选择状态重置
  EW_MANUAL.pickingTarget = null;
  EW_MANUAL.selectedTarget = null;
  EW_MANUAL.cipherTarget = null;
  document.getElementById('ewConsole')?.classList.remove('ew-picking');

  // UI 状态重置
  ['rangedHint', 'engineerHint', 'ewHint'].forEach(id => document.getElementById(id)?.classList.remove('on'));
  document.getElementById('ftRanged')?.classList.remove('active');
  ['ftClear','ftMine','ftFort','ftRepair','ftJam','ftEWRecon','ftDecoy','ftShield','ftARM','ftCounter','ftHack']
    .forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById('ftObserve')?.classList.toggle('active', G.opt.obs);
  if (typeof setModeBtn === 'function') setModeBtn('mSel');

  computeEW();

  // 部署
  const m = G.map;
  const deployBlue = generateDeploy(nat0);
  const deployRed = generateDeploy(nat1);
  const perRow = Math.max(4, Math.floor(m.cols / 5));

  let bi = 0;
  const blueStartR = Math.max(2, m.rows - 6);
  for (let r = 0; r < Math.ceil(deployBlue.length / perRow) && bi < deployBlue.length; r++) {
    for (let c = 0; c < perRow && bi < deployBlue.length; c++) {
      const rr = blueStartR + r;
      const cc = 2 + c * Math.max(2, Math.floor((m.cols - 4) / perRow));
      if (inBounds(cc, rr) && !unitAt(cc, rr)) { spawn(deployBlue[bi], 0, cc, rr, 0); bi++; }
    }
  }

  let ri = 0;
  for (let r = 0; r < Math.ceil(deployRed.length / perRow) && ri < deployRed.length; r++) {
    for (let c = 0; c < perRow && ri < deployRed.length; c++) {
      const rr = 2 + r;
      const cc = m.cols - 3 - c * Math.max(2, Math.floor((m.cols - 4) / perRow));
      if (inBounds(cc, rr) && !unitAt(cc, rr)) { spawn(deployRed[ri], 1, cc, rr, 3); ri++; }
    }
  }

  computeEW();
  recalcVisibility();

  // 日志
  document.getElementById('logbox').innerHTML = '';
  log('=== 现代战术兵棋 v7.0 ===', 'lg-info');
  log(`蓝方: ${NAT_INFO[nat0].n}  红方: ${NAT_INFO[nat1].n}`, 'lg-sys');
  log(`地图: ${typeCfg.icon}${typeCfg.n}  ${sizeCfg.n}(${m.cols}×${m.rows})`, 'lg-ok');

  const aiSide = G.ai[0] ? 0 : 1;
  log(`AI: ${AI_DIFFICULTIES[G.aiDifficulty[aiSide]].n}难度 · ${AI_PREFERENCES[G.aiPreference[aiSide]].n}偏好`, 'lg-ew');
  log(`棋子库 ${UNIT_DEFS.length} · 武器库 ${WEAPON_LIB.length}`, 'lg-sys');
  log('WASD视角/空格结束/Esc取消/QE旋转/1-9武器/R远程/A攻击移动/G放置/S姿态', 'lg-sys');
  log('📡 电子战快捷键: J干扰/K侦察/L诱饵/U防护/Y反辐射/H反炮兵/P破译', 'lg-ew');
  log('🎛 电子战控制台在画面右上角，可收起/展开，支持手动调频/干扰/破译', 'lg-ew');

  resize();
  updateUI();
  draw();
}