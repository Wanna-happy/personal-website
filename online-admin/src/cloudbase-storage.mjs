import {createHash} from 'node:crypto';
import {APIError} from './validation.mjs';

// No session, rate limit or upload record depends on a container's local disk.
export class CloudBaseStorage {
 constructor(db,collection='portfolio_admin_state'){this.db=db;this.collection=collection;}
 id(key){return createHash('sha256').update(key).digest('hex');}
 doc(key,db=this.db){return db.collection(this.collection).doc(this.id(key));}
 checked(result){if(result?.code)throw Error('Cloud database request failed');return result;}
 record(result){const data=this.checked(result).data;return Array.isArray(data)?data[0]:data;}
 async get(key){const record=this.record(await this.doc(key).get());return record&&record.expires>Date.now()?record.value:undefined;}
 recordFor(key,value){return {key,value,expires:value?.expires||Date.now()+(key==='attempts'?900000:86400000)};}
 async put(key,value){this.checked(await this.doc(key).set(this.recordFor(key,value)));}
 async delete(key){this.checked(await this.doc(key).remove());}
 async reserveAttempt(now){
  await this.db.runTransaction(async transaction=>{
   const doc=this.doc('attempts',transaction),record=this.record(await doc.get());
   const attempts=(record?.value||[]).filter(t=>now-t<900000);
   if(attempts.length>=5)throw new APIError(429,'连续输错次数过多，请 15 分钟后再试');
   this.checked(await doc.set({key:'attempts',value:[...attempts,now],expires:now+900000}));
  },8);
 }
 async clearAttemptsBefore(now){
  await this.db.runTransaction(async transaction=>{
   const doc=this.doc('attempts',transaction),record=this.record(await doc.get());
   const remaining=(record?.value||[]).filter(t=>t>now);
   this.checked(await doc.set({key:'attempts',value:remaining,expires:Date.now()+900000}));
  },8);
 }
 // Expiry is enforced on every read. A small periodic sweep removes expired rows.
 async setAlarm(){}
 async cleanup(){
  const result=this.checked(await this.db.collection(this.collection).where({expires:this.db.command.lt(Date.now())}).limit(50).get());
  for(const row of result.data||[])await this.delete(row.key);
 }
 async ready(){this.checked(await this.db.collection(this.collection).limit(1).get());}
}
