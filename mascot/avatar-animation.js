/* Textured 2D skeletal mesh, not an animated <img>.
   Joint coordinates refer to the approved 783 × 2008 neutral-pose asset.
   Head, shoulders, elbows, hips and knees deform independently at 30 fps. */
(() => {
  const asset = new URL('assets/ruan-han-neutral.webp', document.currentScript.src);
  const texture = new Image(); texture.src = asset;
  const ready = texture.decode();
  const smooth = (a,b,v) => { const t=Math.max(0,Math.min(1,(v-a)/(b-a))); return t*t*(3-2*t); };
  const rotate = (x,y,cx,cy,a) => [cx+(x-cx)*Math.cos(a)-(y-cy)*Math.sin(a), cy+(x-cx)*Math.sin(a)+(y-cy)*Math.cos(a)];
  class AvatarAnimation {
    constructor(canvas) {
      this.canvas=canvas; canvas.avatar=this; this.pose='idle'; this.started=performance.now(); this.duration=0; this.look=0; this.targetLook=0; this.frames=0;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
      this.abort=new AbortController();
      this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.wake();}); this.observer.observe(canvas);
      this.resizeObserver=new ResizeObserver(()=>{this.resize();this.wake();}); this.resizeObserver.observe(canvas);
      this.reduced.addEventListener('change',()=>this.wake(),{signal:this.abort.signal});
      document.addEventListener('visibilitychange',()=>this.wake(),{signal:this.abort.signal});
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(this.frame);this.frame=0;this.gl=null;},{signal:this.abort.signal});
      canvas.addEventListener('webglcontextrestored',()=>{this.init();this.wake();},{signal:this.abort.signal});
      window.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();this.targetLook=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/Math.max(200,r.width)));},{passive:true,signal:this.abort.signal});
      ready.then(()=>{if(this.destroyed)return;this.init();this.wake();}).catch(()=>{canvas.dataset.error='asset';});
    }
    init() {
      const gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true}); this.gl=gl;
      if(!gl) { this.fallback=this.canvas.getContext('2d');this.canvas.dataset.renderer='canvas-fallback';return; }
      this.canvas.dataset.renderer='skeletal-webgl';
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const program=gl.createProgram();
      gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position; attribute vec2 uv; varying vec2 tex; void main(){gl_Position=vec4(position,0.,1.); tex=uv;}'));
      gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; varying vec2 tex; uniform sampler2D image; void main(){gl_FragColor=texture2D(image,tex);}'));
      gl.linkProgram(program);gl.useProgram(program);this.program=program;
      const cols=40,rows=100,uv=[],points=[],indices=[];
      // Separate sleeve/torso triangles prevent texture bridges across the armpit.
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        for(const tri of [[[x,y],[x+1,y],[x,y+1]],[[x+1,y],[x+1,y+1],[x,y+1]]]){
          const tx=tri.reduce((s,p)=>s+p[0],0)/3/cols*783,ty=tri.reduce((s,p)=>s+p[1],0)/3/rows*2008;
          const boundary=220-.095*Math.max(0,ty-450);
          const zone=ty>365&&ty<1120?(tx<boundary?'left':tx>783-boundary?'right':'body'):'body';
          for(const p of tri){indices.push(points.length);uv.push(p[0]/cols,p[1]/rows);points.push([783*p[0]/cols,2008*p[1]/rows,zone]);}
        }
      }
      this.points=points;this.vertices=new Float32Array(points.length*2);this.indexCount=indices.length;
      this.positionBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.vertices,gl.DYNAMIC_DRAW);
      const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      const uvBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,texture);
      gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      this.resize();
    }
    resize() {
      const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;
      const dpr=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
      this.gl?.viewport(0,0,this.canvas.width,this.canvas.height);
      this.last=0;
    }
    play(pose='wave',duration=2400) {
      if(this.reduced.matches)return;
      this.pose=pose;this.duration=duration;this.started=performance.now();this.canvas.dataset.motion=pose;this.wake();
    }
    wake() { if(!this.frame&&!this.destroyed&&!document.hidden&&this.visible&&(this.gl||this.fallback))this.frame=requestAnimationFrame(t=>this.tick(t)); }
    tick(now) {
      this.frame=0;if(document.hidden||!this.visible||this.destroyed)return;
      if(this.reduced.matches||!this.last||now-this.last>=32){this.last=now;this.draw(now);}
      if(!this.reduced.matches)this.wake();
    }
    draw(now) {
      const quiet=this.reduced.matches,t=quiet?0:now/1000, elapsed=now-this.started;
      if(elapsed>this.duration&&this.pose!=='idle'){this.pose='idle';this.canvas.dataset.motion='idle';}
      const env=this.pose==='idle'?0:smooth(0,420,elapsed)*(1-smooth(this.duration-450,this.duration,elapsed));
      this.look+=(this.targetLook-this.look)*.06;
      let shoulderL=.025*Math.sin(t*1.1),elbowL=.025*Math.cos(t),shoulderR=-shoulderL,elbowR=-elbowL;
      let head=quiet?0:.016*Math.sin(t*.85)+this.look*.04;
      if(this.pose==='wave'){shoulderL+=env*.6;elbowL+=env*(1.65+.16*Math.sin(t*8));head-=env*.04;}
      if(this.pose==='present'){shoulderL+=env*.32;elbowL+=env*1.05;head-=env*.035;}
      if(this.pose==='nod')head+=env*.055*Math.sin(elapsed/180);
      if(this.pose==='celebrate'){shoulderL+=env*.5;elbowL+=env*1.25;shoulderR-=env*.5;elbowR-=env*1.25;}
      const walking=this.pose==='walk'?env:0,step=Math.sin(t*8)*walking;
      shoulderL+=step*.10;shoulderR-=step*.10;
      if(quiet)shoulderL=shoulderR=elbowL=elbowR=0;
      this.joints={head,shoulderL,elbowL,shoulderR,elbowR,step};this.frames++;
      const w=this.canvas.width,h=this.canvas.height,scale=Math.min(w/1650,h/2100),cx=w/2,top=(h-2100*scale)/2;
      if(this.fallback){const c=this.fallback;c.clearRect(0,0,w,h);c.drawImage(texture,cx-391.5*scale,top+30*scale,783*scale,2008*scale);return;}
      const breathing=quiet?0:Math.sin(t*1.7)*3;
      for(let i=0;i<this.points.length;i++){
        const [x,y,zone]=this.points[i];let px=x,py=y;
        if(y<450){const weight=1-smooth(295,420,y);const p=rotate(x,y,390,335,head);px+=(p[0]-x)*weight;py+=(p[1]-y)*weight;}
        const armGate=smooth(365,515,y)*(1-smooth(1110,1160,y));
        const left=zone==='left'?armGate:0;
        const right=zone==='right'?armGate:0;
        if(left>.001||right>.001){const l=left>right,cx=l?213:576,ex=l?137:650;
          const fore=smooth(610,765,y),upper=l?shoulderL:shoulderR,lower=l?elbowL:elbowR;
          let p=rotate(x,y,ex,695,lower*fore);p=rotate(p[0],p[1],cx,430,upper);
          const weight=Math.max(left,right);px+=(p[0]-x)*weight;py+=(p[1]-y)*weight;
        }
        if(y>950&&x>155&&x<625){const weight=smooth(960,1160,y),side=x<391?-1:1;px+=side*step*15*weight;py-=Math.max(0,side*step)*36*weight;}
        const upper=1-smooth(850,1120,y);px+=Math.sin(t*.7)*2*upper*(quiet?0:1);py+=breathing*upper;
        this.vertices[i*2]=((cx+(px-391.5)*scale)/w)*2-1;this.vertices[i*2+1]=1-((top+(py+30)*scale)/h)*2;
      }
      const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.vertices);gl.drawElements(gl.TRIANGLES,this.indexCount,gl.UNSIGNED_SHORT,0);
    }
    destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.resizeObserver.disconnect();this.abort.abort();this.gl?.getExtension('WEBGL_lose_context')?.loseContext();}
  }
  window.RuanAvatarAnimation=AvatarAnimation;
  document.querySelectorAll('canvas.avatar-canvas').forEach(canvas=>new AvatarAnimation(canvas));
  document.querySelector('.contact-character')?.addEventListener('click',e=>e.currentTarget.querySelector('canvas').avatar.play('celebrate'));
  window.addEventListener('chapterchange',()=>{
    const id=document.body.dataset.currentPage;
    const canvas=document.querySelector(`#${id} canvas.avatar-canvas`);
    if(canvas)requestAnimationFrame(()=>{canvas.avatar.resize();canvas.avatar.play(id==='contact'?'celebrate':'wave');});
  });
})();
