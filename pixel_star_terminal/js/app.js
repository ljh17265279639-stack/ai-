/* ============================================================
   PIXEL STAR OS · 主程序 v1.2
   视图：今日舰桥(HUD) / 巡航日历(只读) / 目标星图 / 数据中心 / 档案仓库
   ============================================================ */
Store.load();
const $  = function(s){ return document.querySelector(s); };
const $$ = function(s){ return document.querySelectorAll(s); };

/* ---------- OS 启动序列（含进度条） ---------- */
(function boot(){
  const el = $('#boot'), txt = $('#bootText'), bar = $('#bootBar');
  if(!el) return;
  const msgs = [
    'PIXEL STAR OS v2.1',
    'CHECKING MEMORY ........ OK',
    'LOADING HELM CONSOLE ... OK',
    'SYNCING STAR MAP ....... OK',
    'MOUNTING DATACORE ...... OK',
    'CALIBRATING SENSORS .... OK',
    'ALL SYSTEMS NOMINAL'
  ];
  let i = 0;
  txt.textContent = msgs[0];
  bar.style.width = Math.round(1 / msgs.length * 100) + '%';
  const timer = setInterval(function(){
    i++;
    if(i < msgs.length){
      txt.textContent = msgs[i];
      bar.style.width = Math.round((i + 1) / msgs.length * 100) + '%';
    } else {
      clearInterval(timer);
      el.classList.add('gone');
      setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 600);
    }
  }, 90);
})();

/* ---------- OS 系统提示 toast ---------- */
let toastTimer = null;
function toast(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.add('hidden'); }, 2600);
}

/* 窗口标题栏按钮：关闭会"拒绝"——毕竟是操作系统 */
document.addEventListener('click', function(e){
  const btn = e.target.closest('.tb-btns i');
  if(!btn) return;
  const panel = btn.closest('.panel');
  SFX.uncheck();
  if(panel){
    panel.classList.remove('shake');
    void panel.offsetWidth;
    panel.classList.add('shake');
  }
  toast('ERROR // 系统窗口不可关闭 · ACCESS DENIED');
});

/* ---------- 底部任务栏：运行时间 + 内存读数 ---------- */
const bootAt = Date.now();
setInterval(function(){
  const up = $('#osUptime');
  if(!up) return;
  const s = Math.floor((Date.now() - bootAt) / 1000);
  const h = pad2(Math.floor(s / 3600)), m = pad2(Math.floor(s % 3600 / 60)), ss = pad2(s % 60);
  up.textContent = 'UPTIME ' + h + ':' + m + ':' + ss;
}, 1000);
setInterval(function(){
  const st = $('#osStat');
  if(!st) return;
  const mem = 38 + Math.floor(Math.random() * 15);
  st.textContent = 'MEM ' + mem + '% · STORE OK';
}, 4000);

/* ---------- 导航切换 ---------- */
$$('.nav-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    SFX.click();
    $$('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    $$('.view').forEach(function(v){ v.classList.remove('active'); });
    $('#view-' + btn.dataset.view).classList.add('active');
    if(btn.dataset.view === 'stats') renderStats();
    if(btn.dataset.view === 'calendar') renderCalendar();
  });
});

/* ---------- 顶栏 ---------- */
function renderHeader(){
  const now = new Date();
  $('#chipDate').textContent = now.getFullYear() + '年' + pad2(now.getMonth()+1) + '月' + pad2(now.getDate()) + '日';
  $('#todayDate').textContent = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
  const streak = computeStreak(Store.data.tasks);
  $('#chipStreak').textContent = streak;
  $('#statStreak').textContent = streak;
}

/* ---------- HUD 时钟 + 舰桥通讯轮换 ---------- */
function updateCommandClock(){
  const el = $('#hudTime');
  if(!el) return;
  const n = new Date();
  el.textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes()) + ':' + pad2(n.getSeconds());
  el.dateTime=n.toISOString();
  $('#chipDate').textContent=n.getFullYear()+'年'+pad2(n.getMonth()+1)+'月'+pad2(n.getDate())+'日';
  $('#todayDate').textContent=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][n.getDay()];
}
updateCommandClock();
setInterval(updateCommandClock,1000);

