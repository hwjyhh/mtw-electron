/* ============================================================
 * MTW core/constants.js
 * 基础常量：数学 / 地形 / 地图类型 / AI 难度偏好 / 类别 / 武器类型判定
 * ============================================================ */
'use strict';

/* ---------- 数学 ---------- */
const SQ3 = Math.sqrt(3);
const HS  = 30;
const AXDIR = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

const clamp = (v,a,b) => v<a?a:v>b?b:v;
const rnd   = (a,b) => a + Math.random()*(b-a);

/* 六方向单位向量（用于朝向、命中方向计算） */
const DIR_PIX = [];
for (let i = 0; i < 6; i++) {
  const a = Math.PI/180 * (60*i + 30);
  DIR_PIX.push([Math.cos(a), Math.sin(a)]);
}

/* ---------- 地形表 ---------- */
const TERRAIN = [
  {id:'open',     n:'开阔地', col:'#94a06a', mv:[1,1,1,1], cov:0,   con:0,   el:0, blk:0},
  {id:'grass',    n:'草地',   col:'#89a05c', mv:[1,1,1,1], cov:0,   con:.12, el:0, blk:0},
  {id:'farm',     n:'农田',   col:'#b8a95f', mv:[1,1,1,1], cov:0,   con:.10, el:0, blk:0},
  {id:'brush',    n:'灌木',   col:'#7a9550', mv:[1,1.5,1.5,1], cov:.12, con:.30, el:0, blk:.2},
  {id:'forest',   n:'林地',   col:'#4a7a38', mv:[2,3,2.5,1],   cov:.25, con:.50, el:0, blk:.8},
  {id:'dforest',  n:'密林',   col:'#2d5a24', mv:[3,Infinity,4,1], cov:.35, con:.70, el:0, blk:1.3},
  {id:'hill',     n:'丘陵',   col:'#a89668', mv:[1.5,2,1.5,1], cov:.18, con:.20, el:1, blk:.3},
  {id:'mount',    n:'山地',   col:'#8d7a58', mv:[2.5,Infinity,Infinity,1], cov:.40, con:.40, el:2, blk:.8},
  {id:'ridge',    n:'山脊',   col:'#b0a077', mv:[2,Infinity,3,1], cov:.30, con:.25, el:3, blk:1.0},
  {id:'peak',     n:'山峰',   col:'#c0b090', mv:[3,Infinity,Infinity,1], cov:.50, con:.30, el:4, blk:1.8},
  {id:'desert',   n:'沙漠',   col:'#d9c98d', mv:[1,1,1,1], cov:0,   con:.05, el:0, blk:0},
  {id:'sand',     n:'沙地',   col:'#c9b57a', mv:[1.5,1.5,1.5,1], cov:0, con:.05, el:0, blk:0},
  {id:'dune',     n:'沙丘',   col:'#c9b070', mv:[2,3,2,1], cov:.15, con:.15, el:1, blk:.5},
  {id:'swamp',    n:'沼泽',   col:'#5c7a5a', mv:[3,Infinity,Infinity,1], cov:.10, con:.35, el:0, blk:.3},
  {id:'mud',      n:'泥地',   col:'#7a6a4a', mv:[2,4,3,1], cov:0,   con:.10, el:0, blk:0},
  {id:'water',    n:'河流',   col:'#3f7fbf', mv:[Infinity,Infinity,Infinity,1], cov:0, con:0, el:0, blk:0},
  {id:'lake',     n:'湖泊',   col:'#2b5f96', mv:[Infinity,Infinity,Infinity,1], cov:0, con:0, el:0, blk:0},
  {id:'sea',      n:'海洋',   col:'#1e4f86', mv:[Infinity,Infinity,Infinity,1], cov:0, con:0, el:0, blk:0},
  {id:'beach',    n:'海滩',   col:'#d9c98d', mv:[2,2,2,1], cov:0,   con:.02, el:0, blk:0},
  {id:'village',  n:'村镇',   col:'#a89070', mv:[1,1,1,1], cov:.40, con:.45, el:0, blk:1.0},
  {id:'city',     n:'城市',   col:'#8c8c8c', mv:[1,1,1,1], cov:.50, con:.60, el:0, blk:1.6},
  {id:'capital',  n:'大都市', col:'#787878', mv:[1,1,1,1], cov:.55, con:.65, el:0, blk:2.0},
  {id:'industry', n:'工业区', col:'#7a7a80', mv:[1.5,1.5,1.5,1], cov:.45, con:.50, el:0, blk:1.2},
  {id:'airport',  n:'机场',   col:'#666a70', mv:[1,1,1,1], cov:.10, con:.10, el:0, blk:.4},
  {id:'rubble',   n:'废墟',   col:'#9a9285', mv:[2,2.5,2,1], cov:.40, con:.50, el:0, blk:.9},
  {id:'road',     n:'公路',   col:'#6e6e6e', mv:[1,.5,.5,1], cov:0, con:0, el:0, blk:0},
  {id:'highway',  n:'高速',   col:'#7a7a7a', mv:[1,.4,.4,1], cov:0, con:0, el:0, blk:0},
  {id:'dirt',     n:'土路',   col:'#8f7f66', mv:[1,.75,.75,1], cov:0, con:.05, el:0, blk:0},
  {id:'bridge',   n:'桥梁',   col:'#8a7a5a', mv:[1,1,1,1], cov:0, con:0, el:0, blk:0},
  {id:'runway',   n:'跑道',   col:'#5f5f63', mv:[1,1,1,1], cov:0, con:0, el:0, blk:0},
  {id:'trench',   n:'战壕',   col:'#7a6a4a', mv:[1.5,2,2,1], cov:.45, con:.45, el:0, blk:.5},
  {id:'orchard',  n:'果园',   col:'#6a8a4a', mv:[1,1.5,1.5,1], cov:.15, con:.35, el:0, blk:.4},
  {id:'rocky',    n:'岩石',   col:'#8a8270', mv:[2,3,2,1], cov:.25, con:.20, el:0, blk:.5},
  {id:'snow',     n:'雪地',   col:'#e0e8ee', mv:[1.5,2,1.5,1], cov:.05, con:.10, el:0, blk:0}
];
const T_IDX = {};
TERRAIN.forEach((t,i) => { T_IDX[t.id] = i; });

