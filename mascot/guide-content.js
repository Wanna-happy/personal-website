// Spoken copy and generation prompts share narration-scripts.json.
window.RUAN_GUIDE_STOPS = [
  {id:'home',action:'先看看我的项目',target:'works'},
  {id:'about',action:'聊聊我的实习',target:'experience'},
  {id:'experience',action:'去看看具体项目',target:'works'},
  {id:'works',action:'留下一个联系方式',target:'contact'},
  {id:'contact',action:'给我写封邮件',href:'mailto:1487253258@qq.com'}
].map(stop=>{
  const script=window.RUAN_NARRATION_SCRIPTS.chapters[stop.id];
  return {...stop,label:script.label,title:script.title,intro:script.text,text:script.text};
});
