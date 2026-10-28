/* ============================================================
 * mods/ukraine/mod.js — 乌克兰阵营扩展
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[ukraine] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'ukraine-faction',
    name: '乌克兰阵营',
    version: '1.0.0',
    setup(api) {
      // 1. 注册国家与颜色
      api.addNation('UA', { n: '乌克兰', col: '#e6c21a' }); // 使用标志性的黄蓝色系（取黄色）

      // 2. 注册专属武器 (如果已有同名武器会自动跳过)
      const addW = (n, t, r, pen, acc, rof, ammo, guid, top, sup, band) => {
        try { api.addWeapon(n, t, r, pen, acc, rof, ammo, guid, top, sup, band); } catch(e) {}
      };
      
      addW('Malyuk突击步枪', 'rifle', 6, 0, .78, 3, 210);
      addW('Fort-221步枪', 'rifle', 6, 0, .75, 3, 210);
      addW('UAR-15步枪', 'rifle', 6, 0, .78, 3, 210);
      addW('Stugna-P反坦克导弹', 'atgm', 10, 800, .85, 1, 4, 1, 0, 0, 'IR'); // 斯图格纳-P
      addW('RK-3 Corsar反坦克导弹', 'atgm', 9, 750, .82, 1, 4, 1, 0, 0, 'IR');
      addW('NLAW反坦克导弹', 'atgm', 8, 700, .80, 1, 1, 1, 1, 0, 'IR'); // 攻顶
      addW('ZTM-1 30mm机关炮', 'autocannon', 6, 60, .72, 4, 400);
      addW('KBA-3 125mm滑膛炮', 'cannon', 9, 750, .78, 2, 40);
      addW('UAR-10狙击枪', 'sniper', 12, 0, .86, 1, 40);
      addW('BTR-4 30mm机关炮', 'autocannon', 6, 55, .70, 4, 500);
      addW('Zaslon主动防护系统', 'ew', 4, 0, .90, 3, 999); // 乌克兰自研APS

      // 3. 注册乌克兰单位
      api.addUnits([
        // ================= 步兵单位 =================
        {
          id: 'ua_inf', name: '乌军机械化步兵班', nation: 'UA', cat: 'INF', echelon: 'SQD', men: 9, mob: 'leg', mp: 3, pts: 16,
          armor: {f:0, s:0, t:0}, weapons: ['Malyuk突击步枪', 'Fort-221步枪', 'AGS-30自动榴弹'], 
          sens: {v:5, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 5,
          desc: '乌克兰陆军标准步兵班', cap: '夜视,无人机'
        },
        {
          id: 'ua_territorial', name: '领土防卫旅', nation: 'UA', cat: 'INF', echelon: 'SQD', men: 10, mob: 'leg', mp: 3, pts: 10,
          armor: {f:0, s:0, t:0}, weapons: ['AK-74M步枪', 'RPG-7火箭筒'], 
          sens: {v:4, t:3, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 5, stealth: 5,
          desc: '地方防御部队，士气较高但训练不足', cap: ''
        },
        {
          id: 'ua_marine', name: '乌海军陆战队', nation: 'UA', cat: 'INF', echelon: 'SQD', men: 9, mob: 'leg', mp: 3, pts: 22,
          armor: {f:0, s:0, t:0}, weapons: ['Malyuk突击步枪', 'PKM通用机枪', 'RK-3 Corsar反坦克导弹'], 
          sens: {v:6, t:5, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 9, training: 9, stealth: 6,
          desc: '精锐两栖部队', cap: '两栖'
        },
        {
          id: 'ua_azov', name: '亚速特种部队', nation: 'UA', cat: 'SF', echelon: 'TM', men: 8, mob: 'leg', mp: 4, pts: 45,
          armor: {f:0, s:0, t:0}, weapons: ['UAR-15步枪', 'UAR-10狙击枪', 'NLAW反坦克导弹'], 
          sens: {v:7, t:6, radar:0, sig:2}, ew: {jam:0, eccm:0, decoy:0}, morale: 10, training: 10, stealth: 8,
          desc: '著名特种部队', cap: '夜视,精锐,渗透'
        },
        {
          id: 'ua_at_javelin', name: '标枪反坦克组', nation: 'UA', cat: 'INF', echelon: 'TM', men: 3, mob: 'leg', mp: 3, pts: 28,
          armor: {f:0, s:0, t:0}, weapons: ['标枪导弹', 'Malyuk突击步枪'], 
          sens: {v:5, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 6,
          desc: '美援标枪反坦克小组', cap: '反装甲,攻顶'
        },
        {
          id: 'ua_at_stugna', name: '斯图格纳反坦克组', nation: 'UA', cat: 'INF', echelon: 'TM', men: 3, mob: 'leg', mp: 3, pts: 24,
          armor: {f:0, s:0, t:0}, weapons: ['Stugna-P反坦克导弹', 'AK-74M步枪'], 
          sens: {v:5, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 6,
          desc: '乌自研反坦克导弹', cap: '反装甲'
        },
        {
          id: 'ua_sniper', name: '乌军狙击小组', nation: 'UA', cat: 'RECON', echelon: 'TM', men: 2, mob: 'leg', mp: 3, pts: 26,
          armor: {f:0, s:0, t:0}, weapons: ['UAR-10狙击枪', 'T-5000狙击枪'], 
          sens: {v:7, t:6, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 9, stealth: 8,
          desc: '远程精确狙击', cap: '狙击'
        },

        // ================= 装甲单位 =================
        {
          id: 'ua_t64bm', name: 'T-64BM 布拉特', nation: 'UA', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 4, pts: 75,
          armor: {f:600, s:350, t:80}, weapons: ['KBA-3 125mm滑膛炮', 'NSV 12.7mm重机'], 
          sens: {v:5, t:5, radar:1, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 7, stealth: 3,
          desc: '乌克兰改进型主战坦克', cap: '反应装甲', era: 2, addArmor: 100
        },
        {
          id: 'ua_t72amt', name: 'T-72AMT', nation: 'UA', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 4, pts: 68,
          armor: {f:550, s:300, t:80}, weapons: ['2A46M-5 125mm', 'NSV 12.7mm重机'], 
          sens: {v:5, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 7, stealth: 3,
          desc: '深度现代化升级的T-72', cap: '反应装甲', era: 2, addArmor: 80
        },
        {
          id: 'ua_t84', name: 'T-84 堡垒', nation: 'UA', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 4, pts: 95,
          armor: {f:800, s:450, t:120}, weapons: ['KBA-3 125mm滑膛炮', '2A72 30mm机关炮'], 
          sens: {v:6, t:6, radar:1, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 3,
          desc: '乌克兰自研最强主战坦克', cap: '主动拦截,反应装甲', aps: 1, era: 2, addArmor: 120
        },
        {
          id: 'ua_btr4', name: 'BTR-4E 装甲车', nation: 'UA', cat: 'IFV', echelon: 'TM', men: 3, mob: 'wheel', mp: 6, pts: 48,
          armor: {f:60, s:40, t:20}, weapons: ['BTR-4 30mm机关炮', 'RK-3 Corsar反坦克导弹'], 
          sens: {v:5, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 7, stealth: 4,
          desc: '乌克兰国产轮式步战车', carry: 2, cap: '载员'
        },
        {
          id: 'ua_bradley', name: 'M2A2 布拉德利', nation: 'UA', cat: 'IFV', echelon: 'TM', men: 3, mob: 'track', mp: 5, pts: 62,
          armor: {f:110, s:55, t:25}, weapons: ['M242 25mm链炮', '陶式2B'], 
          sens: {v:6, t:6, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 3,
          desc: '美援步兵战车', era: 1, addArmor: 30, carry: 2, cap: '载员'
        },
        {
          id: 'ua_leopard2', name: '豹2A4', nation: 'UA', cat: 'ARM', echelon: 'TM', men: 4, mob: 'track', mp: 4, pts: 90,
          armor: {f:800, s:450, t:100}, weapons: ['M256 120mm滑膛炮', 'M240B通用机枪'], 
          sens: {v:6, t:6, radar:1, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 3,
          desc: '西方援助的主战坦克', cap: '火控先进', addArmor: 50
        },

        // ================= 炮兵 =================
        {
          id: 'ua_m777', name: 'M777 155mm榴弹炮', nation: 'UA', cat: 'ARTY', echelon: 'TM', men: 8, mob: 'leg', mp: 1, pts: 58,
          armor: {f:0, s:0, t:0}, weapons: ['M777A2 155mm榴弹炮'], 
          sens: {v:5, t:4, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 7, training: 8, stealth: 3,
          desc: '美援超轻型榴弹炮', cap: '曲射火力'
        },
        {
          id: 'ua_himars', name: '海马斯 M142', nation: 'UA', cat: 'ARTY', echelon: 'TM', men: 3, mob: 'wheel', mp: 7, pts: 86,
          armor: {f:20, s:15, t:10}, weapons: ['GMLRS制导火箭'], 
          sens: {v:6, t:5, radar:1, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 8, training: 8, stealth: 4,
          desc: '美援高机动火箭炮，精度极高', cap: '曲射火力,制导'
        },

        // ================= 无人机 =================
        {
          id: 'ua_bayraktar', name: 'TB2 旗手无人机', nation: 'UA', cat: 'UAV', echelon: 'TM', men: 0, mob: 'air', mp: 14, pts: 76,
          armor: {f:0, s:0, t:0}, weapons: ['蓝箭-7空地导弹'], // 借用相近的导弹数据
          sens: {v:9, t:8, radar:1, sig:3}, ew: {jam:0, eccm:0, decoy:0}, morale: 6, training: 8, stealth: 2,
          desc: '土耳其援助察打一体无人机', cap: '侦察,空中打击'
        },
        {
          id: 'ua_fpv', name: 'FPV穿越机', nation: 'UA', cat: 'UAV', echelon: 'TM', men: 0, mob: 'air', mp: 10, pts: 14,
          armor: {f:0, s:0, t:0}, weapons: ['FPV战斗部'], 
          sens: {v:5, t:5, radar:0, sig:0}, ew: {jam:0, eccm:0, decoy:0}, morale: 5, training: 7, stealth: 6,
          desc: '廉价的单兵攻击无人机，难以拦截', cap: '巡飞弹,低成本'
        }
      ]);
      console.log('[ukraine] 乌克兰阵营及单位已注册');
            // 4. 动态把乌克兰插入到界面的下拉菜单中
      setTimeout(() => {
        const natSelects = ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'];
        natSelects.forEach(id => {
          const el = document.getElementById(id);
          // 如果找到了下拉框，且里面还没有 UA，就添加进去
          if (el && !Array.from(el.options).some(o => o.value === 'UA')) {
            const opt = document.createElement('option');
            opt.value = 'UA';
            opt.textContent = '乌克兰';
            el.appendChild(opt);
          }
        });
        // 刷新一下游戏 UI
        if (window.updateUI) updateUI();
      }, 500);
    }
  });
})();