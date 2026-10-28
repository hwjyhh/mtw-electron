/* ============================================================
 * mods/tactical-manual/mod.js — 战术手册面板 v2.0
 * 汇总原版机制 + 所有 Mod 特殊战术机制，提供搜索/分类/快捷键速查
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[tactical-manual] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'tactical-manual',
    name: '战术手册面板',
    version: '2.0.0',
    setup(api) {

      /* ============================================================
       * 1) 分类
       * ============================================================ */
      const CATEGORIES = [
        { id: 'all',    name: '全部',         icon: '📖' },
        { id: 'base',   name: '基础机制',     icon: '🎮' },
        { id: 'vision', name: '视野与侦察',   icon: '👁️' },
        { id: 'fire',   name: '射程与命中',   icon: '🎯' },
        { id: 'armor',  name: '装甲与伤害',   icon: '🛡️' },
        { id: 'unit',   name: '单位与武器',   icon: '⚔️' },
        { id: 'ew',     name: '电子战',       icon: '📡' },
        { id: 'c2',     name: '指挥与士气',   icon: '🎖️' },
        { id: 'logi',   name: '后勤消耗',     icon: '⛽' },
        { id: 'env',    name: '地形与天气',   icon: '🌦️' },
        { id: 'tactic', name: '特殊战术',     icon: '⚡' },
        { id: 'arty',   name: '火炮协议',     icon: '💥' },
        { id: 'tools',  name: '工具与复盘',   icon: '🔧' }
      ];

      /* ============================================================
       * 2) 条目数据（原版机制 + Mod 扩展）
       * ============================================================ */
      const ENTRIES = [

        /* ==================== 基础机制 ==================== */
        {
          id: 'turn-flow', cat: 'base', name: '回合制流程', icon: '🔄', key: '空格',
          summary: '蓝方行动 → 红方行动 → 回合结束',
          detail: '每个回合分为两个阶段：\n' +
                  '① 蓝方（人类）行动：所有蓝方单位可移动 + 开火\n' +
                  '② 红方（AI）行动：AI 自动执行所有红方单位\n' +
                  '③ 回合结束：处理烟幕/辐射/天气/士气/战损衰减\n\n' +
                  '· 按空格或点击"结束回合"结束当前方行动\n' +
                  '· 每个单位每回合有独立行动点（MP）和开火次数（fired）',
          formula: '1 回合 = 蓝方 + 红方 + 结算',
          source: 'original'
        },
        {
          id: 'mp', cat: 'base', name: '行动点 MP', icon: '👣', key: '—',
          summary: '单位每回合可用的移动点数',
          detail: 'MP（Movement Points）决定单位移动能力：\n' +
                  '· 移动 1 格消耗 1 MP（部分地形消耗 2+）\n' +
                  '· 移动 + 射击可在同一回合完成\n' +
                  '· MP 耗尽后无法移动但仍可射击\n' +
                  '· 回合开始重置为 maxMp\n\n' +
                  '参考值：步兵 3 / 轮式 6~9 / 履带 4~6 / 直升机 14+ / 战机 20+',
          formula: '1 格 = 1 MP；地形可消耗 1~3 MP',
          source: 'original'
        },
        {
          id: 'echelon', cat: 'base', name: '编制等级', icon: '🏛️', key: '—',
          summary: 'TM 小队 / SQD 班 / CO 连',
          detail: '单位编制等级影响指挥、协同和士气传递：\n' +
                  '· TM（Team/小队）：最小战术单位，独立行动\n' +
                  '· SQD（Squad/班）：标准步兵班组（9~12 人）\n' +
                  '· CO（Company/连）：指挥单位，提供通信中继\n\n' +
                  'CO 级单位通常带有"指挥"或"通信中继"标签。',
          formula: 'CO 级附带指挥/通信加成',
          source: 'original'
        },
        {
          id: 'mob', cat: 'base', name: '机动类型', icon: '🚗', key: '—',
          summary: 'leg 步行 / wheel 轮式 / track 履带 / air 空中 / static 固定',
          detail: '机动类型决定地形消耗和战术表现：\n' +
                  '· leg（步行）：步兵，无视大部分地形，速度慢\n' +
                  '· wheel（轮式）：公路快，泥地/森林慢\n' +
                  '· track（履带）：越野能力强，隐蔽较差\n' +
                  '· air（空中）：无视地形，但受防空/天气影响\n' +
                  '· static（固定）：无法移动（工事/雷达站）',
          formula: '不同 mob 对地形消耗/隐蔽/暴露有差异',
          source: 'original'
        },
        {
          id: 'pts', cat: 'base', name: '分值系统', icon: '💰', key: '—',
          summary: '每个单位拥有独立战术分值',
          detail: 'pts（Points）是单位价值量化：\n' +
                  '· 用于预算战（Budget Encounter）的购买成本\n' +
                  '· 用于战损面板的评分累计\n' +
                  '· 影响 AI 威胁评估权重\n\n' +
                  '参考：民兵 8 / 步兵班 16 / 主战坦克 90+ / 战机 180+',
          formula: 'pts 越高 → AI 越重视 → 威胁评分越高',
          source: 'original'
        },

        /* ==================== 视野与侦察 ==================== */
        {
          id: 'sensor-range', cat: 'vision', name: '视野范围（sensorRange）', icon: '🔭', key: '—',
          summary: '每个单位的有效感知范围',
          detail: '视野由以下因素决定：\n' +
                  '· 基础：由单位类别决定（见下方参考表）\n' +
                  '· 装备：红外/热像/光电/侦察/狙击等标签加成\n' +
                  '· 姿态：防御姿态 ×1.15 / 进攻姿态 ×0.9\n' +
                  '· 干扰：被干扰值越高视野越低（最低 15%）\n' +
                  '· 通信链路：< 50% 时 ×0.8\n' +
                  '· 传感器损坏：×0.4\n\n' +
                  '参考基础值：\n' +
                  '  步兵 11 / 特种 13 / 侦察 19 / 装甲 22\n' +
                  '  防空 25 / 直升机 35 / 无人机 40 / 战机 50',
          formula: '1 格 = 100m；有效范围 1 ~ 50 格',
          source: 'original'
        },
        {
          id: 'has-los', cat: 'vision', name: '视线判定（LOS）', icon: '👀', key: '—',
          summary: '两点之间是否有视线阻挡',
          detail: 'hasLOS(a, b) 判定从 a 能否直视 b：\n' +
                  '· 沿两点连线采样中间格（Bresenham 直线）\n' +
                  '· 遇到山丘/高地形会阻断视线\n' +
                  '· 城市/森林可能提供视线遮挡\n' +
                  '· 烟幕会阻断视线（Mod）\n\n' +
                  'LOS 失败 → 无法发现目标 → 无法攻击',
          formula: '沿直线采样；遇到遮挡即返回 false',
          source: 'original'
        },
        {
          id: 'spotted', cat: 'vision', name: '战争迷雾（spotted）', icon: '🌫️', key: '—',
          summary: '未发现的敌方单位在地图上不可见',
          detail: '每个单位维护一个 spotted[side] 数组：\n' +
                  '· spotted[0] = 蓝方是否能看到我\n' +
                  '· spotted[1] = 红方是否能看到我\n\n' +
                  '发现条件：\n' +
                  '· 距离 ≤ 观察者视野\n' +
                  '· LOS 通畅\n' +
                  '· 对空目标需雷达或近距目视\n\n' +
                  '每回合 recalcVisibility() 重新计算。',
          formula: '每帧/回合重算；影响所有目标选择',
          source: 'original'
        },
        {
          id: 'stealth', cat: 'vision', name: '隐蔽值（stealth）', icon: '🎭', key: '—',
          summary: '单位的被动隐蔽能力（0~10）',
          detail: 'stealth 值越高越难被发现：\n' +
                  '· 10 = 极难发现（狙击手、特种兵、潜艇）\n' +
                  '· 5~7 = 中等（步兵、轻型车辆）\n' +
                  '· 0~3 = 显眼（大型车辆、雷达车）\n\n' +
                  '隐蔽配合"静止+防御+掩体"会大幅压缩被发现距离。',
          formula: '高隐蔽 + 静止 + 掩体 = 需贴脸才能发现',
          source: 'original'
        },
        {
          id: 'radar-snr', cat: 'vision', name: '雷达探测（SNR）', icon: '📡', key: '—',
          summary: '雷达对空中目标的信噪比判定',
          detail: '雷达单位（sens.radar > 0）对空中目标：\n' +
                  '· 调用 radarSNR(observer, target) 计算信噪比\n' +
                  '· SNR > 10 → 成功发现\n' +
                  '· 隐身战机（RCS 极低）→ SNR 很难超过阈值\n\n' +
                  '· 雷达关机（radarOn = false）后失去雷达视野\n' +
                  '· 反辐射打击会迫使雷达关机',
          formula: 'SNR > 10 才能发现目标',
          source: 'original'
        },
        {
          id: 'air-detection', cat: 'vision', name: '对空探测', icon: '✈️', key: '—',
          summary: '无雷达单位对空探测距离大幅压缩',
          detail: '地面单位（无雷达）发现空中目标：\n' +
                  '· 只能依赖肉眼，有效距离约为视野的 70%\n' +
                  '· 防空单位带雷达可借用网络视野\n' +
                  '· 雷达开机时对空探测距离达 20 格',
          formula: '无雷达：×0.7 视野；有雷达：20 格',
          source: 'original'
        },
        {
          id: 'recalc-vis', cat: 'vision', name: '视野重算', icon: '🔄', key: '—',
          summary: '每回合/事件触发时重新计算可见性',
          detail: 'recalcVisibility() 触发时机：\n' +
                  '· 每回合开始时\n' +
                  '· 单位移动后\n' +
                  '· 单位开火后\n' +
                  '· 天气变化时\n' +
                  '· 烟幕投放/消散时\n\n' +
                  '会重新填充每个单位的 spotted 数组。',
          formula: '事件驱动 + 回合驱动',
          source: 'original'
        },

        /* ==================== 射程与命中 ==================== */
        {
          id: 'weapon-range', cat: 'fire', name: '武器射程（r）', icon: '📏', key: '—',
          summary: '每件武器有独立的射程（格）',
          detail: '武器射程 r 表示可打击的最大距离（格）：\n' +
                  '· 步枪 4~5 格（400~500m）\n' +
                  '· 机枪 6~8 格（600~800m）\n' +
                  '· 反坦克导弹 8~12 格\n' +
                  '· 主炮 8~9 格\n' +
                  '· 榴弹炮 15~40 格\n' +
                  '· 弹道导弹 45~70 格\n' +
                  '· 防空导弹 8~45 格\n\n' +
                  '距离 > r 的目标无法攻击。',
          formula: '1 格 = 100m；r 表示最大射程',
          source: 'original'
        },
        {
          id: 'hit-chance', cat: 'fire', name: '命中率（hitChance）', icon: '🎲', key: '—',
          summary: '射击命中概率的计算',
          detail: '命中率基础值来自武器 acc 字段，再叠加修正：\n' +
                  '· 距离修正：远距离命中率下降\n' +
                  '· 移动惩罚：行进中 ×0.5~0.7\n' +
                  '· 隐蔽目标：难命中\n' +
                  '· 装甲目标：主炮命中率略低\n' +
                  '· AI 威胁加成：×1.10\n' +
                  '· 天气：降雨/暴风雨 ×0.85\n' +
                  '· 炮塔卡死：×0.8\n\n' +
                  '原始 acc 参考：步枪 0.65~0.75 / 主炮 0.78~0.85 / 导弹 0.85~0.95',
          formula: 'p = acc × 距离修正 × 移动修正 × 隐蔽修正 × 天气修正',
          source: 'original'
        },
        {
          id: 'rof', cat: 'fire', name: '射速（rof）', icon: '🔁', key: '—',
          summary: '单回合可开火的次数',
          detail: 'rof（Rate of Fire）表示每回合可开火次数：\n' +
                  '· 步枪/机枪 rof=3~4（可点射多次）\n' +
                  '· 主炮 rof=2（两连射）\n' +
                  '· 榴弹炮/火箭炮 rof=1~2\n' +
                  '· 重型导弹 rof=1（每回合仅一次）\n\n' +
                  '· fired[i] 记录武器 i 已开火次数\n' +
                  '· fired[i] ≥ 1 → 本回合不可再射击\n' +
                  '· 部分技能可重置 fired（如徐进弹幕）',
          formula: 'fired[i] 达到 1 后武器槽锁定',
          source: 'original'
        },
        {
          id: 'ammo', cat: 'fire', name: '弹药（ammo）', icon: '🔫', key: '—',
          summary: '每件武器的弹药储备',
          detail: '弹药独立于射速：\n' +
                  '· 步枪 200~300 发\n' +
                  '· 机枪 600~1200 发\n' +
                  '· 主炮 20~40 发\n' +
                  '· 导弹 2~8 发\n' +
                  '· 火箭炮 12~40 发\n\n' +
                  '· 弹药耗尽 → 无法使用该武器\n' +
                  '· 通过补给车/补给点补充（部分 Mod）',
          formula: 'ammo - fired_count 为剩余弹量',
          source: 'original'
        },
        {
          id: 'weapon-type', cat: 'fire', name: '武器类型一览', icon: '📚', key: '—',
          summary: '17 种武器大类及其战术定位',
          detail: 'rifle 步枪 — 基础步兵武器，近距离高效\n' +
                  'mg 机枪 — 压制力强，可连射\n' +
                  'sniper 狙击 — 超远射程，高精度\n' +
                  'gl 榴弹 — 面伤，反软目标\n' +
                  'rpg 火箭 — 中距反装甲，无制导\n' +
                  'atgm 反坦克导弹 — 制导，反装甲主力\n' +
                  'cannon 主炮 — 坦克炮，弹药分多弹种\n' +
                  'autocannon 机关炮 — 中口径连射\n' +
                  'aaa 高射炮 — 对空，兼对地\n' +
                  'howitzer 榴弹炮 — 曲射主力\n' +
                  'mortar 迫击炮 — 近距曲射，高抛\n' +
                  'mlrs 火箭炮 — 面覆盖\n' +
                  'sam 防空导弹 — 制导对空\n' +
                  'manpads 便携防空 — 短程对空\n' +
                  'drone 巡飞弹 — 自杀攻击\n' +
                  'laser 激光 — 直射，穿透\n' +
                  'ew 电子战 — 干扰/EMP\n' +
                  'radar 雷达 — 探测/引导',
          formula: '不同 t 类型影响 AI 武器选择评分',
          source: 'original'
        },
        {
          id: 'guidance', cat: 'fire', name: '制导武器（guid）', icon: '🎯', key: '—',
          summary: 'guid=1 表示制导武器，无视部分修正',
          detail: 'guid 字段标识制导武器（导弹、精确制导弹药）：\n' +
                  '· 命中率受距离影响小\n' +
                  '· 不受移动惩罚\n' +
                  '· 可被 APS 主动防御系统拦截\n' +
                  '· 部分可被电子干扰影响',
          formula: 'guid=1 → 距离/移动惩罚减半或免除',
          source: 'original'
        },
        {
          id: 'top-attack', cat: 'fire', name: '攻顶武器（top）', icon: '⬇️', key: '—',
          summary: 'top=1 表示可攻击装甲顶部',
          detail: 'top=1 的武器可攻击目标顶部装甲：\n' +
                  '· 标枪、NLAW、红箭-12、陶式等\n' +
                  '· 顶部装甲通常只有正面的 1/4~1/8\n' +
                  '· 无视反应装甲（ERA）\n' +
                  '· 命中率略低于直射',
          formula: '命中时 armourAt() 返回 target.armor.t',
          source: 'original'
        },
        {
          id: 'suppression', cat: 'fire', name: '压制值（sup）', icon: '💢', key: '—',
          summary: '武器命中时可增加目标压制值',
          detail: 'sup 字段表示该武器命中时附加的压制：\n' +
                  '· 机枪/榴弹/迫击炮通常 sup>0\n' +
                  '· 压制值累积到一定程度：\n' +
                  '  - sup 越高，命中率越低\n' +
                  '  - sup > 16 时无法主动行动\n' +
                  '  - sup 满 20 时可能撤退/崩溃\n\n' +
                  '每回合结束 sup 会自然衰减。',
          formula: 'sup 累积上限 20；>16 无法行动',
          source: 'original'
        },
        {
          id: 'band', cat: 'fire', name: '通信波段（band）', icon: '📻', key: '—',
          summary: '制导武器的通信/制导波段',
          detail: 'band 字段标识武器的通信波段：\n' +
                  '· RADAR 雷达制导（可被反辐射打击）\n' +
                  '· IR 红外制导（受热诱饵影响）\n' +
                  '· SATCOM 卫星制导（远程弹道导弹）\n' +
                  '· UHF/VHF 无线电制导（可被干扰）\n\n' +
                  '· 对应波段被干扰时，该武器无法使用\n' +
                  '· 电子战单位可压制特定波段',
          formula: 'jammedBands 包含 band 时该武器禁用',
          source: 'original'
        },

        /* ==================== 装甲与伤害 ==================== */
        {
          id: 'armor-3way', cat: 'armor', name: '三向装甲（f/s/t）', icon: '🛡️', key: '—',
          summary: '前/侧/顶三个方向的独立装甲值',
          detail: '每个装甲单位拥有三向装甲：\n' +
                  '· f（front 前）：最厚，正面迎敌\n' +
                  '· s（side 侧）：中等，侧击有效\n' +
                  '· t（top 顶）：最薄，攻顶武器致命\n\n' +
                  '常见比例（以主战坦克为例）：\n' +
                  '· 前 800~1200 / 侧 400~600 / 顶 100~250\n\n' +
                  '后方受击时引擎按 "侧装甲 × 0.8 + 10° 倾角" 计算。\n' +
                  '受击方向由 getHitFacing(shooter, target) 判定。',
          formula: 'armourAt() 根据受击方向返回 f/s/t',
          source: 'original'
        },
        {
          id: 'get-facing', cat: 'armor', name: '受击方向判定', icon: '🧭', key: '—',
          summary: '根据攻击来袭方向判定命中部位',
          detail: 'getHitFacing(target, shooter) 根据单位朝向和来袭方向返回：\n' +
                  '· front（正面）：来袭方向在朝向 ±60° 内\n' +
                  '· side（侧面）：±60° ~ ±120°\n' +
                  '· rear（后方）：> ±120°\n\n' +
                   '⚠ rear 受击时装甲按侧装甲 × 0.8 计算，且倾角为 10°。\n' +
                  '战术：绕到敌侧后攻击，可穿透更薄的侧面装甲。',
          formula: '朝向夹角 |θ| < 60° → front；< 120° → side；否则 rear',
          source: 'original'
        },
                {
          id: 'rear-armor', cat: 'armor', name: '后装甲与后方受击', icon: '🔙', key: '—',
          summary: '后装甲无独立字段，由侧装甲推导 + 独立倾角判定',
          detail: '【数据结构】\n' +
                  '原版单位 def.armor 只有三向字段：\n' +
                  '  armor = { f: 前, s: 侧, t: 顶 }\n' +
                  '没有独立的 rear 字段。\n\n' +
                  '【armourAt 取值规则】\n' +
                  'armourAt(target, hitFacing, isTop) 按方向返回：\n' +
                  '· isTop = true        → target.armor.t（顶部）\n' +
                  '· hitFacing = front   → target.armor.f（正面）\n' +
                  '· hitFacing = side    → target.armor.s（侧面）\n' +
                  '· hitFacing = rear    → target.armor.s × 0.8（侧装甲打折）\n\n' +
                  '即：后装甲 ≈ 侧装甲 × 0.8，比侧面更薄 20%。\n\n' +
                  '【倾角修正（slopeAngle）】\n' +
                  '· 正面 30°（斜面装甲，等效增厚）\n' +
                  '· 侧面 0°（垂直）\n' +
                  '· 后方 10°（轻微后倾）\n\n' +
                  'slopeMult = 1 / cos(angle)：\n' +
                  '· 正面 ×1.15\n' +
                  '· 侧面 ×1.00\n' +
                  '· 后方 ×1.02\n\n' +
                  '【有效装甲对比】\n' +
                  '以 M1A2（f=850, s=400, t=150）为例：\n' +
                  '· 正面有效 = 850 × 1.15 = 977\n' +
                  '· 侧面有效 = 400 × 1.00 = 400\n' +
                  '· 后方有效 = 400×0.8 × 1.02 = 326\n' +
                  '· 顶部有效 = 150 × 1.00 = 150\n\n' +
                  '后方约为正面的 33%，顶部约为正面的 15%。\n\n' +
                  '【受击方向判定（getHitFacing）】\n' +
                  '根据来袭方向与目标朝向的夹角 θ：\n' +
                  '· |θ| < 60°  → front\n' +
                  '· 60° ≤ |θ| < 120° → side\n' +
                  '· |θ| ≥ 120° → rear\n\n' +
                  '【后方受击的战术价值】\n' +
                  '· 穿深需求比正面低约 2/3\n' +
                  '· 命中部位概率偏向发动机（50%）→ 直接瘫痪\n' +
                  '· 倾角最小，APFSDS 斜面优势失效\n' +
                  '· 绕后打击是击毁重型坦克最高效的方式',
          formula: 'rear 装甲 = side × 0.8；倾角 10° → ×1.02',
          source: 'original / tank-damage'
        },
        {
          id: 'penetration', cat: 'armor', name: '穿深（pen）', icon: '🔪', key: '—',
          summary: '武器的穿甲能力',
          detail: 'pen 是武器穿深值，直接对比目标装甲：\n' +
                  '· 步枪/机枪 pen 0~20（对装甲无效）\n' +
                  '· RPG 300~500\n' +
                  '· 反坦克导弹 700~1000\n' +
                  '· 主炮 600~900（APFSDS）\n' +
                  '· 反舰/战略武器 1500+\n\n' +
                  '穿深远低于装甲 → 几乎无伤\n' +
                  '穿深略高 → 中等伤害\n' +
                  '穿深远高于装甲 → 重创/秒杀',
          formula: '有效伤害取决于 pen vs 有效装甲',
          source: 'original'
        },
        {
          id: 'add-armor', cat: 'armor', name: '附加装甲（addArmor）', icon: '➕', key: '—',
          summary: '单位额外的装甲加成',
          detail: 'addArmor 是单位定义中的固定装甲加成：\n' +
                  '· 通常是复合装甲、附加装甲板\n' +
                  '· 直接加到各方向装甲值上\n' +
                  '· 与 era/aps 叠加使用\n\n' +
                  '参考：M1A2 addArmor 150 / T-90M addArmor 150',
          formula: '实际装甲 = f/s/t + addArmor',
          source: 'original'
        },
        {
          id: 'era', cat: 'armor', name: '反应装甲（ERA）', icon: '💥', key: '—',
          summary: '爆炸反应装甲，克制 HEAT',
          detail: 'era > 0 表示装备反应装甲：\n' +
                  '· 对 HEAT（破甲弹）大幅削弱（×0.4）\n' +
                  '· 对 APFSDS 无效\n' +
                  '· 对 HESH 部分削弱\n' +
                  '· 是苏系/中系坦克的标志性装备\n\n' +
                  'era=1 轻型反应装甲；era=2 重型复合反应装甲',
          formula: 'HEAT pen × 0.4（era>0 时）',
          source: 'original'
        },
        {
          id: 'aps', cat: 'armor', name: '主动防御（APS）', icon: '🛰️', key: '—',
          summary: '主动拦截来袭导弹',
          detail: 'aps > 0 表示装备主动防御系统：\n' +
                  '· 对制导导弹（atgm/rpg/drone）有拦截概率\n' +
                  '· 对 APFSDS/HEAT 无影响\n' +
                  '· aps=1 基础拦截 / aps=2 高效拦截 / aps=3 顶级拦截\n\n' +
                  '代表：以色列 Trophy、俄罗斯 Arena、中国 GL5',
          formula: '制导武器命中率 × (1 - aps×0.15)',
          source: 'original'
        },
        {
          id: 'compute-damage', cat: 'armor', name: '伤害计算流程', icon: '⚙️', key: '—',
          summary: '从命中到扣血的完整流程',
          detail: 'computeDamage(w, target, isSoft, hitFacing, isTop) 流程：\n' +
                  '① 判断目标是否软目标（步兵/工事）\n' +
                  '② 软目标 → 直接伤害公式（HE/榴弹高效）\n' +
                  '③ 装甲目标：\n' +
                  '  - 获取 armourAt(target, hitFacing, isTop)\n' +
                  '  - 计算倾角修正 slopeMult\n' +
                  '  - 比较 pen 与有效装甲\n' +
                  '  - 返回伤害系数 0.05 ~ 4.2\n' +
                  '④ 最终 HP 减少 = dmg × 单位 maxHp 比例',
          formula: 'pen ≥ 1.1×armor → 2.2~4.2\npen ≥ 0.6×armor → 0.6~1.6\nelse → 0.05~0.35',
          source: 'original'
        },
        {
          id: 'soft-target', cat: 'armor', name: '软目标 vs 硬目标', icon: '🎯', key: '—',
          summary: '步兵/工事为软目标，装甲为硬目标',
          detail: '软目标（isSoft=true）：\n' +
                  '· INF / SF / RECON / ENG / FORT / MINE\n' +
                  '· 对 HE / 榴弹 / 机枪高效\n' +
                  '· 对 APFSDS 几乎无效（穿透不了肉体）\n\n' +
                  '硬目标：\n' +
                  '· ARM / IFV / APC / NAV / HELI\n' +
                  '· 对 APFSDS / HEAT / ATGM 高效\n' +
                  '· 对步枪免疫',
          formula: '武器类型与目标类型的匹配度影响 AI 武器选择',
          source: 'original'
        },
        {
          id: 'facing-angle', cat: 'armor', name: '倾角修正', icon: '📐', key: '—',
          summary: '斜面装甲等效厚度增加',
          detail: 'slopeAngle(hitFacing) 返回入射角：\n' +
                  '· 正面 30°（斜面装甲）\n' +
                  '· 侧面 0°（垂直）\n' +
                  '· 后方 10°\n\n' +
                  'slopeMult = 1 / cos(angle)：\n' +
                  '· 正面：×1.15（等效装甲增厚）\n' +
                  '· 侧面：×1.0\n\n' +
                  'APFSDS 对斜面有优势（pen × 1.4 倾斜穿透）\n' +
                  'HEAT 对斜面劣势（pen ÷ 1.15）',
          formula: 'APFSDS: pen × (1+0.4×(slopeMult-1))\nHEAT: pen ÷ slopeMult',
          source: 'original'
        },

        /* ==================== 单位与武器（属性） ==================== */
        {
          id: 'unit-cat', cat: 'unit', name: '单位类别（cat）', icon: '🏷️', key: '—',
          summary: '17 种单位大类',
          detail: 'INF 步兵 — 基础战斗单位\n' +
                  'SF 特种 — 高训练、高隐蔽\n' +
                  'RECON 侦察 — 大视野、隐蔽\n' +
                  'ARM 装甲 — 主战坦克\n' +
                  'IFV 步战车 — 载员 + 火力\n' +
                  'APC 装甲输送车 — 载员\n' +
                  'ARTY 火炮 — 曲射火力\n' +
                  'AD 防空 — 对空/反导\n' +
                  'EW 电子战 — 干扰/EMP\n' +
                  'AIR 空军 — 制空/对地\n' +
                  'HELI 直升机 — 空中支援\n' +
                  'UAV 无人机 — 侦察/打击\n' +
                  'NAV 舰艇 — 海上单位\n' +
                  'FORT 工事 — 固定防御\n' +
                  'MINE 地雷 — 不可移动\n' +
                  'ENG 工兵 — 排雷/架桥\n' +
                  'LOG 后勤 — 补给\n' +
                  'MEDIC 医疗 — 治疗',
          formula: 'cat 影响视野/移动/AI 评分/可载性',
          source: 'original'
        },
        {
          id: 'unit-stats', cat: 'unit', name: '单位属性详解', icon: '📊', key: '—',
          summary: 'men/morale/training/stealth/pts 等核心属性',
          detail: 'men（兵员数）— 决定基础 HP（men × 倍率）\n' +
                  'morale（士气）— 1~10，影响崩溃/投降\n' +
                  'training（训练）— 1~10，影响命中率加成\n' +
                  'stealth（隐蔽）— 0~10，影响被发现距离\n' +
                  'pts（分值）— 战术价值\n' +
                  'mp（行动点）— 移动点数\n' +
                  'armor（f/s/t）— 三向装甲\n' +
                  'sens（v/t/radar/sig）— 视野/热像/雷达/信号特征\n' +
                  'ew（jam/eccm/decoy）— 干扰/抗干扰/诱饵\n' +
                  'cap（标签）— 特性标签字符串',
          formula: 'HP = men × 兵种类别倍率（MOD可覆盖）',
          source: 'original'
        },
        {
          id: 'carry', cat: 'unit', name: '载员系统（carry）', icon: '🚛', key: 'G',
          summary: '运输车可搭载步兵单位',
          detail: 'carry 字段表示可搭载单位数量：\n' +
                  '· 步兵可上车 → carriedBy = 载体\n' +
                  '· 载体被毁 → 步兵单位一并损失\n' +
                  '· 上车/下车消耗 MP\n\n' +
                  '代表：APC/IFV/直升机/运输车 carry=1~3\n' +
                  '城市建筑（居民楼/大厦）也可作为掩体承载步兵。',
          formula: 'carry=0 不可载人；>0 可载对应数量',
          source: 'original'
        },
        {
          id: 'sig', cat: 'unit', name: '信号特征（sig）', icon: '📶', key: '—',
          summary: '单位的电磁/雷达信号特征',
          detail: 'sig 字段表示单位的可探测性（信号特征）：\n' +
                  '· 0 = 极低（步兵、狙击手）\n' +
                  '· 2~4 = 中等（普通装甲、无人机）\n' +
                  '· 5~8 = 高（雷达车、防空雷达、指挥部）\n' +
                  '· 10 = 极高（大型雷达站、指挥中心）\n\n' +
                  '· sig 越高 → 越容易被反辐射导弹锁定\n' +
                  '· 影响 AI 威胁评估中的"雷达辐射"权重',
          formula: '高 sig → 高威胁 → 优先被打击',
          source: 'original'
        },

        /* ==================== 电子战 ==================== */
        {
          id: 'jam', cat: 'ew', name: '干扰（jam）', icon: '📡', key: '—',
          summary: '电子战单位的主动干扰能力',
          detail: 'jam 字段表示干扰强度（0~10）：\n' +
                  '· 影响目标单位的视野/命中/通信\n' +
                  '· 对特定波段武器直接禁用\n' +
                  '· 干扰单位自身暴露（sig 高）\n\n' +
                  '干扰效果：\n' +
                  '· 视野 × (1 - jam/30)（最低 15%）\n' +
                  '· 通信链路下降\n' +
                  '· 制导武器命中率下降',
          formula: '视野 × clamp(1 - jam/30, 0.15, 1)',
          source: 'original'
        },
        {
          id: 'eccm', cat: 'ew', name: '抗干扰（eccm）', icon: '🛡️', key: '—',
          summary: '抵抗敌方电子干扰的能力',
          detail: 'eccm 字段表示抗干扰等级（0~10）：\n' +
                  '· 直接减免敌方 jam 效果\n' +
                  '· eccm 越高 → 被干扰时受损越小\n' +
                  '· 现代装备标配 eccm 2~4\n' +
                  '· 特种/指挥单位 eccm 5+',
          formula: '有效干扰 = max(0, 敌方 jam - 己方 eccm)',
          source: 'original'
        },
        {
          id: 'decoy', cat: 'ew', name: '诱饵（decoy）', icon: '🎭', key: '—',
          summary: '诱骗敌方制导武器',
          detail: 'decoy 字段表示诱饵能力（0~2）：\n' +
                  '· 制导武器命中时有概率被诱偏\n' +
                  '· decoy=1 基础诱饵（部分现代装备）\n' +
                  '· decoy=2 高级诱饵（顶级装备）\n\n' +
                  '对红外制导（IR band）特别有效。',
          formula: '制导武器命中率 × (1 - decoy×0.1)',
          source: 'original'
        },
        {
          id: 'comm-link', cat: 'ew', name: '通信链路（commLinks）', icon: '🔗', key: '—',
          summary: '阵营通信链路强度',
          detail: 'G.commLinks[side].strength 是阵营级通信状态（0~100%）：\n' +
                  '· > 50% → 正常\n' +
                  '· < 50% → 视野 ×0.8，指令可能延迟\n' +
                  '· 失去指挥单位 → 大幅下降\n\n' +
                  '· 被干扰会降低通信链路\n' +
                  '· 有指挥/通信中继单位会提升',
          formula: '< 50% → 视野 ×0.8 + 指令延迟风险',
          source: 'original'
        },
        {
          id: 'spectrum-load', cat: 'ew', name: '频谱负载（spectrumLoad）', icon: '📊', key: '—',
          summary: '阵营电磁频谱使用强度',
          detail: 'G.spectrumLoad[side] 表示频谱占用程度：\n' +
                  '· 大量电子设备同时开机 → 频谱拥挤\n' +
                  '· 高负载可能影响通信/雷达效率\n' +
                  '· 由 computeEW() 每回合重算',
          formula: '多单位雷达/干扰同时开机 → 频谱负载上升',
          source: 'original'
        },
        {
          id: 'ew-actions', cat: 'ew', name: '电子战行动', icon: '⚡', key: '—',
          summary: '电子战单位的特殊行动（干扰/侦察/欺骗）',
          detail: '电子战单位可执行特殊行动：\n' +
                  '· 干扰（jam）：压制敌通信/雷达\n' +
                  '· 侦察（recon）：增强己方视野\n' +
                  '· 欺骗（decoy）：释放假信号\n\n' +
                  '通过电子战控制台（EW Console）执行。',
          formula: '需选择电子战模式 → 点击目标格',
          source: 'original'
        },

        /* ==================== 指挥与士气 ==================== */
        {
          id: 'morale', cat: 'c2', name: '士气值（morale）', icon: '🎖️', key: '—',
          summary: '单位的战斗意志（1~10）',
          detail: 'morale 影响：\n' +
                  '· 士气 < 5 时可能投降/撤退\n' +
                  '· 士气归零时可能崩溃\n' +
                  '· 连续被压制会降低士气\n' +
                  '· 失去 HQ 全军 -3\n\n' +
                  '参考值：\n' +
                  '· 民兵 5 / 正规军 7 / 特种 9 / 精锐 10',
          formula: '低士气 + 被包围 → 投降判定',
          source: 'original'
        },
        {
          id: 'training', cat: 'c2', name: '训练值（training）', icon: '🎓', key: '—',
          summary: '单位的训练水平（1~10）',
          detail: 'training 影响：\n' +
                  '· 命中率微加成\n' +
                  '· 士气恢复速度\n' +
                  '· 抗压制能力\n' +
                  '· AI 行为表现\n\n' +
                  '参考值：民兵 4 / 正规军 7 / 特种 10',
          formula: '高训练 → 高稳定性和命中率',
          source: 'original'
        },
        {
          id: 'stance', cat: 'c2', name: '战术姿态（stance）', icon: '🎖️', key: 'S',
          summary: '进攻 / 防御 / 默认姿态',
          detail: '按 S 切换单位姿态：\n' +
                  '· attack（进攻）：视野 ×0.9，但移动/命中略加成\n' +
                  '· defense（防御）：视野 ×1.15，隐蔽提升\n' +
                  '· 默认：无修正\n\n' +
                  '防御姿态 + 静止 + 掩体 = 难以被发现',
          formula: '防御 +15% 视野；进攻 -10% 视野',
          source: 'original'
        },
        {
          id: 'dug-in', cat: 'c2', name: '挖战壕（dugIn）', icon: '⛏️', key: '—',
          summary: '步兵原地待命可挖战壕',
          detail: 'dugIn > 0 表示单位已构筑防御工事：\n' +
                  '· 大幅提升隐蔽\n' +
                  '· 减少被命中概率\n' +
                  '· 移动后 dugIn 清零\n' +
                  '· 与防御姿态叠加',
          formula: 'dugIn + 防御姿态 → 极难被发现',
          source: 'original'
        },
        {
          id: 'morale-crash', cat: 'c2', name: '士气崩溃', icon: '💀', key: '—',
          summary: '低血低士气单位可能自动投降',
          detail: '投降判定（c2-morale Mod）：\n' +
                  '· HP < 20%\n' +
                  '· 周围 ≥ 3 个敌人\n' +
                  '· 无友军相邻\n' +
                  '· 士气 < 5\n\n' +
                  '全部满足 → 单位投降消失。',
          formula: 'HP<20% ∧ 3+敌 ∧ 0友 ∧ morale<5',
          source: 'c2-morale'
        },
        {
          id: 'hq-loss', cat: 'c2', name: '指挥链崩溃', icon: '📉', key: '—',
          summary: 'HQ 被毁导致全军士气下降',
          detail: '当一方指挥单位（cap 含"指挥"）被摧毁时：\n' +
                  '· 该方所有单位 MP ×0.5\n' +
                  '· 士气 -3\n' +
                  '· AI 单位强制撤退',
          formula: 'MP ×0.5；morale -3；AI 强制撤退',
          source: 'c2-morale'
        },

        /* ==================== 后勤消耗 ==================== */
        {
          id: 'fuel', cat: 'logi', name: '燃油系统', icon: '⛽', key: '—',
          summary: '车辆/飞机移动消耗燃油',
          detail: '所有 wheel/track/air 单位：\n' +
                  '· 每移动 1 格消耗 5% 燃油\n' +
                  '· 燃油归零 → MP=0\n' +
                  '· 回合结束在补给车/HQ 4 格内 → +30%\n' +
                  '· 断补给 → -5%/回合',
          formula: '移动 -5%/格；补给 +30%；断供 -5%/回合',
          source: 'logistics'
        },
        {
          id: 'supply', cat: 'logi', name: '补给系统', icon: '📦', key: '—',
          summary: '补给车为周围单位补充燃油/弹药',
          detail: '补给单位（cap 含"补给"）：\n' +
                  '· 周围 4 格友军每回合恢复燃油\n' +
                  '· 部分 Mod 可补充弹药\n' +
                  '· 补给单位自身脆弱需保护',
          formula: '半径 4 格；每回合 +30% 燃油',
          source: 'logistics'
        },

        /* ==================== 地形与天气 ==================== */
        {
          id: 'terrain-attrs', cat: 'env', name: '地形属性（cov/con/elev）', icon: '🗺️', key: '—',
          summary: '每种地形拥有掩护/隐蔽/高程三属性',
          detail: 'TERRAIN 表中每种地形包含：\n' +
                  '· cov（cover）— 掩护值，减少被命中率\n' +
                  '· con（concealment）— 隐蔽值，减少被发现距离\n' +
                  '· elev（elevation）— 高程，影响 LOS\n\n' +
                  '典型地形：\n' +
                  '· 开阔地 cov 0 / con 0\n' +
                  '· 森林 cov 0.3 / con 0.5\n' +
                  '· 城市 cov 0.5 / con 0.6\n' +
                  '· 山地 cov 0.4 / con 0.4 / elev 2\n' +
                  '· 废墟 cov 0.3 / con 0.4',
          formula: 'con ≥ 0.4 → 满足"高隐蔽地形"条件',
          source: 'original'
        },
        {
          id: 'terrain-move', cat: 'env', name: '地形移动消耗', icon: '🚶', key: '—',
          summary: '不同地形消耗不同 MP',
          detail: 'reachableCells 计算移动范围时：\n' +
                  '· 平原/道路：1 MP/格\n' +
                  '· 丘陵：2 MP/格\n' +
                  '· 森林/城市：2 MP/格\n' +
                  '· 山地：3 MP/格\n' +
                  '· 河流/海洋：不可通行（除两栖）\n\n' +
                  '轮式单位在泥地/森林额外消耗。',
          formula: 'mp 剩余越多 → 可达格越远',
          source: 'original'
        },
        {
          id: 'fort-mine', cat: 'env', name: '工事与地雷', icon: '🚧', key: '—',
          summary: 'cell.fort / cell.mine 提供防御或威胁',
          detail: '· cell.fort > 0：掩体，减少被命中率\n' +
                  '· cell.mine > 0：地雷，移动进入时受损\n\n' +
                  '工兵（ENG）可清除地雷或构筑工事。\n' +
                  '重型火力可摧毁工事（urban-destruction Mod）。',
          formula: 'fort 减命中；mine 造成移动伤害',
          source: 'original'
        },
        {
          id: 'weather', cat: 'env', name: '动态天气', icon: '🌦️', key: '—',
          summary: '回合结束有概率切换天气',
          detail: '天气类型：\n' +
                  '· ☀️ 晴朗 — 无修正\n' +
                  '· 🌧️ 降雨 — 命中 ×0.85，视野 ×0.85\n' +
                  '· 🌫️ 浓雾 — 视野 ×0.65\n' +
                  '· ⛈️ 暴风雨 — 命中 ×0.85，视野 ×0.75，对空 ×0.8',
          formula: '每回合结束 40% 切换',
          source: 'ultimate-upgrade'
        },
        {
          id: 'terrain-destroy', cat: 'env', name: '地形破坏', icon: '💥', key: '—',
          summary: '重火力摧毁城市/森林',
          detail: '重型间接火力（howitzer/mlrs/mortar/drone）：\n' +
                  '· 摧毁掩体（fort → 0）\n' +
                  '· 城市/村庄 → 废墟（rubble）\n' +
                  '· 森林 → 泥地（mud）',
          formula: 'city/village→rubble；forest→mud',
          source: 'urban-destruction'
        },
        {
          id: 'urban-penalty', cat: 'env', name: '城市视野惩罚', icon: '🏙️', key: '—',
          summary: '城市/废墟中视野 -40%',
          detail: '在城市、首都、工业区、废墟中：\n' +
                  '· sensorRange ×0.6\n' +
                  '· 适合防守方利用复杂地形',
          formula: '视野 ×0.6',
          source: 'urban-destruction'
        },
        {
          id: 'terrain-render', cat: 'env', name: '地形渲染增强', icon: '🗺️', key: 'H / J',
          summary: '显示等高线与高程数字',
          detail: '· H：切换等高线（虚线，颜色随高度变化）\n' +
                  '· J：切换高程数字（1 层 = 100m）',
          formula: 'H 等高线；J 数字',
          source: 'terrain-enhance'
        },

        /* ==================== 特殊战术 ==================== */
        {
          id: 'area-fire', cat: 'tactic', name: '空地打击', icon: '💣', key: 'R',
          summary: '任何武器均可对空地发起区域打击',
          detail: '原生机制只允许曲射/远程单位区域射击。本机制移除此限制，任何武器只要射程足够，即可对指定空地进行区域火力覆盖，' +
                  '对格内及相邻 1 格内的所有敌方单位造成压制和少量伤害。',
          formula: '压制 +5~10；命中率随距离和隐蔽度递减',
          source: 'advanced-combat'
        },
        {
          id: 'mg-suppress', cat: 'tactic', name: '机枪压制', icon: '🔫', key: '—',
          summary: '机枪命中后附带巨额压制力',
          detail: '机枪类武器（t=mg）命中目标时：\n' +
                  '· 额外增加压制值 6 点\n' +
                  '· 士气 -1.2\n' +
                  '· 压制值过高的单位无法主动行动',
          formula: '压制 +6（上限 20）；士气 -1.2',
          source: 'advanced-combat'
        },
        {
          id: 'hit-chance-mod', cat: 'tactic', name: '命中率修正扩展', icon: '🎲', key: '—',
          summary: '行进惩罚 / 反斜面惩罚 / AI 威胁加成',
          detail: '① 行进射击：车辆命中率 ×0.5，步兵 ×0.7\n' +
                  '② 反斜面：从低处射击高处山脊后的目标 ×0.2\n' +
                  '③ AI 优先瞄准高威胁目标（+10%），复仇射击 +5%',
          formula: '行进 ×0.5/0.7；反斜面 ×0.2；AI ×1.10',
          source: 'advanced-combat / ai-advanced'
        },
        {
          id: 'tank-damage', cat: 'tactic', name: '坦克多部位伤害', icon: '🔩', key: '—',
          summary: '装甲单位分为 6 个独立部位',
          detail: '每辆坦克/步战车拥有 6 个独立部位：\n' +
                  '· 履带断裂 → MP 减半\n' +
                  '· 发动机损毁 → MP 归零\n' +
                  '· 火炮损毁 → 无法开火\n' +
                  '· 炮塔卡死 → 命中率 -20%\n' +
                  '· 弹药架殉爆 → 立即死亡\n' +
                  '· 车体受损 → 直接减血',
          formula: '按受击方向和弹种随机判定部位',
          source: 'tank-damage'
        },
        {
          id: 'multi-ammo', cat: 'tactic', name: '多弹种切换', icon: '🎯', key: '1-9',
          summary: '现役坦克按 1-9 切换弹种',
          detail: '· APFSDS 穿甲弹 — 对装甲最有效\n' +
                  '· HEAT 破甲弹 — 被 ERA 克制\n' +
                  '· HE 榴弹 — 对软目标高效\n' +
                  '· HESH 碎甲弹 — 对工事有效',
          formula: '按 1~9 切换武器槽',
          source: 'tank-damage'
        },
        {
          id: 'smoke', cat: 'tactic', name: '烟幕弹投放', icon: '💨', key: 'T',
          summary: '鼠标悬停格投放烟幕，阻断视线',
          detail: '选中己方单位后按 T：\n' +
                  '· 消耗 1 MP\n' +
                  '· 持续 2 回合\n' +
                  '· 阻断 hasLOS 判定\n' +
                  '· 烟幕内任何单位无法被观察',
          formula: 'MP -1；持续 2 回合',
          source: 'advanced-combat'
        },
        {
          id: 'creeping-barrage', cat: 'tactic', name: '徐进弹幕', icon: '🎇', key: 'B',
          summary: '呼叫持续 3 回合的徐进弹幕',
          detail: '选中火炮单位后按 B：\n' +
                  '· 持续 3 回合\n' +
                  '· 每回合本方所有火炮对区域压制射击\n' +
                  '· 弹幕区域每回合向前推进 1 格\n' +
                  '· 临时解除"已开火"状态\n' +
                  '· 弹幕区域以橙色虚线圆圈标出',
          formula: '持续 3 回合；每回合 r-1 推进',
          source: 'advanced-combat'
        },
        {
          id: 'emp', cat: 'tactic', name: 'EMP 电磁脉冲', icon: '⚡', key: '—',
          summary: 'EMP 武器命中后范围瘫痪电子设备',
          detail: 'EMP 类武器命中触发范围电子瘫痪：\n' +
                  '· 半径 1~2 格内电子设备受影响\n' +
                  '· 目标获得 2 回合脉冲眩晕、3 回合传感器失效\n' +
                  '· 干扰值 +15\n\n' +
                  '影响：雷达车、电子战、无人机、直升机、防空、空军',
          formula: '半径 1~2；眩晕 2；传感器 -3；干扰 +15',
          source: 'advanced-warfare'
        },
        {
          id: 'fullband', cat: 'tactic', name: '全频带阻塞干扰', icon: '📡', key: 'Z',
          summary: '全频带干扰机大范围瘫痪电子设备',
          detail: '选中全频带干扰机后按 Z 进入瞄准，点击释放：\n' +
                  '· 消耗 4 MP\n' +
                  '· 半径 6 格内所有敌方电子单位：\n' +
                  '  - 眩晕 3 回合\n' +
                  '  - 干扰值 +50\n' +
                  '  - 雷达强制关机 3 回合\n' +
                  '· 区域持续 3 回合',
          formula: 'MP -4；半径 6 格；持续 3 回合',
          source: 'millennium-emp'
        },
        {
          id: 'nuclear', cat: 'tactic', name: '核打击', icon: '☢️', key: '—',
          summary: '战术/战略核弹范围杀伤并留下辐射',
          detail: '核载具发射核弹时：\n' +
                  '· 战术核弹（10kt）：半径 2 格\n' +
                  '· 战略核弹（MIRV）：半径 4 格\n' +
                  '· 伤害随距离递减（无视装甲）\n' +
                  '· 幸存单位获得 5 回合辐射伤害\n' +
                  '· 爆炸区域留下 5 回合辐射污染',
          formula: '伤害 = maxHP × (1-d/(R+1)) + 5',
          source: 'nuclear-weapons'
        },
        {
          id: 'air-superiority', cat: 'tactic', name: '制空权拦截', icon: '✈️', key: '—',
          summary: '缺乏制空权时出击可能被拦截',
          detail: '空中单位对地攻击时：\n' +
                  '· 敌方空军 ≥ 2× 己方\n' +
                  '· 40% 概率被拦截击落\n\n' +
                  '同时 SEAD 反辐射打击会迫使敌方雷达关机 3 回合。',
          formula: '敌方空军 ≥ 2× → 40% 被拦截',
          source: 'air-superiority'
        },
        {
          id: 'ballistic', cat: 'tactic', name: '弹道导弹冲击波', icon: '🚀', key: '—',
          summary: '弹道导弹命中后产生范围冲击波',
          detail: '东风/伊斯坎德尔/ATACMS/PrSM 命中时：\n' +
                  '· 2 格（东风-26 为 3 格）冲击波\n' +
                  '· 范围内敌军 1~3 点伤害\n' +
                  '· 压制值 +5',
          formula: '半径 2~3；伤害 1~3；压制 +5',
          source: 'advanced-warfare'
        },
        {
          id: 'area-drift', cat: 'tactic', name: '火炮散布', icon: '🎯', key: '—',
          summary: '曲射火炮区域射击落点有随机偏移',
          detail: '区域射击包含曲射武器时：\n' +
                  '· 落点在 ±1 格范围内随机偏移\n' +
                  '· 真实反映间接火力的散布',
          formula: '落点偏移 ∈ {-1,0,+1}²',
          source: 'advanced-combat'
        },

        /* ==================== 火炮协议 ==================== */
        {
          id: 'arty-deploy', cat: 'arty', name: '火炮架设', icon: '🎯', key: '—',
          summary: '火炮开火前必须先架设（消耗 1MP）',
          detail: '火炮单位未部署状态开火时：\n' +
                  '· 自动消耗 1 MP 进行架设\n' +
                  '· 本次点击不开火，仅完成架设\n' +
                  '· 下回合可正常开火\n' +
                  '· 移动后自动收起阵地，需重新架设\n\n' +
                  '初始部署默认已架设。',
          formula: '首次开火 -1 MP；移动后需重新架设',
          source: 'artillery-protocol'
        },
        {
          id: 'cmd-delay', cat: 'arty', name: '指挥延迟', icon: '📡', key: '—',
          summary: '通信受扰或失去 HQ 时指令可能延迟',
          detail: '下达指令时计算通信惩罚：\n' +
                  '· 通信链路 < 50%：+1 延迟\n' +
                  '· 单位被干扰（>10）：+1 延迟\n' +
                  '· 失去 HQ：+1 延迟\n\n' +
                  '有延迟时 50% 概率指令失败。',
          formula: '每因子 +1；50% 概率失败',
          source: 'artillery-protocol'
        },

        /* ==================== 工具与复盘 ==================== */
        {
          id: 'replay', cat: 'tools', name: '战术复盘', icon: '📊', key: 'Shift+R',
          summary: '显示上回合所有射击轨迹',
          detail: '· 实线 = 命中；虚线 = 未命中\n' +
                  '· 蓝方射线蓝色，红方红色\n' +
                  '· 命中点显示黄色光点\n' +
                  '· Shift+R 清空记录',
          formula: '记录所有 afterShot 事件',
          source: 'replay-tools'
        },
        {
          id: 'measure', cat: 'tools', name: '测距工具', icon: '📏', key: 'Shift+M',
          summary: '点击地图两点测量距离',
          detail: '· Shift+M 开启测距\n' +
                  '· 第一次点击设起点\n' +
                  '· 第二次点击设终点\n' +
                  '· Esc 取消',
          formula: '每格 = 100m',
          source: 'ultimate-upgrade'
        },
        {
          id: 'minimap', cat: 'tools', name: '战术雷达（小地图）', icon: '📡', key: '—',
          summary: '右下角小地图显示全局态势',
          detail: '· 全地图地形缩略图\n' +
                  '· 蓝红点显示单位（雾战隐藏未观测敌人）\n' +
                  '· 蓝框显示当前视口\n' +
                  '· 点击跳转',
          formula: '—',
          source: 'ultimate-upgrade / true-range'
        },
        {
          id: 'ai-diff', cat: 'tools', name: 'AI 难度', icon: '🤖', key: '—',
          summary: '四档 AI 难度影响编成与决策',
          detail: '· beginner 入门 — 直射寻路（偏弱）\n' +
                  '· easy 低 — 集火协同\n' +
                  '· medium 中 — 战斗群协同\n' +
                  '· hard 高 — 全谱联合作战（最强）\n\n' +
                  '难度影响：精英占比、支援占比、质量偏好',
          formula: 'hard 精英占比 65%、支援占比 45%',
          source: 'original / budget-encounter'
        },
        {
          id: 'ai-pref', cat: 'tools', name: 'AI 战术偏好', icon: '🎯', key: '—',
          summary: '五档战术偏好',
          detail: '· offensive 进攻\n' +
                  '· defensive 防御\n' +
                  '· firepower 火力优先\n' +
                  '· maneuver 机动\n' +
                  '· signals 电子战\n\n' +
                  'LLM 指挥官（如果启用）可动态切换偏好。',
          formula: 'pref 影响 AI 单位行动评分',
          source: 'original'
        },
        {
          id: 'ai-threat', cat: 'tools', name: '威胁评估与记忆', icon: '⚠️', key: '—',
          summary: '被攻击过的单位会被 AI 标记',
          detail: 'AI 记住"谁打过我"：\n' +
                  '· 每目标保留攻击次数\n' +
                  '· 每回合衰减 30%\n' +
                  '· 威胁权重 +5% 命中率\n' +
                  '· 高威胁目标额外 +10%\n' +
                  '· 玩家单位被 AI 锁定头顶显示 ⚠',
          formula: '威胁次数 ×18 权重；命中 ×1.05~1.10',
          source: 'ai-advanced'
        },
        {
          id: 'realistic-vision', cat: 'vision', name: '真实视野', icon: '👁️', key: 'Shift+V',
          summary: '使用真实感知范围取代原版视野',
          detail: '启用后：\n' +
                  '· 步兵 1100m / 特种 1300m / 侦察 1900m / 装甲 2200m\n' +
                  '· 直升机 3500m / 战机 5000m / 无人机 4000m+\n' +
                  '· 装备加成：夜视 +2 / 红外 +6 / 狙击 +4 / 侦察 +4\n' +
                  '· 静止+防御+掩体 → 隐蔽 → 需贴脸\n' +
                  '· 开火/移动会暴露\n' +
                  '· 侦察兵/热成像可看穿伪装\n\n' +
                  'Shift+V 切换；控制台 sightDebug() 查看。',
          formula: '开火/移动=暴露；静止+防御+掩体 → 2 格或半距',
          source: 'realistic-vision'
        },
        {
          id: 'iads', cat: 'vision', name: '防空 IADS 网络', icon: '📡', key: '—',
          summary: '防空单位可借用雷达网络视野',
          detail: '本方有雷达开机时：\n' +
                  '· 所有防空单位可借用共享雷达视野\n' +
                  '· 打击距离达 20 格\n' +
                  '· 实现网络化防空',
          formula: '有雷达存活 → 防空射程 20 格',
          source: 'air-superiority'
        },
        {
          id: 'sead', cat: 'vision', name: 'SEAD 反辐射', icon: '🎯', key: '—',
          summary: '反辐射武器命中迫使雷达关机',
          detail: '反辐射武器命中带雷达目标时：\n' +
                  '· 目标雷达强制关机 3 回合\n' +
                  '· 期间失去 IADS 共享视野\n' +
                  '· 3 回合后自动恢复',
          formula: '命中 → 雷达关机 3 回合',
          source: 'air-superiority'
        },
        {
          id: 'stats', cat: 'c2', name: '战术日志（战损面板）', icon: '📊', key: '—',
          summary: '右侧面板实时显示战损比',
          detail: '战损面板显示：\n' +
                  '· 蓝方击杀 / 损失\n' +
                  '· 红方击杀 / 损失\n' +
                  '· 双方获得分值',
          formula: '—',
          source: 'advanced-combat'
        }
      ];

      /* ============================================================
       * 3) 搜索 + 过滤
       * ============================================================ */
      let currentCat = 'all';
      let searchQuery = '';

      function searchEntries() {
        const q = searchQuery.toLowerCase().trim();
        return ENTRIES.filter(e => {
          if (currentCat !== 'all' && e.cat !== currentCat) return false;
          if (!q) return true;
          const hay = (e.name + ' ' + e.summary + ' ' + e.detail + ' ' + e.key + ' ' + e.source).toLowerCase();
          return hay.includes(q);
        });
      }

      /* ============================================================
       * 4) UI 构建
       * ============================================================ */
      function buildButton() {
        if (document.getElementById('btnTacticalManual')) return;
        const top = document.getElementById('topbar');
        if (!top) { setTimeout(buildButton, 500); return; }

        const btn = document.createElement('button');
        btn.id = 'btnTacticalManual';
        btn.textContent = '📖 战术手册';
        btn.style.cssText = 'background:#1a2332;border:1px solid #d0a0e0;color:#d0a0e0;font-weight:bold';

        const ref = document.getElementById('btnDatabase');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
        else top.appendChild(btn);

        btn.onclick = openManual;
      }

      function openManual() {
        let modal = document.getElementById('tacticalManualModal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'tacticalManualModal';
          modal.className = 'modal';
          document.body.appendChild(modal);
          buildModalContent(modal);
        }
        modal.classList.add('on');
        renderEntries();
      }

      function buildModalContent(modal) {
        modal.innerHTML = `
          <div class="modalBox" style="max-width:1000px; max-height:85vh; display:flex; flex-direction:column;">
            <h2 style="margin-bottom:4px;">📖 战术手册</h2>
            <p class="hint" style="margin-bottom:10px;">
              原版核心机制 + 全部 Mod 特殊战术速查。共 ${ENTRIES.length} 条机制，12 大类。
            </p>

            <div style="display:flex; gap:8px; margin-bottom:10px;">
              <input type="text" id="manualSearch"
                     placeholder="搜索机制名、关键词、快捷键…"
                     style="flex:1; padding:8px; background:#0d1117; border:1px solid #30363d;
                            color:#e6edf3; border-radius:4px; font-size:13px; outline:none;">
              <button id="manualClose" class="sm" style="padding:8px 16px;">✕ 关闭</button>
            </div>

            <div id="manualCats" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;"></div>

            <div id="manualList" style="flex:1; overflow-y:auto; border:1px solid #30363d;
                 border-radius:6px; background:#0d1117; padding:8px;"></div>

            <div id="manualFooter" style="margin-top:8px; font-size:11px; color:#6e7681; text-align:center;">
              共 <b id="manualCount" style="color:#d0a0e0;">0</b> 个机制 · 点击条目展开详情
            </div>
          </div>
        `;

        document.getElementById('manualClose').onclick = () => modal.classList.remove('on');

        document.getElementById('manualSearch').oninput = e => {
          searchQuery = e.target.value;
          renderEntries();
        };

        const catsEl = document.getElementById('manualCats');
        catsEl.innerHTML = CATEGORIES.map(c => `
          <button class="manual-cat" data-cat="${c.id}" style="
            padding:5px 12px; background:#161b22; border:1px solid #30363d;
            color:#8b949e; border-radius:4px; cursor:pointer; font-size:12px;
            transition:.15s;
          ">${c.icon} ${c.name}</button>
        `).join('');

        catsEl.querySelectorAll('.manual-cat').forEach(b => {
          b.onclick = () => {
            currentCat = b.dataset.cat;
            catsEl.querySelectorAll('.manual-cat').forEach(x => {
              x.style.background = '#161b22';
              x.style.color = '#8b949e';
              x.style.borderColor = '#30363d';
            });
            b.style.background = '#1a2332';
            b.style.color = '#d0a0e0';
            b.style.borderColor = '#d0a0e0';
            renderEntries();
          };
        });

        catsEl.querySelector('[data-cat="all"]').click();
      }

      function renderEntries() {
        const listEl = document.getElementById('manualList');
        if (!listEl) return;

        const results = searchEntries();
        const countEl = document.getElementById('manualCount');
        if (countEl) countEl.textContent = results.length;

        if (results.length === 0) {
          listEl.innerHTML = '<div style="padding:30px; text-align:center; color:#6e7681; font-size:13px;">没有找到匹配的机制</div>';
          return;
        }

        listEl.innerHTML = results.map(e => {
          const keyHtml = (e.key && e.key !== '—')
            ? `<kbd style="background:#0d1117; border:1px solid #d0a0e0; color:#d0a0e0;
                            padding:2px 8px; border-radius:3px; font-size:11px;
                            font-family:monospace;">${e.key}</kbd>`
            : `<span style="color:#6e7681; font-size:11px;">—</span>`;

          return `
          <div class="manual-entry" data-id="${e.id}" style="
            border:1px solid #30363d; border-radius:6px; margin-bottom:8px;
            background:#161b22; overflow:hidden;
          ">
            <div class="manual-entry-header" style="
              padding:10px 12px; cursor:pointer; display:flex; align-items:center; gap:10px;
              background:#1a2029;
            ">
              <span style="font-size:18px;">${e.icon}</span>
              <div style="flex:1; min-width:0;">
                <div style="color:#e6edf3; font-weight:600; font-size:13px;">${e.name}</div>
                <div style="color:#8b949e; font-size:11px; margin-top:2px;">${e.summary}</div>
              </div>
              ${keyHtml}
              <span class="manual-toggle" style="color:#6e7681; font-size:14px;">▶</span>
            </div>
            <div class="manual-entry-body" style="
              display:none; padding:12px; border-top:1px solid #30363d;
              font-size:12px; line-height:1.75; color:#c9d1d9;
            ">
              <div style="white-space:pre-wrap; margin-bottom:8px;">${e.detail}</div>
              <div style="
                display:flex; gap:8px; flex-wrap:wrap;
                padding-top:8px; border-top:1px dashed #30363d;
              ">
                <span style="background:#0d1117; padding:3px 8px; border-radius:3px;
                             color:#f0b72f; font-size:11px;">📐 ${e.formula}</span>
                <span style="background:#0d1117; padding:3px 8px; border-radius:3px;
                             color:#58a6ff; font-size:11px;">🔧 ${e.source}</span>
              </div>
            </div>
          </div>`;
        }).join('');

        listEl.querySelectorAll('.manual-entry').forEach(el => {
          const header = el.querySelector('.manual-entry-header');
          const body = el.querySelector('.manual-entry-body');
          const toggle = el.querySelector('.manual-toggle');

          header.onclick = () => {
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            toggle.textContent = isOpen ? '▶' : '▼';
            el.style.borderColor = isOpen ? '#30363d' : '#d0a0e0';
          };
        });
      }

      /* ============================================================
       * 5) 启动
       * ============================================================ */
      setTimeout(buildButton, 1000);
      window.openTacticalManual = openManual;

      console.log('[tactical-manual] 战术手册面板 v2.0 已加载 (共 ' + ENTRIES.length + ' 条机制)');
    }
  });
})();