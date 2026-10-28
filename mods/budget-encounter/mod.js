(function () {
  if (!window.MTW) return;
  MTW.defineMod({
    id: 'budget-encounter',
    name: '预算遭遇战',
    version: '1.0',
    setup(api) {

      // ================= 1. 常量与状态 =================
      const BUDGET_OPTIONS = [1000, 2000, 3000, 5000, 10000, 50000, 100000];
      const DEFAULT_BUDGET = 5000;

      const state = {
        active: false,      // 是否处于预算战模式
        phase: 'idle',      // idle | deploying | battle
        budget: DEFAULT_BUDGET,
        humanSpent: 0,
        aiSpent: 0
      };

      let budgetBarEl = null;


      // ================= 2. 预算状态条 =================
      function ensureBar() {
        if (budgetBarEl) return;
        budgetBarEl = document.createElement('div');
        budgetBarEl.id = 'budgetBar';
        budgetBarEl.style.cssText = `
          position:absolute; top:44px; left:50%; transform:translateX(-50%);
          background:rgba(22,27,34,.96); border:2px solid #f0b72f; border-radius:6px;
          padding:6px 14px; font-size:12px; z-index:46; display:none;
          box-shadow:0 2px 14px #000b; backdrop-filter:blur(6px);
          align-items:center; gap:10px; white-space:nowrap;
        `;
        budgetBarEl.innerHTML = `
          <span style="color:#f0b72f;font-weight:700;letter-spacing:.5px">⚔ 预算遭遇战</span>
          <span style="color:#8b949e">剩余 <b id="bdRemain" style="color:#3fb950">0</b> / <b id="bdMax" style="color:#58a6ff">0</b> 分</span>
          <span style="color:#8b949e">已用 <b id="bdUsed" style="color:#d29922">0</b> 分</span>
          <button id="bdReadyBtn" style="background:#3fb950;border:1px solid #5eff70;color:#fff;font-weight:700;
                  padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11.5px">⚔ 准备就绪</button>
          <button id="bdCancelBtn" style="background:#8b2020;border:1px solid #f85149;color:#fff;
                  padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11.5px">✕ 取消</button>
        `;
        (document.getElementById('stage') || document.body).appendChild(budgetBarEl);

        document.getElementById('bdReadyBtn').onclick = deployAI;
        document.getElementById('bdCancelBtn').onclick = () => {
          if (!confirm('取消预算遭遇战？当前进度将丢失。')) return;
          state.active = false;
          state.phase = 'idle';
          hideBar();
          log('已取消预算遭遇战', 'lg-sys');
        };
      }

      function showBar() { ensureBar(); budgetBarEl.style.display = 'flex'; refreshBar(); }
      function hideBar() { if (budgetBarEl) budgetBarEl.style.display = 'none'; }

      function refreshBar() {
        if (!budgetBarEl || budgetBarEl.style.display === 'none') return;
        const rem = Math.max(0, state.budget - state.humanSpent);
        const remEl = document.getElementById('bdRemain');
        remEl.textContent = rem;
        remEl.style.color = rem <= 0 ? '#f85149'
                          : rem < state.budget * 0.15 ? '#d29922' : '#3fb950';
        document.getElementById('bdMax').textContent = state.budget;
        document.getElementById('bdUsed').textContent = state.humanSpent;
      }


      // ================= 3. 配置模态框 =================
      function openSetupModal() {
        let modal = document.getElementById('modalBudgetSetup');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'modalBudgetSetup';
          modal.className = 'modal';
          modal.innerHTML = `
            <div class="modalBox" style="max-width:720px">
              <h2>⚔ 预算遭遇战</h2>
              <p class="hint" style="margin-bottom:10px;line-height:1.6">
                双方获得相同分值上限。你手动选单位（受预算约束），AI 按难度等级自动组建战斗群与单位编成。
              </p>

              <h3 style="font-size:10px;color:#8b949e;margin-bottom:5px">分值上限</h3>
              <div id="budgetOptions" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px"></div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <div><label>蓝方（你）</label><select id="budgetNat0" style="width:100%">
                  <option value="US">美国</option><option value="CN">中国</option><option value="RU">俄罗斯</option>
                </select></div>
                <div><label>红方（AI）</label><select id="budgetNat1" style="width:100%">
                  <option value="CN">中国</option><option value="US">美国</option><option value="RU">俄罗斯</option>
                </select></div>
              </div>

              <div style="margin-bottom:8px">
                <label>AI 难度</label>
                <select id="budgetAIDiff" style="width:100%">
                  <option value="beginner">入门 — 直射寻路（偏弱）</option>
                  <option value="easy">低 — 集火协同</option>
                  <option value="medium" selected>中 — 战斗群协同</option>
                  <option value="hard">高 — 全谱联合作战（最强）</option>
                </select>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
                <div><label>地图</label><select id="budgetMapType" style="width:100%">
                  <option value="encounter">遭遇战</option><option value="urban">城市战</option>
                  <option value="desert">沙漠战</option><option value="forest">森林战</option>
                  <option value="mountain">山地战</option><option value="plains">平原战</option>
                  <option value="amphibious">两栖战</option><option value="random">随机</option>
                </select></div>
                <div><label>尺寸</label><select id="budgetMapSize" style="width:100%">
                  <option value="small">小 20×15</option>
                  <option value="medium" selected>中 30×22</option>
                  <option value="large">大 45×32</option>
                  <option value="huge">特大 60×40</option>
                  <option value="营级">营级 100×100</option>
                </select></div>
              </div>

              <div style="display:flex;gap:6px">
                <button id="budgetStartBtn" class="active" style="flex:1">开始部署</button>
                <button id="budgetCancelModalBtn" class="sm">取消</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          // 分值卡片
          const opts = modal.querySelector('#budgetOptions');
          let selectedBudget = DEFAULT_BUDGET;
          BUDGET_OPTIONS.forEach(b => {
            const el = document.createElement('div');
            el.className = 'budgetOption';
            el.dataset.budget = b;
            el.style.cssText = `
              padding:14px 8px;border:2px solid ${b === DEFAULT_BUDGET ? '#f0b72f' : '#30363d'};
              border-radius:6px;cursor:pointer;text-align:center;
              background:${b === DEFAULT_BUDGET ? '#1f2a1f' : '#0d1117'};transition:.15s;
            `;
            el.innerHTML = `
              <div style="font-size:20px;font-weight:700;color:#f0b72f">${b.toLocaleString()}</div>
              <div style="font-size:10px;color:#8b949e;margin-top:2px">分</div>
            `;
            el.onclick = () => {
              opts.querySelectorAll('.budgetOption').forEach(x => {
                x.style.borderColor = '#30363d';
                x.style.background = '#0d1117';
              });
              el.style.borderColor = '#f0b72f';
              el.style.background = '#1f2a1f';
              selectedBudget = b;
            };
            opts.appendChild(el);
          });

          modal.querySelector('#budgetStartBtn').onclick = () => {
            modal.classList.remove('on');
            startDeployment(selectedBudget);
          };
          modal.querySelector('#budgetCancelModalBtn').onclick = () => {
            modal.classList.remove('on');
          };
        }
        modal.classList.add('on');
      }


      // ================= 4. 开始部署 =================
      function startDeployment(budget) {
        state.active = true;
        state.phase = 'deploying';
        state.budget = budget;
        state.humanSpent = 0;
        state.aiSpent = 0;

        const nat0 = document.getElementById('budgetNat0').value;
        const nat1 = document.getElementById('budgetNat1').value;
        const diff = document.getElementById('budgetAIDiff').value;
        const mapType = document.getElementById('budgetMapType').value;
        const mapSize = document.getElementById('budgetMapSize').value;

        // 阵营配置
        document.getElementById('natSide0').value = nat0;
        document.getElementById('natSide1').value = nat1;
        G.sideNat = [nat0, nat1];
        G.ai = [false, true];
        G.aiDifficulty[1] = diff;

        document.getElementById('btnSide0ai').textContent = '蓝方：人类';
        document.getElementById('btnSide1ai').textContent = '红方：AI';
        const diffSel = document.getElementById('aiDiffSel');
        if (diffSel) diffSel.value = diff;

        // 让右侧棋子面板显示人类阵营
        const fltNat = document.getElementById('fltNat');
        if (fltNat) fltNat.value = nat0;

        // 生成空地图（generateDeploy 拦截器返回空 → 双方均为空）
        initGame(mapType, mapSize);

        // 提示
        log(`⚔ 预算遭遇战：分值上限 ${budget.toLocaleString()} 分`, 'lg-ok');
        log(`人类 ${(NAT_INFO[nat0] || {}).n || nat0} · AI ${(NAT_INFO[nat1] || {}).n || nat1} · 难度 ${diff}`, 'lg-ok');
        log('从右侧棋子面板选择单位 → 点击地图放置', 'lg-info');
        log('点击顶部 "⚔ 准备就绪" 结束部署，AI 将自动编成', 'lg-ranged');

        showBar();
        updateUI();
        draw();
      }


      // ================= 5. AI 编成生成 =================
      function generateAIComposition(nat, budget, diff) {
        const allDefs = UNIT_DEFS.filter(d =>
          d.nation === nat && d.cat !== 'FORT' && d.cat !== 'MINE' && d.pts > 0
        );
        if (!allDefs.length) return { roster: [], spent: 0 };

        const coreCats    = ['ARM', 'IFV', 'INF', 'SF'];
        const supportCats = ['ARTY', 'AD', 'RECON', 'EW', 'LOG', 'HELI', 'AIR', 'UAV'];
        const coreList    = allDefs.filter(d => coreCats.includes(d.cat));
        const supportList = allDefs.filter(d => supportCats.includes(d.cat));

        // 难度参数表：suppRatio=支援占比 · quality=质量偏好（越高越贵）· eliteP=精英占比
        const cfg = {
          beginner: { suppRatio: 0.15, quality: 0.6, eliteP: 0.10 },
          easy:     { suppRatio: 0.25, quality: 0.8, eliteP: 0.20 },
          medium:   { suppRatio: 0.35, quality: 1.0, eliteP: 0.40 },
          hard:     { suppRatio: 0.45, quality: 1.4, eliteP: 0.65 }
        }[diff] || { suppRatio: 0.35, quality: 1.0, eliteP: 0.40 };

        const roster = [];
        let spent = 0;

        // 按 pts^quality 加权抽取，让高难度更偏好贵单位
        const pickWeighted = (list) => {
          if (!list.length) return null;
          const weighted = [];
          list.forEach(d => {
            const w = Math.max(1, Math.round(Math.pow(d.pts, cfg.quality)));
            for (let i = 0; i < Math.min(w, 20); i++) weighted.push(d);
          });
          return weighted[Math.floor(Math.random() * weighted.length)];
        };

        // ---- 第一阶段：精英单位（占精英预算）----
        const elites = allDefs.filter(d => d.pts >= 60);
        let eliteSpent = 0, safety = 0;
        while (eliteSpent < budget * cfg.eliteP && safety++ < 30) {
          const affordable = elites.filter(d => spent + d.pts <= budget * 0.9);
          if (!affordable.length) break;
          const pick = pickWeighted(affordable);
          if (!pick) break;
          roster.push(pick.id); spent += pick.pts; eliteSpent += pick.pts;
        }

        // ---- 第二阶段：核心（占剩余 × (1 - suppRatio)）----
        let coreSpent = 0; safety = 0;
        const coreBudget = (budget - spent) * (1 - cfg.suppRatio);
        while (coreSpent < coreBudget && safety++ < 200) {
          const affordable = coreList.filter(d => spent + d.pts <= budget * 0.95);
          if (!affordable.length) break;
          const pick = pickWeighted(affordable);
          if (!pick) break;
          roster.push(pick.id); spent += pick.pts; coreSpent += pick.pts;
        }

        // ---- 第三阶段：支援（占剩余 × 70%）----
        let suppSpent = 0; safety = 0;
        while (suppSpent < (budget - spent) * 0.7 && safety++ < 100) {
          const affordable = supportList.filter(d => spent + d.pts <= budget);
          if (!affordable.length) break;
          const pick = pickWeighted(affordable);
          if (!pick) break;
          roster.push(pick.id); spent += pick.pts; suppSpent += pick.pts;
        }

        // ---- 第四阶段：剩余分填充（优先贵）----
        safety = 0;
        while (safety++ < 50) {
          const affordable = allDefs.filter(d => spent + d.pts <= budget).sort((a, b) => b.pts - a.pts);
          if (!affordable.length) break;
          const pick = affordable[0];
          roster.push(pick.id); spent += pick.pts;
        }

        // 保底
        if (!roster.length) {
          const cheapest = allDefs.slice().sort((a, b) => a.pts - b.pts)[0];
          if (cheapest) roster.push(cheapest.id);
        }

        return { roster, spent };
      }


      // ================= 6. AI 部署 =================
      function deployAI() {
        if (state.phase !== 'deploying') return;
        state.phase = 'battle';

        const nat    = G.sideNat[1];
        const diff   = G.aiDifficulty[1] || 'medium';
        const budget = state.budget;

        log(`🤖 AI 开始组建部队（预算 ${budget.toLocaleString()} 分 · 难度 ${diff}）`, 'lg-ew');
        const { roster, spent } = generateAIComposition(nat, budget, diff);
        state.aiSpent = spent;

        const m = G.map;
        const perRow = Math.max(4, Math.floor(m.cols / 5));
        const rowGap = Math.max(2, Math.floor((m.cols - 4) / perRow));
        let placed = 0;

        for (let row = 0; row < 25 && placed < roster.length; row++) {
          for (let col = 0; col < perRow && placed < roster.length; col++) {
            const rr = 2 + row;
            const cc = m.cols - 3 - col * rowGap;
            if (api.inBounds(cc, rr) && !api.unitAt(cc, rr)) {
              api.spawn(roster[placed], 1, cc, rr, 3);
              placed++;
            }
          }
        }

        log(`🤖 AI 已部署 ${placed} 个单位，共 ${spent} 分（剩余 ${budget - spent}）`, 'lg-ew');

        hideBar();
        api.recalcVisibility();
        updateUI();
        draw();
      }


      // ================= 7. 拦截：generateDeploy =================
      // 部署阶段返回空 → 系统不会自动生成任何单位（人类+AI 都空）
      api.override('generateDeploy', orig => function (nat) {
        if (state.active && state.phase === 'deploying') return [];
        return orig(nat);
      });


      // ================= 8. 拦截：spawn =================
      // 人类放置单位时按 def.pts 扣预算，不足则拒绝
      api.override('spawn', orig => function (defId, side, c, r, facing) {
        if (state.active && state.phase === 'deploying' && side === 0) {
          const def = typeof defId === 'string' ? DEF_BY_ID[defId] : defId;
          if (!def) return orig(defId, side, c, r, facing);

          const remain = state.budget - state.humanSpent;
          if (def.pts > remain) {
            log(`❌ 预算不足！${def.name} 需要 ${def.pts} 分，剩余 ${remain} 分`, 'lg-sys');
            addEffect('text', c, r, { dur: 30, text: '预算不足', color: '#f85149' });
            return null;
          }

          const u = orig(defId, side, c, r, facing);
          if (u) {
            state.humanSpent += def.pts;
            refreshBar();
            log(`✅ 放置 ${def.name}（-${def.pts} 分 · 剩余 ${state.budget - state.humanSpent}）`, 'lg-ok');
          }
          return u;
        }
        return orig(defId, side, c, r, facing);
      });


      // ================= 9. 拦截：endTurn =================
      // 部署阶段禁止提前结束回合
      api.override('endTurn', orig => function () {
        if (state.active && state.phase === 'deploying') {
          log('⚠ 请先点击顶部 "⚔ 准备就绪" 完成部署', 'lg-sys');
          return;
        }
        return orig();
      });


      // ================= 10. 拦截：initGame =================
      // 战斗结束后（手动开新局）自动重置状态
      api.override('initGame', orig => function (a, b) {
        if (state.phase === 'battle') {
          state.active = false;
          state.phase = 'idle';
          hideBar();
        }
        return orig.apply(this, arguments);
      });


      // ================= 11. 顶部主按钮 =================
      function buildMainButton() {
        if (document.getElementById('btnBudgetBattle')) return;
        const top = document.getElementById('topbar');
        if (!top) { setTimeout(buildMainButton, 300); return; }

        const btn = document.createElement('button');
        btn.id = 'btnBudgetBattle';
        btn.textContent = '⚔ 预算战';
        btn.style.cssText = 'background:#1f6feb;border:1px solid #58a6ff;color:#fff';

        const ref = document.getElementById('btnNew');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
        else top.insertBefore(btn, top.firstChild);

        btn.onclick = openSetupModal;
      }
      setTimeout(buildMainButton, 800);


      console.log('[budget-encounter] 预算遭遇战已加载');
    }
  });
})();