/* Render authored content before existing page/host handlers bind. Text stays text. */
(() => {
 const data=window.PORTFOLIO_CONTENT;if(!data)return;
 const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 const profile=data.profile;
 document.querySelector('.welcome-note').textContent=profile.welcome;
 document.querySelector('#about .chapter-intro').textContent=profile.intro;
 const education=document.querySelector('.about__info');education.replaceChildren();
 profile.education.forEach(record=>{const article=el('article');article.append(el('span',record.label),el('strong',record.title));if(record.detail)article.append(el('p',record.detail));education.append(article);});
 const mail=document.querySelector('.contact-card__mail');mail.textContent=profile.email+' ↗';mail.href='mailto:'+profile.email;
 const experiences=document.querySelector('.story-flow');experiences.replaceChildren();
 data.experiences.forEach((record,index)=>{const card=el('article',undefined,'story-card reveal');card.dataset.step=String(index+1).padStart(2,'0');const body=el('div',undefined,'story-card__body'),meta=el('div',undefined,'story-card__meta');meta.append(el('span',record.date),el('span',record.company));body.append(meta,el('h3',record.title),el('p',record.description),el('p',record.highlight,'story-card__highlight'));const tags=el('div',undefined,'story-card__tags');record.tags.forEach(tag=>tags.append(el('span',tag)));body.append(tags);const talk=el('button','讲讲这段经历','context-talk');talk.type='button';if(!record.managed)talk.dataset.guideTopic=record.id;else talk.onclick=()=>{window.ruanAutoGuide?.pause();window.ruanPresenter?.finish();window.ruanPresenter?.guideText(record.title,record.narration||record.highlight||record.description);window.ruanPresenter?.media.play('show',{loop:false});};body.append(talk);card.append(body);experiences.append(card);});
 const works=document.querySelector('.work-grid');works.replaceChildren();
 data.projects.forEach((record,index)=>{const card=el('article',undefined,'work-card reveal'),cover=el('button',undefined,'work-card__cover '+(index%2?'cover-learning':'cover-one'));cover.type='button';Object.assign(cover.dataset,{project:record.title,projectId:record.id,projectDescription:record.description,projectType:record.type,projectLink:record.link});if(record.cover){const img=el('img');img.src=record.cover;img.alt=record.title;img.loading='lazy';cover.classList.add('has-cover');cover.append(img);}else{cover.append(el('span',String(index+1).padStart(2,'0'),'cover-one__label'),el('strong',record.headline||record.title),el('i','↗'));}const meta=el('div',undefined,'work-card__meta'),name=el('div');name.append(el('span',record.type),el('h3',record.title));meta.append(name,el('strong',record.year),el('span','查看项目 →','project-open-label'));const talk=el('button','给我讲讲这个项目','context-talk');talk.type='button';if(!record.managed)talk.dataset.guideTopic=record.id;else talk.onclick=()=>{window.ruanAutoGuide?.pause();window.ruanPresenter?.finish();window.portfolioProjects?.open(record.id);window.ruanPresenter?.guideText(record.title,record.narration||record.description);};card.append(cover,meta,talk);works.append(card);});
 if(!data.projects.length)works.append(el('p','新的作品正在准备中。','works-intro'));
 if(!data.experiences.length)experiences.append(el('p','新的经历，慢慢更新。','experience-intro'));
 const link=el('a','网站管理');link.href='admin.html';link.className='site-admin-link';document.querySelector('.site-footer').append(link);
})();
