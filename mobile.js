/* Touch devices use the same presenter, chapters and recordings as desktop. */
(() => {
 const host=window.ruanPresenter;
 const person=host.walker.stage.querySelector('.presenter-person');
 const image=document.createElement('img');
 image.className='host-poster-fallback';image.alt='';image.setAttribute('aria-hidden','true');
 image.src=new URL('mascot/assets/motion/neutral.webp',document.baseURI).href;
 person.prepend(image);
 const hint=document.createElement('span');hint.className='host-touch-hint';hint.textContent='点我 · 带你逛逛';person.append(hint);
})();
