/* ============================================================
 * mods/campaign-loader/mod.js — 战役加载器 + 新地图类型
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[campaign-loader] MTW 未就绪'); return; }

  function buildAirport(cols, rows) {
    const m = makeMap(cols, rows, 'open');
    const setT = (c, r, id) => { if (c >= 0 && r >= 0 && c < cols && r < rows) m.cells[r][c].t = T_IDX[id]; };
    const setE = (c, r, v) => { if (c >= 0 && r >= 0 && c < cols && r < rows) m.cells[r][c].elev = v; };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) setT(c, r, Math.random() < 0.55 ? 'open' : 'grass');
    const rw1 = Math.floor(rows * 0.30), rw2 = Math.floor(rows * 0.70);
    const c0 = Math.floor(cols * 0.10), c1 = Math.floor(cols * 0.90);
    for (let c = c0; c < c1; c++) {
      setT(c, rw1, 'runway'); setT(c, rw1 + 1, 'runway');
      setT(c, rw2, 'runway'); setT(c, rw2 - 1, 'runway');
    }
    for (let r = rw1; r <= rw2; r++) { setT(c0 + 3, r, 'runway'); setT(c1 - 3, r, 'runway'); }
    const tc0 = Math.floor(cols * 0.42), tc1 = Math.floor(cols * 0.58);
    const tr0 = Math.floor(rows * 0.42), tr1 = Math.floor(rows * 0.56);
    for (let c = tc0; c <= tc1; c++) for (let r = tr0; r <= tr1; r++)
      setT(c, r, (c === tc0 || c === tc1 || r === tr0 || r === tr1) ? 'airport' : 'city');
    for (let i = 0; i < 8; i++) {
      const c = Math.floor(cols * 0.18) + i * Math.floor(cols * 0.075);
      const r = Math.floor(rows * 0.12);
      for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) setT(c + dc, r + dr, 'industry');
    }
    for (let i = 0; i < cols * rows * 0.12; i++) {
      const c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * rows);
      if (['open', 'grass'].includes(TERRAIN[m.cells[r][c].t].id)) setT(c, r, Math.random() < 0.5 ? 'forest' : 'brush');
    }
    for (let i = 0; i < cols * rows * 0.08; i++) setE(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), Math.floor(Math.random() * 3));
    return m;
  }

  function buildTaiwan(cols, rows) {
    const m = makeMap(cols, rows, 'sea');
    const setT = (c, r, id) => { if (c >= 0 && r >= 0 && c < cols && r < rows) m.cells[r][c].t = T_IDX[id]; };
    const seaEnd = Math.floor(cols * 0.34);
    const beachEnd = Math.floor(cols * 0.44);
    const plainEnd = Math.floor(cols * 0.62);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (c < seaEnd) setT(c, r, 'sea');
      else if (c < beachEnd) setT(c, r, Math.random() < 0.5 ? 'beach' : 'sand');
      else if (c < plainEnd) setT(c, r, Math.random() < 0.5 ? 'open' : (Math.random() < 0.4 ? 'grass' : 'farm'));
      else {
        if (r < rows * 0.55) setT(c, r, Math.random() < 0.55 ? 'city' : 'village');
        else setT(c, r, Math.random() < 0.5 ? 'hill' : (Math.random() < 0.4 ? 'mount' : 'forest'));
      }
    }
    return m;
  }

  // ⚠️ 注意这里改成了 MTW.api.override
  MTW.api.override('genMapByType', orig => function (type, cols, rows) {
    if (type === 'airport') return buildAirport(cols, rows);
    if (type === 'taiwan') return buildTaiwan(cols, rows);
    return orig(type, cols, rows);
  });

  // ⚠️ 注意这里改成了 MTW.api.addMapType
  MTW.api.addMapType('airport', { n: '机场战', icon: '✈', desc: '跑道·航站楼·机库' });
  MTW.api.addMapType('taiwan', { n: '两栖战', icon: '⚓', desc: '海峡·滩头·纵深' });

  function applyCampaign(c) {
    if (!c || !c.id) throw new Error('战役数据缺少 id');
    initGame(c.mapType || 'encounter', c.mapSize || 'large');
    G.units = []; G.wrecks = []; G.effects = []; UID = 1;
    const unitMap = c.unit_map || {};
    const resolveId = key => unitMap[key] || key;
    const factions = c.factions || ['US', 'CN'];
    const natToSide = { [factions[0]]: 0, [factions[1]]: 1 };
    Object.entries(c.deployments || {}).forEach(([nat, list]) => {
      const side = natToSide[nat];
      if (side === undefined) return;
      list.forEach(d => {
        const id = resolveId(d.key);
        const def = DEF_BY_ID[id];
        if (!def) return;
        spawn(def, side, d.c, d.r, d.facing !== undefined ? d.facing : (side === 0 ? 0 : 3));
      });
    });
    G.campaign = { data: c, objectives: c.objectives || {}, maxTurns: c.turns || 15, startTurn: G.turn, status: 'running', captures: {} };
    G.sideNat = [factions[0], factions[1]];
    computeEW(); recalcVisibility(); updateUI(); draw();
    log(`📖 战役【${c.name}】开始`, 'lg-ok');
  }

  function checkCampaignEnd() {
    const c = G.campaign;
    if (!c || c.status !== 'running') return;
    const obj = c.objectives || {};
    const caps = {};
    (obj.capture_hexes || []).forEach(h => {
      const u = G.units.find(u => !u.dead && u.c === h.c && u.r === h.r);
      caps[h.name] = u ? u.side : -1;
    });
    c.captures = caps;
    if (G.units.filter(u => !u.dead && u.side === 0).length === 0) { G.gameOver = true; log('=== 红方获胜 ===', 'lg-hit'); return; }
    if (G.turn > c.maxTurns) {
      const allCaps = (obj.capture_hexes || []).every(h => caps[h.name] === 0);
      G.gameOver = true;
      log(`=== ${allCaps ? '蓝方' : '红方'}获胜 (超时) ===`, allCaps ? 'lg-ok' : 'lg-hit');
    }
  }

  function buildCampaignUI() {
    const top = document.getElementById('topbar');
    if (!top || document.getElementById('btnCampaign')) return;
    const btn = document.createElement('button');
    btn.id = 'btnCampaign';
    btn.textContent = '📖 战役';
    const anchor = document.getElementById('btnNew');
    if (anchor) anchor.after(btn); else top.insertBefore(btn, top.firstChild);
    btn.onclick = openCampaignModal;
  }

  async function openCampaignModal() {
    let modal = document.getElementById('campaignModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'campaignModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modalBox" style="max-width:760px">
          <h2>📖 战役选择</h2>
          <div id="campaignList" class="grid2"></div>
          <div style="margin-top:10px"><button id="campClose" class="sm">关闭</button></div>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('campClose').onclick = () => modal.classList.remove('on');
    }
    const listEl = document.getElementById('campaignList');
    
    // 直接写死数据，防止 electron fetch 报错
    const campaigns = [
      { "id": "antonov_airport", "name": "安东诺夫机场突袭", "icon": "✈", "desc": "VDV空降突袭·12回合夺机场" },
      { "id": "taiwan_landing",  "name": "台海登陆战役",     "icon": "⚓", "desc": "渡海登陆·18回合夺纵深" }
    ];

    listEl.innerHTML = campaigns.map(c => `
      <div class="mapTypeCard" data-id="${c.id}" style="cursor:pointer">
        <span class="mt-icon">${c.icon}</span>
        <div class="mt-name">${c.name}</div>
        <div class="mt-desc">${c.desc || ''}</div>
      </div>`).join('');
      
    listEl.querySelectorAll('.mapTypeCard').forEach(el => {
      el.onclick = async () => {
        modal.classList.remove('on');
        try {
          const res = await fetch('campaigns/' + el.dataset.id + '.json', { cache: 'no-store' });
          if (!res.ok) throw new Error('找不到 JSON 文件');
          const c = await res.json();
          applyCampaign(c);
        } catch (e) {
          log(`❌ 战役加载失败: ${e.message}`, 'lg-hit');
        }
      };
    });
    modal.classList.add('on');
  }

  MTW.defineMod({
    id: 'campaign-loader',
    name: '战役加载器',
    version: '1.0',
    setup(api) {
      api.on('afterTurnEnd', () => {
        if (G.campaign && G.campaign.status === 'running') checkCampaignEnd();
      });
      api.override('initGame', orig => function (a, b) {
        G.campaign = null;
        return orig(a, b);
      });
    }
  });

  if (document.readyState !== 'loading') buildCampaignUI();
  else window.addEventListener('DOMContentLoaded', buildCampaignUI);
  console.log('[campaign-loader] 就绪');
})();