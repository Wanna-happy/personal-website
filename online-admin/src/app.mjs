import {APIError,validateContent,sniff} from './validation.mjs';
import {GitHubStore} from './github.mjs';
const encoder=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
const unhex=text=>Uint8Array.from(text.match(/.{2}/g)||[],v=>parseInt(v,16));
const digest=async text=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
function configured(env){return !!(env.ADMIN_PASSWORD_HASH&&env.GITHUB_TOKEN);}
async function body(request,limit){
 if(Number(request.headers.get('Content-Length'))>limit)throw new APIError(413,'文件过大');
 const reader=request.body?.getReader();if(!reader)throw new APIError(400,'请求内容为空');const chunks=[];let length=0;
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new APIError(413,'文件过大');}chunks.push(value);}
 const bytes=new Uint8Array(length);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new APIError(400,'请求格式不正确');}
}
export default {
 async fetch(request,env,state){
  const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
  if(!origin||!allowed.includes(origin))return json({error:'该来源未获授权'},403);
  const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Admin-Token','Access-Control-Max-Age':'600','X-Content-Type-Options':'nosniff'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  let response;
  try{response=await state.fetch(request);}catch{response=json({error:'管理服务暂不可用，请稍后重试'},503);}
  const headers=new Headers(response.headers);for(const [k,v] of Object.entries(cors))headers.set(k,v);
  return new Response(response.body,{status:response.status,headers});
 }
};
export class AdminState {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.store=ctx.storage;this.tail=Promise.resolve();this.github=new GitHubStore(env);}
 async serial(task){const old=this.tail;let release;this.tail=new Promise(r=>release=r);await old;try{return await task();}finally{release();}}
 async passwordVersion(){return digest(this.env.ADMIN_PASSWORD_HASH||'');}
 async session(request){const token=request.headers.get('X-Admin-Token')||'';if(token.length!==64)throw new APIError(401,'请先登录管理后台');const key='session:'+await digest(token),session=await this.store.get(key);if(!session||session.expires<Date.now()||session.version!==await this.passwordVersion())throw new APIError(401,'登录已过期，请重新登录');return key;}
 async login(password){
  return this.serial(async()=>{
   if(!configured(this.env))throw new APIError(503,'在线后台尚未完成配置，请联系网站维护者');
   if(typeof password!=='string'||password.length>256)throw new APIError(400,'密码格式不正确');
   const now=Date.now();
   // CloudBase reserves attempts in a database transaction across all instances.
   let attemptTicket=now;
   if(this.store.reserveAttempt)attemptTicket=(await this.store.reserveAttempt(now))??now;
   else {const attempts=(await this.store.get('attempts')||[]).filter(t=>now-t<900000);
    if(attempts.length>=5)throw new APIError(429,'连续输错次数过多，请 15 分钟后再试');
    await this.store.put('attempts',[...attempts,now]);}
   const verifier=JSON.parse(this.env.ADMIN_PASSWORD_HASH);
   const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
   const result=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(verifier.salt),iterations:verifier.iterations,hash:'SHA-256'},key,256));
   const expected=unhex(verifier.hash);let diff=result.length^expected.length;for(let i=0;i<result.length;i++)diff|=result[i]^(expected[i]||0);
   if(diff)throw new APIError(401,'密码不正确');
   if(this.store.clearAttemptsBefore)await this.store.clearAttemptsBefore(attemptTicket);else await this.store.delete('attempts');
   const token=hex(crypto.getRandomValues(new Uint8Array(32)));
   await this.store.put('session:'+await digest(token),{expires:now+3600000,version:await this.passwordVersion()});
   await this.store.setAlarm(now+3600000);return {token};
  });
 }
 async alarm(){for(const prefix of ['session:','upload:','operation:']){const rows=await this.store.list({prefix});for(const [key,value] of rows)if(value.expires<Date.now())await this.store.delete(key);}if((await this.store.list({limit:1})).size)await this.store.setAlarm(Date.now()+3600000);}
 async fetch(request){
  try{
   const url=new URL(request.url),path=url.pathname;
   if(request.method==='GET'&&path==='/status')return json({configured:configured(this.env),mode:'online'});
   if(request.method==='GET'&&path==='/likes'){
    const visitor=url.searchParams.get('visitor')||'';
    const count=Math.max(0,Number((await this.store.get('likes:count'))?.count)||0);
    const liked=/^[a-zA-Z0-9-]{16,100}$/.test(visitor)&&!!(await this.store.get('likes:visitor:'+await digest(visitor)));
    return json({count,liked});
   }
   if(request.method==='POST'&&path==='/likes'){
    const data=await body(request,4096),visitor=typeof data.visitorId==='string'?data.visitorId:'';
    if(!/^[a-zA-Z0-9-]{16,100}$/.test(visitor))throw new APIError(400,'点赞标识不正确');
    return json(await this.serial(async()=>{
     const now=Date.now(),expires=now+315360000000,key='likes:visitor:'+await digest(visitor);
     const current=Math.max(0,Number((await this.store.get('likes:count'))?.count)||0);
     if(await this.store.get(key))return {count:current,liked:true,accepted:false};
     const count=current+1;
     await this.store.put(key,{likedAt:now,expires});
     await this.store.put('likes:count',{count,expires});
     return {count,liked:true,accepted:true};
    }));
   }
   if(request.method==='POST'&&path==='/login'){const data=await body(request,4096);return json(await this.login(data.password));}
   if(!configured(this.env))throw new APIError(503,'在线后台尚未完成配置');
   const sessionKey=await this.session(request);
   if(request.method==='POST'&&path==='/logout'){await this.store.delete(sessionKey);return json({ok:true});}
   if(request.method==='GET'&&path==='/session')return json({...await this.github.load(),mode:'online'});
   if(request.method==='GET'&&path==='/publication'){const revision=url.searchParams.get('revision');if(!/^[a-f0-9]{40}$/.test(revision||''))throw new APIError(400,'发布版本不正确');return json(await this.github.publication(revision));}
   if(request.method==='POST'&&path==='/upload'){
    const data=await body(request,28*1024*1024);if(typeof data.base64!=='string'||data.base64.length>28*1024*1024)throw new APIError(400,'上传格式不正确');
    let bytes;try{bytes=Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0));}catch{throw new APIError(400,'文件编码不正确');}
    if(bytes.length>20*1024*1024)throw new APIError(413,'单个文件不能超过 20 MB');
    const ext=sniff(bytes),path='assets/uploads/'+hex(await crypto.subtle.digest('SHA-256',bytes))+'.'+ext;
    const sha=await this.github.blob(data.base64);
    await this.store.put('upload:'+path,{sha,expires:Date.now()+86400000});await this.store.setAlarm(Date.now()+3600000);return json({path});
   }
   if(request.method==='POST'&&path==='/save'){
    const data=await body(request,1500000),content=validateContent(data.content);
    if(!/^[a-f0-9]{40}$/.test(data.revision||'')||!/^[a-zA-Z0-9-]{16,100}$/.test(data.operationId||''))throw new APIError(400,'保存版本或操作编号不正确');
    return json(await this.serial(async()=>{
     await this.session(request);
     const fingerprint=await digest(JSON.stringify({content,revision:data.revision})),key='operation:'+data.operationId,prior=await this.store.get(key);
     if(prior){if(prior.fingerprint!==fingerprint)throw new APIError(409,'操作编号已用于另一份内容');return prior.result;}
     const result=await this.github.save(content,data.revision,async path=>{const p=await this.store.get('upload:'+path);return p?.expires>Date.now()?p:null;},data.operationId,fingerprint);
     await this.store.put(key,{result,fingerprint,expires:Date.now()+86400000});return result;
    }));
   }
   return json({error:'没有这个接口'},404);
  }catch(error){return json({error:error instanceof APIError?error.message:'操作暂未完成，请稍后重试'},error instanceof APIError?error.status:500);}
 }
}
