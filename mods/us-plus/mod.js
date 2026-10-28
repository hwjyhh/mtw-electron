/* ============================================================
 * mods/us-plus/mod.js — 美军未来科技扩展 (USP)
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[us-plus] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'us-plus',
    name: '美军未来科技',
    version: '1.0.0',
    setup(api) {
      // 1. 注册国家与颜色 (科幻蓝/青色)
      api.addNation('USP', { n: '美军Plus', col: '#00f0ff' });

      // 2. 注册未来武器
      const addW = (n, t, r, pen, acc, rof, ammo, guid, top, sup, band) => {
        try { api.addWeapon(n, t, r, pen, acc, rof, ammo, guid, top, sup, band); } catch(e) {}
      };
      
      // 电磁炮：超高穿透，超远射程
      addW('32MJ电磁轨道炮', 'cannon', 14, 2500, .88, 2, 40);
      addW('5MW战术激光', 'laser', 8, 0, .95, 4, 999);
      addW('20MW重型激光', 'laser', 12, 0, .92, 3, 999);
      addW('幽灵侧射机炮', 'autocannon', 7, 150, .85, 5, 3000);
      addW('智能巡飞弹阵列', 'drone', 15, 800, .90, 3, 12, 1, 1, 0, 'SATCOM');

      // 3. 注册单位
      api.addUnits([
        {
          id: 'usp_m1a4', name: 'M1A4 未来主战坦克', nation: 'USP', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 5, pts: 150,
          armor: {f:1500, s:800, t:300}, weapons: ['32MJ电磁轨道炮', 'M2A1重机枪', '5MW战术激光'], 
          sens: {v:8, t:8, radar:4, sig:2}, ew: {jam:0, eccm:5, decoy:0}, morale: 9, training: 9, stealth: 4,
          desc: '搭载电磁炮与激光反导系统的下一代陆战平台', aps: 3, era: 2, addArmor: 300, cap: '激光防空,主动拦截,隐身'
        },
        {
          id: 'usp_m2a4', name: 'M2A4 激光步战车', nation: 'USP', cat: 'IFV', echelon: 'TM', men: 3, mob: 'track', mp: 6, pts: 95,
          armor: {f:250, s:150, t:60}, weapons: ['M242 25mm链炮', '智能巡飞弹阵列', '5MW战术激光'], 
          sens: {v:7, t:6, radar:2, sig:1}, ew: {jam:0, eccm:3, decoy:0}, morale: 8, training: 9, stealth: 4,
          desc: '装备定向能武器与无人机巢的步战车', aps: 2, era: 1, addArmor: 80, carry: 2, cap: '载员,激光防空'
        },
        {
          id: 'usp_yf23', name: 'YF-23 黑寡妇II', nation: 'USP', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 26, pts: 220,
          armor: {f:0, s:0, t:0}, weapons: ['GBU-39 SDB', 'AIM-120 AMRAAM'], 
          sens: {v:10, t:10, radar:6, sig:6}, ew: {jam:0, eccm:6, decoy:0}, morale: 9, training: 10, stealth: 10,
          desc: '超越时代的隐身战机，雷达反射面积极低', cap: '隐身,超音速巡航,制空'
        },
        {
          id: 'usp_mig144', name: 'MiG 1.44 (假想敌中队)', nation: 'USP', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 24, pts: 180,
          armor: {f:0, s:0, t:0}, weapons: ['R-37M远程弹', '精确制导炸弹'], 
          sens: {v:9, t:8, radar:5, sig:3}, ew: {jam:2, eccm:2, decoy:0}, morale: 8, training: 9, stealth: 5,
          desc: '用于模拟假想敌的隐身验证机，机动性极强', cap: '高机动,制空'
        },
        {
          id: 'usp_ghost_heli', name: '幽灵武装运输直升机', nation: 'USP', cat: 'HELI', echelon: 'TM', men: 4, mob: 'air', mp: 14, pts: 130,
          armor: {f:120, s:80, t:40}, weapons: ['幽灵侧射机炮', 'Hydra 70火箭', 'AGM-114R'], 
          sens: {v:8, t:7, radar:2, sig:1}, ew: {jam:0, eccm:2, decoy:1}, morale: 8, training: 9, stealth: 5,
          desc: '重型隐身运输直升机，具备极强的侧射压制火力', carry: 3, cap: '运输,载员,持续火力'
        },
        {
          id: 'usp_laser_ads', name: '重型激光防空车', nation: 'USP', cat: 'AD', echelon: 'TM', men: 3, mob: 'wheel', mp: 7, pts: 160,
          armor: {f:60, s:40, t:20}, weapons: ['20MW重型激光'], 
          sens: {v:9, t:9, radar:5, sig:0}, ew: {jam:0, eccm:4, decoy:0}, morale: 8, training: 9, stealth: 3,
          desc: '专为拦截高超音速导弹和无人机蜂群设计', aps: 1, cap: '激光防空,反无人机'
        }
      ]);

      // 4. UI 注入
      setTimeout(() => {
        const natSelects = ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'];
        natSelects.forEach(id => {
          const el = document.getElementById(id);
          if (el && !Array.from(el.options).some(o => o.value === 'USP')) {
            const opt = document.createElement('option');
            opt.value = 'USP';
            opt.textContent = '美军Plus';
            el.appendChild(opt);
          }
        });
        if (window.updateUI) updateUI();
      }, 500);
      
      console.log('[us-plus] 未来科技单位已注册');
    }
  });
})();