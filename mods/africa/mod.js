/* ============================================================
 * mods/africa/mod.js — 非洲阵营扩展
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[africa] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'africa-faction',
    name: '非洲阵营',
    version: '1.0.0',
    setup(api) {
      // 1. 注册国家与颜色 (使用沙漠黄/浅绿色)
      api.addNation('AF', { n: '非洲', col: '#b59b5c' });

      // 2. 注册特色武器
      const addW = (n, t, r, pen, acc, rof, ammo, guid, top, sup, band) => {
        try { api.addWeapon(n, t, r, pen, acc, rof, ammo, guid, top, sup, band); } catch(e) {}
      };
      
      addW('AKM步枪', 'rifle', 5, 0, .68, 3, 210);
      addW('RPD轻机枪', 'mg', 7, 0, .65, 3, 600);
      addW('DShK重机枪', 'mg', 6, 20, .65, 3, 500);
      addW('B-10无后座力炮', 'cannon', 5, 150, .68, 1, 20);
      addW('皮卡重机枪', 'mg', 6, 15, .60, 4, 900);
      addW('107mm火箭炮', 'mlrs', 12, 30, .50, 2, 12, 0, 1, 0, 'VHF');
      addW('Mig-29 (非洲)', 'drone', 20, 0, .70, 1, 4, 1, 0, 0, 'RADAR');
      
      // 3. 注册非洲单位
      api.addUnits([
        // ================= 步兵单位 =================
        {
          id: 'af_militia', name: '民兵武装', nation: 'AF', cat: 'INF', echelon: 'SQD', men: 10, mob: 'leg', mp: 3, pts: 8,
          armor: {f:0, s:0, t:0}, weapons: ['AKM步枪', 'RPG-7火箭筒'], 
          sens: {v:3, t:2, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 5, training: 4, stealth: 6,
          desc: '轻装民兵，士气较低，但熟悉地形', cap: ''
        },
        {
          id: 'af_infantry', name: '正规步兵班', nation: 'AF', cat: 'INF', echelon: 'SQD', men: 9, mob: 'leg', mp: 3, pts: 14,
          armor: {f:0, s:0, t:0}, weapons: ['AKM步枪', 'RPD轻机枪', 'RPG-7火箭筒'], 
          sens: {v:4, t:3, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 6, stealth: 5,
          desc: '标准政府军步兵班', cap: '夜视'
        },
        {
          id: 'af_commando', name: '突击队', nation: 'AF', cat: 'SF', echelon: 'TM', men: 6, mob: 'leg', mp: 4, pts: 34,
          armor: {f:0, s:0, t:0}, weapons: ['AKM步枪', 'RPD轻机枪', 'RPG-7火箭筒'], 
          sens: {v:6, t:5, radar:0, sig:1}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 7,
          desc: '接受过特种训练的精英部队', cap: '渗透,丛林战'
        },
        {
          id: 'af_at_team', name: '反坦克小组', nation: 'AF', cat: 'INF', echelon: 'TM', men: 3, mob: 'leg', mp: 3, pts: 18,
          armor: {f:0, s:0, t:0}, weapons: ['B-10无后座力炮', 'AKM步枪'], 
          sens: {v:4, t:3, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 6, stealth: 6,
          desc: '使用老式无后座力炮', cap: '反装甲'
        },

        // ================= 特色载具 =================
        {
          id: 'af_technical', name: '武装皮卡 (Technical)', nation: 'AF', cat: 'APC', echelon: 'TM', men: 2, mob: 'wheel', mp: 9, pts: 20,
          armor: {f:0, s:0, t:0}, weapons: ['皮卡重机枪', 'RPG-7火箭筒'], 
          sens: {v:5, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 6, stealth: 5,
          desc: '高机动改装皮卡，打了就跑', carry: 1, cap: '高机动,载员'
        },
        {
          id: 'af_t55', name: 'T-55 主战坦克', nation: 'AF', cat: 'ARM', echelon: 'TM', men: 4, mob: 'track', mp: 4, pts: 42,
          armor: {f:200, s:120, t:40}, weapons: ['U-5TS 115mm', 'DShK重机枪'], 
          sens: {v:4, t:3, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 6, stealth: 3,
          desc: '冷战时期遗留的老式苏制坦克，数量庞大', cap: ''
        },
        {
          id: 'af_t72', name: 'T-72M 主战坦克', nation: 'AF', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 4, pts: 60,
          armor: {f:450, s:250, t:70}, weapons: ['2A46M-1 125mm', 'NSV 12.7mm重机'], 
          sens: {v:4, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 6, stealth: 3,
          desc: '外贸版T-72，部分国家的装甲主力', era: 1, addArmor: 50
        },
        {
          id: 'af_btr60', name: 'BTR-60 装甲车', nation: 'AF', cat: 'APC', echelon: 'TM', men: 2, mob: 'wheel', mp: 7, pts: 22,
          armor: {f:20, s:15, t:10}, weapons: ['DShK重机枪'], 
          sens: {v:4, t:3, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 5, stealth: 4,
          desc: '老式八轮装甲输送车', carry: 2, cap: '载员'
        },

        // ================= 火力与支援 =================
        {
          id: 'af_107mm', name: '107mm 火箭炮', nation: 'AF', cat: 'ARTY', echelon: 'TM', men: 4, mob: 'wheel', mp: 6, pts: 35,
          armor: {f:0, s:0, t:0}, weapons: ['107mm火箭炮'], 
          sens: {v:4, t:3, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 5, stealth: 4,
          desc: '游击战神器，轻便且易于隐藏', cap: '曲射火力'
        },
        {
          id: 'af_mortar', name: '82mm 迫击炮组', nation: 'AF', cat: 'ARTY', echelon: 'TM', men: 4, mob: 'leg', mp: 2, pts: 18,
          armor: {f:0, s:0, t:0}, weapons: ['82mm迫击炮'], 
          sens: {v:4, t:3, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 6, stealth: 5,
          desc: '步兵伴随火力', cap: '曲射火力'
        },
        {
          id: 'af_zsu', name: 'ZSU-23-4 石勒喀河', nation: 'AF', cat: 'AD', echelon: 'TM', men: 4, mob: 'track', mp: 5, pts: 36,
          armor: {f:20, s:15, t:10}, weapons: ['AZP-23 23mm'], 
          sens: {v:7, t:6, radar:2, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 6, stealth: 3,
          desc: '老式自行高炮，平射威力也很大', cap: '防空'
        },
        {
          id: 'af_uav', name: '小型侦察无人机', nation: 'AF', cat: 'UAV', echelon: 'TM', men: 0, mob: 'air', mp: 11, pts: 15,
          armor: {f:0, s:0, t:0}, weapons: ['DShK'], 
          sens: {v:7, t:6, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 5, training: 7, stealth: 4,
          desc: '民用改装无人机，用于侦察', cap: '侦察'
        },
        {
          id: 'af_mig29', name: 'Mig-29 战斗机', nation: 'AF', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 20, pts: 85,
          armor: {f:0, s:0, t:0}, weapons: ['Mig-29 (非洲)'], 
          sens: {v:8, t:7, radar:3, sig:2}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 6, stealth: 1,
          desc: '少量现役的第三代战机', cap: '空中打击'
        }
      ]);

      // 4. 动态注入 UI 下拉菜单
      setTimeout(() => {
        const natSelects = ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'];
        natSelects.forEach(id => {
          const el = document.getElementById(id);
          if (el && !Array.from(el.options).some(o => o.value === 'AF')) {
            const opt = document.createElement('option');
            opt.value = 'AF';
            opt.textContent = '非洲';
            el.appendChild(opt);
          }
        });
        if (window.updateUI) updateUI();
      }, 500);
      
      console.log('[africa] 非洲阵营及单位已注册');
    }
  });
})();