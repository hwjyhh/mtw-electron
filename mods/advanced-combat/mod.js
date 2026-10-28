(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'advanced-combat',
    name: '高级战术机制扩展',
    version: '1.0.0',
    setup(api) {
       // === 修复补丁：将未挂载到 window 的 const 函数强行挂载 ===
      if (typeof canAreaFire !== 'undefined') window.canAreaFire = canAreaFire;
      if (typeof hitChance !== 'undefined') window.hitChance = hitChance;
      if (typeof hasLOS !== 'undefined') window.hasLOS = hasLOS;
      if (typeof executeAreaFire !== 'undefined') window.executeAreaFire = executeAreaFire;
      if (typeof endTurn !== 'undefined') window.endTurn = endTurn;
      // ===================================================

      // =========================================================
      // 1. 全局空地打击 & 机枪压制增强
      // =========================================================
      
      // 所有武器均可攻击空地（解除只有曲射/远程的限制）
      api.override('canAreaFire', orig => function (w) {
        return true; // 无论是步枪还是坦克炮，都可以打空地
      });

      // 机枪压制增强：命中时附带巨额压制力
      api.override('resolveShot', orig => function (shooter, target, wIdx, mode) {
        const res = orig(shooter, target, wIdx, mode);
        if (res.ok) {
          const w = shooter.def.weapons[wIdx];
          // 如果是机枪，且成功命中，额外增加压制值
          if (w.t === 'mg' && res.effectiveHits > 0) {
            target.sup = Math.min(20, target.sup + 6); 
            target.morale = Math.max(1, target.morale - 1.2);
            if (typeof addEffect === 'function') {
              addEffect('text', target.c, target.r, { dur: 30, text: '火力压制!', color: '#d29922' });
            }
          }
        }
        return res;
      });

      api.override('hitChance', orig => function (shooter, target, w, dist) {
    let p = orig(shooter, target, w, dist);
    // 1. 行进惩罚
    if (shooter.moving || (shooter.moved || 0) > 0) {
        const isVehicle = ['ARM', 'IFV', 'APC'].includes(shooter.def.cat);
        p *= isVehicle ? 0.5 : 0.7;
    }
    // 2. 反斜面惩罚
    if (typeof cellAt !== 'undefined' && shooter && target) {
        const h1 = cellAt(shooter.c, shooter.r)?.elev || 0;
        const h2 = cellAt(target.c, target.r)?.elev || 0;
        if (h2 > h1 && !['howitzer', 'mortar', 'mlrs'].includes(w.t)) {
            p *= 0.2;
        }
    }
    return p;
});
      // =========================================================
      // 3. 烟幕弹系统 (快捷键 T 投放)
      // =========================================================
      // 初始化全局烟幕数据
      window._SMOKE_CELLS = {}; // 格式: "c,r": { turns: 2 }

      // 拦截视线判定：如果有烟幕，直接阻断视线
      api.override('hasLOS', orig => function (a, b) {
        // 简单判定：起点和终点只要有烟，或者中间格子有烟，就中断
        const dx = b.c - a.c, dy = b.r - a.r;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        for (let i = 1; i <= dist; i++) {
          const c = Math.round(a.c + (dx * i) / dist);
          const r = Math.round(a.r + (dy * i) / dist);
          if (window._SMOKE_CELLS[`${c},${r}`]) return false; // 被烟幕遮挡
        }
        return orig(a, b);
      });

      // 监听按键 T 投放烟幕
      window.addEventListener('keydown', e => {
        if (e.key === 't' || e.key === 'T') {
          if (G.side !== 0 || !G.sel || G.sel.dead || !G.hover) return;
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
          
          const u = G.sel;
          if (u.mp < 1) { log('MP不足，无法释放烟幕', 'lg-sys'); return; }
          u.mp -= 1;
          
          const c = G.hover.c, r = G.hover.r;
          window._SMOKE_CELLS[`${c},${r}`] = { turns: 2 };
          addEffect('smoke', c, r, { dur: 200, color: '#cccccc' });
          log(`💨 ${u.def.name} 在 (${c},${r}) 投放烟幕弹`, 'lg-ok');
          draw();
        }
      });

      // 每回合扣减烟幕时间
      api.override('endTurn', orig => function () {
        Object.keys(window._SMOKE_CELLS).forEach(k => {
          window._SMOKE_CELLS[k].turns--;
          if (window._SMOKE_CELLS[k].turns <= 0) delete window._SMOKE_CELLS[k];
        });
        return orig();
      });

      // 绘制烟幕图层
      api.override('draw', orig => function () {
        orig();
        if (typeof ctx !== 'undefined' && window._SMOKE_CELLS) {
          const hs = HS * G.cam.z;
          Object.keys(window._SMOKE_CELLS).forEach(k => {
            const [c, r] = k.split(',').map(Number);
            const wc = hexCenter(c, r, HS);
            const sc = worldToScreen(wc.x, wc.y);
            ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
            ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.9, 0, Math.PI * 2); ctx.fill();
          });
        }
      });

      // =========================================================
      // 4. 火炮偏移 & 徐进弹幕
      // =========================================================
      // 执行区域射击时，如果是火炮/迫击炮，落点产生随机偏移
      api.override('executeAreaFire', orig => function (shooter, center, wIndices, mode) {
        let realCenter = center;
        // 如果包含曲射武器，产生落点偏移
        const hasIndirect = wIndices.some(i => ['howitzer', 'mortar', 'mlrs'].includes(shooter.def.weapons[i].t));
        if (hasIndirect) {
          const drift = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
          const driftR = Math.floor(Math.random() * 3) - 1;
          realCenter = { c: center.c + drift, r: center.r + driftR };
          if (drift !== 0 || driftR !== 0) {
            log(`💥 火炮散布：落点偏移至 (${realCenter.c},${realCenter.r})`, 'lg-ranged');
          }
        }
        return orig(shooter, realCenter, wIndices, mode);
      });

     

      // =========================================================
      // 7. 战术日志（双方战损比面板）
      // =========================================================
      const stats = { side0: { kills: 0, lost: 0, pts: 0 }, side1: { kills: 0, lost: 0, pts: 0 } };
      
      api.on('unitKilled', ev => {
        const victimSide = ev.unit.side;
        const killerSide = ev.by.side;
        const pts = ev.unit.def.pts || 0;

        if (victimSide === 0) {
          stats.side0.lost++;
          stats.side1.kills++;
          stats.side1.pts += pts;
        } else {
          stats.side1.lost++;
          stats.side0.kills++;
          stats.side0.pts += pts;
        }
        updateStatsUI();
      });

      function buildStatsUI() {
        if (document.getElementById('combatStatsPanel')) return;
        const aside = document.getElementById('right');
        if (!aside) { setTimeout(buildStatsUI, 500); return; }

        const p = document.createElement('div');
        p.id = 'combatStatsPanel';
        p.className = 'panel';
        p.innerHTML = `
          <h3>战术日志 (战损)</h3>
          <div style="display:flex; justify-content:space-between; font-size:10.5px; margin-bottom:4px;">
            <span style="color:#58a6ff">蓝方: <b id="statB_kills">0</b> 杀 / <b id="statB_lost">0</b> 损</span>
            <span style="color:#f85149">红方: <b id="statR_kills">0</b> 杀 / <b id="statR_lost">0</b> 损</span>
          </div>
          <div style="font-size:10px; color:#8b949e;">
            蓝方战果: <b id="statB_pts" style="color:#d29922">0</b> 分<br>
            红方战果: <b id="statR_pts" style="color:#d29922">0</b> 分
          </div>
        `;
        aside.insertBefore(p, aside.firstChild);
      }

      function updateStatsUI() {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('statB_kills', stats.side0.kills);
        set('statB_lost', stats.side0.lost);
        set('statB_pts', stats.side0.pts);
        set('statR_kills', stats.side1.kills);
        set('statR_lost', stats.side1.lost);
        set('statR_pts', stats.side1.pts);
      }

      // 启动时构建 UI
      setTimeout(buildStatsUI, 1000);

      // =========================================================
      // 8. 徐进弹幕 (按键 B 触发)
      // =========================================================
      // 记录徐进弹幕坐标，每回合自动前移
      let creepingBarrage = null;

      window.addEventListener('keydown', e => {
        if (e.key === 'b' || e.key === 'B') {
          if (G.side !== 0 || !G.sel || !G.hover) return;
          const u = G.sel;
          if (u.def.cat !== 'ARTY') { log('只有火炮单位可呼叫徐进弹幕', 'lg-sys'); return; }
          
          creepingBarrage = {
            c: G.hover.c, r: G.hover.r,
            side: G.side,
            turns: 3 // 持续 3 回合
          };
          log(`💥 ${u.def.name} 呼叫徐进弹幕：目标区 (${G.hover.c},${G.hover.r})，持续 3 回合`, 'lg-ranged');
        }
      });

      api.override('endTurn', orig => function () {
        // 处理徐进弹幕
        if (creepingBarrage) {
          const { c, r, side } = creepingBarrage;
          // 找到该方所有的火炮，强制开火
          G.units.filter(u => !u.dead && u.side === side && u.def.cat === 'ARTY').forEach(arty => {
            // 临时解除已开火状态
            const oldFired = [...arty.fired];
            arty.fired = arty.fired.map(() => 0); 
            
            const wList = arty.def.weapons.map((w, i) => i).filter(i => api.canAreaFire(arty.def.weapons[i]));
            if (wList.length) {
               api.executeAreaFire(arty, { c, r }, wList, 'suppress');
            }
            arty.fired = oldFired; // 恢复
          });
          
          creepingBarrage.turns--;
          // 弹幕向前推进（假设向红方推移，即 r 减小）
          creepingBarrage.r -= 1;
          if (creepingBarrage.turns <= 0) creepingBarrage = null;
        }
        return orig();
      });

      // 渲染徐进弹幕警告圈
      api.override('draw', orig => function () {
        orig();
        if (creepingBarrage && typeof ctx !== 'undefined') {
          const wc = hexCenter(creepingBarrage.c, creepingBarrage.r, HS);
          const sc = worldToScreen(wc.x, wc.y);
          ctx.strokeStyle = 'rgba(255, 100, 0, 0.8)';
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 5]);
          ctx.beginPath();
          ctx.arc(sc.x, sc.y, HS * 2 * G.cam.z, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255, 100, 0, 0.9)';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('徐进弹幕区', sc.x - 30, sc.y - HS * 2 * G.cam.z - 10);
        }
      });

      console.log('[advanced-combat] 高级战术规则加载完毕');
    }
  });
})();