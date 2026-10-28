/* ============================================================
 * MTW ui/sidebar-right.js
 * 右侧面板：阵营配置 / AI 设置 / 操作模式 / 步兵姿态 / 武器选择 / 放置 / 显示
 * 依赖：constants / state / combat / hud
 * ============================================================ */
'use strict';

function buildRightSidebar() {
  const aside = document.getElementById('right');
  if (!aside) return;
  aside.innerHTML = `
    <div class="panel">
      <h3>阵营配置</h3>
      <div class="grid2">
        <div><label>蓝方</label><select id="natSide0"><option value="US">美国</option><option value="CN">中国</option><option value="RU">俄罗斯</option></select></div>
        <div><label>红方</label><select id="natSide1"><option value="CN">中国</option><option value="US">美国</option><option value="RU">俄罗斯</option></select></div>
      </div>
    </div>
    <div class="panel">
      <h3>AI设置</h3>
      <div class="grid2">
        <div><label>难度</label><select id="aiDiffSel">
          <option value="beginner">入门</option>
          <option value="easy">低</option>
          <option value="medium" selected>中</option>
          <option value="hard">高</option>
        </select></div>
        <div><label>偏好</label><select id="aiPrefSel">
          <option value="balanced" selected>综合</option>
          <option value="firepower">重火力</option>
          <option value="offensive">进攻</option>
          <option value="defensive">防守</option>
          <option value="signals">信火</option>
          <option value="maneuver">机动</option>
        </select></div>
      </div>
    </div>
    <div class="panel">
      <h3>操作模式</h3>
      <div class="grid2">
        <button id="mSel" class="active">选择</button>
        <button id="mMove">移动</button>
        <button id="mFire">射击</button>
        <button id="mAttackMove">攻击移动</button>
        <button id="mPlace">放置</button>
      </div>
    </div>
    <div class="panel">
      <h3>步兵姿态 (S)</h3>
      <div class="stanceRow">
        <button id="stDef" class="active">🛡防御</button>
        <button id="stMove">🚶行进</button>
        <button id="stAtk">⚔攻击</button>
      </div>
    </div>
    <div class="panel">
      <h3>武器选择</h3>
      <div id="wpnSelBox"><div class="hint">选中单位后显示武器</div></div>
      <div style="display:flex;gap:3px;margin-top:5px">
        <button id="btnAttack" class="sm active" style="flex:1">攻击</button>
        <button id="btnSuppress" class="sm" style="flex:1">压制</button>
        <button id="btnFireAll" class="sm" style="flex:1">全弹</button>
      </div>
    </div>
    <div class="panel">
      <h3>放置棋子</h3>
      <div class="grid3" style="margin-bottom:4px">
        <select id="fltNat"><option value="ALL">全部</option><option value="US">美国</option><option value="CN">中国</option><option value="RU">俄罗斯</option><option value="N">中立</option></select>
        <select id="fltCat"><option value="ALL">全部类别</option></select>
        <select id="fltEch"><option value="ALL">全部</option><option>SQD</option><option>TM</option><option>SEC</option><option>PLT</option><option>CO</option></select>
      </div>
      <div id="unitlist"></div>
    </div>
    <div class="panel">
      <h3>显示</h3>
      <label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="optGrid" checked style="width:auto"> 网格</label>
      <label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="optRange" checked style="width:auto"> 射程/视野</label>
      <label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="optEW" checked style="width:auto"> 电子战覆盖</label>
      <label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="optFog" checked style="width:auto"> 战争迷雾</label>
      <label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="optFace" checked style="width:auto"> 朝向</label>
      <label style="display:flex;align-items:center;gap:5px"><input type="checkbox" id="optObs" style="width:auto"> 观察范围</label>
    </div>
  `;

  // 类别下拉填充
  const fltCat = document.getElementById('fltCat');
  Object.keys(CAT_INFO).forEach(k => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = CAT_INFO[k].n;
    fltCat.appendChild(o);
  });

  bindRightEvents();
  populateNatSide();
}

function populateNatSide() {
  const s0 = document.getElementById('natSide0');
  const s1 = document.getElementById('natSide1');
  if (s0) s0.value = G.sideNat[0];
  if (s1) s1.value = G.sideNat[1];
}

