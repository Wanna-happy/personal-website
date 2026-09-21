import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {pathToFileURL} from 'node:url';
import app,{AdminState} from './app.mjs';
import {PostgresStorage} from './postgres-storage.mjs';

export function createAdminServer(env,state,{ready=async()=>true}={}){
 let active=0;
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/healthz'&&req.method==='GET'){
   try{await ready();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}');}
   catch{res.writeHead(503,{'Content-Type':'application/json'});res.end('{"ok":false}');}return;
  }
  if(active>=4){res.writeHead(503,{'Retry-After':'3','Connection':'close'});res.end();return;}
  active++;
  try{
   const headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value)headers.set(name,Array.isArray(value)?value.join(','):value);
   const request=new Request('http://localhost'+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
   const response=await app.fetch(request,env,state);
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"管理服务暂不可用"}');}
  finally{active--;}
 });
}

export function validateEnvironment(env){
 for(const key of ['CLOUDBASE_ENV_ID','CLOUDBASE_APIKEY','ADMIN_PASSWORD_HASH','GITHUB_TOKEN','ALLOWED_ORIGINS','GITHUB_OWNER','GITHUB_REPO'])if(!env[key])throw Error('Missing server configuration: '+key);
 const verifier=JSON.parse(env.ADMIN_PASSWORD_HASH);
 if(!/^[a-f0-9]{64}$/.test(verifier.salt)||!/^[a-f0-9]{64}$/.test(verifier.hash)||!Number.isInteger(verifier.iterations)||verifier.iterations<100000||verifier.iterations>1000000)throw Error('Invalid password verifier');
 for(const origin of env.ALLOWED_ORIGINS.split(',').map(v=>v.trim())){const url=new URL(origin);if(url.origin!==origin||url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Invalid allowed origin');}
}

async function main(){
 const env=process.env;validateEnvironment(env);
 const storage=new PostgresStorage(env);await storage.ready();
 const state=new AdminState({storage},env),server=createAdminServer(env,state,{ready:()=>storage.ready()});
 server.requestTimeout=90000;server.headersTimeout=15000;
 const cleanup=setInterval(()=>storage.cleanup().catch(()=>console.error('Expired-state cleanup failed')),300000);cleanup.unref();
 server.listen(Number(env.PORT||8080),'0.0.0.0',()=>console.log('Portfolio admin listening on port '+(env.PORT||8080)));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearInterval(cleanup);server.close();setTimeout(()=>process.exit(0),10000).unref();});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Admin startup failed. Check server configuration and database permissions.');process.exitCode=1;});
