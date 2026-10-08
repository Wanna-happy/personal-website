(() => {
  const nav=document.querySelector('.mobile-nav');
  const sync=()=>nav.querySelectorAll('a').forEach(link=>{
    if(link.hash==='#'+document.body.dataset.currentPage)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  window.addEventListener('chapterchange',sync);
  sync();
})();
