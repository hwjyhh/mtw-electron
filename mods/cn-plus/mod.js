/* ============================================================
 * mods/cn-plus/mod.js — 中方未来科技扩展 (CNP)
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[cn-plus] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'cn-plus',
    name: '中方未来科技',
    version: '1.0.0',
    setup(api) {
      // 1. 注册国家与颜色 (未来红/霓虹红)
      api.addNation('CNP', { n: '中方Plus', col: '#ff3366' });

      // 2. 注册未来武器
      const addW = (n, t, r, pen, acc, rof, ammo, guid, top, sup, band) => {
        try { api.addWeapon(n, t, r, pen, acc, rof, ammo, guid, top, sup, band); } catch(e) {}
      };
      
      // 电磁武器与定向能武器
      addW('30MJ电磁线圈炮', 'cannon', 12, 2200, .86, 2, 40);
      addW('高能微波发射器', 'ew', 8, 0, .90, 3, 999, 0, 0, 0, 'UHF'); // 范围压制
      addW('50kW车载激光', 'laser', 7, 0, .92, 4, 999);
      addW('高超音速滑翔弹', 'drone', 20, 1500, .90, 1, 4, 1, 0, 0, 'SATCOM');
      addW('蜂群无人机发射巢', 'drone', 10, 200, .85, 4, 36, 1, 1, 0, 'SATCOM');

      // 3. 注册单位
      api.addUnits([
        {
          id: 'cnp_tank', name: 'ZTZ-99AX 电磁炮坦克', nation: 'CNP', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 5, pts: 145,
          armor: {f:1400, s:750, t:280}, weapons: ['30MJ电磁线圈炮', 'QJG-02 14.5mm', '50kW车载激光'], 
          sens: {v:8, t:8, radar:4, sig:2}, ew: {jam:0, eccm:5, decoy:0}, morale: 9, training: 9, stealth: 4,
          desc: '搭载无人炮塔与电磁炮的第四代主战坦克', aps: 3, era: 2, addArmor: 250, cap: '激光防空,主动拦截,隐身'
        },
        {
          id: 'cnp_uav_carrier', name: '“蜂巢”无人机母车', nation: 'CNP', cat: 'IFV', echelon: 'TM', men: 4, mob: 'wheel', mp: 8, pts: 110,
          armor: {f:150, s:80, t:30}, weapons: ['蜂群无人机发射巢'], 
          sens: {v:9, t:7, radar:3, sig:2}, ew: {jam:0, eccm:3, decoy:0}, morale: 8, training: 8, stealth: 4,
          desc: '释放无人机蜂群进行超视距打击的支援载具', aps: 1, carry: 1, cap: '载员,蜂群打击'
        },
        {
          id: 'cnp_hpm', name: '高能微波打击车', nation: 'CNP', cat: 'EW', echelon: 'TM', men: 4, mob: 'wheel', mp: 7, pts: 120,
          armor: {f:40, s:30, t:15}, weapons: ['高能微波发射器'], 
          sens: {v:8, t:6, radar:2, sig:4}, ew: {jam:5, eccm:0, decoy:0}, morale: 8, training: 9, stealth: 2,
          desc: '烧毁敌方电子元件的大范围微波武器平台', cap: '微波武器,电子战'
        },
        {
          id: 'cnp_baidi', name: '“白帝”空天战机', nation: 'CNP', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 28, pts: 240,
          armor: {f:0, s:0, t:0}, weapons: ['高超音速滑翔弹', '精确制导炸弹'], 
          sens: {v:10, t:10, radar:7, sig:6}, ew: {jam:3, eccm:6, decoy:0}, morale: 10, training: 10, stealth: 9,
          desc: '大气层内外双模飞行的未来空天战机', cap: '隐身,高超音速,制空,对地打击'
        },
        {
          id: 'cnp_xuannv', name: '“玄女”无人僚机', nation: 'CNP', cat: 'UAV', echelon: 'TM', men: 0, mob: 'air', mp: 24, pts: 150,
          armor: {f:0, s:0, t:0}, weapons: ['精确制导炸弹'], 
          sens: {v:9, t:9, radar:5, sig:4}, ew: {jam:2, eccm:4, decoy:1}, morale: 10, training: 10, stealth: 8,
          desc: '与有人战机协同作战的高机动隐身无人机', cap: '隐身,无人,制空'
        },
        {
          id: 'cnp_laser_tank', name: 'LW-300 重型激光拦截车', nation: 'CNP', cat: 'AD', echelon: 'TM', men: 3, mob: 'track', mp: 6, pts: 155,
          armor: {f:80, s:50, t:20}, weapons: ['50kW车载激光'], 
          sens: {v:9, t:9, radar:5, sig:0}, ew: {jam:0, eccm:4, decoy:0}, morale: 8, training: 9, stealth: 3,
          desc: '专为要地防空与反无人机蜂群设计的激光战车', aps: 1, cap: '激光防空,反无人机'
        }
      ]);

      // 4. UI 注入
      setTimeout(() => {
        const natSelects = ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'];
        natSelects.forEach(id => {
          const el = document.getElementById(id);
          if (el && !Array.from(el.options).some(o => o.value === 'CNP')) {
            const opt = document.createElement('option');
            opt.value = 'CNP';
            opt.textContent = '中方Plus';
            el.appendChild(opt);
          }
        });
        if (window.updateUI) updateUI();
      }, 500);
      
      console.log('[cn-plus] 未来科技单位已注册');
    }
  });
})();