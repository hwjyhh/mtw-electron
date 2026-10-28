/* ============================================================
 * MTW game/save.js
 * 存档 / 读档
 * 依赖：state / data-units / init / visibility / ew
 * ============================================================ */
'use strict';

function bindSaveLoadButtons() {
  document.getElementById('btnSave').onclick = doSave;
  document.getElementById('btnLoad').onclick = doLoad;
}

function doSave() {
  const data = {
    map: G.map,
    mapType: G.mapType,
    mapSize: G.mapSize,
    units: G.units.map(u => ({
      id: u.def.id, side: u.side, c: u.c, r: u.r,
      hp: u.hp, men: u.men, ammo: u.ammo, sup: u.sup, morale: u.morale,
      mp: u.mp, dead: u.dead, dugIn: u.dugIn, apsShots: u.apsShots,
      facing: u.facing, uid: u.uid, stance: u.stance,
      cargoIds: u.cargo.map(x => x.uid),
      carriedByUid: u.carriedBy ? u.carriedBy.uid : null,
      jamming: u.jamming, shieldTurns: u.shieldTurns || 0,
      rangedUsedThisTurn: u.rangedUsedThisTurn,
      cryptoBrokenBy: u.cryptoBrokenBy, cryptoProgress: u.cryptoProgress || 0,
      radarOn: u.radarOn !== false, radarIntermittent: !!u.radarIntermittent,
      exposureLevel: u.exposureLevel || 0
    })),
    wrecks: G.wrecks.map(w => ({c: w.c, r: w.r, defId: w.def.id, side: w.side, age: w.age})),
    turn: G.turn, side: G.side, ai: G.ai, sideNat: G.sideNat,
    aiDifficulty: G.aiDifficulty, aiPreference: G.aiPreference, crypto: G.crypto,
    ewManual: EW_MANUAL,
    custom: UNIT_DEFS.filter(d => d.d === '自定义棋子')
  };

  const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mtw_save.json';
  a.click();
  log('已保存', 'lg-ok');
}

function doLoad() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);

        // 自定义单位
        (d.custom || []).forEach(cd => {
          if (!DEF_BY_ID[cd.id]) {
            UNIT_DEFS.push(cd);
            DEF_BY_ID[cd.id] = cd;
          }
        });

        G.map = d.map;
        G.mapType = d.mapType || 'encounter';
        G.mapSize = d.mapSize || 'medium';
        G.units = [];
        G.wrecks = [];
        MISSILES.length = 0;
        UID = 1;

        const uidMap = {};
        d.units.forEach(su => {
          const u = spawn(su.id, su.side, su.c, su.r, su.facing);
          if (u) {
            u.uid = su.uid;
            u.hp = su.hp; u.men = su.men; u.ammo = su.ammo; u.sup = su.sup;
            u.morale = su.morale; u.mp = su.mp; u.dead = su.dead;
            u.dugIn = su.dugIn || 0;
            u.apsShots = su.apsShots !== undefined ? su.apsShots : 3;
            u.shieldTurns = su.shieldTurns || 0;
            u.stance = su.stance || 'defense';
            u.rangedUsedThisTurn = su.rangedUsedThisTurn || false;
            u.cryptoBrokenBy = su.cryptoBrokenBy != null ? su.cryptoBrokenBy : null;
            u.cryptoProgress = su.cryptoProgress || 0;
            u.radarOn = su.radarOn !== false;
            u.radarIntermittent = !!su.radarIntermittent;
            u.exposureLevel = su.exposureLevel || 0;
            uidMap[su.uid] = u;
          }
        });

        d.units.forEach(su => {
          if (su.cargoIds) {
            const u = uidMap[su.uid];
            su.cargoIds.forEach(cid => {
              const c = uidMap[cid];
              if (u && c) { c.carriedBy = u; u.cargo.push(c); }
            });
          }
        });

        (d.wrecks || []).forEach(wd => {
          const def = DEF_BY_ID[wd.defId];
          if (def) G.wrecks.push({c: wd.c, r: wd.r, def, side: wd.side, age: wd.age || 0});
        });

        G.turn = d.turn;
        G.side = d.side;
        G.ai = d.ai || [false, true];
        G.sideNat = d.sideNat || ['US', 'CN'];
        G.aiDifficulty = d.aiDifficulty || ['medium', 'medium'];
        G.aiPreference = d.aiPreference || ['balanced', 'balanced'];
        G.crypto = d.crypto || G.crypto;
        if (d.ewManual) Object.assign(EW_MANUAL, d.ewManual);

        document.getElementById('natSide0').value = G.sideNat[0];
        document.getElementById('natSide1').value = G.sideNat[1];
        document.getElementById('btnSide0ai').textContent = '蓝方：' + (G.ai[0] ? 'AI' : '人类');
        document.getElementById('btnSide1ai').textContent = '红方：' + (G.ai[1] ? 'AI' : '人类');

        computeEW();
        recalcVisibility();
        log('读取存档成功', 'lg-ok');
        draw();
        updateUI();
        updateEWPanel();
      } catch (err) {
        alert('读取失败: ' + err.message);
      }
    };
    rd.readAsText(f);
  };
  inp.click();
}