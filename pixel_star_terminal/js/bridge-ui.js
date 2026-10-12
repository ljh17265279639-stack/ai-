/* BRIDGE UI · 深空通信面板微动效：引擎输出小幅波动 */
(function () {
  var el = document.getElementById('commEngine');
  if (!el) return;
  function flicker() {
    var v = 84 + Math.floor(Math.random() * 6); // 84% - 89%
    el.textContent = v;
    setTimeout(flicker, 1800 + Math.random() * 2200);
  }
  setTimeout(flicker, 1200);
})();
