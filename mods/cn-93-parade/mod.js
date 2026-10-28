/* ============================================================
 * mods/cn-93-parade/mod.js — 中方九三阅兵 & 六代机现役尖端力量
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[cn-93-parade] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'cn-93-parade',
    name: '中方九三阅兵·六代机',
    version: '1.0.0',
    setup(api) {
      // 国家代号与颜色：使用更具肃杀感的阅兵绿
      api.addNation('CN93', { n: '中方九三', col: '#4a5d23' });

      // 注册新武器（沿用原有武器池的机制）
      const addW = (n, t, r, pen, acc, rof, ammo, guid, top, sup, band) => {
        try { api.addWeapon(n, t, r, pen, acc, rof, ammo, guid, top, sup, band); } catch(e) {}
      };
      
      addW('105mm线膛炮(100坦)', 'cannon', 8, 600, .85, 3, 40);
      addW('30mm机关炮(100支援)', 'autocannon', 6, 60, .78, 4, 500);
      addW('车载激光(反无)', 'laser', 5, 0, .90, 4, 999);
      addW('无人武器站(低慢小)', 'mg', 4, 5, .75, 4, 800);
      addW('高功率微波(反无)', 'ew', 6, 0, .85, 3, 999, 0, 0, 0, 'UHF');
      addW('红旗-29拦截弹', 'sam', 45, 0, .85, 1, 8, 1, 0, 0, 'RADAR');
      addW('红旗-19拦截弹', 'sam', 35, 0, .88, 2, 8, 1, 0, 0, 'RADAR');
      addW('霹雳-17(超远程)', 'aam', 30, 0, .82, 1, 6, 1, 0, 0, 'RADAR');
      addW('霹雳-15(远程)', 'aam', 22, 0, .88, 2, 8, 1, 0, 0, 'RADAR');
      addW('霹雳-10(格斗)', 'aam', 8, 0, .92, 2, 4, 1, 0, 0, 'IR');
      addW('智能无人僚机蜂群', 'drone', 12, 300, .85, 4, 16, 1, 1, 0, 'SATCOM');

      // 注册单位
      api.addUnits([
        // ================= 地面突击方队 =================
        {
          id: 'cn93_100_tank', name: '100式主战坦克', nation: 'CN93', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 5, pts: 130,
          armor: {f:1200, s:650, t:250}, weapons: ['105mm线膛炮(100坦)', '无人武器站(低慢小)'], 
          sens: {v:7, t:7, radar:3, sig:2}, ew: {jam:0, eccm:4, decoy:0}, morale: 9, training: 9, stealth: 5,
          desc: '“信火一体”第四代坦克，强调信息化与主动防御，搭载智能头盔与反无人机系统', aps: 2, era: 2, addArmor: 200, cap: '主动拦截,反无人机'
        },
        {
          id: 'cn93_100_support', name: '100式支援战车', nation: 'CN93', cat: 'IFV', echelon: 'TM', men: 3, mob: 'track', mp: 5, pts: 105,
          armor: {f:600, s:350, t:150}, weapons: ['30mm机关炮(100支援)', '车载激光(反无)'], 
          sens: {v:8, t:8, radar:4, sig:2}, ew: {jam:0, eccm:3, decoy:0}, morale: 8, training: 9, stealth: 4,
          desc: '具备无人机侦察与操作能力，与100坦协同作战的智能化支援平台', aps: 2, carry: 1, cap: '载员,反无人机,无人机操作'
        },
        {
          id: 'cn93_99b', name: '99B主战坦克', nation: 'CN93', cat: 'ARM', echelon: 'TM', men: 3, mob: 'track', mp: 5, pts: 115,
          armor: {f:1100, s:600, t:200}, weapons: ['125mm滑膛炮', '无人武器站(低慢小)'], 
          sens: {v:6, t:6, radar:2, sig:1}, ew: {jam:0, eccm:3, decoy:0}, morale: 8, training: 8, stealth: 3,
          desc: '99A升级版，换装无人武器站，火控与火力臂优化', aps: 1, era: 2, addArmor: 150, cap: '反应装甲'
        },
        // ================= 防空与反无 =================
        {
          id: 'cn93_hq29', name: '红旗-29反导系统', nation: 'CN93', cat: 'AD', echelon: 'TM', men: 6, mob: 'wheel', mp: 4, pts: 200,
          armor: {f:0, s:0, t:0}, weapons: ['红旗-29拦截弹'], 
          sens: {v:10, t:6, radar:8, sig:2}, ew: {jam:0, eccm:4, decoy:0}, morale: 8, training: 9, stealth: 2,
          desc: '中段反导拦截系统，可实施多段多层拦截', cap: '反导,防空,雷达'
        },
        {
          id: 'cn93_hq19', name: '红旗-19反导系统', nation: 'CN93', cat: 'AD', echelon: 'TM', men: 4, mob: 'wheel', mp: 5, pts: 165,
          armor: {f:0, s:0, t:0}, weapons: ['红旗-19拦截弹'], 
          sens: {v:9, t:6, radar:6, sig:2}, ew: {jam:0, eccm:3, decoy:0}, morale: 8, training: 9, stealth: 2,
          desc: '末段高层反导系统，兼顾中程防空', cap: '反导,防空,雷达'
        },
        {
          id: 'cn93_hpm', name: '高功率微波反无车', nation: 'CN93', cat: 'EW', echelon: 'TM', men: 4, mob: 'wheel', mp: 7, pts: 120,
          armor: {f:40, s:25, t:10}, weapons: ['高功率微波(反无)'], 
          sens: {v:7, t:6, radar:4, sig:3}, ew: {jam:4, eccm:0, decoy:0}, morale: 8, training: 9, stealth: 2,
          desc: '反无人机“铁三角”之一，可烧毁无人机蜂群电子元件', cap: '反无人机,电子战'
        },
        // ================= 六代机 & 空中力量 =================
        {
          id: 'cn93_j36', name: '歼-36 六代机', nation: 'CN93', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 28, pts: 260,
          armor: {f:0, s:0, t:0}, weapons: ['霹雳-17(超远程)', '智能无人僚机蜂群'], 
          sens: {v:11, t:11, radar:7, sig:7}, ew: {jam:2, eccm:6, decoy:1}, morale: 10, training: 10, stealth: 9,
          desc: '重型远程打击+AI协同+对地压制三位一体六代机（游戏推演数据）', cap: '隐身,AI协同,超远程打击'
        },
        {
          id: 'cn93_j50', name: '歼-50 六代机', nation: 'CN93', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 30, pts: 250,
          armor: {f:0, s:0, t:0}, weapons: ['霹雳-15(远程)', '霹雳-10(格斗)'], 
          sens: {v:11, t:10, radar:6, sig:7}, ew: {jam:2, eccm:7, decoy:2}, morale: 10, training: 10, stealth: 10,
          desc: '制空导向六代机，平台更轻，机动性更高，可能具备海空兼容能力（游戏推演数据）', cap: '隐身,高机动,制空'
        },
        {
          id: 'cn93_j20s', name: '歼-20S 双座型', nation: 'CN93', cat: 'AIR', echelon: 'TM', men: 2, mob: 'air', mp: 24, pts: 190,
          armor: {f:0, s:0, t:0}, weapons: ['霹雳-15(远程)', '智能无人僚机蜂群'], 
          sens: {v:10, t:10, radar:6, sig:5}, ew: {jam:1, eccm:5, decoy:1}, morale: 9, training: 10, stealth: 8,
          desc: '双座隐身战机，专职指挥无人僚机进行协同作战', cap: '隐身,无人机指挥'
        },
        {
          id: 'cn93_j35', name: '歼-35A 隐身战机', nation: 'CN93', cat: 'AIR', echelon: 'TM', men: 1, mob: 'air', mp: 24, pts: 175,
          armor: {f:0, s:0, t:0}, weapons: ['霹雳-15(远程)', '精确制导炸弹'], 
          sens: {v:9, t:9, radar:5, sig:4}, ew: {jam:1, eccm:4, decoy:1}, morale: 9, training: 9, stealth: 7,
          desc: '新一代隐身多用途战斗机，兼顾制空与对地打击', cap: '隐身,多用途'
        },
        {
          id: 'cn93_kj600', name: '空警-600 舰载预警机', nation: 'CN93', cat: 'UAV', echelon: 'TM', men: 5, mob: 'air', mp: 16, pts: 140,
          armor: {f:0, s:0, t:0}, weapons: ['无人武器站(低慢小)'], 
          sens: {v:12, t:4, radar:9, sig:4}, ew: {jam:0, eccm:5, decoy:0}, morale: 8, training: 9, stealth: 2,
          desc: '固定翼舰载预警机，大幅提升航母编队态势感知能力', cap: '预警,雷达,指挥'
        }
      ]);

      // UI 注入：将“中方九三”加入所有下拉菜单
      setTimeout(() => {
        const natSelects = ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'];
        natSelects.forEach(id => {
          const el = document.getElementById(id);
          if (el && !Array.from(el.options).some(o => o.value === 'CN93')) {
            const opt = document.createElement('option');
            opt.value = 'CN93';
            opt.textContent = '中方九三';
            el.appendChild(opt);
          }
        });
        if (window.updateUI) updateUI();
      }, 500);
      
      console.log('[cn-93-parade] 九三阅兵与六代机单位已注册');
    }
  });
})();