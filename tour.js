/* Navigation state machine: depart → commit layout → arrive → introduce → interact. */
(() => {
  const pages=[...document.querySelectorAll('[data-page]')],valid=new Set(pages.map(p=>p.id));
  const names={home:'欢迎来做客',about:'认识我',experience:'我的经历',works:'我的项目',contact:'保持联系'};
  const host=window.ruanPresenter,positions=new Map();let current='',pending='',controller,pendingHistory='push',entrance;
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const settle=async(page,signal)=>{
    const images=[...page.querySelectorAll('img')].map(img=>img.decode().catch(()=>{}));
    await Promise.race([Promise.all([document.fonts.ready,...images]),new Promise(r=>setTimeout(r,1500))]);
    if(signal.aborted)return;await frame();await frame();
  };
  async function navigate(id,{historyMode='push',focus=true,initial=false,instant=false,narrate=true,resetScroll=false,directGuide=false}={}){
    if(id==='top')id='home';if(id==='life')id='about';if(!valid.has(id))id='home';
    if(pending===id&&!instant)return;
    if(current===id&&!pending)return;
    controller?.abort();entrance?.cancel();controller=new AbortController();const signal=controller.signal;pending=id;pendingHistory=historyMode;
    if(instant){host.cancel();host.media.play('idle');}
    if(current)positions.set(current,host.walker.viewport.scrollTop);
    const travel=Math.abs(pages.findIndex(p=>p.id===current)-pages.findIndex(p=>p.id===id))>1?'run':'walk';
    const direction=pages.findIndex(p=>p.id===id)<pages.findIndex(p=>p.id===current)?1:-1;
    document.body.dataset.destination=id;
    document.querySelector('#journey-status').textContent='正在前往：'+names[id];
    if(current&&!initial&&!instant)await host.leave(signal,travel,direction);
    if(signal.aborted)return;
    pages.forEach(page=>{page.hidden=page.id!==id;});current=id;document.body.dataset.currentPage=id;
    const hash='#'+id;
    if(historyMode==='push'&&location.hash!==hash)history.pushState({chapter:id},'',hash);
    if(historyMode==='replace'||location.hash==='#life')history.replaceState({chapter:id},'',hash);
    document.title='阮涵 | AI创意小屋';host.mount(id);
    const page=document.getElementById(id);await settle(page,signal);if(signal.aborted)return;
    if(!initial&&!host.media.reduced.matches){
      const body=page.querySelector('.chapter-body,.welcome-copy');
      entrance=body.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'ease-out'});
    }
    host.walker.viewport.scrollTo({top:resetScroll?0:positions.get(id)||0,behavior:'instant'});
    if(focus)page.querySelector('h1,h2')?.focus({preventScroll:true});
    if(directGuide)host.finish();else await host.arrive(signal,travel,direction,initial||instant,narrate);if(signal.aborted)return;
    pending='';delete document.body.dataset.destination;document.querySelector('#journey-status').textContent='';window.dispatchEvent(new CustomEvent('chapterchange',{detail:{id}}));
  }
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href^="#"]');if(!a||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
    const id=a.hash.slice(1);if(valid.has(id)||['top','life'].includes(id)){event.preventDefault();navigate(id);}
  });
  const restore=()=>navigate(location.hash.slice(1),{historyMode:'none'});
  window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
  history.scrollRestoration='manual';window.portfolioNavigate=navigate;
  window.portfolioSkipTransition=()=>{if(pending)navigate(pending,{instant:true,historyMode:pendingHistory});};
  window.portfolioCancelTransition=()=>{controller?.abort();entrance?.cancel();pending='';delete document.body.dataset.destination;document.querySelector('#journey-status').textContent='';host.walker.stop();host.finish();};
  navigate(location.hash.slice(1)||'home',{historyMode:'replace',focus:false,initial:true});
})();
