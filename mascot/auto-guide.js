/* A cancellable, resumable tour. Every asynchronous step belongs to one run. */
(() => {
 const host=window.ruanPresenter,viewport=host.walker.viewport;
 const steps=[
  {page:'about',label:'学习经历',key:'topics-study',target:'#about .about__info',feet:.64},
  {page:'about',label:'产品方向与常用工具',key:'topics-focus',target:'#about .skills-showcase',feet:.88},
  {page:'about',label:'生活里的我',key:'topics-life',target:'#about .life-gallery',feet:.58},
  {page:'experience',label:'我做过的事',key:'chapters-experience',target:'#experience .story-flow',feet:.8},
  {page:'works',label:'周报智能体 · 项目详情',key:'topics-weekly',target:'#works .work-card:first-child',project:'weekly',gesture:'show'},
  {page:'works',label:'AI 学习助手 · 项目详情',key:'topics-learning',target:'#works .work-card:last-child',project:'learning',gesture:'show'},
  {page:'contact',label:'谢谢你来做客',key:'chapters-contact',target:'#contact .contact-card',gesture:'nod'},
 ];
 if(window.PORTFOLIO_CONTENT){
 const content=window.PORTFOLIO_CONTENT;
 const at=steps.findIndex(s=>s.project);
 steps.splice(at,2,...content.projects.map(p=>({page:'works',label:p.title,key:'topics-'+p.id,target:'[data-project-id=\"'+p.id+'\"]',project:p.id,customText:p.managed?(p.narration||p.description||p.title):null,gesture:'show'})));
 if(!content.experiences.length)steps.splice(steps.findIndex(s=>s.page==='experience'),1);
 else if(content.experiences.some(e=>e.managed)){const step=steps.find(s=>s.page==='experience');step.customText=content.experiences.map(e=>e.narration||e.highlight||e.title).join(' ');}
 }
 const controls=host.element.querySelector('.presenter-tools');
 const resumeButton=document.createElement('button');resumeButton.type='button';resumeButton.dataset.guideControl='resume';resumeButton.textContent='继续导览';resumeButton.hidden=true;controls.append(resumeButton);
 let active=false,paused=false,index=0,controller,highlighted,projectLineListener,complete=false;
 const abortError=()=>new DOMException('Tour interrupted','AbortError');
 const check=signal=>{if(signal.aborted)throw abortError();};
 function update(){document.body.dataset.autoGuide=active?'playing':paused?'paused':'complete';resumeButton.hidden=!paused;}
 function clearFocus(){highlighted?.classList.remove('auto-guide-focus');highlighted=null;}
 function delay(ms,signal){return new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(abortError());};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});}
 function stopRun(){controller?.abort();document.removeEventListener('narrationline',projectLineListener);const dialog=document.querySelector('#project-dialog');dialog.scrollTo({top:dialog.scrollTop,behavior:'instant'});clearFocus();window.portfolioCancelTransition?.();host.walker.stop();host.finish();}
 function pause(){if(!active)return;active=false;paused=true;stopRun();update();host.media.play('nod');}
 function exit(){active=false;paused=false;complete=false;stopRun();resumeButton.hidden=true;delete document.body.dataset.autoGuide;window.portfolioProjects.close();}
 async function travelToTarget(target,step,signal){
  check(signal);const rect=target.getBoundingClientRect(),area=viewport.getBoundingClientRect();
  const max=Math.max(0,viewport.scrollHeight-viewport.clientHeight),from=viewport.scrollTop,to=Math.max(0,Math.min(max,from+rect.top-area.top-32));
  // Measure the destination layout in the same task; no intermediate frame is painted.
  viewport.scrollTop=to;const obstacles=host.walker.obstacles();viewport.scrollTop=from;
  const point={x:innerWidth*.87,y:Math.min(innerHeight-24,Math.max(host.walker.height()+24,innerHeight*(step.feet||.7)))};
  const arrived=await host.walker.moveTo(point,{signal,kind:'walk',obstacles,keepHeight:false,onProgress:p=>{
   // One clock, sourced from the gait video: scrolling also waits if the gait buffers.
   if(!signal.aborted)viewport.scrollTop=from+(to-from)*(p*p*(3-2*p));
  }});check(signal);if(!arrived)throw Error('Guide movement interrupted');
  viewport.scrollTop=to;
 }
 function narrate(step,signal){return new Promise((resolve,reject)=>{
  const done=e=>{if(e.detail.key!==step.key)return;cleanup();resolve();};
  const abort=()=>{cleanup();reject(abortError());};
  const cleanup=()=>{document.removeEventListener('narrationend',done);signal.removeEventListener('abort',abort);};
  document.addEventListener('narrationend',done);signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  if(step.key.startsWith('chapters-'))host.introduce(step.page);else host.respond(step.key.slice(7));
 });}
 async function run(){
  controller=new AbortController();const signal=controller.signal;
  try{
   for(;index<steps.length;index++){
    check(signal);const step=steps[index];update();host.guideText(step.label,'跟我来，'+step.label+'。');
    window.portfolioProjects.close();
    if(host.state.chapter!==step.page||document.body.dataset.destination)await window.portfolioNavigate(step.page,{narrate:false,resetScroll:true,focus:false,directGuide:true});
    check(signal);host.cancel();
    const target=document.querySelector(step.target);if(!target)throw Error('Missing tour content: '+step.target);
    clearFocus();await travelToTarget(target,step,signal);check(signal);highlighted=target;target.classList.add('auto-guide-focus');
    // The guide uses the existing sidebar; no reserved space or floating caption bar.
    const bottom=innerHeight-24;
    // Narration has its own synchronized gestures; avoid a separate gesture-and-wait stop.
    if(step.project){
     window.portfolioProjects.open(step.project,{guided:true});check(signal);
     const projectFeet=innerWidth<=760?document.querySelector('#project-dialog').getBoundingClientRect().bottom+host.walker.height()+16:Math.min(innerHeight*.62,600);
     await host.walker.moveTo({x:innerWidth*.9,y:Math.min(bottom,projectFeet)},{signal});check(signal);
     projectLineListener=e=>{if(e.detail.key!==step.key||signal.aborted)return;window.portfolioProjects.section(e.detail.index===0?'problem':'process');};
     document.addEventListener('narrationline',projectLineListener);
    }
    if(step.customText){host.finish();host.guideText(step.label,step.customText);host.media.play('show',{loop:false});await delay(Math.max(4000,Math.min(18000,step.customText.length*160)),signal);}else await narrate(step,signal);check(signal);
    if(step.project){window.portfolioProjects.section('result');await delay(2000,signal);document.removeEventListener('narrationline',projectLineListener);projectLineListener=null;window.portfolioProjects.close();}
    await delay(220,signal);clearFocus();
   }
   index=steps.length-1;await host.gesture('goodbye',signal);check(signal);active=false;paused=false;complete=true;update();host.guideText('谢谢你来做客。','接下来，你慢慢看。感兴趣的内容可以点开聊。');
  }catch(error){if(error.name!=='AbortError'){console.error(error);active=false;paused=true;stopRun();update();host.guideText('稍等一下。','这段暂时没加载好，可以继续导览，或自己看看。');}}
 }
 function start({resume=false}={}){stopRun();if(!resume)index=0;complete=false;paused=false;active=true;host.setMode('guided');if(!resume)host.setSound(true,{restart:false});update();run();}
 resumeButton.addEventListener('click',()=>start({resume:true}));
 const starts=target=>target.closest('[data-auto-guide-start],[data-guided-start]');
 document.addEventListener('click',e=>{
  if(starts(e.target)){e.preventDefault();e.stopImmediatePropagation();start();return;}
  if(e.target.closest('[data-tour-action=mode]')&&(active||paused)){e.preventDefault();e.stopImmediatePropagation();exit();host.setMode('free');return;}
  if(active&&e.target!==resumeButton&&e.isTrusted)pause();
 },true);
 document.addEventListener('pointerdown',e=>{if(active&&e.isTrusted&&e.target!==resumeButton&&!starts(e.target))pause();},true);
 document.addEventListener('wheel',e=>{if(active&&e.isTrusted)pause();},{passive:true,capture:true});
 document.addEventListener('touchmove',e=>{if(active&&e.isTrusted)pause();},{passive:true,capture:true});
 document.addEventListener('keydown',e=>{if(active&&e.isTrusted&&e.target!==resumeButton&&['Escape','ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))pause();},true);
 window.addEventListener('popstate',()=>{if(active)pause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)pause();});
 window.ruanAutoGuide={start,pause,exit,get active(){return active;},get paused(){return paused;},get index(){return index;},get complete(){return complete;},steps};
})();
