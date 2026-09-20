/* A single persistent actor. Position advances only when real gait frames advance. */
(() => {
  class PresenterWalker {
    constructor(stage,media){
      this.stage=stage;this.media=media;this.serial=0;this.moving=false;
      const viewport=document.createElement('div');viewport.className='site-viewport';
      document.querySelector('main').before(viewport);viewport.append(document.querySelector('main'),document.querySelector('.site-footer'));
      this.viewport=viewport;
      this.floor=document.createElement('div');this.floor.className='host-floor';
      this.floor.innerHTML='<span class="host-floor-hint">点空白处，我走过去陪你。</span><span class="host-step-target" hidden aria-hidden="true"></span><span class="host-move-status sr-only" role="status"></span>';
      document.body.append(this.floor,stage);stage.classList.add('host-actor');
      this.marker=this.floor.querySelector('.host-step-target');
      this.place(this.homePoint('home'));
      window.addEventListener('resize',()=>{this.stop();this.place(this.homePoint(document.body.dataset.currentPage));});
      viewport.addEventListener('scroll',()=>{if(this.position.y<this.floor.getBoundingClientRect().top+this.height()){this.stop();this.place(this.homePoint(document.body.dataset.currentPage));}},{passive:true});
      document.addEventListener('projectopen',()=>{this.stop();stage.inert=true;});
      document.addEventListener('projectclose',()=>{stage.inert=false;});
    }
    height(){return this.stage.getBoundingClientRect().height;}
    homePoint(id){
      const anchors={home:.73,about:.26,experience:.62,works:.82,contact:.45};
      return this.clamp({x:innerWidth*(anchors[id]??.7),y:innerHeight-14});
    }
    clamp(p){const half=this.stage.offsetWidth/2;return {x:Math.max(half+8,Math.min(innerWidth-half-8,p.x)),y:Math.max(this.height()+8,Math.min(innerHeight-12,p.y))};}
    place(point){this.position=this.clamp(point);this.stage.style.left=this.position.x+'px';this.stage.style.top=this.position.y+'px';}
    stop(){this.serial++;this.moving=false;this.stage.dataset.moving='false';this.marker.hidden=true;this.settle?.();this.settle=null;}
    obstacles(){
      return [...this.viewport.querySelectorAll('h1,h2,h3,p,img,article,button,a,.presenter-dialog,.about__info')]
        .filter(el=>!el.closest('[hidden]')&&el.getClientRects().length)
        .map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<this.viewport.clientHeight)
        .map(r=>({left:r.left,right:r.right,top:Math.max(0,r.top),bottom:Math.min(this.viewport.clientHeight,r.bottom)}));
    }
    clearPoint(p,obstacles){
      const half=this.stage.offsetWidth*.33,height=this.height()*.91;
      return !obstacles.some(r=>p.x+half>r.left-7&&p.x-half<r.right+7&&p.y>r.top-7&&p.y-height<r.bottom+7);
    }
    pathTo(point){
      const target=this.clamp(point),obstacles=this.obstacles();
      const clearLine=(a,b)=>{for(let i=0;i<=24;i++){const t=i/24;if(!this.clearPoint({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},obstacles))return false;}return true;};
      if(this.clearPoint(target,obstacles)&&clearLine(this.position,target))return [target];
      // The reserved strip always stays clear, even when a clicked gap is too small.
      const floorTarget=this.clamp({x:target.x,y:innerHeight-14});
      const floorStart={x:this.position.x,y:floorTarget.y};
      if(clearLine(this.position,floorStart))return [floorStart,floorTarget];
      return [];
    }
    async moveTo(point,{signal,kind,onDone,marker=false}={}){
      this.stop();const token=this.serial,path=this.pathTo(point);
      if(!path.length){this.floor.querySelector('.host-move-status').textContent='这里放不下，我在旁边等你。';return false;}
      const target=path.at(-1);let distance=0,previous=this.position;
      for(const p of path){distance+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
      if(signal?.aborted)return false;
      if(this.media.reduced.matches||distance<3){this.place(target);onDone?.();return true;}
      const gait=kind||(distance>innerWidth*.38?'run':'walk');
      const direction=target.x>=this.position.x?1:-1;
      const started=await this.media.play(gait+'-cycle',{loop:true,roaming:true,direction});
      if(token!==this.serial||signal?.aborted)return false;
      // Never translate a still poster when a motion asset fails.
      if(!started){this.floor.querySelector('.host-move-status').textContent='走路动画暂时没有加载好。';return false;}
      this.moving=true;this.stage.dataset.moving='true';this.stage.dataset.gait=gait;
      if(marker){this.marker.hidden=false;this.marker.style.left=target.x+'px';this.marker.style.top=target.y+'px';}
      const video=this.media.video,speed=(gait==='run'?1.35:.68)*this.height();
      let lastTime=video.currentTime,index=0,lastAdvance=performance.now();
      return new Promise(resolve=>{
        let raf;
        const done=ok=>{cancelAnimationFrame(raf);signal?.removeEventListener('abort',abort);if(this.settle===abort)this.settle=null;
          if(token===this.serial){this.moving=false;this.stage.dataset.moving='false';this.marker.hidden=true;}
          resolve(ok);};
        const abort=()=>done(false);this.settle=abort;signal?.addEventListener('abort',abort,{once:true});
        const tick=()=>{
          if(token!==this.serial||signal?.aborted)return done(false);
          if(this.media.reduced.matches){this.place(target);done(true);onDone?.();return;}
          if(this.media.video!==video)return done(false);
          let dt=video.currentTime-lastTime;if(dt<0)dt+=video.duration;lastTime=video.currentTime;
          if(!document.hidden&&!video.paused&&dt>0&&dt<.3){
            lastAdvance=performance.now();let budget=dt*speed;
            while(index<path.length&&budget>0){const p=path[index],dx=p.x-this.position.x,dy=p.y-this.position.y,d=Math.hypot(dx,dy);
              this.media.direction=dx>=0?1:-1;
              if(d<=budget){this.place(p);budget-=d;index++;}else{this.place({x:this.position.x+dx/d*budget,y:this.position.y+dy/d*budget});budget=0;}
            }
          }
          if(index>=path.length){done(true);onDone?.();return;}
          if(!document.hidden&&performance.now()-lastAdvance>6000)return done(false);
          if(document.hidden)lastAdvance=performance.now();
          raf=requestAnimationFrame(tick);
        };raf=requestAnimationFrame(tick);
      });
    }
  }
  window.RuanPresenterWalker=PresenterWalker;
})();
