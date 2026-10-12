/* Decorative instruments are simulations; mission readouts use real task data. */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches || localStorage.getItem('pixelStarMotion') === 'paused';
  const toggle = document.getElementById('motionToggle');
  const notifyMotion = () => window.dispatchEvent(new CustomEvent('pixelstar:motion', { detail: { paused } }));
  const syncMotion = () => {
    document.body.classList.toggle('motion-paused', paused);
    toggle.textContent = paused ? '▷ 开启动效' : 'Ⅱ 暂停动态';
    toggle.setAttribute('aria-pressed', String(paused));
    notifyMotion();
  };
  toggle.addEventListener('click', () => {
    paused = !paused;
    localStorage.setItem('pixelStarMotion', paused ? 'paused' : 'on');
    syncMotion();
  });
  motion.addEventListener('change', e => { paused = e.matches; syncMotion(); });
  syncMotion();

  const pages = {today:['01 / MISSION CONTROL','今日舰桥'],calendar:['02 / FLIGHT SCHEDULE','巡航日历'],goals:['03 / DESTINATION MAP','目标星图'],stats:['04 / FLIGHT ANALYTICS','数据中心'],settings:['05 / SYSTEM ARCHIVE','档案仓库']};
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    const [code,title] = pages[btn.dataset.view];
    document.getElementById('sectionCode').textContent = code;
    document.getElementById('sectionTitle').textContent = title;
    if(btn.dataset.view==='today'){renderToday();}
    if(btn.dataset.view==='stats'){
      const completed=Store.data.tasks.filter(t=>t.done);
      const counts={};
      completed.forEach(t=>{const date=dateStr(new Date(t.doneAt));counts[date]=(counts[date]||0)+1;});
      const table=document.getElementById('accessibleStats');
      table.innerHTML='<summary>查看完成记录（文字版）</summary><table><caption>按完成日期统计的任务数量</caption><thead><tr><th scope="col">日期</th><th scope="col">完成数</th></tr></thead><tbody>'+ (Object.entries(counts).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,count])=>'<tr><th scope="row">'+esc(date)+'</th><td>'+count+'</td></tr>').join('')||'<tr><td colspan="2">暂无已完成任务</td></tr>')+'</tbody></table>';
    }
    document.querySelectorAll('.nav-btn').forEach(b => b.setAttribute('aria-current',b===btn?'page':'false'));
  }));
  document.querySelector('.nav-btn.active').setAttribute('aria-current','page');
  document.querySelectorAll('[data-route]').forEach(b => b.addEventListener('click',()=>document.querySelector(`[data-view="${b.dataset.route}"]`).click()));

  function progress(){
    const done=Number(document.getElementById('statDone').textContent), total=Number(document.getElementById('statTotal').textContent), pct=total?Math.round(done/total*100):0;
    document.getElementById('orbitValue').innerHTML=pct+'<span>%</span>';
    document.getElementById('orbitMeter').style.setProperty('--progress',pct+'%');
    document.getElementById('railDone').textContent=String(done).padStart(2,'0');
    document.getElementById('railPending').textContent=String(total-done).padStart(2,'0');
    document.getElementById('orbitMessage').textContent=!total?'等待第一条任务指令':done===total?'今日航程完成，辛苦了！':'已抵达 '+done+' 个坐标，继续前进';
  }
  new MutationObserver(progress).observe(document.querySelector('.stat-row'),{childList:true,subtree:true,characterData:true});
  progress();
})();

/* Native top-layer dialog: it never takes space away from the calendar grid. */
let calendarCloseTimer = null;
let calendarReturnDate = null;
function openCalPanel(date){
  const panel=document.getElementById('calSide');
  clearTimeout(calendarCloseTimer);calendarReturnDate=date;
  panel.classList.remove('closing');
  if(!panel.open)panel.showModal();
  // Commit the collapsed frame before expanding the holographic surface.
  void panel.offsetWidth;
  requestAnimationFrame(()=>{if(panel.open&&!panel.classList.contains('closing'))panel.classList.add('open');});
  document.getElementById('calClose').focus({preventScroll:true});
}
function closeCalPanel(){
  const panel=document.getElementById('calSide');if(!panel.open)return;
  panel.classList.remove('open');panel.classList.add('closing');
  clearTimeout(calendarCloseTimer);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-paused');
  calendarCloseTimer=setTimeout(()=>{
    panel.close();panel.classList.remove('closing');
    const selected=[...document.querySelectorAll('.cal-cell')].find(c=>c.dataset.date===calendarReturnDate);
    selected?.focus({preventScroll:true});
  },reduced?0:300);
}
(() => {
  const panel=document.getElementById('calSide');
  panel.addEventListener('cancel',e=>{e.preventDefault();closeCalPanel();});
  panel.addEventListener('click',e=>{if(e.target!==panel)return;const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCalPanel();});
})();
