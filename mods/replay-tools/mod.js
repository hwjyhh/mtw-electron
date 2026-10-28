(function(){
  if(!window.MTW) return;
  MTW.defineMod({
    id:'replay-tools', name:'战术复盘', version:'1.0',
    setup(api){
      G.showReplay = true;
      G.lastRoundShots = [];

      // 1. 记录所有射击事件
      api.on('afterShot', (ev) => {
        if(ev.shooter && ev.target && ev.result?.ok) {
          G.lastRoundShots.push({
            from: {c: ev.shooter.c, r: ev.shooter.r},
            to: {c: ev.target.c, r: ev.target.r},
            hit: ev.result.hits > 0,
            side: ev.shooter.side
          });
        }
      });

      // 2. 回合结束清空上一回合记录（在切换阵营前）
      api.on('beforeTurnEnd', () => {
         // 保留当前回合的，作为“上一回合”战绩
      });
      api.override('endTurn', orig => function(){
         // 每次结束回合，不清空，用快捷键手动清空，方便复盘
         orig();
      });

      // 3. 渲染层：画出上一回合的火力射线
      api.override('draw', orig => function(){
        orig();
        if(!G.showReplay) return;

        ctx.save();
        ctx.lineWidth = 1.5;
        G.lastRoundShots.forEach(s => {
          const wc1 = hexCenter(s.from.c, s.from.r, HS), sc1 = worldToScreen(wc1.x, wc1.y);
          const wc2 = hexCenter(s.to.c, s.to.r, HS), sc2 = worldToScreen(wc2.x, wc2.y);
          
          ctx.strokeStyle = s.side === 0 ? 'rgba(88,166,255,0.6)' : 'rgba(248,81,73,0.6)';
          ctx.setLineDash(s.hit ? [] : [4,4]); // 命中实线，未命中虚线
          
          ctx.beginPath();
          ctx.moveTo(sc1.x, sc1.y);
          ctx.lineTo(sc2.x, sc2.y);
          ctx.stroke();

          if(s.hit) {
             ctx.fillStyle = 'rgba(255,200,0,0.8)';
             ctx.beginPath(); ctx.arc(sc2.x, sc2.y, HS*G.cam.z*0.15, 0, Math.PI*2); ctx.fill();
          }
        });
        ctx.restore();
      });

      // 快捷键监听 (R 键清空战报)
      window.addEventListener('keydown', e => {
        if(e.key === 'r' || e.key === 'R') {
          if(e.shiftKey) {
            G.lastRoundShots = [];
            log('📊 战术复盘图层已清空', 'lg-sys');
            draw();
          }
        }
      });
      
      // 面板
      setTimeout(() => {
        const aside = document.getElementById('right');
        if(!aside) return;
        const p = document.createElement('div');
        p.className='panel';
        p.innerHTML = `
          <h3>战术复盘</h3>
          <div class="hint" style="margin-bottom:4px">显示上一回合火力覆盖与视线</div>
          <button id="btnReplay" class="sm active" style="width:100%">📊 射线显示: 开</button>
          <button id="btnClearReplay" class="sm" style="width:100%;margin-top:3px">清空记录 (Shift+R)</button>
        `;
        aside.insertBefore(p, aside.firstChild);
        
        document.getElementById('btnReplay').onclick = (e) => {
          G.showReplay = !G.showReplay;
          e.target.textContent = `📊 射线显示: ${G.showReplay?'开':'关'}`;
          e.target.classList.toggle('active', G.showReplay);
          draw();
        };
        document.getElementById('btnClearReplay').onclick = () => {
          G.lastRoundShots = [];
          draw();
        };
      }, 1000);
    }
  });
})();