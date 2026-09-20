(() => {
 const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
 const endpoint=local?'http://127.0.0.1:8766':null;
 let token=sessionStorage.getItem('ruan-admin-session')||'';
 async function call(path,body){
  if(!endpoint)throw Error('线上管理服务尚未部署，请在本机管理入口操作');
  let response;try{response=await fetch(endpoint+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{'X-Admin-Token':token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(25000)});}catch{throw Error('管理服务未连接，请启动本机管理服务后重试');}
  const result=await response.json();if(!response.ok){const e=Error(result.error||'操作未完成');e.status=response.status;throw e;}return result;
 }
 window.adminAPI={call,setToken(value){token=value;if(value)sessionStorage.setItem('ruan-admin-session',value);else sessionStorage.removeItem('ruan-admin-session');},async upload(file){if(file.size>20*1024*1024)throw Error('请选择 20 MB 以内的文件');const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});return (await call('/upload',{base64:src.split(',')[1]})).path;}};
})();
