/* ============================================================
 * MTW ui/modals.js
 * 6 个模态框：新建 / 地图编辑器 / 棋子编辑器 / 武器库 / 资料库 / 帮助
 * 依赖：constants / data-units / data-weapons / terrain / save
 * ============================================================ */
'use strict';

/* ============================================================
 * 1. 模态框 DOM 注入
 * ============================================================ */
function initModals() {
  if (document.getElementById('modalNewGame')) return; // 已注入

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal" id="modalNewGame">
      <div class="modalBox" style="max-width:720px">
        <h2>🗺 新建游戏</h2>
        <h3 style="font-size:10px;color:#8b949e;margin-bottom:5px">地图类型</h3>
        <div class="mapTypeGrid" id="ngTypeGrid"></div>
        <h3 style="font-size:10px;color:#8b949e;margin:8px 0 5px">地图尺寸</h3>
        <div class="mapSizeGrid" id="ngSizeGrid"></div>
        <div style="display:flex;gap:6px;margin-top:12px">
          <button id="ngStart" class="active" style="flex:1">开始</button>
          <button id="ngCancel" class="sm">取消</button>
        </div>
      </div>
    </div>

    <div class="modal" id="modalDatabase">
      <div class="modalBox" style="max-width:1000px">
        <h2>📚 资料库</h2>
        <div class="dbTabs" id="dbTabs">
          <div class="dbTab on" data-t="units">棋子</div>
          <div class="dbTab" data-t="weapons">武器</div>
          <div class="dbTab" data-t="terrain">地形</div>
          <div class="dbTab" data-t="ew">电子战</div>
          <div class="dbTab" data-t="mapinfo">地图</div>
          <div class="dbTab" data-t="help">说明</div>
        </div>
        <div class="dbPane on" id="dbPane-units">
          <div class="dbSearch">
            <input id="dbUnitSearch" placeholder="搜索...">
            <select id="dbUnitNat"><option value="ALL">全部国家</option><option>US</option><option>CN</option><option>RU</option><option>N</option></select>
          </div>
          <div style="max-height:60vh;overflow-y:auto"><table class="dbTable" id="dbUnitTable"></table></div>
        </div>
        <div class="dbPane" id="dbPane-weapons">
          <div class="dbSearch"><input id="dbWpnSearch" placeholder="搜索..."></div>
          <div style="max-height:60vh;overflow-y:auto"><table class="dbTable" id="dbWpnTable"></table></div>
        </div>
        <div class="dbPane" id="dbPane-terrain"><table class="dbTable" id="dbTerrTable"></table></div>
        <div class="dbPane" id="dbPane-ew"><div id="dbEWInfo" style="font-size:11px;line-height:1.8;padding:8px"></div></div>
        <div class="dbPane" id="dbPane-mapinfo"><div id="dbMapInfo" style="font-size:11px;line-height:1.7"></div></div>
        <div class="dbPane" id="dbPane-help"><div class="hint" style="font-size:11px;line-height:1.8;color:#c9d1d9;padding:8px">
          <b>🕹 快捷键：</b>WASD视角 · 空格结束 · Q/E旋转 · 1-9武器 · A攻击移动 · G放置 · S姿态 · R远程<br>
          <b>📡 电子战：</b>J干扰 · K侦察 · L诱饵 · U防护 · Y反辐射 · H反炮兵 · P破译<br>
          <b>🧠 AI难度：</b>入门=直射寻路 / 低=集火协同 / 中=战斗群协同 / 高=全谱联合作战<br>
          <b>🎯 AI偏好：</b>综合/重火力/进攻/防守/信火/机动<br>
          <b>🔐 密码破译：</b>电子战单位持续锁定敌方目标破译，100%后暴露目标
        </div></div>
        <div style="margin-top:10px"><button id="dbClose" class="sm">关闭</button></div>
      </div>
    </div>

    <div class="modal" id="modalMap">
      <div class="modalBox">
        <h2>地图编辑器</h2>
        <div class="grid4" style="margin-bottom:8px">
          <div><label>列数</label><input type="number" id="meCols" value="30" min="8" max="80"></div>
          <div><label>行数</label><input type="number" id="meRows" value="22" min="8" max="60"></div>
          <div><label>笔刷</label><input type="number" id="meBrush" value="1" min="1" max="5"></div>
          <div><label>操作</label><button id="meBlank" style="width:100%">空白地图</button></div>
        </div>
        <div class="grid4" style="margin-bottom:8px">
          <div><label>工具</label><select id="meTool"><option value="terr">地形</option><option value="elev">高程</option><option value="fort">工事</option><option value="mine">雷场</option><option value="rect">矩形</option><option value="line">直线</option></select></div>
          <div><label>高程</label><input type="number" id="meElev" min="0" max="5" value="0"></div>
          <div><label>工事</label><select id="meFort"><option value="0">无</option><option value="1">散兵坑</option><option value="2">战壕</option><option value="3">掩体</option><option value="4">加固</option><option value="5">观察哨</option><option value="6">碉堡</option></select></div>
          <div><label>雷场</label><select id="meMine"><option value="0">无</option><option value="1">反步兵</option><option value="2">反装甲</option><option value="3">混合</option></select></div>
        </div>
        <h3 style="font-size:10px;color:#8b949e;margin-bottom:5px">地形笔刷</h3>
        <div class="toolGrid" id="meTerr" style="margin-bottom:10px"></div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button id="meFill" class="sm">全图填充</button>
          <button id="meRand" class="sm">随机地形</button>
          <button id="meContour" class="sm">生成等高线</button>
          <button id="meExport" class="sm">导出</button>
          <button id="meImport" class="sm">导入</button>
          <button id="meApply" class="active">应用并关闭</button>
          <button id="meClose" class="sm">取消</button>
        </div>
      </div>
    </div>

    <div class="modal" id="modalUnit">
      <div class="modalBox">
        <h2>自定义棋子编辑器</h2>
        <div class="grid3">
          <div><label>ID</label><input id="cuId" placeholder="my_unit"></div>
          <div><label>名称</label><input id="cuName" placeholder="自定义单位"></div>
          <div><label>国家</label><select id="cuNat"><option>US</option><option>CN</option><option>RU</option><option>N</option></select></div>
          <div><label>类别</label><select id="cuCat"><option>INF</option><option>ARM</option><option>IFV</option><option>APC</option><option>ARTY</option><option>AD</option><option>RECON</option><option>UAV</option><option>HELI</option><option>AIR</option><option>ENG</option><option>LOG</option><option>EW</option><option>SF</option><option>NAV</option><option>FORT</option><option>MINE</option></select></div>
          <div><label>编制</label><select id="cuEch"><option>SQD</option><option>TM</option><option>SEC</option><option>PLT</option><option>CO</option></select></div>
          <div><label>兵员</label><input type="number" id="cuMen" value="9"></div>
          <div><label>机动</label><select id="cuMob"><option value="leg">徒步</option><option value="wheel">轮式</option><option value="track">履带</option><option value="air">空中</option><option value="static">固定</option></select></div>
          <div><label>MP</label><input type="number" id="cuMp" value="3" min="0" max="30"></div>
          <div><label>分值</label><input type="number" id="cuPts" value="15"></div>
          <div><label>装甲 前/侧/顶</label><div style="display:flex;gap:3px"><input type="number" id="cuAF" value="0"><input type="number" id="cuAS" value="0"><input type="number" id="cuAT" value="0"></div></div>
          <div><label>APS/ERA/附加</label><div style="display:flex;gap:3px"><input type="number" id="cuAPS" value="0"><input type="number" id="cuERA" value="0"><input type="number" id="cuAddArm" value="0"></div></div>
          <div><label>载员容量</label><input type="number" id="cuCarry" value="0" min="0" max="4"></div>
          <div><label>传感器 视/热/雷/信</label><div style="display:flex;gap:3px"><input type="number" id="cuSV" value="4"><input type="number" id="cuST" value="3"><input type="number" id="cuSR" value="0"><input type="number" id="cuSS" value="0"></div></div>
          <div><label>电子战 扰/抗/诱</label><div style="display:flex;gap:3px"><input type="number" id="cuEJ" value="0"><input type="number" id="cuEC" value="0"><input type="number" id="cuED" value="0"></div></div>
          <div><label>士气/训练/隐蔽</label><div style="display:flex;gap:3px"><input type="number" id="cuMor" value="7"><input type="number" id="cuTrn" value="7"><input type="number" id="cuStl" value="5"></div></div>
          <div><label>特点标签</label><input id="cuCap" placeholder="夜视,两栖"></div>
        </div>
        <h3 style="font-size:10px;color:#8b949e;margin:10px 0 5px">武器（名称,类型,射程,穿深,精度,射速,弹药,制导,攻顶,压制,频段）</h3>
        <textarea id="cuWpn" rows="5" placeholder="M4A1,rifle,5,0,0.75,2,210,0,0,0,"></textarea>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button id="cuSave" class="active">保存棋子</button>
          <button id="cuTest" class="sm">放置到中心</button>
          <button id="cuClose" class="sm">关闭</button>
        </div>
      </div>
    </div>

    <div class="modal" id="modalWpn">
      <div class="modalBox">
        <h2>武器库（点击复制）</h2>
        <div style="margin-bottom:6px;display:flex;gap:5px"><input id="wpnSearch" placeholder="搜索..." style="flex:1"><select id="wpnFilter" style="width:130px"><option value="ALL">全部类型</option></select></div>
        <div id="wpnList" style="max-height:60vh;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:3px"></div>
        <div style="margin-top:8px"><button id="wpnClose" class="sm">关闭</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
}

