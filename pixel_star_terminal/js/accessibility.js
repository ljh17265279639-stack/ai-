(() => {
  const labels={taskInput:'新任务名称',taskCat:'任务分类',calAddInput:'所选日期的新任务',calAddCat:'计划分类',calAddBtn:'添加计划',goalTitle:'目标名称',goalDesc:'目标描述（可选）',wInput:'新任务名称',wAdd:'添加任务',soundToggle:'切换音效',importFile:'导入 JSON 备份'};
  Object.entries(labels).forEach(([id,label])=>document.getElementById(id)?.setAttribute('aria-label',label));
  document.querySelectorAll('.tb-btns').forEach(el=>el.setAttribute('aria-hidden','true'));
  let scheduled=false;
  function enhance(){scheduled=false;
    document.querySelectorAll('.task,.ms').forEach(row=>{const chk=row.querySelector('.chk');if(!chk)return;chk.setAttribute('role','checkbox');chk.setAttribute('tabindex','0');chk.setAttribute('aria-checked',String(row.classList.contains('done')));chk.setAttribute('aria-label',row.querySelector('.t-title')?.textContent||'完成任务');});
    document.querySelectorAll('.cal-cell').forEach(el=>{el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',el.dataset.date+'，'+(el.querySelectorAll('.ct').length?'有计划':'暂无计划'));el.setAttribute('aria-pressed',String(el.classList.contains('sel')));});
    document.querySelectorAll('input:not([aria-label]),select:not([aria-label])').forEach(el=>{if(el.type==='checkbox'||el.type==='file')return;el.setAttribute('aria-label',el.placeholder||el.title||(el.tagName==='SELECT'?'计划选项':'计划内容'));});
    document.querySelectorAll('.t-del').forEach(el=>el.setAttribute('aria-label','删除'+(el.closest('li')?.querySelector('.t-title')?.textContent||el.title||'项目')));
    const sound=document.getElementById('soundToggle');if(sound)sound.setAttribute('aria-pressed',String(!sound.classList.contains('off')));
  }
  enhance();new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(enhance);}}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.chk[role="checkbox"],.cal-cell')){e.preventDefault();const row=e.target.closest('[data-id]'),id=row?.dataset.id,date=e.target.dataset.date,root=e.target.closest('ul')?.id;e.target.click();requestAnimationFrame(()=>{const nodes=date?document.querySelectorAll('.cal-cell'):document.querySelectorAll((root?'#'+root+' ':'')+'[data-id]');const match=[...nodes].find(n=>date?n.dataset.date===date:n.dataset.id===id);(date?match:match?.querySelector('.chk'))?.focus();});}});
  const file=document.getElementById('importFile');if(file){file.hidden=false;file.classList.add('sr-only-file');}
})();
