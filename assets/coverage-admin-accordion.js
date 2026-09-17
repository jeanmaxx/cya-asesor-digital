const preferredOrder=['Querétaro','Hidalgo','Guanajuato'];
let activeState='Querétaro';
let scheduled=false;

function stateName(group){return group.querySelector('.ttd-state-head strong')?.textContent?.trim()||''}
function setOpen(group,open){
  group.classList.toggle('is-collapsed',!open);
  const head=group.querySelector('.ttd-state-head');
  if(head)head.setAttribute('aria-expanded',open?'true':'false');
}
function openOnly(group){
  const root=group.parentElement;
  const opening=group.classList.contains('is-collapsed');
  root?.querySelectorAll(':scope > .ttd-state-group').forEach(g=>setOpen(g,false));
  if(opening){activeState=stateName(group);setOpen(group,true)}else activeState='';
}
function bindGroup(group){
  const head=group.querySelector('.ttd-state-head');if(!head)return;
  const name=stateName(group);group.dataset.stateName=name;
  if(!head.querySelector('.ttd-state-chevron')){const ch=document.createElement('span');ch.className='ttd-state-chevron';ch.setAttribute('aria-hidden','true');ch.textContent='⌄';head.appendChild(ch)}
  if(!head.dataset.coverageBound){
    head.dataset.coverageBound='1';head.setAttribute('role','button');head.tabIndex=0;
    head.addEventListener('click',()=>openOnly(group));
    head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openOnly(group)}});
  }
}
function enhance(){
  scheduled=false;
  const root=document.getElementById('ttd-locations-admin');if(!root)return;
  const groups=[...root.querySelectorAll(':scope > .ttd-state-group')];if(!groups.length)return;
  groups.sort((a,b)=>{
    const an=stateName(a),bn=stateName(b),ai=preferredOrder.indexOf(an),bi=preferredOrder.indexOf(bn);
    if(ai!==-1||bi!==-1){if(ai===-1)return 1;if(bi===-1)return-1;if(ai!==bi)return ai-bi}
    return an.localeCompare(bn,'es');
  }).forEach(g=>root.appendChild(g));
  if(!groups.some(g=>stateName(g)===activeState))activeState=stateName(groups[0]);
  groups.forEach(g=>{bindGroup(g);setOpen(g,stateName(g)===activeState)});
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>setTimeout(enhance,0))}
function init(){
  const root=document.getElementById('ttd-locations-admin');if(!root){setTimeout(init,120);return}
  enhance();new MutationObserver(schedule).observe(root,{childList:true,subtree:false});
}
window.addEventListener('load',()=>setTimeout(init,180));
setTimeout(init,250);
