(() => {
  const pages = [...document.querySelectorAll('[data-page]')];
  const valid = new Set(pages.map(page => page.id));
  const names = { home: '欢迎来做客', about: '认识我', experience: '我的经历', works: '我的作品', contact: '保持联系' };
  let current = '';
  function navigate(id, { historyMode = 'push', focus = true } = {}) {
    if (id === 'top') id = 'home';
    if (id === 'life') id = 'about';
    if (!valid.has(id)) id = 'home';
    const changed = current !== id;
    pages.forEach(page => { page.hidden = page.id !== id; });
    current = id; document.body.dataset.currentPage = id;
    if (historyMode === 'push' && location.hash !== '#' + id) history.pushState({ chapter: id }, '', '#' + id);
    if (historyMode === 'replace') history.replaceState({ chapter: id }, '', '#' + id);
    document.title = `${names[id]} · 阮涵的小站`;
    document.querySelectorAll('.site-nav a').forEach(link => {
      const selected = link.hash === '#' + id;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    document.body.classList.remove('menu-open');
    if (changed || focus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (focus) document.querySelector(`#${id} h1, #${id} h2`)?.focus({ preventScroll: true });
    }
    window.dispatchEvent(new CustomEvent('chapterchange', { detail: { id } }));
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const id = link.getAttribute('href').slice(1);
    if (valid.has(id) || id === 'top' || id === 'life') { event.preventDefault(); navigate(id); }
  });
  window.addEventListener('popstate', () => navigate(location.hash.slice(1), { historyMode: 'none' }));
  window.addEventListener('hashchange', () => { if (location.hash.slice(1) !== current) navigate(location.hash.slice(1), { historyMode: 'none' }); });
  window.portfolioNavigate = navigate;
  navigate(location.hash.slice(1) || 'home', { historyMode: 'replace', focus: false });
  const hello = document.querySelector('#welcome-hello');
  let helloIndex = 0;
  const greetings = ['欢迎来做客，我是阮涵。', '想先认识我，还是先看作品？', '跟我逛逛吧，每一站都有小故事。'];
  document.querySelector('.welcome-character').addEventListener('click', event => {
    hello.replaceChildren(document.createTextNode(greetings[helloIndex++ % greetings.length]));
    event.currentTarget.querySelector('canvas').avatar?.play(['wave', 'present', 'nod'][helloIndex % 3]);
  });
})();