const BRIDGE_MSGS = [
  '// 今日任务已就绪，等待执行',
  '// 舰桥通讯：保持航线，准点打卡',
  '// 反应堆运转正常 · 全员状态良好',
  '// 新任务可直接输入添加，回车确认',
  '// 建议定期回看数据中心，校准航向',
  '// 背景系统：土星约 27° 轴倾角，与光环共用同一倾斜坐标组',
  '// 背景系统：土星表面与光环均使用本地真实天文纹理',
  '// 背景系统：纹理支持 Standard / 4K / 8K 自动降级',
  '// 背景系统：固定稀疏星点，不使用大面积星云贴图'
];
let msgIdx = 0;
setInterval(function(){
  const el = $('#bridgeMsg');
  if(!el) return;
  msgIdx = (msgIdx + 1) % BRIDGE_MSGS.length;
  el.textContent = BRIDGE_MSGS[msgIdx];
}, 6000);

/* ---------- 通用：分类下拉 ---------- */
function fillCats(sel){
  if(!sel) return;
  sel.innerHTML = Store.data.cats.map(function(c){
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');
}

/* ---------- 通用：任务行 HTML（ro = 只读） ---------- */
function taskHTML(t, overdue, idx, ro){
  if(ro){
    return '<li class="task ro' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
      (idx ? '<span class="t-idx">' + String(idx).padStart(3, '0') + '</span>' : '') +
      '<span class="chk"></span>' +
      '<span class="t-title">' + esc(t.title) + '</span>' +
      '<span class="t-cat">' + esc(t.cat) + '</span></li>';
  }
  return '<li class="task' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
    (idx ? '<span class="t-idx">' + String(idx).padStart(3, '0') + '</span>' : '') +
    '<span class="chk"></span>' +
    '<span class="t-title">' + esc(t.title) + '</span>' +
    '<span class="t-cat">' + esc(t.cat) + '</span>' +
    (overdue ? '<button class="t-move px-mini">移到今日</button>' : '') +
    '<button class="t-del" title="删除">✕</button></li>';
}

/* ============================================================
   今日舰桥（领航员操作面板）
   ============================================================ */
function renderToday(){
  const today = todayStr();
  const all = Store.data.tasks;
  const todayTasks = all.filter(function(t){ return t.date === today; })
    .sort(function(a,b){ return (a.done?1:0)-(b.done?1:0) || a.createdAt-b.createdAt; });
  const overdue = all.filter(function(t){ return !t.done && t.date < today; })
    .sort(function(a,b){ return a.date < b.date ? -1 : 1; });

  $('#todayList').innerHTML = todayTasks.map(function(t, i){ return taskHTML(t, false, i + 1); }).join('');
  $('#todayEmpty').style.display = todayTasks.length ? 'none' : 'block';
  $('#overdueWrap').classList.toggle('hidden', !overdue.length);
  $('#overdueList').innerHTML = overdue.map(function(t, i){ return taskHTML(t, true, i + 1); }).join('');

  const done = todayTasks.filter(function(t){ return t.done; }).length;
  $('#statDone').textContent = done;
  $('#statTotal').textContent = todayTasks.length;
  $('#statRate').textContent = todayTasks.length ? Math.round(done / todayTasks.length * 100) : 0;
  renderHeader();
}

function todayAllDone(){
  const list = Store.data.tasks.filter(function(x){ return x.date === todayStr(); });
  return list.length > 0 && list.every(function(x){ return x.done; });
}

function missionComplete(){
  SFX.allDone();
  const b = $('#banner');
  b.classList.remove('hidden');
  clearTimeout(b._t);
  b._t = setTimeout(function(){ b.classList.add('hidden'); }, 3200);
}

$('#todayList').addEventListener('click', function(e){
  const li = e.target.closest('.task');
  if(!li) return;
  const id = li.dataset.id;
  if(e.target.closest('.t-del')){ SFX.click(); Task.remove(id); renderToday(); return; }
  const t = Task.toggle(id);
  if(t && t.done) SFX.check(); else SFX.uncheck();
  renderToday();
  if(t && t.done){
    const again = $('#todayList .task[data-id="' + id + '"]');
    if(again) again.classList.add('just-done');
    if(todayAllDone()) missionComplete();
  }
});

$('#overdueList').addEventListener('click', function(e){
  const li = e.target.closest('.task');
  if(!li) return;
  const id = li.dataset.id;
  if(e.target.closest('.t-move')){ SFX.click(); Task.moveToday(id); renderToday(); return; }
  if(e.target.closest('.t-del')){ SFX.click(); Task.remove(id); renderToday(); return; }
  const t = Task.toggle(id);
  if(t && t.done) SFX.check(); else SFX.uncheck();
  renderToday();
});

function addTask(){
  if(Task.add($('#taskInput').value, todayStr(), $('#taskCat').value)){
    SFX.add();
    $('#taskInput').value = '';
    renderToday();
  }
}
$('#taskAdd').addEventListener('click', addTask);
$('#taskInput').addEventListener('keydown', function(e){ if(e.key === 'Enter') addTask(); });

/* ============================================================
   巡航日历（只读 · 仅供查看）
   ============================================================ */
let calCursor = new Date();
calCursor.setDate(1);
let calSelected = todayStr();

function renderCalendar(){
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  $('#calTitle').textContent = y + ' · ' + pad2(m + 1);

  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7;
  const gridStart = new Date(y, m, 1 - startDow);
  const today = todayStr();
  const MAX_CELL = 4;
  let html = '';

  for(let i = 0; i < 42; i++){
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const ds = dateStr(d);
    const dayTasks = Store.data.tasks.filter(function(t){ return t.date === ds; });
    const doneN = dayTasks.filter(function(t){ return t.done; }).length;
    const pendN = dayTasks.length - doneN;

    const cls = ['cal-cell'];
    if(d.getMonth() !== m) cls.push('dim');
    if(ds === today) cls.push('today');
    if(ds === calSelected) cls.push('sel');
    if(dayTasks.length && pendN === 0) cls.push('alldone');
    if(pendN > 0 && ds < today) cls.push('late');

    const cellList = dayTasks.slice(0, MAX_CELL).map(function(t){
      return '<li class="ct' + (t.done ? ' done' : '') + '" title="' + esc(t.title) + '">' + esc(t.title) + '</li>';
    }).join('');
    const more = dayTasks.length > MAX_CELL
      ? '<span class="cal-more">+' + (dayTasks.length - MAX_CELL) + '</span>' : '';

    html += '<div class="' + cls.join(' ') + '" data-date="' + ds + '">' +
      '<span class="cal-num">' + d.getDate() + '</span>' +
      (ds === today ? '<span class="cal-tag">TODAY</span>' : '') +
      (dayTasks.length ? '<ul class="cal-tasks">' + cellList + '</ul>' + more : '') +
      '</div>';
  }
  $('#calGrid').innerHTML = html;
  renderCalDetail();
}

function renderCalDetail(){
  const list = Store.data.tasks.filter(function(t){ return t.date === calSelected; })
    .sort(function(a,b){ return (a.done?1:0)-(b.done?1:0) || a.createdAt-b.createdAt; });
  const doneN = list.filter(function(t){ return t.done; }).length;
  $('#calDetailTitle').textContent = '▸ ' + calSelected;
  $('#calSub').textContent = '// 完成 ' + doneN + '/' + list.length + ' · 点击任务可勾选，下方可提前制定计划';
  $('#calTaskList').innerHTML = list.map(function(t, i){ return taskHTML(t, false, i + 1); }).join('');
  $('#calEmpty').style.display = list.length ? 'none' : 'block';
  fillCats($('#calAddCat'));
}

$('#calGrid').addEventListener('click', function(e){
  const cell = e.target.closest('.cal-cell');
  if(!cell) return;
  SFX.click();
  calSelected = cell.dataset.date;
  renderCalendar();
  openCalPanel(calSelected);
});

$('#calPrev').addEventListener('click', function(){
  SFX.click(); calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar();
});
$('#calNext').addEventListener('click', function(){
  SFX.click(); calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar();
});
$('#calToday').addEventListener('click', function(){
  SFX.click();
  calCursor = new Date(); calCursor.setDate(1);
  calSelected = todayStr();
  renderCalendar();
});

$('#calClose').addEventListener('click', function(){
  SFX.click();
  closeCalPanel();
});

$('#calTaskList').addEventListener('click', function(e){
  const li = e.target.closest('.task');
  if(!li) return;
  const id = li.dataset.id;
  if(e.target.closest('.t-del')){ SFX.click(); Task.remove(id); renderCalendar(); return; }
  const t = Task.toggle(id);
  if(t && t.done) SFX.check(); else SFX.uncheck();
  renderCalendar();
});

function calAdd(){
  if(Task.add($('#calAddInput').value, calSelected, $('#calAddCat').value)){
    SFX.add();
    $('#calAddInput').value = '';
    renderCalendar();
  }
}
const calAddBtn = $('#calAddBtn');
if(calAddBtn) calAddBtn.addEventListener('click', calAdd);
const calAddInput = $('#calAddInput');
if(calAddInput) calAddInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') calAdd(); });

/* ============================================================
   目标星图
   ============================================================ */
$('#goalNew').addEventListener('click', function(){
  SFX.click();
  $('#goalForm').classList.toggle('hidden');
  $('#goalTitle').focus();
});
$('#goalCancel').addEventListener('click', function(){
  SFX.click();
  $('#goalForm').classList.add('hidden');
});
$('#goalCreate').addEventListener('click', function(){
  if(Goal.add($('#goalTitle').value, $('#goalDesc').value)){
    SFX.add();
    $('#goalTitle').value = '';
    $('#goalDesc').value = '';
    $('#goalForm').classList.add('hidden');
    renderGoals();
  }
});
$('#goalTitle').addEventListener('keydown', function(e){
  if(e.key === 'Enter') $('#goalCreate').click();
});

function subBlockHTML(g){
  const subs = g.subs || [];
  const defs = subs.map(function(sub){
    const inst = Store.data.tasks.filter(function(t){ return t.subId === sub.id; });
    const doneN = inst.filter(function(t){ return t.done; }).length;
    const next = inst.filter(function(t){ return !t.done; })
      .sort(function(a,b){ return a.date < b.date ? -1 : 1; })[0];
    const freqTxt = { '1': '每天', '2': '每2天', '3': '每3天', '7': '每周' }[String(sub.interval)] || ('每' + sub.interval + '天');
    return '<div class="sub-item" data-sub="' + sub.id + '">' +
      '<span class="sub-ico">◆</span>' +
      '<span class="t-title">' + esc(sub.title) + '</span>' +
      '<span class="sub-meta">' + freqTxt + ' · ' + doneN + '/' + inst.length +
        (next ? ' · 下次 ' + next.date.slice(5).replace('-', '/') : ' · 已完结') + '</span>' +
      '<button class="t-del sub-del" title="删除整个系列">✕</button></div>';
  }).join('');

  return '<div class="sub-block">' +
    '<div class="sub-title2">▸ 细分任务 · 自动排期</div>' +
    defs +
    '<div class="sub-form">' +
      '<input class="px-input sub-input" placeholder="细分任务，如：背 50 个单词" maxlength="40">' +
      '<div class="sub-opts">' +
        '<select class="px-select sub-start"><option value="0">今天开始</option><option value="1" selected>明天开始</option></select>' +
        '<select class="px-select sub-freq"><option value="1">每天</option><option value="2">每2天</option><option value="3">每3天</option><option value="7">每周</option></select>' +
        '<span class="sub-times-wrap">× <input type="number" class="px-input sub-times" value="4" min="1" max="30"></span>' +
        '<button class="px-mini sub-add-btn">生成排期</button>' +
      '</div>' +
    '</div></div>';
}

function renderGoals(){
  const goals = Store.data.goals;
  $('#goalEmpty').style.display = goals.length ? 'none' : 'block';
  $('#goalList').innerHTML = goals.map(function(g){
    const total = g.milestones.length;
    const done = g.milestones.filter(function(m){ return m.done; }).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    return '<div class="goal-card" data-id="' + g.id + '">' +
      '<div class="gc-head">' +
        '<span class="gc-ico' + (pct === 100 && total ? ' lit' : '') + '">' + (pct === 100 && total ? '◉' : '○') + '</span>' +
        '<div class="gc-info"><h3>' + esc(g.title) + '</h3>' +
        (g.desc ? '<p class="gc-desc">' + esc(g.desc) + '</p>' : '') + '</div>' +
        '<span class="gc-pct">' + pct + '%</span>' +
        '<button class="t-del gc-del" title="删除目标">✕</button></div>' +
      '<div class="pbar"><i style="width:' + pct + '%"></i></div>' +
      '<ul class="ms-list">' + g.milestones.map(function(m){
        return '<li class="ms' + (m.done ? ' done' : '') + '" data-mid="' + m.id + '">' +
          '<span class="chk"></span><span class="t-title">' + esc(m.title) + '</span>' +
          '<button class="t-del ms-del" title="删除">✕</button></li>';
      }).join('') + '</ul>' +
      '<div class="gc-foot">' +
        '<input class="px-input ms-input" placeholder="添加阶段里程碑，回车确认" maxlength="40">' +
        '<div class="send-row"><input class="px-input send-input" placeholder="派发单次的任务到今日舰桥..." maxlength="60">' +
        '<button class="px-mini send-btn">派发</button></div>' +
      '</div>' +
      subBlockHTML(g) +
      '</div>';
  }).join('');
}

$('#goalList').addEventListener('click', function(e){
  const card = e.target.closest('.goal-card');
  if(!card) return;
  const gid = card.dataset.id;

  if(e.target.closest('.gc-del')){
    if(confirm('确定删除该目标？其里程碑和细分任务排期将一并移除。')){
      SFX.click(); Goal.remove(gid); renderGoals();
    }
    return;
  }
  if(e.target.closest('.sub-add-btn')){
    const input = card.querySelector('.sub-input');
    const startOffset = parseInt(card.querySelector('.sub-start').value, 10);
    const interval = parseInt(card.querySelector('.sub-freq').value, 10);
    const times = parseInt(card.querySelector('.sub-times').value, 10);
    if(Goal.addSub(gid, input.value, startOffset, interval, times)){
      SFX.add(); input.value = ''; renderGoals();
    }
    return;
  }
  const subDel = e.target.closest('.sub-del');
  if(subDel){
    if(confirm('删除该细分任务系列？已生成的任务将一并移除。')){
      SFX.click(); Goal.removeSub(gid, subDel.closest('.sub-item').dataset.sub); renderGoals();
    }
    return;
  }
  const ms = e.target.closest('.ms');
  if(ms){
    if(e.target.closest('.ms-del')){ SFX.click(); Goal.removeMilestone(gid, ms.dataset.mid); renderGoals(); return; }
    SFX.click(); Goal.toggleMilestone(gid, ms.dataset.mid); renderGoals();
    return;
  }
  if(e.target.closest('.send-btn')){
    const input = card.querySelector('.send-input');
    if(Task.add(input.value, todayStr(), '目标', gid)){
      SFX.add(); input.value = '';
    }
  }
});

$('#goalList').addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  const card = e.target.closest('.goal-card');
  if(!card) return;
  if(e.target.classList.contains('ms-input')){
    if(Goal.addMilestone(card.dataset.id, e.target.value)){
      SFX.add(); renderGoals();
    }
  } else if(e.target.classList.contains('send-input')){
    if(Task.add(e.target.value, todayStr(), '目标', card.dataset.id)){
      SFX.add(); e.target.value = '';
    }
  } else if(e.target.classList.contains('sub-input')){
    card.querySelector('.sub-add-btn').click();
  }
});

