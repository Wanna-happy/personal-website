(() => {
 const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
 const configured=window.RUAN_ADMIN_CONFIG?.endpoint?.replace(/\/$/,'');
 const endpoint=local?'http://127.0.0.1:8766':configured;
 const online=!local,sessionKey=online?'ruan-online-admin-session':'ruan-admin-session';
 let token=sessionStorage.getItem(sessionKey)||'',assetBase='';const previews=new Map();
 async function call(path,body){
  if(!endpoint)throw Error('在线后台正在部署，暂时不能登录。');
  if(online&&!endpoint.startsWith('https://'))throw Error('在线后台必须使用 HTTPS');
  let response;try{response=await fetch(endpoint+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{'X-Admin-Token':token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});}catch{throw Error(online?'网络连接中断，请重试；如刚才在保存，请重试保存以核对结果。':'管理服务未连接，请启动本机管理服务后重试');}
  let result;try{result=await response.json();}catch{throw Error('管理服务返回异常，请稍后重试');}if(!response.ok){const e=Error(result.error||'操作未完成');e.status=response.status;throw e;}if(result.assetBase)assetBase=result.assetBase;return result;
 }
 window.adminAPI={call,online,asset(path){return previews.get(path)||(online&&assetBase&&path.startsWith('assets/')?new URL(path,assetBase).href:path);},setToken(value){token=value;if(value)sessionStorage.setItem(sessionKey,value);else sessionStorage.removeItem(sessionKey);},async upload(file){if(file.size>20*1024*1024)throw Error('请选择 20 MB 以内的文件');const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const path=(await call('/upload',{base64:src.split(',')[1]})).path;if(online){if(previews.has(path))URL.revokeObjectURL(previews.get(path));previews.set(path,URL.createObjectURL(file));}return path;}};
 window.addEventListener('unload',()=>{for(const url of previews.values())URL.revokeObjectURL(url);});
})();
