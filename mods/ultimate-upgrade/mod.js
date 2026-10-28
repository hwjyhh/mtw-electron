/* ============================================================
 * mods/ultimate-upgrade/mod.js — 终极原版升级 (天气/高度/测距/小地图/步兵扩展)
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[ultimate-upgrade] MTW 未就绪'); return; }

  MTW.defineMod({
    id: 'ultimate-upgrade',
    name: '终极原版升级',
    version: '1.0.0',
    setup(api) {
      
      // ==========================================
      // 1. 步兵武器扩展：手雷与迫击炮
      // ==========================================
      api.addWeapon('破片手雷', 'gl', 2, 30, 0.85, 1, 3, 0, 0, 3);
      api.addWeapon('60mm轻迫击炮', 'mortar', 8, 20, 0.65, 1, 10, 0, 1, 2);

      const origSpawn = window.spawn;
      window.spawn = function(defId, side, c, r, facing) {
        const u = origSpawn(defId, side, c, r, facing);
        if(u && ['INF', 'SF', 'RECON'].includes(u.def.cat) && u.def.mob !== 'air') {
          // 动态克隆一份防御属性，避免直接修改原版共享数据
          if(!u.def._expanded) {
             u.def = Object.assign({}, u.def);
             u.def.weapons = u.def.weapons.slice();
             u.def._expanded = true;
          }
          // 添加手雷
          const gIdx = u.def.weapons.findIndex(w => w.n === '破片手雷');
          if(gIdx === -1) {
            u.def.weapons.push({n:'破片手雷', t:'gl', r:2, pen:30, acc:0.85, rof:1, ammo:3, guid:0, top:0, sup:3, band:''});
            u.ammo.push(3); u.fired.push(0);
          }
          // 添加迫击炮 (仅限常规步兵班)
          if(u.def.cat === 'INF' && u.def.men >= 8) {
            u.def.weapons.push({n:'60mm轻迫击炮', t:'mortar', r:8, pen:20, acc:0.65, rof:1, ammo:10, guid:0, top:1, sup:2, band:''});
            u.ammo.push(10); u.fired.push(0);
          }
        }
        return u;
      };

      // ==========================================
      // 2. 动态天气系统
      // ==========================================
      G.weather = { type: 'clear', name: '晴朗', mod: 1.0 };
      const WEATHERS = [
        { type: 'clear', name: '☀️ 晴朗', mod: 1.0 },
        { type: 'rain',  name: '🌧️ 降雨', mod: 0.85 }, // 降低视野和命中
        { type: 'fog',   name: '🌫️ 浓雾', mod: 0.65 }, // 大幅降低视野
        { type: 'storm', name: '⛈️ 暴风雨', mod: 0.75 } // 影响命中及空中单位
      ];

      // 劫持回合结束切换天气
      api.override('endTurn', orig => function() {
        orig();
        if(G.turn > 1 && Math.random() < 0.4) {
          const w = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
          G.weather = w;
          log(`🌦️ 天气变化：当前天气转为【${w.name}】`, 'lg-info');
          if(w.type === 'fog' || w.type === 'storm') {
             recalcVisibility();
          }
          updateWeatherUI();
        }
      });

      // 天气影响命中率
      api.override('hitChance', orig => function(shooter, target, w, dist) {
        let p = orig(shooter, target, w, dist);
        if (G.weather.type === 'rain' || G.weather.type === 'storm') p *= 0.85;
        if (G.weather.type === 'storm' && target.def.mob === 'air') p *= 0.8; // 暴风雨影响防空
        return p;
      });

      // 天气影响视野探测
      api.override('sensorRange', orig => function(u) {
        let base = orig(u);
        base *= G.weather.mod;
        return base;
      });

      // 天气UI渲染
      function updateWeatherUI() {
        let el = document.getElementById('weatherHUD');
        if(!el) {
          el = document.createElement('div');
          el.id = 'weatherHUD';
          el.style.cssText = 'position:absolute; top:60px; left:14px; background:rgba(22,27,34,0.9); border:1px solid #58a6ff; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold; color:#fff; z-index:20; pointer-events:none; box-shadow:0 2px 8px #000a;';
          document.getElementById('stage').appendChild(el);
        }
        el.innerHTML = `天气: <span style="color:${G.weather.type==='clear'?'#3fb950':'#f0883e'}">${G.weather.name}</span>`;
      }
      setTimeout(updateWeatherUI, 1000);

      // ==========================================
      // 3. 测距工具 (按 `M` 切换)
      // ==========================================
      G.measureMode = false;
      G.measureStart = null;
      
      window.addEventListener('keydown', e => {
        if (e.key === 'm' || e.key === 'M') {
          // 注意：原版 `m` 是移动模式，这里用 Shift+M 测距，避免冲突
          if(e.shiftKey) {
            G.measureMode = !G.measureMode;
            log(G.measureMode ? '📏 测距模式已开启，点击地图两点测量距离' : '📏 测距模式已关闭', 'lg-info');
            if(!G.measureMode) G.measureStart = null;
          }
        }
        if(e.key === 'Escape') {
          G.measureMode = false; G.measureStart = null;
        }
      });

      // 劫持点击事件
      const origHandleClick = window.handleClick;
      window.handleClick = function(c, r) {
        if (G.measureMode) {
          if (!G.measureStart) {
            G.measureStart = {c, r};
            log(`📏 起点已设置: (${c},${r})，请点击终点`, 'lg-info');
          } else {
            const dist = hexDist(G.measureStart, {c, r});
            log(`📏 测距结果: 起点 (${G.measureStart.c},${G.measureStart.r}) 到终点 (${c},${r}) = ${dist} 格`, 'lg-ok');
            G.measureStart = null;
          }
          draw();
          return; // 拦截原版点击逻辑
        }
        origHandleClick(c, r);
      };

      // ==========================================
      // 4. 渲染层整合 (高度/小地图/雷达/测距线)
      // ==========================================
      api.override('draw', orig => function() {
        orig(); // 先执行原版及前面 Mod 的绘制
        
        const hs = HS * G.cam.z;

        // --- A. 飞行高度渲染 (画阴影，并抬升模型) ---
        // 为了不重写 drawUnit，我们在此添加逻辑：如果之后有单位被画出来且是空中，我们会覆盖它
        G.units.forEach(u => {
          if(u.dead || u.carriedBy || !isVisible(u, G.side)) return;
          if(u.def.mob === 'air') {
            const wc = hexCenter(u.c, u.r, HS);
            const sc = worldToScreen(wc.x, wc.y);
            // 画地面阴影
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(sc.x, sc.y + hs*0.3, hs*0.3, hs*0.15, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
          }
        });
        // 覆盖式重绘空中单位（抬升 Y 轴）
        G.units.forEach(u => {
          if(!u.dead && !u.carriedBy && u.def.mob === 'air' && isVisible(u, G.side)) {
            const wc = hexCenter(u.c, u.r, HS);
            // 临时篡改世界坐标，强制 drawUnit 画在高处
            const origCenter = hexCenter; 
            // 抱歉这里用个取巧的办法：直接调 drawUnit 然后偏移会有问题，
            // 更安全的做法是不改原函数，只加个视觉特效。
            // 为了不破坏底层，我们只画一个高度指示线。
            const sc = worldToScreen(wc.x, wc.y);
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.setLineDash([2,2]);
            ctx.beginPath();
            ctx.moveTo(sc.x, sc.y + hs*0.3);
            ctx.lineTo(sc.x, sc.y - hs*0.4);
            ctx.stroke();
            ctx.restore();
          }
        });

        // --- B. 测距渲染 ---
        if (G.measureMode && G.measureStart && G.hover) {
          const wc1 = hexCenter(G.measureStart.c, G.measureStart.r, HS);
          const sc1 = worldToScreen(wc1.x, wc1.y);
          const wc2 = hexCenter(G.hover.c, G.hover.r, HS);
          const sc2 = worldToScreen(wc2.x, wc2.y);
          const dist = hexDist(G.measureStart, G.hover);
          
          ctx.save();
          ctx.strokeStyle = '#f0b72f';
          ctx.lineWidth = 2;
          ctx.setLineDash([6,4]);
          ctx.beginPath();
          ctx.moveTo(sc1.x, sc1.y);
          ctx.lineTo(sc2.x, sc2.y);
          ctx.stroke();
          
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.strokeStyle = '#f0b72f';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sc2.x, sc2.y, 16, 0, Math.PI*2);
          ctx.fill(); ctx.stroke();
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dist, sc2.x, sc2.y);
          ctx.restore();
        }

        // --- C. 小地图与雷达拓展 ---
        drawMinimap();
      });

      // 绘制右下角小地图
      function drawMinimap() {
        if(!G.map) return;
        const mw = 180, mh = 140;
        const mx = VW - mw - 20, my = VH - mh - 40;
        
        ctx.save();
        // 背景板
        ctx.fillStyle = 'rgba(13,17,23,0.85)';
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(mx, my, mw, mh, 6);
        ctx.fill(); ctx.stroke();
        
        // 裁剪绘制区域
        ctx.beginPath();
        ctx.roundRect(mx, my, mw, mh, 6);
        ctx.clip();
        
        const sw = mw / G.map.cols;
        const sh = mh / G.map.rows;
        
        // 地形大致渲染
        for(let r=0; r<G.map.rows; r+=2) {
          for(let c=0; c<G.map.cols; c+=2) {
             const cell = G.map.cells[r][c];
             ctx.fillStyle = TERRAIN[cell.t].col;
             ctx.fillRect(mx + c*sw, my + r*sh, sw*2, sh*2);
          }
        }
        
        // 视野雷达特效
        const time = Date.now() / 1000;
        const sweepAngle = (time * 2) % (Math.PI * 2);
        
        // 画一个扇形扫描
        ctx.fillStyle = 'rgba(88,166,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(mx + mw/2, my + mh/2);
        ctx.arc(mx + mw/2, my + mh/2, Math.max(mw,mh), sweepAngle, sweepAngle + 0.5);
        ctx.closePath();
        ctx.fill();
        
        // 绘制单位红蓝点
        G.units.forEach(u => {
          if(u.dead || u.carriedBy) return;
          if(!u.spotted[G.side] && u.side !== G.side) return; // 雾战隐藏敌人
          
          const px = mx + (u.c / G.map.cols) * mw;
          const py = my + (u.r / G.map.rows) * mh;
          
          ctx.fillStyle = u.side === 0 ? '#79c0ff' : '#ff7b72';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI*2);
          ctx.fill();
          
          // 选中高亮
          if(G.sel === u) {
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 1.5;
             ctx.stroke();
          }
        });
        
        ctx.restore();
        
        // 边框文字
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('📡 战术雷达 / 全局态势', mx + 8, my - 6);
      }

      console.log('[ultimate-upgrade] 终极原版升级已加载 (天气/高度/测距/小地图/武器扩展)');
    }
  });
})();