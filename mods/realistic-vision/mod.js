(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'realistic-vision',
    name: '真实视野系统',
    version: '1.0.0',
    setup(api) {

      // ================= 1. 兵种基础视野（格数，1格=100m） =================
      const CAT_BASE_SIGHT = {
        INF: 11, ENG: 11, MEDIC: 11,     // 步兵肉眼 1100m
        SF:  13,                          // 特种兵 1300m
        RECON: 19,                        // 专业光学 1900m
        ARM: 22,                          // 车长周视镜 2200m
        IFV: 20, APC: 18, NAV: 15,
        ARTY: 14,
        AD: 25,
        HELI: 35,                         // 光电吊舱 3500m
        AIR: 50,                          // 机载雷达/红外 5000m
        UAV: 40,                          // 无人机光电 4000m+
        EW: 18, LOG: 8,
        FORT: 15, MINE: 1
      };

      // ================= 2. 装备加成（格数） =================
      const CAP_BONUS = {
        '夜视': 2,
        '红外': 6, '热像': 6, '热成像': 6,
        '狙击': 4, '侦察': 4, '光学': 3, '光电': 4
      };

      // ================= 3. 可调配置（挂到 window 便于调试） =================
      const CONFIG = {
        enabled: true,
        baseSight: 11,
        stealthHalfDistance: true,        // 静止+防御+高隐蔽 → 半距
        stealthTerrainThreshold: 0.4,     // TERRAIN.con 阈值
        airTargetVisibleWithoutRadar: 0.7 // 无雷达时对空可见系数
      };
      window.__visionConfig = CONFIG;

      // ================= 4. 核心：sensorRange =================
      function computeRange(u) {
        if (!u || !u.def) return CONFIG.baseSight;
        const cat = u.def.cat;
       const cap = String(u.def.cap || '');



        let range = CAT_BASE_SIGHT[cat] ?? CONFIG.baseSight;

        // 精确匹配标签 —— '红外干扰' 不会误命中 '红外'
        cap.split(',').map(s => s.trim()).filter(Boolean)
           .forEach(t => { range += (CAP_BONUS[t] || 0); });

        // 空中传感器
        if (cat === 'UAV') {
          range = Math.max(range, 25 + (u.def.sens?.t || 5) * 2);
        } else if (cat === 'AIR') {
          range = Math.max(range, 40 + (u.def.sens?.t || 5) * 2);
        } else if (cat === 'HELI') {
          range = Math.max(range, 20 + (u.def.sens?.t || 5));
        } else if (cat === 'AD' && (u.def.sens?.radar || 0) > 0) {
          range = Math.max(range, 30);
        }

        // 电子干扰 / 通信链路降级
        const isInf = ['INF','SF','RECON','FORT'].includes(cat) && u.def.mob !== 'air';
        if (!isInf) {
          const jf = clamp(1 - (u.jamming || 0) / 30, 0.15, 1);
          range *= jf;
          if (G.commLinks && G.commLinks[u.side] && G.commLinks[u.side].strength < 50) {
            range *= 0.8;
          }
        }

        // 姿态
        if (u.stance === 'defense') range *= 1.15;
        if (u.stance === 'attack')  range *= 0.9;

        // 传感器损坏
        if (u.sensorDown > 0) range *= 0.4;

        return Math.max(1, range);
      }

      api.override('sensorRange', orig => function (u) {
        return CONFIG.enabled ? computeRange(u) : orig(u);
      });

           // ================= 5. 核心：canSeeAdvanced / canSee =================
      function newCanSee(observer, target) {
        if (!observer || !target) return false;
        if (observer.side === target.side) return true; // 友军永远可见
        if (observer.dead || target.dead) return false;
        if (observer.carriedBy) return false;

        const d  = hexDist(observer, target);
        const sr = computeRange(observer); // 算上装备加成的视野

        if (d > sr) return false; // 超出基础视野
        if (!hasLOS(observer, target)) return false; // 被山挡住视线

        // ── 空中目标 ──
        if (target.def.mob === 'air') {
          const rp = (typeof radarParams === 'function') ? radarParams(observer) : null;
          if (rp && observer.radarOn !== false) {
            // 有雷达，且雷达开机：调用引擎自带的雷达信噪比判定（让隐身战机真隐身）
            if (typeof radarSNR === 'function') return radarSNR(observer, target) > 10;
            return true; // 兜底
          }
          // 没雷达，只能靠肉眼找飞机，距离大幅压缩
          return d <= sr * CONFIG.airTargetVisibleWithoutRadar;
        }

        // ==========================================
        // ⬇️ 这里是地面目标的核心逻辑 ⬇️
        // ==========================================
        
        const cell    = cellAt(target.c, target.r);
        const terrain = cell ? TERRAIN[cell.t] : { con: 0 };
        
        // 1. 目标是不是静止的？(没移动，也没开火)
        const isStill     = !target.moving && ((target.moved || 0) === 0);
        // 2. 目标是不是处于防御姿态或挖了战壕？
        const isDefending = (target.stance === 'defense') || ((target.dugIn || 0) > 0);
        // 3. 地形有没有提供高隐蔽？(树林、废墟)
        const isGoodCover = terrain.con >= CONFIG.stealthTerrainThreshold;
        // 4. 🚨【核心机制：开火暴露】目标这回合开火了吗？
        const hasFired = target.fired && target.fired.some(f => f > 0);

        // 观察者的装备判定
       const capStr = (observer.def && observer.def.cap) ? String(observer.def.cap) : '';
        // 观察者有没有热成像/雷达（高科技探测）
        const hasThermal = capStr.includes('热像') || capStr.includes('红外') || capStr.includes('热成像');
        const hasRadar = (typeof radarParams === 'function' && radarParams(observer) !== null) && observer.radarOn !== false;
        // 观察者是不是专业的侦察兵？
        const isRecon = (observer.def.cat === 'RECON' || observer.def.cat === 'SF');

        // ── 战术判定开始 ──

        // 如果目标处于高隐蔽状态（静止+防御+掩体） 且 没有开火暴露自己
        if (isStill && isDefending && isGoodCover && !hasFired) {
            
            // 基础发现距离被大幅度压缩
            let detectRange = sr * 0.5; 
            if (['ARM', 'IFV', 'APC'].includes(target.def.cat)) detectRange *= 1.5; // 坦克太大，藏不住轮廓

            // 🚨【侦察兵的价值】：如果有侦察兵或高科技装备，能看穿伪装
            if (hasThermal || hasRadar || isRecon) {
                // 侦察兵用高倍镜/红外看树林，依然能发现！
                return d <= sr * 0.8; 
            } else {
                // 普通大老粗步兵/没有高科技的坦克，必须贴脸（2格=200m）才能发现树林里埋伏的人
                return d <= 2; 
            }
        }

        // ── 如果目标开火了(hasFired = true)，或者移动了，隐蔽失效！ ──
        // 直接返回 true，被看的一清二楚！
        return true;
      }

      api.override('canSee', orig => function (o, t) {
        return CONFIG.enabled ? newCanSee(o, t) : orig(o, t);
      });
      api.override('canSee', orig => function (o, t) {
        return CONFIG.enabled ? newCanSee(o, t) : orig(o, t);
      });

      // ================= 6. 热键切换：Shift+V =================
      window.addEventListener('keydown', e => {
        if (!e.shiftKey || (e.key !== 'V' && e.key !== 'v')) return;
        if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
        CONFIG.enabled = !CONFIG.enabled;
        log(`真实视野 ${CONFIG.enabled ? '✔ 启用' : '✕ 禁用（恢复原版）'}`, 'lg-ok');
        try { window.recalcVisibility(); } catch (err) {}
        try { draw(); } catch (err) {}
      }, true);

      // ================= 7. 调试命令：sightDebug() =================
      window.sightDebug = function () {
        console.log('%c=== 真实视野 debug ===', 'color:#58a6ff;font-weight:bold');
        const samples = [
          'us_rifle','us_rifle_sopmod','us_sniper','us_ranger','us_seal',
          'us_m1a2sep3','us_m2a4','us_m777','us_mq9','us_a10c','us_ah64e',
          'cn_rifle191','cn_sf','cn_99a','cn_z10','cn_gj2',
          'ru_mot_rifle','ru_t90m','ru_su35','ru_ka52'
        ];
        samples.forEach(id => {
          const def = DEF_BY_ID[id];
          if (!def) return;
          const fake = {
            def, stance: 'defense', jamming: 0, sensorDown: 0,
            side: 0, moving: false, moved: 0, dugIn: 0
          };
          const r = computeRange(fake);
          console.log(`  ${def.name.padEnd(22)} ${r.toFixed(0).padStart(3)} 格 = ${(r * 0.1).toFixed(1)}km`);
        });
      };

      // ================= 8. 立即重算一次 =================
      setTimeout(() => {
        try { window.recalcVisibility(); } catch (e) {}
        try { draw(); } catch (e) {}
      }, 500);

      console.log('[realistic-vision] ✔ 真实视野：基础1100m / 无阻挡即可见 / 装备加成');
      console.log('[realistic-vision] 快捷键 Shift+V 切换 · 控制台 sightDebug() 查看');
    }
  });
})();