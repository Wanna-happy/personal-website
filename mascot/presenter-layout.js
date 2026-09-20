/* A compact companion follows the actor; it owns no column in the document. */
(() => {
 const host=window.ruanPresenter,box=host.element,walker=host.walker;
 const person=walker.stage.querySelector('.presenter-person');
 let openTimer,closeTimer,actorHover=false,panelHover=false;
 box.id='host-interactions';box.dataset.open='false';box.inert=true;
 person.setAttribute('aria-controls',box.id);person.setAttribute('aria-expanded','false');
 function close(){clearTimeout(openTimer);clearTimeout(closeTimer);box.dataset.open='false';box.inert=true;person.setAttribute('aria-expanded','false');box.dataset.expanded='false';}
 function open(){if(walker.moving||document.body.dataset.destination)return;clearTimeout(closeTimer);place();box.inert=false;box.dataset.open='true';person.setAttribute('aria-expanded','true');dismissGreeting(true);}
 function laterClose(){clearTimeout(openTimer);clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(!actorHover&&!panelHover&&!box.contains(document.activeElement))close();},420);}
 person.addEventListener('pointerenter',e=>{if(e.pointerType!=='mouse')return;actorHover=true;if(!walker.moving){clearTimeout(closeTimer);openTimer=setTimeout(open,280);}});
 person.addEventListener('pointerleave',()=>{actorHover=false;laterClose();});
 box.addEventListener('pointerenter',()=>{panelHover=true;clearTimeout(closeTimer);});
 box.addEventListener('pointerleave',()=>{panelHover=false;laterClose();});
 person.addEventListener('focus',()=>{if(person.matches(':focus-visible'))open();});
 person.addEventListener('click',e=>{if(box.dataset.open!=='true'){e.preventDefault();e.stopImmediatePropagation();open();}},true);
 box.addEventListener('focusout',laterClose);person.addEventListener('blur',laterClose);
 document.addEventListener('pointerdown',e=>{if(!box.contains(e.target)&&!person.contains(e.target))close();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&box.dataset.open==='true'&&box.dataset.expanded!=='true'){person.focus({preventScroll:true});close();}});
 new MutationObserver(()=>{if(walker.moving){actorHover=false;panelHover=false;close();dismissGreeting();}}).observe(walker.stage,{attributes:true,attributeFilter:['data-moving']});
 new MutationObserver(()=>{if(document.body.dataset.destination){close();dismissGreeting();}}).observe(document.body,{attributes:true,attributeFilter:['data-destination']});
 // An invitation is separate from controls, and never follows the actor during travel.
 const greeting=document.createElement('div');greeting.className='host-greeting';greeting.hidden=true;greeting.textContent='嗨，我可以带你逛逛我的家。';document.body.append(greeting);
 let greetingTimer,greeted=false;try{greeted=localStorage.getItem('ruan-welcome-invitation-v1')==='seen';}catch{}
 function dismissGreeting(cancelPending=false){greeting.hidden=true;if(greeted||cancelPending)clearTimeout(greetingTimer);}
 function greet(){if(greeted||location.hash&&location.hash!=='#home')return;if(walker.moving||document.body.dataset.destination){greetingTimer=setTimeout(greet,500);return;}greeted=true;const p=walker.position;greeting.style.left=Math.max(12,Math.min(innerWidth-230,p.x+25))+'px';greeting.style.top=Math.max(12,p.y-walker.height()-38)+'px';greeting.hidden=false;try{localStorage.setItem('ruan-welcome-invitation-v1','seen');}catch{}greetingTimer=setTimeout(dismissGreeting,8000);}
 greetingTimer=setTimeout(greet,1200);
 box.dataset.expanded='false';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='presenter-expand';toggle.textContent='更多';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','展开人物讲解选项');
 box.querySelector('.presenter-meta').append(toggle);
 toggle.addEventListener('click',()=>{box.dataset.expanded=String(box.dataset.expanded!=='true');sync();});
 function sync(){const expanded=box.dataset.expanded==='true';toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'收起':'更多';toggle.setAttribute('aria-label',expanded?'收起人物讲解选项':'展开人物讲解选项');place();}
 let raf,hovering=false,pressing=false,releaseTimer;
 box.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovering=true;if(host.state.phase!=='interactive')box.dataset.interacting='true';}});
 box.addEventListener('pointerleave',()=>{hovering=false;if(!pressing)delete box.dataset.interacting;place();});
 window.addEventListener('pointerdown',e=>{if(box.contains(e.target)){pressing=true;if(host.state.phase!=='interactive')box.dataset.interacting='true';clearTimeout(releaseTimer);}},{capture:true});
 const release=()=>{clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>{pressing=false;if(!hovering)delete box.dataset.interacting;place();},160);};
 window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
 function place(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
  const p=walker.position;if(!p)return;
  const w=box.offsetWidth,h=box.offsetHeight,pad=16,half=walker.stage.offsetWidth*.24;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  // Keep a pressed/hovered control under the pointer while pausing shrinks the bubble.
  if(pressing||(hovering&&!walker.moving)){
   box.style.left=clamp(parseFloat(box.style.left)||pad,pad,innerWidth-w-pad)+'px';
   box.style.top=clamp(parseFloat(box.style.top)||pad,pad,innerHeight-h-pad)+'px';return;
  }
  const candidates=[{x:p.x-w-half-12,y:p.y-walker.height()+15},{x:p.x+half+12,y:p.y-walker.height()+15},{x:p.x-w/2,y:p.y-walker.height()-h-12},{x:p.x-w/2,y:p.y+12}].map(q=>({x:clamp(q.x,pad,innerWidth-w-pad),y:clamp(q.y,pad,innerHeight-h-pad)}));
  // Prefer empty margins and spacing between sections over text, controls, or photos.
  const obstacles=walker.obstacles();
  for(const el of walker.viewport.querySelectorAll('.about__info strong,.about__info span,figcaption,.skill-tags li')){
   if(el.closest('[hidden]'))continue;
   const range=document.createRange();range.selectNodeContents(el);obstacles.push(...range.getClientRects());
  }
  const area=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  const actor={left:p.x-half,right:p.x+half,top:p.y-walker.height(),bottom:p.y};
  const score=q=>{const r={left:q.x,right:q.x+w,top:q.y,bottom:q.y+h};return (obstacles.reduce((s,o)=>s+area(r,o),0)+area(r,actor)*4)*100+Math.hypot(q.x+w/2-p.x,q.y+h/2-(p.y-walker.height()/2));};
  // If no nearby gap fits, search the rest of the viewport instead of covering a fact.
  for(let y=pad;y<=innerHeight-h-pad;y+=45)for(let x=pad;x<=innerWidth-w-pad;x+=90)candidates.push({x,y});
  candidates.sort((a,b)=>score(a)-score(b));const q=candidates[0];box.style.left=q.x+'px';box.style.top=q.y+'px';
 });}
 walker.onPlacement=()=>{if(box.dataset.open==='true')place();};
 new ResizeObserver(place).observe(box);
 new MutationObserver(sync).observe(box,{attributes:true,attributeFilter:['data-expanded']});
 walker.viewport.addEventListener('scroll',place,{passive:true});window.addEventListener('resize',place);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&box.dataset.expanded==='true'){box.dataset.expanded='false';toggle.focus({preventScroll:true});}});
 sync();
})();
