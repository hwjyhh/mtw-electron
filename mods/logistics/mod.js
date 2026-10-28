(function(){
  if(!window.MTW) return;
  MTW.defineMod({
    id:'logistics', name:'后勤与消耗', version:'1.0',
    setup(api){
      // 初始化燃油
      const origSpawn = window.spawn;
      window.spawn = function(defId, side, c, r, facing){
        const u = origSpawn(defId, side, c, r, facing);
        if(u && ['wheel','track','air'].includes(u.def.mob)) {
          u.fuel = 100; // 满油 100
        }
        return u;
      };

      // 移动消耗燃油
      api.override('performMove', orig => function(u, target){
        const res = orig(u, target);
        if(res && u.fuel !== undefined) {
          const dist = hexDist(u, target);
          u.fuel = Math.max(0, u.fuel - dist * 5); // 每格消耗5%油
          if(u.fuel <= 0 && u.mp > 0) {
            u.mp = 0;
            log(`⛽ ${u.def.name} 燃油耗尽，无法移动！`, 'lg-hit');
          }
        }
        return res;
      });

      // 回合结束处理补给线
      api.override('endTurn', orig => function(){
        orig();
        G.units.forEach(u => {
          if(u.dead || u.carriedBy || u.fuel === undefined) return;
          
          // 找最近的补给车或HQ
          const supplier = G.units.find(s => !s.dead && s.side === u.side && 
            (s.def.cap.includes('补给') || s.def.cap.includes('指挥')) && 
            hexDist(u, s) <= 4);
            
          if(supplier) {
            u.fuel = Math.min(100, u.fuel + 30);
          } else {
            u.fuel = Math.max(0, u.fuel - 5); // 断补给，缓慢掉油
            if(u.fuel <= 0) u.mp = 0;
          }
        });
      });
    }
  });
})();