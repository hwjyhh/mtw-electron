(function(){
  if(!window.MTW) return;
  MTW.defineMod({
    id:'c2-morale', name:'指挥链与士气', version:'1.0',
    setup(api){
      // 1. 监听单位死亡
      api.on('unitKilled', (data) => {
        const deadU = data.unit;
        // 如果是指挥部
        if(deadU.def.cap.includes('指挥')) {
          const side = deadU.side;
          log(`💀 噩耗！${deadU.def.name} 被摧毁，${side===0?'蓝':'红'}方指挥链瘫痪！`, 'lg-hit');
          
          G.units.forEach(u => {
            if(u.side === side && !u.dead) {
              u.mp = Math.max(0, Math.floor(u.mp * 0.5));
              u.morale = Math.max(1, u.morale - 3);
              if(G.ai[side]) {
                u.aiControlled = true;
                u._macro = {cmd: 'retreat'}; // AI 强制撤退
              }
            }
          });
        }
      });

      // 2. 包围与投降逻辑
      api.override('endTurn', orig => function(){
        G.units.forEach(u => {
          if(u.dead || u.hp > u.maxHp * 0.2 || ['FORT','MINE'].includes(u.def.cat)) return;

          // 检查周围是否被围
          const neighbors = hexNeighbors(u.c, u.r);
          let enemyCount = 0;
          let allyCount = 0;
          neighbors.forEach(n => {
            const v = unitAt(n.c, n.r);
            if(v) { v.side === u.side ? allyCount++ : enemyCount++; }
          });

          if(enemyCount >= 3 && allyCount === 0 && u.morale < 5) {
            u.dead = true;
            log(`🏳️ ${u.def.name} 陷入重围且士气崩溃，放下武器投降！`, 'lg-sys');
            addEffect('text', u.c, u.r, {dur:60, text:'投降', color:'#ffffff'});
          }
        });
        orig();
      });
    }
  });
})();