/* ============================================================
   数据中心
   ============================================================ */
const HEAT = ['#141a33', '#0e4b57', '#00b8cc', '#7be4e2'];
const DONUT_COLORS = ['#7be4e2', '#ffb692', '#39ff6a', '#ffd23e', '#9d6bff', '#ff5470'];

function doneTasks(){ return Store.data.tasks.filter(function(t){ return t.done && t.doneAt; }); }

function drawHeatmap(){
  const c = $('#heatmap');
  const ctx = c.getContext('2d');
  const cols = 20, rows = 7, cell = 13, gap = 3;
  c.width = cols * (cell + gap) + 2;
  c.height = rows * (cell + gap) + 2;

  const counts = {};
  doneTasks().forEach(function(t){
    const k = dateStr(new Date(t.doneAt));
    counts[k] = (counts[k] || 0) + 1;
  });

  const today = new Date();
  const dow = (today.getDay() + 6) % 7;
  const end = new Date(today);
  end.setDate(today.getDate() - dow + (cols - 1) * 7);
  const start = new Date(end);
  start.setDate(end.getDate() - (cols * 7 - 1));

  ctx.clearRect(0, 0, c.width, c.height);
  for(let col = 0; col < cols; col++){
    for(let row = 0; row < rows; row++){
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7 + row);
      if(d > today) continue;
      const n = counts[dateStr(d)] || 0;
      const level = n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3;
      ctx.fillStyle = HEAT[level];
      ctx.fillRect(col * (cell + gap), row * (cell + gap), cell, cell);
    }
  }
}