/* ---------- 地图类型 / 尺寸 ---------- */
const MAP_TYPES = {
  encounter:{n:'遭遇战', icon:'⚔',  desc:'混合地形'},
  urban:    {n:'城市战', icon:'🏙', desc:'密集街区'},
  desert:   {n:'沙漠战', icon:'🏜', desc:'沙丘岩石'},
  forest:   {n:'森林战', icon:'🌲', desc:'茂密林地'},
  mountain: {n:'山地战', icon:'⛰', desc:'丘陵山脊'},
  plains:   {n:'平原战', icon:'🌾', desc:'开阔平原'},
  amphibious:{n:'两栖战',icon:'🌊', desc:'海岸登陆'},
  random:   {n:'随机',   icon:'🎲', desc:'完全随机'}
};
const MAP_SIZES = {
  small:     {n:'小20×15',  cols:20,  rows:15},
  medium:    {n:'中30×22',  cols:30,  rows:22},
  large:     {n:'大45×32',  cols:45,  rows:32},
  huge:      {n:'特大60×40',cols:60,  rows:40},
  '营级':    {n:'营级100*100', cols:100, rows:100},
  strategic: {n:'战略 300×200', cols:300, rows:200}
};

/* ---------- AI 偏好（基础版；M4/M10 会 Object.assign 扩展 beginner 难度） ---------- */
const AI_DIFFICULTIES = {
  easy:   {n:'低', color:'#6e7681', desc:'寻路直射'},
  medium: {n:'中', color:'#58a6ff', desc:'集火协同'},
  hard:   {n:'高', color:'#f85149', desc:'体系作战'}
};
const AI_PREFERENCES = {
  balanced:  {n:'综合',   icon:'⚖', desc:'平衡'},
  firepower: {n:'重火力', icon:'💥', desc:'炮兵优先'},
  offensive: {n:'进攻',   icon:'⚔', desc:'正面突击'},
  defensive: {n:'防守',   icon:'🛡', desc:'龟缩掩体'},
  signals:   {n:'信火',   icon:'📡', desc:'电子+火力'},
  maneuver:  {n:'机动',   icon:'🔄', desc:'绕后穿插'}
};

/* ---------- 类别 / 国家 ---------- */
const CAT_INFO = {
  INF:{n:'步兵',     col:'#8b9dc3'}, ARM:{n:'装甲',    col:'#d9534f'},
  IFV:{n:'步兵战车', col:'#e08b3a'}, APC:{n:'装甲输送',col:'#c9a227'},
  ARTY:{n:'火炮',    col:'#b07be0'}, AD:{n:'防空',    col:'#4aa3c9'},
  RECON:{n:'侦察',   col:'#5fbf7f'}, UAV:{n:'无人机', col:'#5fd0c0'},
  HELI:{n:'直升机',  col:'#7ab8e0'}, AIR:{n:'固定翼', col:'#9aa8e0'},
  ENG:{n:'工兵',     col:'#c9a06a'}, LOG:{n:'后勤/指挥',col:'#9aa0a6'},
  EW:{n:'电子战',    col:'#d0a0e0'}, SF:{n:'特种',    col:'#e06a9a'},
  NAV:{n:'两栖/海军',col:'#4a90c9'}, FORT:{n:'工事',  col:'#8a8a7a'},
  MINE:{n:'障碍/雷场',col:'#a05a5a'}
};
const NAT_INFO = {
  US:{n:'美国',  col:'#4a90d9'},
  CN:{n:'中国',  col:'#d9534f'},
  RU:{n:'俄罗斯', col:'#7ac943'},
  N: {n:'中立',  col:'#8a8a8a'}
};
const CAT_SYM = {
  INF:'✕', ARM:'⬭', IFV:'▣', APC:'▤', ARTY:'●', AD:'✚',
  RECON:'◈', UAV:'✈', HELI:'🚁', AIR:'✈', ENG:'⚒', LOG:'▮',
  EW:'≋', SF:'★', NAV:'⚓', FORT:'⌂', MINE:'✳'
};