/* ============================================================
 * 2. 新建游戏
 * ============================================================ */
let ngType = 'encounter';
let ngSize = 'medium';

function buildNewGameDialog() {
  const tg = document.getElementById('ngTypeGrid');
  tg.innerHTML = Object.entries(MAP_TYPES).map(([k, v]) => `
    <div class="mapTypeCard ${ngType === k ? 'sel' : ''}" data-k="${k}">
      <span class="mt-icon">${v.icon}</span>
      <div class="mt-name">${v.n}</div>
      <div class="mt-desc">${v.desc}</div>
    </div>
  `).join('');
  tg.querySelectorAll('.mapTypeCard').forEach(el => {
    el.onclick = () => {
      ngType = el.dataset.k;
      tg.querySelectorAll('.mapTypeCard').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
    };
  });

  const sg = document.getElementById('ngSizeGrid');
  sg.innerHTML = Object.entries(MAP_SIZES).map(([k, v]) => `
    <div class="mapSizeCard ${ngSize === k ? 'sel' : ''}" data-k="${k}">${v.n}</div>
  `).join('');
  sg.querySelectorAll('.mapSizeCard').forEach(el => {
    el.onclick = () => {
      ngSize = el.dataset.k;
      sg.querySelectorAll('.mapSizeCard').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
    };
  });
}

