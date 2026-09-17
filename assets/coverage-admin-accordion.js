const preferredOrder=['Querétaro','Hidalgo','Guanajuato'];
let activeState='Querétaro';
let scheduled=false;
let observer=null;

function stateName(group){return group.querySelector('.ttd-state-head strong')?.textContent?.trim()||''}
function setOpen(group,open){
  group.classList.toggle('is-collapsed',!open);
  const head=group.querySelector('.ttd-state-head');
  if(head)head.setAttribute('aria-expanded',open?'true':'false');
}
function getGroups(root){return [...root.querySelectorAll(':scope > .ttd-state-group')]}
function sortedGroups(groups){
  return [...groups].sort((a,b)=>{
    const an=stateName(a),bn=stateName(b),ai=preferredOrder.indexOf(an),bi=preferredOrder.indexOf(bn);
    if(ai!==-1||bi!==-1){if(ai===-1)return 1;if(bi===-1)return-1;if(ai!==bi)return ai-bi}
    return an.localeCompare(bn,'es');
  });
}
function ensureOrder(root,groups){
  const desired=sortedGroups(groups);
  const changed=desired.some((g,i)=>groups[i]!==g);
  if(!changed)return desired;
  if(observer)observer.disconnect();
  const frag=document.createDocumentFragment();
  desired.forEach(g=>frag.appendChild(g));
  root.appendChild(frag);
  if(observer)observer.observe(root,{childList:true,subtree:false});
  return desired;
}
function openOnly(group){
  const root=group.parentElement;if(!root)return;
  const wasOpen=!group.classList.contains('is-collapsed');
  getGroups(root).forEach(g=>setOpen(g,false));
  if(wasOpen){activeState='';return}
  activeState=stateName(group);setOpen(group,true);
}
function decorateGroup(group){
  const head=group.querySelector('.ttd-state-head');if(!head)return;
  const name=stateName(group);group.dataset.stateName=name;
  if(!head.querySelector('.ttd-state-chevron')){
    const ch=document.createElement('span');ch.className='ttd-state-chevron';ch.setAttribute('aria-hidden','true');ch.textContent='⌄';head.appendChild(ch);
  }
  head.setAttribute('role','button');head.tabIndex=0;
}
function enhance(){
  scheduled=false;
  const root=document.getElementById('ttd-locations-admin');if(!root)return;
  let groups=getGroups(root);if(!groups.length)return;
  groups=ensureOrder(root,groups);
  if(activeState&&!groups.some(g=>stateName(g)===activeState))activeState='';
  if(!activeState)activeState=stateName(groups[0]);
  groups.forEach(g=>{decorateGroup(g);setOpen(g,stateName(g)===activeState)});
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>setTimeout(enhance,0))}
function bindRoot(root){
  if(root.dataset.coverageAccordionBound==='1')return;
  root.dataset.coverageAccordionBound='1';
  root.addEventListener('click',e=>{
    const head=e.target.closest('.ttd-state-head');
    if(!head||!root.contains(head))return;
    const group=head.closest('.ttd-state-group');if(!group)return;
    e.preventDefault();openOnly(group);
  });
  root.addEventListener('keydown',e=>{
    const head=e.target.closest('.ttd-state-head');
    if(!head||!root.contains(head)||(e.key!=='Enter'&&e.key!==' '))return;
    const group=head.closest('.ttd-state-group');if(!group)return;
    e.preventDefault();openOnly(group);
  });
}
function init(){
  const root=document.getElementById('ttd-locations-admin');if(!root){setTimeout(init,120);return}
  bindRoot(root);enhance();
  observer=new MutationObserver(schedule);
  observer.observe(root,{childList:true,subtree:false});
}
window.addEventListener('load',()=>setTimeout(init,180));
setTimeout(init,250);