function drawBars(){
  const c = $('#barchart');
  const ctx = c.getContext('2d');
  const w = Math.max(320, c.parentElement.clientWidth - 36);
  c.width = w; c.height = 152;

  const counts = {};
  doneTasks().forEach(function(t){
    const k = dateStr(new Date(t.doneAt));
    counts[k] = (counts[k] || 0) + 1;
  });
  const days = [];
  for(let i = 29; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d);
  }
  let max = 1;
  days.forEach(function(d){ const n = counts[dateStr(d)] || 0; if(n > max) max = n; });

  ctx.clearRect(0, 0, c.width, c.height);
  const bw = Math.max(3, Math.floor((c.width - 16) / 30) - 3);

  ctx.fillStyle = '#a7bccd';
  ctx.fillRect(0, 122, c.width, 2);

  days.forEach(function(d, i){
    const n = counts[dateStr(d)] || 0;
    const h = Math.round(n / max * 100);
    const x = 6 + i * (bw + 3);
    ctx.fillStyle = (i === 29) ? '#ffb692' : '#7be4e2';
    for(let yy = 122 - h; yy < 122; yy += 4){
      ctx.fillRect(x, yy, bw, 3);
    }
    if(i % 5 === 0 || i === 29){
      ctx.fillStyle = '#a7bccd';
      ctx.font = '9px "Fusion Pixel", "Press Start 2P", monospace';
      ctx.fillText((d.getMonth()+1) + '/' + d.getDate(), x, 142);
    }
  });

  ctx.fillStyle = '#a7bccd';
  ctx.font = '9px "Fusion Pixel", "Press Start 2P", monospace';
  ctx.fillText('MAX ' + max, 2, 12);
}

