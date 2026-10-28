/* ============================================================
 * mods/attachments/mod.js — 技战术装备附件系统
 * 205 个附件 · 12 大类 · 按槽位装备 · 实时生效
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[attachments] MTW 未就绪'); return; }

  /* 附件类别 → 占用槽位 */
  const SLOT_OF_CAT = {
    optics:'optics', weapon:'weapon', ammo:'weapon', armor:'armor',
    mobility:'engine', ew:'ew', sensor:'sensor', comms:'sensor',
    camo:'utility', utility:'utility', special:'special'
  };

  /* 每类单位的槽位配置 */
  const SLOTS_BY_CAT = {
    INF:  { optics:1, weapon:1, armor:1, utility:2, special:1 },
    SF:   { optics:1, weapon:1, armor:1, utility:2, special:1 },
    RECON:{ optics:2, weapon:1, utility:1, special:1 },
    ARM:  { optics:1, weapon:1, armor:2, engine:1, utility:1, special:1 },
    IFV:  { optics:1, weapon:1, armor:1, engine:1, utility:1 },
    APC:  { optics:1, weapon:1, armor:1, engine:1, utility:1 },
    ARTY: { optics:1, weapon:1, engine:1, utility:1 },
    AD:   { optics:1, sensor:1, weapon:1, utility:1 },
    EW:   { sensor:2, ew:1, utility:1 },
    AIR:  { optics:1, weapon:1, sensor:1, utility:2, special:1 },
    HELI: { optics:1, weapon:1, sensor:1, utility:1 },
    UAV:  { optics:1, sensor:1, utility:1, special:1 },
    FORT: { optics:1, sensor:1, weapon:1 },
  };

  MTW.defineMod({
    id: 'attachments',
    name: '技战术装备附件系统',
    version: '1.0.0',
    setup(api) {

      /* ============================================================
       * 1) 附件数据（205 条）
       * ============================================================ */
      const ATT_LIST = [];
      let _n = 0;
      function A(name, cat, pts, effect) {
        _n++;
        ATT_LIST.push({
          id: 'att_' + String(_n).padStart(3, '0'),
          name, cat,
          slot: SLOT_OF_CAT[cat] || 'utility',
          pts: pts || 3,
          effect: effect || {},
          icon: { optics:'🔭', weapon:'🔫', ammo:'📦', armor:'🛡️', mobility:'⚙️',
                  ew:'📡', sensor:'📶', comms:'📻', camo:'🥷', utility:'🧰', special:'⭐' }[cat] || '🔧'
        });
      }

      /* ---------- 光学 optics（26） ---------- */
      A('4倍战术瞄准镜','optics',3,{hit:.05});
      A('8倍狙击瞄准镜','optics',6,{hit:.08,range:1});
      A('12倍高倍狙击镜','optics',9,{hit:.12,range:2});
      A('16倍远程狙击镜','optics',12,{hit:.15,range:2});
      A('24倍超远狙击镜','optics',15,{hit:.18,range:3});
      A('红点瞄准镜','optics',2,{hit:.03});
      A('全息瞄准镜','optics',3,{hit:.04});
      A('1-6倍可变倍镜','optics',4,{hit:.06});
      A('夜视仪（一代）','optics',4,{sens_v:1});
      A('夜视仪（三代）','optics',8,{sens_v:2});
      A('热成像瞄准镜','optics',7,{sens_v:2,hit:.03});
      A('激光测距仪','optics',5,{hit:.04,range:1});
      A('弹道计算瞄准镜','optics',8,{hit:.07});
      A('全景周视镜','optics',6,{sens_v:3});
      A('火控雷达瞄准镜','optics',12,{hit:.10,range:1});
      A('光电瞄准系统','optics',10,{hit:.06,sens_v:2});
      A('数字战术瞄具','optics',8,{hit:.08});
      A('陀螺稳定瞄准镜','optics',7,{hit:.05});
      A('反装甲专用瞄准镜','optics',9,{hit:.10,pen:50});
      A('对空瞄准镜','optics',9,{hit:.10});
      A('无人机侦察瞄准器','optics',11,{sens_v:4});
      A('卫星定位瞄准','optics',8,{hit:.06});
      A('毫米波雷达瞄准','optics',10,{sens_v:3,hit:.03});
      A('多光谱瞄准系统','optics',13,{sens_v:3,hit:.05});
      A('单兵夜视眼镜','optics',5,{sens_v:1,stealth:1});
      A('狙击手弹道计算机','optics',10,{hit:.10,range:1});

      /* ---------- 枪械/火炮 weapon（25） ---------- */
      A('精密枪管','weapon',5,{hit:.03,pen:20});
      A('冷锻枪管','weapon',6,{hit:.02,pen:30});
      A('镀铬枪管','weapon',3,{hit:.01,pen:15});
      A('重型枪管','weapon',7,{pen:50,rof:-1});
      A('短枪管','weapon',3,{mp:1,hit:-.02,pen:-20});
      A('枪口制退器','weapon',2,{hit:.02});
      A('消音器','weapon',4,{stealth:2,hit:.01});
      A('消焰器','weapon',2,{stealth:1});
      A('刺刀','weapon',2,{hit:.10});
      A('下挂榴弹发射器','weapon',5,{ammo:.20});
      A('前握把','weapon',1,{hit:.02});
      A('两脚架','weapon',2,{hit:.05});
      A('三脚架','weapon',4,{hit:.08,rof:1});
      A('通用枪架','weapon',3,{hit:.03,mp:1});
      A('炮口校炮镜','weapon',5,{hit:.06});
      A('反坦克炮管增程','weapon',8,{range:1,pen:30});
      A('滑膛炮管改进','weapon',9,{pen:80});
      A('线膛炮管','weapon',7,{hit:.03,range:1});
      A('复合炮管','weapon',11,{pen:60,hit:.01});
      A('电热化学炮改装','weapon',15,{pen:150});
      A('电磁炮改装','weapon',20,{pen:300,range:2});
      A('激光炮管','weapon',14,{pen:100,hit:.02});
      A('自动装弹机','weapon',10,{rof:1});
      A('半自动装弹机','weapon',7,{rof:1,ammo:.1});
      A('链式供弹','weapon',9,{ammo:.3,rof:1});

      /* ---------- 弹药 ammo（25） ---------- */
      A('标准弹夹','ammo',2,{ammo:.20});
      A('扩容弹夹','ammo',4,{ammo:.50});
      A('双联弹夹','ammo',7,{ammo:1.0});
      A('快速弹夹','ammo',4,{rof:1});
      A('战术快拔套','ammo',3,{hit:.10});
      A('高爆弹','ammo',5,{pen:20});
      A('穿甲弹','ammo',6,{pen:50});
      A('穿甲燃烧弹','ammo',7,{pen:30,hit:.05});
      A('曳光弹','ammo',3,{hit:.03,sens_v:1});
      A('破甲弹','ammo',8,{pen:80});
      A('碎甲弹','ammo',7,{pen:60,hit:.02});
      A('温压弹','ammo',9,{pen:40});
      A('制导弹药','ammo',10,{hit:.10});
      A('末敏弹','ammo',8,{hit:.05,pen:50});
      A('火箭增程弹','ammo',6,{range:1});
      A('底部排气弹','ammo',6,{range:1});
      A('子母弹','ammo',7,{ammo:.20});
      A('燃烧弹','ammo',4,{pen:10});
      A('烟幕弹','ammo',3,{ammo:.10,stealth:1});
      A('照明弹','ammo',3,{sens_v:2});
      A('信号弹','ammo',2,{sens_v:1});
      A('高精度狙击弹','ammo',6,{hit:.06});
      A('亚音速弹','ammo',5,{stealth:2});
      A('超音速弹','ammo',5,{hit:.02,range:1});
      A('反辐射导弹','ammo',12,{pen:100,hit:.05});

      /* ---------- 装甲 armor（25） ---------- */
      A('复合附加装甲','armor',8,{armor_f:50,armor_s:30});
      A('反应装甲块','armor',6,{armor_f:30,armor_s:20,era:1});
      A('重型反应装甲','armor',10,{armor_f:50,armor_s:40,era:2});
      A('格栅装甲','armor',5,{armor_s:30});
      A('主动防护（软）','armor',12,{aps:1});
      A('主动防护（硬）','armor',18,{aps:2});
      A('顶部装甲强化','armor',7,{armor_t:80});
      A('防雷装甲','armor',8,{armor_f:30,armor_t:20});
      A('侧裙板','armor',5,{armor_s:40});
      A('车体附加装甲','armor',9,{armor_f:80});
      A('炮塔附加装甲','armor',8,{armor_f:40,armor_s:40});
      A('间隔装甲','armor',8,{armor_f:60,armor_s:30});
      A('陶瓷复合装甲','armor',11,{armor_f:70,armor_s:50});
      A('贫铀装甲','armor',15,{armor_f:120,armor_s:60});
      A('爆炸反应装甲','armor',6,{era:1});
      A('电磁装甲','armor',12,{aps:1,armor_s:20});
      A('纳米装甲','armor',14,{armor_f:30,armor_s:30,armor_t:30});
      A('隐身涂层','armor',9,{stealth:3});
      A('雷达吸波材料','armor',10,{stealth:4});
      A('红外抑制套件','armor',6,{stealth:2});
      A('车体密封套件','armor',3,{armor_t:20});
      A('防弹玻璃','armor',3,{armor_f:10,armor_s:10,armor_t:10});
      A('烟幕发射器','armor',4,{stealth:1});
      A('激光告警接收器','armor',7,{aps:1,eccm:1});
      A('主动干扰弹发射器','armor',9,{decoy:1,aps:1});

      /* ---------- 机动 mobility（22） ---------- */
      A('涡轮增压柴油机','mobility',7,{mp:1});
      A('燃气轮机','mobility',10,{mp:2,hp:-5});
      A('混合动力','mobility',9,{mp:1,stealth:1});
      A('电动机改装','mobility',11,{mp:1,stealth:2});
      A('履带改进','mobility',4,{mp:1});
      A('宽履带','mobility',5,{mp:1,armor_s:10});
      A('橡胶履带','mobility',5,{mp:1,stealth:1});
      A('雪地履带','mobility',4,{mp:1});
      A('沙漠轮胎','mobility',4,{mp:1});
      A('防滑链','mobility',2,{mp:1});
      A('悬浮悬挂','mobility',8,{mp:1});
      A('主动悬挂','mobility',6,{hit:.03});
      A('全轮驱动','mobility',6,{mp:2});
      A('两栖套件','mobility',8,{mp:1});
      A('潜渡装置','mobility',9,{mp:1,armor_f:5});
      A('紧急燃油喷射','mobility',4,{mp:3});
      A('快速起步系统','mobility',4,{mp:1});
      A('破障推土铲','mobility',5,{armor_f:30});
      A('扫雷犁','mobility',5,{armor_f:10,armor_t:10});
      A('遥控扫雷辊','mobility',6,{armor_f:20,armor_t:20});
      A('涉水排气管','mobility',3,{mp:1});
      A('机动改装套件','mobility',5,{mp:1,hit:-.01});

      /* ---------- 通信 comms（10） ---------- */
      A('数字通信系统','comms',4,{eccm:1});
      A('卫星通信终端','comms',8,{eccm:2});
      A('战术数据链','comms',7,{eccm:1,sens_v:1});
      A('激光通信装置','comms',10,{eccm:3});
      A('短波电台','comms',2,{eccm:1});
      A('加密通信模块','comms',6,{eccm:2});
      A('跳频电台','comms',9,{eccm:3});
      A('雷达告警接收机','comms',6,{eccm:1,stealth:1});
      A('导弹告警系统','comms',9,{aps:1,eccm:1});
      A('激光告警器','comms',6,{eccm:1,aps:1});

      /* ---------- 电子战 ew（10） ---------- */
      A('红外告警','ew',5,{eccm:1});
      A('主动干扰器','ew',8,{jam:2});
      A('大功率干扰器','ew',14,{jam:4});
      A('定向干扰器','ew',10,{jam:3});
      A('数字射频存储干扰','ew',16,{jam:5,eccm:1});
      A('拖曳诱饵','ew',9,{decoy:2});
      A('箔条发射器','ew',5,{decoy:1});
      A('红外诱饵','ew',5,{decoy:1});
      A('雷达诱饵','ew',7,{decoy:2});
      A('反无人机干扰枪','ew',12,{hit:.20,jam:1});

      /* ---------- 传感器 sensor（5） ---------- */
      A('声呐系统','sensor',7,{sens_v:5});
      A('电子侦察天线','sensor',5,{sens_v:2});
      A('信号情报模块','sensor',7,{sens_v:3});
      A('高频雷达','sensor',10,{sens_radar:2});
      A('相控阵雷达模块','sensor',14,{sens_radar:3,sens_v:2});

      /* ---------- 伪装 camo（12） ---------- */
      A('迷彩服','camo',2,{stealth:1});
      A('数字迷彩','camo',4,{stealth:2});
      A('城市迷彩','camo',5,{stealth:3});
      A('沙漠迷彩','camo',5,{stealth:3});
      A('雪地伪装服','camo',5,{stealth:3});
      A('丛林伪装网','camo',5,{stealth:3});
      A('雷达散射网','camo',6,{stealth:3});
      A('红外抑制毯','camo',4,{stealth:2});
      A('伪装帐篷','camo',5,{stealth:4});
      A('诱饵目标','camo',5,{decoy:1});
      A('假目标发射器','camo',8,{decoy:2});
      A('视觉干扰器','camo',6,{stealth:2});

      /* ---------- 后勤 utility（15） ---------- */
      A('医疗包','utility',3,{morale:1});
      A('战地救护车','utility',6,{morale:1,sens_v:1});
      A('自动体外除颤器','utility',4,{morale:1});
      A('止血带','utility',2,{morale:1});
      A('急救培训','utility',3,{training:1});
      A('备件包','utility',3,{mp:1});
      A('工具包','utility',4,{mp:1});
      A('弹药箱','utility',5,{ammo:.3});
      A('燃油桶','utility',4,{mp:1});
      A('便携式发电机','utility',4,{eccm:1});
      A('净水设备','utility',2,{morale:1});
      A('野战口粮','utility',2,{morale:1});
      A('野战厨房','utility',4,{morale:2});
      A('军医小队','utility',7,{morale:2});
      A('后送直升机','utility',9,{morale:2});

      /* ---------- 特殊 special（35） ---------- */
      A('单兵战术终端','special',5,{hit:.02,sens_v:1});
      A('战术地图','special',3,{hit:.01,sens_v:1});
      A('望远镜','special',2,{sens_v:1});
      A('指南针','special',1,{sens_v:1});
      A('战术手电','special',1,{sens_v:1});
      A('战术刀','special',2,{hit:.05});
      A('防弹衣（轻型）','special',3,{armor_f:10,armor_s:10});
      A('防弹衣（重型）','special',6,{armor_f:20,armor_s:20,mp:-1});
      A('防毒面具','special',2,{stealth:1});
      A('防化服','special',3,{stealth:1,armor_f:5});
      A('氧气瓶','special',2,{mp:1});
      A('登山装备','special',4,{mp:2});
      A('雪橇','special',3,{mp:2});
      A('折叠梯','special',3,{mp:1});
      A('破门炸药','special',5,{hit:.15});
      A('战术绳索','special',2,{mp:1});
      A('夜视热成像','special',8,{sens_v:3});
      A('便携式雷达','special',10,{sens_v:4,sens_radar:1});
      A('战术无人机','special',9,{sens_v:5});
      A('侦察气球','special',8,{sens_v:5});
      A('火力校射员','special',7,{hit:.08});
      A('狙击观察员','special',8,{hit:.10});
      A('机枪副射手','special',6,{rof:1});
      A('反坦克副射手','special',7,{hit:.10,pen:50});
      A('通信中继背包','special',5,{eccm:1});
      A('信号旗','special',2,{eccm:1});
      A('军号','special',2,{morale:2});
      A('战旗','special',4,{morale:3});
      A('战术头盔','special',3,{armor_t:5,morale:1});
      A('战术手表','special',2,{sens_v:1});
      A('战场急救包','special',4,{morale:2});
      A('消音手枪','special',3,{stealth:1});
      A('战术耳机','special',3,{sens_v:1});
      A('战术背包','special',3,{ammo:.1});
      A('毫米波雷达','sensor',8,{sens_radar:1});

      const ATT_BY_ID = {};
      ATT_LIST.forEach(a => ATT_BY_ID[a.id] = a);

      /* ============================================================
       * 2) 效果应用处理器
       * ============================================================ */
      const EFFECT = {
        hit:        (d,v) => d.weapons.forEach(w => w.acc = Math.min(0.99, w.acc * (1 + v))),
        pen:        (d,v) => d.weapons.forEach(w => w.pen += v),
        range:      (d,v) => d.weapons.forEach(w => w.r += v),
        rof:        (d,v) => d.weapons.forEach(w => w.rof = Math.max(1, w.rof + v)),
        ammo:       (d,v) => d.weapons.forEach(w => w.ammo = Math.round(w.ammo * (1 + v))),
        armor_f:    (d,v) => d.armor.f += v,
        armor_s:    (d,v) => d.armor.s += v,
        armor_t:    (d,v) => d.armor.t += v,
        mp:         (d,v) => d.mp = Math.max(1, d.mp + v),
        hp:         (d,v) => d._hpBonus = (d._hpBonus || 0) + v,
        sens_v:     (d,v) => d.sens.v += v,
        sens_t:     (d,v) => d.sens.t += v,
        sens_radar: (d,v) => d.sens.radar = (d.sens.radar || 0) + v,
        stealth:    (d,v) => d.stealth = Math.min(10, d.stealth + v),
        morale:     (d,v) => d.morale = Math.min(10, d.morale + v),
        training:   (d,v) => d.training = Math.min(10, d.training + v),
        eccm:       (d,v) => d.ew.eccm += v,
        jam:        (d,v) => d.ew.jam += v,
        decoy:      (d,v) => d.ew.decoy += v,
        aps:        (d,v) => d.aps = (d.aps || 0) + v,
        era:        (d,v) => d.era = (d.era || 0) + v
      };

      /* ============================================================
       * 3) 重建 def
       * ============================================================ */
      function rebuild(u) {
        if (!u._baseDef) return;
        const newDef = JSON.parse(JSON.stringify(u._baseDef));
        newDef._hpBonus = 0;

        u._attachments.forEach(id => {
          const att = ATT_BY_ID[id];
          if (!att) return;
          for (const k in att.effect) {
            const h = EFFECT[k];
            if (h) h(newDef, att.effect[k]);
          }
        });

        const attPts = u._attachments.reduce((s,id) => s + (ATT_BY_ID[id]?.pts || 0), 0);
        newDef.pts = (u._baseDef.pts || 0) + attPts;
        newDef.cap = (u._baseDef.cap || '') + (u._attachments.length ? '·附件' : '');

        u.def = newDef;

        if (newDef._hpBonus) {
          if (!u._baseHp) u._baseHp = u.maxHp;
          u.maxHp = Math.round(u._baseHp * (1 + newDef._hpBonus / 100));
          u.hp = Math.min(u.hp, u.maxHp);
        }
      }

      /* ============================================================
       * 4) 单位生成初始化 + AI 自动装备
       * ============================================================ */
      api.on('unitSpawn', (ev) => {
        const u = ev.unit || ev;
        if (!u || !u.def) return;
        if (!u._baseDef) u._baseDef = u.def;
        if (!u._attachments) u._attachments = [];
        if (!u._slots) {
          const s = SLOTS_BY_CAT[u.def.cat] || {};
          u._slots = JSON.parse(JSON.stringify(s));
        }
        if (u.side === 1 && !u._autoEquipped && Object.keys(u._slots).length > 0) {
          u._autoEquipped = true;
          setTimeout(() => autoEquipAI(u), 120);
        }
      });

      function autoEquipAI(u) {
        if (!u || u.dead) return;
        const slots = u._slots;
        const numToEquip = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numToEquip; i++) {
          const availSlots = Object.keys(slots).filter(s => {
            const used = u._attachments.filter(id => ATT_BY_ID[id]?.slot === s).length;
            return used < slots[s];
          });
          if (!availSlots.length) break;
          const slot = availSlots[Math.floor(Math.random() * availSlots.length)];
          const cands = ATT_LIST.filter(a => a.slot === slot);
          if (!cands.length) continue;
          const pick = cands[Math.floor(Math.random() * cands.length)];
          u._attachments.push(pick.id);
        }
        if (u._attachments.length) rebuild(u);
      }

      /* ============================================================
       * 5) 装备 / 卸下 API
       * ============================================================ */
      function equip(u, attId) {
        const att = ATT_BY_ID[attId];
        if (!att) return false;
        if (!u._attachments) u._attachments = [];
        const max = u._slots[att.slot] || 0;
        const used = u._attachments.filter(id => ATT_BY_ID[id]?.slot === att.slot).length;
        if (used >= max) { log(`❌ ${att.slot} 槽位已满 (${used}/${max})`, 'lg-sys'); return false; }
        u._attachments.push(attId);
        rebuild(u);
        log(`✅ ${u.def.name} 装备「${att.name}」`, 'lg-ok');
        return true;
      }

      function unequip(u, attId) {
        const i = u._attachments.indexOf(attId);
        if (i < 0) return false;
        const att = ATT_BY_ID[attId];
        u._attachments.splice(i, 1);
        rebuild(u);
        log(`➖ ${u.def.name} 卸下「${att?.name}」`, 'lg-sys');
        return true;
      }

      window._attachments = { equip, unequip, ATT_LIST, ATT_BY_ID };

      /* ============================================================
       * 6) UI 面板
       * ============================================================ */
      let _lastSel = null;
      let _filterCat = 'all';

      function ensureBtn() {
        const si = document.getElementById('selInfo');
        if (!si || !G.sel || G.sel.dead) return;
        if (!G.sel._slots || Object.keys(G.sel._slots).length === 0) return;
        let btn = document.getElementById('attEquipBtn');
        if (!btn) {
          btn = document.createElement('button');
          btn.id = 'attEquipBtn';
          btn.className = 'sm';
          btn.style.cssText = 'width:100%; margin-top:6px; background:#1a2332; border:1px solid #d0a0e0; color:#d0a0e0;';
          si.appendChild(btn);
        }
        const n = (G.sel._attachments || []).length;
        btn.textContent = `⚙️ 装备附件 (${n}) · 按 Y`;
        btn.onclick = openModal;
      }

      function openModal() {
        if (!G.sel || G.sel.dead) { log('未选中单位', 'lg-sys'); return; }
        if (!G.sel._slots || Object.keys(G.sel._slots).length === 0) {
          log(`${G.sel.def.name} 无可装备槽位`, 'lg-sys'); return;
        }
        let modal = document.getElementById('attModal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'attModal';
          modal.className = 'modal';
          modal.innerHTML = `
            <div class="modalBox" style="max-width:900px; max-height:85vh; display:flex; flex-direction:column;">
              <h2>⚙️ 装备附件 · <span id="attUnitName" style="color:#d0a0e0"></span></h2>
              <p class="hint" id="attSlotsInfo" style="margin-bottom:8px;"></p>
              <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input id="attSearch" placeholder="搜索附件名..." style="flex:1; padding:6px; background:#0d1117; border:1px solid #30363d; color:#e6edf3; border-radius:4px;">
                <button id="attClose" class="sm" style="padding:6px 16px;">关闭</button>
              </div>
              <div id="attCats" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;"></div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; flex:1; min-height:0;">
                <div style="display:flex; flex-direction:column; min-height:0;">
                  <div style="color:#3fb950; font-size:12px; font-weight:600; margin-bottom:4px;">已装备</div>
                  <div id="attEquipped" style="flex:1; overflow-y:auto; border:1px solid #30363d; border-radius:4px; background:#0d1117; padding:6px;"></div>
                </div>
                <div style="display:flex; flex-direction:column; min-height:0;">
                  <div style="color:#58a6ff; font-size:12px; font-weight:600; margin-bottom:4px;">可装备</div>
                  <div id="attAvailable" style="flex:1; overflow-y:auto; border:1px solid #30363d; border-radius:4px; background:#0d1117; padding:6px;"></div>
                </div>
              </div>
            </div>`;
          document.body.appendChild(modal);
          document.getElementById('attClose').onclick = () => modal.classList.remove('on');
          document.getElementById('attSearch').oninput = () => refreshModal();
        }
        modal.classList.add('on');
        _filterCat = 'all';
        refreshModal();
      }

      function refreshModal() {
        const modal = document.getElementById('attModal');
        if (!modal || !G.sel) return;
        const u = G.sel;

        document.getElementById('attUnitName').textContent = u.def.name;

        document.getElementById('attSlotsInfo').innerHTML = Object.entries(u._slots)
          .map(([s,max]) => {
            const used = u._attachments.filter(id => ATT_BY_ID[id]?.slot === s).length;
            const color = used >= max ? '#3fb950' : '#d29922';
            return `<span style="color:${color}">${s}: ${used}/${max}</span>`;
          }).join(' · ');

        const CATS = [
          {id:'all',n:'全部'},{id:'optics',n:'光学'},{id:'weapon',n:'枪械'},
          {id:'ammo',n:'弹药'},{id:'armor',n:'装甲'},{id:'mobility',n:'机动'},
          {id:'comms',n:'通信'},{id:'ew',n:'电战'},{id:'sensor',n:'传感器'},
          {id:'camo',n:'伪装'},{id:'utility',n:'后勤'},{id:'special',n:'特殊'}
        ];
        const catsEl = document.getElementById('attCats');
        catsEl.innerHTML = CATS.map(c => `
          <button class="att-cat" data-cat="${c.id}" style="padding:3px 10px; background:${c.id===_filterCat?'#1a2332':'#161b22'}; border:1px solid ${c.id===_filterCat?'#d0a0e0':'#30363d'}; color:${c.id===_filterCat?'#d0a0e0':'#8b949e'}; border-radius:4px; cursor:pointer; font-size:11px;">${c.n}</button>`).join('');
        catsEl.querySelectorAll('.att-cat').forEach(b => {
          b.onclick = () => { _filterCat = b.dataset.cat; refreshModal(); };
        });

        const q = (document.getElementById('attSearch').value || '').toLowerCase();

        // 已装备
        const eqEl = document.getElementById('attEquipped');
        if (u._attachments.length === 0) {
          eqEl.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">暂无附件</div>';
        } else {
          eqEl.innerHTML = u._attachments.map(id => {
            const a = ATT_BY_ID[id]; if (!a) return '';
            return `<div style="display:flex;align-items:center;gap:6px;padding:5px;border-bottom:1px solid #21262d;">
              <span style="font-size:14px;">${a.icon}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;color:#e6edf3;">${a.name}</div>
                <div style="font-size:10px;color:#6e7681;">${fmtEffect(a.effect)}</div>
              </div>
              <button class="att-unequip" data-id="${id}" style="background:#8b2020;border:1px solid #f85149;color:#fff;padding:2px 8px;border-radius:3px;cursor:pointer;font-size:10px;">卸下</button>
            </div>`;
          }).join('');
          eqEl.querySelectorAll('.att-unequip').forEach(b => {
            b.onclick = () => { unequip(u, b.dataset.id); refreshModal(); ensureBtn(); };
          });
        }

        // 可装备
        const avEl = document.getElementById('attAvailable');
        const avail = ATT_LIST.filter(a => {
          if (q && !a.name.toLowerCase().includes(q)) return false;
          if (_filterCat !== 'all' && a.cat !== _filterCat) return false;
          if (u._attachments.includes(a.id)) return false;
          if (!(a.slot in u._slots)) return false;
          return true;
        });
        if (avail.length === 0) {
          avEl.innerHTML = '<div style="padding:20px;text-align:center;color:#6e7681;font-size:11px;">没有可用附件</div>';
        } else {
          avEl.innerHTML = avail.map(a => {
            const max = u._slots[a.slot] || 0;
            const used = u._attachments.filter(id => ATT_BY_ID[id]?.slot === a.slot).length;
            const full = used >= max;
            return `<div style="display:flex;align-items:center;gap:6px;padding:5px;border-bottom:1px solid #21262d;opacity:${full?0.5:1};">
              <span style="font-size:14px;">${a.icon}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;color:#e6edf3;">${a.name} <span style="color:#f0b72f;font-size:10px;">[${a.pts}分]</span></div>
                <div style="font-size:10px;color:#6e7681;">${fmtEffect(a.effect)} · ${a.slot}</div>
              </div>
              <button class="att-equip" data-id="${a.id}" ${full?'disabled':''} style="background:${full?'#30363d':'#238636'};border:1px solid ${full?'#30363d':'#3fb950'};color:#fff;padding:2px 8px;border-radius:3px;cursor:${full?'not-allowed':'pointer'};font-size:10px;">${full?'满':'装备'}</button>
            </div>`;
          }).join('');
          avEl.querySelectorAll('.att-equip:not([disabled])').forEach(b => {
            b.onclick = () => { equip(u, b.dataset.id); refreshModal(); ensureBtn(); };
          });
        }
      }

      function fmtEffect(eff) {
        const MAP = {
          hit:v=>`命中+${(v*100).toFixed(0)}%`, pen:v=>`穿深+${v}`, range:v=>`射程+${v}`,
          rof:v=>`射速${v>0?'+':''}${v}`, ammo:v=>`弹容+${(v*100).toFixed(0)}%`,
          armor_f:v=>`前甲+${v}`, armor_s:v=>`侧甲+${v}`, armor_t:v=>`顶甲+${v}`,
          mp:v=>`MP${v>0?'+':''}${v}`, hp:v=>`HP${v>0?'+':''}${v}%`,
          sens_v:v=>`视野+${v}`, sens_t:v=>`热像+${v}`, sens_radar:v=>`雷达+${v}`,
          stealth:v=>`隐蔽+${v}`, morale:v=>`士气+${v}`, training:v=>`训练+${v}`,
          eccm:v=>`抗扰+${v}`, jam:v=>`干扰+${v}`, decoy:v=>`诱饵+${v}`,
          aps:v=>`APS+${v}`, era:v=>`ERA+${v}`
        };
        return Object.entries(eff).map(([k,v]) => (MAP[k]||((x)=>`${k}${x}`))(v)).join(' ');
      }

      setInterval(() => {
        if (G.sel !== _lastSel) {
          _lastSel = G.sel;
          setTimeout(ensureBtn, 50);
          if (document.getElementById('attModal')?.classList.contains('on')) refreshModal();
        }
      }, 300);
      setTimeout(ensureBtn, 1000);

      /* ============================================================
       * 7) 快捷键 Y
       * ============================================================ */
      window.addEventListener('keydown', e => {
        if ((e.key === 'Y' || e.key === 'y') &&
            !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) &&
            G.sel && !G.sel.dead) {
          e.preventDefault();
          openModal();
        }
      });

      console.log(`[attachments] ✔ 附件系统已加载 ${ATT_LIST.length} 个附件`);
    }
  });
})();