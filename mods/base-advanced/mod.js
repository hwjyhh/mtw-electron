MTW.defineMod({
  id: 'base-advanced',
  name: '基地与固定设施扩展',
  version: '1.0.0',
  setup(api) {
    // 补救 API 的武器注册 bug
    function addW(name, type, r, pen, acc, rof, ammo, guid=0, top=0, sup=0, band=''){
      if (WPN_BY_NAME[name]) return WPN_BY_NAME[name];
      W(name, type, r, pen, acc, rof, ammo, guid, top, sup, band);
      const w = WEAPON_LIB[WEAPON_LIB.length - 1];
      WPN_BY_NAME[name] = w;
      return w;
    }

    /* ==================== 1. 特殊设施武器 ==================== */
    addW('大型相控阵雷达', 'radar', 30, 0, 0.95, 1, 999, 0, 0, 0, 'RADAR');
    addW('近防密集阵', 'autocannon', 4, 100, 0.85, 4, 3000);
    addW('岸防重炮', 'cannon', 15, 500, 0.75, 2, 100);
    addW('要塞防空导弹', 'sam', 25, 0, 0.85, 2, 20, 1, 0, 0, 'RADAR');
    addW('楼顶机枪阵地', 'mg', 6, 15, 0.65, 3, 1200);

    /* ==================== 2. 军事设施 ==================== */

    // 1. 固定雷达站
    api.addUnit({
      id: 'base_radar_station', name: '大型固定雷达站', nation: 'N',
      cat: 'FORT', echelon: 'TM', men: 15, mob: 'static', mp: 0,
      armor: {f: 20, s: 20, t: 10},
      weapons: ['大型相控阵雷达'],
      sens: {v: 12, t: 10, radar: 10, sig: 8}, ew: {jam: 0, eccm: 3, decoy: 0},
      morale: 9, training: 7, stealth: 1, pts: 150,
      desc: '超远距离雷达，可引导火力', cap: '固定,雷达,通信中继',
      carry: 0, aps: 0, era: 0, addArmor: 100
    });

    // 2. 机场
    api.addUnit({
      id: 'base_airfield', name: '野战机场', nation: 'N',
      cat: 'FORT', echelon: 'CO', men: 50, mob: 'static', mp: 0,
      armor: {f: 50, s: 50, t: 20},
      weapons: ['近防密集阵', '要塞防空导弹'],
      sens: {v: 8, t: 8, radar: 6, sig: 5}, ew: {jam: 0, eccm: 2, decoy: 0},
      morale: 9, training: 7, stealth: 1, pts: 250,
      desc: '可提供空中支援与补给', cap: '固定,机场,补给',
      carry: 0, aps: 1, era: 0, addArmor: 200
    });

    // 3. 岸防炮台
    api.addUnit({
      id: 'base_coastal_battery', name: '岸防重炮台', nation: 'N',
      cat: 'FORT', echelon: 'TM', men: 20, mob: 'static', mp: 0,
      armor: {f: 80, s: 80, t: 30},
      weapons: ['岸防重炮', '楼顶机枪阵地'],
      sens: {v: 8, t: 6, radar: 2, sig: 2}, ew: {jam: 0, eccm: 1, decoy: 0},
      morale: 8, training: 8, stealth: 2, pts: 120,
      desc: '重型海岸防御火炮', cap: '固定,攻坚',
      carry: 0, aps: 0, era: 0, addArmor: 300
    });

    // 4. 防空阵地
    api.addUnit({
      id: 'base_sam_site', name: '要地防空阵地', nation: 'N',
      cat: 'FORT', echelon: 'TM', men: 12, mob: 'static', mp: 0,
      armor: {f: 20, s: 20, t: 10},
      weapons: ['要塞防空导弹', '近防密集阵'],
      sens: {v: 10, t: 10, radar: 8, sig: 4}, ew: {jam: 0, eccm: 2, decoy: 0},
      morale: 8, training: 8, stealth: 2, pts: 180,
      desc: '防空导弹堡垒', cap: '固定,防空',
      carry: 0, aps: 2, era: 0, addArmor: 150
    });

    // 5. 前线指挥中心
    api.addUnit({
      id: 'base_command_center', name: '地下指挥中心', nation: 'N',
      cat: 'FORT', echelon: 'CO', men: 30, mob: 'static', mp: 0,
      armor: {f: 200, s: 200, t: 100},
      weapons: ['楼顶机枪阵地'],
      sens: {v: 8, t: 6, radar: 4, sig: 5}, ew: {jam: 0, eccm: 4, decoy: 1},
      morale: 10, training: 8, stealth: 0, pts: 300,
      desc: '极高血量的指挥枢纽，带有中继加成', cap: '固定,指挥,通信中继',
      carry: 0, aps: 1, era: 0, addArmor: 500
    });

    /* ==================== 3. 城市建筑设施 ==================== */

    // 6. 居民楼 (带有微弱的抵抗火力)
    api.addUnit({
      id: 'base_residential', name: '城市居民楼', nation: 'N',
      cat: 'FORT', echelon: 'TM', men: 20, mob: 'static', mp: 0,
      armor: {f: 40, s: 40, t: 20},
      weapons: ['楼顶机枪阵地'],
      sens: {v: 4, t: 3, radar: 0, sig: 0}, ew: {jam: 0, eccm: 0, decoy: 0},
      morale: 6, training: 4, stealth: 8, pts: 50,
      desc: '可掩护步兵的城市高层建筑', cap: '固定,城市,掩体',
      carry: 3, aps: 0, era: 0, addArmor: 100 // 载员容量 3，步兵可以进去
    });

    // 7. 商业大厦
    api.addUnit({
      id: 'base_commercial', name: '商业大厦', nation: 'N',
      cat: 'FORT', echelon: 'TM', men: 30, mob: 'static', mp: 0,
      armor: {f: 60, s: 60, t: 30},
      weapons: ['楼顶机枪阵地'],
      sens: {v: 5, t: 4, radar: 0, sig: 0}, ew: {jam: 0, eccm: 0, decoy: 0},
      morale: 6, training: 4, stealth: 9, pts: 60,
      desc: '坚固的城市掩体', cap: '固定,城市,掩体',
      carry: 3, aps: 0, era: 0, addArmor: 150
    });

    // 8. 工业厂房
    api.addUnit({
      id: 'base_factory', name: '重工业厂房', nation: 'N',
      cat: 'FORT', echelon: 'TM', men: 30, mob: 'static', mp: 0,
      armor: {f: 80, s: 80, t: 40},
      weapons: ['楼顶机枪阵地'],
      sens: {v: 4, t: 3, radar: 0, sig: 0}, ew: {jam: 0, eccm: 0, decoy: 0},
      morale: 6, training: 4, stealth: 6, pts: 80,
      desc: '坚硬的工业区掩体，可为载具提供维修', cap: '固定,城市,维修',
      carry: 2, aps: 0, era: 0, addArmor: 200
    });

    console.log('[base-advanced] 已注册雷达/机场/炮台/指挥中心/城市建筑');
  }
});