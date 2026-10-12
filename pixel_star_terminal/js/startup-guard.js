(() => {
  if (location.protocol !== 'file:') return;

  const box = document.createElement('div');
  box.id = 'localEsmWarning';
  box.setAttribute('role', 'alert');
  box.innerHTML = `
    <strong>3D BACKGROUND NOT STARTED</strong>
    <span>原生 ESM 不能直接通过 file:// 双击运行。</span>
    <span>请关闭此页面，双击项目根目录的 <b>START_PIXEL_STAR.cmd</b>。</span>
  `;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(box), { once: true });
})();
