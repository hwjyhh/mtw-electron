(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'logistics-system',
    name: '高级补给与后勤机制',
    version: '1.0.0',
    setup(api) {

      // 防止部分底层常量未挂载到 window
      if (typeof hasLOS !== 'undefined') window.hasLOS = hasLOS;
      if (typeof updateSelInfo !== 'undefined') window.updateSelInfo = updateSelInfo;

      // ================= 1. 数据初始化 =================
      api.override('spawn', orig => function (defId, side, c, r, facing) {
        const u = orig(defId, side, c, r, facing);
        if (!u) return u;

        // 燃油系统：车辆和飞机有油箱，步兵无
        if (['ARM','IFV','APC','NAV','HELI','AIR'].includes(u.def.cat)) {
          u.fuel = 100;       // 当前燃油
          u.maxFuel = 100;    // 最大燃油
        } else {
          u.fuel = 0; u.maxFuel = 0;
        }

        // 后勤载具属性
        if (u.def.cap && (u.def.cap.includes('补给') || u.def.cat === 'LOG')) {
          u.supplyAmmo = 2000; // 携带总弹药量
          u.supplyFuel = 300;  // 携带总油料
        }

        // 修理属性（工兵或维修车）
        if (u.def.cat === 'ENG' || (u.def.cap && u.def.cap.includes('修车'))) {
          u.repairKits = 3;    // 修理套件
        }

        // 行动状态
        u.busyTurns = 0;       // 占用回合数
        u.actionType = null;   // 'supply' | 'repair'
        
        return u;
      });


      // ================= 2. 燃油消耗机制 =================
      // 拦截移动，根据移动力消耗燃油。没油了无法移动。
      api.override('performMove', orig => function (unit, target) {
        if (unit.fuel !== undefined && unit.fuel <= 0) {
          api.log('⛽ 燃油耗尽！无法移动', 'lg-sys');
          return false;
        }

        // 计算移动消耗（使用原版寻路计算成本）
        const cells = api.reachableCells(unit, unit.mp);
        const info = cells.get(target.c + ',' + target.r);
        
        if (info) {
          // 车辆消耗燃油，步兵不消耗
          if (unit.fuel !== undefined && unit.maxFuel > 0) {
            // 根据移动力消耗燃油：1 MP 约等于 5 点油
            const cost = Math.ceil(info.cost * 5); 
            if (unit.fuel < cost) {
              api.log('⛽ 燃油不足以支持此次机动', 'lg-sys');
              return false;
            }
            unit.fuel -= cost;
          }
        }

        return orig(unit, target);
      });


      // ================= 3. 补给与修理队列 =================
      // 在回合结束时结算耗时动作
      api.override('endTurn', orig => function () {
        G.units.forEach(u => {
          if (u.dead || u.busyTurns <= 0) return;

          u.busyTurns--;
          if (u.busyTurns <= 0) {
            // 动作完成
            if (u.actionType === 'supply') {
              // 恢复弹药和燃油
              u.ammo = u.def.weapons.map(w => w.ammo);
              if (u.maxFuel > 0) u.fuel = u.maxFuel;
              api.log(`🚚 ${u.def.name} 补给完成！弹药与油料已满`, 'lg-ok');
              api.addEffect('text', u.c, u.r, { dur: 40, text: '补给完毕', color: '#3fb950' });
            } 
            else if (u.actionType === 'repair') {
              // 恢复血量
              const heal = u.maxHp * 0.4; // 恢复 40% 血量
              u.hp = Math.min(u.maxHp, u.hp + heal);
              api.log(`🔧 ${u.def.name} 修理完成！恢复 ${heal.toFixed(0)} HP`, 'lg-ok');
              api.addEffect('text', u.c, u.r, { dur: 40, text: '修理完毕', color: '#3fb950' });
            }
            u.actionType = null;
          } else {
            // 进度提示
            api.addEffect('text', u.c, u.r, { dur: 30, text: `进行中... (剩 ${u.busyTurns} 回合)`, color: '#d29922' });
          }
        });
        return orig();
      });


           // ================= 4. 交互 UI 注入 =================
      // 使用 api.override 安全拦截，而不是直接覆盖 window.updateUI
      api.override('updateUI', orig => function() {
        orig(); // 先执行原版界面渲染
        
        const selInfo = document.getElementById('selInfo');
        if (!selInfo || !G.sel || G.sel.dead) return;
        const u = G.sel;

        // 【性能优化】避免每次刷新都重建 DOM
        let container = document.getElementById('logiActions');
        if (!container) {
          container = document.createElement('div');
          container.id = 'logiActions';
          container.style.cssText = 'margin-top:8px; border-top:1px dashed #30363d; padding-top:6px;';
          selInfo.appendChild(container);
        }

        let html = '';
        
        // 如果正在执行动作
        if (u.busyTurns > 0) {
          html += `<div style="color:#d29922; font-weight:bold; font-size:11px; text-align:center;">
            ⏳ ${u.actionType === 'supply' ? '补给中' : '修理中'} (剩余 ${u.busyTurns} 回合)
          </div>`;
        } else {
          // 燃油显示
          if (u.maxFuel > 0) {
            const fuelPct = (u.fuel / u.maxFuel) * 100;
            html += `<div class="row" style="font-size:10px; margin-bottom:4px;">
              <span class="k">⛽ 燃油</span>
              <div class="bar" style="flex:1; margin:0 5px;"><i style="width:${fuelPct}%; background:${fuelPct > 30 ? '#3fb950' : '#f85149'}"></i></div>
              <span class="v" style="color:${fuelPct > 30 ? '#3fb950' : '#f85149'}">${u.fuel}</span>
            </div>`;
          }
          
          // 补给/修理按钮（如果自身是后勤单位）
          if (u.supplyAmmo > 0 || u.repairKits > 0) {
            html += `<div style="display:flex; gap:4px; margin-top:4px;">
              ${u.supplyAmmo > 0 ? `<button id="btnDoSupply" style="flex:1; background:#1f6feb; border:none; color:#fff; padding:3px; border-radius:3px; font-size:10px; cursor:pointer;">🚚 补给 (余${u.supplyAmmo})</button>` : ''}
              ${u.repairKits > 0 ? `<button id="btnDoRepair" style="flex:1; background:#d29922; border:none; color:#fff; padding:3px; border-radius:3px; font-size:10px; cursor:pointer;">🔧 修理 (余${u.repairKits})</button>` : ''}
            </div>`;
          }
        }
        
        // 【性能优化】比对 html 变化后才更新，防止每帧重绘
        if (container.innerHTML !== html) {
          container.innerHTML = html;
        }

        // 绑定按钮事件 (每次渲染后重新绑定)
        const sBtn = document.getElementById('btnDoSupply');
        if (sBtn && !sBtn.onclick) {
            sBtn.onclick = () => { G.mode = 'supply'; api.log('点击相邻友军进行补给 (耗时1回合)', 'lg-info'); draw(); };
        }
        
        const rBtn = document.getElementById('btnDoRepair');
        if (rBtn && !rBtn.onclick) {
            rBtn.onclick = () => { G.mode = 'repair'; api.log('点击相邻受损单位进行修理 (耗时1回合)', 'lg-info'); draw(); };
        }
      });
      // ================= 5. 拦截点击逻辑 =================
      api.override('handleClick', orig => function (c, r) {
        // 如果进入了补给模式
        if (G.mode === 'supply' && G.sel) {
          const target = api.unitAt(c, r);
          if (!target || target.side !== G.sel.side) {
            api.log('请选择相邻的友军单位', 'lg-sys');
            return;
          }
          if (target === G.sel) { api.log('不能给自己补给', 'lg-sys'); return; }
          if (api.hexDist(G.sel, target) > 1) { api.log('距离太远，必须相邻！', 'lg-sys'); return; }
          if (target.busyTurns > 0) { api.log('目标正在执行其他动作', 'lg-sys'); return; }
          
          if (G.sel.supplyAmmo <= 0) { api.log('补给车已空', 'lg-sys'); return; }

          // 执行补给
          G.sel.supplyAmmo -= 500;
          if (G.sel.supplyAmmo < 0) G.sel.supplyAmmo = 0;
          
          target.busyTurns = 1;
          target.actionType = 'supply';
          G.sel.mp = 0; // 补给车本回合不能动
          
          api.log(`🚚 ${G.sel.def.name} 开始为 ${target.def.name} 补给，耗时1回合`, 'lg-ok');
          api.addEffect('text', target.c, target.r, { dur: 30, text: '开始补给', color: '#58a6ff' });
          
          G.mode = 'select';
          updateUI(); draw();
          return;
        }

        // 如果进入了修理模式
        if (G.mode === 'repair' && G.sel) {
          const target = api.unitAt(c, r);
          if (!target || target.side !== G.sel.side) {
            api.log('请选择相邻的友军单位', 'lg-sys');
            return;
          }
          if (api.hexDist(G.sel, target) > 1) { api.log('距离太远，必须相邻！', 'lg-sys'); return; }
          if (target.hp >= target.maxHp) { api.log('目标未受损，无需修理', 'lg-sys'); return; }
          if (target.busyTurns > 0) { api.log('目标正在执行其他动作', 'lg-sys'); return; }
          
          if (G.sel.repairKits <= 0) { api.log('修理套件已耗尽', 'lg-sys'); return; }

          // 执行修理
          G.sel.repairKits--;
          target.busyTurns = 1;
          target.actionType = 'repair';
          G.sel.mp = 0;

          api.log(`🔧 ${G.sel.def.name} 开始修理 ${target.def.name}，耗时1回合`, 'lg-ok');
          api.addEffect('text', target.c, target.r, { dur: 30, text: '开始修理', color: '#d29922' });
          
          G.mode = 'select';
          updateUI(); draw();
          return;
        }

        // 如果未进入特殊模式，且点击了正在忙碌的单位，提示
        const clicked = api.unitAt(c, r);
        if (clicked && clicked.busyTurns > 0) {
          api.log(`该单位正在${clicked.actionType === 'supply' ? '补给' : '修理'}中，剩余 ${clicked.busyTurns} 回合`, 'lg-sys');
        }

        return orig(c, r);
      });


      // ================= 6. 渲染补充 =================
      // 在忙碌的单位头上画个扳手/油桶图标
      api.override('draw', orig => function () {
        orig();
        if (!G.map) return;
        const hs = HS * G.cam.z;
        
        G.units.forEach(u => {
          if (u.dead || u.carriedBy || u.busyTurns <= 0) return;
          
          const wc = hexCenter(u.c, u.r, HS);
          const sc = worldToScreen(wc.x, wc.y);
          
          ctx.save();
          ctx.fillStyle = u.actionType === 'supply' ? '#58a6ff' : '#d29922';
          ctx.font = `bold ${Math.max(12, hs * 0.5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(u.actionType === 'supply' ? '🚚' : '🔧', sc.x, sc.y - hs * 0.6);
          
          // 进度圈
          ctx.beginPath();
          ctx.arc(sc.x, sc.y, hs * 0.85, 0, Math.PI * 2);
          ctx.strokeStyle = u.actionType === 'supply' ? '#58a6ff' : '#d29922';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        });
      });


      console.log('[logistics-system] 高级后勤与补给机制已加载');
    }
  });
})();