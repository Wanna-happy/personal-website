import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {once} from 'node:events';
import {CloudBaseStorage} from '../src/cloudbase-storage.mjs';
import {AdminState} from '../src/app.mjs';
import {createAdminServer,validateEnvironment} from '../src/server.mjs';

// Implements the SDK's document and transactional response shapes, never contacts a cloud account.
class TestDatabase {
 constructor(){this.rows=new Map();this.tail=Promise.resolve();this.command={lt:value=>value};}
 collection(name,transaction=false){const rows=this.rows;return {
  doc(id){const key=name+':'+id;return {
   async get(){const row=structuredClone(rows.get(key));return {data:transaction?(row||null):row?[row]:[]};},
   async set(data){rows.set(key,{...structuredClone(data),_id:id});return {updated:1};},
   async remove(){rows.delete(key);return {deleted:1};}
  };},
  where(query){return {limit(n){return {async get(){return {data:[...rows.values()].filter(row=>row.expires<query.expires).slice(0,n)};}};}};},
  limit(n){return {async get(){return {data:[...rows.values()].slice(0,n)};}};}
 };}
 async runTransaction(task){const before=this.tail;let release;this.tail=new Promise(r=>release=r);await before;try{return await task({collection:name=>this.collection(name,true)});}finally{release();}}
}
const password=randomBytes(20).toString('hex'),salt=randomBytes(32),iterations=600000;
const env={CLOUDBASE_ENV_ID:'test-env',ADMIN_PASSWORD_HASH:JSON.stringify({salt:salt.toString('hex'),iterations,hash:pbkdf2Sync(password,salt,iterations,32,'sha256').toString('hex')}),GITHUB_TOKEN:'test-only',ALLOWED_ORIGINS:'https://wanna-happy.github.io',GITHUB_OWNER:'Wanna-happy',GITHUB_REPO:'personal-website'};
const loginRequest=()=>new Request('https://test/login',{method:'POST',body:JSON.stringify({password:'wrong'})});

test('cloud database persists records across instances and expires on read',async()=>{
 const db=new TestDatabase(),one=new CloudBaseStorage(db),two=new CloudBaseStorage(db);
 await one.put('session:test',{expires:Date.now()+10000,version:'v'});
 assert.equal((await two.get('session:test')).version,'v');
 await one.put('session:expired',{expires:Date.now()-1});assert.equal(await two.get('session:expired'),undefined);
 await two.cleanup();assert.equal(db.rows.size,1);
 await two.delete('session:test');assert.equal(await one.get('session:test'),undefined);
});
test('parallel login attempts across cloud instances cannot bypass five-attempt limit',async()=>{
 const db=new TestDatabase(),states=Array.from({length:8},()=>new AdminState({storage:new CloudBaseStorage(db)},env));
 const responses=await Promise.all(states.map(s=>s.fetch(loginRequest())));
 assert.equal(responses.filter(r=>r.status===401).length,5);assert.equal(responses.filter(r=>r.status===429).length,3);
 const restarted=new AdminState({storage:new CloudBaseStorage(db)},env);assert.equal((await restarted.fetch(loginRequest())).status,429);
});
test('database errors fail closed rather than pretending that a session is saved',async()=>{
 const db={collection:()=>({doc:()=>({get:async()=>({code:'DENIED'}),set:async()=>({code:'DENIED'})})})};
 const store=new CloudBaseStorage(db);await assert.rejects(()=>store.get('session:x'));await assert.rejects(()=>store.put('session:x',{expires:Date.now()+10000}));
});
test('Tencent HTTP container supports CORS, real password derivation, restart and logout',async()=>{
 const db=new TestDatabase(),store=new CloudBaseStorage(db);let state=new AdminState({storage:store},env);
 const server=createAdminServer(env,{fetch:r=>state.fetch(r)},{ready:()=>store.ready()});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 const call=(path,data,token,origin=env.ALLOWED_ORIGINS)=>fetch(base+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(token?{'X-Admin-Token':token}:{})},...(data?{body:JSON.stringify(data)}:{})});
 try{
  assert.equal((await fetch(base+'/healthz')).status,200);
  assert.equal((await call('/status',undefined,undefined,'https://evil.test')).status,403);
  const preflight=await fetch(base+'/save',{method:'OPTIONS',headers:{Origin:env.ALLOWED_ORIGINS}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGINS);
  assert.equal((await call('/upload',{})).status,401);
  const response=await call('/login',{password});assert.equal(response.status,200);const {token}=await response.json();assert.equal(token.length,64);
  state=new AdminState({storage:new CloudBaseStorage(db)},env);
  // Authenticated validation (400) proves that the session survived the instance restart.
  assert.equal((await call('/save',{},token)).status,400);
  assert.equal((await call('/logout',{},token)).status,200);
  assert.equal((await call('/save',{},token)).status,401);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('production startup refuses missing secrets and invalid origins',()=>{
 const production={...env,CLOUDBASE_APIKEY:'test-key'};
 validateEnvironment(production);assert.throws(()=>validateEnvironment({...production,GITHUB_TOKEN:''}));assert.throws(()=>validateEnvironment({...production,ALLOWED_ORIGINS:'http://public.test'}));assert.throws(()=>validateEnvironment({...production,ADMIN_PASSWORD_HASH:'{}'}));
});
