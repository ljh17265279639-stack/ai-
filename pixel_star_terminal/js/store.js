/* ============ PIXEL STAR · 数据核心 v1.1 ============
   新增：目标细分任务（subs）+ 自动排期
   ============================================================ */
const PS_KEY = 'pixelstar_v1';

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pad2(n){ return String(n).padStart(2, '0'); }
function dateStr(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayStr(){ return dateStr(new Date()); }
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

const Store = {
  data: null,
  load(){
    try { this.data = JSON.parse(localStorage.getItem(PS_KEY)); } catch(e){ this.data = null; }
    if(!this.data || !Array.isArray(this.data.tasks) || !Array.isArray(this.data.goals)){
      this.data = { tasks: [], goals: [], cats: ['工作','学习','生活','健康'], settings: { sound: true } };
    }
    if(!this.data.settings) this.data.settings = { sound: true };
    if(typeof this.data.settings.sound !== 'boolean') this.data.settings.sound = true;
    if(!Array.isArray(this.data.cats) || !this.data.cats.length) this.data.cats = ['工作','学习','生活','健康'];
    this.normalize();
  },
  normalize(){
    const seenSub = {};
    this.data.goals.forEach(function(g){
      if(!Array.isArray(g.milestones)) g.milestones = [];
      if(!Array.isArray(g.subs)) g.subs = [];
    });
  },
  save(){ localStorage.setItem(PS_KEY, JSON.stringify(this.data)); },
  importData(json){
    if(!json || !Array.isArray(json.tasks) || !Array.isArray(json.goals)) throw new Error('bad backup file');
    this.data = {
      tasks: json.tasks, goals: json.goals,
      cats: Array.isArray(json.cats) && json.cats.length ? json.cats : ['工作','学习','生活','健康'],
      settings: json.settings && typeof json.settings.sound === 'boolean' ? json.settings : { sound: true }
    };
    this.normalize();
    this.save();
  }
};

const Task = {
  add(title, date, cat, goalId, subId){
    const t = { id: uid(), title: String(title || '').trim(), date: date, cat: cat || '生活',
                goalId: goalId || null, subId: subId || null,
                done: false, doneAt: null, createdAt: Date.now() };
    if(!t.title) return null;
    Store.data.tasks.push(t); Store.save(); return t;
  },
  toggle(id){
    const t = Store.data.tasks.find(function(x){ return x.id === id; });
    if(!t) return null;
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    Store.save(); return t;
  },
  remove(id){
    Store.data.tasks = Store.data.tasks.filter(function(x){ return x.id !== id; });
    Store.save();
  },
  moveToday(id){
    const t = Store.data.tasks.find(function(x){ return x.id === id; });
    if(t){ t.date = todayStr(); Store.save(); }
  }
};

const Goal = {
  add(title, desc){
    if(!String(title || '').trim()) return null;
    const g = { id: uid(), title: String(title).trim(), desc: String(desc || '').trim(),
                milestones: [], subs: [], createdAt: Date.now() };
    Store.data.goals.push(g); Store.save(); return g;
  },
  remove(id){
    Store.data.goals = Store.data.goals.filter(function(g){ return g.id !== id; });
    Store.save();
  },
  addMilestone(gid, title){
    const g = Store.data.goals.find(function(x){ return x.id === gid; });
    if(!g || !String(title || '').trim()) return false;
    g.milestones.push({ id: uid(), title: String(title).trim(), done: false });
    Store.save(); return true;
  },
  toggleMilestone(gid, mid){
    const g = Store.data.goals.find(function(x){ return x.id === gid; });
    if(!g) return;
    const m = g.milestones.find(function(x){ return x.id === mid; });
    if(m){ m.done = !m.done; Store.save(); }
  },
  removeMilestone(gid, mid){
    const g = Store.data.goals.find(function(x){ return x.id === gid; });
    if(!g) return;
    g.milestones = g.milestones.filter(function(m){ return m.id !== mid; });
    Store.save();
  },
  /* 细分任务：生成一条排期定义，并立即生成 N 个实例任务到对应日期 */
  addSub(gid, title, startOffset, interval, times){
    const g = Store.data.goals.find(function(x){ return x.id === gid; });
    if(!g || !String(title || '').trim()) return null;
    times = Math.min(30, Math.max(1, parseInt(times, 10) || 1));
    interval = Math.max(1, parseInt(interval, 10) || 1);
    startOffset = Math.max(0, parseInt(startOffset, 10) || 0);
    const sub = { id: uid(), title: String(title).trim(), interval: interval, times: times, createdAt: Date.now() };
    g.subs = g.subs || [];
    g.subs.push(sub);
    const base = new Date();
    base.setDate(base.getDate() + startOffset);
    for(let i = 0; i < times; i++){
      const d = new Date(base);
      d.setDate(base.getDate() + i * interval);
      Store.data.tasks.push({ id: uid(), title: sub.title, date: dateStr(d), cat: '目标',
                              goalId: gid, subId: sub.id, done: false, doneAt: null, createdAt: Date.now() });
    }
    Store.save();
    return sub;
  },
  /* 删除整个细分系列：定义 + 已生成的实例一并移除 */
  removeSub(gid, subId){
    const g = Store.data.goals.find(function(x){ return x.id === gid; });
    if(!g) return;
    g.subs = (g.subs || []).filter(function(s){ return s.id !== subId; });
    Store.data.tasks = Store.data.tasks.filter(function(t){ return t.subId !== subId; });
    Store.save();
  }
};

/* 连续打卡：从今天（或昨天）往回数，有完成记录的日子连成一串 */
function computeStreak(tasks){
  const days = {};
  tasks.forEach(function(t){
    if(t.done && t.doneAt) days[dateStr(new Date(t.doneAt))] = true;
  });
  if(!Object.keys(days).length) return 0;
  let streak = 0;
  const d = new Date();
  if(!days[dateStr(d)]) d.setDate(d.getDate() - 1);
  while(days[dateStr(d)]){ streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
