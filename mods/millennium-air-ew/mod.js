
(function () {

  if (!window.MTW) return;
  MTW.defineMod({
    id: 'millennium-air-ew', name: '千禧海空部队', version: '1.0',
    setup(api) {
      const nations = ['US','CN','RU','UK','FR','JP','DE','AU'];
      const cats = ['AIR','HELI','UAV','EW'];
      let unitCount = 0;

      for (let n of nations) {
        cats.forEach(cat => {
          for(let v=1; v<=4; v++) {
            const isUAV = cat==='UAV';
            const wType = cat==='EW'?'ew':(cat==='AIR'?'atgm':'rocket');
            
            api.addUnit({
              id: `m2k_${n}_${cat}_${v}`,
              name: `${n} 千禧 ${cat} 0${v}型`,
              nation: n, cat: cat, echelon: 'TM', men: isUAV?0:2, mob: 'air', mp: 18+v*2,
              armor: {f:0, s:0, t:0},
              weapons: window.m2kWpnDB ? window.m2kWpnDB.filter(w=>w.startsWith(n) && w.includes(wType)).slice(0,v) : [],
              sens: {v:8, t:7, radar:4, sig:2}, 
              ew: {jam:cat==='EW'?6:0, eccm:2, decoy:0}, 
              morale: 8, training: 8, stealth: isUAV?6:3, pts: 50 + v*30,
              desc: `千禧年2000时代，${n}国空中/电子战平台`,
              cap: cat==='EW'?'电子战':'空中打击'
            });
            unitCount++;
          }
        });
      }
      console.log(`[millennium-air-ew] 已加载 ${unitCount} 个空中/电战单位`);
    }
  });
})();
