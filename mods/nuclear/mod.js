/* ============================================================
 * mods/nuclear/mod.js — 战术核打击 & 战略核武库
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[nuclear] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'nuclear-weapons',
    name: '核武器扩展',
    version: '1.0.0',
    setup(api) {
      // 1. 注册核武器 (采用 drone 类型以支持远程区域打击)
      const addW = (n, t, r, pen, acc, rof, ammo, guid, top, sup, band) => {
        try { api.addWeapon(n, t, r, pen, acc, rof, ammo, guid, top, sup, band); } catch(e) {}
      };
      
      addW('战术核弹头(10kt)', 'drone', 20, 9999, 0.90, 1, 4, 1, 1, 0, 'SATCOM');
      addW('战略核导弹(MIRV)', 'drone', 60, 9999, 0.95, 1, 2, 1, 1, 0, 'SATCOM');

      // 2. 注册国家
      api.addNation('NUC', { n: '核大国', col: '#ff2222' });

      // 3. 注册核载具单位
      api.addUnits([
        {
          id: 'nuc_df41', name: '东风-41 洲际导弹', nation: 'NUC', cat: 'ARTY', echelon: 'TM', men: 6, mob: 'wheel', mp: 6, pts: 300,
          armor: {f:50, s:20, t:10}, weapons: ['战略核导弹(MIRV)'], 
          sens: {v:5, t:4, radar:2, sig:0}, ew: {jam:0, eccm:2, decoy:0}, morale: 10, training: 10, stealth: 3,
          desc: '战略威慑力量，一旦发射将毁灭整个城市', cap: '战略武器,曲射火力'
        },
        {
          id: 'nuc_m51', name: 'M51 潜射弹道导弹', nation: 'NUC', cat: 'ARTY', echelon: 'TM', men: 0, mob: 'static', mp: 0, pts: 300,
          armor: {f:0, s:0, t:0}, weapons: ['战略核导弹(MIRV)'], 
          sens: {v:0, t:0, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 10, training: 10, stealth: 10,
          desc: '深海潜射核力量 (固定发射阵地)', cap: '战略武器,曲射火力'
        },
        {
          id: 'nuc_m270', name: 'M270 核火箭炮', nation: 'NUC', cat: 'ARTY', echelon: 'TM', men: 3, mob: 'track', mp: 4, pts: 180,
          armor: {f:20, s:15, t:10}, weapons: ['战术核弹头(10kt)'], 
          sens: {v:6, t:5, radar:1, sig:0}, ew: {jam:0, eccm:2, decoy:0}, morale: 8, training: 8, stealth: 3,
          desc: '战术核打击载具，发射低当量核弹', cap: '曲射火力'
        }
      ]);

      // 4. UI 注入
      setTimeout(() => {
        const natSelects = ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'];
        natSelects.forEach(id => {
          const el = document.getElementById(id);
          if (el && !Array.from(el.options).some(o => o.value === 'NUC')) {
            const opt = document.createElement('option');
            opt.value = 'NUC';
            opt.textContent = '核大国';
            el.appendChild(opt);
          }
        });
        if (window.updateUI) updateUI();
      }, 500);

      // 5. 核心逻辑：劫持射击结算，加入核爆与污染
      api.override('resolveShot', orig => function(shooter, target, wIdx, mode) {
        const w = shooter.def.weapons[wIdx];
        const isNuke = w && w.name.includes('核');

        // 如果是核弹，拦截原生的单点伤害逻辑，改为范围打击
        if (isNuke && w.r >= hexDist(shooter, target)) {
           // 扣弹药，进入冷却
           shooter.ammo[wIdx] -= 1;
           shooter.fired[wIdx] += 1;
           
           // 调用原生区域打击
           executeAreaFire(shooter, {c:target.c, r:target.r}, [wIdx], 'attack');
           
           // 渲染核爆特效
           addEffect('explosion', target.c, target.r, {dur: 80, size: 5.0, color: '#ffffff'});
           addEffect('text', target.c, target.r, {dur: 80, text: '☢️ 核爆', color: '#ff2222'});
           
           log(`☢️ 天罚降临！${shooter.def.name} 发射了 ${w.n}！`,'lg-hit');
           
           // 计算核爆半径内所有单位的伤害与残留辐射
           const blastRadius = w.name.includes('战略') ? 4 : 2; // 战术核弹2格，战略核弹4格
           G.units.forEach(u => {
             if(u.dead) return;
             const d = hexDist({c:target.c, r:target.r}, u);
             if (d <= blastRadius) {
               // 越靠近中心伤害越高，无视装甲
               const dmg = (u.maxHp * (1 - d / (blastRadius + 1))) + 5;
               u.hp -= dmg;
               u.morale = 1;
               u.sup = 20;
               if(u.hp <= 0) { u.dead = true; spawnWreck(u); }
               
               // 注入辐射污染，在 tickMovement 中被检测
               u._falloutTurns = 5;
               u._falloutDmg = w.name.includes('战略') ? 2.0 : 1.0;
               addEffect('muzzle', u.c, u.r, {dur: 40, color: '#adff2f'}); // 绿色辐射色
             }
           });
           
           // 给地图格子打上辐射标记
           const cellsToRad = [];
           for(let dc=-blastRadius; dc<=blastRadius; dc++){
             for(let dr=-blastRadius; dr<=blastRadius; dr++){
               if(Math.abs(dc)+Math.abs(dr) <= blastRadius*1.5){
                 cellsToRad.push({c:target.c+dc, r:target.r+dr});
               }
             }
           }
           G._nuclearZones = G._nuclearZones || [];
           cellsToRad.forEach(p => {
             if(inBounds(p.c,p.r)) G._nuclearZones.push({c:p.c, r:p.r, turns:5});
           });

           return { ok:true, hits:1, kills:0, p:1, dist:hexDist(shooter,target), w, effectiveHits:1 };
        }
        return orig(shooter, target, wIdx, mode);
      });

      // 6. 核心逻辑：在每帧移动中处理辐射伤害和核爆区衰减
      api.override('tickMovement', orig => function(dt) {
        orig(dt);
        
        // 处理单位的辐射伤害
        G.units.forEach(u => {
          if (u.dead || !u._falloutTurns) return;
          u._falloutTurns -= dt;
          u.hp -= u._falloutDmg * dt;
          if (Math.random() < 0.05) addEffect('smoke', u.c, u.r, {dur: 20, color: '#adff2f'});
          if (u.hp <= 0) {
            u.dead = true;
            spawnWreck(u);
            log(`☢️ ${u.def.name} 死于核辐射`,'lg-hit');
          }
        });

        // 衰减地图上的核爆区
        if (G._nuclearZones) {
          G._nuclearZones.forEach((z, i) => {
            z.turns -= dt;
            if (z.turns <= 0) G._nuclearZones.splice(i, 1);
          });
        }
      });

      // 7. 核心逻辑：在绘制层之上叠加核污染区的绿色光晕
      api.override('draw', orig => function() {
        orig();
        if (!G._nuclearZones || !G._nuclearZones.length) return;
        
        const hs = HS * G.cam.z;
        G._nuclearZones.forEach(z => {
          const wc = hexCenter(z.c, z.r, HS);
          const sc = worldToScreen(wc.x, wc.y);
          ctx.save();
          ctx.fillStyle = 'rgba(173, 255, 47, 0.15)';
          ctx.strokeStyle = 'rgba(173, 255, 47, 0.4)';
          ctx.lineWidth = 1;
          hexPath(ctx, sc.x, sc.y, hs * 0.95);
          ctx.fill();
          ctx.stroke();
          
          // 绘制辐射标志
          if (G.cam.z > 0.6 && Math.random() < 0.1) {
            ctx.fillStyle = '#adff2f';
            ctx.font = `bold ${hs*0.4}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☢️', sc.x, sc.y);
          }
          ctx.restore();
        });
      });
      
      console.log('[nuclear] 核武器与辐射系统已加载');
    }
  });
})();