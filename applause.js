(() => {
  const button = document.querySelector('#visitor-like-button');
  const countNode = document.querySelector('#visitor-like-count');
  const status = document.querySelector('#visitor-like-status');
  const particles = document.querySelector('#visitor-like-particles');
  if (!button || !countNode || !status || !particles) return;
  const endpoint = String(window.RUAN_ADMIN_CONFIG?.endpoint || '').replace(/\/$/, '');
  const storageKey = 'ruan-portfolio-like-visitor-v1';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visitor;
  try { visitor = localStorage.getItem(storageKey); } catch {}
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(visitor || '')) {
    visitor = crypto.randomUUID();
    try { localStorage.setItem(storageKey, visitor); } catch {}
  }
  let liked = false, submitting = false, pulseTimer;
  button.disabled = true;
  function position() {
    const utilities = document.querySelector('.site-utilities'), widget = button.closest('.visitor-like');
    if (utilities && widget) utilities.prepend(widget);
  }
  position();
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', position, {once: true});
  function render(value, accepted) {
    const count = Number.isSafeInteger(Number(value)) ? Math.max(0, Number(value)) : 0;
    liked ||= !!accepted;
    countNode.textContent = new Intl.NumberFormat('zh-CN', {notation: count >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1}).format(count);
    button.classList.toggle('is-liked', liked); button.disabled = liked || submitting;
    button.querySelector('.visitor-like__label').textContent = liked ? '谢谢喜欢' : '喜欢';
    button.setAttribute('aria-label', liked ? `已点赞，共 ${count} 人喜欢` : `给网站点赞，已有 ${count} 人喜欢`);
    status.textContent = liked ? `你已经点赞，共 ${count} 人喜欢这个网站，人物彩蛋已解锁` : `已有 ${count} 人喜欢这个网站`;
    window.RUAN_VISITOR_LIKED = liked;
    document.dispatchEvent(new CustomEvent('portfoliolikestate', {detail: {liked, count}}));
  }
  function burst() {
    if (reducedMotion.matches) return;
    const shapes = ['♥', '♥', '★', '✦', '●', '◆'];
    const colors = ['#ff4f70', '#ff8a5b', '#ffd166', '#77d8c8', '#a88bff', '#62b7ff'];
    for (let i = 0; i < 24; i++) {
      const node = document.createElement('i'), shape = shapes[i % shapes.length];
      // The button lives at the top edge: let the burst fall into the viewport.
      const angle = (35 + Math.random() * 130) * Math.PI / 180, distance = 58 + Math.random() * 98;
      node.className = 'visitor-like__particle' + (shape === '●' ? ' visitor-like__particle--dot' : ''); node.textContent = shape;
      const color = colors[i % colors.length]; node.style.color = color;
      if (shape === '●') node.style.background = color;
      particles.append(node);
      const animation = node.animate([
        {transform: 'translate(-50%,-50%) scale(.25) rotate(0deg)', opacity: 0},
        {offset: .12, opacity: 1},
        {transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px),calc(-50% + ${Math.sin(angle) * distance}px)) scale(${.65 + Math.random() * .75}) rotate(${Math.random() * 240 - 120}deg)`, opacity: 0}
      ], {duration: 900 + Math.random() * 650, easing: 'cubic-bezier(.16,.75,.25,1)', fill: 'forwards'});
      animation.finished.then(() => node.remove(), () => node.remove());
    }
    button.classList.add('is-pulsing'); clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => button.classList.remove('is-pulsing'), 600);
  }
  async function call(path, options = {}) {
    const response = await fetch(endpoint + path, {...options, headers: {'Content-Type': 'application/json'}, signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw Error('request failed');
    return response.json();
  }
  async function load() {
    if (!endpoint) {button.closest('.visitor-like').hidden = true; return;}
    try {const data = await call('/likes?visitor=' + encodeURIComponent(visitor)); render(data.count, data.liked);}
    catch {countNode.textContent = '—'; button.disabled = false; status.textContent = '暂时无法读取点赞数，可以稍后再试';}
  }
  button.addEventListener('click', async () => {
    if (liked || submitting || button.disabled) return;
    submitting = true; button.disabled = true; button.setAttribute('aria-busy', 'true'); status.textContent = '正在送出你的喜欢';
    try {
      const data = await call('/likes', {method: 'POST', body: JSON.stringify({visitorId: visitor})}); render(data.count, true);
      if (data.accepted) {burst(); document.dispatchEvent(new CustomEvent('portfoliolike', {detail: {count: data.count}}));}
    } catch {status.textContent = '点赞暂时没有送达，请稍后再试';}
    finally {submitting = false; button.disabled = liked; button.removeAttribute('aria-busy');}
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(pulseTimer);
    particles.querySelectorAll('i').forEach(node => {node.getAnimations().forEach(animation => animation.cancel()); node.remove();});
  });
  load();
})();