/* ---------- 步兵姿态 ---------- */
const STANCE_INFO = {
  defense:{n:'防御', icon:'🛡'},
  move:   {n:'行进', icon:'🚶'},
  attack: {n:'攻击', icon:'⚔'}
};

/* ---------- 武器类型判定 ---------- */
const RANGED_FIRE_THRESHOLD = 15;
const INDIRECT_WEAPON_TYPES = ['howitzer','mortar','mlrs'];
const ANTI_AIR_WEAPON_TYPES = ['sam','manpads','aaa'];
const SMALL_ARMS_TYPES      = ['rifle','mg','sniper','gl'];

const canEngageAir   = w => ANTI_AIR_WEAPON_TYPES.includes(w.t) || SMALL_ARMS_TYPES.includes(w.t);
const isRangedWeapon = w => w.r >= RANGED_FIRE_THRESHOLD;
const isIndirectWeapon = w => INDIRECT_WEAPON_TYPES.includes(w.t);
const canAreaFire    = w => isRangedWeapon(w) || isIndirectWeapon(w);

/* ---------- 电子战常量 ---------- */
const EW_BANDS_ALL = ['VHF','UHF','HF','SATCOM','RADAR','IR','SHF'];

const EW_ACTIONS = {
  jam:    {n:'软杀伤干扰', cost:2, color:'#d0a0e0'},
  recon:  {n:'电子侦察',   cost:1, color:'#79c0ff'},
  decoy:  {n:'电子欺骗',   cost:2, color:'#e06a9a'},
  shield: {n:'电子防护',   cost:1, color:'#7ee787'},
  arm:    {n:'反辐射打击', cost:3, color:'#f85149'},
  counter:{n:'反炮兵雷达', cost:2, color:'#f0883e'},
  hack:   {n:'密码破译',   cost:2, color:'#f0883e'}
};
const CRYPTO_INFO = {progressPerTurn: 8, threshold: 100};

/* ---------- 高度层 / RCS 表（原 M1 常量） ---------- */
const ALT_HEIGHT_M = [0, 100, 500, 3000, 8000];
const AIR_ALTITUDE = { UAV:2, HELI:1, AIR:3 };

const RCS_BY_CAT = {
  INF:{front:0.5,side:0.6,rear:0.5}, SF:{front:0.4,side:0.5,rear:0.4},
  ARM:{front:11,side:16,rear:10},    IFV:{front:8,side:11,rear:8},
  APC:{front:7,side:9,rear:7},       ARTY:{front:16,side:20,rear:16},
  AD:{front:14,side:18,rear:14},     RECON:{front:4,side:5,rear:4},
  UAV:{front:0.8,side:1.6,rear:1.2}, HELI:{front:11,side:15,rear:12},
  AIR:{front:4,side:10,rear:6},      ENG:{front:5,side:6,rear:5},
  LOG:{front:6,side:8,rear:6},       EW:{front:6,side:7,rear:6},
  NAV:{front:15,side:25,rear:15},    FORT:{front:25,side:25,rear:25},
  MINE:{front:0.01,side:0.01,rear:0.01}
};
const RCS_OVERRIDE = {
  us_f22:{front:0.05,side:1.2,rear:0.5},  us_f35a:{front:0.08,side:1.5,rear:0.6},
  cn_j20:{front:0.06,side:1.4,rear:0.5},  cn_j35:{front:0.08,side:1.5,rear:0.6},
  ru_su57:{front:0.3,side:2.0,rear:0.8},  us_rq170:{front:0.05,side:0.4,rear:0.15},
  cn_gj11:{front:0.1,side:0.8,rear:0.3},  us_b52:{front:100,side:200,rear:120},
  us_ac130:{front:40,side:70,rear:45},    us_mq9:{front:0.6,side:2.2,rear:1.0},
  us_mq1c:{front:0.8,side:2.8,rear:1.2},  cn_wz7:{front:0.8,side:3,rear:1.4},
  cn_gj2:{front:0.7,side:2.5,rear:1.0},   cn_wl2:{front:0.7,side:2.5,rear:1.0},
  ru_orlan30:{front:0.4,side:1.4,rear:0.6}, ru_mig31:{front:12,side:25,rear:15},
  ru_su34:{front:8,side:15,rear:10},      ru_su35:{front:5,side:12,rear:7},
  ru_su25:{front:6,side:11,rear:7},       cn_j16:{front:5,side:12,rear:7},
  cn_j10c:{front:4,side:9,rear:6},        cn_jh7a:{front:6,side:12,rear:7},
  cn_h6k:{front:60,side:120,rear:70},     us_f15e:{front:7,side:14,rear:9},
  us_f16c:{front:4,side:9,rear:6},        us_a10c:{front:6,side:12,rear:8}
};