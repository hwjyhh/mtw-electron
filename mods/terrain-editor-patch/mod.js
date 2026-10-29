(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'terrain-editor-reborn',
    name: '地形与棋子终极编辑器',
    version: '5.0.0',
    setup(api) {
      
      // 编辑器状态
      const Editor = {
        active: false,
        mode: 'terrain', // 'terrain' | 'unit'
        
        // 地形参数
        tool: 'terr',
        brush: 1,
        terr: 'open',
        elev: 1,
        fort: 1,
        mine: 1,
        
        // 棋子参数
        unitId: 'cn_rifle', // 默认中国步枪班
        unitSide: 0, // 默认蓝方（人类）
        
        // 绘制状态
        isDrawing: false,
        startHex: null,
        lastHex: null
      };

      // ================= 1. 注入顶部按钮 =================
      function buildButton() {
        if (document.getElementById('btnUltimateEditor')) return;
        const top = document.getElementById('topbar');
        if (!top) { setTimeout(buildButton, 500); return; }

        const btn = document.createElement('button');
        btn.id = 'btnUltimateEditor';
        btn.textContent = '🛠 终极编辑器';
        btn.style.cssText = 'background:#8a2be2;border:1px solid #d0a0e0;color:#fff;font-weight:bold;box-shadow:0 0 8px #8a2be2;';
        
        const ref = document.getElementById('btnNew');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
        else top.appendChild(btn);

        btn.onclick = () => {
          try { startEditor(); } catch(e) { alert('启动编辑器失败: ' + e.message); }
        };
      }

      // ================= 2. 启动编辑器 =================
      let panel = null;
      let overlay = null;

      function startEditor() {
        Editor.active = true;
        
        // 创建隔离遮罩层（拦截所有鼠标，防止触发原版选择逻辑）
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed; inset:0; z-index:9990; cursor:crosshair;';
          document.body.appendChild(overlay);
          bindEvents(overlay);
        }
        overlay.style.display = 'block';

        // 创建面板
        if (!panel) {
          panel = document.createElement('div');
          panel.style.cssText = 'position:fixed; top:60px; left:20px; width:280px; background:#161b22; border:1px solid #8a2be2; border-radius:8px; padding:15px; z-index:9991; color:#e6edf3; font-size:12px; box-shadow:0 10px 30px rgba(0,0,0,0.9); max-height:85vh; display:flex; flex-direction:column;';
          
          panel.innerHTML = `
            <h3 style="color:#d0a0e0; margin:0 0 10px 0; font-size:14px; display:flex; justify-content:space-between;">
              <span>🛠 终极编辑器</span>
              <button id="ueClose" style="background:#8b2020; border:none; color:#fff; border-radius:4px; padding:2px 8px; cursor:pointer; font-size:11px;">退出</button>
            </h3>
            
            <!-- 模式切换 -->
            <div style="display:flex; gap:5px; margin-bottom:12px;">
              <button id="ueTabTerr" style="flex:1; padding:6px; background:#1f6feb; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">🏔 地形编辑</button>
              <button id="ueTabUnit" style="flex:1; padding:6px; background:#21262d; color:#fff; border:none; border-radius:4px; cursor:pointer;">♟ 棋子放置</button>
            </div>

            <!-- 地形面板 -->
            <div id="uePaneTerr" style="flex:1; overflow-y:auto;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:10px;">
                <button class="ue-tool active" data-t="terr" style="padding:5px; background:#1f6feb; color:#fff; border:none; border-radius:4px; cursor:pointer;">地形</button>
                <button class="ue-tool" data-t="elev" style="padding:5px; background:#21262d; color:#fff; border:none; border-radius:4px; cursor:pointer;">高程</button>
                <button class="ue-tool" data-t="fort" style="padding:5px; background:#21262d; color:#fff; border:none; border-radius:4px; cursor:pointer;">工事</button>
                <button class="ue-tool" data-t="mine" style="padding:5px; background:#21262d; color:#fff; border:none; border-radius:4px; cursor:pointer;">雷场</button>
                <button class="ue-tool" data-t="rect" style="padding:5px; background:#21262d; color:#fff; border:none; border-radius:4px; cursor:pointer;">矩形框选</button>
                <button class="ue-tool" data-t="line" style="padding:5px; background:#21262d; color:#fff; border:none; border-radius:4px; cursor:pointer;">直线拖拽</button>
              </div>

              <label style="display:flex; justify-content:space-between; margin-bottom:4px; color:#8b949e;">
                <span>笔刷大小</span><span id="ueBrushLabel" style="color:#f0b72f;">1</span>
              </label>
              <input type="range" id="ueBrush" min="1" max="5" value="1" style="width:100%; margin-bottom:10px;">

              <div id="ueProp-terr">
                <label style="color:#8b949e;">选择地形</label>
                <select id="ueTerrSel" style="width:100%; padding:4px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:4px; margin-top:4px;"></select>
              </div>
              <div id="ueProp-elev" style="display:none;">
                <label style="color:#8b949e;">高程 (0-5)</label>
                <input type="number" id="ueElevVal" min="0" max="5" value="1" style="width:100%; padding:4px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:4px; margin-top:4px;">
              </div>
              <div id="ueProp-fort" style="display:none;">
                <label style="color:#8b949e;">工事 (0-6)</label>
                <input type="number" id="ueFortVal" min="0" max="6" value="1" style="width:100%; padding:4px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:4px; margin-top:4px;">
              </div>
              <div id="ueProp-mine" style="display:none;">
                <label style="color:#8b949e;">雷场</label>
                <select id="ueMineVal" style="width:100%; padding:4px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:4px; margin-top:4px;">
                  <option value="0">无</option><option value="1">反步兵</option><option value="2">反装甲</option><option value="3">混合</option>
                </select>
              </div>
            </div>

            <!-- 棋子面板 -->
            <div id="uePaneUnit" style="display:none; flex:1; flex-direction:column; min-height:0;">
              <label style="color:#8b949e;">选择阵营</label>
              <select id="ueUnitSide" style="width:100%; padding:4px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:4px; margin-bottom:8px;">
                <option value="0">蓝方（己方）</option>
                <option value="1">红方（敌方）</option>
              </select>
              
              <input type="text" id="ueUnitSearch" placeholder="搜索单位名称..." style="width:100%; padding:4px; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:4px; margin-bottom:8px;">
              
              <div id="ueUnitList" style="flex:1; overflow-y:auto; background:#0d1117; border:1px solid #30363d; border-radius:4px; padding:4px;"></div>
            </div>
          `;
          document.body.appendChild(panel);
          
          // 初始化 UI 数据
          const terrSel = document.getElementById('ueTerrSel');
          TERRAIN.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id; opt.textContent = t.n;
            terrSel.appendChild(opt);
          });
          
          bindUI();
          renderUnitList();
        }
        
        panel.style.display = 'flex';
        document.getElementById('uePaneTerr').style.display = Editor.mode === 'terrain' ? 'block' : 'none';
        document.getElementById('uePaneUnit').style.display = Editor.mode === 'unit' ? 'flex' : 'none';
        draw();
      }

      // ================= 3. 关闭 =================
      function closeEditor() {
        Editor.active = false;
        if (overlay) overlay.style.display = 'none';
        if (panel) panel.style.display = 'none';
        draw();
      }

      // ================= 4. UI 事件 =================
      function bindUI() {
        document.getElementById('ueClose').onclick = closeEditor;

        // Tab 切换
        const tabT = document.getElementById('ueTabTerr');
        const tabU = document.getElementById('ueTabUnit');
        const paneT = document.getElementById('uePaneTerr');
        const paneU = document.getElementById('uePaneUnit');

        tabT.onclick = () => {
          Editor.mode = 'terrain';
          tabT.style.background = '#1f6feb'; tabU.style.background = '#21262d';
          paneT.style.display = 'block'; paneU.style.display = 'none';
        };
        tabU.onclick = () => {
          Editor.mode = 'unit';
          tabU.style.background = '#1f6feb'; tabT.style.background = '#21262d';
          paneT.style.display = 'none'; paneU.style.display = 'flex';
        };

        // 地形工具
        document.querySelectorAll('.ue-tool').forEach(btn => {
          btn.onclick = () => {
            document.querySelectorAll('.ue-tool').forEach(b => b.style.background = '#21262d');
            btn.style.background = '#1f6feb';
            Editor.tool = btn.dataset.t;

            ['terr', 'elev', 'fort', 'mine'].forEach(t => {
              const el = document.getElementById(`ueProp-${t}`);
              if (el) el.style.display = 'none';
            });
            const active = ['rect', 'line'].includes(Editor.tool) ? 'terr' : Editor.tool;
            const el = document.getElementById(`ueProp-${active}`);
            if (el) el.style.display = 'block';
          };
        });

        // 参数读取
        document.getElementById('ueBrush').oninput = e => {
          Editor.brush = parseInt(e.target.value);
          document.getElementById('ueBrushLabel').textContent = Editor.brush;
          draw();
        };
        document.getElementById('ueTerrSel').onchange = e => Editor.terr = e.target.value;
        document.getElementById('ueElevVal').onchange = e => Editor.elev = parseInt(e.target.value) || 0;
        document.getElementById('ueFortVal').onchange = e => Editor.fort = parseInt(e.target.value) || 0;
        document.getElementById('ueMineVal').onchange = e => Editor.mine = parseInt(e.target.value) || 0;

        // 棋子搜索
        document.getElementById('ueUnitSearch').oninput = renderUnitList;
        document.getElementById('ueUnitSide').onchange = e => Editor.unitSide = parseInt(e.target.value);
      }

      function renderUnitList() {
        const list = document.getElementById('ueUnitList');
        const q = (document.getElementById('ueUnitSearch').value || '').toLowerCase();
        
        const filtered = UNIT_DEFS.filter(d => {
          if (q && !d.name.toLowerCase().includes(q)) return false;
          return true;
        });

        list.innerHTML = filtered.map(d => `
          <div class="ue-unit-item" data-id="${d.id}" style="padding:4px; cursor:pointer; border-bottom:1px solid #21262d; color:${Editor.unitId === d.id ? '#58a6ff' : '#c9d1d9'}; background:${Editor.unitId === d.id ? '#1f6feb33' : 'transparent'}; display:flex; justify-content:space-between;">
            <span>${d.name}</span>
            <span style="color:#8b949e; font-size:10px;">${d.nation}</span>
          </div>
        `).join('');

        list.querySelectorAll('.ue-unit-item').forEach(el => {
          el.onclick = () => {
            Editor.unitId = el.dataset.id;
            renderUnitList();
          };
        });
      }

      // ================= 5. 鼠标拦截与绘制 =================
      function getHex(e) {
        const cv = document.getElementById('cv');
        const rect = cv.getBoundingClientRect();
        const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        const h = pixelToHex(w.x, w.y, HS);
        return inBounds(h.c, h.r) ? h : null;
      }

      function bindEvents(target) {
        target.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          const h = getHex(e);
          if (!h) return;

          if (Editor.mode === 'unit') {
            // 放置棋子
            if (unitAt(h.c, h.r)) {
               log('该格已有单位', 'lg-sys');
               return;
            }
            try {
              const def = DEF_BY_ID[Editor.unitId];
              if (def) {
                spawn(def, Editor.unitSide, h.c, h.r, Editor.unitSide === 0 ? 0 : 3);
                log(`编辑器：放置 ${def.name}`, 'lg-ok');
                if (typeof recalcVisibility === 'function') recalcVisibility();
                draw();
              }
            } catch(err) { alert('放置出错: ' + err.message); }
          } else {
            // 地形绘制
            Editor.isDrawing = true;
            Editor.startHex = h;
            Editor.lastHex = null;
            if (!['rect', 'line'].includes(Editor.tool)) {
              applyBrush(h.c, h.r);
            }
            draw();
          }
        });

        target.addEventListener('mousemove', e => {
          G.hover = getHex(e);
          if (Editor.active && Editor.isDrawing && G.hover) {
            if (!['rect', 'line'].includes(Editor.tool)) {
              interpolate(G.hover.c, G.hover.r);
            }
          }
          if (Editor.active) draw();
        });

        window.addEventListener('mouseup', e => {
          if (!Editor.active || !Editor.isDrawing) return;
          Editor.isDrawing = false;
          const h = getHex(e);
          if (h && Editor.startHex && ['rect', 'line'].includes(Editor.tool)) {
            applyShape(Editor.startHex, h);
          }
          draw();
        });
      }

      // ================= 6. 核心修改 =================
      function setCell(c, r) {
        if (!inBounds(c, r)) return;
        const cell = G.map.cells[r][c];
        if (['terr', 'rect', 'line'].includes(Editor.tool)) cell.t = T_IDX[Editor.terr];
        else if (Editor.tool === 'elev') cell.elev = Editor.elev;
        else if (Editor.tool === 'fort') cell.fort = Editor.fort;
        else if (Editor.tool === 'mine') cell.mine = Editor.mine;
      }

      function getBrushCells(c, r, size) {
        if (size <= 1) return [{cc: c, rr: r}];
        let out = [{cc: c, rr: r}], visited = new Set([c + ',' + r]), frontier = [{c, r, d: 0}];
        while (frontier.length) {
          const cur = frontier.shift();
          if (cur.d >= size - 1) continue;
          hexNeighbors(cur.c, cur.r).forEach(nb => {
            const k = nb.c + ',' + nb.r;
            if (!visited.has(k) && inBounds(nb.c, nb.r)) {
              visited.add(k); out.push({cc: nb.c, rr: nb.r});
              frontier.push({c: nb.c, r: nb.r, d: cur.d + 1});
            }
          });
        }
        return out;
      }

      function applyBrush(c, r) {
        getBrushCells(c, r, Editor.brush).forEach(b => setCell(b.cc, b.rr));
      }

      function interpolate(c, r) {
        if (!Editor.lastHex) {
          applyBrush(c, r);
        } else {
          const steps = Math.max(Math.abs(c - Editor.lastHex.c), Math.abs(r - Editor.lastHex.r));
          for (let i = 1; i <= steps; i++) {
            const ic = Math.round(Editor.lastHex.c + (c - Editor.lastHex.c) * (i / steps));
            const ir = Math.round(Editor.lastHex.r + (r - Editor.lastHex.r) * (i / steps));
            applyBrush(ic, ir);
          }
        }
        Editor.lastHex = {c, r};
      }

      function applyShape(start, end) {
        if (Editor.tool === 'rect') {
          const c1 = Math.min(start.c, end.c), c2 = Math.max(start.c, end.c);
          const r1 = Math.min(start.r, end.r), r2 = Math.max(start.r, end.r);
          for (let rr = r1; rr <= r2; rr++) for (let cc = c1; cc <= c2; cc++) setCell(cc, rr);
        } else if (Editor.tool === 'line') {
          const steps = Math.max(Math.abs(end.c - start.c), Math.abs(end.r - start.r), 1);
          for (let i = 0; i <= steps; i++) {
            setCell(Math.round(start.c + (end.c - start.c) * (i / steps)), Math.round(start.r + (end.r - start.r) * (i / steps)));
          }
        }
      }

      // ================= 7. 渲染高亮 =================
      api.override('draw', orig => function () {
        orig();
        if (!Editor.active || !G.hover) return;

        const cv = document.getElementById('cv');
        const ctx = cv.getContext('2d');
        const hs = HS * G.cam.z;

        // 棋子放置模式的悬停高亮
        if (Editor.mode === 'unit') {
          const wc = hexCenter(G.hover.c, G.hover.r, HS), sc = worldToScreen(wc.x, wc.y);
          ctx.save();
          ctx.strokeStyle = '#3fb950';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(sc.x, sc.y, hs * 0.8, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          return;
        }

        // 地形模式的笔刷高亮
        if (!Editor.isDrawing) {
          let cells = ['rect', 'line'].includes(Editor.tool) ? [{cc: G.hover.c, rr: G.hover.r}] : getBrushCells(G.hover.c, G.hover.r, Editor.brush);
          ctx.save();
          ctx.strokeStyle = '#f0b72f';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(240, 183, 47, 0.2)';
          cells.forEach(({cc, rr}) => {
            if (!inBounds(cc, rr)) return;
            const wc = hexCenter(cc, rr, HS), sc = worldToScreen(wc.x, wc.y);
            hexPath(ctx, sc.x, sc.y, hs * 0.95); ctx.fill(); ctx.stroke();
          });
          ctx.restore();
        }

        // 拖拽矩形/直线的高亮
        if (Editor.isDrawing && Editor.startHex && G.hover && ['rect', 'line'].includes(Editor.tool)) {
          const start = Editor.startHex, end = G.hover, cells = [];
          if (Editor.tool === 'rect') {
            const c1 = Math.min(start.c, end.c), c2 = Math.max(start.c, end.c);
            const r1 = Math.min(start.r, end.r), r2 = Math.max(start.r, end.r);
            for (let rr = r1; rr <= r2; rr++) for (let cc = c1; cc <= c2; cc++) cells.push({cc, rr});
          } else {
            const steps = Math.max(Math.abs(end.c - start.c), Math.abs(end.r - start.r), 1);
            for (let i = 0; i <= steps; i++) cells.push({cc: Math.round(start.c + (end.c - start.c)*(i/steps)), rr: Math.round(start.r + (end.r - start.r)*(i/steps))});
          }
          ctx.save();
          ctx.strokeStyle = '#58a6ff';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
          cells.forEach(({cc, rr}) => {
            if (!inBounds(cc, rr)) return;
            const wc = hexCenter(cc, rr, HS), sc = worldToScreen(wc.x, wc.y);
            hexPath(ctx, sc.x, sc.y, hs * 0.95); ctx.fill(); ctx.stroke();
          });
          ctx.restore();
        }
      });

      setTimeout(buildButton, 1000);
      console.log('[terrain-editor-reborn] 终极融合编辑器加载完毕');
    }
  });
})();