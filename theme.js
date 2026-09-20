// Runs before styles so a saved preference is applied before the first paint.
(() => {
 const root=document.documentElement;let theme='dark';
 try{if(localStorage.getItem('ruan-color-theme')==='light')theme='light';}catch{}
 function apply(value){theme=value==='light'?'light':'dark';root.dataset.theme=theme;document.querySelector('meta[name=theme-color]')?.setAttribute('content',theme==='light'?'#f6f1e8':'#101019');const button=document.querySelector('.theme-toggle');if(button){button.textContent=theme==='light'?'深色模式':'浅色模式';button.setAttribute('aria-label',theme==='light'?'切换到深色模式':'切换到浅色模式');button.setAttribute('aria-pressed',String(theme==='light'));}}
 apply(theme);
 document.addEventListener('DOMContentLoaded',()=>{const controls=document.createElement('div');controls.className='site-utilities';controls.setAttribute('aria-label','网站选项');const button=document.createElement('button');button.type='button';button.className='theme-toggle';controls.append(button);if(!document.body.classList.contains('admin-page')){const admin=document.createElement('a');admin.className='admin-entry';admin.href='admin.html';admin.textContent='进入后台';controls.append(admin);}document.body.append(controls);apply(theme);button.addEventListener('click',()=>{apply(theme==='light'?'dark':'light');try{localStorage.setItem('ruan-color-theme',theme);}catch{}});});
 window.addEventListener('storage',e=>{if(e.key==='ruan-color-theme')apply(e.newValue);});
})();
