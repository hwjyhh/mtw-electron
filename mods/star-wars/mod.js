/* ============================================================
 * mods/star-wars/mod.js — 星球大战扩展包 (银河帝国 vs 反抗军)
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[star-wars] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'star-wars',
    name: '星球大战扩展',
    version: '1.0.0',
    setup(api) {
      // 1. 注册两大阵营
      api.addNation('GAL', { n: '银河帝国', col: '#b0b0b0' }); // 灰白色
      api.addNation('REB', { n: '反抗军',   col: '#ff5500' }); // 反抗军橙

      // 2. 注册星战专属武器
      const addW = (n, t, r, pen, acc, rof, ammo, guid, top, sup, band) => {
        try { api.addWeapon(n, t, r, pen, acc, rof, ammo, guid, top, sup, band); } catch(e) {}
      };
      
      // 爆能武器 (Blaster) 具有极高的射速和精度
      addW('E-11爆能步枪', 'rifle', 8, 20, .85, 4, 500);
      addW('DLT-19重型爆能枪', 'mg', 10, 40, .80, 4, 800);
      addW('重型激光炮(AT-AT)', 'laser', 12, 300, .90, 2, 999);
      addW('X翼战机激光炮', 'laser', 10, 400, .92, 4, 999);
      addW('钛战机激光炮', 'laser', 8, 350, .90, 4, 999);
      addW('质子鱼雷', 'drone', 15, 9999, .85, 1, 4, 1, 0, 0, 'SATCOM'); // 秒杀级对舰武器
      addW('死星超级激光炮', 'laser', 50, 99999, .99, 1, 1);
      addW('原力闪电', 'laser', 5, 500, .95, 3, 999); // 无视物理护甲
      addW('光剑', 'rifle', 1, 9999, .95, 5, 999); // 近战无敌

      // 3. 注册单位
      api.addUnits([
        // ================= 银河帝国 =================
        {
          id: 'gal_stormtrooper', name: '帝国暴风兵班', nation: 'GAL', cat: 'INF', echelon: 'SQD', men: 9, mob: 'leg', mp: 3, pts: 30,
          armor: {f:30, s:20, t:10}, weapons: ['E-11爆能步枪'], 
          sens: {v:7, t:6, radar:2, sig:1}, ew: {jam:0, eccm:1, decoy:0}, morale: 7, training: 7, stealth: 4,
          desc: '帝国冲锋队，装备白色复合装甲。', cap: '夜视'
        },
        {
          id: 'gal_scout', name: '帝国侦察兵', nation: 'GAL', cat: 'RECON', echelon: 'TM', men: 4, mob: 'leg', mp: 5, pts: 35,
          armor: {f:20, s:15, t:5}, weapons: ['E-11爆能步枪', 'DLT-19重型爆能枪'], 
          sens: {v:8, t:7, radar:3, sig:2}, ew: {jam:0, eccm:1, decoy:0}, morale: 8, training: 8, stealth: 7,
          desc: '帝国侦察兵，配备高倍率传感器。', cap: '侦察,渗透'
        },
        {
          id: 'gal_atst', name: 'AT-ST 侦察步行机', nation: 'GAL', cat: 'IFV', echelon: 'TM', men: 2, mob: 'track', mp: 5, pts: 70,
          armor: {f:200, s:150, t:100}, weapons: ['重型激光炮(AT-AT)', 'DLT-19重型爆能枪'], // 借用重炮
          sens: {v:7, t:6, radar:2, sig:1}, ew: {jam:0, eccm:2, decoy:0}, morale: 7, training: 7, stealth: 3,
          desc: '鸡腿步行机，火力凶猛但底盘不稳。', cap: '全地形'
        },
        {
          id: 'gal_atat', name: 'AT-AT 重型突击步行机', nation: 'GAL', cat: 'ARM', echelon: 'TM', men: 5, mob: 'track', mp: 4, pts: 180,
          armor: {f:1200, s:800, t:400}, weapons: ['重型激光炮(AT-AT)', 'DLT-19重型爆能枪'], 
          sens: {v:6, t:5, radar:2, sig:2}, ew: {jam:0, eccm:3, decoy:0}, morale: 9, training: 8, stealth: 1,
          desc: '帝国巨型全地形装甲步行机，能搭载大量步兵。', aps: 1, addArmor: 200, carry: 3, cap: '全地形,载员'
        },
        {
          id: 'gal_tie', name: '钛战机 (TIE Fighter)', nation: 'GAL', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 24, pts: 110,
          armor: {f:50, s:40, t:20}, weapons: ['钛战机激光炮'], 
          sens: {v:8, t:7, radar:4, sig:3}, ew: {jam:0, eccm:2, decoy:0}, morale: 7, training: 8, stealth: 2,
          desc: '无护盾、无超空间引擎，但数量庞大的星际战斗机。', cap: '制空'
        },
        {
          id: 'gal_vader', name: '达斯·维达', nation: 'GAL', cat: 'SF', echelon: 'TM', men: 1, mob: 'leg', mp: 5, pts: 300,
          armor: {f:100, s:100, t:100}, weapons: ['光剑', '原力闪电'], 
          sens: {v:10, t:10, radar:0, sig:0}, ew: {jam:0, eccm:10, decoy:0}, morale: 10, training: 10, stealth: 8,
          desc: '西斯尊主。拥有原力，能抵挡任何火力。', aps: 3, era: 3, addArmor: 200, cap: '原力护盾,近战无敌'
        },
        {
          id: 'gal_deathstar', name: '死星 (固定炮台)', nation: 'GAL', cat: 'FORT', echelon: 'TM', men: 100, mob: 'static', mp: 0, pts: 1000,
          armor: {f:9999, s:9999, t:9999}, weapons: ['死星超级激光炮'], 
          sens: {v:20, t:20, radar:10, sig:10}, ew: {jam:0, eccm:10, decoy:0}, morale: 10, training: 10, stealth: 10,
          desc: '空间站级武器。一旦充能完毕，整个星球都将灰飞烟灭。', cap: '超级武器,空间站'
        },

        // ================= 反抗军 =================
        {
          id: 'reb_trooper', name: '反抗军突击队', nation: 'REB', cat: 'INF', echelon: 'SQD', men: 9, mob: 'leg', mp: 3, pts: 25,
          armor: {f:10, s:10, t:5}, weapons: ['E-11爆能步枪', 'DLT-19重型爆能枪'], 
          sens: {v:6, t:5, radar:1, sig:1}, ew: {jam:0, eccm:1, decoy:0}, morale: 8, training: 7, stealth: 6,
          desc: '反抗军同盟的游击战士，擅长利用地形掩护。', cap: '渗透'
        },
        {
          id: 'reb_xwing', name: 'X翼星际战机', nation: 'REB', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 26, pts: 140,
          armor: {f:150, s:100, t:50}, weapons: ['X翼战机激光炮', '质子鱼雷'], 
          sens: {v:9, t:8, radar:5, sig:3}, ew: {jam:0, eccm:4, decoy:0}, morale: 9, training: 9, stealth: 3,
          desc: '配备偏导护盾和机器人宇航员的王牌战机。', aps: 2, cap: '护盾,制空,反舰'
        },
        {
          id: 'reb_luke', name: '卢克·天行者', nation: 'REB', cat: 'SF', echelon: 'TM', men: 1, mob: 'leg', mp: 5, pts: 250,
          armor: {f:50, s:50, t:50}, weapons: ['光剑', '原力闪电'], 
          sens: {v:10, t:10, radar:0, sig:0}, ew: {jam:0, eccm:10, decoy:0}, morale: 10, training: 10, stealth: 9,
          desc: '最后的绝地武士。原力与他同在。', aps: 3, era: 2, addArmor: 100, cap: '原力护盾,近战无敌'
        }
      ]);

      // 4. UI 注入
      setTimeout(() => {
        const natSelects = ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'];
        natSelects.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            if (!Array.from(el.options).some(o => o.value === 'GAL')) {
              const opt = document.createElement('option');
              opt.value = 'GAL'; opt.textContent = '银河帝国'; el.appendChild(opt);
            }
            if (!Array.from(el.options).some(o => o.value === 'REB')) {
              const opt = document.createElement('option');
              opt.value = 'REB'; opt.textContent = '反抗军'; el.appendChild(opt);
            }
          }
        });
        if (window.updateUI) updateUI();
      }, 500);
      
      console.log('[star-wars] 星战银河系已载入');
    }
  });
})();