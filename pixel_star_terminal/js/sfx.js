/* ============ PIXEL STAR · 8-bit 音效（WebAudio 合成，无外部文件） ============ */
const SFX = {
  ctx: null,
  on: function(){ return Store.data && Store.data.settings && Store.data.settings.sound; },
  ensure: function(){
    if(!this.ctx){
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ this.ctx = null; }
    }
    if(this.ctx && this.ctx.state === 'suspended'){ this.ctx.resume(); }
  },
  beep: function(freq, dur, type, vol, when){
    if(!this.on()) return;
    this.ensure();
    if(!this.ctx) return;
    dur = dur || 0.08; type = type || 'square'; vol = vol || 0.12; when = when || 0;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.03);
  },
  click:   function(){ this.beep(1250, 0.035, 'square', 0.045); },
  add:     function(){ this.beep(880, 0.05, 'square', 0.09); this.beep(1320, 0.07, 'square', 0.09, 0.05); },
  check:   function(){ this.beep(660, 0.07, 'square', 0.11); this.beep(990, 0.1, 'square', 0.11, 0.07); },
  uncheck: function(){ this.beep(392, 0.07, 'square', 0.09); this.beep(294, 0.1, 'square', 0.08, 0.07); },
  allDone: function(){ [523, 659, 784, 1047, 1319].forEach(function(f, i){ SFX.beep(f, 0.1, 'square', 0.1, i * 0.085); }); }
};
