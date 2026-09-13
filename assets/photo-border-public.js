import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.SUPABASE_CONFIG||{};
if(cfg.url&&cfg.publishableKey){
  const supabase=createClient(cfg.url,cfg.publishableKey),qs=new URLSearchParams(location.search);
  const p=location.pathname;
  const ctx=p.includes('/esteticas/')?{kind:'beauty',table:'business_profiles',slug:qs.get('negocio')||'studio-cavalier',vertical:'beauty'}:p.includes('/otros/')?{kind:'other',table:'business_profiles',slug:qs.get('negocio')||'tu-tarjeta-digital',vertical:'other'}:{kind:'advisor',table:'advisor_profiles',slug:qs.get('asesor')||cfg.defaultSlug||'demo-publica'};
  const validColor=(v,f)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?v:f;
  const widthFor=s=>({thin:2,medium:4,thick:7}[s]||4);
  (async()=>{
    let q=supabase.from(ctx.table).select('accent_color,visual_identity').eq('slug',ctx.slug);if(ctx.vertical)q=q.eq('vertical',ctx.vertical);
    const{data}=await q.maybeSingle();if(!data)return;
    const vi=data.visual_identity||{},enabled=vi.photo_border_enabled??(ctx.kind==='advisor'),size=vi.photo_border_size||'medium',color=validColor(vi.photo_border_color,validColor(data.accent_color,'#C9A96E'));
    document.body.classList.add('vi-photo-border');if(ctx.kind==='other')document.body.classList.add('vi-other');
    document.body.style.setProperty('--vi-photo-border-width',enabled?`${widthFor(size)}px`:'0px');
    document.body.style.setProperty('--vi-photo-border-color',enabled?color:'transparent');
    if(ctx.kind==='advisor'){
      const wrap=document.querySelector('.portrait-wrap');if(wrap){wrap.classList.remove('vi-photo-border-circle','vi-photo-border-rounded');wrap.classList.add((vi.photo_shape||'circle')==='rounded'?'vi-photo-border-rounded':'vi-photo-border-circle')}
    }
  })().catch(console.warn);
}
