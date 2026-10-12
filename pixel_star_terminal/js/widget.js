/* ============================================================
   PIXEL STAR · 桌面小组件
   与主程序共用 localStorage，storage 事件实时同步
   ============================================================ */
Store.load();
const $ = function(s){ return document.querySelector(s); };

function render(){
  const now = new Date();
  $('#wDate').textContent = pad2(now.getMonth()+1) + '/' + pad2(now.getDate());

  const today = todayStr();
  const list = Store.data.tasks.filter(function(t){ return t.date === today; })
    .sort(function(a,b){ return (a.done?1:0)-(b.done?1:0) || a.createdAt-b.createdAt; });

  $('#wList').innerHTML = list.map(function(t){
    return '<li class="task w-task' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
      '<span class="chk"></span>' +
      '<span class="t-title">' + esc(t.title) + '</span>' +
      '<button class="t-del" title="删除">✕</button></li>';
  }).join('');

  $('#wEmpty').style.display = list.length ? 'none' : 'block';

  const done = list.filter(function(t){ return t.done; }).length;
  $('#wBar').style.width = list.length ? Math.round(done / list.length * 100) + '%' : '0%';
  $('#wPct').textContent = done + '/' + list.length;
}

$('#wList').addEventListener('click', function(e){
  const li = e.target.closest('.task');
  if(!li) return;
  const id = li.dataset.id;
  if(e.target.closest('.t-del')){ SFX.click(); Task.remove(id); render(); return; }
  const t = Task.toggle(id);
  if(t && t.done) SFX.check(); else SFX.uncheck();
  render();
  if(t && t.done){
    const again = $('#wList .task[data-id="' + id + '"]');
    if(again) again.classList.add('just-done');
  }
});

function wAdd(){
  if(Task.add($('#wInput').value, todayStr(), Store.data.cats[0] || '生活')){
    SFX.add();
    $('#wInput').value = '';
    render();
  }
}
$('#wAdd').addEventListener('click', wAdd);
$('#wInput').addEventListener('keydown', function(e){ if(e.key === 'Enter') wAdd(); });

window.addEventListener('storage', function(e){
  if(e.key === PS_KEY){ Store.load(); render(); }
});
window.addEventListener('focus', function(){
  Store.load(); render();
});

render();
