import {APIError,contentAssets} from './validation.mjs';
export class GitHubStore {
 constructor(env,fetcher=fetch){this.env=env;this.fetcher=fetcher;this.base=`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;this.branch=env.GITHUB_BRANCH||'main';}
 async request(path,method='GET',body){
  const response=await this.fetcher(this.base+path,{method,signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${this.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','User-Agent':'Ruan-Portfolio-Admin','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok){if(response.status===409||response.status===422)throw new APIError(409,'网站已被其他操作更新，请备份当前草稿后重新加载');throw new APIError(502,'仓库服务暂不可用，请检查后台仓库权限或稍后重试');}
  return response.json();
 }
 async head(){return (await this.request('/git/ref/heads/'+encodeURIComponent(this.branch))).object.sha;}
 async load(){const revision=await this.head();const file=await this.request('/contents/content.json?ref='+revision);const content=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));return {content,revision,assetBase:`https://raw.githubusercontent.com/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}/${revision}/`};}
 async blob(base64){return (await this.request('/git/blobs','POST',{content:base64,encoding:'base64'})).sha;}
 async save(content,revision,pending,operationId,fingerprint){
  const head=await this.head();
  if(head!==revision){
   const last=await this.request('/git/commits/'+head);
   if(last.parents?.some(p=>p.sha===revision)&&last.message?.endsWith('Operation: '+operationId+'\nContent: '+fingerprint))return {revision:head,commitUrl:`https://github.com/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}/commit/${head}`,publishing:true};
   throw new APIError(409,'网站已有更新，请导出草稿后刷新，避免覆盖');
  }
  const commit=await this.request('/git/commits/'+head);
  const tree=await this.request('/git/trees/'+commit.tree.sha+'?recursive=1');
  if(tree.truncated)throw new APIError(409,'仓库文件过多，请先整理附件');
  const existing=new Set(tree.tree.filter(e=>e.type==='blob').map(e=>e.path));
  const entries=[];
  for(const path of contentAssets(content)){
   if(existing.has(path))continue;
   const upload=await pending(path);if(!upload)throw new APIError(400,'附件尚未上传或已过期，请重新选择文件');
   entries.push({path,mode:'100644',type:'blob',sha:upload.sha});
  }
  const json=JSON.stringify(content,null,2);
  entries.push({path:'content.json',mode:'100644',type:'blob',content:json+'\n'},{path:'content-data.js',mode:'100644',type:'blob',content:'window.PORTFOLIO_CONTENT = '+json+';\n'});
  const created=await this.request('/git/trees','POST',{base_tree:commit.tree.sha,tree:entries});
  const next=await this.request('/git/commits','POST',{message:'Update website content from online admin\n\nOperation: '+operationId+'\nContent: '+fingerprint,tree:created.sha,parents:[head]});
  await this.request('/git/refs/heads/'+encodeURIComponent(this.branch),'PATCH',{sha:next.sha,force:false});
  return {revision:next.sha,commitUrl:next.html_url||`https://github.com/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}/commit/${next.sha}`,publishing:true};
 }
 async publication(revision){const data=await this.request('/actions/runs?head_sha='+encodeURIComponent(revision)+'&per_page=10');const runs=data.workflow_runs.filter(r=>r.name==='pages build and deployment');if(!runs.length)return {status:'queued'};const run=runs[0];return {status:run.status==='completed'?(run.conclusion==='success'?'published':'failed'):'building',url:run.html_url};}
}
