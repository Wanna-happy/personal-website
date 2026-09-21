import {createHash} from 'node:crypto';
import {APIError} from './validation.mjs';

export class PostgresStorage {
 constructor(env,fetcher=fetch){
  if(!/^[a-zA-Z0-9-]+$/.test(env.CLOUDBASE_ENV_ID||'')||!env.CLOUDBASE_APIKEY)throw Error('Missing database configuration');
  this.url=`https://${env.CLOUDBASE_ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/rpc/portfolio_admin_state_rpc`;
  this.key=env.CLOUDBASE_APIKEY;this.fetcher=fetcher;
 }
 async rpc(operation,parameters={}){
  const response=await this.fetcher(this.url,{method:'POST',headers:{Authorization:'Bearer '+this.key,'Content-Type':'application/json'},body:JSON.stringify({operation,...parameters}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Private database request failed ('+response.status+')');
  return response.json();
 }
 id(key){return createHash('sha256').update(key).digest('hex');}
 async get(key){return (await this.rpc('get',{record_key:this.id(key)}))??undefined;}
 async put(key,value){await this.rpc('put',{record_key:this.id(key),record_value:value,record_expires:value?.expires||Date.now()+86400000});}
 async delete(key){await this.rpc('delete',{record_key:this.id(key)});}
 async reserveAttempt(){const ticket=await this.rpc('reserve');if(ticket===false)throw new APIError(429,'连续输错次数过多，请 15 分钟后再试');if(!Number.isSafeInteger(ticket))throw Error('Invalid database response');return ticket;}
 async clearAttemptsBefore(ticket){await this.rpc('clear',{before_time:ticket});}
 async cleanup(){await this.rpc('cleanup');}
 async ready(){if(await this.rpc('ready')!==true)throw Error('Database unavailable');}
 async setAlarm(){}
}