function bindRightEvents() {
  // 阵营
  document.getElementById('natSide0').onchange = e => { G.sideNat[0] = e.target.value; updateUI(); draw(); };
  document.getElementById('natSide1').onchange = e => { G.sideNat[1] = e.target.value; updateUI(); draw(); };

  // AI 设置
  document.getElementById('aiDiffSel').onchange = e => {
    const aiSide = G.ai[0] ? 0 : 1;
    G.aiDifficulty[aiSide] = e.target.value;
    updateUI();
  };
  document.getElementById('aiPrefSel').onchange = e => {
    const aiSide = G.ai[0] ? 0 : 1;
    G.aiPreference[aiSide] = e.target.value;
    updateUI();
  };

  // 模式
  document.getElementById('mSel').onclick = () => {
    G.mode = 'select'; G.placeDef = null;
    engineerMode = null; ewMode = null;
    ['rangedHint', 'engineerHint', 'ewHint'].forEach(id => document.getElementById(id)?.classList.remove('on'));
    document.getElementById('ftRanged')?.classList.remove('active');
    ['ftClear', 'ftMine', 'ftFort', 'ftRepair', 'ftJam', 'ftEWRecon', 'ftDecoy', 'ftShield', 'ftARM', 'ftCounter', 'ftHack']
      .forEach(id => document.getElementById(id)?.classList.remove('active'));
    setModeBtn('mSel');
    updateUI(); draw();
  };
  document.getElementById('mMove').onclick = () => {
    if (!G.sel) { log('请先选择单位', 'lg-sys'); return; }
    G.mode = 'move'; setModeBtn('mMove'); draw();
  };
  document.getElementById('mFire').onclick = () => {
    if (!G.sel) { log('请先选择单位', 'lg-sys'); return; }
    G.mode = 'fire'; setModeBtn('mFire'); draw();
  };
  document.getElementById('mAttackMove').onclick = () => {
    if (!G.sel) { log('请先选择单位', 'lg-sys'); return; }
    G.mode = 'attackMove'; setModeBtn('mAttackMove');
    log('攻击移动模式', 'lg-ok'); draw();
  };
  document.getElementById('mPlace').onclick = () => { G.mode = 'place'; setModeBtn('mPlace'); };

  // 姿态
  document.getElementById('stDef').onclick = () => setStance('defense');
  document.getElementById('stMove').onclick = () => setStance('move');
  document.getElementById('stAtk').onclick = () => setStance('attack');

  // 攻击/压制/全弹
  document.getElementById('btnAttack').onclick = () => {
    G.attackMode = 'attack';
    document.getElementById('btnAttack').classList.add('active');
    document.getElementById('btnSuppress').classList.remove('active');
  };
  document.getElementById('btnSuppress').onclick = () => {
    G.attackMode = 'suppress';
    document.getElementById('btnSuppress').classList.add('active');
    document.getElementById('btnAttack').classList.remove('active');
  };
  document.getElementById('btnFireAll').onclick = () => {
    if (!G.sel || G.sel.dead) { log('请先选择单位', 'lg-sys'); return; }
    G.selectedWeapons = G.sel.def.weapons.map((w, i) => i).filter(i => {
      const w = G.sel.def.weapons[i];
      return G.sel.ammo[i] >= Math.max(1, Math.round(w.rof)) && G.sel.fired[i] < 1;
    });
    updateUI();
  };

  // 过滤器
  document.getElementById('fltNat').onchange = updateRightPanel;
  document.getElementById('fltCat').onchange = updateRightPanel;
  document.getElementById('fltEch').onchange = updateRightPanel;

  // 显示开关
  ['optGrid','optRange','optEW','optFog','optFace','optObs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = e => {
      const key = id.replace('opt', '').toLowerCase();
      G.opt[key] = e.target.checked;
      if (key === 'fog') recalcVisibility();
      draw();
    };
  });
}