function bindNewGameModal() {
  document.getElementById('btnNew').onclick = () => {
    buildNewGameDialog();
    document.getElementById('modalNewGame').classList.add('on');
  };
  document.getElementById('ngCancel').onclick = () => document.getElementById('modalNewGame').classList.remove('on');
  document.getElementById('ngStart').onclick = () => {
    document.getElementById('modalNewGame').classList.remove('on');
    initGame(ngType, ngSize);
  };
}

/* ============================================================
 * 3. 资料库
 * ============================================================ */
function switchDbTab(t) {
  document.querySelectorAll('.dbTab').forEach(x => x.classList.toggle('on', x.dataset.t === t));
  document.querySelectorAll('.dbPane').forEach(x => x.classList.remove('on'));
  const pane = document.getElementById('dbPane-' + t);
  if (pane) pane.classList.add('on');
  if (t === 'units') renderDbUnits();
  else if (t === 'weapons') renderDbWeapons();
  else if (t === 'terrain') renderDbTerrain();
  else if (t === 'ew') renderDbEW();
  else if (t === 'mapinfo') renderDbMapInfo();
}
function renderDbUnits() {
  const q = (document.getElementById('dbUnitSearch').value || '').toLowerCase();
  const nat = document.getElementById('dbUnitNat').value;
  const rows = UNIT_DEFS.filter(d => {
    if (q && !d.name.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false;
    if (nat !== 'ALL' && d.nation !== nat) return false;
    return true;
  });
  let html = '<thead><tr><th>名称</th><th>国家</th><th>类别</th><th>兵员</th><th>MP</th><th>装甲</th><th>武器</th><th>分值</th></tr></thead><tbody>';
  rows.forEach(d => {
    html += `<tr><td>${d.name}</td><td>${NAT_INFO[d.nation].n}</td><td>${(CAT_INFO[d.cat] || {n: d.cat}).n}</td><td>${d.men}</td><td>${d.mp}</td><td>${d.armor.f}/${d.armor.s}/${d.armor.t}</td><td>${d.weapons.length}</td><td>${d.pts}</td></tr>`;
  });
  document.getElementById('dbUnitTable').innerHTML = html + '</tbody>';
}
function renderDbWeapons() {
  const q = (document.getElementById('dbWpnSearch').value || '').toLowerCase();
  const rows = WEAPON_LIB.filter(w => !q || w[0].toLowerCase().includes(q) || w[1].toLowerCase().includes(q));
  let html = '<thead><tr><th>名称</th><th>类型</th><th>射程</th><th>穿深</th><th>精度</th><th>射速</th><th>弹药</th></tr></thead><tbody>';
  rows.forEach(w => {
    html += `<tr><td>${w[0]}</td><td>${w[1]}</td><td>${w[2]}</td><td>${w[3]}</td><td>${(w[4] * 100).toFixed(0)}%</td><td>${w[5]}</td><td>${w[6]}</td></tr>`;
  });
  document.getElementById('dbWpnTable').innerHTML = html + '</tbody>';
}
function renderDbTerrain() {
  let html = '<thead><tr><th>地形</th><th>徒步</th><th>轮式</th><th>履带</th><th>空中</th><th>掩蔽</th><th>隐蔽</th></tr></thead><tbody>';
  TERRAIN.forEach(t => {
    html += `<tr><td>${t.n}</td><td>${t.mv[0] === Infinity ? '—' : t.mv[0]}</td><td>${t.mv[1] === Infinity ? '—' : t.mv[1]}</td><td>${t.mv[2] === Infinity ? '—' : t.mv[2]}</td><td>${t.mv[3]}</td><td>${t.cov.toFixed(2)}</td><td>${t.con.toFixed(2)}</td></tr>`;
  });
  document.getElementById('dbTerrTable').innerHTML = html + '</tbody>';
}
function renderDbEW() {
  const el = document.getElementById('dbEWInfo');
  if (!el) return;
  el.innerHTML = `
    <div style="color:#d0a0e0;font-weight:700;margin-bottom:6px">电子战动作</div>
    <table class="dbTable"><thead><tr><th>动作</th><th>MP</th><th>说明</th></tr></thead><tbody>
      <tr><td>软杀伤干扰</td><td>2</td><td>压制区域敌方电子设备，命中率-35%</td></tr>
      <tr><td>电子侦察</td><td>1</td><td>侦测周围敌方电子信号，无视迷雾</td></tr>
      <tr><td>电子欺骗</td><td>2</td><td>部署诱饵误导敌方火力</td></tr>
      <tr><td>电子防护</td><td>1</td><td>自身+相邻友军抗干扰+30%</td></tr>
      <tr><td>反辐射打击</td><td>3</td><td>对雷达目标精确打击（命中90%）</td></tr>
      <tr><td>反炮兵雷达</td><td>2</td><td>主动扫描敌方炮兵并标记</td></tr>
      <tr><td>密码破译</td><td>2</td><td>持续破译目标，完成后永久暴露</td></tr>
    </tbody></table>
    <div style="color:#d0a0e0;font-weight:700;margin:10px 0 6px">调频影响</div>
    <table class="dbTable"><thead><tr><th>参数</th><th>效果</th></tr></thead><tbody>
      <tr><td>频率 (30-300MHz)</td><td>影响干扰穿透，越高越强</td></tr>
      <tr><td>功率 (10-100%)</td><td>影响干扰范围，越高越广</td></tr>
      <tr><td>带宽 (10-100%)</td><td>影响压制概率，越高越易眩晕</td></tr>
    </tbody></table>
  `;
}
function renderDbMapInfo() {
  const el = document.getElementById('dbMapInfo');
  if (!el) return;
  if (!G.map) { el.innerHTML = '<div class="hint">暂无地图</div>'; return; }
  const m = G.map, stat = {};
  let fortN = 0, mineN = 0, roadN = 0;
  for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
    const cell = m.cells[r][c];
    const tn = TERRAIN[cell.t].n;
    stat[tn] = (stat[tn] || 0) + 1;
    if (cell.fort > 0) fortN++;
    if (cell.mine > 0) mineN++;
    if (cell.road) roadN++;
  }
  const statHtml = Object.entries(stat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip">${k}: ${v}</span>`).join('');
  el.innerHTML = `
    <div class="row"><span class="k">地图</span><span class="v">${m.cols} × ${m.rows}</span></div>
    <div class="row"><span class="k">蓝方</span><span class="v">${G.units.filter(u => !u.dead && u.side === 0).length}</span></div>
    <div class="row"><span class="k">红方</span><span class="v">${G.units.filter(u => !u.dead && u.side === 1).length}</span></div>
    <div class="row"><span class="k">工事</span><span class="v">${fortN}</span></div>
    <div class="row"><span class="k">雷场</span><span class="v">${mineN}</span></div>
    <div class="row"><span class="k">道路</span><span class="v">${roadN}</span></div>
    <div style="margin-top:8px">${statHtml}</div>
  `;
}
function bindDatabaseModal() {
  document.getElementById('btnDatabase').onclick = () => {
    document.querySelectorAll('.dbTab').forEach(x => { x.onclick = () => switchDbTab(x.dataset.t); });
    document.getElementById('modalDatabase').classList.add('on');
    switchDbTab('units');
  };
  document.getElementById('dbClose').onclick = () => document.getElementById('modalDatabase').classList.remove('on');
  document.getElementById('dbUnitSearch').oninput = renderDbUnits;
  document.getElementById('dbUnitNat').onchange = renderDbUnits;
  document.getElementById('dbWpnSearch').oninput = renderDbWeapons;
}

/* ============================================================
 * 4. 地图编辑器
 * ============================================================ */
function buildTerrainPalette() {
  const box = document.getElementById('meTerr');
  if (!box) return;
  box.innerHTML = TERRAIN.map(t => `
    <div class="tool ${G.edit.terr === t.id ? 'sel' : ''}" data-id="${t.id}" style="background:${t.col}" title="${t.n}">${t.n}</div>
  `).join('');
  box.querySelectorAll('.tool').forEach(el => {
    el.onclick = () => {
      G.edit.terr = el.dataset.id;
      box.querySelectorAll('.tool').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
    };
  });
}
function bindMapModal() {
  document.getElementById('btnMapEd').onclick = () => {
    document.getElementById('meCols').value = G.map.cols;
    document.getElementById('meRows').value = G.map.rows;
    buildTerrainPalette();
    document.getElementById('modalMap').classList.add('on');
    G.mode = 'mapedit';
    G.edit.tool = document.getElementById('meTool').value;
    setModeBtn(null);
  };
  document.getElementById('meClose').onclick = () => {
    document.getElementById('modalMap').classList.remove('on');
    G.mode = 'select'; setModeBtn('mSel'); draw();
  };
  document.getElementById('meApply').onclick = () => {
    document.getElementById('modalMap').classList.remove('on');
    G.mode = 'select'; setModeBtn('mSel'); draw(); updateUI();
  };
  document.getElementById('meBlank').onclick = () => {
    const c = clamp(parseInt(document.getElementById('meCols').value) || 30, 8, 80);
    const r = clamp(parseInt(document.getElementById('meRows').value) || 22, 8, 60);
    G.map = makeMap(c, r, 'open'); G.units = []; G.wrecks = []; G.sel = null;
    log('空白地图 ' + c + '×' + r, 'lg-ok'); draw();
  };
  document.getElementById('meElev').oninput = e => { G.edit.tool = 'elev'; G.edit.elev = parseInt(e.target.value); document.getElementById('meTool').value = 'elev'; };
  document.getElementById('meFort').onchange = e => { G.edit.tool = 'fort'; G.edit.fort = parseInt(e.target.value); document.getElementById('meTool').value = 'fort'; };
  document.getElementById('meMine').onchange = e => { G.edit.tool = 'mine'; G.edit.mine = parseInt(e.target.value); document.getElementById('meTool').value = 'mine'; };
  document.getElementById('meBrush').oninput = e => { G.edit.brush = clamp(parseInt(e.target.value) || 1, 1, 5); };
  document.getElementById('meTool').onchange = e => { G.edit.tool = e.target.value; };
  document.getElementById('meFill').onclick = () => {
    for (let r = 0; r < G.map.rows; r++) for (let c = 0; c < G.map.cols; c++) G.map.cells[r][c].t = T_IDX[G.edit.terr];
    draw();
  };
  document.getElementById('meRand').onclick = () => {
    const rndT = ['open', 'grass', 'forest', 'hill', 'brush', 'farm', 'desert', 'rocky'];
    for (let r = 0; r < G.map.rows; r++) for (let c = 0; c < G.map.cols; c++) {
      const cell = G.map.cells[r][c];
      if (Math.random() < 0.75) cell.t = T_IDX[rndT[Math.floor(Math.random() * rndT.length)]];
      if (Math.random() < 0.15) cell.elev = Math.floor(Math.random() * 4);
      if (Math.random() < 0.04) cell.fort = Math.floor(Math.random() * 4) + 1;
      if (Math.random() < 0.03) cell.mine = Math.floor(Math.random() * 3) + 1;
    }
    draw();
  };
  document.getElementById('meContour').onclick = () => {
    const m = G.map, tmp = [];
    for (let r = 0; r < m.rows; r++) {
      tmp.push([]);
      for (let c = 0; c < m.cols; c++) {
        let sum = 0, cnt = 0;
        hexNeighbors(c, r).forEach(n => { if (inBounds(n.c, n.r)) { sum += m.cells[n.r][n.c].elev; cnt++; } });
        sum += m.cells[r][c].elev * 2; cnt += 2;
        tmp[r].push(sum / cnt);
      }
    }
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) m.cells[r][c].elev = Math.round(tmp[r][c]);
    log('等高线已生成', 'lg-ok'); draw();
  };
  document.getElementById('meExport').onclick = () => {
    const blob = new Blob([JSON.stringify(G.map)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mtw_map.json';
    a.click();
  };
  document.getElementById('meImport').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const m = JSON.parse(rd.result);
          if (!m.cols || !m.rows || !m.cells) throw new Error('格式错误');
          G.map = m;
          log('导入成功', 'lg-ok'); draw();
        } catch (err) { alert('导入失败: ' + err.message); }
      };
      rd.readAsText(f);
    };
    inp.click();
  };
}

