(function () {
  if (!window.MTW) return;
  MTW.defineMod({
    id: 'mod-manager',
    name: 'Mod管理器',
    version: '1.0',
   setup(api) {
  let disabled = JSON.parse(localStorage.getItem('mtw_disabled_mods') || '[]');

      function buildUI() {
        if (document.getElementById('modManagerPanel')) return;
        const allMods = MTW.list(); 

      
        // 顶部按钮
        const top = document.getElementById('topbar');
        const btn = document.createElement('button');
        btn.id = 'btnModMgr';
        btn.textContent = '🧩 模组管理';
        top.insertBefore(btn, top.firstChild);

        // 弹窗
        const modal = document.createElement('div');
        modal.id = 'modManagerModal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modalBox" style="max-width:600px">
            <h2>🧩 模组启停管理</h2>
            <p class="hint" style="margin-bottom:10px">勾选或取消勾选来启用/禁用扩展。更改后需要刷新页面生效。</p>
            <div id="modListBox" style="max-height:50vh;overflow-y:auto;background:#0d1117;border:1px solid #30363d;padding:10px;border-radius:6px">
              <!-- 列表渲染区 -->
            </div>
            <div style="display:flex;gap:6px;margin-top:15px">
              <button id="btnApplyMods" class="active" style="flex:1">保存并刷新</button>
              <button id="btnCloseMods" class="sm">取消</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        // 渲染列表
        const listBox = document.getElementById('modListBox');
        listBox.innerHTML = allMods.map(m => {
          if(m.id === 'mod-manager') return ''; // 不显示自己
          const isEnabled = !disabled.includes(m.id);
          return `
            <label style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #21262d;cursor:pointer">
              <input type="checkbox" class="mod-chk" data-id="${m.id}" ${isEnabled ? 'checked' : ''} style="width:16px;height:16px">
              <div style="flex:1">
                <div style="color:#e6edf3;font-weight:600;font-size:12px">${m.name || m.id}</div>
                <div class="hint">${m.id} v${m.version||'1.0'}</div>
              </div>
            </label>
          `;
        }).join('');

        // 事件绑定
        btn.onclick = () => modal.classList.add('on');
        document.getElementById('btnCloseMods').onclick = () => modal.classList.remove('on');
        
        document.getElementById('btnApplyMods').onclick = () => {
          const newDisabled = [];
          document.querySelectorAll('.mod-chk').forEach(chk => {
            if (!chk.checked) newDisabled.push(chk.dataset.id);
          });
          localStorage.setItem('mtw_disabled_mods', JSON.stringify(newDisabled));
          window.location.reload(); // 刷新页面
        };
      }

      setTimeout(buildUI, 1000);
    }
  });
})();