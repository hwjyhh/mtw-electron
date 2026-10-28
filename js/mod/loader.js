/* ============================================================
 * MTW mod/loader.js
 * Mod 发现 / 加载 / 原生钩子注入 / 重建
 * ============================================================ */
(function () {
  'use strict';

  async function discoverMods() {
    if (window.MTW_NATIVE?.listMods) {
      const ids = await window.MTW_NATIVE.listMods();
      const list = [];
      for (const id of ids) {
        try {
          const txt = await window.MTW_NATIVE.readModFile(id, 'mod.json');
          const m = JSON.parse(txt);
          m._dir = id;
          list.push(m);
        } catch (e) {}
      }
      return list;
    }
    try {
      const res = await fetch('mods/index.json', {cache: 'no-store'});
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('脚本加载失败: ' + url));
      document.head.appendChild(s);
    });
  }

   async function loadAll() {
    let list = await discoverMods();
    if (!list.length) {
      console.log('[loader] 未发现 mod');
      return 0;
    }

    // ★ 新增：读取本地存储中被禁用的 Mod ID
    const disabledMods = JSON.parse(localStorage.getItem('mtw_disabled_mods') || '[]');
    const originalLength = list.length;
    
    // ★ 新增：过滤掉被禁用的 Mod
    list = list.filter(m => !disabledMods.includes(m.id));
    
    if (list.length < originalLength) {
      console.log(`[loader] 拦截了 ${originalLength - list.length} 个被禁用的 mod`);
    }

    for (const m of list) {
      try {
        const scriptUrl = m._dir ? `mods/${m._dir}/mod.js` : m.script;
        await loadScript(scriptUrl);
      } catch (e) {
        console.error(`[loader] ${m.id} 加载失败`, e);
      }
    }
    return list.length;
  }

  function installNativeHooks() {
    const origEndTurn = window.endTurn;
    window.endTurn = function () {
      MTW.fire('beforeTurnEnd', {side: G.side, turn: G.turn});
      const r = origEndTurn.apply(this, arguments);
      MTW.fire('afterTurnEnd', {side: G.side, turn: G.turn});
      return r;
    };

    const origSpawn = window.spawn;
    window.spawn = function (defId, side, c, r, facing) {
      const u = origSpawn(defId, side, c, r, facing);
      if (u) MTW.fire('unitSpawn', {unit: u, defId, side});
      return u;
    };

    const origResolveShot = window.resolveShot;
    if (typeof origResolveShot === 'function') {
      window.resolveShot = function (shooter, target, wIdx, mode) {
        const ev = {shooter, target, weapon: shooter.def.weapons[wIdx], mode, result: null};
        MTW.fire('beforeShot', ev);
        const res = origResolveShot.apply(this, arguments);
        ev.result = res;
        MTW.fire('afterShot', ev);
        if (res?.ok && res.kills) MTW.fire('unitKilled', {unit: target, by: shooter});
        return res;
      };
    }

    const origDraw = window.draw;
    window.draw = function () {
      const r = origDraw.apply(this, arguments);
      try { MTW.fire('postDraw', {ctx, cam: G.cam, HS}); } catch (e) { console.error(e); }
      return r;
    };

    const origInit = window.initGame;
    window.initGame = function (a, b) {
      origInit(a, b);
      MTW.fire('afterInit', {map: G.map, units: G.units});
    };
  }

  async function boot() {
    installNativeHooks();
    const before = MTW.list().length;
    await loadAll();
    const after = MTW.list().length;
    if (after > before) {
      console.log(`[loader] 已加载 ${after - before} 个 mod，重建游戏`);
      try {
        initGame(G.mapType || 'encounter', G.mapSize || 'medium');
      } catch (e) {
        console.error('[loader] 重建游戏失败', e);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();