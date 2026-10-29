(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'hide-radar-visual',
    name: '雷达圈显示开关',
    version: '1.0.0',
    setup(api) {
      window._showRadarCircles = true;

      // 快捷键：Ctrl + R 切换显示
      window.addEventListener('keydown', e => {
        if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
          e.preventDefault(); // 阻止浏览器默认刷新
          window._showRadarCircles = !window._showRadarCircles;
          api.log(`📡 雷达圈视觉 ${window._showRadarCircles ? '开启' : '关闭'}`, 'lg-ok');
          if (typeof draw === 'function') draw();
        }
      });

      // 拦截雷达渲染函数
      api.override('renderRadarOverlays', orig => function() {
        // 如果被关闭了，直接不画雷达圈
        if (!window._showRadarCircles) return;
        orig();
      });

      console.log('[hide-radar-visual] 雷达圈视觉开关已加载 (按 Ctrl + R 切换)');
    }
  });
})();