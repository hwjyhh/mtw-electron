(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'no-radar',
    name: '关闭雷达与态势感知',
    version: '1.0.0',
    setup(api) {

      // 1. 彻底关闭雷达信噪比计算（让它永远探测不到东西）
      if (typeof radarSNR !== 'undefined') window.radarSNR = radarSNR;
      api.override('radarSNR', orig => function(radarUnit, targetUnit) {
        return 0; // 强制返回 0，雷达彻底瞎了
      });

      // 2. 关闭逐帧的雷达探测累积与锁定
      if (typeof radarDetectTick !== 'undefined') window.radarDetectTick = radarDetectTick;
      api.override('radarDetectTick', orig => function(dt) {
        // 直接为空，不执行任何锁定运算
      });

      // 3. 关闭雷达暴露度计算（不会被反辐射导弹锁定了）
      if (typeof radarExposureTick !== 'undefined') window.radarExposureTick = radarExposureTick;
      api.override('radarExposureTick', orig => function(dt) {
        // 直接为空
      });

      // 4. 关闭视觉上的雷达圈和扫描扇形
      if (typeof renderRadarOverlays !== 'undefined') window.renderRadarOverlays = renderRadarOverlays;
      api.override('renderRadarOverlays', orig => function() {
        // 不画任何雷达特效
      });

      // 5. 阉割视野加成（态势感知）
      // 如果单位带雷达，强制将其视野降级为普通光学视野（视/热）
      if (typeof sensorRange !== 'undefined') window.sensorRange = sensorRange;
      api.override('sensorRange', orig => function(u) {
        const baseRange = orig(u);
        // 如果这个单位有雷达参数，剥夺它的雷达距离加成
        if (typeof radarParams === 'function' && radarParams(u)) {
           return Math.max(u.def.sens.v, u.def.sens.t) || 5; 
        }
        return baseRange;
      });

      // 6. 拦截可见性判定，去掉“雷达能看穿隐身”的特判
      if (typeof canSee !== 'undefined') window.canSee = canSee;
      api.override('canSee', orig => function(observer, target) {
        // 对于空中目标，强制使用基础视野判定，不调用雷达方程
        if (target.def.mob === 'air') {
          if (observer.side === target.side) return true;
          const d = api.hexDist(observer, target);
          const sr = window.sensorRange(observer);
          return d <= sr && api.hasLOS(observer, target);
        }
        // 地面目标照常
        return orig(observer, target);
      });

      // 7. 隐藏右侧的“雷达/导弹”面板
      setInterval(() => {
        const radarPanel = document.getElementById('radarPanel');
        if (radarPanel) {
          radarPanel.style.display = 'none';
        }
      }, 1000);

      console.log('[no-radar] 雷达与态势感知机制已被彻底关闭');
    }
  });
})();