(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'db-advanced',
    name: '高级战术资料库与对比',
    version: '1.2.0',
    setup(api) {

      let compareList = [];

             // 辅助函数：基于字符串生成固定的 0~1 伪随机数（用于 RCS 微调）
function seededRandom(str, seed = 1) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // 简单的线性同余
    let x = Math.sin(hash * seed) * 10000;
    return x - Math.floor(x); 
}

// 辅助函数：带智能语义识别的 RCS 计算
function getRCS(def) {
    // 缓存机制：如果这个单位算过 RCS 了，直接返回，别浪费时间
    if (def._rcsCache !== undefined) return def._rcsCache;

    let overrideDict = typeof RCS_OVERRIDE !== 'undefined' ? RCS_OVERRIDE : null;
    let catDict = typeof RCS_BY_CAT !== 'undefined' ? RCS_BY_CAT : null;
    const name = def.name || '';
    const uid = def.id || name; // 用 id 或名字做种子
    let rcs = 5.0; // 默认兜底

    // 1. 优先读取原版
    if (overrideDict && overrideDict[uid]) {
        const ov = overrideDict[uid];
        rcs = (ov.front + ov.side + ov.rear) / 3;
    }
    // 2. 智能识别（使用 deterministic 伪随机）
    else if (name.includes('隐身') || name.includes('隐形') || name.includes('F-22')  || name.includes('六代') ||  name.includes('F-35') || name.includes('歼-20')|| name.includes('歼-35') ) {
        rcs = 0.1 + seededRandom(uid, 1) * 0.2; 
    }
    else if (name.includes('预警') || name.includes('运输') || name.includes('轰炸') || name.includes('加油')) {
        rcs = 50 + seededRandom(uid, 2) * 50;
    }
    else if (name.includes('无人机') || name.includes('巡飞弹') || name.includes('FPV') || def.cat === 'UAV') {
        rcs = 0.8 + seededRandom(uid, 3) * 0.5;
    }
    else if (def.cat === 'AIR' || name.includes('战机') || name.includes('直升机')) {
        rcs = 5 + seededRandom(uid, 4) * 5;
    }
    // 3. 按大类兜底
    else if (catDict && catDict[def.cat]) {
        const base = catDict[def.cat];
        if (def.cat === 'INF' || def.cat === 'SF') rcs = base.front + seededRandom(uid, 5) * 0.2;
        else rcs = (base.front + base.side + base.rear) / 3;
    }

    // 缓存结果并返回
    def._rcsCache = rcs;
    return rcs;
}

      // 辅助函数：动态计算当前视野（兼容真实视野 Mod 里的 sensorRange）
      function getSight(def) {
        if (typeof window.sensorRange === 'function') {
           const fakeUnit = { def, stance: 'defense', jamming: 0, sensorDown: 0, side: 0, moving: false };
           try { return window.sensorRange(fakeUnit); } catch(e) {}
        }
        return Math.max(def.sens.v, def.sens.t) || 10;
      }

      api.override('renderDbUnits', orig => function () {
        const container = document.getElementById('dbUnitTable');
        if (!container) return;

        // 强制容器允许横向滚动
        container.parentElement.style.overflowX = 'auto';

        const q = (document.getElementById('dbUnitSearch').value || '').toLowerCase();
        const nat = document.getElementById('dbUnitNat').value;

        const rows = UNIT_DEFS.filter(d => {
          if (q && !d.name.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false;
          if (nat !== 'ALL' && d.nation !== nat) return false;
          return true;
        });

        // 计算衍生数据
        const enrichedRows = rows.map(d => {
          const rcs = getRCS(d);
          const sight = getSight(d);
          // 仅提取攻击性武器的射程，排除雷达(radar)和干扰机(ew)
          const attackTypes = ['rifle','mg','sniper','gl','rpg','atgm','cannon','autocannon','aaa','howitzer','mortar','mlrs','sam','manpads','drone','laser'];
          const ranges = d.weapons
            .filter(w => attackTypes.includes(w.t))
            .map(w => parseFloat(w.r))
            .filter(v => !isNaN(v) && v > 0);

          const maxRange = ranges.length ? Math.max(...ranges) : 0;
          const minRange = ranges.length ? Math.min(...ranges) : 0;
          
          // 生成射程字符串（处理带小数的情况）
          let rangeStr = '0格';
          if (maxRange > 0) {
            const minS = minRange % 1 === 0 ? minRange : minRange.toFixed(1);
            const maxS = maxRange % 1 === 0 ? maxRange : maxRange.toFixed(1);
            rangeStr = (minRange === maxRange) ? `${maxS}格` : `${minS}~${maxS}格`;
          }

          const totalAmmo = d.weapons.reduce((sum, w) => sum + (w.ammo || 0), 0);
          return { ...d, rcs, sight, maxRange, minRange, rangeStr, totalAmmo };
        });

        let html = `<thead><tr>
          <th style="width:30px;text-align:center">对比</th>
          <th>名称</th>
          <th>分值</th>
          <th>兵员</th>
          <th>隐蔽</th>
          <th>RCS (㎡)</th>
          <th>视野</th>
          <th>最大射程</th>
          <th>总弹药</th>
          <th>机动 (MP)</th>
          <th>装甲 (前/侧/顶)</th>
          <th>主动防御</th>
          <th>电子战</th>
          <th>特性标签</th>
          <th>武器</th>
        </tr></thead><tbody>`;

        enrichedRows.forEach(d => {
          const isChecked = compareList.includes(d.id) ? 'checked' : '';
          
          const armorStr = `${d.armor.f}/${d.armor.s}/${d.armor.t}`;
          const apsStr = `APS:${d.aps || 0} / ERA:${d.era || 0}`;
          const ewStr = `扰${d.ew.jam || 0} 抗${d.ew.eccm || 0} 诱${d.ew.decoy || 0}`;
          const wpnStr = d.weapons.map(w => w.n).join('、') || '无';
          const capStr = d.cap || '-';

          // 颜色辅助
          const ewStyle = d.ew.jam > 0 ? 'color:#d0a0e0;font-weight:bold' : 'color:#6e7681';
          const apsStyle = d.aps > 0 ? 'color:#e08bff' : (d.era > 0 ? 'color:#d29922' : 'color:#6e7681');
          const rcsStyle = d.rcs > 10 ? 'color:#f85149' : (d.rcs < 2 ? 'color:#3fb950' : '');

          html += `<tr>
            <td style="text-align:center;background:#161b22">
              <input type="checkbox" class="cmp-chk" data-id="${d.id}" ${isChecked} style="width:auto;cursor:pointer;transform:scale(1.2)">
            </td>
            <td style="font-weight:600;color:${NAT_INFO[d.nation]?.col};white-space:nowrap;">${d.name}</td>
            <td style="color:#f0b72f;font-weight:bold">${d.pts}</td>
            <td>${d.men}</td>
            <td>${d.stealth}</td>
            <td style="font-family:monospace;${rcsStyle}">${d.rcs.toFixed(1)}</td>
            <td style="color:#58a6ff">${d.sight.toFixed(1)}</td>
            <td style="color:#d29922;white-space:nowrap;">${d.rangeStr}</td>
            <td>${d.totalAmmo}</td>
            <td>${d.mp}</td>
            <td style="font-family:monospace;white-space:nowrap;">${armorStr}</td>
            <td style="font-family:monospace;${apsStyle};white-space:nowrap;">${apsStr}</td>
            <td style="font-family:monospace;${ewStyle};white-space:nowrap;">${ewStr}</td>
            <td style="font-size:9.5px;color:#8b949e;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${capStr}">${capStr}</td>
            <td style="font-size:9.5px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${d.weapons.map(w => w.n + '(' + w.r + '格)').join('、')}">
              ${d.weapons.map(w => w.n + '(' + w.r + '格)').join('、') || '无'}
            </td>
          </tr>`;
        });

        container.innerHTML = html + '</tbody>';

        // 绑定勾选逻辑
        container.querySelectorAll('.cmp-chk').forEach(chk => {
          chk.onchange = (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
              if (compareList.length >= 2) {
                const removed = compareList.shift();
                const oldChk = container.querySelector(`.cmp-chk[data-id="${removed}"]`);
                if (oldChk) oldChk.checked = false;
              }
              compareList.push(id);
            } else {
              compareList = compareList.filter(x => x !== id);
            }
            updateComparePanel();
          };
        });

        compareList = compareList.filter(id => rows.find(r => r.id === id));
        updateComparePanel();
      });

      function ensureCompareUI() {
        if (document.getElementById('comparePanel')) return;
        const tableWrapper = document.getElementById('dbUnitTable').parentElement;
        const panel = document.createElement('div');
        panel.id = 'comparePanel';
        panel.style.cssText = 'display:none; margin-bottom:12px; background:#161b22; border:1px solid #d0a0e0; border-radius:6px; padding:10px;';
        tableWrapper.parentElement.insertBefore(panel, tableWrapper);
      }

      function updateComparePanel() {
        ensureCompareUI();
        const panel = document.getElementById('comparePanel');
        if (!panel) return;

        if (compareList.length !== 2) {
          panel.style.display = 'none';
          return;
        }

        const uA = UNIT_DEFS.find(d => d.id === compareList[0]);
        const uB = UNIT_DEFS.find(d => d.id === compareList[1]);
        if (!uA || !uB) return;

               const calc = (u) => {
          const rcs = getRCS(u);
          const sight = getSight(u);
          const attackTypes = ['rifle','mg','sniper','gl','rpg','atgm','cannon','autocannon','aaa','howitzer','mortar','mlrs','sam','manpads','drone','laser'];
          const ranges = u.weapons
            .filter(w => attackTypes.includes(w.t))
            .map(w => parseFloat(w.r))
            .filter(v => !isNaN(v) && v > 0);
            
          const maxRange = ranges.length ? Math.max(...ranges) : 0;
          const minRange = ranges.length ? Math.min(...ranges) : 0;
          const rangeStr = maxRange > 0 ? (minRange === maxRange ? `${maxRange}` : `${minRange}~${maxRange}`) : '0';
          
          const totalAmmo = u.weapons.reduce((sum, w) => sum + (w.ammo || 0), 0);
          return { rcs, sight, maxRange, rangeStr, totalAmmo };
        };
        const A = calc(uA);
        const B = calc(uB);

        // 越小越好（RCS、发现距离等）
        const cmpSmallerIsBetter = (a, b) => {
          if (a === b) return { a: '', b: '' };
          return a < b ? { a: 'color:#3fb950;font-weight:bold', b: 'color:#f85149' } : { a: 'color:#f85149', b: 'color:#3fb950;font-weight:bold' };
        };
        // 越大越好（装甲、视野等）
        const cmpBiggerIsBetter = (a, b) => {
          if (a === b) return { a: '', b: '' };
          return a > b ? { a: 'color:#3fb950;font-weight:bold', b: 'color:#f85149' } : { a: 'color:#f85149', b: 'color:#3fb950;font-weight:bold' };
        };

        const rcsCmp = cmpSmallerIsBetter(A.rcs, B.rcs);
        const sightCmp = cmpBiggerIsBetter(A.sight, B.sight);
        const rangeCmp = cmpBiggerIsBetter(A.maxRange, B.maxRange);
        const ammoCmp = cmpBiggerIsBetter(A.totalAmmo, B.totalAmmo);
        const ptsCmp = cmpBiggerIsBetter(uA.pts, uB.pts);
        const armCmp = cmpBiggerIsBetter(uA.armor.f + uA.addArmor, uB.armor.f + uB.addArmor);

        panel.style.display = 'block';
        panel.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #30363d; padding-bottom:6px; margin-bottom:6px;">
            <h3 style="color:#d0a0e0; margin:0; font-size:12px;">⚖️ 战术对比台</h3>
            <button id="closeCompare" style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:12px;">✕ 清空</button>
          </div>
          <table class="dbTable" style="width:100%; text-align:center;">
            <thead>
              <tr>
                <th style="width:25%; color:#8b949e; text-align:left">属性</th>
                <th style="width:37.5%; color:${NAT_INFO[uA.nation]?.col}; font-size:13px;">${uA.name}</th>
                <th style="width:37.5%; color:${NAT_INFO[uB.nation]?.col}; font-size:13px;">${uB.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="text-align:left;color:#8b949e">综合分值</td><td style="${ptsCmp.a}">${uA.pts}</td><td style="${ptsCmp.b}">${uB.pts}</td></tr>
              <tr><td style="text-align:left;color:#8b949e">雷达反射 (RCS)</td><td style="${rcsCmp.a}">${A.rcs.toFixed(1)} ㎡</td><td style="${rcsCmp.b}">${B.rcs.toFixed(1)} ㎡</td></tr>
              <tr><td style="text-align:left;color:#8b949e">基础视野</td><td style="${sightCmp.a}">${A.sight.toFixed(1)} 格</td><td style="${sightCmp.b}">${B.sight.toFixed(1)} 格</td></tr>
              <tr><td style="text-align:left;color:#8b949e">武器射程</td><td style="${rangeCmp.a}">${A.rangeStr} 格</td><td style="${rangeCmp.b}">${B.rangeStr} 格</td></tr>
              <tr><td style="text-align:left;color:#8b949e">总载弹量</td><td style="${ammoCmp.a}">${A.totalAmmo} 发</td><td style="${ammoCmp.b}">${B.totalAmmo} 发</td></tr>
              <tr><td style="text-align:left;color:#8b949e">正前装甲</td><td style="${armCmp.a}">${uA.armor.f + uA.addArmor}</td><td style="${armCmp.b}">${uB.armor.f + uB.addArmor}</td></tr>
              <tr><td style="text-align:left;color:#8b949e">机动性 (MP)</td><td>${uA.mp}</td><td>${uB.mp}</td></tr>
              <tr><td style="text-align:left;color:#8b949e">隐蔽度</td><td>${uA.stealth}</td><td>${uB.stealth}</td></tr>
              <tr><td style="text-align:left;color:#8b949e;vertical-align:top">主动防御</td><td style="font-size:10px">APS:${uA.aps||0} / ERA:${uA.era||0}</td><td style="font-size:10px">APS:${uB.aps||0} / ERA:${uB.era||0}</td></tr>
            </tbody>
          </table>
        `;

        document.getElementById('closeCompare').onclick = () => {
          compareList = [];
          const container = document.getElementById('dbUnitTable');
          container.querySelectorAll('.cmp-chk').forEach(c => c.checked = false);
          updateComparePanel();
        };
      }

      api.override('switchDbTab', orig => function(t) {
        orig(t);
        const panel = document.getElementById('comparePanel');
        if (panel) {
          panel.style.display = (t === 'units' && compareList.length === 2) ? 'block' : 'none';
        }
      });

      console.log('[db-advanced] 终极战术资料库加载完毕 (已接入 RCS/视野/弹量)');
    }
  });
})();