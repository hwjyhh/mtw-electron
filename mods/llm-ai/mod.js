/* ============================================================
 * mods/llm-ai/mod.js — 大模型指挥官
 * 依赖：MTW API、M4 runAI、M4 formBattlegroups
 * 特性：OpenAI 兼容 / 超时回退 / 战略→偏好映射 / 全局思考缓存
 * ============================================================ */
(function () {
  'use strict';
  if (!window.MTW) { console.warn('[llm-ai] MTW 未就绪'); return; }

  /* ---------------- 1. 配置 ---------------- */
  const CFG = {
    endpoint: localStorage.getItem('mtw_llm_endpoint')
      || 'https://api.openai.com/v1/chat/completions',
    apiKey:  localStorage.getItem('mtw_llm_key')  || '',
    model:   localStorage.getItem('mtw_llm_model')|| 'gpt-4o-mini',
    temp:    parseFloat(localStorage.getItem('mtw_llm_temp') || '0.25'),
    maxTok:  parseInt(localStorage.getItem('mtw_llm_max')  || '600'),
    enabled: localStorage.getItem('mtw_llm_enabled') === '1',
    thinking: false,
    lastPlan: null,
    history: [],
    timeoutMs: 25000
  };

  function saveCfg() {
    localStorage.setItem('mtw_llm_endpoint', CFG.endpoint);
    localStorage.setItem('mtw_llm_key',  CFG.apiKey);
    localStorage.setItem('mtw_llm_model', CFG.model);
    localStorage.setItem('mtw_llm_temp',  String(CFG.temp));
    localStorage.setItem('mtw_llm_max',   String(CFG.maxTok));
    localStorage.setItem('mtw_llm_enabled', CFG.enabled ? '1' : '0');
  }

  /* ---------------- 2. 战场序列化（紧凑版） ---------------- */
  function serializeBattlefield(side) {
    const me = G.units.filter(u => !u.dead && u.side === side && !u.carriedBy);
    const foes = G.units.filter(u => !u.dead && u.side !== side && u.spotted[side]);

    const brief = (list, mine) => list.slice(0, 28).map(u => {
      const o = {
        id: u.def.id,
        n: u.def.name,
        cat: u.def.cat,
        pos: [u.c, u.r],
        hp: +(u.hp / u.maxHp).toFixed(2)
      };
      if (mine) { o.mp = +u.mp.toFixed(1); o.sup = +u.sup.toFixed(1); }
      return o;
    });

    return {
      turn: G.turn,
      side_name: side === 0 ? '蓝方' : '红方',
      my_count: me.length,
      enemy_count: foes.length,
      my_units: brief(me, true),
      enemy_units: brief(foes, false),
      comm_link_pct: +G.commLinks[side].strength.toFixed(0),
      spectrum_load: +G.spectrumLoad[side].toFixed(0),
      objectives: (G.campaign && G.campaign.objectives) || null,
      campaign: G.campaign ? G.campaign.data.name : null,
      map_size: G.map ? [G.map.cols, G.map.rows] : null
    };
  }

  /* ---------------- 3. Prompt ---------------- */
  function buildPrompt(side, bf) {
    const sys = [
      '你是现代战术兵棋的' + (side === 0 ? '蓝方' : '红方') + '指挥官。',
      '根据战场态势，为本回合选择唯一战略。',
      '可选战略（只能选一个）：',
      '- attack   : 全面进攻（集中兵力突破）',
      '- defend   : 防守反击（固守要点）',
      '- recon    : 侦察优先（获取情报）',
      '- fire     : 火力优先（炮兵/远程打击）',
      '- ew       : 电子战优先（压制通信/雷达）',
      '- retreat  : 撤退保存实力',
      '- auto     : 交给下级自主决策',
      '',
      '必须返回严格 JSON（不要任何其它文字）：',
      '{"macro":"attack","reasoning":"<60字以内>","focus":{"c":10,"r":5}}',
      'focus 为可选重点目标格；无重点时 focus:null。'
    ].join('\n');

    const usr = '战场态势:\n' + JSON.stringify(bf, null, 1);
    return { sys, usr };
  }

  /* ---------------- 4. 查询 LLM ---------------- */
  async function queryLLM(side) {
    if (!CFG.apiKey) throw new Error('未配置 API Key');
    const bf = serializeBattlefield(side);
    const { sys, usr } = buildPrompt(side, bf);

    const body = {
      model: CFG.model,
      temperature: CFG.temp,
      max_tokens: CFG.maxTok,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user',   content: usr }
      ]
    };

    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), CFG.timeoutMs);

    const res = await fetch(CFG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CFG.apiKey
      },
      body: JSON.stringify(body),
      signal: ctl.signal
    }).finally(() => clearTimeout(to));

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content || '';
    return parseLLM(raw);
  }

  function parseLLM(raw) {
    if (!raw) throw new Error('空响应');
    let s = raw.trim();
    // 去除可能的 ```json 包裹
    const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) s = m[1].trim();
    // 尝试提取 {...}
    if (!s.startsWith('{')) {
      const i = s.indexOf('{'), j = s.lastIndexOf('}');
      if (i >= 0 && j > i) s = s.slice(i, j + 1);
    }
    const p = JSON.parse(s);
    const valid = ['attack','defend','recon','fire','ew','retreat','auto'];
    if (!valid.includes(p.macro)) throw new Error('非法 macro: ' + p.macro);
    return {
      macro: p.macro,
      reasoning: (p.reasoning || '').slice(0, 160),
      focus: (p.focus && typeof p.focus.c === 'number') ? p.focus : null
    };
  }

  /* ---------------- 5. 战略 → 偏好映射 ---------------- */
  const MACRO_TO_PREF = {
    attack: 'offensive',
    defend: 'defensive',
    recon:  'maneuver',
    fire:   'firepower',
    ew:     'signals',
    retreat:'defensive',
    auto:   null
  };

  function applyPlanToGame(side, plan) {
    const pref = MACRO_TO_PREF[plan.macro];
    if (pref) {
      G.aiPreference[side] = pref;
      log(`🧠 LLM 战略: ${plan.macro} → 偏好: ${pref}`, 'lg-ew');
    }
    if (plan.focus) {
      G._llmFocus = G._llmFocus || {};
      G._llmFocus[side] = plan.focus;
      log(`🧠 LLM 关注格: (${plan.focus.c},${plan.focus.r})`, 'lg-ew');
    }
    if (plan.reasoning) log(`🧠 理由: ${plan.reasoning}`, 'lg-ew');
  }

  /* ---------------- 6. 接管 runAI ---------------- */
  const _origRunAI = window.runAI;

  window.runAI = function (side) {
    if (!CFG.enabled || !CFG.apiKey || !G.ai[side]) {
      return _origRunAI(side);
    }
    runAILlm(side);
  };

  async function runAILlm(side) {
    if (G.gameOver) return;
    G.aiRunning = true;
    CFG.thinking = true;
    updateUI();

    let plan = null;
    try {
      log(`🧠 LLM 指挥官接管${side === 0 ? '蓝' : '红'}方…`, 'lg-ew');
      plan = await queryLLM(side);
      CFG.lastPlan = { side, plan, turn: G.turn };
      CFG.history.push({ turn: G.turn, side, ...plan });
      if (CFG.history.length > 30) CFG.history.shift();
      applyPlanToGame(side, plan);
    } catch (err) {
      log(`⚠ LLM 失败: ${err.message} → 回退规则 AI`, 'lg-sys');
    } finally {
      CFG.thinking = false;
      G.aiRunning = false;
      updateUI();
    }
    _origRunAI(side);
  }

  /* ---------------- 7. UI ---------------- */
  function buildPanel() {
    const aside = document.getElementById('right');
    if (!aside || document.getElementById('llmPanel')) return;
    const p = document.createElement('div');
    p.id = 'llmPanel';
    p.className = 'panel';
    p.innerHTML = `
      <h3>🧠 大模型指挥官 <span id="llmStatus" style="font-size:10px;color:#6e7681">未启用</span></h3>
      <div class="hint" style="margin-bottom:3px">OpenAI 兼容 API · 配置存本地</div>
      <div style="display:flex;gap:3px">
        <button id="llmCfgBtn" class="sm" style="flex:1">⚙ 配置</button>
        <button id="llmTogBtn" class="sm" style="flex:1">${CFG.enabled ? '禁用' : '启用'}</button>
        <button id="llmTestBtn" class="sm">测试</button>
      </div>
      <div id="llmLast" class="hint" style="margin-top:4px;font-size:9.5px;color:#8b949e">未运行</div>
    `;
    aside.insertBefore(p, aside.firstChild);

    document.getElementById('llmCfgBtn').onclick = openConfigModal;
    document.getElementById('llmTogBtn').onclick = () => {
      if (!CFG.apiKey) { log('请先配置 API Key', 'lg-sys'); openConfigModal(); return; }
      CFG.enabled = !CFG.enabled;
      saveCfg();
      refreshStatus();
      log(`LLM ${CFG.enabled ? '已启用' : '已禁用'}`, 'lg-ew');
    };
    document.getElementById('llmTestBtn').onclick = () => testLLM();

    refreshStatus();
    setInterval(refreshStatus, 800);
  }

  function refreshStatus() {
    const st = document.getElementById('llmStatus');
    if (!st) return;
    if (CFG.thinking) { st.textContent = '思考中…'; st.style.color = '#f0b72f'; }
    else if (CFG.enabled) { st.textContent = '已启用'; st.style.color = '#3fb950'; }
    else { st.textContent = '未启用'; st.style.color = '#6e7681'; }

    const last = document.getElementById('llmLast');
    if (last && CFG.lastPlan) {
      last.textContent = `T${CFG.lastPlan.turn} ${CFG.lastPlan.side === 0 ? '蓝' : '红'}: ${CFG.lastPlan.plan.macro}`;
    }
    const btn = document.getElementById('llmTogBtn');
    if (btn) btn.textContent = CFG.enabled ? '禁用' : '启用';
  }

  function openConfigModal() {
    let m = document.getElementById('llmCfgModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'llmCfgModal';
      m.className = 'modal';
      m.innerHTML = `
        <div class="modalBox" style="max-width:640px">
          <h2>🧠 大模型指挥官配置</h2>
          <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px">
            <label>API Endpoint</label>
            <input id="llm_ep" placeholder="https://api.openai.com/v1/chat/completions">
            <label>API Key</label>
            <input id="llm_key" type="password" placeholder="sk-...">
            <label>模型</label>
            <input id="llm_model" placeholder="gpt-4o-mini / qwen-plus / deepseek-chat">
            <label>温度</label>
            <input id="llm_temp" type="number" step="0.05" min="0" max="2" value="0.25">
            <label>最大 Token</label>
            <input id="llm_max" type="number" min="100" max="2000" value="600">
          </div>
          <div class="hint" style="margin-top:8px">
            支持任意 OpenAI Chat Completions 兼容端点：<br>
            · OpenAI  · DeepSeek  · 通义千问  · Moonshot  · 本地 Ollama/LM Studio
          </div>
          <div style="display:flex;gap:6px;margin-top:10px">
            <button id="llm_ok" class="active" style="flex:1">保存</button>
            <button id="llm_cancel" class="sm">取消</button>
          </div>
        </div>`;
      document.body.appendChild(m);
    }
    m.classList.add('on');
    document.getElementById('llm_ep').value    = CFG.endpoint;
    document.getElementById('llm_key').value   = CFG.apiKey;
    document.getElementById('llm_model').value = CFG.model;
    document.getElementById('llm_temp').value  = CFG.temp;
    document.getElementById('llm_max').value   = CFG.maxTok;

    document.getElementById('llm_ok').onclick = () => {
      CFG.endpoint = document.getElementById('llm_ep').value.trim();
      CFG.apiKey   = document.getElementById('llm_key').value.trim();
      CFG.model    = document.getElementById('llm_model').value.trim() || 'gpt-4o-mini';
      CFG.temp     = parseFloat(document.getElementById('llm_temp').value) || 0.25;
      CFG.maxTok   = parseInt(document.getElementById('llm_max').value)    || 600;
      saveCfg(); refreshStatus(); m.classList.remove('on');
      log('LLM 配置已保存', 'lg-ok');
    };
    document.getElementById('llm_cancel').onclick = () => m.classList.remove('on');
  }

  async function testLLM() {
    if (!CFG.apiKey) { log('请先配置 API Key', 'lg-sys'); openConfigModal(); return; }
    log('🧪 正在测试 LLM 连接…', 'lg-ew');
    try {
      const bf = serializeBattlefield(0);
      const { sys, usr } = buildPrompt(0, bf);
      const res = await fetch(CFG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CFG.apiKey },
        body: JSON.stringify({
          model: CFG.model, temperature: 0.1, max_tokens: 200,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const plan = parseLLM(j.choices[0].message.content);
      log(`✅ 测试成功: ${plan.macro} — ${plan.reasoning}`, 'lg-ok');
    } catch (e) {
      log(`❌ 测试失败: ${e.message}`, 'lg-hit');
    }
  }

  /* ---------------- 8. 注册 mod ---------------- */
  MTW.defineMod({
    id: 'llm-ai',
    name: '大模型指挥官',
    version: '1.0.0',
    setup(api) {
      // 每次初始化重设
      api.override('initGame', orig => function (a, b) {
        const r = orig(a, b);
        if (CFG.lastPlan) CFG.lastPlan = null;
        return r;
      });
    }
  });

  if (document.readyState !== 'loading') buildPanel();
  else window.addEventListener('DOMContentLoaded', buildPanel);

  console.log('[llm-ai] 就绪');
})();