/* ============================================================
 * 5. 棋子编辑器
 * ============================================================ */
function bindUnitModal() {
  document.getElementById('btnUnitEd').onclick = () => document.getElementById('modalUnit').classList.add('on');
  document.getElementById('cuClose').onclick = () => document.getElementById('modalUnit').classList.remove('on');
  document.getElementById('cuSave').onclick = () => {
    const id = document.getElementById('cuId').value.trim();
    const name = document.getElementById('cuName').value.trim();
    if (!id || !name) { alert('请填写 ID 和名称'); return; }
    if (DEF_BY_ID[id]) { alert('ID 已存在'); return; }

    const wpnText = document.getElementById('cuWpn').value.trim();
    const weapons = [];
    if (wpnText) {
      wpnText.split('\n').forEach(line => {
        const p = line.split(',').map(s => s.trim());
        if (p.length < 7) return;
        weapons.push([p[0], p[1], parseFloat(p[2]) || 1, parseFloat(p[3]) || 0,
          parseFloat(p[4]) || 0.7, parseFloat(p[5]) || 1, parseFloat(p[6]) || 10,
          parseFloat(p[7]) || 0, parseFloat(p[8]) || 0, parseFloat(p[9]) || 0, p[10] || '']);
      });
    }

    U(id, name,
      document.getElementById('cuNat').value,
      document.getElementById('cuCat').value,
      document.getElementById('cuEch').value,
      parseInt(document.getElementById('cuMen').value) || 4,
      document.getElementById('cuMob').value,
      parseInt(document.getElementById('cuMp').value) || 3,
      [parseInt(document.getElementById('cuAF').value) || 0,
       parseInt(document.getElementById('cuAS').value) || 0,
       parseInt(document.getElementById('cuAT').value) || 0],
      weapons,
      [parseInt(document.getElementById('cuSV').value) || 4,
       parseInt(document.getElementById('cuST').value) || 3,
       parseInt(document.getElementById('cuSR').value) || 0,
       parseInt(document.getElementById('cuSS').value) || 0],
      [parseInt(document.getElementById('cuEJ').value) || 0,
       parseInt(document.getElementById('cuEC').value) || 0,
       parseInt(document.getElementById('cuED').value) || 0],
      parseInt(document.getElementById('cuMor').value) || 6,
      parseInt(document.getElementById('cuTrn').value) || 6,
      parseInt(document.getElementById('cuStl').value) || 5,
      parseInt(document.getElementById('cuPts').value) || 10,
      '自定义棋子',
      {aps: parseInt(document.getElementById('cuAPS').value) || 0,
       era: parseInt(document.getElementById('cuERA').value) || 0,
       addArmor: parseInt(document.getElementById('cuAddArm').value) || 0,
       carry: parseInt(document.getElementById('cuCarry').value) || 0,
       cap: document.getElementById('cuCap').value.trim()}
    );
    DEF_BY_ID[id] = UNIT_DEFS[UNIT_DEFS.length - 1];
    log(`已创建棋子：${name}`, 'lg-ok');
    updateUI();
    alert('棋子已保存');
  };
  document.getElementById('cuTest').onclick = () => {
    const id = document.getElementById('cuId').value.trim();
    if (!DEF_BY_ID[id]) { alert('请先保存棋子'); return; }
    const c = Math.floor(G.map.cols / 2), r = Math.floor(G.map.rows / 2);
    spawn(DEF_BY_ID[id], G.side, c, r, G.side === 0 ? 0 : 3);
    log('测试放置', 'lg-ok');
    draw();
  };
}