function updateRightPanel() {
  // 武器列表
  const wsb = document.getElementById('wpnSelBox');
  if (wsb) {
    if (!G.sel || G.sel.dead) {
      wsb.innerHTML = '<div class="hint">选中单位后显示武器</div>';
    } else {
      const d = G.sel.def;
      if (!d.weapons.length) {
        wsb.innerHTML = '<div class="hint">该单位无武装</div>';
      } else {
        wsb.innerHTML = d.weapons.map((w, i) => {
          const am = G.sel.ammo[i];
          const cost = Math.max(1, Math.round(w.rof));
          const sel = G.selectedWeapons.includes(i);
          const dis = am < cost || G.sel.fired[i] >= 1;
          const ranged = canAreaFire(w) ? ' 🎯' : '';
          const airMark = canEngageAir(w) ? ' ✈' : '';
          return `<label class="wpnSelRow" style="${dis ? 'opacity:0.45' : ''}">
            <input type="checkbox" data-widx="${i}" ${sel ? 'checked' : ''} ${dis ? 'disabled' : ''}>
            <span style="flex:1">${i + 1}. ${w.n}${ranged}${airMark}</span>
            <span class="hint">${w.r}格 ${am}发${G.sel.fired[i] >= 1 ? ' ✔' : ''}</span>
          </label>`;
        }).join('');
        wsb.querySelectorAll('input').forEach(el => {
          el.onchange = () => {
            const i = parseInt(el.dataset.widx);
            const idx = G.selectedWeapons.indexOf(i);
            if (el.checked && idx < 0) G.selectedWeapons.push(i);
            else if (!el.checked && idx >= 0) G.selectedWeapons.splice(idx, 1);
          };
        });
      }
    }
  }

  // 放置单位列表
  updateUnitList();

  // 姿态高亮
  ['stDef', 'stMove', 'stAtk'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  if (G.sel && !G.sel.dead) {
    if (G.sel.stance === 'defense') document.getElementById('stDef')?.classList.add('active');
    else if (G.sel.stance === 'move') document.getElementById('stMove')?.classList.add('active');
    else if (G.sel.stance === 'attack') document.getElementById('stAtk')?.classList.add('active');
  }
}

function updateUnitList() {
  const list = document.getElementById('unitlist');
  if (!list) return;
  const natF = document.getElementById('fltNat').value;
  const catF = document.getElementById('fltCat').value;
  const echF = document.getElementById('fltEch').value;
  const items = UNIT_DEFS.filter(d => {
    if (natF !== 'ALL' && d.nation !== natF) return false;
    if (catF !== 'ALL' && d.cat !== catF) return false;
    if (echF !== 'ALL' && d.echelon !== echF) return false;
    return true;
  });
  list.innerHTML = items.map(d => `
    <div class="uItem ${G.placeDef === d.id ? 'sel' : ''}" data-id="${d.id}" title="${d.name}">
      <span class="dot" style="background:${NAT_INFO[d.nation].col}"></span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.name}</span>
      <span class="tag ${d.nation}">${d.nation}</span>
    </div>
  `).join('');
  list.querySelectorAll('.uItem').forEach(el => {
    el.onclick = () => {
      G.placeDef = el.dataset.id;
      G.mode = 'place';
      setModeBtn('mPlace');
      updateUI();
    };
  });
}

/* ---------- 设置模式按钮高亮 ---------- */
function setModeBtn(id) {
  ['mSel','mMove','mFire','mAttackMove','mPlace'].forEach(x => document.getElementById(x)?.classList.remove('active'));
  if (id) document.getElementById(id)?.classList.add('active');
}

/* ---------- 姿态 ---------- */
function setStance(s) {
  if (!G.sel || G.sel.dead) return;
  if (!['INF','SF','RECON','ENG'].includes(G.sel.def.cat)) {
    log('该单位无步兵姿态', 'lg-sys'); return;
  }
  G.sel.stance = s;
  log(`${G.sel.def.name} 姿态: ${STANCE_INFO[s].n}`, 'lg-ok');
  updateUI();
  draw();
}

function cycleStance() {
  if (!G.sel || G.sel.dead) return;
  if (!['INF','SF','RECON','ENG'].includes(G.sel.def.cat)) {
    log('该单位无步兵姿态', 'lg-sys'); return;
  }
  const order = ['defense', 'move', 'attack'];
  const idx = order.indexOf(G.sel.stance);
  G.sel.stance = order[(idx + 1) % 3];
  log(`${G.sel.def.name} 姿态: ${STANCE_INFO[G.sel.stance].n}`, 'lg-ok');
  updateUI();
  draw();
}