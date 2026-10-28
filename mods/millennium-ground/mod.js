
(function () {
  if (!window.MTW) return;
  MTW.defineMod({
    id: 'millennium-ground', name: '千禧地面部队', version: '1.0',
    setup(api) {
      const nations = ['US','CN','RU','UK','FR','JP','DE','AU'];
      const cats = ['INF','ARM','IFV','APC','ARTY','AD','ENG','RECON'];
      let unitCount = 0;

      for (let n of nations) {
        cats.forEach(cat => {
          for(let v=1; v<=4; v++) {
            const mob = cat==='INF'?'leg':(v%2?'wheel':'track');
            // 从武器池里按规律挑一个武器
            const wType = cat==='INF'?'rifle':(cat==='ARM'?'cannon':(cat==='ARTY'?'howitzer':'autocannon'));
            const weapons = window.m2kWpnDB ? window.m2kWpnDB.filter(w=>w.includes(wType) && w.startsWith(n)).slice(0, v) : ['M4A1卡宾枪'];

            api.addUnit({
              id: `m2k_${n}_${cat}_${v}`,
              name: `${n} 千禧 ${cat} 0${v}型`,
              nation: n, cat: cat, echelon: 'TM', men: cat==='INF'?9:4, mob: mob, mp: 4+v%3,
              armor: {f: cat==='ARM'?500*v:100, s: 200, t: 50},
              weapons: weapons.length ? weapons : ['M4A1卡宾枪'],
              sens: {v:5, t:4, radar:cat==='AD'?4:0, sig:0}, 
              ew: {jam:0, eccm:0, decoy:0}, 
              morale: 7, training: 7+v, stealth: 5, pts: 20 + v*15,
              desc: `千禧年2000时代，${n}国标准${cat}装备`,
              cap: ''
            });
            unitCount++;
          }
        });
      }
      console.log(`[millennium-ground] 已加载 ${unitCount} 个地面单位`);
    }
  });
})();