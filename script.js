/* Existing portfolio interactions, adapted to chapter pages. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelector('#year').textContent = new Date().getFullYear();
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
  }), { threshold: .08 });
  document.querySelectorAll('.reveal, .line-reveal').forEach(el => reveal.observe(el));

  const cursor = document.querySelector('.cursor');
  if (cursor && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced.matches) {
    const dot = cursor.querySelector('.cursor__dot'), ring = cursor.querySelector('.cursor__ring');
    ring.style.transition = 'transform .12s ease-out';
    window.addEventListener('pointermove', e => {
      const position = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%,-50%)';
      dot.style.transform = position; ring.style.transform = position;
    }, { passive: true });
  } else if (cursor) cursor.hidden = true;

  const dialog = document.querySelector('#project-dialog'), github = document.querySelector('#project-github');
  const stories = {
    weekly: {
      problem:'运营人员手工撰写周报耗时，管理层查看业务指标分散。',
      process:'我梳理了 Agent 的能力边界、触发条件与输出规范，独立完成周报自动生成和指标可视化的 HTML 可交互原型，并参与 API 接入与开发协作。',
      result:'目前展示的是可演示、可验证的产品方案与原型。',
      narration:'我做这个项目时，先明确了周报该在什么情况下生成、应该包含什么，再把这些规则落进可以点击体验的原型中。'
    },
    learning: {
      problem:'这是面向个人学习场景的 AI 产品探索。',
      process:'我独立用 Vibe Coding 把想法逐步做成可体验的产品。',
      result:'项目持续完善中，后续会补充设计、实现过程与项目仓库。',
      narration:'这是我自己动手做的学习助手。我还在持续完善它，也会把从想法到实现的过程记录下来。'
    }
  };
  Object.assign(stories,Object.fromEntries((window.PORTFOLIO_CONTENT?.projects||[]).map(p=>[p.id,{problem:p.problem,process:p.process,result:p.result,narration:p.narration}])));
  let selectedProject='weekly';
  const renderSection = section => {
    document.querySelector('#project-story').textContent=stories[selectedProject][section];
    document.querySelectorAll('[data-project-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.projectSection===section)));
    if(dialog.open&&dialog.classList.contains('guided-preview')){
      const story=document.querySelector('#project-story');
      dialog.scrollTo({top:Math.max(0,story.offsetTop-150),behavior:reduced.matches?'instant':'smooth'});
    }
  };
  document.querySelectorAll('[data-project-section]').forEach(b=>b.addEventListener('click',()=>renderSection(b.dataset.projectSection)));
  document.querySelector('#project-explain').addEventListener('click',e=>{
    const p=document.querySelector('#project-explanation');p.hidden=!p.hidden;
    p.textContent=stories[selectedProject].narration;e.currentTarget.setAttribute('aria-expanded',String(!p.hidden));
  });
  function openProject(id,{guided=false}={}){
    const button=[...document.querySelectorAll('[data-project]')].find(b=>b.dataset.projectId===id);if(!button)return;
    if(dialog.open)dialog.close();
    document.querySelector('#project-dialog-title').textContent = button.dataset.project;
    document.querySelector('#project-dialog-type').textContent = button.dataset.projectType;
    document.querySelector('#project-dialog-description').textContent = button.dataset.projectDescription;
    const link = button.dataset.projectLink?.trim();
    github.hidden = !link;
    github.href = link || '';
    github.textContent = link ? '查看 GitHub 项目 ↗' : 'GitHub 链接待添加';
    github.setAttribute('aria-disabled', String(!link));
    selectedProject=button.dataset.projectId in stories?button.dataset.projectId:'weekly';renderSection('problem');
    document.querySelector('#project-explanation').hidden=true;
    document.querySelector('#project-explain').setAttribute('aria-expanded','false');
    dialog.classList.toggle('guided-preview',guided);
    if(guided)dialog.show();else dialog.showModal();
    document.dispatchEvent(new CustomEvent('projectopen',{detail:{guided,id:selectedProject}}));
  }
  document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>openProject(button.dataset.projectId)));
  document.querySelectorAll('.work-card').forEach(card=>card.addEventListener('click',event=>{
    if(event.target.closest('button,a'))return;
    openProject(card.querySelector('[data-project]').dataset.projectId);
  }));
  window.portfolioProjects={open:openProject,section:renderSection,close:()=>{if(dialog.open)dialog.close();},get current(){return selectedProject;}};
  dialog.addEventListener('close',()=>document.dispatchEvent(new Event('projectclose')));
  document.querySelector('.project-dialog__close').addEventListener('click', () => dialog.close());
  document.querySelector('#project-contact').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
  });
  document.querySelector('#copy-email').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(window.PORTFOLIO_CONTENT?.profile.email||'1487253258@qq.com');document.querySelector('#copy-status').textContent='邮箱已复制';document.dispatchEvent(new CustomEvent('hostfeedback',{detail:{topic:'contact',text:'邮箱复制好了，期待收到你的消息。'}}));}
    catch{document.querySelector('#copy-status').textContent='请长按或选中邮箱地址复制。';}
  });
})();
