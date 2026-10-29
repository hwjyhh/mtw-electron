(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'unit-deleter',
    name: '单位移除工具',
    version: '1.0.0',
    setup(api) {

      // 监听键盘按下 Delete 键
      window.addEventListener('keydown', e => {
        // 如果是在输入框里打字，不触发删除
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
          // 如果有选中的单位
          if (G.sel && !G.sel.dead) {
            const u = G.sel;
            
            // 如果单位里有搭载的步兵，连带步兵一起移除
            if (u.cargo && u.cargo.length > 0) {
              u.cargo.forEach(inf => { inf.dead = true; });
            }
            // 如果该单位自己正搭载在别的车里
            if (u.carriedBy) {
              u.carriedBy.cargo = u.carriedBy.cargo.filter(x => x !== u);
            }

            // 标记为死亡（原版底层引擎会自动忽略 dead=true 的单位）
            u.dead = true;
            u.hp = 0;
            
            // 视觉反馈
            if (typeof api.addEffect === 'function') {
              api.addEffect('text', u.c, u.r, { dur: 50, text: '已移除', color: '#f85149' });
            }

            // 清空选中状态
            G.sel = null;
            G.selectedWeapons = [];

            api.log(`🗑 已删除单位：${u.def.name}`, 'lg-sys');
            
            // 刷新界面
            api.recalcVisibility();
            if (typeof updateUI === 'function') updateUI();
            if (typeof draw === 'function') draw();
          }
        }
      });

      // 额外福利：在右侧 UI 面板添加一个“移除选中单位”的按钮
      api.override('updateUI', orig => function() {
        orig();
        const si = document.getElementById('selInfo');
        if (!si || !G.sel || G.sel.dead) return;

        // 检查是否已经加过按钮
        if (!document.getElementById('btnDeleteUnit')) {
          const btn = document.createElement('button');
          btn.id = 'btnDeleteUnit';
          btn.textContent = '🗑 移除该单位 (Delete)';
          btn.style.cssText = 'width:100%; margin-top:8px; background:#8b2020; border:1px solid #f85149; color:#fff; font-size:10.5px; padding:4px; border-radius:4px; cursor:pointer;';
          
          btn.onclick = () => {
            // 模拟按下 Delete 键
            const event = new KeyboardEvent('keydown', { key: 'Delete' });
            window.dispatchEvent(event);
          };
          
          si.appendChild(btn);
        }
      });

      console.log('[unit-deleter] 单位删除工具已加载 (按 Delete 键移除选中单位)');
    }
  });
})();