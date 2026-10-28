/* ============================================================
 * MTW ui/taskforce-panel.js
 * 战斗群面板（编成 / 宏观指令 / AI 控制 / 解散）
 * 依赖：state / ai/battlegroups / macro-panel
 * ============================================================ */
'use strict';

function buildTaskForcePanel() {
  const aside = document.getElementById('right');
  if (!aside || document.getElementById('tfPanel')) return;
  const p = document.createElement('div');
  p.id = 'tfPanel';
  p.className = 'panel';
  p.innerHTML = `
    <h3>战斗群 <span id="tfCount" style="font-size:10px;color:#f0b72f">0</span></h3>
    <div id="tfList" style="max-height:200px;overflow-y:auto;margin-bottom:4px">
      <div class="hint">框选单位后点击下方按钮编成</div>
    </div>
    <div style="display:flex;gap:3px">
      <button id="tfFormBtn" class="sm" style="flex:1">📋 编成战斗群</button>
      <button id="tfAutoBtn" class="sm" style="flex:1;background:#2a1a3a">🤖 AI自动编成</button>
    </div>
    <div class="hint" style="margin-top:3px;font-size:9.5px">Shift+左键多选 · 拖拽框选 · Esc 取消</div>
  `;
  aside.insertBefore(p, aside.firstChild);

  document.getElementById('tfFormBtn').onclick = () => {
    const units = (G.selectedUnits || []).filter(u => u.side === G.side && !u.dead);
    if (units.length < 1) { log('请先框选己方单位', 'lg-sys'); return; }
    formPlayerTaskForce(units);
    renderTaskForcePanel();
  };

  document.getElementById('tfAutoBtn').onclick = () => {
    if (typeof formBattlegroups !== 'function') { log('AI编成未就绪', 'lg-sys'); return; }
    const groups = formBattlegroups(G.side, G.aiDifficulty[G.side] || 'medium');
    if (!groups.length) { log('无可编成单位', 'lg-sys'); return; }
    groups.forEach(g => {
      g.id = 'tf_' + G.side + '_auto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      g.name = 'AI群' + (G.taskForces.filter(t => t.side === G.side).length + 1);
      g.aiControlled = true;
      g.units.forEach(u => { u.taskForceId = g.id; u.aiControlled = true; });
      G.taskForces.push(g);
    });
    log(`🤖 AI 自动编成 ${groups.length} 个战斗群（含AI控制）`, 'lg-ew');
    renderTaskForcePanel();
  };

  renderTaskForcePanel();
}

function renderTaskForcePanel() {
  const box = document.getElementById('tfList');
  if (!box) return;
  const mine = (G.taskForces || []).filter(tf => tf.side === G.side);
  const cntEl = document.getElementById('tfCount');
  if (cntEl) cntEl.textContent = mine.length;

  if (!mine.length) {
    box.innerHTML = '<div class="hint">框选单位后点击下方按钮编成</div>';
    return;
  }

  box.innerHTML = mine.map(tf => {
    const alive = tf.units.filter(u => !u.dead).length;
    const total = tf.units.length;
    const aiTag = tf.aiControlled ? '🤖' : '👤';
    const mTag = tf.playerMacro ? `【${MACRO_COMMANDS[tf.playerMacro]?.n || tf.playerMacro}】` : '';
    const isActive = tf._lastAITurn === G.turn && tf.aiControlled;
    return `
      <div class="tf-item ${isActive ? 'active' : ''}">
        <div class="tf-head">
          <b class="tf-name">${tf.name}</b>
          <span class="tf-meta">${alive}/${total} ${aiTag} ${mTag}</span>
        </div>
        <div class="tf-actions">
          <button class="sm ${tf.playerMacro === 'attack' ? 'on' : ''}" data-tf="${tf.id}" data-macro="attack">⚔进攻</button>
          <button class="sm ${tf.playerMacro === 'defend' ? 'on' : ''}" data-tf="${tf.id}" data-macro="defend">🛡防守</button>
          <button class="sm ${tf.playerMacro === 'recon' ? 'on' : ''}" data-tf="${tf.id}" data-macro="recon">👁侦察</button>
          <button class="sm ${tf.playerMacro === 'ew' ? 'on' : ''}" data-tf="${tf.id}" data-macro="ew">📡电战</button>
          <button class="sm ${tf.playerMacro === 'fire' ? 'on' : ''}" data-tf="${tf.id}" data-macro="fire">🎯火力</button>
          <button class="sm ${tf.playerMacro === 'retreat' ? 'on' : ''}" data-tf="${tf.id}" data-macro="retreat">🚶撤退</button>
          <button class="sm ${tf.aiControlled ? 'ai-on' : ''}" data-tf="${tf.id}" data-ai="toggle">${tf.aiControlled ? '👤手控' : '🤖AI控'}</button>
          <button class="sm disband" data-tf="${tf.id}" data-disband="1">解散</button>
        </div>
      </div>`;
  }).join('');

  box.querySelectorAll('[data-tf]').forEach(btn => {
    btn.onclick = () => {
      const tfId = btn.dataset.tf;
      if (btn.dataset.macro) setTaskForceMacro(tfId, btn.dataset.macro);
      else if (btn.dataset.ai) {
        const tf = G.taskForces.find(t => t.id === tfId);
        setTaskForceAI(tfId, !(tf && tf.aiControlled));
      } else if (btn.dataset.disband) disbandTaskForce(tfId);
    };
  });
}

/* ---------- 战斗群 API ---------- */
function formPlayerTaskForce(units, name) {
  if (!units || !units.length) return null;
  const side = units[0].side;
  const cnt = (G.taskForces || []).filter(t => t.side === side && String(t.id).startsWith('tf_')).length;
  const tf = {
    id: 'tf_' + side + '_' + Date.now(),
    side,
    name: name || `玩家战斗群#${cnt + 1}`,
    units: units.slice(),
    mission: 'defend',
    aiControlled: false,
    playerMacro: null,
    formedAt: G.turn
  };
  G.taskForces.push(tf);
  units.forEach(u => { u.taskForceId = tf.id; u.aiControlled = false; });
  log(`📋 玩家编成【${tf.name}】${units.length} 单位`, 'lg-ok');
  return tf;
}

function setTaskForceAI(tfId, enabled) {
  const tf = G.taskForces.find(t => t.id === tfId);
  if (!tf) return;
  tf.aiControlled = !!enabled;
  tf.units.forEach(u => { u.aiControlled = !!enabled; });
  log(`🤖【${tf.name}】${enabled ? '交由AI控制' : '玩家手动'}`, 'lg-ew');
  renderTaskForcePanel();
}

function setTaskForceMacro(tfId, macro) {
  const tf = G.taskForces.find(t => t.id === tfId);
  if (!tf) return;
  tf.playerMacro = macro;
  log(`📋【${tf.name}】指令: ${MACRO_COMMANDS[macro]?.n || macro}`, 'lg-ok');
  renderTaskForcePanel();
}

function disbandTaskForce(tfId) {
  const tf = G.taskForces.find(t => t.id === tfId);
  if (!tf) return;
  tf.units.forEach(u => { u.taskForceId = null; u.aiControlled = false; });
  G.taskForces = G.taskForces.filter(t => t.id !== tfId);
  log(`📋 解散【${tf.name}】`, 'lg-sys');
  renderTaskForcePanel();
}