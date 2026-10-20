MTW.defineMod({
  id: 'advanced-warfare',
  name: '高级战争扩展',
  version: '1.0.0',
  setup(api) {
    /* ⚠ API addWeapon 有 bug：不更新 WPN_BY_NAME，用此 helper 修补 */
    function addW(name, type, r, pen, acc, rof, ammo, guid=0, top=0, sup=0, band=''){
      if (WPN_BY_NAME[name]) return WPN_BY_NAME[name];
      W(name, type, r, pen, acc, rof, ammo, guid, top, sup, band);
      const w = WEAPON_LIB[WEAPON_LIB.length - 1];
      WPN_BY_NAME[name] = w;
      return w;
    }

    /* ==================== 1. 武器 ==================== */

    /* ---- FPV 无人机 ---- */
    addW('FPV-神风穿越机', 'drone', 6, 150, 0.75, 1, 1, 0, 1, 0, 'UHF');
    addW('FPV-重载反装甲', 'drone', 8, 350, 0.72, 1, 1, 1, 1, 0, 'UHF');
    addW('FPV-反辐射型',   'drone', 8, 120, 0.72, 1, 1, 1, 0, 0, 'RADAR');
    addW('光纤FPV',        'drone', 6, 200, 0.85, 1, 1, 0, 1, 0, ''); // 光纤抗干扰
    addW('FPV-霰弹',       'drone', 4, 20,  0.65, 1, 1, 0, 0, 0, 'UHF');

    /* ---- UGV 无人车 ---- */
    addW('UGV遥控武器站', 'mg',         6, 25,  0.70, 3, 800);
    addW('UGV火箭巢',     'rpg',        5, 300, 0.66, 2, 12);
    addW('UGV机枪塔',     'mg',         7, 15,  0.68, 3, 600);
    addW('无人战车30mm',  'autocannon', 6, 50,  0.74, 4, 400);
    addW('无人爆破车',    'drone',      5, 800, 0.90, 1, 1, 0, 1, 0, 'UHF');

    /* ---- 手雷 / 掷弹筒 ---- */
    addW('M67手榴弹',     'gl', 1, 15, 0.60, 1, 10);
    addW('RGD-5手榴弹',   'gl', 1, 12, 0.60, 1, 10);
    addW('82-2手榴弹',    'gl', 1, 14, 0.62, 1, 10);
    addW('M32掷弹筒',     'gl', 4, 25, 0.62, 2, 30);
    addW('89式掷弹筒',    'gl', 4, 20, 0.58, 2, 24);
    addW('QLG-10A榴弹',   'gl', 5, 30, 0.62, 1, 24);
    addW('温压手雷',      'gl', 1, 20, 0.60, 1, 6, 0, 0, 1);

    /* ---- 远程弹道导弹 ---- */
    addW('东风-15B战术导弹', 'mlrs', 55, 1500, 0.72, 1, 2, 1, 1, 0, 'SATCOM');
    addW('东风-17高超音速', 'mlrs', 60, 1800, 0.78, 1, 2, 1, 1, 0, 'SATCOM');
    addW('东风-21D反舰弹',  'mlrs', 65, 1600, 0.76, 1, 2, 1, 1, 0, 'SATCOM');
    addW('东风-26中远程',   'mlrs', 70, 2000, 0.74, 1, 2, 1, 1, 0, 'SATCOM');
    addW('伊斯坎德尔-M',    'mlrs', 45, 1400, 0.74, 1, 2, 1, 1, 0, 'SATCOM');
    addW('匕首高超音速',    'mlrs', 55, 1700, 0.78, 1, 1, 1, 1, 0, 'SATCOM');
    addW('ATACMS战术导弹',  'mlrs', 38, 1200, 0.74, 1, 4, 1, 1, 0, 'SATCOM');
    addW('PrSM精确打击',    'mlrs', 50, 1400, 0.76, 1, 4, 1, 1, 0, 'SATCOM');

    /* ---- EMP 电磁脉冲（射程 <15 走直接射击） ---- */
    addW('EMP手榴弹',      'ew', 1, 0, 0.85, 1, 4);
    addW('高功率微波武器', 'ew', 8, 0, 0.85, 3, 99);
    addW('电磁脉冲发生器', 'ew', 6, 0, 0.82, 2, 50);
    addW('反无人机EMP枪',  'ew', 5, 0, 0.80, 2, 20);

    /* ---- 战机空空 / 空地导弹 ---- */
    addW('AIM-120D AMRAAM', 'sam', 34, 0, 0.82, 2, 6, 1, 0, 0, 'RADAR');
    addW('AIM-9X Block II', 'sam', 12, 0, 0.85, 2, 4, 1, 0, 0, 'IR');
    addW('AIM-260 JATM',    'sam', 40, 0, 0.84, 2, 6, 1, 0, 0, 'RADAR');
    addW('PL-15远程空空',   'sam', 38, 0, 0.82, 2, 6, 1, 0, 0, 'RADAR');
    addW('PL-10格斗弹',     'sam', 10, 0, 0.86, 2, 4, 1, 0, 0, 'IR');
    addW('PL-17超远程',     'sam', 55, 0, 0.80, 1, 4, 1, 0, 0, 'RADAR');
    addW('R-77-1空空弹',    'sam', 28, 0, 0.78, 2, 6, 1, 0, 0, 'RADAR');
    addW('R-74M格斗弹',     'sam', 10, 0, 0.84, 2, 4, 1, 0, 0, 'IR');
    addW('R-37M超远程',     'sam', 50, 0, 0.78, 2, 6, 1, 0, 0, 'RADAR');
    addW('PL-21反辐射空空', 'sam', 45, 0, 0.80, 1, 4, 1, 0, 0, 'RADAR');

    addW('空地导弹AKD-10',  'atgm', 12, 800, 0.82, 2, 8, 1, 1, 0, 'IR');
    addW('KD-88空地导弹',   'drone', 16, 500, 0.84, 1, 4, 1, 0, 0, 'SATCOM');
    addW('AGM-158C LRASM',  'drone', 30, 700, 0.86, 1, 2, 1, 0, 0, 'SATCOM');
    addW('KD-20巡航导弹',   'drone', 35, 600, 0.82, 1, 4, 1, 0, 0, 'SATCOM');
    addW('X-59MK2空地',     'drone', 18, 600, 0.84, 1, 4, 1, 0, 0, 'SATCOM');

    /* ---- 机炮 ---- */
    addW('M61A2 20mm机炮',  'autocannon', 5, 80,  0.78, 2, 511);
    addW('GSh-23 23mm机炮', 'autocannon', 5, 70,  0.76, 2, 400);
    addW('GAU-22 25mm机炮', 'autocannon', 5, 90,  0.80, 2, 180);
    addW('Type-30-1 30mm机炮', 'autocannon', 5, 100, 0.78, 2, 250);
    addW('PG-87 30mm机炮',  'autocannon', 5, 85,  0.76, 3, 300);

    /* ==================== 2. 单位 ==================== */

    /* ---- FPV 小组（men=2 保证血量为 2，不至于一碰就死） ---- */
    api.addUnit({
      id:'us_fpv_swarm', name:'FPV蜂群攻击组', nation:'US',
      cat:'UAV', echelon:'TM', men:2, mob:'air', mp:12,
      armor:{f:0,s:0,t:0},
      weapons:['FPV-神风穿越机','FPV-神风穿越机','FPV-神风穿越机'],
      sens:{v:8,t:7,radar:0,sig:2}, ew:{jam:0,eccm:0,decoy:0},
      morale:7, training:8, stealth:8, pts:42,
      desc:'操作手+3架FPV', cap:'巡飞弹,反装甲,蜂群'
    });
    api.addUnit({
      id:'us_fpv_antiarmor', name:'FPV反装甲小组', nation:'US',
      cat:'UAV', echelon:'TM', men:2, mob:'air', mp:11,
      armor:{f:0,s:0,t:0},
      weapons:['FPV-重载反装甲','FPV-重载反装甲'],
      sens:{v:7,t:6,radar:0,sig:2}, ew:{jam:0,eccm:0,decoy:0},
      morale:7, training:8, stealth:7, pts:46,
      desc:'大载重FPV反装甲', cap:'巡飞弹,反装甲,攻顶'
    });
    api.addUnit({
      id:'cn_fpv_swarm', name:'FPV蜂群作战组', nation:'CN',
      cat:'UAV', echelon:'TM', men:2, mob:'air', mp:12,
      armor:{f:0,s:0,t:0},
      weapons:['FPV-神风穿越机','光纤FPV','FPV-神风穿越机'],
      sens:{v:8,t:7,radar:0,sig:2}, ew:{jam:0,eccm:0,decoy:0},
      morale:8, training:8, stealth:8, pts:44,
      desc:'混合光纤/无线电FPV', cap:'巡飞弹,反装甲,抗干扰'
    });
    api.addUnit({
      id:'ru_fpv_swarm', name:'FPV打击组', nation:'RU',
      cat:'UAV', echelon:'TM', men:2, mob:'air', mp:12,
      armor:{f:0,s:0,t:0},
      weapons:['FPV-神风穿越机','FPV-神风穿越机'],
      sens:{v:7,t:6,radar:0,sig:2}, ew:{jam:0,eccm:0,decoy:0},
      morale:7, training:7, stealth:7, pts:30,
      desc:'实用型FPV小队', cap:'巡飞弹,反装甲'
    });
    api.addUnit({
      id:'us_fpv_antiradar', name:'FPV反辐射组', nation:'US',
      cat:'UAV', echelon:'TM', men:2, mob:'air', mp:13,
      armor:{f:0,s:0,t:0},
      weapons:['FPV-反辐射型','FPV-反辐射型'],
      sens:{v:8,t:7,radar:0,sig:3}, ew:{jam:0,eccm:0,decoy:0},
      morale:7, training:9, stealth:8, pts:48,
      desc:'反辐射FPV', cap:'巡飞弹,反辐射'
    });

    /* ---- UGV 无人车 ---- */
    api.addUnit({
      id:'us_ugv_mg', name:'M5 Ripsaw 无人战车', nation:'US',
      cat:'IFV', echelon:'TM', men:2, mob:'track', mp:6,
      armor:{f:60,s:40,t:20},
      weapons:['UGV遥控武器站','Mk19榴弹发射器'],
      sens:{v:6,t:7,radar:0,sig:3}, ew:{jam:0,eccm:2,decoy:0},
      morale:10, training:8, stealth:4, pts:60,
      desc:'遥控武装无人战车', cap:'无人,反装甲'
    });
    api.addUnit({
      id:'us_ugv_antiarmor', name:'无人反装甲战车', nation:'US',
      cat:'IFV', echelon:'TM', men:2, mob:'track', mp:5,
      armor:{f:80,s:50,t:25},
      weapons:['标枪导弹','UGV火箭巢'],
      sens:{v:7,t:8,radar:0,sig:3}, ew:{jam:0,eccm:2,decoy:1},
      morale:10, training:8, stealth:4, pts:72,
      desc:'遥控反装甲UGV', cap:'无人,反装甲,攻顶'
    });
    api.addUnit({
      id:'us_ugv_suicide', name:'无人自爆车', nation:'US',
      cat:'UAV', echelon:'TM', men:1, mob:'track', mp:7,
      armor:{f:20,s:15,t:8},
      weapons:['无人爆破车'],
      sens:{v:5,t:4,radar:0,sig:1}, ew:{jam:0,eccm:0,decoy:0},
      morale:10, training:7, stealth:5, pts:32,
      desc:'携带炸药的遥控自爆车', cap:'无人,爆破'
    });
    api.addUnit({
      id:'cn_ugv_mg', name:'锐爪无人战车', nation:'CN',
      cat:'IFV', echelon:'TM', men:2, mob:'track', mp:6,
      armor:{f:50,s:35,t:18},
      weapons:['无人战车30mm','UGV机枪塔'],
      sens:{v:6,t:7,radar:0,sig:3}, ew:{jam:0,eccm:2,decoy:0},
      morale:10, training:8, stealth:4, pts:64,
      desc:'锐爪无人战车', cap:'无人,侦察'
    });
    api.addUnit({
      id:'cn_ugv_antiarmor', name:'红箭无人战车', nation:'CN',
      cat:'IFV', echelon:'TM', men:2, mob:'track', mp:5,
      armor:{f:60,s:40,t:20},
      weapons:['红箭-12反坦克导弹','UGV火箭巢'],
      sens:{v:7,t:7,radar:0,sig:3}, ew:{jam:0,eccm:2,decoy:1},
      morale:10, training:8, stealth:4, pts:68,
      desc:'反装甲无人战车', cap:'无人,反装甲,攻顶'
    });
    api.addUnit({
      id:'ru_ugv_uran', name:'天王星-9 无人战车', nation:'RU',
      cat:'IFV', echelon:'TM', men:2, mob:'track', mp:5,
      armor:{f:60,s:40,t:20},
      weapons:['2A72 30mm机关炮','短号反坦克导弹'],
      sens:{v:6,t:7,radar:0,sig:3}, ew:{jam:0,eccm:2,decoy:0},
      morale:10, training:7, stealth:4, pts:66,
      desc:'天王星-9无人战车', cap:'无人,反装甲,侦察'
    });

    /* ---- 手雷 / 掷弹筒步兵 ---- */
    api.addUnit({
      id:'us_grenadier', name:'掷弹兵班', nation:'US',
      cat:'INF', echelon:'SQD', men:9, mob:'leg', mp:3,
      armor:{f:0,s:0,t:0},
      weapons:['M4A1卡宾枪','M320榴弹发射器','M67手榴弹'],
      sens:{v:5,t:4,radar:0,sig:0}, ew:{jam:0,eccm:0,decoy:0},
      morale:7, training:8, stealth:6, pts:18,
      desc:'加强榴弹/手雷配置', cap:'夜视'
    });
    api.addUnit({
      id:'us_mortar_team', name:'掷弹筒小组', nation:'US',
      cat:'INF', echelon:'TM', men:3, mob:'leg', mp:3,
      armor:{f:0,s:0,t:0},
      weapons:['M32掷弹筒','M4A1卡宾枪'],
      sens:{v:5,t:4,radar:0,sig:0}, ew:{jam:0,eccm:0,decoy:0},
      morale:7, training:8, stealth:6, pts:12,
      desc:'多管掷弹筒班', cap:''
    });
    api.addUnit({
      id:'cn_grenadier', name:'掷弹兵班', nation:'CN',
      cat:'INF', echelon:'SQD', men:9, mob:'leg', mp:3,
      armor:{f:0,s:0,t:0},
      weapons:['191式步枪','QLG-10A榴弹','82-2手榴弹'],
      sens:{v:6,t:5,radar:0,sig:0}, ew:{jam:0,eccm:0,decoy:0},
      morale:8, training:8, stealth:6, pts:20,
      desc:'加强榴弹/手雷配置', cap:'数字化'
    });
    api.addUnit({
      id:'cn_mortar_team', name:'掷弹筒小组', nation:'CN',
      cat:'INF', echelon:'TM', men:3, mob:'leg', mp:3,
      armor:{f:0,s:0,t:0},
      weapons:['89式掷弹筒','95-1式步枪'],
      sens:{v:5,t:4,radar:0,sig:0}, ew:{jam:0,eccm:0,decoy:0},
      morale:8, training:7, stealth:6, pts:11,
      desc:'89式掷弹筒组', cap:''
    });
    api.addUnit({
      id:'ru_grenadier', name:'掷弹兵班', nation:'RU',
      cat:'INF', echelon:'SQD', men:9, mob:'leg', mp:3,
      armor:{f:0,s:0,t:0},
      weapons:['AK-12步枪','GP-25榴弹发射器','RGD-5手榴弹'],
      sens:{v:5,t:4,radar:0,sig:0}, ew:{jam:0,eccm:0,decoy:0},
      morale:7, training:7, stealth:6, pts:16,
      desc:'加强榴弹配置', cap:''
    });

    /* ---- 远程弹道导弹 ---- */
    api.addUnit({
      id:'cn_df15b', name:'东风-15B 战术导弹', nation:'CN',
      cat:'ARTY', echelon:'TM', men:8, mob:'wheel', mp:5,
      armor:{f:20,s:10,t:5},
      weapons:['东风-15B战术导弹'],
      sens:{v:6,t:5,radar:0,sig:5}, ew:{jam:0,eccm:1,decoy:0},
      morale:8, training:9, stealth:2, pts:180,
      desc:'短程弹道导弹', cap:'弹道导弹,远程'
    });
    api.addUnit({
      id:'cn_df17', name:'东风-17 高超音速导弹', nation:'CN',
      cat:'ARTY', echelon:'TM', men:10, mob:'wheel', mp:5,
      armor:{f:25,s:15,t:8},
      weapons:['东风-17高超音速'],
      sens:{v:7,t:5,radar:0,sig:6}, ew:{jam:0,eccm:2,decoy:0},
      morale:8, training:9, stealth:2, pts:260,
      desc:'高超音速滑翔弹', cap:'弹道导弹,高超音速,不可拦截'
    });
    api.addUnit({
      id:'cn_df26', name:'东风-26 中远程导弹', nation:'CN',
      cat:'ARTY', echelon:'TM', men:14, mob:'wheel', mp:4,
      armor:{f:25,s:15,t:8},
      weapons:['东风-26中远程'],
      sens:{v:7,t:5,radar:4,sig:8}, ew:{jam:0,eccm:2,decoy:0},
      morale:8, training:9, stealth:2, pts:320,
      desc:'中远程弹道导弹', cap:'弹道导弹,远程,核常兼备'
    });
    api.addUnit({
      id:'ru_iskander', name:'伊斯坎德尔-M', nation:'RU',
      cat:'ARTY', echelon:'TM', men:8, mob:'wheel', mp:5,
      armor:{f:20,s:10,t:5},
      weapons:['伊斯坎德尔-M'],
      sens:{v:6,t:5,radar:0,sig:5}, ew:{jam:0,eccm:1,decoy:0},
      morale:8, training:9, stealth:2, pts:170,
      desc:'短程弹道导弹', cap:'弹道导弹,远程'
    });
    api.addUnit({
      id:'ru_kinzhal', name:'匕首高超音速导弹', nation:'RU',
      cat:'ARTY', echelon:'TM', men:10, mob:'wheel', mp:5,
      armor:{f:25,s:15,t:8},
      weapons:['匕首高超音速'],
      sens:{v:7,t:5,radar:0,sig:6}, ew:{jam:0,eccm:2,decoy:0},
      morale:8, training:9, stealth:2, pts:240,
      desc:'空射高超音速', cap:'弹道导弹,高超音速'
    });
    api.addUnit({
      id:'us_atacms', name:'ATACMS 战术导弹车', nation:'US',
      cat:'ARTY', echelon:'TM', men:4, mob:'wheel', mp:7,
      armor:{f:20,s:10,t:5},
      weapons:['ATACMS战术导弹'],
      sens:{v:7,t:6,radar:0,sig:4}, ew:{jam:0,eccm:1,decoy:0},
      morale:8, training:9, stealth:3, pts:150,
      desc:'M270/HIMARS用弹', cap:'弹道导弹,远程'
    });
    api.addUnit({
      id:'us_prsm', name:'PrSM 精确打击导弹', nation:'US',
      cat:'ARTY', echelon:'TM', men:4, mob:'wheel', mp:7,
      armor:{f:20,s:10,t:5},
      weapons:['PrSM精确打击'],
      sens:{v:8,t:7,radar:0,sig:4}, ew:{jam:0,eccm:2,decoy:0},
      morale:8, training:10, stealth:3, pts:190,
      desc:'下一代精确打击', cap:'弹道导弹,精确制导'
    });

    /* ---- EMP 单位 ---- */
    api.addUnit({
      id:'us_emp_team', name:'EMP特种小队', nation:'US',
      cat:'SF', echelon:'TM', men:4, mob:'leg', mp:4,
      armor:{f:0,s:0,t:0},
      weapons:['EMP手榴弹','M4A1 SOPMOD','EMP手榴弹'],
      sens:{v:6,t:6,radar:0,sig:2}, ew:{jam:3,eccm:2,decoy:1},
      morale:9, training:10, stealth:8, pts:68,
      desc:'携带EMP装备的特种小队', cap:'特种,EMP,渗透'
    });
    api.addUnit({
      id:'us_emp_vehicle', name:'高功率微波车', nation:'US',
      cat:'EW', echelon:'TM', men:4, mob:'wheel', mp:5,
      armor:{f:20,s:10,t:5},
      weapons:['高功率微波武器'],
      sens:{v:6,t:4,radar:2,sig:6}, ew:{jam:8,eccm:4,decoy:0},
      morale:7, training:8, stealth:3, pts:120,
      desc:'车载EMP系统', cap:'EMP,电子战,反无人机'
    });
    api.addUnit({
      id:'cn_emp_team', name:'EMP特种小队', nation:'CN',
      cat:'SF', echelon:'TM', men:4, mob:'leg', mp:4,
      armor:{f:0,s:0,t:0},
      weapons:['EMP手榴弹','191式步枪','EMP手榴弹'],
      sens:{v:6,t:6,radar:0,sig:2}, ew:{jam:3,eccm:2,decoy:1},
      morale:9, training:10, stealth:8, pts:66,
      desc:'携带EMP装备的特种小队', cap:'特种,EMP,渗透'
    });
    api.addUnit({
      id:'cn_emp_vehicle', name:'电磁脉冲作战车', nation:'CN',
      cat:'EW', echelon:'TM', men:4, mob:'wheel', mp:5,
      armor:{f:20,s:10,t:5},
      weapons:['电磁脉冲发生器'],
      sens:{v:6,t:4,radar:2,sig:5}, ew:{jam:7,eccm:4,decoy:0},
      morale:7, training:8, stealth:3, pts:110,
      desc:'车载EMP系统', cap:'EMP,电子战'
    });
    api.addUnit({
      id:'ru_emp_team', name:'EMP特种小组', nation:'RU',
      cat:'SF', echelon:'TM', men:4, mob:'leg', mp:4,
      armor:{f:0,s:0,t:0},
      weapons:['EMP手榴弹','AK-15步枪'],
      sens:{v:6,t:6,radar:0,sig:2}, ew:{jam:3,eccm:2,decoy:0},
      morale:9, training:9, stealth:8, pts:58,
      desc:'EMP特种小队', cap:'特种,EMP,渗透'
    });

    /* ---- 战机升级配置 ---- */
    api.addUnit({
      id:'us_f22_v2', name:'F-22A 猛禽(升级)', nation:'US',
      cat:'AIR', echelon:'TM', men:1, mob:'air', mp:26,
      armor:{f:0,s:0,t:0},
      weapons:['AIM-260 JATM','AIM-120D AMRAAM','AIM-9X Block II','M61A2 20mm机炮'],
      sens:{v:10,t:9,radar:6,sig:5}, ew:{jam:2,eccm:3,decoy:1},
      morale:8, training:10, stealth:1, pts:220,
      desc:'空优五代机(增强弹药)', cap:'隐身,制空'
    });
    api.addUnit({
      id:'us_f35a_v2', name:'F-35A 闪电II(多任务)', nation:'US',
      cat:'AIR', echelon:'TM', men:1, mob:'air', mp:24,
      armor:{f:0,s:0,t:0},
      weapons:['AIM-120D AMRAAM','AGM-158C LRASM','GBU-31 JDAM','GAU-22 25mm机炮'],
      sens:{v:10,t:9,radar:6,sig:4}, ew:{jam:3,eccm:4,decoy:2},
      morale:8, training:10, stealth:1, pts:230,
      desc:'多任务五代机', cap:'隐身,对地打击,反舰'
    });
    api.addUnit({
      id:'cn_j20_v2', name:'歼-20 威龙(升级)', nation:'CN',
      cat:'AIR', echelon:'TM', men:1, mob:'air', mp:26,
      armor:{f:0,s:0,t:0},
      weapons:['PL-17超远程','PL-15远程空空','PL-10格斗弹','Type-30-1 30mm机炮'],
      sens:{v:10,t:9,radar:6,sig:4}, ew:{jam:3,eccm:4,decoy:2},
      morale:8, training:9, stealth:1, pts:210,
      desc:'空优五代机', cap:'隐身,制空'
    });
    api.addUnit({
      id:'cn_j16_v2', name:'歼-16D 电子战型', nation:'CN',
      cat:'AIR', echelon:'TM', men:1, mob:'air', mp:22,
      armor:{f:0,s:0,t:0},
      weapons:['PL-21反辐射空空','KD-88空地导弹','空地导弹','PG-87 30mm机炮'],
      sens:{v:9,t:8,radar:5,sig:4}, ew:{jam:6,eccm:5,decoy:2},
      morale:8, training:9, stealth:2, pts:200,
      desc:'电子战多任务机', cap:'电子战,反辐射,对地打击'
    });
    api.addUnit({
      id:'cn_j35_v2', name:'歼-35 舰载五代机', nation:'CN',
      cat:'AIR', echelon:'TM', men:1, mob:'air', mp:24,
      armor:{f:0,s:0,t:0},
      weapons:['PL-15远程空空','PL-10格斗弹','空地导弹','PG-87 30mm机炮'],
      sens:{v:10,t:9,radar:6,sig:4}, ew:{jam:2,eccm:3,decoy:1},
      morale:8, training:9, stealth:1, pts:195,
      desc:'舰载五代机', cap:'隐身,对地打击'
    });
    api.addUnit({
      id:'ru_su57_v2', name:'苏-57 重罪犯(升级)', nation:'RU',
      cat:'AIR', echelon:'TM', men:1, mob:'air', mp:24,
      armor:{f:0,s:0,t:0},
      weapons:['R-37M超远程','R-77-1空空弹','R-74M格斗弹','GSh-23 23mm机炮'],
      sens:{v:9,t:9,radar:5,sig:4}, ew:{jam:3,eccm:3,decoy:1},
      morale:8, training:9, stealth:1, pts:190,
      desc:'五代多任务战机', cap:'隐身,多任务'
    });
    api.addUnit({
      id:'ru_su34_v2', name:'苏-34 战斗轰炸机(强化)', nation:'RU',
      cat:'AIR', echelon:'TM', men:2, mob:'air', mp:22,
      armor:{f:0,s:0,t:0},
      weapons:['X-59MK2空地','R-77-1空空弹','S-8火箭','GSh-30-2 30mm机炮'],
      sens:{v:8,t:8,radar:4,sig:3}, ew:{jam:3,eccm:3,decoy:1},
      morale:8, training:9, stealth:2, pts:175,
      desc:'战斗轰炸机', cap:'对地打击'
    });
    api.addUnit({
      id:'us_a10c_v2', name:'A-10C 雷电II(升级)', nation:'US',
      cat:'AIR', echelon:'TM', men:1, mob:'air', mp:20,
      armor:{f:0,s:0,t:0},
      weapons:['GAU-8 30mm机炮','AGM-65小牛','AIM-9X Block II','GBU-12激光炸弹'],
      sens:{v:7,t:8,radar:0,sig:2}, ew:{jam:1,eccm:3,decoy:2},
      morale:9, training:9, stealth:2, pts:150,
      desc:'近距空中支援', cap:'对地打击'
    });

    /* ==================== 3. EMP 效果（钩子） ==================== */

    const EMP_NAMES = new Set([
      'EMP手榴弹','高功率微波武器','电磁脉冲发生器','反无人机EMP枪'
    ]);

    api.on('afterShot', (ev) => {
      const {shooter, target, weapon, result} = ev;
      if (!EMP_NAMES.has(weapon.n)) return;
      if (!result || !result.ok) return;
      if (!target || target.dead) return;

      // 命中时给附近电子设备造成瘫痪
      if (result.effectiveHits > 0) {
        const radius = weapon.n === '高功率微波武器' ? 2 : 1;
        const hits = G.units.filter(u =>
          !u.dead && !u.carriedBy &&
          hexDist(u, target) <= radius &&
          (u.def.sens.radar > 0 || u.def.cat === 'EW' ||
           u.def.cat === 'UAV' || u.def.cat === 'AIR' ||
           u.def.cat === 'HELI' || u.def.cat === 'AD')
        );
        hits.forEach(t => {
          t.pulseStunned = Math.max(t.pulseStunned || 0, 2);
          t.sensorDown = Math.max(t.sensorDown || 0, 3);
          t.jamming = Math.max(t.jamming || 0, 15);
          addEffect('text', t.c, t.r, {dur:50, text:'⚡EMP', color:'#a0e0ff'});
          addEffect('muzzle', t.c, t.r, {dur:30, color:'#a0e0ff'});
        });
        log(`⚡ ${weapon.n} 脉冲波及 ${hits.length} 个单位电子设备`, 'lg-ew');
      }
    });

    /* ==================== 4. 弹道导弹冲击波 ==================== */

    const BAL_NAMES = new Set([
      '东风-15B战术导弹','东风-17高超音速','东风-21D反舰弹',
      '东风-26中远程','伊斯坎德尔-M','匕首高超音速',
      'ATACMS战术导弹','PrSM精确打击'
    ]);

    api.on('afterShot', (ev) => {
      const {shooter, target, weapon, result} = ev;
      if (!BAL_NAMES.has(weapon.n)) return;
      if (!result || !result.ok) return;

      const blast = weapon.n.includes('东风-26') || weapon.n.includes('DF-41') ? 3 : 2;
      addEffect('explosion', target.c, target.r, {dur:60, size:2.5, color:'#ff3040'});

      for (let d = 1; d <= blast; d++) {
        G.units.filter(u => !u.dead && !u.carriedBy && u.side !== shooter.side && hexDist(u, target) === d)
          .forEach(u => {
            const dmg = rnd(1, 3) * (1 - d / (blast + 1));
            u.hp -= dmg;
            u.sup = clamp(u.sup + 5, 0, 20);
            addEffect('explosion', u.c, u.r, {dur:30, size:1, color:'#ff6020'});
            if (u.hp <= 0) { u.dead = true; spawnWreck(u); }
          });
      }
      log(`🚀 ${weapon.n} 冲击波覆盖 ${blast} 格`, 'lg-ranged');
    });

    /* ==================== 5. 新单位自动进入初始部署 ==================== */

    api.override('generateDeploy', (orig) => {
      return function(nat) {
        const base = orig(nat);
        const extra = {
          US: ['us_fpv_swarm','us_ugv_mg','us_atacms','us_emp_team'],
          CN: ['cn_fpv_swarm','cn_ugv_mg','cn_df15b','cn_emp_team'],
          RU: ['ru_fpv_swarm','ru_ugv_uran','ru_iskander','ru_emp_team']
        }[nat] || [];
        const set = new Set(base);
        extra.forEach(id => { if (DEF_BY_ID[id]) set.add(id); });
        return [...set];
      };
    });

    console.log('[advanced-warfare] 已注册 ' +
      'FPV×5 / UGV×7 / 手雷掷弹筒×5 / 弹道导弹×7 / EMP×5 / 战机×8');
  }
});