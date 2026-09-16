(()=>{
  const footer=document.querySelector('footer'),brandRow=document.getElementById('brand-row');
  if(footer&&brandRow){
    let img=footer.querySelector('.other-footer-brand');
    if(!img){img=document.createElement('img');img.className='other-footer-brand';img.alt='Logotipo';footer.insertBefore(img,footer.firstChild)}
    const sync=()=>{const src=brandRow.querySelector('.identity-logo-frame img')?.src||brandRow.querySelector('img')?.src||'';if(src){img.src=src;img.hidden=false}else img.hidden=true};
    const observer=new MutationObserver(sync);observer.observe(brandRow,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    sync();setTimeout(sync,400);setTimeout(sync,1200);
  }
})();
