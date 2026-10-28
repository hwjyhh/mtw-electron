/* ============================================================
 * MTW systems/engineer.js
 * 工兵行动：破障 / 布雷 / 修工事 / 修车
 * 依赖：constants / geometry / state / terrain
 * ============================================================ */
'use strict';

function isEngineer(u) {
  return u && !u.dead && u.def.cat === 'ENG';
}

/* ---------- 破障 ---------- */
function engineerClear(eng, c, r) {
  if (!isEngineer(eng)) return false;
  if (hexDist(eng, {c, r}) > 1) { log('必须相邻', 'lg-sys'); return false; }
  if (eng.mp < 1) { log('MP不足', 'lg-sys'); return false; }

  const cell = cellAt(c, r);
  if (!cell) return false;

  let did = false;
  if (cell.mine) { cell.mine = 0; did = true; }
  if (cell.fort > 0) { cell.fort = Math.max(0, cell.fort - 1); did = true; }
  if (!did) { log('该格无障碍', 'lg-sys'); return false; }

  eng.mp -= 1;
  log(`${eng.def.name} 破障 (${c},${r})`, 'lg-ok');
  addEffect('text', c, r, {dur: 25, text: '破障', color: '#7ee787'});
  return true;
}

/* ---------- 布雷 ---------- */
function engineerMine(eng, c, r, mineType) {
  if (!isEngineer(eng)) return false;
  if (hexDist(eng, {c, r}) > 1) { log('必须相邻', 'lg-sys'); return false; }
  if (eng.mp < 2) { log('MP不足(2)', 'lg-sys'); return false; }

  const cell = cellAt(c, r);
  if (!cell) return false;
  const tid = TERRAIN[cell.t].id;
  if (['water','lake','sea'].includes(tid)) { log('无法布雷', 'lg-sys'); return false; }

  mineType = mineType || 3;
  cell.mine = Math.max(cell.mine, mineType);
  eng.mp -= 2;
  log(`${eng.def.name} 布雷 (${c},${r})`, 'lg-ok');
  addEffect('text', c, r, {dur: 30, text: '布雷', color: '#f0883e'});
  return true;
}

/* ---------- 修工事 ---------- */
function engineerFortify(eng) {
  if (!isEngineer(eng)) return false;
  if (eng.mp < 2) { log('MP不足(2)', 'lg-sys'); return false; }

  const cell = cellAt(eng.c, eng.r);
  if (cell.fort >= 6) { log('工事已最高', 'lg-sys'); return false; }

  cell.fort = Math.min(6, cell.fort + 1);
  eng.mp -= 2;
  log(`${eng.def.name} 修工事 Lv${cell.fort}`, 'lg-ok');
  addEffect('text', eng.c, eng.r, {dur: 30, text: 'Lv' + cell.fort, color: '#79c0ff'});
  return true;
}

/* ---------- 修车 ---------- */
function engineerRepair(eng, veh) {
  if (!isEngineer(eng)) return false;
  if (!veh || veh.dead || !['ARM','IFV','APC','NAV','HELI'].includes(veh.def.cat)) {
    log('目标无效', 'lg-sys'); return false;
  }
  if (hexDist(eng, veh) > 1) { log('必须相邻', 'lg-sys'); return false; }
  if (eng.mp < 3) { log('MP不足(3)', 'lg-sys'); return false; }
  if (veh.hp >= veh.maxHp) { log('未受损', 'lg-sys'); return false; }

  const heal = Math.min(veh.maxHp - veh.hp, Math.ceil(veh.maxHp * 0.25));
  veh.hp += heal;
  eng.mp -= 3;
  log(`${eng.def.name} 维修 ${veh.def.name} +${heal.toFixed(1)}HP`, 'lg-ok');
  addEffect('text', veh.c, veh.r, {dur: 35, text: '+' + heal.toFixed(0), color: '#3fb950'});
  return true;
}

/* ---------- 工兵模式点击处理（由 input/mouse.js 调用） ---------- */
function handleEngineerMode(c, r) {
  if (!G.sel || !isEngineer(G.sel)) return;
  const eng = G.sel;

  if (engineerMode === 'clear') {
    engineerClear(eng, c, r);
  } else if (engineerMode === 'mine') {
    const t = parseInt(prompt('雷场类型:\n1=反步兵\n2=反装甲\n3=混合', '3'));
    if (t >= 1 && t <= 3) engineerMine(eng, c, r, t);
  } else if (engineerMode === 'fort') {
    engineerFortify(eng);
  } else if (engineerMode === 'repair') {
    const v = unitAt(c, r);
    if (v) engineerRepair(eng, v);
    else log('该格无车辆', 'lg-sys');
  }
  updateUI();
  draw();
}