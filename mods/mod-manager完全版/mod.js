(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'mod-manager',
    name: 'Mod管理器',
    version: '1.0.0',
    setup(api) {
      
      let allMods = []; // 存储从 index.json 读取的所有 mod 列表
      let disabledMods = JSON.parse(localStorage.getItem('mtw_disabled_mods') || '[]');

      // 在顶部栏添加“Mod管理”按钮
      function buildButton() {
        if (document.getElementById('btnModManager')) return;
        const top = document.getElementById('topbar');
        if (!top) { setTimeout(buildButton, 500); return; }

        const btn = document.createElement('button');
        btn.id = 'btnModManager';
        btn.textContent = '⚙️ Mod管理';
        btn.style.cssText = 'background:#21262d;border:1px solid #58a6ff;color:#58a6ff;font-weight:bold';
        
        const ref = document.getElementById('btnDatabase');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
        else top.appendChild(btn);

        btn.onclick = openModal;
      }

      // 拉取 index.json 列表并打开模态框
      async function openModal() {
        try {
          const res = await fetch('mods/index.json', { cache: 'no-store' });
          if (res.ok) {
            allMods = await res.json();
          } else {
            // 如果是在 file:// 下或者失败，尝试从已加载的列表中读取
            allMods = MTW.list();
          }
        } catch (e) {
          allMods = MTW.list();
        }

        renderUI();
      }

      // 渲染管理界面
      function renderUI() {
        let modal = document.getElementById('modalModManager');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'modalModManager';
          modal.className = 'modal';
          modal.innerHTML = `
            <div class="modalBox" style="max-width:600px; max-height:80vh; display:flex; flex-direction:column;">
              <h2>⚙️ Mod 管理器</h2>
              <p class="hint" style="margin-bottom:10px;">提示：取消/勾选后，<b>必须刷新页面 (F5)</b> 才能生效。</p>
              
              <div id="modListContainer" style="flex:1; overflow-y:auto; border:1px solid #30363d; border-radius:6px; background:#0d1117; padding:8px; margin-bottom:12px;">
                <!-- 列表内容动态生成 -->
              </div>

              <div style="display:flex; gap:6px;">
                <button id="modMgrSaveBtn" class="active" style="flex:1">保存并刷新页面</button>
                <button id="modMgrCloseBtn" class="sm">关闭</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          document.getElementById('modMgrCloseBtn').onclick = () => modal.classList.remove('on');
          document.getElementById('modMgrSaveBtn').onclick = () => {
            // 收集当前未勾选的 mod id
            const newDisabled = [];
            document.querySelectorAll('.mod-checkbox').forEach(cb => {
              if (!cb.checked) newDisabled.push(cb.dataset.id);
            });
            localStorage.setItem('mtw_disabled_mods', JSON.stringify(newDisabled));
            location.reload(); // 刷新页面
          };
        }

        const container = document.getElementById('modListContainer');
        if (!allMods || allMods.length === 0) {
          container.innerHTML = '<div style="padding:20px;text-align:center;color:#8b949e;">未发现任何 Mod。</div>';
          return;
        }

        let html = '';
        // 排除自己（管理器本身不能被禁用）
        allMods.forEach(m => {
          if (m.id === 'mod-manager') return;
          const isDisabled = disabledMods.includes(m.id);
          html += `
            <label style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #21262d; cursor:pointer;">
              <input type="checkbox" class="mod-checkbox" data-id="${m.id}" ${isDisabled ? '' : 'checked'} style="width:auto;">
              <div style="flex:1;">
                <div style="font-size:12.5px; color:#e6edf3; font-weight:600;">${m.name || m.id}</div>
                <div style="font-size:10px; color:#8b949e;">v${m.version || '1.0'} · ${m.script}</div>
              </div>
            </label>
          `;
        });
        container.innerHTML = html;
        modal.classList.add('on');
      }

      // 启动
      setTimeout(buildButton, 1000);
      console.log('[mod-manager] Mod 管理器已加载');
    }
  });
})();