/* Single layout-owned host. Narration and motion can be interrupted at any time. */
(() => {
  const stops=window.RUAN_GUIDE_STOPS;
  const read=k=>{try{return sessionStorage.getItem(k);}catch{return null;}};
  const save=(k,v)=>{try{sessionStorage.setItem(k,v);}catch{}};
  const visited=new Set((read('ruan-visited')||'').split(',').filter(Boolean));
  const element=document.createElement('aside');element.className='presenter';element.setAttribute('aria-label','阮涵的网站讲述');
  element.innerHTML='<div class="presenter-stage"><button class="presenter-person" aria-label="与阮涵互动" type="button"><canvas role="img" aria-label="阮涵的人物形象"></canvas></button><span class="presenter-name">RUAN HAN <span>你的小站主人</span></span></div>'+
    '<div class="presenter-dialog"><div class="presenter-journey" hidden><span class="presenter-journey-label" role="status"></span><button type="button" data-tour-action="arrive">直接到达 →</button></div><div class="presenter-meta"><span class="presenter-topic"></span></div>'+
    '<p class="presenter-line" tabindex="-1" aria-live="polite" aria-atomic="true"></p>'+
    '<div class="presenter-reading" hidden><button type="button" data-tour-action="next">下一句</button><button type="button" data-tour-action="pause" aria-pressed="false">暂停</button><button type="button" data-tour-action="skip">跳过介绍</button></div>'+
    '<div class="presenter-choices" hidden></div><div class="presenter-tools"><button type="button" data-tour-action="sound" aria-pressed="false">开启声音</button><button type="button" data-tour-action="mode"></button><button type="button" data-tour-action="replay">再介绍一次</button></div><span class="presenter-voice-status" role="status"></span>'+
    '<details class="presenter-destinations"><summary>去哪里</summary><nav aria-label="由主人带路"></nav></details>'+
    '</div>';
  document.body.append(element);
  const $=s=>element.querySelector(s),stage=$('.presenter-stage'),media=new window.RuanPresenterMedia($('canvas'));
  const person=$('.presenter-person');
  const celebrationPoses=[document.createElement('img'),document.createElement('img')];
  celebrationPoses.forEach((image,index)=>{image.className='presenter-celebration-pose';image.alt='';image.decoding='async';image.draggable=false;image.dataset.layer=String(index);person.append(image);});
  const celebrationAssets={
    two:'mascot/assets/celebration/two-hand-heart.webp',
    one:'mascot/assets/celebration/one-hand-heart.webp',
    overhead:'mascot/assets/celebration/overhead-heart.webp'
  };
  Object.values(celebrationAssets).forEach(src=>{const image=new Image();image.src=src;});
  let celebrationPoseLayer=0;
  const fingerHeart=document.createElement('i'),overheadHeart=document.createElement('i');
  fingerHeart.className='presenter-heart presenter-heart--finger';fingerHeart.textContent='♥';fingerHeart.setAttribute('aria-hidden','true');
  overheadHeart.className='presenter-heart presenter-heart--overhead';overheadHeart.textContent='♡';overheadHeart.setAttribute('aria-hidden','true');
  stage.append(fingerHeart,overheadHeart);
  const celebrationCaption=document.createElement('span');
  celebrationCaption.className='presenter-celebration-caption';celebrationCaption.hidden=true;
  celebrationCaption.setAttribute('role','status');celebrationCaption.setAttribute('aria-live','polite');stage.append(celebrationCaption);
  const celebrationChoices=document.createElement('div');celebrationChoices.className='presenter-celebration-choices';celebrationChoices.hidden=true;
  celebrationChoices.setAttribute('aria-label','已解锁的人物彩蛋');
  for(const [kind,label] of [['two','双手比心'],['one','单手比心'],['overhead','头顶比心'],['thanks','送你一句祝福']]){
    const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.celebration=kind;
    button.addEventListener('click',()=>celebrate(kind));celebrationChoices.append(button);
  }
  $('.presenter-tools').after(celebrationChoices);
  const state={phase:'waiting',chapter:'home',mode:read('ruan-mode')||'guided',line:0,readings:[],sequence:0,interactive:false,paused:false};
  let timer,deadline=0,remaining=0,hoverPaused=false,focusPaused=false,activeReading=false,detailOpen=false,focusTarget,focusTimer;
  let speechKey='',lastGesture=0,walker,relocation=0,narrationEpoch=0,motionReady=Promise.resolve(),celebrationRun;
  const speech=new window.RuanPresenterSpeech({
    onEnd:options=>{if(activeReading)showLine(state.line+1,options);},
    onFallback:()=>schedule(),
    onStatus:text=>{$('.presenter-voice-status').textContent=text;element.dataset.speaking=String(text==='正在讲解');}
  });
  const topics=Object.fromEntries(Object.entries(window.RUAN_NARRATION_SCRIPTS.topics).map(([id,script])=>[id,[script.title,script.text]]));
  const choices={
    home:[['带我认识你','about','navigate'],['直接看作品','works','navigate']],
    about:[['学习经历','study'],['产品兴趣','focus'],['看看生活','life','life']],
    experience:[['机器人那段','robot'],['周报 Agent','weekly']],
    works:[['讲讲周报 Agent','weekly'],['讲讲学习助手','learning']],
    contact:[['联系方式','contact'],['再看看作品','works','navigate']]
  };
  if(window.PORTFOLIO_CONTENT){choices.works=window.PORTFOLIO_CONTENT.projects.map(p=>[p.title,p.id]);choices.experience=window.PORTFOLIO_CONTENT.experiences.map(e=>[e.title,e.managed?'experience-'+e.id:e.id]);}
  function phase(value){
    state.phase=value;element.dataset.phase=value;document.body.dataset.tourPhase=value;
    const traveling=['departing','arriving','layout'].includes(value);
    $('.presenter-journey').hidden=!traveling;
    if(traveling){const destination=stops.find(s=>s.id===document.body.dataset.destination);$('.presenter-journey-label').textContent=value==='arriving'?'到了，等我站好。':'跟我来，去'+(destination?.label||'下一站')+'。';}
  }
  function clearHighlight(){clearTimeout(focusTimer);focusTarget?.classList.remove('host-focus');focusTarget=null;}
  function highlight(topic){
    clearHighlight();
    const selectors={study:'#about .about__info',focus:'#about .skills-showcase',life:'#about .life-gallery',robot:'#experience .story-card:first-child',weekly:state.chapter==='experience'?'#experience .story-card:last-child':'#works .work-card:first-child',learning:'#works .work-card:last-child',fitness:'[data-life-topic="fitness"]',sunset:'[data-life-topic="sunset"]',flowers:'[data-life-topic="flowers"]',contact:'#contact .contact-copy'};
    focusTarget=document.querySelector(selectors[topic]||'__none__');
    if(focusTarget){focusTarget.classList.add('host-focus');focusTimer=setTimeout(clearHighlight,1800);}
  }
  function clearTimer(){clearTimeout(timer);timer=undefined;}
  function cancelCelebration(){
    if(celebrationRun){celebrationRun.abort.abort();cancelAnimationFrame(celebrationRun.frame);clearTimeout(celebrationRun.timer);celebrationRun=null;}
    stage.classList.remove('is-like-celebrating');delete stage.dataset.celebrationBeat;delete stage.dataset.celebrationProgress;
    celebrationPoses.forEach(image=>image.classList.remove('is-active'));
    celebrationCaption.hidden=true;
  }
  function cancel(){++narrationEpoch;clearTimer();cancelCelebration();media.unfollowSpeech();speech.stop();activeReading=false;remaining=0;state.paused=false;media.setPaused(true);}
  function held(){return state.paused||(!speech.enabled&&!window.ruanAutoGuide?.active&&(hoverPaused||focusPaused))||document.hidden||detailOpen;}
  function schedule(){clearTimer();speech.setPaused(held());if(!activeReading||held()||speech.active)return;deadline=performance.now()+remaining;timer=setTimeout(()=>showLine(state.line+1),remaining);}
  function hold(){if(timer!==undefined)remaining=Math.max(0,deadline-performance.now());clearTimer();}
  function display(text){const line=$('.presenter-line');line.textContent=text;line.getAnimations().forEach(a=>a.cancel());if(!media.reduced.matches)line.animate([{opacity:0},{opacity:1}],{duration:160});}
  function modeUI(){
    element.dataset.mode=state.mode;document.body.dataset.tourMode=state.mode;
    $('[data-tour-action="mode"]').textContent=state.mode==='free'?'叫阮涵讲讲':'我自己看看';
    $('.presenter-choices').hidden=state.mode==='free'&&!activeReading;
    $('[data-tour-action="replay"]').hidden=false;
  }
  function setMode(mode){
    state.mode=mode;save('ruan-mode',mode);modeUI();
    if(mode==='free'){cancel();state.interactive=true;phase('interactive');$('.presenter-reading').hidden=true;display('你慢慢看。想了解哪一部分，随时叫我。');media.play('idle');modeUI();}
  }
  function renderChoices(){
    const box=$('.presenter-choices');box.replaceChildren();
    (choices[state.chapter]||[]).forEach(([label,target,action])=>{
      const b=document.createElement('button');b.type='button';b.textContent=label;
      if(state.chapter==='home'&&target==='about')b.dataset.autoGuideStart='';
      b.addEventListener('click',()=>{
        if(action==='navigate'){window.portfolioNavigate(target);return;}
        respond(target);
        if(action==='life'){document.querySelector('#life-caption').textContent=topics.life[1];document.querySelector('.about-life').scrollIntoView({behavior:media.reduced.matches?'instant':'smooth',block:'start'});}
      });box.append(b);
    });
  }
  function finish({completed=false}={}){const key=speechKey;cancel();state.interactive=true;phase('interactive');media.play('idle');$('.presenter-reading').hidden=true;modeUI();if(completed)document.dispatchEvent(new CustomEvent('narrationend',{detail:{key}}));}
  async function showLine(index,{continuous=false}={}){
    const epoch=++narrationEpoch;clearTimer();state.line=index;if(index>=state.readings.length){finish({completed:true});return;}
    activeReading=true;display(state.readings[index]);
    document.dispatchEvent(new CustomEvent('narrationline',{detail:{key:speechKey,index,text:state.readings[index]}}));
    $('[data-tour-action="next"]').textContent=index===state.readings.length-1?'看完了':'下一句';
    remaining=Math.max(4200,Math.min(12000,state.readings[index].length*180));
    await motionReady;if(epoch!==narrationEpoch||!activeReading)return;
    const entries=window.RUAN_NARRATION_AUDIO?.items[speechKey]||[],entry=entries[index];
    media.setPaused(held());
    if(entry?.text===state.readings[index]&&speech.play(entry,{paused:held(),continuous})){
      const offset=entry.paragraphDuration?0:entries.slice(0,index).reduce((s,e)=>s+e.duration,0),total=entry.paragraphDuration||entries.reduce((s,e)=>s+e.duration,0);
      media.followSpeech(speech.audio,offset,total);
    }
    schedule();
  }
  function start(title,text,type='introducing',motion='present',key=''){
    cancel();speechKey=key;state.interactive=true;state.readings=text.match(/[^。！？]+[。！？]?/g)||[text];
    $('.presenter-topic').textContent=title;$('.presenter-reading').hidden=false;
    $('[data-tour-action="pause"]').textContent='暂停';$('[data-tour-action="pause"]').setAttribute('aria-pressed','false');
    phase(type);motionReady=media.play(motion,{hold:speech.enabled,narration:key});lastGesture=performance.now();showLine(0);modeUI();
  }
  function introduce(id){
    if(detailOpen)return;++relocation;walker?.stop();state.chapter=id;visited.add(id);save('ruan-visited',[...visited].join(','));
    const stop=stops.find(s=>s.id===id);start(stop.title,stop.intro||stop.text,'introducing',id==='home'?'welcome':'present','chapters-'+id);
  }
  function respond(topic,{focus=false}={}){
    if(detailOpen||['departing','arriving','layout'].includes(state.phase)||!topics[topic])return;
    const [title,text]=topics[topic];++relocation;walker?.stop();start(title,text,'responding','present','topics-'+topic);element.dataset.subject=topic;highlight(topic);
    document.querySelectorAll('[data-guide-topic]').forEach(b=>b.classList.toggle('is-selected',b.dataset.guideTopic===topic));
    if(focus)$('.presenter-line').focus({preventScroll:!matchMedia('(max-width:760px)').matches});
  }
  $('.presenter-person').addEventListener('click',()=>{
    if(walker?.moving)return;
    if(!state.interactive||detailOpen)return;if(activeReading){showLine(state.line+1);return;}
    const words=state.chapter==='works'?['想了解哪个项目？点一下卡片，或者选“给我讲讲”。','你可以直接看详情，也可以让我先讲讲项目背景。']:['我在呢，想了解哪一部分？','慢慢看，也可以选“去哪里”，我陪你换一站。'];
    display(words[state.sequence++%words.length]);media.play(['nod','invite','look'][state.sequence%3],{loop:false});
  });
  $('[data-tour-action="next"]').addEventListener('click',()=>showLine(state.line+1));
  $('[data-tour-action="skip"]').addEventListener('click',finish);
  $('[data-tour-action="arrive"]').addEventListener('click',()=>window.portfolioSkipTransition?.());
  $('[data-tour-action="pause"]').addEventListener('click',()=>{hold();state.paused=!state.paused;$('[data-tour-action="pause"]').textContent=state.paused?'继续':'暂停';$('[data-tour-action="pause"]').setAttribute('aria-pressed',String(state.paused));media.setPaused(state.paused);schedule();});
  $('[data-tour-action="mode"]').addEventListener('click',()=>{if(state.mode==='guided')setMode('free');else{setMode('guided');introduce(state.chapter);}});
  $('[data-tour-action="replay"]').addEventListener('click',()=>{walker?.stop();introduce(state.chapter);});
  function setSound(enabled,{restart=true}={}){
    speech.enabled=enabled;
    $('[data-tour-action="sound"]').textContent=speech.enabled?'关闭声音':'开启声音';
    $('[data-tour-action="sound"]').setAttribute('aria-pressed',String(speech.enabled));
    if(speech.enabled&&restart){if(activeReading){motionReady=media.play(state.chapter==='home'?'welcome':'present',{hold:true,narration:speechKey});showLine(state.line);}else introduce(state.chapter);}
    else{media.unfollowSpeech();speech.stop();media.setPaused(held());schedule();}
  }
  $('[data-tour-action="sound"]').addEventListener('click',()=>setSound(!speech.enabled));
  // The old generic system voice is deliberately disconnected pending a real voice clone.
  if(!window.RUAN_NARRATION_AUDIO?.voiceClone){const b=$('[data-tour-action="sound"]');b.disabled=true;b.textContent='声音准备中';b.title='正在准备视频人物音色的讲解';}
  // Follow the operating system preference without an extra site-level setting.
  media.setReduced(false);document.body.classList.toggle('reduce-motion',media.reduced.matches);
  media.systemReduced.addEventListener('change',()=>document.body.classList.toggle('reduce-motion',media.reduced.matches));
  const dialog=$('.presenter-dialog');
  dialog.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){if(!speech.enabled)hold();hoverPaused=true;}});
  dialog.addEventListener('pointerleave',()=>{hoverPaused=false;schedule();});
  dialog.addEventListener('focusin',()=>{if(!speech.enabled)hold();focusPaused=true;});
  dialog.addEventListener('focusout',()=>queueMicrotask(()=>{focusPaused=dialog.contains(document.activeElement);schedule();}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){hold();speech.setPaused(true);}else schedule();});
  stops.forEach(stop=>{const a=document.createElement('a');a.href='#'+stop.id;a.textContent=stop.label;$('.presenter-destinations nav').append(a);});
  document.addEventListener('click',e=>{
    const topic=e.target.closest('[data-guide-topic]');if(topic)respond(topic.dataset.guideTopic,{focus:true});
    if(e.target.closest('[data-browse-free]')){setMode('free');window.portfolioNavigate('about');}
    if(e.target.closest('[data-guided-start]'))setMode('guided');
  });
  document.addEventListener('projectopen',e=>{if(e.detail?.guided)return;++relocation;detailOpen=true;cancel();state.interactive=false;phase('reading');media.setPaused(true);element.dataset.reading='true';});
  document.addEventListener('hostfeedback',e=>{if(!state.interactive||detailOpen)return;finish();display(e.detail.text);media.play('acknowledge',{loop:false});highlight(e.detail.topic);});
  function unlockCelebration(){celebrationChoices.hidden=!window.RUAN_VISITOR_LIKED;}
  document.addEventListener('portfoliolikestate',unlockCelebration);unlockCelebration();
  async function celebrate(kind='all'){
    if(!window.RUAN_VISITOR_LIKED)return;
    window.ruanAutoGuide?.pause();window.portfolioCancelTransition?.();++relocation;walker?.stop();
    clearTimeout(walker?.scrollTimer);cancel();clearHighlight();state.interactive=false;phase('celebrating');
    $('.presenter-reading').hidden=true;$('.presenter-topic').textContent='谢谢你的喜欢';
    stage.classList.add('is-like-celebrating');
    document.dispatchEvent(new CustomEvent('hostcelebrationstart'));
    const run={abort:new AbortController(),frame:0,timer:0};celebrationRun=run;
    const signal=run.abort.signal;
    const setPose=beat=>{
      const src=celebrationAssets[beat];
      if(!src){celebrationPoses.forEach(image=>image.classList.remove('is-active'));return;}
      const current=celebrationPoses[celebrationPoseLayer];
      if(current.classList.contains('is-active')&&current.getAttribute('src')===src)return;
      celebrationPoseLayer=1-celebrationPoseLayer;
      const next=celebrationPoses[celebrationPoseLayer];
      next.src=src;next.classList.add('is-active');current.classList.remove('is-active');
    };
    const setBeat=(beat,text)=>{
      if(signal.aborted)return;stage.dataset.celebrationBeat=beat;setPose(beat);display(text);celebrationCaption.textContent=text;celebrationCaption.hidden=false;
      const rect=stage.getBoundingClientRect(),width=Math.min(236,innerWidth-24);
      celebrationCaption.style.width=width+'px';
      celebrationCaption.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.left+rect.width/2-width/2))-rect.left+'px';
      celebrationCaption.style.top=(rect.top>100?-88:18)+'px';
    };
    const complete=()=>{if(signal.aborted)return;finish();display('这份喜欢我收到啦。点一下我，还可以再看彩蛋。');};
    setBeat('ready','收到你的喜欢啦，送你一个小彩蛋。');
    stage.dataset.celebrationSource='full-body-keyframes';
    media.stop();media.setPaused(false);media.draw();
    if(media.reduced.matches){
      setBeat('thanks','谢谢你来做客。愿你今天，也被喜欢的事物温柔回应。');
      run.timer=setTimeout(complete,3200);return;
    }
    const words={two:'先送你一个双手比心。',one:'再送你一颗单手小爱心。',overhead:'还有一个大大的头顶比心。',thanks:'谢谢你来做客，愿你每天都有小小的惊喜。'};
    const cues=kind==='all'?[
      {at:0,beat:'ready',text:'这份喜欢，我收到啦。'},
      {at:.14,beat:'two',text:words.two},
      {at:.39,beat:'one',text:words.one},
      {at:.62,beat:'overhead',text:words.overhead},
      {at:.88,beat:'thanks',text:words.thanks}
    ]:[{at:0,beat:kind,text:words[kind]||words.thanks}];
    const duration=kind==='all'?7200:2600;let startedAt=performance.now(),pauseStarted=0;
    let previousBeat='';
    const tick=now=>{
      if(signal.aborted)return;
      if(media.paused){if(!pauseStarted)pauseStarted=now;run.frame=requestAnimationFrame(tick);return;}
      if(pauseStarted){startedAt+=now-pauseStarted;pauseStarted=0;}
      const progress=Math.min(1,(now-startedAt)/duration);
      stage.dataset.celebrationProgress=progress.toFixed(3);
      const cue=cues.findLast(item=>progress>=item.at)||cues[0];
      if(cue.beat!==previousBeat){previousBeat=cue.beat;setBeat(cue.beat,cue.text);}
      if(progress>=1){complete();return;}
      run.frame=requestAnimationFrame(tick);
    };
    run.frame=requestAnimationFrame(tick);
  }
  document.addEventListener('portfoliolike',()=>celebrate());
  window.addEventListener('pagehide',()=>{if(celebrationRun)finish();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&celebrationRun){finish();display('这份喜欢我收到啦，继续慢慢看吧。');}});
  document.addEventListener('projectclose',()=>{detailOpen=false;delete element.dataset.reading;if(window.ruanAutoGuide?.active||['departing','arriving','layout'].includes(state.phase))return;media.setPaused(false);finish();display(state.mode==='free'?'继续看吧，想聊的时候叫我。':'这个项目看完了，还想了解哪一个？');});
  renderChoices();modeUI();
  walker=new window.RuanPresenterWalker(stage,media);
  document.addEventListener('click',async e=>{
    if(e.button!==0||e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||detailOpen||document.body.dataset.destination)return;
    if(e.target.closest('button,a,input,textarea,form,label,summary,details,dialog,.presenter-dialog,.host-actor,img'))return;
    const textTarget=e.target.closest('h1,h2,h3,p');
    if(textTarget){const range=document.createRange();range.selectNodeContents(textTarget);if([...range.getClientRects()].some(r=>e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom))return;}
    if(window.getSelection()?.toString())return;
    const relocationToken=++relocation;
    const wasReading=activeReading,subject=element.dataset.subject,isResponse=state.phase==='responding';
    cancel();state.interactive=false;phase('relocating');
    const result=await walker.moveTo({x:e.clientX,y:e.clientY},{marker:true});
    if(relocationToken!==relocation||detailOpen)return;
    if(walker.moving||document.body.dataset.destination)return;
    if(!result){state.interactive=true;phase('interactive');media.play('idle');return;}
    if(wasReading&&state.mode!=='free'){if(isResponse&&topics[subject])respond(subject);else introduce(state.chapter);}
    else finish();
  });
  window.ruanPresenter={element,media,speech,walker,state,visited,cancel,introduce,finish,respond,setMode,setSound,celebrate,
    guideText(title,text){$('.presenter-topic').textContent=title;display(text);},
    async gesture(name,signal){if(signal.aborted)return;await media.play(name,{loop:false});if(signal.aborted)return;await media.waitForEnd(signal);},
    async leave(signal,travel,direction){++relocation;cancel();walker.stop();clearHighlight();state.interactive=false;phase('departing');$('.presenter-reading').hidden=true;$('.presenter-choices').hidden=true;
      const target=walker.homePoint(document.body.dataset.destination),sign=target.x>=walker.position.x?1:-1;
      await walker.moveTo({x:walker.position.x+sign*70,y:walker.position.y},{signal,kind:travel});
    },
    mount(id){state.chapter=id;phase('layout');hoverPaused=false;focusPaused=false;detailOpen=false;delete element.dataset.reading;display('');$('.presenter-topic').textContent='';$('.presenter-destinations').open=false;element.dataset.expanded='false';renderChoices();modeUI();media.draw();},
    async arrive(signal,travel,direction,initial=false,narrate=true){phase('arriving');if(!initial)await walker.moveTo(walker.homePoint(state.chapter),{signal,kind:travel});else walker.place(walker.homePoint(state.chapter));if(signal.aborted)return;
      if(!narrate){finish();return;}
      if(state.mode==='free'){const stop=stops.find(s=>s.id===state.chapter);$('.presenter-topic').textContent=stop.title;display('你慢慢看。想了解哪一部分，随时叫我。');finish();}
      else introduce(state.chapter);
    }
  };
})();
