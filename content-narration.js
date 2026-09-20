/* Edited copy must never be paired with recordings of the previous copy. */
(() => {
 const data=window.PORTFOLIO_CONTENT,scripts=window.RUAN_NARRATION_SCRIPTS;if(!data||!scripts)return;
 function replace(group,id,title,text){const old=scripts[group][id]||{};scripts[group][id]={...old,title,text};const key=group+'-'+id;delete window.RUAN_NARRATION_AUDIO?.items[key];delete window.RUAN_LIPSYNC?.items[key];if(group==='chapters'){const stop=window.RUAN_GUIDE_STOPS.find(s=>s.id===id);if(stop)Object.assign(stop,{title,intro:text,text});}}
 if(data.profile.managed){replace('chapters','home','欢迎来做客。',data.profile.welcome);replace('chapters','about','一起认识一下我。',data.profile.intro);replace('topics','study','我的学习经历',data.profile.education.map(e=>[e.label,e.title,e.detail].filter(Boolean).join('，')).join('。')+'。');replace('topics','contact','欢迎联系我','可以通过页面上的邮箱联系我：'+data.profile.email+'。');}
 if(data.projects.some(p=>p.managed)||data.projects.map(p=>p.id).join(',')!=='weekly,learning')replace('chapters','works','这里放着我的作品。','这里记录着我的项目。点开感兴趣的作品，看看它的背景和过程。');
 for(const p of data.projects)if(p.managed)replace('topics',p.id,p.title,p.narration||p.description||p.title);
 if(data.experiences.some(p=>p.managed)||data.experiences.map(p=>p.id).join(',')!=='robot,weekly')replace('chapters','experience','我做过的事。','这里记录着我的实践和经历。可以点开一段，慢慢了解。');
 for(const e of data.experiences)if(e.managed)replace('topics','experience-'+e.id,e.title,e.narration||e.highlight||e.description||e.title);
})();
