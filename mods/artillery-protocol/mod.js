(function () {
  if (!window.MTW) return;
  MTW.defineMod({
    id: 'artillery-protocol',
    name: '火炮协议与指挥延迟',
    version: '1.0',
    setup(api) {
      
      // ================= 1. 火炮部署机制 =================
      const ARTY_CATS = ['ARTY'];
      const ARTY_WEAPONS = ['howitzer', 'mlrs', 'mortar'];

      // 移动后取消部署状态
      api.override('performMove', orig => function(u, target) {
        const res = orig(u, target);
        if (res && ARTY_CATS.includes(u.def.cat)) {
          if (u._isDeployed) {
            log(`🚚 ${u.def.name} 移动中，已收起阵地`, 'lg-sys');
            u._isDeployed = false;
          }
        }
        return res;
      });

      // 开火拦截：未部署则无法开火，自动消耗 MP 进行架设
      api.override('orderFire', orig => function(shooter, target, wIndices, mode) {
        const isArty = ARTY_CATS.includes(shooter.def.cat) || 
                       wIndices.some(i => ARTY_WEAPONS.includes(shooter.def.weapons[i].t));
        
        if (isArty && !shooter._isDeployed) {
          if (shooter.mp < 1) {
            log(`⏳ ${shooter.def.name} 正在架设中，无法开火`, 'lg-sys');
            return;
          }
          shooter.mp -= 1; // 消耗 1 MP 架设
          shooter._isDeployed = true;
          addEffect('text', shooter.c, shooter.r, {dur: 40, text:'架设阵地', color:'#f0b72f'});
          log(`🎯 ${shooter.def.name} 耗费1MP完成阵地架设，下回合可开火`, 'lg-ok');
          return; // 本回合仅架设，不执行开火
        }
        return orig(shooter, target, wIndices, mode);
      });

      // 在 UI 中显示架设状态
      api.override('updateUI', orig => function() {
        orig();
        if (G.sel && !G.sel.dead && ARTY_CATS.includes(G.sel.def.cat)) {
          const si = document.getElementById('selInfo');
          if (si) {
            const status = G.sel._isDeployed ? 
              '<span style="color:#3fb950">已架设 (随时开火)</span>' : 
              '<span style="color:#d29922">未架设 (开火需1MP)</span>';
            si.insertAdjacentHTML('beforeend', `<div class="row"><span class="k">火炮状态</span><span class="v">${status}</span></div>`);
          }
        }
      });


      // ================= 2. 指挥延迟机制 =================
      api.override('handleClick', orig => function(c, r) {
        // 如果玩家想移动或攻击
        if ((G.mode === 'move' || G.mode === 'fire' || G.mode === 'attackMove') && G.sel && !G.sel.dead) {
          const u = G.sel;
          // 计算通信惩罚
          let delay = 0;
          if (G.commLinks[u.side].strength < 50) delay++;
          if (u.jamming > 10) delay++;
          
          // 如果 HQ 被毁（假定阵营没有指挥单位存活）
          const hasHQ = G.units.some(x => !x.dead && x.side === u.side && x.def.cap.includes('指挥'));
          if (!hasHQ) delay++;

          if (delay > 0 && Math.random() < 0.5) {
            u.mp = 0; // 原地罚站
            addEffect('text', u.c, u.r, {dur: 50, text: '指令延迟', color: '#f85149'});
            log(`📡 ${u.def.name} 通信受扰/HQ缺失，指令下达延迟，本回合无法行动！`, 'lg-ew');
            updateUI(); draw();
            return; // 拦截点击
          }
        }
        return orig(c, r);
      });

      // 初始设置部署状态
      api.on('unitSpawn', (data) => {
        if (ARTY_CATS.includes(data.unit.def.cat)) data.unit._isDeployed = true; // 初始默认已架设
      });
      
      console.log('[artillery-protocol] 火炮与延迟协议已加载');
    }
  });
})();