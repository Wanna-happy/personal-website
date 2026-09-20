/* Self-contained portfolio companion. No framework, network, or API required. */
(() => {
  const base = new URL('.', document.currentScript.src);
  const clamp = (n, min, max) => Math.min(Math.max(n, min), Math.max(min, max));
  class RuanMascot extends HTMLElement {
    connectedCallback() {
      if (this.ready) return;
      this.ready = true;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <link rel="stylesheet" href="${new URL('mascot.css', base)}">
        <div class="pet">
          <div class="bubble" role="status" aria-live="polite"></div>
          <button class="character" aria-label="阮涵的数字形象。点击打招呼，可以拖动，方向键移动。" aria-describedby="help">
            <canvas width="400" height="640" role="img" aria-label="阮涵的关节动画形象"></canvas>
          </button>
          <div class="shadow" aria-hidden="true"></div>
          <div class="tools" aria-label="人物控制">
            <button data-action="roam" title="开启或停止移动" aria-pressed="false">移动</button>
            <button data-action="hide" title="收起人物">收起</button>
          </div>
        </div>
        <button class="restore" hidden aria-label="显示数字形象">嗨，阮涵</button>
        <span id="help" class="sr-only">按方向键移动，按 Enter 或空格打招呼，按 Escape 停止自动移动。</span>`;
      this.pet = this.shadowRoot.querySelector('.pet');
      this.character = this.shadowRoot.querySelector('.character');
      this.animation = new window.RuanAvatarAnimation(this.character.querySelector('canvas'));
      this.bubble = this.shadowRoot.querySelector('.bubble');
      this.restore = this.shadowRoot.querySelector('.restore');
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.abort = new AbortController();
      const on = (el, type, fn, opts = {}) => el.addEventListener(type, fn, { ...opts, signal: this.abort.signal });
      on(this.shadowRoot.querySelector('link'), 'load', () => { this.placed = true; this.home(); });
      this.mode = 'idle'; this.x = 0; this.y = 0; this.sequence = 0;
      on(this.character, 'pointerdown', e => this.grab(e));
      on(this.character, 'pointermove', e => this.drag(e));
      on(this.character, 'pointerup', e => this.release(e));
      on(this.character, 'pointercancel', () => this.cancelDrag());
      on(this.character, 'lostpointercapture', () => this.cancelDrag());
      on(this.character, 'click', e => {
        if (this.suppressClick) { this.suppressClick = false; return; }
        this.greet();
      });
      on(this.character, 'keydown', e => {
        const delta = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key];
        if (delta) { e.preventDefault(); this.setMode('idle'); this.place(this.x + delta[0], this.y + delta[1]); this.animation.play('walk', 850); }
        if (e.key === 'Escape') { this.setMode('idle'); this.say('好，我就在这里。'); }
      });
      on(this.shadowRoot.querySelector('[data-action="roam"]'), 'click', () => this.setMode(this.mode === 'roam' ? 'idle' : 'roam'));
      on(this.shadowRoot.querySelector('[data-action="hide"]'), 'click', () => this.hide());
      on(this.restore, 'click', () => this.show());
      const controls = this.shadowRoot.querySelector('.tools');
      on(controls, 'pointerenter', () => { this.controlsHovered = true; this.stopFrame(); });
      on(controls, 'pointerleave', () => { this.controlsHovered = false; if (this.mode === 'roam') this.wake(); });
      on(window, 'pointermove', e => {
        if (this.mode !== 'follow' || this.dragging || e.pointerType === 'touch') return;
        const r = this.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
        this.target = this.limit(e.clientX - r.left + 28, e.clientY - r.top - this.pet.offsetHeight / 2);
        this.wake();
      }, { passive: true });
      on(document, 'visibilitychange', () => {
        if (document.hidden) this.stopFrame(); else if (this.mode === 'roam') this.wake();
      });
      on(this.motion, 'change', () => { if (this.motion.matches) this.setMode('idle'); });
      this.observer = new ResizeObserver(() => {
        if (this.pet.hidden || !this.clientWidth || !this.clientHeight) return;
        if (!this.placed) { this.home(); this.placed = true; }
        else if (!this.dragging && this.mode === 'idle') this.home();
        else this.place(this.x, this.y);
        this.target = null;
      });
      this.observer.observe(this);
      this.observer.observe(this.pet);
    }
    disconnectedCallback() {
      this.abort?.abort(); this.observer?.disconnect(); this.stopFrame();
      this.animation?.destroy();
      clearTimeout(this.bubbleTimer); clearTimeout(this.reactTimer);
      this.ready = false;
      this.placed = false;
      if (this.shadowRoot) this.shadowRoot.innerHTML = '';
    }
    limits() {
      return { maxX: this.clientWidth - this.pet.offsetWidth - 12, maxY: this.clientHeight - this.pet.offsetHeight - 12 };
    }
    limit(x, y) {
      const b = this.limits(); return { x: clamp(x, 12, b.maxX), y: clamp(y, this.hasAttribute('stage') ? 70 : 110, b.maxY) };
    }
    place(x, y) {
      const p = this.limit(x, y); this.x = p.x; this.y = p.y;
      this.pet.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      this.positionBubble();
    }
    positionBubble() {
      const half = this.bubble.offsetWidth / 2;
      const left = clamp(this.pet.offsetWidth / 2, half + 8 - this.x, this.clientWidth - this.x - half - 8);
      this.bubble.style.left = `${left}px`;
    }
    home() {
      this.setMode('idle'); this.show(false);
      const b = this.limits();
      this.place(this.hasAttribute('stage') ? b.maxX / 2 : b.maxX, b.maxY);
    }
    say(message) {
      clearTimeout(this.bubbleTimer); this.bubble.textContent = message;
      this.positionBubble();
      this.bubble.classList.add('visible');
      this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('visible'), 3000);
    }
    greet() {
      this.animation.play(['wave', 'present', 'nod'][this.sequence % 3]);
      const words = ['嗨，我是阮涵！', '今天也要保持好奇。', '起来活动一下吧！', '很高兴在这里遇见你。'];
      this.say(words[this.sequence++ % words.length]);
      clearTimeout(this.reactTimer);
      this.pet.classList.remove('hello');
      void this.pet.offsetWidth;
      this.pet.classList.add('hello');
      this.reactTimer = setTimeout(() => this.pet.classList.remove('hello'), 850);
    }
    grab(e) {
      if (e.button !== 0 || !e.isPrimary) return;
      this.setMode('idle'); this.suppressClick = false;
      this.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: this.x, startY: this.y, moved: false };
      this.character.setPointerCapture(e.pointerId);
      this.pet.classList.add('dragging');
    }
    drag(e) {
      const d = this.dragging; if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.hypot(dx, dy) > 5) d.moved = true;
      if (d.moved) this.place(d.startX + dx, d.startY + dy);
      if (d.moved && this.animation.pose !== 'walk') this.animation.play('walk', 1200);
    }
    release(e) {
      if (!this.dragging || this.dragging.id !== e.pointerId) return;
      this.suppressClick = this.dragging.moved;
      this.dragging = null; this.pet.classList.remove('dragging');
      if (this.character.hasPointerCapture(e.pointerId)) this.character.releasePointerCapture(e.pointerId);
    }
    cancelDrag() { this.dragging = null; this.pet.classList.remove('dragging'); }
    setMode(mode) {
      this.stopFrame(); this.mode = mode; this.target = null;
      this.pet.classList.remove('moving');
      this.shadowRoot.querySelector('[data-action="roam"]').setAttribute('aria-pressed', String(mode === 'roam'));
      this.dispatchEvent(new CustomEvent('modechange', { detail: { mode }, bubbles: true }));
      if (mode === 'roam') { this.say('出发，逛一逛！'); this.wake(); }
      if (mode === 'follow') this.say('移动鼠标，我来找你。');
    }
    stopFrame() { cancelAnimationFrame(this.frame); this.frame = 0; this.lastTime = 0; }
    wake() {
      if (!this.frame && !document.hidden && !this.pet.hidden) this.frame = requestAnimationFrame(t => this.tick(t));
    }
    tick(now) {
      this.frame = 0;
      if (this.mode === 'idle' || document.hidden || this.pet.hidden || this.dragging || this.controlsHovered) return;
      const dt = Math.min((now - (this.lastTime || now)) / 1000, .04); this.lastTime = now;
      if (!this.target && this.mode === 'roam') {
        const b = this.limits();
        this.target = this.limit(12 + Math.random() * Math.max(0, b.maxX - 12), b.maxY);
      }
      if (!this.target) return;
      const dx = this.target.x - this.x, dy = this.target.y - this.y, distance = Math.hypot(dx, dy);
      const speed = this.mode === 'follow' ? 230 : 65;
      if (distance < 2 || this.motion.matches) {
        this.place(this.target.x, this.target.y); this.target = null;
        this.pet.classList.remove('moving');
        if (this.mode === 'roam' && !this.motion.matches) this.wake();
        return;
      }
      const step = Math.min(distance, speed * dt);
      if (this.animation.pose !== 'walk' || now - this.animation.started > 900) this.animation.play('walk', 1800);
      this.place(this.x + dx / distance * step, this.y + dy / distance * step);
      this.pet.classList.add('moving'); this.wake();
    }
    hide() { this.setMode('idle'); this.pet.hidden = true; this.restore.hidden = false; this.restore.focus(); }
    show(focus = true) { this.pet.hidden = false; this.restore.hidden = true; if (focus) this.character.focus(); }
  }
  if (!customElements.get('ruan-mascot')) customElements.define('ruan-mascot', RuanMascot);
})();
