// Публичная конфигурация Supabase для JULI. Publishable key предназначен для браузерного клиента; доступ к данным ограничивает RLS.
window.JULI_SUPABASE_URL = "https://jsulovquulqixmhdygae.supabase.co";
window.JULI_SUPABASE_ANON_KEY = "sb_publishable_J1eFJrcv07gEB6Fc4T3mSQ_LmhSCLwg";

// Favicon для страниц, подключающих этот файл.
(function(){
  const icons=[
    {rel:'icon',type:'image/x-icon',href:'assets/favicon.ico'},
    {rel:'icon',type:'image/png',sizes:'32x32',href:'assets/favicon-32x32.png'},
    {rel:'icon',type:'image/png',sizes:'16x16',href:'assets/favicon-16x16.png'},
    {rel:'apple-touch-icon',sizes:'180x180',href:'assets/apple-touch-icon.png'}
  ];
  icons.forEach(icon=>{const link=document.createElement('link');Object.entries(icon).forEach(([k,v])=>link.setAttribute(k,v));document.head.appendChild(link)});
})();

// Единый выход: после завершения сессии возвращаем на главную страницу.
(function(){
  document.addEventListener('click',async function(e){
    const btn=e.target.closest&&e.target.closest('#out');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{
      if(window.supabase&&window.JULI_SUPABASE_URL&&window.JULI_SUPABASE_ANON_KEY){
        const client=window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY);
        await client.auth.signOut();
      }
    }catch(err){console.warn('Sign out:',err)}
    location.href='./';
  },true);
})();
