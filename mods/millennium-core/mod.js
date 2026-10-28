(function () {
  if (!window.MTW) return;
  MTW.defineMod({
    id: 'millennium-core', name: '千禧核心与武器', version: '1.0',
    setup(api) {
      // 1. 注册 8 国
      const nations = {
        US: { n: '美国', col: '#4a90d9' }, CN: { n: '中国', col: '#d9534f' },
        RU: { n: '俄罗斯', col: '#7ac943' }, UK: { n: '英国', col: '#a0a0ff' },
        FR: { n: '法国', col: '#5fa0a0' }, JP: { n: '日本', col: '#ffb3b3' },
        DE: { n: '德国', col: '#a0a0a0' }, AU: { n: '澳大利亚', col: '#e0c080' }
      };
      for (let k in nations) api.addNation(k, nations[k]);

      // 2. 批量生成武器 (450+)
      const wBase = [
        ['rifle', 4, 0, .72, 3, 210], ['mg', 8, 0, .65, 3, 600], 
        ['gl', 5, 25, .55, 1, 30], ['sniper', 12, 0, .85, 1, 30],
        ['rpg', 4, 350, .65, 1, 2], ['atgm', 10, 700, .80, 1, 4, 1, 1],
        ['cannon', 8, 400, .75, 2, 40], ['autocannon', 6, 50, .70, 4, 500],
        ['howitzer', 20, 50, .60, 1, 40, 0, 1], ['mortar', 10, 20, .60, 2, 60, 0, 1],
        ['mlrs', 30, 80, .55, 2, 12, 0, 1], ['sam', 25, 0, .75, 2, 8, 1, 0],
        ['manpads', 7, 0, .70, 2, 8, 1, 0], ['drone', 15, 500, .80, 1, 4, 1, 0]
      ];
      const wSuffix = ['标准','改进','轻装','重装','车载','牵引','早期','末期','原型','量产','外贸'];
      let count = 0;
      window.m2kWpnDB = []; // 把生成的武器名存起来，方便后面的 mod 调用

      for (let n of Object.keys(nations)) {
        wBase.forEach(b => {
          wSuffix.forEach(s => {
            if(count >= 480) return; 
            const name = `${n}-${b[0]}-${s}`;
            try { 
              api.addWeapon(name, b[0], b[1]+Math.random()*2, b[2], b[3], b[4], b[5], b[6]||0, b[7]||0); 
              window.m2kWpnDB.push(name);
              count++; 
            } catch(e){}
          });
        });
      }
      
      // UI 注入
      setTimeout(() => {
        ['natSide0', 'natSide1', 'fltNat', 'cuNat', 'dbUnitNat'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            for (let k in nations) {
              if (!Array.from(el.options).some(o => o.value === k)) {
                const opt = document.createElement('option'); opt.value = k; opt.textContent = nations[k].n; el.appendChild(opt);
              }
            }
          }
        });
      }, 500);
      console.log(`[millennium-core] 已加载 ${count} 种千禧年武器`);
    }
  });
})();