function drawDonut(){
  const c = $('#donut');
  const ctx = c.getContext('2d');
  const cx = 85, cy = 85, r = 70, ir = 44;
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const agg = {};
  doneTasks().forEach(function(t){
    if(new Date(t.doneAt) >= since) agg[t.cat] = (agg[t.cat] || 0) + 1;
  });
  const entries = Object.keys(agg).map(function(k){ return [k, agg[k]]; }).sort(function(a,b){ return b[1]-a[1]; });
  const total = entries.reduce(function(s, e){ return s + e[1]; }, 0);

  ctx.clearRect(0, 0, 170, 170);
  if(!total){
    ctx.fillStyle = '#a7bccd';
    ctx.font = '10px "Fusion Pixel", "Press Start 2P", monospace';
    ctx.fillText('NO DATA', 42, 90);
    $('#donutLegend').innerHTML = '';
    return;
  }
  let a = -Math.PI / 2;
  entries.forEach(function(e, i){
    const a2 = a + (e[1] / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a, a2);
    ctx.arc(cx, cy, ir, a2, a, true);
    ctx.closePath();
    ctx.fillStyle = DONUT_COLORS[i % DONUT_COLORS.length];
    ctx.fill();
    a = a2;
  });
  ctx.fillStyle = '#c9d6ff';
  ctx.font = '15px "Fusion Pixel", "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 2);
  ctx.font = '8px "Fusion Pixel", "Press Start 2P", monospace';
  ctx.fillStyle = '#a7bccd';
  ctx.fillText('TASKS', cx, cy + 18);
  ctx.textAlign = 'left';

  $('#donutLegend').innerHTML = entries.map(function(e, i){
    return '<li><i style="background:' + DONUT_COLORS[i % DONUT_COLORS.length] + '"></i>' +
      esc(e[0]) + ' · ' + Math.round(e[1] / total * 100) + '%</li>';
  }).join('');
}

