(() => {
  const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const weekdays=['L','M','M','J','V','S','D'];
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseIso=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null};
  const dmy=v=>{const d=parseIso(v);return d?`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`:''};
  const sameDay=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  let bound=false;

  function enhance(){
    if(bound)return;
    const input=document.getElementById('ttd-booking-date');
    if(!input){setTimeout(enhance,120);return;}
    bound=true;
    input.classList.add('ttd-native-date-hidden');
    input.tabIndex=-1;

    const label=input.closest('label');
    if(!label)return;
    label.classList.add('ttd-calendar-label');

    const picker=document.createElement('div');
    picker.className='ttd-month-picker';
    picker.innerHTML=`
      <div class="ttd-month-picker-head">
        <button type="button" class="ttd-month-nav" data-dir="-1" aria-label="Mes anterior">‹</button>
        <strong class="ttd-month-title"></strong>
        <button type="button" class="ttd-month-nav" data-dir="1" aria-label="Mes siguiente">›</button>
      </div>
      <div class="ttd-month-weekdays">${weekdays.map(x=>`<span>${x}</span>`).join('')}</div>
      <div class="ttd-month-grid"></div>
      <div class="ttd-month-selected">Selecciona un día</div>`;
    input.before(picker);

    const min=parseIso(input.min)||new Date();
    const max=parseIso(input.max)||new Date(min.getFullYear()+1,min.getMonth(),min.getDate());
    let selected=parseIso(input.value);
    let cursor=selected?new Date(selected.getFullYear(),selected.getMonth(),1):new Date(min.getFullYear(),min.getMonth(),1);

    const grid=picker.querySelector('.ttd-month-grid');
    const title=picker.querySelector('.ttd-month-title');
    const selectedText=picker.querySelector('.ttd-month-selected');

    function within(d){
      const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
      return x>=new Date(min.getFullYear(),min.getMonth(),min.getDate()).getTime()&&x<=new Date(max.getFullYear(),max.getMonth(),max.getDate()).getTime();
    }
    function monthAllowed(y,m){
      const first=new Date(y,m,1),last=new Date(y,m+1,0);
      return last>=new Date(min.getFullYear(),min.getMonth(),1)&&first<=new Date(max.getFullYear(),max.getMonth()+1,0);
    }
    function render(){
      title.textContent=`${months[cursor.getMonth()]} ${cursor.getFullYear()}`;
      grid.replaceChildren();
      const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);
      const offset=(first.getDay()+6)%7;
      for(let i=0;i<offset;i++){const e=document.createElement('span');e.className='ttd-month-empty';grid.appendChild(e)}
      const days=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
      const today=new Date();today.setHours(0,0,0,0);
      for(let n=1;n<=days;n++){
        const d=new Date(cursor.getFullYear(),cursor.getMonth(),n);
        const b=document.createElement('button');
        b.type='button';b.className='ttd-month-day';b.textContent=n;
        if(!within(d)){b.disabled=true;b.classList.add('is-disabled')}
        if(sameDay(d,today))b.classList.add('is-today');
        if(sameDay(d,selected))b.classList.add('is-selected');
        b.addEventListener('click',()=>{
          selected=d;
          input.value=iso(d);
          selectedText.textContent=`Fecha seleccionada: ${dmy(input.value)}`;
          input.dispatchEvent(new Event('change',{bubbles:true}));
          render();
        });
        grid.appendChild(b);
      }
      const prev=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);
      const next=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
      picker.querySelector('[data-dir="-1"]').disabled=!monthAllowed(prev.getFullYear(),prev.getMonth());
      picker.querySelector('[data-dir="1"]').disabled=!monthAllowed(next.getFullYear(),next.getMonth());
      selectedText.textContent=selected?`Fecha seleccionada: ${dmy(iso(selected))}`:'Selecciona un día';
    }

    picker.querySelectorAll('.ttd-month-nav').forEach(btn=>btn.addEventListener('click',()=>{
      const dir=Number(btn.dataset.dir)||0;
      const next=new Date(cursor.getFullYear(),cursor.getMonth()+dir,1);
      if(monthAllowed(next.getFullYear(),next.getMonth())){cursor=next;render()}
    }));
    input.addEventListener('change',()=>{
      selected=parseIso(input.value);
      if(selected)cursor=new Date(selected.getFullYear(),selected.getMonth(),1);
      render();
    });
    render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
