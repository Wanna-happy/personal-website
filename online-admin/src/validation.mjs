export class APIError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=message=>{throw new APIError(400,message);};
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const str=(value,max=8000)=>typeof value==='string'&&value.length<=max;
export const validAsset=value=>typeof value==='string'&&/^assets\/[a-zA-Z0-9_\-./]+$/.test(value)&&!value.split('/').some(p=>p==='..'||p==='.'||!p);
export function validateContent(value){
 if(!record(value)||value.version!==1||!record(value.profile))fail('网站内容格式不正确');
 const p=value.profile;
 for(const key of ['welcome','intro','email'])if(!str(p[key]))fail('简介字段不正确');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))fail('邮箱格式不正确');
 if(!Array.isArray(p.education)||p.education.length>30)fail('教育经历格式不正确');
 for(const e of p.education)if(!record(e)||!['label','title','detail'].every(k=>str(e[k])))fail('教育经历字段不正确');
 for(const name of ['projects','experiences','photos']){
  const rows=value[name];if(!Array.isArray(rows)||rows.length>(name==='photos'?500:100))fail('条目数量或格式不正确');
  const ids=new Set();for(const row of rows){if(!record(row)||!str(row.id,100)||!/^[a-zA-Z0-9_-]+$/.test(row.id)||ids.has(row.id))fail('条目 ID 不正确或重复');ids.add(row.id);}
 }
 for(const p of value.projects){
  for(const k of ['title','type','year','headline','description','problem','process','result','narration','link','cover','pdf'])if(!str(p[k]))fail('项目字段不正确');
  if(!p.title.trim())fail('项目名称不能为空');
  if(p.link){try{if(!['https:','http:'].includes(new URL(p.link).protocol))fail('项目链接仅支持 http 或 https');}catch{fail('项目链接不正确');}}
  if(!Array.isArray(p.slides)||p.slides.length>60)fail('每个项目最多 60 张展示图片');
  for(const file of [p.cover,p.pdf,...p.slides])if(file&&!validAsset(file))fail('项目附件路径不正确');
 }
 for(const e of value.experiences){if(!['title','date','company','description','highlight','narration'].every(k=>str(e[k]))||!e.title.trim())fail('经历字段不正确');if(!Array.isArray(e.tags)||e.tags.length>30||!e.tags.every(t=>str(t,100)))fail('经历标签格式不正确');}
 for(const p of value.photos)if(!validAsset(p.src)||!str(p.caption,100)||('thumbnail' in p&&!validAsset(p.thumbnail)))fail('照片文件或说明格式不正确');
 if(JSON.stringify(value).length>1000000)fail('内容过大，请减少文字或条目');
 return value;
}
export function contentAssets(data){return [...new Set([...data.projects.flatMap(p=>[p.cover,p.pdf,...p.slides]),...data.photos.flatMap(p=>[p.src,p.thumbnail])].filter(Boolean))];}
export function sniff(bytes){
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'jpg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'png';
 const ascii=new TextDecoder().decode(bytes.subarray(0,12));
 if(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP')return 'webp';
 if(ascii.startsWith('%PDF-'))return 'pdf';
 fail('仅支持 JPG、PNG、WebP 和 PDF 文件');
}