/* ============================================================
 * 6. 武器库
 * ============================================================ */
function renderWpnLib(filter, search) {
  const box = document.getElementById('wpnList');
  if (!box) return;
  const items = WEAPON_LIB.filter(w => {
    if (filter !== 'ALL' && w[1] !== filter) return false;
    if (search && !w[0].toLowerCase().includes(search.toLowerCase()) && !w[1].toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  box.innerHTML = items.map(w => `
    <div class="wpnCell" style="cursor:pointer;padding:4px;border:1px solid #30363d;border-radius:3px;font-size:10px;background:#0d1117" data-w="${w.join(',')}">
      <b>${w[0]}</b> <span style="color:#6e7681">[${w[1]}]</span><br>
      R${w[2]} 穿${w[3]} 精${(w[4] * 100).toFixed(0)}% 弹${w[6]}${w[7] ? ' 制导' : ''}${w[10] ? ' ' + w[10] : ''}
    </div>
  `).join('');
  box.querySelectorAll('.wpnCell').forEach(el => {
    el.onclick = () => {
      navigator.clipboard.writeText(el.dataset.w).then(() => {
        el.style.background = '#1f6feb';
        setTimeout(() => el.style.background = '#0d1117', 300);
      });
    };
  });
}
function bindWpnModal() {
  document.getElementById('btnWpnLib').onclick = () => {
    const sel = document.getElementById('wpnFilter');
    if (sel.options.length <= 1) {
      const types = [...new Set(WEAPON_LIB.map(w => w[1]))];
      types.forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = t;
        sel.appendChild(o);
      });
    }
    renderWpnLib('ALL', '');
    document.getElementById('modalWpn').classList.add('on');
  };
  document.getElementById('wpnClose').onclick = () => document.getElementById('modalWpn').classList.remove('on');
  document.getElementById('wpnSearch').oninput = e => renderWpnLib(document.getElementById('wpnFilter').value, e.target.value);
  document.getElementById('wpnFilter').onchange = e => renderWpnLib(e.target.value, document.getElementById('wpnSearch').value);
}

/* ============================================================
 * 统一入口
 * ============================================================ */
function initAllModals() {
  initModals();
  bindNewGameModal();
  bindDatabaseModal();
  bindMapModal();
  bindUnitModal();
  bindWpnModal();
}