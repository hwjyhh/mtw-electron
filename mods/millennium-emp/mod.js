(function () {
  if (!window.MTW) return;
  MTW.defineMod({
    id: 'millennium-emp', name: '千禧全频带干扰', version: '1.0',
    setup(api) {
      const nations = ['US','CN','RU','UK','FR','JP','DE','AU'];

      // 1. 为每个国家生成专属全频带干扰机
      for (let n of nations) {
        api.addUnit({
          id: `m2k_${n}_fullband`,
          name: `${n} 全频带干扰机`,
          nation: n, cat: 'EW', echelon: 'TM', men: 6, mob: 'wheel', mp: 6,
          armor: {f:20, s:10, t:5}, weapons: [], 
          sens: {v:8, t:6, radar:0, sig:8}, ew: {jam:10, eccm:2, decoy:0}, 
          morale: 8, training: 9, stealth: 2, pts: 200,
          desc: '大范围战略级电子压制。快捷键 Z 开启全频带阻塞干扰。',
          cap: '全频带阻塞'
        });
      }

      // 2. 核心逻辑与交互
      let empMode = false;

      window.addEventListener('keydown', e => {
        if(e.key === 'z' || e.key === 'Z') {
          if(!G.sel || G.sel.def.id.indexOf('fullband') === -1) return;
          empMode = !empMode;
          log(empMode ? '📡 全频带阻塞模式开启，点击地图释放' : '📡 已取消', 'lg-ew');
          draw();
        }
      });

      const origClick = window.handleClick;
      window.handleClick = function(c, r) {
        if(empMode) {
          if(G.sel.mp < 4) { log('MP不足(需4)', 'lg-sys'); empMode=false; draw(); return; }
          G.sel.mp -= 4;
          empMode = false;
          
          log(`⚡ ${G.sel.def.name} 释放全频带阻塞！`, 'lg-hit');
          addEffect('explosion', c, r, {dur: 80, size: 6.0, color: '#d0a0e0'});
          addEffect('text', c, r, {dur: 80, text: '📡 全频带压制', color: '#d0a0e0'});

          G.units.forEach(u => {
            if(u.dead || u.side === G.side) return;
            if(hexDist({c, r}, u) <= 6) {
              u.pulseStunned = Math.max(u.pulseStunned || 0, 3);
              u.jamming = 50;
              u.radarOn = false;
              u._radarOffTurns = 3;
              addEffect('muzzle', u.c, u.r, {dur: 60, color: '#d0a0e0'});
            }
          });
          
          G._empZones = G._empZones || [];
          G._empZones.push({c, r, turns: 3});
          updateUI(); draw();
          return;
        }
        origClick(c, r);
      };

      // 3. 渲染与清理
      const origDraw = window.draw;
      window.draw = function() {
        origDraw();
        if(G._empZones) {
          G._empZones.forEach(z => {
            const wc = hexCenter(z.c, z.r, HS), sc = worldToScreen(wc.x, wc.y);
            const range = 6 * HS * SQ3 * G.cam.z;
            ctx.save();
            ctx.fillStyle = 'rgba(208,160,224,0.15)';
            ctx.strokeStyle = 'rgba(208,160,224,0.4)';
            ctx.lineWidth = 2; ctx.setLineDash([10, 5]);
            ctx.beginPath(); ctx.arc(sc.x, sc.y, range, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.restore();
          });
        }
        if(empMode && G.hover) {
          const wc = hexCenter(G.hover.c, G.hover.r, HS), sc = worldToScreen(wc.x, wc.y);
          const range = 6 * HS * SQ3 * G.cam.z;
          ctx.save();
          ctx.strokeStyle = 'rgba(208,160,224,0.8)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(sc.x, sc.y, range, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        }
      };

      api.override('endTurn', orig => function() {
        if(G._empZones) {
          G._empZones.forEach(z => z.turns--);
          G._empZones = G._empZones.filter(z => z.turns > 0);
        }
        orig();
      });
      console.log(`[millennium-emp] 全频带干扰机制已装载`);
    }
  });
})();