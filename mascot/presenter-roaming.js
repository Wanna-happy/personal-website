/* One persistent actor; destinations span the viewport, with safe resting points. */
(() => {
 class PresenterWalker {
  constructor(stage,media){
   this.stage=stage;this.media=media;this.serial=0;this.moving=false;
   this.viewport=document.createElement('div');this.viewport.className='site-viewport';document.querySelector('main').before(this.viewport);this.viewport.append(document.querySelector('main'),document.querySelector('.site-footer'));
   this.floor=document.createElement('div');this.floor.className='host-floor';this.floor.innerHTML='<span class="host-floor-hint">点击页面空白处，我走过去。</span><span class="host-step-target" hidden aria-hidden="true"></span><span class="host-move-status sr-only" role="status"></span>';
   document.body.append(this.floor,stage);stage.classList.add('host-actor');this.marker=this.floor.querySelector('.host-step-target');this.place({x:innerWidth*.77,y:innerHeight*.76});
   window.addEventListener('resize',()=>{this.stop();this.place(this.nearestClear(this.clamp(this.position)));});
   this.viewport.addEventListener('scroll',()=>{clearTimeout(this.scrollTimer);this.scrollTimer=setTimeout(()=>{if(!window.ruanAutoGuide?.active&&!this.moving&&!this.media.speechClock&&!document.body.dataset.destination){const p=this.nearestClear(this.position,this.obstacles(),{keepHeight:false});if(Math.hypot(p.x-this.position.x,p.y-this.position.y)>20)this.moveTo(p,{onDone:()=>this.media.play('idle')});}},180);},{passive:true});
   document.addEventListener('projectopen',e=>{this.stop();stage.inert=!e.detail?.guided;});document.addEventListener('projectclose',()=>{stage.inert=false;});
  }
  height(){return this.stage.offsetHeight;}
  clamp(p){const half=this.stage.offsetWidth*.25;return {x:Math.max(half+6,Math.min(innerWidth-half-6,p.x)),y:Math.max(this.height()+6,Math.min(innerHeight-8,p.y))};}
  place(p){this.position=this.clamp(p);this.stage.style.left=this.position.x+'px';this.stage.style.top=this.position.y+'px';this.onPlacement?.();}
  stop(){this.serial++;this.moving=false;this.stage.dataset.moving='false';this.stage.dataset.overContent=String(!!this.position&&!this.clearPoint(this.position,this.obstacles()));this.marker.hidden=true;this.settle?.();this.settle=null;}
  obstacles(){const rects=[];for(const el of [...this.viewport.querySelectorAll('h1,h2,h3,p,img,button,a,.presenter-dialog'),...document.querySelectorAll('.guided-preview[open],.site-utilities')]){if(el.closest('[hidden]')||!el.getClientRects().length)continue;if(/^(H[123]|P)$/.test(el.tagName)){const range=document.createRange();range.selectNodeContents(el);rects.push(...range.getClientRects());}else rects.push(el.getBoundingClientRect());}return rects.filter(r=>r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));}
  clearPoint(p,obstacles){const half=this.stage.offsetWidth*.25,h=this.height()*.95;return !obstacles.some(r=>p.x+half>r.left-5&&p.x-half<r.right+5&&p.y>r.top-5&&p.y-h<r.bottom+5);}
  nearestClear(point,obstacles=this.obstacles(),{keepHeight=true}={}){
   const target=this.clamp(point);if(this.clearPoint(target,obstacles))return target;let best=null,score=Infinity;
   for(let y=this.height()+8;y<=innerHeight-8;y+=20)for(let x=this.stage.offsetWidth*.25+8;x<innerWidth-this.stage.offsetWidth*.25;x+=20){const p={x,y};if(!this.clearPoint(p,obstacles))continue;const d=(x-target.x)**2+(y-target.y)**2;if(d<score){score=d;best=p;}}
   // Dense layouts may have no complete gap. Rest at the least occupied side at the requested height.
   if(!best||(keepHeight&&Math.abs(best.y-target.y)>160)){const sides=[this.clamp({x:0,y:target.y}),this.clamp({x:innerWidth,y:target.y})],overlap=p=>obstacles.filter(r=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y-this.height()<r.bottom).length;best=sides.sort((a,b)=>overlap(a)-overlap(b)||Math.abs(a.x-target.x)-Math.abs(b.x-target.x))[0];}return best;
  }
  homePoint(){return this.nearestClear({x:innerWidth*.78,y:innerHeight*.76},this.obstacles(),{keepHeight:false});}
  clearLine(a,b,obstacles){const n=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/18));for(let i=1;i<=n;i++){const t=i/n;if(!this.clearPoint({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},obstacles))return false;}return true;}
  pathTo(point){
   const obstacles=this.obstacles(),target=this.nearestClear(point,obstacles);this.travelObstacles=obstacles;if(this.clearLine(this.position,target,obstacles))return [target];
   const routes=[];for(let y=this.height()+10;y<innerHeight-8;y+=40){const a={x:this.position.x,y},b={x:target.x,y};if(this.clearLine(this.position,a,obstacles)&&this.clearLine(a,b,obstacles)&&this.clearLine(b,target,obstacles))routes.push([a,b,target]);}
   for(let x=this.stage.offsetWidth/2+10;x<innerWidth-this.stage.offsetWidth/2;x+=40){const a={x,y:this.position.y},b={x,y:target.y};if(this.clearLine(this.position,a,obstacles)&&this.clearLine(a,b,obstacles)&&this.clearLine(b,target,obstacles))routes.push([a,b,target]);}
   const length=route=>{let p=this.position,d=0;for(const q of route){d+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}return d;};return routes.sort((a,b)=>length(a)-length(b))[0]||[target];
  }
  async moveTo(point,{signal,kind,onDone,marker=false,onProgress,obstacles,keepHeight=true}={}){
   this.stop();const token=this.serial,path=obstacles?[this.nearestClear(point,obstacles,{keepHeight})]:this.pathTo(point),target=path.at(-1);if(obstacles)this.travelObstacles=obstacles;let distance=0,previous=this.position;for(const p of path){distance+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
   if(signal?.aborted)return false;if(this.media.reduced.matches||distance<3){this.place(target);onProgress?.(1);onDone?.();return true;}
   const gait=kind||(distance>Math.min(innerWidth,innerHeight)*.6?'run':'walk'),dx=path[0].x-this.position.x,direction=Math.abs(dx)>8?(dx>0?1:-1):(this.media.direction||-1);
   const started=await this.media.play(gait+'-cycle',{loop:true,roaming:true,direction});if(token!==this.serial||signal?.aborted)return false;if(!started){this.floor.querySelector('.host-move-status').textContent='走路动画暂时没有加载好。';return false;}
   this.moving=true;this.stage.dataset.moving='true';this.stage.dataset.gait=gait;this.floor.querySelector('.host-floor-hint').hidden=true;
   if(marker){this.marker.hidden=false;this.marker.style.left=target.x+'px';this.marker.style.top=target.y+'px';}
   const video=this.media.video,speed=(gait==='run'?1.1:.82)*this.height();let lastTime=video.currentTime,index=0,lastAdvance=performance.now(),elapsed=0,traveled=0;
   return new Promise(resolve=>{let raf;const done=ok=>{cancelAnimationFrame(raf);signal?.removeEventListener('abort',abort);if(this.settle===abort)this.settle=null;if(token===this.serial){this.moving=false;this.stage.dataset.moving='false';this.stage.dataset.overContent=String(!this.clearPoint(this.position,this.obstacles()));this.marker.hidden=true;}resolve(ok);};const abort=()=>done(false);this.settle=abort;signal?.addEventListener('abort',abort,{once:true});
    const tick=()=>{if(token!==this.serial||signal?.aborted||this.media.video!==video)return done(false);if(this.media.reduced.matches){this.place(target);onProgress?.(1);done(true);onDone?.();return;}
     let dt=video.currentTime-lastTime;if(dt<0)dt+=video.duration;lastTime=video.currentTime;
     if(!document.hidden&&!video.paused&&dt>0&&dt<.3){lastAdvance=performance.now();elapsed+=dt;let budget=dt*speed*Math.min(1,.35+elapsed*3);while(index<path.length&&budget>0){const p=path[index],dx=p.x-this.position.x,dy=p.y-this.position.y,d=Math.hypot(dx,dy);if(Math.abs(dx)>8)this.media.direction=dx>0?1:-1;traveled+=Math.min(d,budget);if(d<=budget){this.place(p);budget-=d;index++;}else{this.place({x:this.position.x+dx/d*budget,y:this.position.y+dy/d*budget});budget=0;}}onProgress?.(Math.min(1,traveled/distance));this.stage.dataset.overContent=String(!this.clearPoint(this.position,onProgress?this.obstacles():this.travelObstacles));}
     if(index>=path.length){done(true);onDone?.();return;}if(!document.hidden&&performance.now()-lastAdvance>6000)return done(false);if(document.hidden)lastAdvance=performance.now();raf=requestAnimationFrame(tick);
    };raf=requestAnimationFrame(tick);
   });
  }
 }
 window.RuanPresenterWalker=PresenterWalker;
})();
