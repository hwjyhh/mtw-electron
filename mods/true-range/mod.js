(function () {
  if (!window.MTW) return;
  MTW.defineMod({
    id: 'true-range',
    name: '真实射程与传感器标定',
    version: '1.0',
    setup(api) {
      const G = api.game;
      const UNIT_DEFS = api.units;
      const WEAPON_LIB = api.weapons;

      // ========== 1. 真实射程表（米） ==========
      const TRUE_RANGE_M = {
        'M4A1卡宾枪':500,'M4A1 SOPMOD':550,'M16A4步枪':550,'M27 IAR':550,
        'M249 SAW':800,'M240B通用机枪':800,'M240L轻量化':800,'Mk46轻机枪':800,'Mk48机枪':900,
        'M2HB重机枪':1800,'M2A1重机枪':1800,'M3P机枪':1500,
        'Mk19榴弹发射器':1500,'M320榴弹发射器':400,'M203榴弹发射器':400,'Mk47自动榴弹':1500,
        'M107反器材狙击枪':1800,'M2010狙击枪':1200,'M110 SASS':800,'Mk13狙击枪':1000,
        'Mk153 SMAW':500,'M136 AT4':300,'M141 SMAW-D':500,
        '标枪导弹':2500,'陶式2B':3750,'陶式2A':3750,
        '地狱火AGM-114R':8000,'地狱火长弓':8000,'AGM-179 JAGM':8000,
        'M256 120mm滑膛炮':3000,'M256A1 120mm':3000,'M68A1 105mm线膛炮':2000,'M35 105mm线膛炮':2000,
        'M242 25mm链炮':2000,'M230 30mm链炮':1500,'GAU-8 30mm机炮':1200,'Mk44 30mm链炮':2000,
        'M777A2 155mm榴弹炮':24000,'M284 155mm榴弹炮':18000,'M119A3 105mm榴弹炮':14000,
        'M120 120mm迫击炮':7200,'M252 81mm迫击炮':5600,'M327 120mm迫击炮':7200,
        'M142 HIMARS火箭':80000,'M270 MLRS火箭':32000,'GMLRS制导火箭':70000,
        'PAC-3 MSE':35000,'THAAD拦截弹':200000,'爱国者GEM-T':160000,
        '毒刺导弹':4800,'毒刺RMP':4800,'AIM-120 AMRAAM':105000,'AIM-9X响尾蛇':35000,
        '弹簧刀300巡飞弹':10000,'弹簧刀600巡飞弹':40000,'凤凰幽灵巡飞弹':8000,
        'AGM-154 JSOW':130000,'GBU-12激光炸弹':14000,'GBU-31 JDAM':28000,'GBU-39 SDB':60000,
        'AGM-88 HARM':150000,'AGM-88G反辐射':150000,'AGM-65小牛':22000,'AGM-158 JASSM':370000,
        'Hydra 70火箭':8000,'APKWS制导火箭':5000,
        'M102 105mm炮':11000,'GAU-23 30mm':2000,
        '反无人机枪':2000,'HELIOS激光':8000,'DE M-SHORAD激光':5000,
        'AN/MLQ-44干扰机':5000,'AN/TLQ-17干扰机':8000,'AN/ALQ-227抗干扰':5000,
        'AN/ULQ-21干扰机':7000,'AN/TPQ-53反炮兵':60000,
        '92式手枪':50,'95式步枪':400,'95-1式步枪':500,'191式步枪':500,'03式步枪':400,
        '95式班用机枪':800,'95-1班用机枪':800,'88式通用机枪':1000,'QJY-88机枪':1000,'QJG-02 14.5mm':2000,
        'QLZ-04自动榴弹':1500,'QLG-10榴弹发射器':400,
        'PF-89火箭筒':300,'PF-98火箭筒':500,'98式120mm火箭':500,
        '红箭-8反坦克导弹':3000,'红箭-9反坦克导弹':5000,'红箭-10反坦克导弹':10000,'红箭-12反坦克导弹':4000,'红箭-73D':3000,
        '10式狙击枪':1500,'CS/LR4狙击枪':1200,'QBU-10狙击枪':1500,
        '125mm滑膛炮':3000,'105mm线膛炮':2500,'100mm低压炮':3000,
        '30mm机关炮':2000,'双35mm高炮':4000,
        '155mm榴弹炮':40000,'122mm榴弹炮':18000,
        '120mm迫击炮':7200,'100mm迫击炮':6000,'82mm迫击炮':4500,
        '300mm远程火箭':70000,'370mm火箭':220000,'750mm战术导弹':500000,
        'HQ-17防空导弹':15000,'HQ-16防空导弹':40000,'HQ-9B防空导弹':260000,'HQ-7防空导弹':15000,'HQ-10近防导弹':9000,
        '前卫-2便携防空':5000,'前卫-4便携防空':6000,
        '蓝箭-7空地导弹':7000,'蓝箭-21空地导弹':18000,'鹰击-83反舰':180000,
        '巡飞弹':10000,'FPV战斗部':10000,'精确制导炸弹':20000,'反辐射导弹':150000,
        '空地导弹':20000,'巡航导弹':1500000,
        'LW-30激光':5000,'通信干扰站':5000,'大功率干扰机':10000,'抗干扰通信车':5000,
        'CM-102反辐射':100000,'SLC-7反炮兵':50000,
        'PM手枪':50,'AK-12步枪':500,'AK-74M步枪':400,'AK-15步枪':500,
        'RPK-16机枪':800,'PKM通用机枪':1000,'PKP Pecheneg':1000,'Kord 12.7mm机枪':2000,'NSV 12.7mm重机':2000,
        'AGS-30自动榴弹':1700,'GP-25榴弹发射器':400,'GP-34榴弹发射器':400,
        'RPG-7火箭筒':500,'RPG-26火箭筒':250,'RPG-27火箭筒':200,'RPG-28火箭筒':300,'RPG-30火箭筒':300,
        '短号反坦克导弹':5500,'短号-M反坦克导弹':8000,'9M113竞赛':4000,'9M14婴儿':3000,'旋风反坦克导弹':10000,
        'T-5000狙击枪':1500,'SVDS狙击枪':800,'SVLK-14S狙击枪':2000,'VSS微声狙击':400,
        '2A46M-5 125mm':3000,'2A46M 125mm':2500,'2A82-1M 125mm':3500,'U-5TS 115mm':2000,'2A70 100mm炮':4000,'2A28 73mm炮':1300,
        '2A42 30mm机关炮':2000,'2A72 30mm机关炮':2000,'2A38 30mm双联':4000,'2A90 57mm高炮':6000,
        '2A64 152mm榴弹炮':24000,'2A88 152mm榴弹炮':30000,'2A33 152mm榴弹炮':18500,'2A18 122mm榴弹炮':15000,
        '122mm火箭':20000,'220mm火箭':35000,'300mm火箭':90000,'温压火箭':3500,
        '240mm迫击炮':9500,'203mm榴弹炮':37500,
        '9M338防空导弹':15000,'9M317M防空导弹':50000,'48N6E3防空导弹':250000,'9M82M防空导弹':200000,'9M96E2防空导弹':120000,'57E6弹炮导弹':20000,
        '针-S便携防空':5000,'柳叶刀-3巡飞弹':40000,'立方体巡飞弹':30000,
        'S-8火箭':4000,'R-37M远程弹':300000,'AZP-23 23mm':2500,'D-10T 100mm炮':2000,
        'GSh-30-2 30mm机炮':1500,'2A46M-1 125mm':2500,'2A46M-4 125mm':2800,
        '反潜鱼雷':1500,'克拉苏哈干扰机':10000,'莫斯科-1干扰机':8000,
        '抗干扰通信车':5000,'Kh-31P反辐射':110000,'1L219反炮兵':40000,'季夫诺莫里耶干扰':12000,
        '重机枪':1500,'机枪':800,'反坦克炮':2000,'100mm反坦克炮':2000,'双35高炮':4000,'警卫机枪':500
      };

      const TYPE_DEFAULT_M = {
        rifle:500, mg:800, sniper:1500, gl:500, rpg:400, atgm:3000,
        cannon:3000, autocannon:2000, howitzer:20000, mortar:6000, mlrs:40000,
        sam:30000, manpads:5000, aaa:4000, drone:10000, arm:50000,
        laser:5000, ew:5000, radar:30000
      };

      function trueRangeM(name, type, fallbackHex){
        return TRUE_RANGE_M[name] ?? TYPE_DEFAULT_M[type] ?? (fallbackHex*100);
      }

      // ========== 2. 应用数据修改 ==========
      function applyTrueRanges(){
        WEAPON_LIB.forEach(w => {
          const m = trueRangeM(w[0], w[1], w[2]);
          w[2] = Math.max(1, Math.round(m/100));
          w.r_real_m = m;
        });
        Object.values(api.WPN_BY_NAME).forEach(w => {
          const m = trueRangeM(w[0], w[1], w[2]);
          w[2] = Math.max(1, Math.round(m/100));
        });
        UNIT_DEFS.forEach(def => {
          def.weapons.forEach(w => {
            const m = trueRangeM(w.n, w.t, w.r);
            w.r = Math.max(1, Math.round(m/100));
            w.r_real_m = m;
          });
        });
        api.log(`[真实射程] 已重标定 ${UNIT_DEFS.length} 个单位武器射程`, 'lg-ok');
      }

            function applyTrueSensors(){
        UNIT_DEFS.forEach(def => {
          const cat = def.cat, cap = def.cap || '';
          if(['INF','SF'].includes(cat)){
            def.sens.v = Math.max(def.sens.v, 5); def.sens.t = Math.max(def.sens.t, 8);
          } else if(cat==='RECON'){
            def.sens.v = Math.max(def.sens.v, 30); def.sens.t = Math.max(def.sens.t, 50);
          } else if(['ARM','IFV','APC','NAV'].includes(cat)){
            def.sens.v = Math.max(def.sens.v, 30); def.sens.t = Math.max(def.sens.t, 40);
          } else if(['HELI','AIR'].includes(cat)){
            def.sens.v = Math.max(def.sens.v, 60); def.sens.t = Math.max(def.sens.t, 100);
          } else if(cat==='UAV'){
            def.sens.v = Math.max(def.sens.v, 100); def.sens.t = Math.max(def.sens.t, 150);
          }
          
          // ★ 修改这里：把 400/500 降低为 30~50，或者直接在下面限制 range ★
          if(cap.includes('反炮兵')) {
            def.sens.radar = Math.max(def.sens.radar, 50); // 原为 400
          } else if(cat==='AD' && def.sens.radar > 0){
            def.sens.radar = Math.max(def.sens.radar * 10, 80); // 原为 * 100 和 500
          } else if(def.sens.radar > 0){
            def.sens.radar = Math.max(def.sens.radar * 10, 30); // 原为 * 100 和 100
          }
        });
        api.log('[真实射程] 传感器已重标定', 'lg-ok');
      }

      // ========== 3. LOD 渲染优化 ==========
      api.override('draw', (orig) => function() {
        if(!G.map){ orig(); return; }
        const z = G.cam.z;
        const prevGrid = G.opt.grid;
        const prevRange = G.opt.range;
        const prevObs = G.opt.obs;
        if(z < 0.55){
          G.opt.grid = false;
          G.opt.obs = false;
        }
        if(z < 0.35){
          G.opt.range = false;
        }
        orig();
        G.opt.grid = prevGrid;
        G.opt.range = prevRange;
        G.opt.obs = prevObs;
      });


      // ========== 4. 摄像机缩放范围扩展 ==========
      const cvEl = document.getElementById('cv');
      if(cvEl && !cvEl._mtwTrueRangeWheel){
        cvEl._mtwTrueRangeWheel = true;
        cvEl.addEventListener('wheel', e => {
          e.preventDefault();
          const rect = cvEl.getBoundingClientRect();
          const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
          const VW = cvEl.clientWidth, VH = cvEl.clientHeight;

          // 自己计算世界坐标，不依赖全局函数
          const beforeX = (sx - VW / 2) / G.cam.z + G.cam.x;
          const beforeY = (sy - VH / 2) / G.cam.z + G.cam.y;
          
          G.cam.z = Math.max(0.15, Math.min(2.5, G.cam.z * (e.deltaY < 0 ? 1.18 : 1/1.18)));
          
          const afterX = (sx - VW / 2) / G.cam.z + G.cam.x;
          const afterY = (sy - VH / 2) / G.cam.z + G.cam.y;
          
          G.cam.x += beforeX - afterX;
          G.cam.y += beforeY - afterY;
          
          api.draw();
          if(typeof window.updateStatus === 'function') window.updateStatus();
          e.stopImmediatePropagation();
        }, {passive:false, capture:true});
      }


      // ========== 5. 武器面板显示真实射程 ==========
      function fmtRange(w){
        const m = w.r_real_m || (w.r * 100);
        if(m >= 1000) return (m/1000).toFixed(m>=10000?0:1) + 'km';
        return m + 'm';
      }
      
      api.override('updateUI', (orig) => function() {
        orig();
        const selInfo = document.getElementById('selInfo');
        if(!selInfo || !G.sel || G.sel.dead) return;
        const d = G.sel.def;
        const wsb = document.getElementById('wpnSelBox');
        if(!wsb) return;
        wsb.querySelectorAll('label.wpnSelRow').forEach((el, i) => {
          const w = d.weapons[i]; if(!w) return;
          const hint = el.querySelector('.hint');
          if(hint){
            hint.textContent = `${fmtRange(w)} ${G.sel.ammo[i]}发${G.sel.fired[i]>=1?' ✔':''}`;
          }
        });
      });


      // ========== 6. 小地图 ==========
      function buildMinimap(){
        const stage = document.getElementById('stage');
        if(!stage || document.getElementById('mtwMinimap')) return;
        const box = document.createElement('div');
        box.id = 'mtwMinimap';
        box.style.cssText = 'position:absolute;right:14px;bottom:14px;z-index:25;background:rgba(13,17,23,.85);border:1px solid #30363d;border-radius:6px;padding:4px;box-shadow:0 2px 12px #000a;pointer-events:auto';
        box.innerHTML = '<canvas id="mtwMinimapCv" style="display:block;cursor:pointer"></canvas>';
        stage.appendChild(box);
        const mmCv = document.getElementById('mtwMinimapCv');
        const mmCtx = mmCv.getContext('2d');

        function resizeMM(){
          if(!G.map) return;
          const maxW = 220, maxH = 160;
          const ar = G.map.cols / G.map.rows;
          let w = maxW, h = Math.round(maxW / ar);
          if(h > maxH){ h = maxH; w = Math.round(maxH * ar); }
          mmCv.width = w; mmCv.height = h;
          mmCv.style.width = w+'px'; mmCv.style.height = h+'px';
        }

        function drawMM(){
          if(!G.map) return;
          const w = mmCv.width, h = mmCv.height;
          if(w === 0 || h === 0) return;
          mmCtx.clearRect(0,0,w,h);
          const cw = w / G.map.cols, ch = h / G.map.rows;
          for(let r = 0; r < G.map.rows; r += 2){
            for(let c = 0; c < G.map.cols; c += 2){
              const t = api.TERRAIN[G.map.cells[r][c].t];
              mmCtx.fillStyle = t.col;
              mmCtx.fillRect(c*cw, r*ch, cw*2+0.5, ch*2+0.5);
            }
          }
          G.units.forEach(u => {
            if(u.dead || u.carriedBy) return;
            if(u.side !== G.side && !u.spotted[G.side]) return;
            mmCtx.fillStyle = u.side === 0 ? '#4a90d9' : '#d9534f';
            mmCtx.fillRect(u.c*cw - 1, u.r*ch - 1, 2.5, 2.5);
          });
          
          const VW = cvEl.clientWidth, VH = cvEl.clientHeight;
          const tlX = (-VW / 2) / G.cam.z + G.cam.x;
          const tlY = (-VH / 2) / G.cam.z + G.cam.y;
          const brX = ( VW / 2) / G.cam.z + G.cam.x;
          const brY = ( VH / 2) / G.cam.z + G.cam.y;

          const vx = Math.max(0, tlX / (window.HS*Math.sqrt(3))) * cw;
          const vy = Math.max(0, tlY / (window.HS*1.5)) * ch;
          const vw = Math.min(w, (brX - tlX) / (window.HS*Math.sqrt(3))) * cw;
          const vh = Math.min(h, (brY - tlY) / (window.HS*1.5)) * ch;
          
          mmCtx.strokeStyle = '#f0b72f';
          mmCtx.lineWidth = 1.5;
          mmCtx.strokeRect(vx, vy, vw, vh);
        }

        mmCv.addEventListener('click', e => {
          const r = mmCv.getBoundingClientRect();
          const cx = (e.clientX - r.left) / r.width;
          const cy = (e.clientY - r.top) / r.height;
          const targetX = cx * G.map.cols * window.HS * Math.sqrt(3);
          const targetY = cy * G.map.rows * window.HS * 1.5;
          G.cam.x = targetX; G.cam.y = targetY;
          api.draw();
        });

        setInterval(() => { resizeMM(); drawMM(); }, 300);
        setTimeout(() => { resizeMM(); drawMM(); }, 200);
      }


      // ========== 7. 启动：自动切换战略尺度 ==========
      setTimeout(() => {
        if(G.map && G.map.cols < 100 && !window._mtwTrueRangeResized){
          window._mtwTrueRangeResized = true;
          api.log('🗺 检测到小地图，自动重开为战略尺度（300×200 / 30km×20km）', 'lg-ok');
          if(typeof window.initGame === 'function') window.initGame('encounter', 'strategic');
        }
        buildMinimap();
      }, 800);

      console.log('[true-range] ✔ 真实射程与传感器标定加载完成');
    }
  });
})();