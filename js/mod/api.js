/* ============================================================
 * MTW mod/api.js
 * Mod API —— 数据注入 / 生命周期钩子 / 覆盖钩子
 * 依赖：核心层 / 数据层 / 战斗 API
 * ============================================================ */
(function () {
  'use strict';

  const registry = {
    mods: [],
    weapons: new Set(),
    units: new Set(),
    terrains: new Set(),
    hooks: Object.create(null),
    overrides: Object.create(null)
  };

  function pushUnit(o) {
    if (DEF_BY_ID[o.id]) throw new Error(`棋子 ID 已存在: ${o.id}`);
    if (!Array.isArray(o.weapons) || !o.weapons.length) throw new Error(`棋子 ${o.id} 必须至少 1 个武器`);

    U(
      o.id, o.name, o.nation, o.cat, o.echelon, o.men || 4, o.mob, o.mp || 3,
      [o.armor?.f || 0, o.armor?.s || 0, o.armor?.t || 0],
      o.weapons,
      [o.sens?.v ?? 4, o.sens?.t ?? 3, o.sens?.radar ?? 0, o.sens?.sig ?? 0],
      [o.ew?.jam ?? 0, o.ew?.eccm ?? 0, o.ew?.decoy ?? 0],
      o.morale ?? 7, o.training ?? 7, o.stealth ?? 5, o.pts ?? 15,
      o.desc || '',
      {
        aps: o.aps || 0,
        era: o.era || 0,
        addArmor: o.addArmor || 0,
        carry: o.carry || 0,
        cap: o.cap || ''
      }
    );
    const def = UNIT_DEFS[UNIT_DEFS.length - 1];
    DEF_BY_ID[def.id] = def;
    registry.units.add(def.id);
    return def;
  }

  const api = {
    addWeapon(name, type, range, pen, acc, rof, ammo, guid, top, sup, band) {
      if (WPN_BY_NAME[name]) throw new Error(`武器已存在: ${name}`);
      W(name, type, range, pen, acc, rof, ammo, guid || 0, top || 0, sup || 0, band || '');
      registry.weapons.add(name);
      return WPN_BY_NAME[name];
    },
    addUnit(obj) { return pushUnit(obj); },
    addUnits(arr) { return arr.map(pushUnit); },
    addTerrain(t) {
      if (T_IDX[t.id] !== undefined) throw new Error(`地形已存在: ${t.id}`);
      if (!Array.isArray(t.mv) || t.mv.length !== 4) throw new Error(`地形 ${t.id} 的 mv 必须是 4 元素数组`);
      TERRAIN.push(t);
      T_IDX[t.id] = TERRAIN.length - 1;
      registry.terrains.add(t.id);
      return t;
    },
    addMapType(k, cfg) { MAP_TYPES[k] = cfg; },
    addMapSize(k, cfg) { MAP_SIZES[k] = cfg; },
    addAIDifficulty(k, cfg) { AI_DIFFICULTIES[k] = cfg; },
    addAIPreference(k, cfg) { AI_PREFERENCES[k] = cfg; },
    addCategory(k, cfg) { CAT_INFO[k] = cfg; },
    addNation(k, cfg) { NAT_INFO[k] = cfg; },

    on(eventName, handler) {
      (registry.hooks[eventName] ||= []).push(handler);
    },
    override(fnName, wrapper) {
      const orig = window[fnName];
      if (typeof orig !== 'function') throw new Error(`无法覆盖，不存在函数: ${fnName}`);
      window[fnName] = wrapper(orig);
      (registry.overrides[fnName] ||= []).push(wrapper);
    },

    game: G,
    get units()   { return UNIT_DEFS; },
    get weapons() { return WEAPON_LIB; },
    get map()     { return G.map; },
    get mapTypes(){ return MAP_TYPES; },
    get tiles()   { return TERRAIN; },
    log, addEffect, spawn,
    hexDist, hexNeighbors, hexCenter, unitAt, cellAt, inBounds,
    reachableCells, performMove, orderFire, executeAreaFire,
    resolveShot, hitChance, computeEW, recalcVisibility,
    TERRAIN, T_IDX, WPN_BY_NAME, DEF_BY_ID,

    draw: () => draw(),
    ui:   () => updateUI()
  };

  window.MTW = {
    api,
    defineMod(manifest) {
      try {
        if (!manifest || !manifest.id) throw new Error('mod 必须有 id');
        if (registry.mods.find(m => m.id === manifest.id)) {
          console.warn(`[mod] ${manifest.id} 已加载，跳过`);
          return;
        }
        (manifest.dependencies || []).forEach(dep => {
          if (!registry.mods.find(m => m.id === dep)) throw new Error(`缺少依赖: ${dep}`);
        });
        if (typeof manifest.setup === 'function') manifest.setup(api);
        registry.mods.push(manifest);
        console.log(`[mod] ✔ ${manifest.name || manifest.id} v${manifest.version || '?'}`);
      } catch (err) {
        console.error(`[mod] ${manifest?.id} 加载失败:`, err);
      }
    },
    list() { return registry.mods.slice(); },
    fire(eventName, payload) {
      (registry.hooks[eventName] || []).forEach(fn => {
        try { fn(payload); } catch (e) { console.error(`[hook ${eventName}]`, e); }
      });
    }
  };

  console.log('[MTW] Mod API 就绪');
})();