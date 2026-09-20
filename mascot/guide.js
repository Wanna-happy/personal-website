/* Chapter-aware text host. Audio files will be supplied by the owner later. */
(() => {
  const rootURL = new URL('.', document.currentScript.src);
  customElements.whenDefined('ruan-mascot').then(() => {
    const host = document.querySelector('ruan-mascot');
    const stops = (window.RUAN_GUIDE_STOPS || []).filter(s => document.getElementById(s.id));
    if (!host || !stops.length) return;
    const root = host.shadowRoot;
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet'; sheet.href = new URL('guide.css', rootURL); root.append(sheet);
    host.setAttribute('guide', '');
    root.querySelector('.bubble').hidden = true;
    const panel = document.createElement('section');
    panel.className = 'guide-panel'; panel.setAttribute('aria-label', '阮涵的网站导览');
    panel.innerHTML = `
      <header class="guide-header"><span class="guide-owner"><i aria-hidden="true"></i> 阮涵 · 你的小站主人</span><button class="guide-collapse" aria-label="暂时收起讲述">−</button></header>
      <div class="guide-copy" aria-live="polite" aria-atomic="true"><p class="guide-stop"></p><h2></h2><p class="guide-text"></p></div>
      <a class="guide-action" href="#"></a>
      <nav class="guide-stops" aria-label="选择介绍板块"></nav>`;
    root.append(panel);
    const query = s => panel.querySelector(s);
    const tools = root.querySelector('.tools');
    tools.querySelector('[data-action="roam"]').textContent = '走走';
    const guideButton = document.createElement('button');
    guideButton.type = 'button'; guideButton.className = 'guide-open'; guideButton.textContent = '导览';
    guideButton.setAttribute('aria-expanded', 'true'); guideButton.setAttribute('aria-label', '打开或收起当前板块讲述');
    tools.prepend(guideButton);
    const state = { index: -1, collapsed: false };
    host.guide = { state, stops, select: selectStop };
    const navButtons = stops.map((stop, i) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = ['欢迎','认识我','经历','项目','联系'][i];
      button.title = stop.label; button.setAttribute('aria-label', '前往' + stop.label);
      button.addEventListener('click', () => goTo(stop.id));
      query('.guide-stops').append(button); return button;
    });

    function blocked() { return document.body.classList.contains('menu-open') || !!document.querySelector('dialog[open]'); }
    function positionPanel() {
      if (panel.hidden || document.body.dataset.currentPage === 'home') return;
      const gap = 14, width = panel.offsetWidth, height = panel.offsetHeight;
      if (innerWidth >= 1200 && host.mode === 'idle' && !host.dragging) {
        panel.style.left = (host.clientWidth - width - 24) + 'px';
        panel.style.top = Math.max(24, host.clientHeight - host.pet.offsetHeight - height - 32) + 'px';
        return;
      }
      const pet = host.pet.getBoundingClientRect(), viewport = host.getBoundingClientRect();
      const leftRoom = pet.left - viewport.left - gap, rightRoom = viewport.right - pet.right - gap;
      let left, top;
      if (leftRoom >= width) { left = pet.left - viewport.left - width - gap; top = pet.top - viewport.top + 8; }
      else if (rightRoom >= width) { left = pet.right - viewport.left + gap; top = pet.top - viewport.top + 8; }
      else { left = (host.clientWidth - width) / 2; top = pet.top - viewport.top - height - gap; }
      panel.style.left = Math.max(8, Math.min(left, host.clientWidth - width - 8)) + 'px';
      panel.style.top = Math.max(12, Math.min(top, host.clientHeight - height - 8)) + 'px';
    }
    function refresh() {
      panel.hidden = state.collapsed || host.pet.hidden || blocked();
      guideButton.setAttribute('aria-expanded', String(!panel.hidden));
      positionPanel();
    }
    function setCollapsed(collapsed) { state.collapsed = collapsed; refresh(); }
    const originalPlace = host.place.bind(host);
    host.place = (x, y) => { originalPlace(x, y); positionPanel(); };
    const originalHide = host.hide.bind(host);
    host.hide = () => { originalHide(); refresh(); };
    const originalShow = host.show.bind(host);
    host.show = (focus = true) => { originalShow(focus); refresh(); };
    host.greet = () => { host.animation.play(['wave','present','nod'][host.sequence++ % 3]); setCollapsed(false); };
    query('.guide-collapse').addEventListener('click', () => { setCollapsed(true); guideButton.focus(); });
    guideButton.addEventListener('click', () => setCollapsed(!state.collapsed));
    query('.guide-action').addEventListener('click', e => {
      const stop = stops[state.index];
      if (stop.target) { e.preventDefault(); goTo(stop.target); }
    });
    function goTo(id) {
      if (window.portfolioNavigate) window.portfolioNavigate(id);
      else document.getElementById(id)?.scrollIntoView({ behavior: host.motion.matches ? 'instant' : 'smooth' });
    }
    function selectStop(index) {
      if (index < 0) return;
      state.index = index;
      const stop = stops[index];
      query('.guide-stop').textContent = String(index + 1).padStart(2, '0') + ' / ' + String(stops.length).padStart(2, '0') + ' · ' + stop.label;
      query('h2').textContent = stop.title; query('.guide-text').textContent = stop.text;
      const link = query('.guide-action'); link.textContent = stop.action + ' →'; link.href = stop.href || '#' + stop.target;
      navButtons.forEach((button, i) => { if (i === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
      refresh();
    }
    function onChapter() {
      host.toggleAttribute('contact', document.body.dataset.currentPage === 'contact');
      const index = stops.findIndex(s => s.id === document.body.dataset.currentPage);
      selectStop(index < 0 ? 0 : index);
      // Show a chapter introduction unless the visitor explicitly collapsed it.
      requestAnimationFrame(() => { if (!host.pet.hidden) host.home(); host.animation.play('present'); refresh(); });
    }
    window.addEventListener('chapterchange', onChapter);
    window.addEventListener('resize', positionPanel);
    // Let the visitor read freely once they start scrolling on a small screen.
    window.addEventListener('scroll', () => {
      if (innerWidth < 1200 && scrollY > 80 && !state.collapsed) setCollapsed(true);
    }, { passive: true });
    const modalObserver = new MutationObserver(refresh);
    modalObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.querySelectorAll('dialog').forEach(dialog => modalObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    new ResizeObserver(positionPanel).observe(panel);
    sheet.addEventListener('load', () => { host.home(); refresh(); });
    onChapter();
  });
})();
