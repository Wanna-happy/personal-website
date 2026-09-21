/* User-supplied real motion. Canvas removes green and positions the complete figure. */
window.RUAN_PRESENTER_MEDIA={
  poster:'mascot/assets/motion/neutral.webp',
  clips:{
    // The short generated idle loop changed pose every second; use a stable rest pose.
    idle:null,
    nod:{src:'mascot/assets/actions/nod.mp4',background:'green',loop:false},
    look:{src:'mascot/assets/actions/look.mp4',background:'green',loop:false},
    invite:{src:'mascot/assets/actions/invite.mp4',background:'green',loop:false},
    show:{src:'mascot/assets/actions/show.mp4',background:'green',loop:false},
    goodbye:{src:'mascot/assets/actions/goodbye.mp4',background:'green',loop:false},
    welcome:{src:'mascot/assets/motion/welcome-original.mp4',background:'green',loop:false},
    present:{src:'mascot/assets/motion/explain-original.mp4',background:'green',loop:false},
    'walk-cycle':{src:'mascot/assets/motion/walk-smooth.mp4',background:'green',loop:true},
    'run-cycle':{src:'mascot/assets/motion/run-clean.mp4',background:'green',loop:true},
    explain:[
      {src:'mascot/assets/motion/present-open.mp4',background:'green',loop:false},
      {src:'mascot/assets/motion/acknowledge.mp4',background:'green',loop:false}
    ],
    acknowledge:{src:'mascot/assets/motion/acknowledge.mp4',background:'green',loop:false},
    walk:{src:'mascot/assets/motion/walk-depart.mp4',arrival:'mascot/assets/motion/walk-arrive.mp4',background:'green',loop:false,departMoveAt:.57,arriveStopAt:.6},
    run:{src:'mascot/assets/motion/run-depart.mp4',arrival:'mascot/assets/motion/walk-arrive.mp4',background:'green',loop:false,departMoveAt:.30,arriveStopAt:.6}
  }
};
(() => {
  const base=new URL('../',document.currentScript.src);
  class PresenterMedia {
    constructor(canvas){
      this.canvas=canvas;this.context=canvas.getContext('2d',{willReadFrequently:true});this.poster=new Image();
      this.systemReduced=matchMedia('(prefers-reduced-motion: reduce)');
      const self=this;this.reduced={get matches(){return !!self.userReduced||self.systemReduced.matches;}};
      this.token=0;this.visible=true;this.lastVariant={};this.paused=false;
      this.poster.src=new URL(window.RUAN_PRESENTER_MEDIA.poster,base);
      this.poster.decode().then(()=>{this.loaded=true;this.draw();}).catch(()=>{canvas.dataset.media='error';});
      this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(canvas);
      this.visibility=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;this.sync();});this.visibility.observe(canvas);
      document.addEventListener('visibilitychange',()=>this.sync());
      this.systemReduced.addEventListener('change',()=>{if(!this.reduced.matches&&!this.video)this.play('idle');else this.sync();});
    }
    configs(pose){const c=window.RUAN_PRESENTER_MEDIA.clips[pose];return(Array.isArray(c)?c:[c]).filter(item=>item?.src);}
    available(pose){return this.configs(pose).length>0;}
    rest(){
      // Let a short natural gesture finish instead of cutting an arm mid-movement.
      if(this.video&&!this.video.loop&&!this.video.ended&&!this.travel&&!this.reduced.matches)return;
      this.play('idle');
    }
    setReduced(value){const was=this.reduced.matches;this.userReduced=value;if(was&&!this.reduced.matches&&!this.video)this.play('idle');else this.sync();}
    setPaused(value){this.paused=value;this.sync();}
    async play(pose,{loop,segment,direction=-1,roaming=false,hold=false,narration,settle=true,blend=true}={}){
      // Repeated clicks update the text without repeatedly restarting the same gesture.
      if(roaming&&!segment&&pose===this.pose&&this.video&&!this.video.ended&&this.canvas.dataset.media==='video'){this.direction=direction;this.paused=false;this.sync();return true;}
      const token=++this.token;
      if(this.canvas.width&&this.canvas.height){this.previous=document.createElement('canvas');this.previous.width=this.canvas.width;this.previous.height=this.canvas.height;this.previous.getContext('2d').drawImage(this.canvas,0,0);}
      this.stop();this.paused=hold;this.pose=pose;this.canvas.dataset.requestedMotion=pose;
      this.segment=segment;this.direction=direction;this.travel=!!segment;this.roaming=roaming;this.blendAt=0;
      const fallback={welcome:'present',explain:'present'};
      const synced=window.RUAN_LIPSYNC?.items[narration];this.lipSynced=!!synced;
      let variants=synced?[{src:synced.src,background:'green',loop:false}]:this.configs(pose);if(!variants.length&&fallback[pose])variants=this.configs(fallback[pose]);
      const index=((this.lastVariant[pose]??-1)+1)%Math.max(1,variants.length);
      this.lastVariant[pose]=index;const config=variants[index];this.currentConfig=config;
      this.canvas.dataset.media='loading';
      if(!config||this.reduced.matches){
        this.canvas.dataset.media='poster';
        if(this.previous&&this.loaded&&!this.reduced.matches){
          this.blendAt=performance.now();
          const settle=()=>{
            if(token!==this.token)return;
            if(performance.now()-this.blendAt>=120){this.previous=null;this.raf=0;this.draw();return;}
            this.draw();this.raf=requestAnimationFrame(settle);
          };settle();
        }else{this.previous=null;this.draw();}
        return false;
      }
      const video=document.createElement('video');video.muted=true;video.playsInline=true;video.loop=loop??config.loop??false;video.preload='auto';
      this.video=video;this.keyGreen=config.background==='green';const sourceURL=new URL(segment==='arrive'&&config.arrival?config.arrival:config.src,base);
      let timeout;
      try{
        if(synced){
          this.videoFetch=new AbortController();timeout=setTimeout(()=>this.videoFetch?.abort(),8000);
          const response=await fetch(sourceURL,{signal:this.videoFetch.signal});if(!response.ok)throw Error('Motion unavailable');
          const blob=await response.blob();if(token!==this.token)return false;
          this.videoURL=URL.createObjectURL(blob);video.src=this.videoURL;clearTimeout(timeout);
        }else video.src=sourceURL;
        await Promise.race([video.play(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Motion load timeout')),3000);})]);
        if(token!==this.token){video.pause();return false;}
        this.canvas.dataset.media='video';this.blendAt=performance.now();if(roaming||!blend)this.previous=null;
        if(settle&&!video.loop&&!this.travel)video.addEventListener('ended',()=>{if(token===this.token&&!this.speechClock)this.play('idle');},{once:true});
        this.sync();return true;
      }catch{
        if(token===this.token){this.stop();this.previous=null;this.canvas.dataset.media='poster';this.draw();}
        return false;
      }finally{clearTimeout(timeout);}
    }
    waitForEnd(signal){
      const video=this.video;
      if(!video||video.ended||signal.aborted||document.hidden||!this.visible||this.reduced.matches)return Promise.resolve();
      return new Promise(resolve=>{
        let timeout;
        const done=()=>{clearTimeout(timeout);if(this.endTravel===done)this.endTravel=null;video.removeEventListener('ended',done);video.removeEventListener('error',done);signal.removeEventListener('abort',done);document.removeEventListener('visibilitychange',visibility);this.systemReduced.removeEventListener('change',reduction);resolve();};
        const visibility=()=>{if(document.hidden)done();};
        const reduction=()=>{if(this.reduced.matches)done();};
        video.addEventListener('ended',done,{once:true});video.addEventListener('error',done,{once:true});signal.addEventListener('abort',done,{once:true});document.addEventListener('visibilitychange',visibility);this.systemReduced.addEventListener('change',reduction);
        this.endTravel=done;
        timeout=setTimeout(done,Math.min(9000,(video.duration-video.currentTime)*1000+2200)||5000);
      });
    }
    stop(){
      this.unfollowSpeech();
      this.videoFetch?.abort();this.videoFetch=null;
      if(this.video){this.video.pause();if(this.frame)this.video.cancelVideoFrameCallback?.(this.frame);this.video.removeAttribute('src');this.video.load();this.video=null;}
      if(this.videoURL)URL.revokeObjectURL(this.videoURL);this.videoURL=null;
      cancelAnimationFrame(this.raf);this.frame=0;this.raf=0;
    }
    sync(){
      const video=this.video;
      if(this.speechClock){this.syncSpeech();return;}
      if(document.hidden||!this.visible||this.reduced.matches||this.paused){video?.pause();this.draw();if(this.travel&&(document.hidden||!this.visible||this.reduced.matches))this.endTravel?.();return;}
      if(!video){this.draw();return;}
      video.play().then(()=>{if(this.video===video&&!this.frame&&!this.raf)this.tick();}).catch(()=>this.draw());
    }
    unfollowSpeech(){if(this.speechClock){const {audio,listener}=this.speechClock;for(const event of ['playing','pause','waiting','seeking','ended'])audio.removeEventListener(event,listener);this.speechClock=null;}cancelAnimationFrame(this.speechRaf);this.speechRaf=0;}
    followSpeech(audio,offset,total){
      this.unfollowSpeech();if(!this.video||this.reduced.matches)return;
      const listener=()=>this.syncSpeech();this.speechClock={audio,offset,total,listener,rate:this.lipSynced?1:Math.min(1.15,this.video.duration/total)};
      for(const event of ['playing','pause','waiting','seeking','ended'])audio.addEventListener(event,listener);
      this.video.playbackRate=this.speechClock.rate;this.syncSpeech();
      const tick=()=>{if(!this.speechClock)return;this.syncSpeech();this.speechRaf=requestAnimationFrame(tick);};this.speechRaf=requestAnimationFrame(tick);
    }
    syncSpeech(){
      const clock=this.speechClock,video=this.video;if(!clock||!video)return;
      const target=Math.min(video.duration-.025,(clock.offset+clock.audio.currentTime)*clock.rate);
      if(Math.abs(video.currentTime-target)>.12&&!video.seeking)video.currentTime=Math.max(0,target);
      const paused=this.paused||clock.audio.paused||clock.audio.readyState<3||document.hidden||!this.visible||this.reduced.matches;
      if(paused){video.pause();this.draw();}else if(video.paused){video.play().then(()=>{if(this.video===video&&!this.frame&&!this.raf)this.tick();}).catch(()=>{});}
    }
    tick(){
      this.frame=0;this.raf=0;
      const video=this.video;if(!video||video.paused||document.hidden||!this.visible||this.reduced.matches)return;
      this.draw();
      if(video.requestVideoFrameCallback)this.frame=video.requestVideoFrameCallback(()=>this.tick());
      else this.raf=requestAnimationFrame(()=>this.tick());
    }
    draw(){
      if(!this.loaded)return;
      const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
      const dpr=Math.min(1.5,devicePixelRatio||1),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
      const c=this.context;
      if(this.canvas.dataset.media==='loading'&&this.previous){c.clearRect(0,0,w,h);c.drawImage(this.previous,0,0,w,h);return;}
      c.clearRect(0,0,w,h);
      const source=this.video?.readyState>=2&&!this.reduced.matches?this.video:this.poster;
      const sw=source.videoWidth||source.naturalWidth,sh=source.videoHeight||source.naturalHeight;
      if(!sw||!sh)return;
      const scale=Math.min(w/sw,h/sh)*.99;
      let offset=0,opacity=1;
      if(source===this.video&&this.travel){
        const p=Math.max(0,Math.min(1,this.video.currentTime/this.video.duration)),config=this.currentConfig;
        if(this.segment==='depart'){
          const t=Math.max(0,(p-config.departMoveAt)/(1-config.departMoveAt));const eased=t*t*(3-2*t);offset=this.direction*w*.9*eased;opacity=1-Math.max(0,(t-.85)/.15);
        }else{
          const t=Math.min(1,p/config.arriveStopAt);const eased=t*t*(3-2*t);offset=-this.direction*w*.9*(1-eased);opacity=Math.min(1,p/.13);
        }
      }
      c.save();c.globalAlpha=opacity;
      if((this.travel||this.roaming)&&this.direction===1){c.translate(w,0);c.scale(-1,1);offset=-offset;}
      c.drawImage(source,(w-sw*scale)/2+offset,h-sh*scale,sw*scale,sh*scale);c.restore();
      if(source===this.video&&this.keyGreen){
        const frame=c.getImageData(0,0,w,h),p=frame.data;
        for(let i=0;i<p.length;i+=4){const neutral=Math.max(p[i],p[i+2]),green=p[i+1]-neutral;if(green>20){p[i+3]*=1-Math.max(0,Math.min(1,(green-20)/90));p[i+1]=Math.min(p[i+1],neutral+8);}}
        c.putImageData(frame,0,0);
      }
      if(this.previous&&this.blendAt&&!this.reduced.matches){
        const fraction=(performance.now()-this.blendAt)/100;
        if(fraction<1){c.save();c.globalAlpha=1-fraction;c.drawImage(this.previous,0,0,w,h);c.restore();}
        else this.previous=null;
      }
    }
  }
  window.RuanPresenterMedia=PresenterMedia;
})();
