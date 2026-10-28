(function(){
  if(!window.MTW) return;
  MTW.defineMod({
    id:'air-superiority', name:'防空与制空权', version:'1.0',
    setup(api){
      // 1. 初始化雷达状态
      const origSpawn = window.spawn;
      window.spawn = function(defId, side, c, r, facing){
        const u = origSpawn(defId, side, c, r, facing);
        if(u) u.radarOn = true;
        return u;
      };

      // 2. IADS 共享视野
      api.override('canSee', orig => function(obs, tgt){
        if(tgt.def.mob === 'air') {
          // 找本方是否有没有被关机的雷达
          const hasRadar = G.units.some(r => !r.dead && r.side === obs.side && r.radarOn && r.def.sens.radar >= 5);
          if(hasRadar && obs.def.cat === 'AD') {
            if(hexDist(obs, tgt) <= 20) return true; // AD 借用雷达视野打高空
          }
        }
        return orig(obs, tgt);
      });

      // 3. SEAD 反辐射逼退
      api.override('resolveShot', orig => function(shooter, target, wIdx, mode){
        const res = orig(shooter, target, wIdx, mode);
        const w = shooter.def.weapons[wIdx];
        if(res.ok && res.hits > 0 && w.n.includes('反辐射') && target.def.sens.radar > 0) {
          target.radarOn = false;
          target._radarOffTurns = 3;
          log(`🚨 ${target.def.name} 遭到反辐射打击，雷达被迫关机 3 回合！`, 'lg-comm');
        }
        return res;
      });

      // 4. 制空权计算与空袭拦截
      api.override('orderFire', orig => function(shooter, target, wIndices, mode){
        // 如果叫空中支援，检查制空权
        if(shooter.def.mob === 'air' && target.def.mob !== 'air') {
          let myAir = G.units.filter(u => !u.dead && u.side === shooter.side && u.def.cat === 'AIR').length;
          let enAir = G.units.filter(u => !u.dead && u.side !== shooter.side && u.def.cat === 'AIR').length;
          if(enAir > myAir * 2 && Math.random() < 0.4) {
            log(`✈️ ${shooter.def.name} 在缺乏制空权的情况下出击，被敌方战机拦截击落！`, 'lg-hit');
            shooter.dead = true;
            spawnWreck(shooter);
            return;
          }
        }
        return orig(shooter, target, wIndices, mode);
      });

      // 雷达关机恢复
      api.override('endTurn', orig => function(){
        G.units.forEach(u => {
          if(u._radarOffTurns > 0) {
            u._radarOffTurns--;
            if(u._radarOffTurns <= 0) {
              u.radarOn = true;
              log(`📡 ${u.def.name} 雷达重新开机`, 'lg-comm');
            }
          }
        });
        orig();
      });
    }
  });
})();