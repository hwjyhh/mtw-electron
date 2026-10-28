(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'terrain-enhance',
    name: '地形高精度渲染 (等高线与高程)',
    version: '1.0.0',
    setup(api) {
      
      // ================= 配置 =================
      const CONFIG = {
        showContour: true,    // 显示等高线
        showElevNum: true,    // 显示高程数字
        elevScale: 100,       // 1层高程 = 100米
      };
      
      // 确保常量在 window 上 (兼容之前的 const 问题)
      if (typeof hexCenter !== 'undefined') window.hexCenter = hexCenter;
      if (typeof worldToScreen !== 'undefined') window.worldToScreen = worldToScreen;
      if (typeof inBounds !== 'undefined') window.inBounds = inBounds;

      // ================= 快捷键监听 =================
      window.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        
        if (e.key === 'h' || e.key === 'H') {
          CONFIG.showContour = !CONFIG.showContour;
          api.log(`等高线 ${CONFIG.showContour ? '开启' : '关闭'}`, 'lg-ok');
          draw();
        }
        if (e.key === 'j' || e.key === 'J') {
          CONFIG.showElevNum = !CONFIG.showElevNum;
          api.log(`高程数字 ${CONFIG.showElevNum ? '开启' : '关闭'}`, 'lg-ok');
          draw();
        }
      });

      // ================= 核心拦截：重写 draw =================
      api.override('draw', orig => function () {
        // 1. 先执行原版的地形、单位、特效绘制
        orig.apply(this, arguments);
        
        // 2. 如果面板没加载完，或者没地图，直接退出
        if (!G.map || typeof ctx === 'undefined' || typeof G === 'undefined') return;

        const hs = HS * G.cam.z;
        const map = G.map;

        // 计算当前屏幕可视范围（优化性能，不画屏幕外的）
        const tl = screenToWorld(0, 0);
        const br = screenToWorld(VW, VH);
        const minC = Math.max(0, Math.floor(tl.x / (hs * SQ3)) - 2);
        const maxC = Math.min(map.cols - 1, Math.ceil(br.x / (hs * SQ3)) + 2);
        const minR = Math.max(0, Math.floor(tl.y / (hs * 1.5)) - 2);
        const maxR = Math.min(map.rows - 1, Math.ceil(br.y / (hs * 1.5)) + 2);

        ctx.save();

        // ================= 高程色阶 (根据海拔高度叠加半透明遮罩) =================
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const cell = map.cells[r][c];
            const wc = hexCenter(c, r, HS);
            const sc = worldToScreen(wc.x, wc.y);
            const elev = cell.elev || 0;

            // 低洼处（0层）不加阴影，高程越高，颜色越亮/偏白
            if (elev > 0) {
              hexPath(ctx, sc.x, sc.y, hs * 0.99);
              // 从 1层(绿色) 到 4层(山峰白) 的渐变
              const alpha = 0.05 + (elev * 0.08); 
              ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.4, alpha)})`;
              ctx.fill();
            }
          }
        }

               // ================= 等高线绘制 (合并批处理优化版) =================
        if (CONFIG.showContour) {
          ctx.lineWidth = Math.max(1.5, hs * 0.06);
          ctx.setLineDash([4, 4]); // 虚线等高线

          // 我们按高度层级分类，因为不同高度的颜色不同
          // 1层：淡黄，2层：橙色，3层+：红色
          const contourLevels = {
            1: { color: 'rgba(200, 200, 100, 0.6)', segments: [] },
            2: { color: 'rgba(220, 160, 60, 0.7)', segments: [] },
            3: { color: 'rgba(240, 100, 60, 0.8)', segments: [] }
          };

          // 第一遍循环：只计算线段坐标，不绘图
          for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
              const cell = map.cells[r][c];
              const elev = cell.elev || 0;
              if (elev === 0) continue;

              // 确定当前格子属于哪个层级 (3层及以上都归入3)
              const levelKey = Math.min(3, elev);
              if (!contourLevels[levelKey]) continue;

              const wc = hexCenter(c, r, HS);
              const sc = worldToScreen(wc.x, wc.y);

              // 检查四周邻居
              const neighbors = typeof hexNeighbors !== 'undefined' ? hexNeighbors(c, r) : [];
              neighbors.forEach(nb => {
                if (inBounds(nb.c, nb.r)) {
                  const nbElev = map.cells[nb.r][nb.c].elev || 0;
                  if (nbElev < elev) {
                    const wcNb = hexCenter(nb.c, nb.r, HS);
                    const scNb = worldToScreen(wcNb.x, wcNb.y);
                    
                    const dx = scNb.x - sc.x;
                    const dy = scNb.y - sc.y;
                    const len = Math.hypot(dx, dy);
                    if (len === 0) return; // 防止除以0

                    const midX = sc.x + dx * 0.5;
                    const midY = sc.y + dy * 0.5;

                    const px = -dy / len;
                    const py = dx / len;

                    // 将线段的起点和终点塞进对应层级的数组里
                    contourLevels[levelKey].segments.push({
                      x1: midX + px * hs * 0.5,
                      y1: midY + py * hs * 0.5,
                      x2: midX - px * hs * 0.5,
                      y2: midY - py * hs * 0.5
                    });
                  }
                }
              });
            }
          }

          // 第二遍循环：按颜色分组，批量绘制
          for (let level in contourLevels) {
            const levelData = contourLevels[level];
            if (levelData.segments.length === 0) continue;

            // 设置该层级的颜色
            ctx.strokeStyle = levelData.color;
            ctx.beginPath(); // 每层只 beginPath 一次
            
            // 把该层级所有的线段都画入路径中
            levelData.segments.forEach(seg => {
              ctx.moveTo(seg.x1, seg.y1);
              ctx.lineTo(seg.x2, seg.y2);
            });
            
            ctx.stroke(); // 该层所有线段一次性 stroke
          }

          ctx.setLineDash([]); // 恢复实线
        }

        // ================= 高程数字标注 =================
        
        if (CONFIG.showElevNum && G.cam.z > 0.75) {
          for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
              const cell = map.cells[r][c];
              const elev = cell.elev || 0;
              if (elev === 0) continue; // 平原不显示数字，避免太乱

              const wc = hexCenter(c, r, HS);
              const sc = worldToScreen(wc.x, wc.y);

              const heightMeters = elev * CONFIG.elevScale;
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              ctx.font = `bold ${Math.max(8, hs * 0.3)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // 黑底白字，保证在任何地形颜色上都清晰
              const text = `${heightMeters}m`;
              const textW = ctx.measureText(text).width;
              
              // 画个小黑底
              ctx.fillRect(sc.x - textW / 2 - 2, sc.y + hs * 0.1 - 6, textW + 4, 12);
              
              ctx.fillStyle = '#fff';
              ctx.fillText(text, sc.x, sc.y + hs * 0.1);
            }
          }
        }

        ctx.restore();
      });

      // 手动挂载一下全局函数供拦截器使用
      function draw() {
        if (typeof window.draw === 'function') {
           // 触发一次重绘
           window.draw();
        }
      }

      console.log('[terrain-enhance] 地形高精度渲染已加载');
      console.log('快捷键 H: 切换等高线 | 快捷键 J: 切换高程数字');
    }
  });
})();