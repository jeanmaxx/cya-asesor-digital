import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.SUPABASE_CONFIG||{};
if(cfg.url&&cfg.publishableKey){
  const supabase=createClient(cfg.url,cfg.publishableKey);
  const auth=document.getElementById('auth-panel');
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session) auth?.classList.remove('is-hidden');
  }catch{auth?.classList.remove('is-hidden')}
}