function renderLog(){
  const now = new Date();
  const prefix = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-';
  const monthTasks = Store.data.tasks.filter(function(t){
    return t.done && t.doneAt && dateStr(new Date(t.doneAt)).indexOf(prefix) === 0;
  });
  const box = $('#logText');
  if(!monthTasks.length){
    box.innerHTML = '// 本月还没有完成记录，去今日舰桥点亮第一格吧';
    return;
  }
  const total = monthTasks.length;
  const activeDays = {};
  monthTasks.forEach(function(t){ activeDays[dateStr(new Date(t.doneAt))] = true; });
  const byCat = {};
  monthTasks.forEach(function(t){ byCat[t.cat] = (byCat[t.cat] || 0) + 1; });
  const topCat = Object.keys(byCat).sort(function(a,b){ return byCat[b]-byCat[a]; })[0];
  const byGoal = {};
  monthTasks.forEach(function(t){
    if(!t.goalId) return;
    const g = Store.data.goals.find(function(x){ return x.id === t.goalId; });
    if(g) byGoal[g.title] = (byGoal[g.title] || 0) + 1;
  });
  const goalLine = Object.keys(byGoal).sort(function(a,b){ return byGoal[b]-byGoal[a]; })
    .slice(0, 2)
    .map(function(k){ return '「' + k + '」' + byGoal[k] + ' 项'; }).join('，');

  box.innerHTML =
    '<p>▸ 本月共完成 <b>' + total + '</b> 项任务，活跃 <b>' + Object.keys(activeDays).length + '</b> 天。</p>' +
    '<p>▸ 时间主要流向「<b>' + esc(topCat) + '</b>」类（占 ' + Math.round(byCat[topCat] / total * 100) + '%）。</p>' +
    (goalLine ? '<p>▸ 目标推进：' + goalLine + '。</p>' : '') +
    '<p>▸ 当前连续打卡 <b>' + computeStreak(Store.data.tasks) + '</b> 天，继续保持。</p>';
}

