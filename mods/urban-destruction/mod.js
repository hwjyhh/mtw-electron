(function(){
  if(!window.MTW) return;
  MTW.defineMod({
    id:'urban-destruction', name:'地形破坏与巷战', version:'1.0',
    setup(api){
      // 1. 城市视野受限
      api.override('sensorRange', orig => function(u){
        let r = orig(u);
        const cell = cellAt(u.c, u.r);
        if(cell && ['city','capital','industry','rubble'].includes(TERRAIN[cell.t].id)) {
          r *= 0.6; // 城市中视野缩减 40%
        }
        return r;
      });

      // 2. 地形破坏逻辑 (拦截区域轰炸)
      api.override('executeAreaFire', orig => function(shooter, center, wIndices, mode){
        const res = orig(shooter, center, wIndices, mode);
        if(!res) return res;

        // 检查是否是重火力
        const isHeavy = wIndices.some(idx => ['howitzer','mlrs','mortar','drone'].includes(shooter.def.weapons[idx].t));
        if(isHeavy) {
          const cell = cellAt(center.c, center.r);
          if(cell) {
            const tid = TERRAIN[cell.t].id;
            let changed = false;

            // 掩体破坏
            if(cell.fort > 0) { cell.fort = 0; changed = true; }

            // 地形转换
            if(['city','capital','village'].includes(tid)) {
              cell.t = T_IDX['rubble']; changed = true;
            } else if(['forest','dforest'].includes(tid)) {
              cell.t = T_IDX['mud']; changed = true; // 森林变焦土/泥地
            }

            if(changed) {
              log(`💥 重火力将 (${center.c},${center.r}) 的地形彻底摧毁！`, 'lg-ranged');
              addEffect('explosion', center.c, center.r, {dur:60, size:2.5, color:'#ff0000'});
              recalcVisibility();
            }
          }
        }
        return res;
      });
    }
  });
})();