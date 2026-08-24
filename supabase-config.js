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

// Быстрый переход преподавателя к редактору материалов.
(function(){
  if(!/\/admin\.html$/.test(location.pathname))return;
  const addLink=()=>{const actions=document.querySelector('.top > div:last-child');if(!actions||document.getElementById('materialsAdminLink'))return;const link=document.createElement('a');link.id='materialsAdminLink';link.className='btn';link.href='materials-admin.html';link.textContent='Материалы курсов';link.style.marginRight='6px';actions.insertBefore(link,actions.firstChild)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addLink);else addLink();
})();