function renderStats(){
  drawHeatmap();
  drawBars();
  drawDonut();
  renderLog();
}

/* ============================================================
   档案仓库
   ============================================================ */
function renderSettings(){
  $('#soundChk').checked = !!Store.data.settings.sound;
  $('#soundToggle').classList.toggle('off', !Store.data.settings.sound);
}
$('#soundChk').addEventListener('change', function(e){
  Store.data.settings.sound = e.target.checked;
  Store.save();
  renderSettings();
});
$('#soundToggle').addEventListener('click', function(){
  Store.data.settings.sound = !Store.data.settings.sound;
  Store.save();
  SFX.click();
  renderSettings();
});
$('#exportBtn').addEventListener('click', function(){
  const blob = new Blob([JSON.stringify(Store.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pixelstar-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  SFX.add();
});
$('#importFile').addEventListener('change', function(e){
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = function(){
    try {
      Store.importData(JSON.parse(r.result));
      SFX.allDone();
      renderAll();
    } catch(err){
      alert('备份文件格式不正确，导入失败。');
    }
  };
  r.readAsText(f);
  e.target.value = '';
});
$('#resetBtn').addEventListener('click', function(){
  if(confirm('确定清空所有数据？此操作不可恢复！建议先导出备份。')){
    localStorage.removeItem(PS_KEY);
    location.reload();
  }
});

/* ---------- 汇总 ---------- */
function renderAll(){
  fillCats($('#taskCat'));
  renderToday();
  renderGoals();
  renderSettings();
  renderCalendar();
}

/* 小组件/其他标签页改了数据，实时同步 */
window.addEventListener('storage', function(e){
  if(e.key === PS_KEY){ Store.load(); renderAll(); }
});
window.addEventListener('focus', function(){
  Store.load(); renderAll();
});

/* ---------- 像素字体自检（canvas 量宽对比）+ 安装向导弹窗 ---------- */
async function checkPixelFont(){
  const el = $('#fontStatus');
  let ok = false;
  try {
    if(document.fonts && document.fonts.load){ await document.fonts.load('20px "Fusion Pixel"'); await document.fonts.ready; }
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const s = '像素测试ABC123';
    ctx.font = '20px "Microsoft YaHei", sans-serif';
    const w1 = ctx.measureText(s).width;
    ctx.font = '20px "Fusion Pixel", "Fusion Pixel 12px Proportional zh_hans", "Fusion Pixel 12px Mono latin", "Microsoft YaHei", sans-serif';
    const w2 = ctx.measureText(s).width;
    ok = Math.abs(w1 - w2) > 1;
  } catch(e){ ok = false; }
  if(el){
    if(ok){
      el.innerHTML = '▸ 字体状态：<b style="color:var(--green)">✓ 像素字体已生效</b> · 全部文字由像素点构成';
    } else {
      el.innerHTML = '▸ 字体状态：<b style="color:var(--red)">✗ 未生效</b> · 请按下方指引安装本地字体（约 1 分钟，永久离线可用）';
    }
  }
  const m = $('#fontModal');
  if(m){
    if(ok){
      m.classList.add('hidden');
    } else if(sessionStorage.getItem('fontModalHide') !== '1'){
      m.classList.remove('hidden');
    }
  }
}
if(document.fonts && document.fonts.ready){ document.fonts.ready.then(checkPixelFont); }
setTimeout(checkPixelFont, 4000);

const fontRecheck = $('#fontRecheck');
if(fontRecheck){
  fontRecheck.addEventListener('click', function(){
    sessionStorage.removeItem('fontModalHide');
    location.reload();
  });
}
const fontModalClose = $('#fontModalClose');
if(fontModalClose){
  fontModalClose.addEventListener('click', function(){
    sessionStorage.setItem('fontModalHide', '1');
    $('#fontModal').classList.add('hidden');
  });
}

renderAll();
