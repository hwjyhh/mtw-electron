(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'synthetic-battalion',
    name: '重中轻合成营编制',
    version: '1.0.0',
    setup(api) {

      // ================= 1. 定义不同阵营的等价单位映射 =================
      // 为了让 AI 也能用对应国家的装备，我们做个动态映射（以中国为基准）
      const EQUIV = {
        US: {
          'cn_04a': 'us_m2a4', 'cn_99a': 'us_m1a2sep3',
          'cn_08': 'us_stryker_icv', 'cn_15': 'us_m10_booker',
          'cn_z10': 'us_ah64e', 'cn_08_mortar': 'us_stryker_mortar',
          'cn_08_atgm': 'us_stryker_atgm', 'cn_uav_recon': 'us_rq7',
          'cn_eng': 'us_eng', 'cn_supply': 'us_supply',
          'cn_rifle191': 'us_rifle_sopmod', 'cn_pp87': 'us_m252',
          'cn_z20': 'us_uh60m', 'cn_medevac': 'us_medevac'
        },
        RU: {
          'cn_04a': 'ru_bmp3', 'cn_99a': 'ru_t90m',
          'cn_08': 'ru_btr82a', 'cn_15': 'ru_bmp3',
          'cn_z10': 'ru_ka52', 'cn_08_mortar': 'ru_2s1',
          'cn_08_atgm': 'ru_bmp3', 'cn_uav_recon': 'ru_orlan',
          'cn_eng': 'ru_eng', 'cn_supply': 'ru_supply',
          'cn_rifle191': 'ru_mot_rifle_m', 'cn_pp87': 'ru_2b14',
          'cn_z20': 'ru_mi8', 'cn_medevac': 'ru_medevac'
        },
        CN: {} // 中国直接用原 ID
      };

      // ================= 2. 定义三种合成营编制结构 =================
      // 格式: { id: 单位ID, count: 数量 }
      const BATTALIONS = {
        heavy: {
          name: '重型合成营',
          desc: '3装步连 + 2重坦连 + 1炮兵连 + 1支援连 + 1保障连 (攻坚/突破)',
          roster: [
            // 3个装甲步兵连
            { id: 'cn_04a', count: 9 }, { id: 'cn_rifle191', count: 9 }, 
            // 2个重型坦克连
            { id: 'cn_99a', count: 6 },
            // 1个炮兵连 (迫击炮/反坦克导弹)
            { id: 'cn_08_mortar', count: 3 }, { id: 'cn_08_atgm', count: 3 },
            // 1个支援连 (工兵/扫雷)
            { id: 'cn_eng', count: 3 },
            // 1个保障连
            { id: 'cn_supply', count: 3 }
          ]
        },
        medium: {
          name: '中型合成营',
          desc: '4步兵连 + 1轻坦连 + 1武直中队 + 1支援连 + 1保障连 (巷战/清剿)',
          roster: [
            // 4个步兵连 (轮式战车+猛士+步兵)
            { id: 'cn_08', count: 6 }, { id: 'cn_mengshi', count: 4 }, { id: 'cn_rifle191', count: 8 },
            // 1个轻型坦克连
            { id: 'cn_15', count: 4 },
            // 1个武装直升机中队
            { id: 'cn_z10', count: 4 },
            // 1个作战支援连 (大量无人机)
            { id: 'cn_uav_recon', count: 6 },
            // 1个保障连
            { id: 'cn_supply', count: 4 }
          ]
        },
        light: {
          name: '轻型合成营',
          desc: '5步兵连 + 1武直中队 + 1炮兵连 + 1支援连 + 1保障连 (空突/快反)',
          roster: [
            // 5个步兵连 (空降/轻步兵)
            { id: 'cn_airborne', count: 10 }, { id: 'cn_rifle191', count: 5 },
            // 1个武直中队
            { id: 'cn_z10', count: 4 },
            // 1个炮兵连 (120以下迫击炮)
            { id: 'cn_pp87', count: 4 },
            // 1个支援连 (直20运输)
            { id: 'cn_z20', count: 4 },
            // 1个保障连
            { id: 'cn_medevac', count: 2 }, { id: 'cn_supply', count: 2 }
          ]
        }
      };

      // ================= 3. 注入顶部 UI 按钮 =================
      function buildButton() {
        if (document.getElementById('btnSyntheticBtn')) return;
        const top = document.getElementById('topbar');
        if (!top) { setTimeout(buildButton, 300); return; }

        const btn = document.createElement('button');
        btn.id = 'btnSyntheticBtn';
        btn.textContent = '⚔ 合成营开局';
        btn.style.cssText = 'background:#2a1a3a;border:1px solid #d0a0e0;color:#fff;font-weight:bold';
        
        const ref = document.getElementById('btnNew');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
        else top.insertBefore(btn, top.firstChild);

        btn.onclick = openModal;
      }
      setTimeout(buildButton, 800);

      // ================= 4. 弹出配置模态框 =================
      function openModal() {
        let modal = document.getElementById('modalSynthetic');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'modalSynthetic';
          modal.className = 'modal';
          modal.innerHTML = `
            <div class="modalBox" style="max-width:600px">
              <h2>⚔ 合成营一键开局</h2>
              <p class="hint" style="margin-bottom:10px">人类与AI将同时按此编制生成部队。你可以后续进入游戏再微调。</p>
              
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <div><label>蓝方（人类）</label><select id="synNat0" style="width:100%">
                  <option value="CN">中国</option><option value="US">美国</option><option value="RU">俄罗斯</option>
                </select></div>
                <div><label>红方（AI）</label><select id="synNat1" style="width:100%">
                  <option value="CN">中国</option><option value="US">美国</option><option value="RU">俄罗斯</option>
                </select></div>
              </div>

              <div style="margin-bottom:8px">
                <label>编制类型</label>
                <select id="synType" style="width:100%;font-size:14px;padding:6px">
                  <option value="heavy" style="color:#f85149">重型合成营 (99A + 04A)</option>
                  <option value="medium" style="color:#d29922">中型合成营 (08轮式 + 15轻坦)</option>
                  <option value="light" style="color:#58a6ff">轻型合成营 (空降轻步兵 + 武直)</option>
                </select>
                <div id="synDesc" class="hint" style="margin-top:4px;color:#8b949e">配置说明</div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
                <div><label>地图</label><select id="synMapType" style="width:100%">
                  <option value="encounter">遭遇战</option><option value="urban">城市战</option>
                  <option value="desert">沙漠战</option><option value="forest">森林战</option>
                  <option value="mountain">山地战</option><option value="plains">平原战</option>
                </select></div>
                <div><label>尺寸</label><select id="synMapSize" style="width:100%">
                  <option value="medium" selected>中 30×22</option>
                  <option value="large">大 45×32</option>
                  <option value="huge">特大 60×40</option>
                </select></div>
              </div>

              <div style="display:flex;gap:6px">
                <button id="synStartBtn" class="active" style="flex:1">开始部署</button>
                <button id="synCancelBtn" class="sm">取消</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          const typeSel = modal.querySelector('#synType');
          const descEl = modal.querySelector('#synDesc');
          typeSel.onchange = () => {
            descEl.textContent = BATTALIONS[typeSel.value].desc;
          };
          descEl.textContent = BATTALIONS['heavy'].desc;

          modal.querySelector('#synCancelBtn').onclick = () => modal.classList.remove('on');
          modal.querySelector('#synStartBtn').onclick = () => {
            modal.classList.remove('on');
            executeDeployment(
              modal.querySelector('#synNat0').value,
              modal.querySelector('#synNat1').value,
              typeSel.value,
              modal.querySelector('#synMapType').value,
              modal.querySelector('#synMapSize').value
            );
          };
        }
        modal.classList.add('on');
      }

      // ================= 5. 拦截系统默认的 generateDeploy =================
      // 如果不拦截，游戏会自动生成默认随机部队，导致满屏都是兵
      let isSyntheticDeploying = false;
      api.override('generateDeploy', orig => function (nat) {
        if (isSyntheticDeploying) return [];
        return orig(nat);
      });

      // ================= 6. 执行部署 =================
      function executeDeployment(nat0, nat1, type, mapType, mapSize) {
        isSyntheticDeploying = true;

        // 设置全局状态
        G.sideNat = [nat0, nat1];
        G.ai = [false, true];
        document.getElementById('natSide0').value = nat0;
        document.getElementById('natSide1').value = nat1;

        // 初始化空地图
        initGame(mapType, mapSize);
        isSyntheticDeploying = false;

        const map = G.map;
        const bConfig = BATTALIONS[type];
        
        log(`⚔ 开始生成【${bConfig.name}】`, 'lg-ok');
        log(`蓝方: ${nat0} · 红方: ${nat1}`, 'lg-sys');

        // 展开编制为具体单位 ID 数组
        const buildRoster = (nat) => {
          const list = [];
          const eqMap = EQUIV[nat] || {};
          bConfig.roster.forEach(item => {
            // 查找等价单位，如果没有就用原ID（针对中国）
            const finalId = eqMap[item.id] || item.id;
            for (let i = 0; i < item.count; i++) list.push(finalId);
          });
          return list;
        };

        const blueRoster = buildRoster(nat0);
        const redRoster = buildRoster(nat1);

        // 部署函数（寻路放置）
        const deployForce = (roster, side, startRow, isReverse) => {
          const perRow = Math.max(4, Math.floor(map.cols / 5));
          const rowGap = Math.max(2, Math.floor((map.cols - 4) / perRow));
          let placed = 0;
          
          for (let row = 0; row < 30 && placed < roster.length; row++) {
            for (let col = 0; col < perRow && placed < roster.length; col++) {
              // 蓝方从下往上，红方从上往下
              const rr = isReverse ? (map.rows - 3 - startRow - row) : (2 + startRow + row);
              const cc = isReverse 
                ? (2 + col * rowGap) 
                : (map.cols - 3 - col * rowGap);
                
              if (api.inBounds(cc, rr) && !api.unitAt(cc, rr)) {
                api.spawn(roster[placed], side, cc, rr, isReverse ? 0 : 3);
                placed++;
              }
            }
          }
          log(`部署 ${side === 0 ? '蓝方' : '红方'}：${placed} 个单位`, 'lg-ok');
        };

        // 蓝方从下往上放，红方从上往下放
        deployForce(blueRoster, 0, 0, true);
        deployForce(redRoster, 1, 0, false);

        // 刷新画面
        api.recalcVisibility();
        updateUI();
        draw();
      }

      console.log('[synthetic-battalion] 合成营编制 Mod 已加载');
    }
  });
})();