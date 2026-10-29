(function () {
  if (!window.MTW) return;

  MTW.defineMod({
    id: 'no-electronic-warfare',
    name: '移除电子战系统',
    version: '1.0.0',
    setup(api) {

      // ================= 1. 彻底屏蔽底层电子战计算 =================
      // 拦截计算函数，强制清空干扰，通信永远满血
      api.override('computeEW', orig => function () {
        G.units.forEach(u => {
          u.jamming = 0;
          u.jammedBands = new Set();
          u.pulseStunned = 0;
          u.sensorDown = 0;
        });
        G.commLinks = [
          { strength: 100, sources: [] },
          { strength: 100, sources: [] }
        ];
        G.spectrumLoad = [0, 0];
        G.counterBattery = []; // 顺便清空反炮兵标记
      });

      // ================= 2. 拦截所有电子战动作 =================
      const disableAction = orig => function () {
        api.log('⚠ 本局已禁用电子战系统', 'lg-sys');
        return false;
      };
      
      api.override('executeJamming', disableAction);
      api.override('executeEWRecon', disableAction);
      api.override('executeDecoy', disableAction);
      api.override('executeShield', disableAction);
      api.override('executeARM', disableAction);
      api.override('executeCounterBattery', disableAction);
      api.override('executeHack', disableAction);
      api.override('triggerCounterBattery', orig => function(){}); // 静默禁用


      // ================= 3. 隐藏 UI 界面 =================
      function hideEWUI() {
        // 1. 隐藏电子战控制台
        const ewConsole = document.getElementById('ewConsole');
        if (ewConsole) ewConsole.style.display = 'none';

        // 2. 隐藏左侧栏的“电磁态势”和“密码破译”面板
        const ewPanel = document.getElementById('iEW0')?.closest('.panel');
        if (ewPanel) ewPanel.style.display = 'none';

        // 3. 隐藏右侧浮动工具栏里的 EW 按钮
        const ewBtns = ['ftJam', 'ftEWRecon', 'ftDecoy', 'ftShield', 'ftARM', 'ftCounter', 'ftHack'];
        ewBtns.forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.style.display = 'none';
        });
        
        // 4. 隐藏右侧操作模式里的 EW 相关按钮（如果有的话）
        const mEw = document.getElementById('mEW');
        if (mEw) mEw.style.display = 'none';
      }

      // 页面加载和每次新建游戏时执行隐藏
      setTimeout(hideEWUI, 1000);
      api.override('initGame', orig => function (a, b) {
        const res = orig(a, b);
        setTimeout(hideEWUI, 500);
        return res;
      });


      // ================= 4. 拦截键盘快捷键 =================
      // 在捕获阶段拦截，防止触发原版快捷键
      window.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        const keysToBlock = ['j', 'k', 'l', 'u', 'y', 'h', 'p'];
        if (keysToBlock.includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);

      console.log('[no-electronic-warfare] 电子战系统已禁用');
    }
  });
})();