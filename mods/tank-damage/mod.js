MTW.defineMod({
  id: 'tank-damage',
  name: '坦克多部位伤害系统',
  version: '1.1.0',

  setup(api) {

    /* ============ 0) 修补 addWeapon bug ============ */
    function addW(name, type, r, pen, acc, rof, ammo, guid = 0, top = 0, sup = 0, band = '') {
      if (WPN_BY_NAME[name]) return WPN_BY_NAME[name];
      W(name, type, r, pen, acc, rof, ammo, guid, top, sup, band);
      const w = WEAPON_LIB[WEAPON_LIB.length - 1];
      WPN_BY_NAME[name] = w;
      return w;
    }

    /* ============ 1) 弹种武器 ============ */
    addW('120mm APFSDS', 'cannon', 9, 850, 0.82, 2, 22);
    addW('125mm APFSDS', 'cannon', 9, 900, 0.82, 2, 22);
    addW('105mm APFSDS', 'cannon', 8, 600, 0.82, 2, 20);

    addW('120mm HEAT', 'cannon', 9, 700, 0.85, 2, 16);
    addW('125mm HEAT', 'cannon', 9, 750, 0.85, 2, 16);

    addW('120mm HESH', 'cannon', 9, 500, 0.80, 2, 12, 0, 0, 1);
    addW('125mm HESH', 'cannon', 9, 520, 0.80, 2, 12, 0, 0, 1);

    addW('120mm HE', 'cannon', 9, 100, 0.88, 2, 24, 0, 0, 1);
    addW('125mm HE', 'cannon', 9, 120, 0.88, 2, 24, 0, 0, 1);

    /* ============ 2) 部位系统 ============ */
    const PART_DEFS = {
      hull:   { n: '车体',   ratio: 1.2 },
      turret: { n: '炮塔',   ratio: 0.9 },
      track:  { n: '履带',   ratio: 0.6 },
      engine: { n: '发动机', ratio: 0.4 },
      gun:    { n: '火炮',   ratio: 0.5 },
      ammo:   { n: '弹药架', ratio: 0.3 }
    };

    function initParts(u) {
      const base = 100 + Math.max(0, u.maxHp) * 5
                     + (u.def.armor.f + u.def.armor.s) * 0.1;
      const parts = {};
      for (const k in PART_DEFS) {
        const max = base * PART_DEFS[k].ratio;
        parts[k] = { hp: max, max: max, destroyed: false };
      }
      return parts;
    }

    function ensureParts(u) {
      if (!u.parts) u.parts = initParts(u);
    }

    function rollPart(hitFacing, isTop) {
      if (isTop) {
        const r = Math.random();
        if (r < 0.5) return 'turret';
        if (r < 0.8) return 'ammo';
        return 'hull';
      }
      if (hitFacing === 'front') {
        const r = Math.random();
        if (r < 0.6) return 'hull';
        if (r < 0.9) return 'turret';
        return 'track';
      }
      if (hitFacing === 'side') {
        const r = Math.random();
        if (r < 0.3) return 'hull';
        if (r < 0.7) return 'track';
        if (r < 0.9) return 'turret';
        return 'engine';
      }
      const r = Math.random();
      if (r < 0.2) return 'hull';
      if (r < 0.7) return 'engine';
      return 'turret';
    }

    function detectAmmoType(w) {
      if (w.n.includes('APFSDS')) return 'APFSDS';
      if (w.n.includes('HEAT'))   return 'HEAT';
      if (w.n.includes('HESH'))   return 'HESH';
      if (w.n.endsWith(' HE'))    return 'HE';
      return 'AP';
    }

    function slopeAngle(hitFacing) {
      if (hitFacing === 'front') return 30;
      if (hitFacing === 'side')  return 0;
      return 10;
    }

    /* ============ 3) 伤害覆盖：倾角 + 弹种 + 部位 ============ */
    api.override('computeDamage', (orig) => {
      return function (w, target, isSoft, hitFacing, isTop) {

        if (isSoft || !['ARM','IFV','APC','NAV','HELI'].includes(target.def.cat)) {
          return orig(w, target, isSoft, hitFacing, isTop);
        }

        ensureParts(target);
        const ammoType = detectAmmoType(w);

        if (ammoType === 'HE') {
          const armor = armorAt(target, hitFacing, isTop);
          if (w.pen < armor * 0.3) return rnd(0.2, 0.6);
          return rnd(0.8, 1.8);
        }

        const baseArmor  = armorAt(target, hitFacing, isTop);
        const angle      = slopeAngle(hitFacing);
        const slopeMult  = 1 / Math.cos(angle * Math.PI / 180);
        const effArmor   = baseArmor * slopeMult;

        let penEff = w.pen;
        if (ammoType === 'APFSDS') {
          penEff = w.pen * (1 + 0.4 * (slopeMult - 1));
        } else if (ammoType === 'HEAT') {
          penEff = w.pen / slopeMult;
          if (target.def.era > 0) penEff *= 0.4;
        } else if (ammoType === 'HESH') {
          penEff = w.pen;
        }

        let dmg;
        if      (penEff >= effArmor * 1.1) dmg = rnd(2.2, 4.2);
        else if (penEff >= effArmor * 0.6) dmg = rnd(0.6, 1.6);
        else                                dmg = rnd(0.05, 0.35);

        if (dmg > 0.5) {
          const partKey = rollPart(hitFacing, isTop);
          applyPartDamage(target, partKey, dmg, ammoType);
        }

        return dmg;
      };
    });

    /* ============ 4) 部位伤害与效果 ============ */
    function applyPartDamage(u, partKey, dmg, ammoType) {
      if (!u.parts || !u.parts[partKey]) return;
      const p = u.parts[partKey];
      if (p.destroyed) return;

      p.hp -= dmg * 10;
      if (p.hp <= 0) {
        p.hp = 0;
        p.destroyed = true;
        applyPartEffect(u, partKey);
      }
    }

    function applyPartEffect(u, partKey) {
      const c = u.c, r = u.r;
      switch (partKey) {
        case 'track':
          u.mp = Math.floor(u.mp / 2);
          addEffect('text', c, r, {dur:50, text:'履带断裂', color:'#d29922'});
          log(`💥 ${u.def.name} 履带断裂，机动减半`, 'lg-hit');
          break;

        case 'engine':
          u.mp = 0;
          addEffect('text', c, r, {dur:50, text:'发动机损毁', color:'#f85149'});
          log(`💥 ${u.def.name} 发动机损毁，无法移动`, 'lg-hit');
          break;

        case 'gun':
          u.fired = (u.fired || []).map(() => 1);
          addEffect('text', c, r, {dur:50, text:'火炮损毁', color:'#f85149'});
          log(`💥 ${u.def.name} 火炮损毁，无法开火`, 'lg-hit');
          break;

        case 'turret':
          u.turretDamaged = true;
          addEffect('text', c, r, {dur:50, text:'炮塔卡死', color:'#d29922'});
          log(`💥 ${u.def.name} 炮塔卡死，命中率下降`, 'lg-hit');
          break;

        case 'ammo':
          u.hp = 0;
          u.dead = true;
          addEffect('explosion', c, r, {dur:60, size:2.5, color:'#ff6020'});
          addEffect('text', c, r, {dur:60, text:'殉爆!', color:'#f85149'});
          log(`💥💥 ${u.def.name} 弹药架殉爆！`, 'lg-hit');
          if (typeof spawnWreck === 'function') spawnWreck(u);
          break;

        case 'hull':
          u.hp -= 2;
          if (u.hp <= 0) {
            u.dead = true;
            addEffect('explosion', c, r, {dur:50, size:2, color:'#ff6020'});
            if (typeof spawnWreck === 'function') spawnWreck(u);
          }
          break;
      }
    }

    /* ============ 5) 炮塔卡死 → 命中率惩罚 ============ */
    api.override('hitChance', (orig) => {
      return function (shooter, target, w, dist) {
        let p = orig(shooter, target, w, dist);
        if (shooter.turretDamaged) p *= 0.8;
        return p;
      };
    });

    /* ============ 6) 多血量 + 部位 + 多弹种改装 ============ */

    /** 把单个坦克单位改造成多弹种版（深拷贝 def，不影响同类） */
    function upgradeTankWeapons(unit) {
      const def = unit.def;
      if (!def || def.cat !== 'ARM') return false;
      if (def._multiAmmo) return false;   // 已改装过

      // 找主炮
      const mainIdx = def.weapons.findIndex(w => w.t === 'cannon');
      if (mainIdx < 0) return false;

      const mainW = def.weapons[mainIdx];

      // 按口径决定弹种组
      let ammoSet = null;
      if (mainW.n.includes('120mm')) {
        ammoSet = ['120mm APFSDS', '120mm HEAT', '120mm HE'];
      } else if (mainW.n.includes('125mm')) {
        ammoSet = ['125mm APFSDS', '125mm HEAT', '125mm HE'];
      } else if (mainW.n.includes('105mm')) {
        ammoSet = ['105mm APFSDS'];
      } else if (mainW.n.includes('100mm')) {
        ammoSet = ['100mm HE'];
      }
      if (!ammoSet) return false;   // 特殊口径（73mm 等）跳过

      // 构造新武器名数组：弹种组 + 保留其它武器（机枪/ATGM 等）
      const otherNames = def.weapons
        .filter((_, i) => i !== mainIdx)
        .map(w => w.n);
      const newNames = [...ammoSet, ...otherNames];

      // 深拷贝 def
      const newDef = {
        ...def,
        weapons: newNames.map(name => {
          const w = wpn(name);
          return {
            n: w[0], t: w[1], r: w[2], pen: w[3], acc: w[4],
            rof: w[5], ammo: w[6], guid: w[7] || 0,
            top: w[8] || 0, sup: w[9] || 0, band: w[10] || ''
          };
        }),
        name: def.name.includes('多弹种') ? def.name : def.name + ' (多弹种)',
        cap: (def.cap || '') + ',多弹种',
        _multiAmmo: true,
        _baseId: def.id
      };

      // 应用到本实例
      unit.def = newDef;
      unit.ammo  = newDef.weapons.map(w => w.ammo);
      unit.fired = newDef.weapons.map(() => 0);
      return true;
    }

    /* ============ 7) 单位生成钩子 ============ */
    api.on('unitSpawn', ({ unit }) => {
      if (!unit) return;
      const cat = unit.def.cat;

      // ① 多血量
      let mult = 1;
      if      (cat === 'ARM')  mult = 6;
      else if (cat === 'IFV')  mult = 4;
      else if (cat === 'APC')  mult = 3;
      else if (cat === 'NAV')  mult = 4;
      else if (cat === 'HELI') mult = 4;

      if (mult > 1) {
        const base = Math.max(1, unit.def.men);
        unit.maxHp = base * mult;
        unit.hp    = unit.maxHp;
      }

      // ② 装甲类初始化部位
      if (['ARM','IFV','APC','NAV','HELI'].includes(cat)) {
        ensureParts(unit);
      }

      // ③ 现役坦克改多弹种
      if (cat === 'ARM') {
        upgradeTankWeapons(unit);
      }
    });

    /* ============ 8) 立即为场上已有单位补部位 + 改装 ============ */
    if (typeof G !== 'undefined' && G.units) {
      G.units.forEach(u => {
        if (!u || u.dead) return;
        if (['ARM','IFV','APC','NAV','HELI'].includes(u.def.cat)) {
          ensureParts(u);
          // 若该单位未被初始部署的 spawn 钩子覆盖（保险起见），这里再试一次
          if (u.def.cat === 'ARM') upgradeTankWeapons(u);
        }
      });
    }

    /* ============ 9) 可选：3 辆"原生多弹种"坦克（保留作为对比） ============ */
    api.addUnit({
      id: 'us_m1a2sep3_v2', name: 'M1A2 SEPv3 (高级多弹种)',
      nation: 'US', cat: 'ARM', echelon: 'TM',
      men: 4, mob: 'track', mp: 4,
      armor: { f: 850, s: 400, t: 150 },
      weapons: ['120mm APFSDS','120mm HEAT','120mm HESH','120mm HE','M2A1重机枪'],
      sens: { v: 6, t: 6, radar: 0, sig: 0 },
      ew:   { jam: 0, eccm: 0, decoy: 0 },
      morale: 8, training: 9, stealth: 3, pts: 130,
      desc: '高级多弹种主战坦克（4 弹种）',
      cap: '主动拦截,反应装甲,多弹种',
      aps: 2, era: 2, addArmor: 150
    });

    api.addUnit({
      id: 'cn_99a_v2', name: 'ZTZ-99A (高级多弹种)',
      nation: 'CN', cat: 'ARM', echelon: 'TM',
      men: 3, mob: 'track', mp: 4,
      armor: { f: 1100, s: 500, t: 150 },
      weapons: ['125mm APFSDS','125mm HEAT','125mm HESH','125mm HE','QJG-02 14.5mm'],
      sens: { v: 6, t: 6, radar: 0, sig: 0 },
      ew:   { jam: 0, eccm: 0, decoy: 0 },
      morale: 8, training: 8, stealth: 3, pts: 130,
      desc: '高级多弹种主战坦克',
      cap: '主动拦截,反应装甲,多弹种',
      aps: 2, era: 2, addArmor: 150
    });

    api.addUnit({
      id: 'ru_t90m_v2', name: 'T-90M (高级多弹种)',
      nation: 'RU', cat: 'ARM', echelon: 'TM',
      men: 3, mob: 'track', mp: 4,
      armor: { f: 900, s: 450, t: 130 },
      weapons: ['125mm APFSDS','125mm HEAT','125mm HESH','125mm HE','Kord 12.7mm机枪'],
      sens: { v: 6, t: 6, radar: 1, sig: 1 },
      ew:   { jam: 0, eccm: 0, decoy: 0 },
      morale: 8, training: 8, stealth: 3, pts: 125,
      desc: '高级多弹种主战坦克',
      cap: '主动拦截,反应装甲,多弹种',
      aps: 2, era: 2, addArmor: 150
    });

    console.log('[tank-damage] v1.1 多部位 + 多血量 + 现役坦克多弹种改装 已加载');
  }
});