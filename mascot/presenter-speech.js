/* One audio channel for the host; cancellation invalidates every pending callback. */
(() => {
  const base=new URL('../',document.currentScript.src);
  class PresenterSpeech {
    constructor({onEnd,onFallback,onStatus}){
      this.audio=new Audio();this.audio.preload='auto';this.enabled=false;
      this.token=0;this.active=false;this.onEnd=onEnd;this.onFallback=onFallback;this.onStatus=onStatus;
    }
    stop(){
      ++this.token;clearTimeout(this.watchdog);this.active=false;
      cancelAnimationFrame(this.cueFrame);this.entry=null;
      this.audio.onended=this.audio.onerror=this.audio.onplaying=this.audio.onwaiting=null;
      this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.onStatus('');
      this.fetchController?.abort();if(this.objectURL)URL.revokeObjectURL(this.objectURL);this.objectURL=null;this.sourceURL=null;this.ready=false;
    }
    play(entry,{paused=false,continuous=false}={}){
      if(!this.enabled||!entry){this.stop();return false;}
      const url=new URL(entry.src,base).href;
      // Natural cue changes never reset, reload or pause the audio device.
      if(this.active&&this.sourceURL===url){
        this.entry=entry;this.cueDelivered=false;
        if(!continuous&&this.ready)this.audio.currentTime=entry.cueStart||0;
        this.setPaused(paused);return true;
      }
      this.stop();this.entry=entry;this.cueDelivered=false;
      const token=this.token;this.active=true;this.held=paused;
      const fail=()=>{if(token!==this.token)return;this.stop();this.onStatus('声音暂不可用，继续看文字');this.onFallback();};
      const guard=()=>{clearTimeout(this.watchdog);if(!this.held)this.watchdog=setTimeout(fail,7000);};
      this.sourceURL=url;this.onStatus('声音准备中');guard();
      this.audio.onerror=fail;
      this.audio.onwaiting=()=>{if(token===this.token){this.onStatus('声音准备中');guard();}};
      this.audio.onplaying=()=>{if(token===this.token){clearTimeout(this.watchdog);this.onStatus('正在讲解');}};
      this.audio.onended=()=>{if(token!==this.token)return;clearTimeout(this.watchdog);cancelAnimationFrame(this.cueFrame);this.active=false;this.onStatus('');if(!this.cueDelivered){this.cueDelivered=true;this.onEnd({continuous:true});}};
      const cues=()=>{
        if(token!==this.token||!this.active)return;
        const current=this.entry;
        if(!this.held&&!this.audio.paused&&!this.cueDelivered&&current.cueEnd<current.paragraphDuration-.01&&this.audio.currentTime>=current.cueEnd){
          this.cueDelivered=true;this.onEnd({continuous:true});
        }
        if(token===this.token&&this.active)this.cueFrame=requestAnimationFrame(cues);
      };this.cueFrame=requestAnimationFrame(cues);
      this.resume=()=>{if(token!==this.token||!this.active||this.held||!this.ready)return;guard();this.audio.play().catch(()=>{if(!this.held)fail();});};
      // Buffer the small whole paragraph first. Blob URLs support accurate cue seeks even
      // on static preview servers without HTTP Range support, and cannot stall mid-word.
      this.fetchController=new AbortController();
      fetch(url,{signal:this.fetchController.signal}).then(response=>{if(!response.ok)throw Error('Narration unavailable');return response.blob();}).then(blob=>{
        if(token!==this.token)return;
        this.objectURL=URL.createObjectURL(blob);this.audio.src=this.objectURL;
        this.audio.onloadedmetadata=()=>{if(token!==this.token)return;this.ready=true;this.audio.currentTime=this.entry.cueStart||0;if(!this.held)this.resume();};
        this.audio.load();
      }).catch(error=>{if(error.name!=='AbortError')fail();});
      if(paused)this.onStatus('讲解已暂停');return true;
    }
    setPaused(value){
      if(!this.active)return;
      const changed=this.held!==value;this.held=value;
      if(value){clearTimeout(this.watchdog);this.audio.pause();this.onStatus('讲解已暂停');}
      else if(changed)this.resume();
    }
  }
  window.RuanPresenterSpeech=PresenterSpeech;
})();
